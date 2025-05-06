/**
 * Репозиторий для работы с блокчейн-записями
 */

import { BaseRepository } from './base-repository';
import { storage } from '../storage';
import { BlockchainRecord, InsertBlockchainRecord } from '@shared/schema';
import { recordToBlockchain } from '../services/blockchain';

export class BlockchainRepository extends BaseRepository<
  BlockchainRecord, 
  InsertBlockchainRecord, 
  Partial<InsertBlockchainRecord>
> {
  protected entityName = 'blockchain_record';

  /**
   * Получить все блокчейн-записи
   */
  async getAll(): Promise<BlockchainRecord[]> {
    try {
      return await storage.getBlockchainRecords();
    } catch (error) {
      console.error('Ошибка при получении блокчейн-записей:', error);
      throw new Error('Не удалось загрузить блокчейн-записи');
    }
  }

  /**
   * Получить последние блокчейн-записи
   */
  async getRecent(limit: number = 10): Promise<BlockchainRecord[]> {
    try {
      return await storage.getRecentBlockchainRecords(limit);
    } catch (error) {
      console.error(`Ошибка при получении последних ${limit} блокчейн-записей:`, error);
      throw new Error(`Не удалось загрузить последние ${limit} блокчейн-записей`);
    }
  }

  /**
   * Получить блокчейн-запись по ID
   */
  async getById(id: number): Promise<BlockchainRecord | undefined> {
    try {
      return await storage.getBlockchainRecord(id);
    } catch (error) {
      console.error(`Ошибка при получении блокчейн-записи #${id}:`, error);
      throw new Error(`Не удалось загрузить блокчейн-запись #${id}`);
    }
  }

  /**
   * Создать новую блокчейн-запись
   */
  async create(data: InsertBlockchainRecord): Promise<BlockchainRecord> {
    try {
      const record = await storage.createBlockchainRecord(data);
      
      await this.logOperation(
        'create', 
        record.id, 
        `Создана блокчейн-запись "${record.title}" с хешем ${record.transactionHash}`
      );
      
      return record;
    } catch (error) {
      console.error('Ошибка при создании блокчейн-записи:', error);
      throw new Error('Не удалось создать блокчейн-запись');
    }
  }

  /**
   * Обновить блокчейн-запись
   */
  async update(id: number, data: Partial<InsertBlockchainRecord>): Promise<BlockchainRecord | undefined> {
    try {
      const updatedRecord = await storage.updateBlockchainRecord(id, data);
      
      if (updatedRecord) {
        await this.logOperation(
          'update', 
          id, 
          `Обновлена блокчейн-запись #${id}, статус: ${updatedRecord.status}`
        );
      }
      
      return updatedRecord;
    } catch (error) {
      console.error(`Ошибка при обновлении блокчейн-записи #${id}:`, error);
      throw new Error(`Не удалось обновить блокчейн-запись #${id}`);
    }
  }

  /**
   * Создать запись в блокчейне
   */
  async createBlockchainRecord(data: {
    entityType: string;
    entityId: number;
    action: string;
    title: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<{ transactionHash: string }> {
    try {
      // Записываем в блокчейн
      const result = await recordToBlockchain({
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        title: data.title,
        content: data.content,
        metadata: data.metadata || {}
      });
      
      // Создаем запись в хранилище
      if (result && result.transactionHash) {
        await this.create({
          recordType: data.entityType,
          title: data.title,
          entityType: data.entityType,
          entityId: data.entityId,
          transactionHash: result.transactionHash,
          status: 'pending',
          metadata: {
            ...data.metadata,
            timestamp: Math.floor(Date.now() / 1000),
            action: data.action
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Ошибка при создании записи в блокчейне:', error);
      throw new Error('Не удалось создать запись в блокчейне');
    }
  }

  /**
   * Получить блокчейн-записи по типу сущности и ID сущности
   */
  async getByEntity(entityType: string, entityId: number): Promise<BlockchainRecord[]> {
    try {
      const allRecords = await this.getAll();
      return allRecords.filter(record => 
        record.entityType === entityType && record.entityId === entityId
      );
    } catch (error) {
      console.error(`Ошибка при получении блокчейн-записей для ${entityType} #${entityId}:`, error);
      throw new Error(`Не удалось загрузить блокчейн-записи для ${entityType} #${entityId}`);
    }
  }

  /**
   * Получить блокчейн-записи по хешу транзакции
   */
  async getByTransactionHash(hash: string): Promise<BlockchainRecord | undefined> {
    try {
      const allRecords = await this.getAll();
      return allRecords.find(record => record.transactionHash === hash);
    } catch (error) {
      console.error(`Ошибка при получении блокчейн-записи по хешу ${hash}:`, error);
      throw new Error(`Не удалось загрузить блокчейн-запись по хешу ${hash}`);
    }
  }

  /**
   * Получить блокчейн-записи по типу записи
   */
  async getByRecordType(recordType: string): Promise<BlockchainRecord[]> {
    try {
      const allRecords = await this.getAll();
      return allRecords.filter(record => record.recordType === recordType);
    } catch (error) {
      console.error(`Ошибка при получении блокчейн-записей типа "${recordType}":`, error);
      throw new Error(`Не удалось загрузить блокчейн-записи типа "${recordType}"`);
    }
  }

  /**
   * Обновить статус блокчейн-записи
   */
  async updateStatus(id: number, status: string, confirmedAt?: Date): Promise<BlockchainRecord | undefined> {
    try {
      const updateData: Partial<InsertBlockchainRecord> = { status };
      
      if (confirmedAt) {
        updateData.confirmedAt = confirmedAt;
      }
      
      return await this.update(id, updateData);
    } catch (error) {
      console.error(`Ошибка при обновлении статуса блокчейн-записи #${id}:`, error);
      throw new Error(`Не удалось обновить статус блокчейн-записи #${id}`);
    }
  }
}

// Создаем экземпляр репозитория
export const blockchainRepository = new BlockchainRepository();