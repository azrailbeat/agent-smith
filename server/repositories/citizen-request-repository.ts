/**
 * Репозиторий для работы с обращениями граждан
 */

import { BaseRepository } from './base-repository';
import { storage } from '../storage';
import { CitizenRequest, InsertCitizenRequest } from '@shared/schema';
import { logActivity } from '../activity-logger';
import { recordToBlockchain } from '../services/blockchain';

export class CitizenRequestRepository extends BaseRepository<
  CitizenRequest, 
  InsertCitizenRequest, 
  Partial<InsertCitizenRequest>
> {
  protected entityName = 'citizen_request';

  /**
   * Получить все обращения граждан
   */
  async getAll(): Promise<CitizenRequest[]> {
    try {
      return await storage.getCitizenRequests();
    } catch (error) {
      console.error('Ошибка при получении обращений граждан:', error);
      throw new Error('Не удалось загрузить обращения граждан');
    }
  }

  /**
   * Получить обращение по ID
   */
  async getById(id: number): Promise<CitizenRequest | undefined> {
    try {
      return await storage.getCitizenRequest(id);
    } catch (error) {
      console.error(`Ошибка при получении обращения #${id}:`, error);
      throw new Error(`Не удалось загрузить обращение #${id}`);
    }
  }

  /**
   * Создать новое обращение
   */
  async create(data: InsertCitizenRequest): Promise<CitizenRequest> {
    try {
      const newRequest = await storage.createCitizenRequest(data);
      
      // Логируем создание обращения
      await this.logOperation('create', newRequest.id, `Создано обращение от ${data.fullName}`);
      
      // Записываем создание в блокчейн
      try {
        const blockchainResult = await recordToBlockchain({
          entityType: 'citizen_request',
          entityId: newRequest.id,
          action: 'create',
          title: `citizen_request #${newRequest.id}: create`,
          content: data.description || '',
          metadata: {
            subject: data.subject,
            requestType: data.requestType,
            fullName: data.fullName
          }
        });
        
        // Обновляем запись с хешем блокчейн-транзакции
        if (blockchainResult && blockchainResult.transactionHash) {
          await this.update(newRequest.id, {
            blockchainHash: blockchainResult.transactionHash
          });
        }
      } catch (blockchainError) {
        console.error('Ошибка при записи в блокчейн:', blockchainError);
        // Не прерываем выполнение, даже если запись в блокчейн не удалась
      }
      
      return newRequest;
    } catch (error) {
      console.error('Ошибка при создании обращения:', error);
      throw new Error('Не удалось создать обращение');
    }
  }

  /**
   * Обновить обращение
   */
  async update(id: number, data: Partial<InsertCitizenRequest>): Promise<CitizenRequest | undefined> {
    try {
      // Получаем текущее состояние перед обновлением для логирования изменений
      const currentRequest = await this.getById(id);
      
      if (!currentRequest) {
        throw new Error(`Обращение #${id} не найдено`);
      }
      
      // Определяем изменения для логирования
      const changes: string[] = [];
      
      if (data.status && data.status !== currentRequest.status) {
        changes.push(`Статус изменен с "${currentRequest.status}" на "${data.status}"`);
      }
      
      if (data.assignedTo !== undefined && data.assignedTo !== currentRequest.assignedTo) {
        changes.push(`Назначен исполнитель: ${data.assignedTo || 'Не назначен'}`);
      }
      
      // Обновляем запись
      const updatedRequest = await storage.updateCitizenRequest(id, data);
      
      if (!updatedRequest) {
        throw new Error(`Не удалось обновить обращение #${id}`);
      }
      
      // Логируем обновление
      if (changes.length > 0) {
        await this.logOperation('update', id, changes.join('. '));
      }
      
      // Записываем изменение статуса в блокчейн, если статус изменился
      if (data.status && data.status !== currentRequest.status) {
        try {
          await recordToBlockchain({
            entityType: 'citizen_request',
            entityId: id,
            action: 'status_change',
            title: `citizen_request #${id}: status_change`,
            content: `Статус изменен с "${currentRequest.status}" на "${data.status}"`,
            metadata: {
              oldStatus: currentRequest.status,
              newStatus: data.status,
              updatedBy: data.updatedBy || 1
            }
          });
        } catch (blockchainError) {
          console.error('Ошибка при записи изменения статуса в блокчейн:', blockchainError);
        }
      }
      
      return updatedRequest;
    } catch (error) {
      console.error(`Ошибка при обновлении обращения #${id}:`, error);
      throw new Error(`Не удалось обновить обращение #${id}`);
    }
  }

  /**
   * Удалить обращение
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await storage.deleteCitizenRequest(id);
      if (result) {
        await this.logOperation('delete', id, `Удалено обращение #${id}`);
      }
      return result;
    } catch (error) {
      console.error(`Ошибка при удалении обращения #${id}:`, error);
      throw new Error(`Не удалось удалить обращение #${id}`);
    }
  }

  /**
   * Получить обращения со статусом
   */
  async getByStatus(status: string): Promise<CitizenRequest[]> {
    try {
      const allRequests = await this.getAll();
      return allRequests.filter(request => request.status === status);
    } catch (error) {
      console.error(`Ошибка при получении обращений со статусом "${status}":`, error);
      throw new Error(`Не удалось получить обращения со статусом "${status}"`);
    }
  }

  /**
   * Получить обращения по исполнителю
   */
  async getByAssignee(assigneeId: number): Promise<CitizenRequest[]> {
    try {
      const allRequests = await this.getAll();
      return allRequests.filter(request => request.assignedTo === assigneeId);
    } catch (error) {
      console.error(`Ошибка при получении обращений для исполнителя ${assigneeId}:`, error);
      throw new Error(`Не удалось получить обращения для исполнителя ${assigneeId}`);
    }
  }
}

// Создаем экземпляр репозитория
export const citizenRequestRepository = new CitizenRequestRepository();