/**
 * Модуль для логирования активностей в системе
 * 
 * Обеспечивает запись и хранение всех значимых действий в системе
 * для аудита, аналитики и восстановления истории событий
 */

import { storage } from './storage';

// Типы активностей в системе
export enum ActivityType {
  // Действия над сущностями
  ENTITY_CREATE = 'entity_create',
  ENTITY_UPDATE = 'entity_update',
  ENTITY_DELETE = 'entity_delete',
  
  // Действия пользователей
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_ACTION = 'user_action',
  
  // Системные события
  SYSTEM_EVENT = 'system_event',
  SYSTEM_ERROR = 'system_error',
  SYSTEM_CONFIG = 'system_config',
  
  // Действия ИИ-агентов
  AI_PROCESSING = 'ai_processing',
  AI_ERROR = 'ai_error',
  
  // Блокчейн
  BLOCKCHAIN_RECORD = 'blockchain_record',
  
  // Интеграция с внешними системами
  EXTERNAL_API = 'external_api'
}

// Интерфейс для активности
export interface Activity {
  action: ActivityType;
  userId?: number;
  entityType?: string;
  entityId?: number;
  details: string;
  metadata?: any;
  timestamp?: Date;
}

/**
 * Логирует активность в системе
 * @param activity Данные активности для логирования
 * @returns Созданная запись активности
 */
export async function logActivity(activity: Activity): Promise<any> {
  try {
    // Добавляем текущую дату, если не указана
    if (!activity.timestamp) {
      activity.timestamp = new Date();
    }
    
    // Создаем активность в хранилище
    const createdActivity = await storage.createActivity({
      actionType: activity.action, // Соответствует полю actionType в схеме БД
      userId: activity.userId || 0, // 0 для системных действий
      entityType: activity.entityType,
      entityId: activity.entityId,
      description: activity.details, // Соответствует полю description в схеме БД
      metadata: activity.metadata ? JSON.stringify(activity.metadata) : null,
      timestamp: activity.timestamp
    });
    
    // Для важных событий также записываем в консоль
    if (activity.action === ActivityType.SYSTEM_ERROR || 
        activity.action === ActivityType.AI_ERROR) {
      console.error(`[${activity.action}] ${activity.details}`);
    } else if (process.env.NODE_ENV !== 'production') {
      console.log(`[${activity.action}] ${activity.details}`);
    }
    
    return createdActivity;
  } catch (error) {
    // В случае ошибки при логировании просто пишем в консоль
    console.error('Error logging activity:', error);
    console.error('Activity details:', activity);
    
    // Возвращаем нулевой результат
    return null;
  }
}

/**
 * Получает историю активностей для сущности
 * @param entityType Тип сущности
 * @param entityId ID сущности
 * @param limit Максимальное количество результатов
 * @returns Список активностей
 */
export async function getEntityActivities(
  entityType: string, 
  entityId: number,
  limit: number = 100
): Promise<any[]> {
  try {
    return await storage.getActivitiesByEntity(entityType, entityId, limit);
  } catch (error) {
    console.error('Error fetching entity activities:', error);
    return [];
  }
}

/**
 * Получает последние системные активности
 * @param limit Максимальное количество результатов
 * @returns Список системных активностей
 */
export async function getSystemActivities(limit: number = 100): Promise<any[]> {
  try {
    return await storage.getActivitiesByType(ActivityType.SYSTEM_EVENT, limit);
  } catch (error) {
    console.error('Error fetching system activities:', error);
    return [];
  }
}

/**
 * Получает последние активности ИИ-агентов
 * @param limit Максимальное количество результатов
 * @returns Список активностей ИИ-агентов
 */
export async function getAIActivities(limit: number = 100): Promise<any[]> {
  try {
    return await storage.getActivitiesByType(ActivityType.AI_PROCESSING, limit);
  } catch (error) {
    console.error('Error fetching AI activities:', error);
    return [];
  }
}

/**
 * Получает активности пользователя
 * @param userId ID пользователя
 * @param limit Максимальное количество результатов
 * @returns Список активностей пользователя
 */
export async function getUserActivities(userId: number, limit: number = 100): Promise<any[]> {
  try {
    return await storage.getActivitiesByUser(userId, limit);
  } catch (error) {
    console.error('Error fetching user activities:', error);
    return [];
  }
}

/**
 * Получает активности определенного типа
 * @param activityType Тип активности
 * @param limit Максимальное количество результатов
 * @returns Список активностей
 */
export async function getActivitiesByType(activityType: ActivityType, limit: number = 100): Promise<any[]> {
  try {
    return await storage.getActivitiesByType(activityType, limit);
  } catch (error) {
    console.error('Error fetching activities by type:', error);
    return [];
  }
}