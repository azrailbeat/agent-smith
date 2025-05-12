/**
 * Сервис для управления базами знаний агентов
 * Интегрируется с векторными базами данных для реализации RAG
 */
import { createVectorStorage, VectorStorage, VectorStorageType, VectorDocument, SearchParams } from './vector-service';
import { db } from '../db';
import { storage } from '../storage';
import { logActivity } from '../activity-logger';
import OpenAI from 'openai';
import { AgentKnowledgeBase } from '@shared/schema';

// Конфигурация сервиса для создания эмбеддингов
interface EmbeddingServiceConfig {
  type: 'openai' | 'huggingface' | 'custom';
  modelName?: string;
  apiKey?: string;
  apiUrl?: string;
}

// Интерфейс для результатов RAG
export interface RAGResult {
  passages: VectorDocument[];
  query: string;
}

// Интерфейс для создания базы знаний
export interface KnowledgeBaseCreateParams {
  name: string;
  description?: string;
  agentId?: number;
  vectorStorageType: VectorStorageType;
  vectorStorageUrl?: string;
  vectorStorageApiKey?: string;
  collectionName?: string;
}

// Интерфейс для добавления документов в базу знаний
export interface KnowledgeBaseAddDocumentsParams {
  knowledgeBaseId: number;
  documents: {
    content: string;
    metadata?: Record<string, any>;
    id?: string;
  }[];
}

/**
 * Класс для управления базами знаний агентов
 */
export class KnowledgeService {
  private embeddingService: EmbeddingService;
  private vectorStorages: Map<number, VectorStorage> = new Map();

  constructor(embeddingConfig: EmbeddingServiceConfig) {
    this.embeddingService = new EmbeddingService(embeddingConfig);
  }

  /**
   * Создать новую базу знаний для агента
   */
  async createKnowledgeBase(params: KnowledgeBaseCreateParams): Promise<AgentKnowledgeBase> {
    try {
      // Создаем коллекцию в векторном хранилище
      const collectionName = params.collectionName || `agent_kb_${Date.now()}`;
      
      // Создаем запись в базе данных
      const knowledgeBase = await storage.createAgentKnowledgeBase({
        name: params.name,
        description: params.description || '',
        agentId: params.agentId,
        vectorStorageType: params.vectorStorageType,
        vectorStorageUrl: params.vectorStorageUrl,
        vectorStorageApiKey: params.vectorStorageApiKey,
        collectionName: collectionName,
        documentCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Создаем и инициализируем векторное хранилище
      const vectorStorage = this.getOrCreateVectorStorage(knowledgeBase);
      await vectorStorage.createCollection(collectionName);

      await logActivity({
        action: 'create_knowledge_base',
        entityType: 'knowledge_base',
        entityId: knowledgeBase.id,
        details: `Created knowledge base: ${params.name}`,
        metadata: { 
          vectorStorageType: params.vectorStorageType,
          collectionName
        }
      });

      return knowledgeBase;
    } catch (error) {
      console.error('Error creating knowledge base:', error);
      throw error;
    }
  }

  /**
   * Получить базу знаний по ID
   */
  async getKnowledgeBase(id: number): Promise<AgentKnowledgeBase | undefined> {
    return await storage.getAgentKnowledgeBase(id);
  }

  /**
   * Получить базы знаний агента
   */
  async getAgentKnowledgeBases(agentId: number): Promise<AgentKnowledgeBase[]> {
    return await storage.getAgentKnowledgeBases(agentId);
  }

  /**
   * Получить все базы знаний
   */
  async getAllKnowledgeBases(): Promise<AgentKnowledgeBase[]> {
    return await storage.getAllAgentKnowledgeBases();
  }

  /**
   * Добавить документы в базу знаний
   */
  async addDocuments(params: KnowledgeBaseAddDocumentsParams): Promise<string[]> {
    try {
      const { knowledgeBaseId, documents } = params;
      
      // Получаем базу знаний
      const knowledgeBase = await this.getKnowledgeBase(knowledgeBaseId);
      if (!knowledgeBase) {
        throw new Error(`Knowledge base with id ${knowledgeBaseId} not found`);
      }

      // Создаем векторное хранилище
      const vectorStorage = this.getOrCreateVectorStorage(knowledgeBase);
      
      // Создаем эмбеддинги для документов
      const documentsWithEmbeddings: VectorDocument[] = [];
      
      for (const doc of documents) {
        const embedding = await this.embeddingService.createEmbedding(doc.content);
        documentsWithEmbeddings.push({
          id: doc.id,
          content: doc.content,
          metadata: doc.metadata || {},
          embedding
        });
      }
      
      // Добавляем документы в векторное хранилище
      const ids = await vectorStorage.addDocuments(
        documentsWithEmbeddings, 
        knowledgeBase.collectionName
      );
      
      // Обновляем счетчик документов
      await storage.updateAgentKnowledgeBase(knowledgeBaseId, {
        documentCount: (knowledgeBase.documentCount || 0) + documents.length,
        updatedAt: new Date()
      });

      await logActivity({
        action: 'add_documents_to_knowledge_base',
        entityType: 'knowledge_base',
        entityId: knowledgeBaseId,
        details: `Added ${documents.length} documents to knowledge base: ${knowledgeBase.name}`,
        metadata: { 
          vectorStorageType: knowledgeBase.vectorStorageType,
          collectionName: knowledgeBase.collectionName,
          count: documents.length
        }
      });

      return ids;
    } catch (error) {
      console.error('Error adding documents to knowledge base:', error);
      throw error;
    }
  }


  /**
   * Поиск документов в базе знаний по текстовому запросу
   * @param knowledgeBaseId Идентификатор базы знаний
   * @param query Текстовый запрос для поиска
   * @param limit Максимальное количество результатов
   * @returns Результаты поиска в формате RAG
   */
  async searchDocuments(knowledgeBaseId: number, query: string, limit: number = 5): Promise<RAGResult> {
    try {
      // Получаем базу знаний
      const knowledgeBase = await this.getKnowledgeBase(knowledgeBaseId);
      if (!knowledgeBase) {
        throw new Error(`Knowledge base with id ${knowledgeBaseId} not found`);
      }

      // Создаем векторное хранилище
      const vectorStorage = this.getOrCreateVectorStorage(knowledgeBase);
      
      // Создаем эмбеддинг для запроса
      const embedding = await this.embeddingService.createEmbedding(query);
      
      // Выполняем поиск
      const searchParams: SearchParams = {
        query: embedding,
        limit,
        collectionName: knowledgeBase.collectionName
      };
      
      const results = await vectorStorage.search(searchParams);
      
      return {
        passages: results,
        query
      };
    } catch (error) {
      console.error('Error searching in knowledge base:', error);
      throw error;
    }
  }

  /**
   * Удалить базу знаний
   */
  async deleteKnowledgeBase(id: number): Promise<boolean> {
    try {
      // Получаем базу знаний
      const knowledgeBase = await this.getKnowledgeBase(id);
      if (!knowledgeBase) {
        throw new Error(`Knowledge base with id ${id} not found`);
      }

      // Создаем векторное хранилище
      const vectorStorage = this.getOrCreateVectorStorage(knowledgeBase);
      
      // Удаляем коллекцию в векторном хранилище
      await vectorStorage.deleteCollection(knowledgeBase.collectionName);
      
      // Удаляем запись из базы данных
      await storage.deleteAgentKnowledgeBase(id);

      // Удаляем кэшированное хранилище
      this.vectorStorages.delete(id);

      await logActivity({
        action: 'delete_knowledge_base',
        entityType: 'knowledge_base',
        entityId: id,
        details: `Deleted knowledge base: ${knowledgeBase.name}`,
        metadata: { 
          vectorStorageType: knowledgeBase.vectorStorageType,
          collectionName: knowledgeBase.collectionName
        }
      });

      return true;
    } catch (error) {
      console.error('Error deleting knowledge base:', error);
      return false;
    }
  }

  /**
   * Удалить документы из базы знаний
   */
  async deleteDocuments(knowledgeBaseId: number, documentIds: string[]): Promise<boolean> {
    try {
      // Получаем базу знаний
      const knowledgeBase = await this.getKnowledgeBase(knowledgeBaseId);
      if (!knowledgeBase) {
        throw new Error(`Knowledge base with id ${knowledgeBaseId} not found`);
      }

      // Создаем векторное хранилище
      const vectorStorage = this.getOrCreateVectorStorage(knowledgeBase);
      
      // Удаляем документы из векторного хранилища
      await vectorStorage.deleteDocuments(documentIds, knowledgeBase.collectionName);
      
      // Обновляем счетчик документов
      await storage.updateAgentKnowledgeBase(knowledgeBaseId, {
        documentCount: Math.max(0, (knowledgeBase.documentCount || 0) - documentIds.length),
        updatedAt: new Date()
      });

      await logActivity({
        action: 'delete_documents_from_knowledge_base',
        entityType: 'knowledge_base',
        entityId: knowledgeBaseId,
        details: `Deleted ${documentIds.length} documents from knowledge base: ${knowledgeBase.name}`,
        metadata: { 
          vectorStorageType: knowledgeBase.vectorStorageType,
          collectionName: knowledgeBase.collectionName,
          count: documentIds.length
        }
      });

      return true;
    } catch (error) {
      console.error('Error deleting documents from knowledge base:', error);
      return false;
    }
  }

  /**
   * Получить статистику по базе знаний
   */
  async getKnowledgeBaseStats(id: number): Promise<{ documentCount: number }> {
    try {
      // Получаем базу знаний
      const knowledgeBase = await this.getKnowledgeBase(id);
      if (!knowledgeBase) {
        throw new Error(`Knowledge base with id ${id} not found`);
      }

      // Создаем векторное хранилище
      const vectorStorage = this.getOrCreateVectorStorage(knowledgeBase);
      
      // Получаем количество документов
      const count = await vectorStorage.count(knowledgeBase.collectionName);
      
      // Обновляем счетчик документов в базе данных, если он отличается
      if (count !== knowledgeBase.documentCount) {
        await storage.updateAgentKnowledgeBase(id, {
          documentCount: count,
          updatedAt: new Date()
        });
      }

      return { documentCount: count };
    } catch (error) {
      console.error('Error getting knowledge base stats:', error);
      throw error;
    }
  }

  /**
   * Создать и/или получить векторное хранилище для базы знаний
   */
  private getOrCreateVectorStorage(knowledgeBase: AgentKnowledgeBase): VectorStorage {
    // Проверяем, есть ли уже созданное хранилище
    if (this.vectorStorages.has(knowledgeBase.id)) {
      return this.vectorStorages.get(knowledgeBase.id)!;
    }

    // Создаем новое хранилище
    const vectorStorage = createVectorStorage({
      type: knowledgeBase.vectorStorageType as VectorStorageType,
      url: knowledgeBase.vectorStorageUrl,
      apiKey: knowledgeBase.vectorStorageApiKey,
      defaultCollection: knowledgeBase.collectionName
    });

    // Кэшируем созданное хранилище
    this.vectorStorages.set(knowledgeBase.id, vectorStorage);

    return vectorStorage;
  }
}

/**
 * Класс для создания эмбеддингов
 */
class EmbeddingService {
  private config: EmbeddingServiceConfig;
  private openai?: OpenAI;

  constructor(config: EmbeddingServiceConfig) {
    this.config = config;

    if (config.type === 'openai' && config.apiKey) {
      this.openai = new OpenAI({ apiKey: config.apiKey });
    }
  }

  /**
   * Создать эмбеддинг для текста
   */
  async createEmbedding(text: string): Promise<number[]> {
    try {
      switch (this.config.type) {
        case 'openai':
          return await this.createOpenAIEmbedding(text);
        // В будущем можно добавить другие методы создания эмбеддингов
        default:
          throw new Error(`Unsupported embedding service type: ${this.config.type}`);
      }
    } catch (error) {
      console.error('Error creating embedding:', error);
      
      // Возвращаем пустой вектор в случае ошибки
      // В реальном приложении нужно обрабатывать ошибки более аккуратно
      return new Array(1536).fill(0);
    }
  }

  /**
   * Создать эмбеддинг с помощью OpenAI API
   */
  private async createOpenAIEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openai.embeddings.create({
      model: this.config.modelName || 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  }
}

// Создаем экземпляр сервиса
const knowledgeService = new KnowledgeService({
  type: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-ada-002'
});

export { knowledgeService };