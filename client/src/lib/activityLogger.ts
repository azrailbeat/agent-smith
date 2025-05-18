import { apiRequest } from './queryClient';

// Типы для работы с историей активностей
export interface ActivityRecord {
  id?: number;
  actionType: string;
  description: string;
  entityId?: number | string;
  entityType?: string;
  userId?: number | string;
  metadata?: Record<string, any>;
  timestamp?: string;
  blockchainHash?: string | null;
}

// Основной класс логгера активностей
class ActivityLogger {
  /**
   * Записывает действие в историю
   * @param actionType Тип действия (create, update, delete и т.д.)
   * @param description Описание действия на человеческом языке
   * @param entityId ID сущности, к которой относится действие
   * @param entityType Тип сущности (citizen_request, document, task и т.д.)
   * @param metadata Дополнительные данные о действии
   * @returns Promise с результатом выполнения
   */
  async logActivity(
    actionType: string,
    description: string,
    entityId?: number | string,
    entityType?: string,
    metadata?: Record<string, any>
  ): Promise<ActivityRecord> {
    try {
      const activityData: ActivityRecord = {
        actionType,
        description,
        entityId,
        entityType,
        metadata,
        timestamp: new Date().toISOString()
      };
      
      console.log('Запись активности:', activityData);
      
      // В реальном приложении здесь будет запрос к API
      // return apiRequest('POST', '/api/activities', activityData);
      
      // Для демонстрационного режима возвращаем данные без отправки запроса
      return {
        ...activityData,
        id: Date.now(),
        userId: 1, // Временное значение
        blockchainHash: null
      };
    } catch (error) {
      console.error('Ошибка при записи активности:', error);
      throw error;
    }
  }

  /**
   * Получает историю действий для указанной сущности
   * @param entityType Тип сущности
   * @param entityId ID сущности
   * @returns Promise со списком активностей
   */
  async getActivities(entityType: string, entityId: number | string): Promise<ActivityRecord[]> {
    try {
      console.log(`Загрузка истории для ${entityType}:${entityId}`);
      
      // В реальном приложении здесь будет запрос к API
      // return apiRequest('GET', `/api/activities?entityType=${entityType}&entityId=${entityId}`);
      
      // Для демонстрационного режима возвращаем тестовые данные
      const now = new Date();
      return [
        {
          id: 1,
          actionType: 'create',
          description: 'Создание записи',
          entityId,
          entityType,
          userId: 1,
          timestamp: new Date(now.getTime() - 86400000).toISOString(), // 1 день назад
          blockchainHash: null,
          metadata: {}
        },
        {
          id: 2,
          actionType: 'update',
          description: 'Обновление данных',
          entityId,
          entityType,
          userId: 1,
          timestamp: new Date(now.getTime() - 43200000).toISOString(), // 12 часов назад
          blockchainHash: null,
          metadata: {}
        },
        {
          id: 3,
          actionType: 'ai_process',
          description: 'Обработка искусственным интеллектом',
          entityId,
          entityType,
          userId: 1,
          timestamp: new Date(now.getTime() - 21600000).toISOString(), // 6 часов назад
          blockchainHash: '0x5de1c7ae3dba14e7c798862f5b6e3c138b84510d851c3254a805a22fb10782a8',
          metadata: {
            aiModel: 'GPT-4',
            processingTime: '1.2s'
          }
        }
      ];
    } catch (error) {
      console.error(`Ошибка при загрузке истории для ${entityType}:${entityId}:`, error);
      throw error;
    }
  }

  /**
   * Создает запись в блокчейне (для важных действий)
   * @param actionType Тип действия
   * @param entityType Тип сущности
   * @param entityId ID сущности
   * @param metadata Дополнительные данные
   * @returns Promise с хешем транзакции в блокчейне
   */
  async createBlockchainRecord(
    actionType: string,
    entityType: string,
    entityId: number | string,
    metadata?: Record<string, any>
  ): Promise<{ hash: string }> {
    try {
      const recordData = {
        actionType,
        entityType,
        entityId,
        metadata,
        timestamp: new Date().toISOString()
      };
      
      console.log('Запись в блокчейн:', recordData);
      
      // В реальном приложении здесь будет запрос к API блокчейна
      // return apiRequest('POST', '/api/blockchain/records', recordData);
      
      // Генерируем фиктивный хеш для демонстрационного режима
      const randomHash = Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      
      return { hash: `0x${randomHash}` };
    } catch (error) {
      console.error('Ошибка при создании записи в блокчейне:', error);
      throw error;
    }
  }
}

// Экспортируем синглтон логгера для использования во всем приложении
export const activityLogger = new ActivityLogger();