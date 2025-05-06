/**
 * Репозиторий для работы с результатами агентов
 */

import { BaseRepository } from './base-repository';
import { storage } from '../storage';
import { AgentResult, InsertAgentResult } from '@shared/schema';

export class AgentResultRepository extends BaseRepository<AgentResult, InsertAgentResult, Partial<InsertAgentResult>> {
  protected entityName = 'agent_result';

  /**
   * Получить все результаты агентов
   */
  async getAll(): Promise<AgentResult[]> {
    try {
      return await storage.getAllAgentResults();
    } catch (error) {
      console.error('Ошибка при получении результатов агентов:', error);
      throw new Error('Не удалось загрузить результаты агентов');
    }
  }

  /**
   * Получить результат по ID
   * Примечание: в текущей реализации нет метода получения агента по ID,
   * добавляем для совместимости с интерфейсом
   */
  async getById(id: number): Promise<AgentResult | undefined> {
    try {
      const allResults = await this.getAll();
      return allResults.find(result => result.id === id);
    } catch (error) {
      console.error(`Ошибка при получении результата агента #${id}:`, error);
      throw new Error(`Не удалось загрузить результат агента #${id}`);
    }
  }

  /**
   * Создать новый результат агента
   */
  async create(data: InsertAgentResult): Promise<AgentResult> {
    try {
      // Преобразуем результат в строку JSON, если он является объектом
      const normalizedData = { ...data };
      
      if (typeof normalizedData.result === 'object' && normalizedData.result !== null) {
        normalizedData.result = JSON.stringify(normalizedData.result);
      }
      
      const result = await storage.createAgentResult(normalizedData);
      
      await this.logOperation(
        'create', 
        result.id, 
        `Создан результат агента для ${normalizedData.entityType} #${normalizedData.entityId}`
      );
      
      return result;
    } catch (error) {
      console.error('Ошибка при создании результата агента:', error);
      throw new Error('Не удалось создать результат агента');
    }
  }

  /**
   * Обновить результат агента
   * Примечание: в текущей реализации нет метода обновления результата агента,
   * добавляем для совместимости с интерфейсом
   */
  async update(id: number, data: Partial<InsertAgentResult>): Promise<AgentResult | undefined> {
    throw new Error('Метод обновления результата агента не реализован');
  }

  /**
   * Получить результаты агента по типу сущности и ID сущности
   */
  async getByEntity(entityType: string, entityId: number): Promise<AgentResult[]> {
    try {
      return await storage.getAgentResultsByEntity(entityType, entityId);
    } catch (error) {
      console.error(`Ошибка при получении результатов агента для ${entityType} #${entityId}:`, error);
      throw new Error(`Не удалось загрузить результаты агента для ${entityType} #${entityId}`);
    }
  }

  /**
   * Получить результаты агента по ID агента
   */
  async getByAgentId(agentId: number): Promise<AgentResult[]> {
    try {
      const allResults = await this.getAll();
      return allResults.filter(result => result.agentId === agentId);
    } catch (error) {
      console.error(`Ошибка при получении результатов для агента #${agentId}:`, error);
      throw new Error(`Не удалось загрузить результаты для агента #${agentId}`);
    }
  }

  /**
   * Получить результаты агента по типу действия
   */
  async getByActionType(actionType: string): Promise<AgentResult[]> {
    try {
      const allResults = await this.getAll();
      return allResults.filter(result => result.actionType === actionType);
    } catch (error) {
      console.error(`Ошибка при получении результатов для действия "${actionType}":`, error);
      throw new Error(`Не удалось загрузить результаты для действия "${actionType}"`);
    }
  }
}

// Создаем экземпляр репозитория
export const agentResultRepository = new AgentResultRepository();