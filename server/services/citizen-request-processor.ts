/**
 * Сервис для обработки обращений граждан
 * 
 * Обеспечивает автоматическую классификацию, маршрутизацию, генерацию ответов
 * и обработку обращений с использованием ИИ-агентов и интеграции с eOtinish.kz
 */

import { storage } from '../storage';
import { logActivity, ActivityType } from '../activity-logger';
import { agentService, TaskType, EntityType } from './agent-service';
import { processRequestByOrgStructure } from './org-structure';
import { recordToBlockchain, BlockchainRecordType } from '../blockchain';
import { enrichPromptWithRAG } from './vector-store';
import axios from 'axios';
import { eOtinishService } from '../integrations/eotinish-service';

// Интерфейс для интеграции с eOtinish.kz
interface EOtinishAPIConfig {
  apiUrl: string;
  apiToken: string;
  orgId: string;
}

/**
 * Синхронизирует обращения из системы eOtinish
 * @param limit Максимальное количество обращений для синхронизации
 * @returns Результат синхронизации
 */
export async function synchronizeRequestsFromEOtinish(limit: number = 50): Promise<any> {
  console.log(`Запуск синхронизации с eOtinish (лимит: ${limit})`);
  
  try {
    // Используем сервис eOtinish для получения обращений
    const syncResult = await eOtinishService.synchronizeRequestsFromEOtinish({
      limit
    });
    
    // Логирование активности
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      entityType: 'eotinish_sync',
      details: `Выполнена синхронизация с eOtinish. Получено ${syncResult.created + syncResult.updated} обращений.`,
      metadata: syncResult
    });
    
    return syncResult;
  } catch (error) {
    console.error('Ошибка при синхронизации с eOtinish:', error);
    
    // Логирование ошибки
    await logActivity({
      action: ActivityType.SYSTEM_ERROR,
      entityType: 'eotinish_sync',
      details: `Ошибка при синхронизации с eOtinish: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      metadata: { error: String(error) }
    });
    
    throw error;
  }
}

/**
 * Обрабатывает новое обращение гражданина
 * @param requestId ID обращения для обработки
 * @returns Результат обработки
 */
export async function processNewCitizenRequest(requestId: number): Promise<{
  success: boolean;
  requestId: number;
  aiProcessed: boolean;
  blockchainHash?: string;
  error?: string;
}> {
  try {
    // Логируем начало обработки
    await logActivity({
      action: ActivityType.AI_PROCESSING,
      entityType: EntityType.CITIZEN_REQUEST,
      entityId: requestId,
      details: 'Начало автоматической обработки обращения гражданина'
    });
    
    // Получаем обращение из хранилища
    const request = await storage.getCitizenRequest(requestId);
    
    if (!request) {
      throw new Error(`Обращение с ID ${requestId} не найдено`);
    }
    
    // Обновляем статус обращения
    await storage.updateCitizenRequest(requestId, {
      status: 'processing',
      aiProcessed: true
    });
    
    // Обрабатываем обращение через организационную структуру
    // Это включает классификацию, маршрутизацию и назначение
    const processedRequest = await processRequestByOrgStructure(request);
    
    // Записываем результат в блокчейн для обеспечения прозрачности
    let blockchainHash: string | undefined;
    
    try {
      const blockchainRecord = await recordToBlockchain({
        entityId: requestId,
        entityType: BlockchainRecordType.CITIZEN_REQUEST,
        action: 'citizen_request_processed',
        metadata: {
          requestId,
          classification: processedRequest.aiClassification,
          priority: processedRequest.priority,
          departmentId: processedRequest.departmentId,
          assignedTo: processedRequest.assignedTo,
          timestamp: new Date().toISOString()
        }
      });
      
      blockchainHash = blockchainRecord.hash;
      
      // Обновляем хеш блокчейна в обращении
      await storage.updateCitizenRequest(requestId, {
        blockchainHash: blockchainHash
      });
      
      // Логируем запись в блокчейн
      await logActivity({
        action: ActivityType.BLOCKCHAIN_RECORD,
        entityType: EntityType.CITIZEN_REQUEST,
        entityId: requestId,
        details: `Результат обработки обращения записан в блокчейн с хешем ${blockchainHash.substring(0, 10)}...`
      });
    } catch (blockchainError) {
      console.error('Ошибка при записи в блокчейн:', blockchainError);
    }
    
    // Логируем успешное завершение
    await logActivity({
      action: ActivityType.AI_PROCESSING,
      entityType: EntityType.CITIZEN_REQUEST,
      entityId: requestId,
      details: 'Завершена автоматическая обработка обращения'
    });
    
    return {
      success: true,
      requestId,
      aiProcessed: true,
      blockchainHash
    };
  } catch (error) {
    console.error('Ошибка при обработке обращения:', error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      entityType: EntityType.CITIZEN_REQUEST,
      entityId: requestId,
      details: `Ошибка при обработке обращения: ${error.message}`
    });
    
    return {
      success: false,
      requestId,
      aiProcessed: false,
      error: error.message
    };
  }
}

/**
 * Генерирует ответ на обращение гражданина
 * @param requestId ID обращения
 * @returns Сгенерированный ответ
 */
export async function generateResponseForRequest(requestId: number): Promise<{
  success: boolean;
  requestId: number;
  responseText?: string;
  error?: string;
}> {
  try {
    // Логируем начало генерации ответа
    await logActivity({
      action: ActivityType.AI_PROCESSING,
      entityType: EntityType.CITIZEN_REQUEST,
      entityId: requestId,
      details: 'Начало генерации автоматического ответа на обращение'
    });
    
    // Получаем обращение из хранилища
    const request = await storage.getCitizenRequest(requestId);
    
    if (!request) {
      throw new Error(`Обращение с ID ${requestId} не найдено`);
    }
    
    // Получаем агентов для генерации ответа
    const responseAgents = await agentService.getAgentsByType('response');
    
    if (responseAgents.length === 0) {
      throw new Error('Нет доступных агентов для генерации ответа');
    }
    
    // Выбираем первого агента
    const responseAgent = responseAgents[0];
    
    // Формируем задачу для агента
    const responseTask = {
      taskType: TaskType.RESPONSE,
      entityType: EntityType.CITIZEN_REQUEST,
      entityId: requestId,
      agentId: responseAgent.id,
      content: request.description,
      metadata: {
        subject: request.subject,
        fullName: request.fullName,
        classification: request.aiClassification,
        summary: request.summary
      }
    };
    
    // Получаем ответ от агента
    const responseResult = await agentService.processTask(responseTask);
    
    if (!responseResult.success || !responseResult.result) {
      throw new Error('Не удалось сгенерировать ответ на обращение');
    }
    
    // Получаем текст ответа
    const responseText = responseResult.result.response;
    
    // Обновляем обращение с автоматическим ответом
    await storage.updateCitizenRequest(requestId, {
      responseText,
      status: 'answered'
    });
    
    // Создаем комментарий с автоматическим ответом
    await storage.createComment({
      entityType: EntityType.CITIZEN_REQUEST,
      entityId: requestId,
      userId: 0, // Системный пользователь
      content: `**Автоматический ответ:**\n\n${responseText}`,
      isInternal: false
    });
    
    // Логируем успешное завершение
    await logActivity({
      action: ActivityType.AI_PROCESSING,
      entityType: EntityType.CITIZEN_REQUEST,
      entityId: requestId,
      details: 'Сгенерирован автоматический ответ на обращение'
    });
    
    return {
      success: true,
      requestId,
      responseText
    };
  } catch (error) {
    console.error('Ошибка при генерации ответа:', error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      entityType: EntityType.CITIZEN_REQUEST,
      entityId: requestId,
      details: `Ошибка при генерации ответа: ${error.message}`
    });
    
    return {
      success: false,
      requestId,
      error: error.message
    };
  }
}

/**
 * Синхронизирует обращения с eOtinish.kz
 * @param config Конфигурация API eOtinish
 * @returns Результат синхронизации
 */
export async function syncWithEOtinish(config: EOtinishAPIConfig): Promise<{
  success: boolean;
  newRequests: number;
  updatedRequests: number;
  error?: string;
}> {
  try {
    // Логируем начало синхронизации
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      details: 'Начало синхронизации с eOtinish.kz'
    });
    
    // Получаем последнюю дату синхронизации
    const lastSyncSetting = await storage.getSystemSetting('eotinish_last_sync');
    const lastSyncDate = lastSyncSetting ? new Date(lastSyncSetting.value) : new Date(0);
    
    // Формируем запрос к API eOtinish
    const eotinishResponse = await axios.get(`${config.apiUrl}/appeals`, {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'X-Organization-ID': config.orgId
      },
      params: {
        updated_after: lastSyncDate.toISOString(),
        limit: 100
      }
    });
    
    // Проверяем ответ
    if (!eotinishResponse.data || !Array.isArray(eotinishResponse.data.items)) {
      throw new Error('Неверный формат ответа от API eOtinish');
    }
    
    const eotinishItems = eotinishResponse.data.items;
    let newRequests = 0;
    let updatedRequests = 0;
    
    // Обрабатываем полученные данные
    for (const item of eotinishItems) {
      // Проверяем, существует ли уже такое обращение
      const existingRequests = await storage.getCitizenRequestsByExternalId(item.id);
      
      if (existingRequests.length === 0) {
        // Создаем новое обращение
        const citizenRequest = {
          description: item.text || item.description || 'Нет описания',
          fullName: item.fullName || item.name || 'Неизвестно',
          contactInfo: item.contactInfo || item.email || item.phone || '',
          requestType: mapEOtinishType(item.type),
          subject: item.subject || item.title || 'Без темы',
          priority: mapEOtinishPriority(item.priority),
          status: 'new',
          externalId: item.id.toString(),
          externalSource: 'eOtinish',
          metadata: JSON.stringify(item)
        };
        
        // Создаем обращение в системе
        const createdRequest = await storage.createCitizenRequest(citizenRequest);
        
        // Запускаем автоматическую обработку
        await processNewCitizenRequest(createdRequest.id);
        
        newRequests++;
      } else {
        // Обновляем существующее обращение
        const existingRequest = existingRequests[0];
        
        // Проверяем, изменился ли статус в eOtinish
        if (item.status && mapEOtinishStatus(item.status) !== existingRequest.status) {
          await storage.updateCitizenRequest(existingRequest.id, {
            status: mapEOtinishStatus(item.status),
            metadata: JSON.stringify(item)
          });
          
          // Логируем обновление статуса
          await logActivity({
            action: ActivityType.ENTITY_UPDATE,
            entityType: EntityType.CITIZEN_REQUEST,
            entityId: existingRequest.id,
            details: `Обновлен статус из eOtinish: ${mapEOtinishStatus(item.status)}`
          });
          
          updatedRequests++;
        }
      }
    }
    
    // Обновляем дату последней синхронизации
    await storage.updateSystemSetting('eotinish_last_sync', new Date().toISOString());
    
    // Логируем результат синхронизации
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      details: `Завершена синхронизация с eOtinish.kz. Новых обращений: ${newRequests}, Обновлено: ${updatedRequests}`
    });
    
    return {
      success: true,
      newRequests,
      updatedRequests
    };
  } catch (error) {
    console.error('Ошибка при синхронизации с eOtinish:', error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      details: `Ошибка при синхронизации с eOtinish: ${error.message}`
    });
    
    return {
      success: false,
      newRequests: 0,
      updatedRequests: 0,
      error: error.message
    };
  }
}

/**
 * Отправляет ответ на обращение в eOtinish.kz
 * @param requestId ID обращения
 * @param config Конфигурация API eOtinish
 * @returns Результат отправки
 */
export async function sendResponseToEOtinish(requestId: number, config: EOtinishAPIConfig): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Получаем обращение
    const request = await storage.getCitizenRequest(requestId);
    
    if (!request) {
      throw new Error(`Обращение с ID ${requestId} не найдено`);
    }
    
    if (!request.externalId || request.externalSource !== 'eOtinish') {
      throw new Error('Обращение не связано с eOtinish.kz');
    }
    
    // Получаем последний ответ
    const comments = await storage.getCommentsByEntity(EntityType.CITIZEN_REQUEST, requestId);
    const responseComment = comments.find(c => !c.isInternal && c.content.includes('Автоматический ответ'));
    
    if (!responseComment) {
      throw new Error('Ответ на обращение не найден');
    }
    
    // Формируем данные для отправки
    const responseData = {
      appeal_id: request.externalId,
      response_text: responseComment.content.replace('**Автоматический ответ:**\n\n', ''),
      status: 'answered',
      org_id: config.orgId
    };
    
    // Отправляем ответ в eOtinish.kz
    await axios.post(`${config.apiUrl}/appeals/${request.externalId}/response`, responseData, {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'X-Organization-ID': config.orgId
      }
    });
    
    // Обновляем статус обращения
    await storage.updateCitizenRequest(requestId, {
      status: 'answered',
      externalStatus: 'answered'
    });
    
    // Логируем отправку ответа
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      entityType: EntityType.CITIZEN_REQUEST,
      entityId: requestId,
      details: 'Ответ на обращение отправлен в eOtinish.kz'
    });
    
    return { success: true };
  } catch (error) {
    console.error('Ошибка при отправке ответа в eOtinish:', error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      entityType: EntityType.CITIZEN_REQUEST,
      entityId: requestId,
      details: `Ошибка при отправке ответа в eOtinish: ${error.message}`
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Сопоставляет типы обращений из eOtinish с типами в нашей системе
 * @param eotinishType Тип обращения в eOtinish
 * @returns Соответствующий тип в нашей системе
 */
function mapEOtinishType(eotinishType: string): string {
  // Маппинг типов из eOtinish в наши типы
  const typeMapping: Record<string, string> = {
    'complaint': 'complaint', 
    'шағым': 'complaint',
    'жалоба': 'complaint',
    
    'proposal': 'proposal',
    'ұсыныс': 'proposal',
    'предложение': 'proposal',
    
    'request': 'application',
    'сұрау': 'application',
    'запрос': 'application',
    
    'appeal': 'appeal',
    'шағымдану': 'appeal',
    'обращение': 'appeal',
    
    'gratitude': 'gratitude',
    'алғыс': 'gratitude',
    'благодарность': 'gratitude',
    
    'info': 'information_request',
    'ақпарат': 'information_request',
    'информация': 'information_request'
  };
  
  // Приводим к нижнему регистру и убираем пробелы
  const normalizedType = eotinishType?.toLowerCase().trim() || '';
  
  // Возвращаем соответствующий тип или general по умолчанию
  return typeMapping[normalizedType] || 'general';
}

/**
 * Сопоставляет приоритеты из eOtinish с приоритетами в нашей системе
 * @param eotinishPriority Приоритет в eOtinish
 * @returns Соответствующий приоритет в нашей системе
 */
function mapEOtinishPriority(eotinishPriority: string): string {
  // Маппинг приоритетов из eOtinish в наши приоритеты
  const priorityMapping: Record<string, string> = {
    'high': 'high',
    'жоғары': 'high',
    'высокий': 'high',
    
    'medium': 'medium',
    'орташа': 'medium',
    'средний': 'medium',
    
    'low': 'low',
    'төмен': 'low',
    'низкий': 'low',
    
    'urgent': 'urgent',
    'шұғыл': 'urgent',
    'срочный': 'urgent'
  };
  
  // Приводим к нижнему регистру и убираем пробелы
  const normalizedPriority = eotinishPriority?.toLowerCase().trim() || '';
  
  // Возвращаем соответствующий приоритет или medium по умолчанию
  return priorityMapping[normalizedPriority] || 'medium';
}

/**
 * Сопоставляет статусы из eOtinish со статусами в нашей системе
 * @param eotinishStatus Статус в eOtinish
 * @returns Соответствующий статус в нашей системе
 */
function mapEOtinishStatus(eotinishStatus: string): string {
  // Маппинг статусов из eOtinish в наши статусы
  const statusMapping: Record<string, string> = {
    'new': 'new',
    'жаңа': 'new',
    'новый': 'new',
    
    'in_progress': 'inProgress',
    'өңделуде': 'inProgress',
    'в_обработке': 'inProgress',
    
    'waiting': 'waiting',
    'күтуде': 'waiting',
    'ожидание': 'waiting',
    
    'answered': 'answered',
    'жауапберілді': 'answered',
    'отвечено': 'answered',
    
    'closed': 'closed',
    'жабық': 'closed',
    'закрыто': 'closed',
    
    'rejected': 'rejected',
    'қабылданбады': 'rejected',
    'отклонено': 'rejected'
  };
  
  // Приводим к нижнему регистру и убираем пробелы
  const normalizedStatus = eotinishStatus?.toLowerCase().trim() || '';
  
  // Возвращаем соответствующий статус или new по умолчанию
  return statusMapping[normalizedStatus] || 'new';
}

// Экспортируем функции для использования в других модулях
// Функции уже экспортированы выше