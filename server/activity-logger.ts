import { InsertActivity } from '@shared/schema';
import { storage } from './storage';

// Определяем типы для логирования активности
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

// Интерфейс для данных активности
export interface ActivityData {
  action: string;
  entityType?: string;
  entityId?: number;
  userId?: number;
  details?: string;
  metadata?: Record<string, any>;
}

// Функция для логирования активности
export async function logActivity(data: ActivityData): Promise<void> {
  try {
    const { action, entityType, entityId, userId, details, metadata } = data;
    
    console.log(`Logging activity: ${action}, entityType: ${entityType}, entityId: ${entityId}, userId: ${userId}`);
    
    const activity: InsertActivity = {
      action,
      entityType: entityType || '',
      entityId: entityId || 0,
      userId: userId || 0,
      timestamp: new Date(),
      details: details || '',
      metadata: metadata ? JSON.stringify(metadata) : null
    };
    
    await storage.createActivity(activity);
  } catch (error) {
    console.error('Error logging activity:', error);
    // Не прерываем выполнение основного кода, даже если логирование не удалось
  }
}

// Функция для получения последних активностей
export async function getRecentActivities(limit: number = 50): Promise<any[]> {
  try {
    return await storage.getRecentActivities(limit);
  } catch (error) {
    console.error('Error getting recent activities:', error);
    return [];
  }
}

// Функция для получения активностей, связанных с конкретной сущностью
export async function getEntityActivities(entityType: string, entityId: number): Promise<any[]> {
  try {
    const activities = await storage.getActivities();
    return activities.filter(activity => 
      activity.entityType === entityType && activity.entityId === entityId
    );
  } catch (error) {
    console.error('Error getting entity activities:', error);
    return [];
  }
}

// Функция для получения активностей пользователя
export async function getUserActivities(userId: number): Promise<any[]> {
  try {
    const activities = await storage.getActivities();
    return activities.filter(activity => activity.userId === userId);
  } catch (error) {
    console.error('Error getting user activities:', error);
    return [];
  }
}