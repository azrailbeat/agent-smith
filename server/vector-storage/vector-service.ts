/**
 * Сервис для работы с векторными базами данных
 * Поддерживает интеграцию с Qdrant и Milvus для хранения и поиска векторов
 */
import { QdrantClient } from '@qdrant/js-client-rest';
import { MilvusClient, DataType } from '@zilliz/milvus2-sdk-node';
import { logActivity, ActivityType } from '../activity-logger';

// Тип векторного хранилища
export enum VectorStorageType {
  QDRANT = 'qdrant',
  MILVUS = 'milvus'
}

// Интерфейс документа для хранения
export interface VectorDocument {
  id?: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

// Параметры запроса для семантического поиска
export interface SearchParams {
  query: string;
  filter?: Record<string, any>;
  limit?: number;
  agentId?: number;
  collectionName?: string;
}

// Конфигурация векторного хранилища
export interface VectorStorageConfig {
  type: VectorStorageType;
  url?: string;
  apiKey?: string;
  dimension?: number; // размерность векторов
  defaultCollection?: string;
}

// Абстрактный класс для работы с векторными базами данных
export abstract class VectorStorage {
  protected config: VectorStorageConfig;

  constructor(config: VectorStorageConfig) {
    this.config = config;
  }

  /**
   * Создать коллекцию / индекс для векторов
   * @param collectionName Название коллекции
   * @param dimension Размерность векторов
   */
  abstract createCollection(collectionName: string, dimension?: number): Promise<boolean>;

  /**
   * Проверить существует ли коллекция
   * @param collectionName Название коллекции
   */
  abstract hasCollection(collectionName: string): Promise<boolean>;

  /**
   * Добавить документы в базу
   * @param documents Документы для добавления
   * @param collectionName Название коллекции
   */
  abstract addDocuments(documents: VectorDocument[], collectionName?: string): Promise<string[]>;

  /**
   * Найти похожие документы
   * @param params Параметры поиска
   */
  abstract search(params: SearchParams): Promise<VectorDocument[]>;

  /**
   * Удалить коллекцию
   * @param collectionName Название коллекции
   */
  abstract deleteCollection(collectionName: string): Promise<boolean>;

  /**
   * Удалить документы
   * @param ids Идентификаторы документов
   * @param collectionName Название коллекции
   */
  abstract deleteDocuments(ids: string[], collectionName?: string): Promise<boolean>;

  /**
   * Получить список доступных коллекций
   */
  abstract listCollections(): Promise<string[]>;

  /**
   * Получить количество документов в коллекции
   * @param collectionName Название коллекции
   */
  abstract count(collectionName?: string): Promise<number>;
}

// Реализация для Qdrant
export class QdrantVectorStorage extends VectorStorage {
  private client: QdrantClient;

  constructor(config: VectorStorageConfig) {
    super(config);
    this.client = new QdrantClient({
      url: config.url || 'http://localhost:6333',
      apiKey: config.apiKey,
    });
  }

  async createCollection(collectionName: string, dimension?: number): Promise<boolean> {
    try {
      const exists = await this.hasCollection(collectionName);
      if (exists) {
        return true;
      }

      await this.client.createCollection(collectionName, {
        vectors: {
          size: dimension || this.config.dimension || 1536, // Размерность по умолчанию для OpenAI embeddings
          distance: 'Cosine',
        },
      });

      await logActivity({
        action: 'create_vector_collection',
        entityType: 'vector_storage',
        details: `Created Qdrant collection: ${collectionName}`,
        metadata: { 
          storage_type: VectorStorageType.QDRANT,
          collection: collectionName
        }
      });

      return true;
    } catch (error) {
      console.error('Error creating Qdrant collection:', error);
      return false;
    }
  }

  async hasCollection(collectionName: string): Promise<boolean> {
    try {
      const collections = await this.client.getCollections();
      return collections.collections.some(collection => collection.name === collectionName);
    } catch (error) {
      console.error('Error checking Qdrant collection:', error);
      return false;
    }
  }

  async addDocuments(documents: VectorDocument[], collectionName?: string): Promise<string[]> {
    const collection = collectionName || this.config.defaultCollection;
    if (!collection) {
      throw new Error('Collection name is required');
    }

    try {
      // Убедимся что коллекция существует
      const exists = await this.hasCollection(collection);
      if (!exists) {
        await this.createCollection(collection);
      }

      // Подготовить данные для Qdrant
      const points = documents.map((doc, idx) => {
        // Если у документа нет ID, используем порядковый номер
        const id = doc.id || `${Date.now()}-${idx}`;
        return {
          id,
          vector: doc.embedding,
          payload: {
            content: doc.content,
            ...doc.metadata,
          },
        };
      });

      // Добавить документы
      await this.client.upsert(collection, {
        points,
      });

      await logActivity({
        action: 'add_vector_documents',
        entityType: 'vector_storage',
        details: `Added ${documents.length} documents to Qdrant collection: ${collection}`,
        metadata: { 
          storage_type: VectorStorageType.QDRANT,
          collection,
          count: documents.length
        }
      });

      return points.map(p => p.id.toString());
    } catch (error) {
      console.error('Error adding documents to Qdrant:', error);
      throw error;
    }
  }

  async search(params: SearchParams): Promise<VectorDocument[]> {
    const collectionName = params.collectionName || this.config.defaultCollection;
    if (!collectionName) {
      throw new Error('Collection name is required');
    }

    try {
      // Для семантического поиска нам нужно сначала получить embedding для запроса
      // Здесь предполагается, что params.query уже является вектором embedding
      const vector = Array.isArray(params.query) ? params.query : [];
      
      // Реализация фильтра, если он есть
      const filter = params.filter ? { filter: params.filter } : {};
      
      const results = await this.client.search(collectionName, {
        vector,
        limit: params.limit || 10,
        with_payload: true,
        ...filter,
      });

      return results.map(result => ({
        id: result.id.toString(),
        content: result.payload.content,
        metadata: { ...result.payload, content: undefined },
        embedding: undefined // Обычно не возвращаем embedding в результатах поиска
      }));
    } catch (error) {
      console.error('Error searching in Qdrant:', error);
      throw error;
    }
  }

  async deleteCollection(collectionName: string): Promise<boolean> {
    try {
      await this.client.deleteCollection(collectionName);
      
      await logActivity({
        action: 'delete_vector_collection',
        entityType: 'vector_storage',
        details: `Deleted Qdrant collection: ${collectionName}`,
        metadata: { 
          storage_type: VectorStorageType.QDRANT,
          collection: collectionName
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting Qdrant collection:', error);
      return false;
    }
  }

  async deleteDocuments(ids: string[], collectionName?: string): Promise<boolean> {
    const collection = collectionName || this.config.defaultCollection;
    if (!collection) {
      throw new Error('Collection name is required');
    }

    try {
      await this.client.delete(collection, {
        points: ids.map(id => ({ id })),
      });
      
      await logActivity({
        action: 'delete_vector_documents',
        entityType: 'vector_storage',
        details: `Deleted ${ids.length} documents from Qdrant collection: ${collection}`,
        metadata: { 
          storage_type: VectorStorageType.QDRANT,
          collection,
          count: ids.length
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting documents from Qdrant:', error);
      return false;
    }
  }

  async listCollections(): Promise<string[]> {
    try {
      const collections = await this.client.getCollections();
      return collections.collections.map(collection => collection.name);
    } catch (error) {
      console.error('Error listing Qdrant collections:', error);
      return [];
    }
  }

  async count(collectionName?: string): Promise<number> {
    const collection = collectionName || this.config.defaultCollection;
    if (!collection) {
      throw new Error('Collection name is required');
    }

    try {
      const result = await this.client.getCollectionInfo(collection);
      return result.points_count;
    } catch (error) {
      console.error('Error getting Qdrant collection count:', error);
      return 0;
    }
  }
}

// Реализация для Milvus
export class MilvusVectorStorage extends VectorStorage {
  private client: MilvusClient;

  constructor(config: VectorStorageConfig) {
    super(config);
    this.client = new MilvusClient(config.url || 'localhost:19530', config.apiKey);
  }

  async createCollection(collectionName: string, dimension?: number): Promise<boolean> {
    try {
      const exists = await this.hasCollection(collectionName);
      if (exists) {
        return true;
      }

      // Определение схемы для Milvus
      const dim = dimension || this.config.dimension || 1536;
      
      await this.client.createCollection({
        collection_name: collectionName,
        fields: [
          {
            name: 'id',
            data_type: DataType.VarChar,
            is_primary_key: true,
            max_length: 100
          },
          {
            name: 'content',
            data_type: DataType.VarChar,
            max_length: 65535
          },
          {
            name: 'metadata',
            data_type: DataType.JSON,
          },
          {
            name: 'embedding',
            data_type: DataType.FloatVector,
            dim
          }
        ],
      });

      // Создаем индекс для векторного поля
      await this.client.createIndex({
        collection_name: collectionName,
        field_name: 'embedding',
        index_type: 'IVF_FLAT',
        metric_type: 'COSINE',
        params: { nlist: 1024 },
      });

      await logActivity({
        action: 'create_vector_collection',
        entityType: 'vector_storage',
        details: `Created Milvus collection: ${collectionName}`,
        metadata: { 
          storage_type: VectorStorageType.MILVUS,
          collection: collectionName
        }
      });

      return true;
    } catch (error) {
      console.error('Error creating Milvus collection:', error);
      return false;
    }
  }

  async hasCollection(collectionName: string): Promise<boolean> {
    try {
      const collections = await this.client.listCollections();
      return collections.data.includes(collectionName);
    } catch (error) {
      console.error('Error checking Milvus collection:', error);
      return false;
    }
  }

  async addDocuments(documents: VectorDocument[], collectionName?: string): Promise<string[]> {
    const collection = collectionName || this.config.defaultCollection;
    if (!collection) {
      throw new Error('Collection name is required');
    }

    try {
      // Убедимся что коллекция существует
      const exists = await this.hasCollection(collection);
      if (!exists) {
        await this.createCollection(collection);
      }

      // Загружаем коллекцию
      await this.client.loadCollection({
        collection_name: collection
      });

      // Подготовим данные для вставки
      const ids: string[] = [];
      const contents: string[] = [];
      const metadatas: any[] = [];
      const embeddings: any[] = [];

      documents.forEach((doc, idx) => {
        // Если у документа нет ID, используем порядковый номер
        const id = doc.id || `${Date.now()}-${idx}`;
        ids.push(id);
        contents.push(doc.content);
        metadatas.push(JSON.stringify(doc.metadata || {}));
        embeddings.push(doc.embedding);
      });

      // Вставляем данные
      await this.client.insert({
        collection_name: collection,
        fields_data: {
          id: ids,
          content: contents,
          metadata: metadatas,
          embedding: embeddings
        }
      });

      await logActivity({
        action: 'add_vector_documents',
        entityType: 'vector_storage',
        details: `Added ${documents.length} documents to Milvus collection: ${collection}`,
        metadata: { 
          storage_type: VectorStorageType.MILVUS,
          collection,
          count: documents.length
        }
      });

      return ids;
    } catch (error) {
      console.error('Error adding documents to Milvus:', error);
      throw error;
    }
  }

  async search(params: SearchParams): Promise<VectorDocument[]> {
    const collectionName = params.collectionName || this.config.defaultCollection;
    if (!collectionName) {
      throw new Error('Collection name is required');
    }

    try {
      // Загружаем коллекцию
      await this.client.loadCollection({
        collection_name: collectionName
      });

      // Для семантического поиска нам нужно сначала получить embedding для запроса
      // Здесь предполагается, что params.query уже является вектором embedding
      const vector = Array.isArray(params.query) ? params.query : [];
      
      // Выполняем поиск
      const results = await this.client.search({
        collection_name: collectionName,
        vector: vector,
        output_fields: ['id', 'content', 'metadata'],
        limit: params.limit || 10,
        metric_type: 'COSINE',
      });

      return results.data.map(result => ({
        id: result.id,
        content: result.content,
        metadata: JSON.parse(result.metadata),
        embedding: undefined // Обычно не возвращаем embedding в результатах поиска
      }));
    } catch (error) {
      console.error('Error searching in Milvus:', error);
      throw error;
    }
  }

  async deleteCollection(collectionName: string): Promise<boolean> {
    try {
      await this.client.dropCollection({
        collection_name: collectionName
      });
      
      await logActivity({
        action: 'delete_vector_collection',
        entityType: 'vector_storage',
        details: `Deleted Milvus collection: ${collectionName}`,
        metadata: { 
          storage_type: VectorStorageType.MILVUS,
          collection: collectionName
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting Milvus collection:', error);
      return false;
    }
  }

  async deleteDocuments(ids: string[], collectionName?: string): Promise<boolean> {
    const collection = collectionName || this.config.defaultCollection;
    if (!collection) {
      throw new Error('Collection name is required');
    }

    try {
      // Загружаем коллекцию
      await this.client.loadCollection({
        collection_name: collection
      });

      // Готовим экспрешн для фильтрации по ID
      const expr = `id in [${ids.map(id => `'${id}'`).join(',')}]`;
      
      await this.client.delete({
        collection_name: collection,
        expr: expr
      });
      
      await logActivity({
        action: 'delete_vector_documents',
        entityType: 'vector_storage',
        details: `Deleted ${ids.length} documents from Milvus collection: ${collection}`,
        metadata: { 
          storage_type: VectorStorageType.MILVUS,
          collection,
          count: ids.length
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting documents from Milvus:', error);
      return false;
    }
  }

  async listCollections(): Promise<string[]> {
    try {
      const collections = await this.client.listCollections();
      return collections.data;
    } catch (error) {
      console.error('Error listing Milvus collections:', error);
      return [];
    }
  }

  async count(collectionName?: string): Promise<number> {
    const collection = collectionName || this.config.defaultCollection;
    if (!collection) {
      throw new Error('Collection name is required');
    }

    try {
      // Загружаем коллекцию
      await this.client.loadCollection({
        collection_name: collection
      });
      
      const result = await this.client.getCollectionStatistics({
        collection_name: collection
      });
      
      return parseInt(result.data.row_count);
    } catch (error) {
      console.error('Error getting Milvus collection count:', error);
      return 0;
    }
  }
}

// Фабрика для создания экземпляров VectorStorage
export function createVectorStorage(config: VectorStorageConfig): VectorStorage {
  switch (config.type) {
    case VectorStorageType.QDRANT:
      return new QdrantVectorStorage(config);
    case VectorStorageType.MILVUS:
      return new MilvusVectorStorage(config);
    default:
      throw new Error(`Unsupported vector storage type: ${config.type}`);
  }
}