/**
 * Activity Logger Service
 * Handles all activity logging in the application for audit trail and tracking purposes
 */

import { storage } from './storage';
import { insertActivitySchema } from '@shared/schema';

/**
 * Типы активностей в системе
 */
export enum ActivityType {
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  ENTITY_CREATE = 'entity_create',
  ENTITY_UPDATE = 'entity_update',
  ENTITY_DELETE = 'entity_delete',
  BLOCKCHAIN_RECORD = 'blockchain_record',
  SYSTEM_EVENT = 'system_event',
  AI_PROCESSING = 'ai_processing'
}

/**
 * Интерфейс для данных активности
 */
export interface ActivityData {
  action: string;
  entityType?: string;
  entityId?: number;
  userId?: number;
  details?: string;
  metadata?: Record<string, any>;
}

/**
 * Логирует активность пользователя или системы
 * @param data Данные о действии
 */
export async function logActivity(data: ActivityData): Promise<void> {
  try {
    const { action, entityType, entityId, userId, details, metadata } = data;
    
    console.log(`Logging activity: ${action}, entityType: ${entityType || 'none'}, entityId: ${entityId || 0}, userId: ${userId || 0}`);
    
    // Форматируем метаданные как строку JSON, если они есть
    const jsonMetadata = metadata ? metadata : null;
    
    // Сохраняем в хранилище
    await storage.createActivity({
      // Совместимость со старым интерфейсом
      actionType: action,
      description: details || `${action} for ${entityType} #${entityId}`,
      userId: userId || null,
      relatedId: entityId || null,
      relatedType: entityType || null,
      blockchainHash: null,
      
      // Новые поля для расширенной функциональности
      entityType: entityType || null,
      entityId: entityId || null,
      metadata: jsonMetadata,
      action: action // Дублирование для совместимости
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Не прерываем выполнение основного кода, даже если логирование не удалось
  }
}

/**
 * Получить недавние активности
 * @param limit Ограничение количества записей
 */
export async function getRecentActivities(limit: number = 50): Promise<any[]> {
  try {
    return await storage.getRecentActivities(limit);
  } catch (error) {
    console.error('Error getting recent activities:', error);
    return [];
  }
}

/**
 * Получить все активности, связанные с конкретной сущностью
 * @param entityType Тип сущности
 * @param entityId ID сущности
 */
export async function getEntityActivities(entityType: string, entityId: number): Promise<any[]> {
  try {
    const activities = await storage.getActivities();
    
    // Проверяем как новые, так и старые поля для полной совместимости
    return activities.filter(activity => 
      (activity.entityType === entityType && activity.entityId === entityId) ||
      (activity.relatedType === entityType && activity.relatedId === entityId)
    );
  } catch (error) {
    console.error('Error getting entity activities:', error);
    return [];
  }
}

/**
 * Получить все активности конкретного пользователя
 * @param userId ID пользователя
 */
export async function getUserActivities(userId: number): Promise<any[]> {
  try {
    const activities = await storage.getActivities();
    return activities.filter(activity => activity.userId === userId);
  } catch (error) {
    console.error('Error getting user activities:', error);
    return [];
  }
}

/**
 * Добавить блокчейн хэш к существующей записи активности
 * @param activityId ID записи активности
 * @param blockchainHash Хэш транзакции в блокчейне
 */
export async function addBlockchainHashToActivity(activityId: number, blockchainHash: string): Promise<void> {
  try {
    const activities = await storage.getActivities();
    const activity = activities.find(a => a.id === activityId);
    
    if (activity) {
      // Обновляем активность в реальной базе данных
      // В данном примере у нас нет метода обновления активности, поэтому просто логируем
      console.log(`[Simulated] Added blockchain hash ${blockchainHash} to activity #${activityId}`);
    }
  } catch (error) {
    console.error('Error adding blockchain hash to activity:', error);
  }
}

/**
 * Логирует ошибку в системе
 * @param error Ошибка для логирования
 * @param context Контекст ошибки
 * @param userId ID пользователя (если есть)
 */
export async function logError(error: Error, context: string, userId?: number): Promise<void> {
  try {
    await logActivity({
      action: 'system_error',
      entityType: 'error',
      details: `Error in ${context}: ${error.message}`,
      userId: userId,
      metadata: {
        errorType: error.name,
        stack: error.stack,
        context
      }
    });
  } catch (logError) {
    console.error('Failed to log error:', logError);
    console.error('Original error:', error);
  }
}