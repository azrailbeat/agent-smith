/**
 * Activity Logger Service
 * Handles all activity logging in the application for audit trail and tracking purposes
 */

import { storage } from './storage';
import { recordToBlockchain } from './blockchain';

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
    const timestamp = new Date();
    
    // Создаем запись активности
    const activityRecord = await storage.createActivity({
      timestamp,
      action: data.action,
      actionType: determineActivityType(data.action),
      entityType: data.entityType || null,
      entityId: data.entityId || null,
      userId: data.userId || null,
      description: data.details || `Action: ${data.action}`,
      metadata: data.metadata || {}
    });
    
    // Логируем в консоль для отладки
    console.log(`Activity logged: [${data.action}] ${data.details || ''} by user ${data.userId || 'system'}`);
    
    // Если действие связано с блокчейном, записываем в блокчейн
    if (data.action.includes('blockchain') || shouldRecordToBlockchain(data)) {
      try {
        const blockchainHash = await recordToBlockchain({
          entityId: data.entityId || activityRecord.id,
          entityType: data.entityType || 'activity',
          action: data.action,
          userId: data.userId,
          metadata: data.metadata
        });
        
        // Добавляем хэш блокчейна к записи активности
        await addBlockchainHashToActivity(activityRecord.id, blockchainHash);
      } catch (error) {
        console.error('Failed to record activity to blockchain:', error);
      }
    }
    
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

/**
 * Получить недавние активности
 * @param limit Ограничение количества записей
 */
export async function getRecentActivities(limit: number = 50): Promise<any[]> {
  return await storage.getActivities(limit);
}

/**
 * Получить все активности, связанные с конкретной сущностью
 * @param entityType Тип сущности
 * @param entityId ID сущности
 */
export async function getEntityActivities(entityType: string, entityId: number): Promise<any[]> {
  return await storage.getActivitiesByEntity(entityType, entityId);
}

/**
 * Получить все активности конкретного пользователя
 * @param userId ID пользователя
 */
export async function getUserActivities(userId: number): Promise<any[]> {
  return await storage.getActivitiesByUser(userId);
}

/**
 * Добавить блокчейн хэш к существующей записи активности
 * @param activityId ID записи активности
 * @param blockchainHash Хэш транзакции в блокчейне
 */
export async function addBlockchainHashToActivity(activityId: number, blockchainHash: string): Promise<void> {
  try {
    // Проверяем, существует ли метод getActivity
    if (typeof storage.getActivity !== 'function') {
      console.log(`Warning: storage.getActivity is not available. Cannot update activity ${activityId} with blockchain hash ${blockchainHash}`);
      return;
    }
    
    const activity = await storage.getActivity(activityId);
    if (activity) {
      await storage.updateActivity(activityId, {
        ...activity,
        blockchainHash
      });
    }
  } catch (error) {
    console.error(`Error updating activity ${activityId} with blockchain hash:`, error);
  }
}

/**
 * Логирует ошибку в системе
 * @param error Ошибка для логирования
 * @param context Контекст ошибки
 * @param userId ID пользователя (если есть)
 */
export async function logError(error: Error, context: string, userId?: number): Promise<void> {
  await logActivity({
    action: 'system_error',
    details: `Error in ${context}: ${error.message}`,
    userId,
    metadata: {
      errorName: error.name,
      errorStack: error.stack,
      context
    }
  });
}

/**
 * Определяет тип активности на основе названия действия
 * @param action Название действия
 */
function determineActivityType(action: string): string {
  if (action.includes('login') || action.includes('auth')) {
    return ActivityType.USER_LOGIN;
  } else if (action.includes('logout')) {
    return ActivityType.USER_LOGOUT;
  } else if (action.includes('create')) {
    return ActivityType.ENTITY_CREATE;
  } else if (action.includes('update') || action.includes('edit') || action.includes('change')) {
    return ActivityType.ENTITY_UPDATE;
  } else if (action.includes('delete') || action.includes('remove')) {
    return ActivityType.ENTITY_DELETE;
  } else if (action.includes('blockchain')) {
    return ActivityType.BLOCKCHAIN_RECORD;
  } else if (action.includes('ai_') || action.includes('ml_') || action.includes('gpt_')) {
    return ActivityType.AI_PROCESSING;
  } else {
    return ActivityType.SYSTEM_EVENT;
  }
}

/**
 * Определяет, нужно ли записывать действие в блокчейн
 * @param data Данные действия
 */
function shouldRecordToBlockchain(data: ActivityData): boolean {
  // Определяем важные действия, которые нужно записывать в блокчейн
  const criticalEntityTypes = ['citizen_request', 'document', 'legal_act', 'contract'];
  const criticalActions = ['approve', 'reject', 'sign', 'finalize', 'publish'];
  
  if (data.entityType && criticalEntityTypes.includes(data.entityType)) {
    return true;
  }
  
  if (data.action && criticalActions.some(action => data.action.includes(action))) {
    return true;
  }
  
  return false;
}