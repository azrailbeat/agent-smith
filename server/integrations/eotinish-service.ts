/**
 * Сервис для интеграции с eOtinish.kz
 * 
 * Обеспечивает получение обращений из API eOtinish и сохранение их в исходном виде в базу данных
 */

import axios from 'axios';
import { storage } from '../storage';
import { logActivity, ActivityType } from '../activity-logger';
import { InsertRawRequest } from '@shared/schema';

// Конфигурация подключения к API eOtinish
interface EOtinishAPIConfig {
  apiUrl: string;
  apiToken: string;
  orgId: string;
}

// Получение конфигурации из переменных окружения
function getEOtinishConfig(): EOtinishAPIConfig {
  const apiUrl = process.env.EOTINISH_API_URL;
  const apiToken = process.env.EOTINISH_API_TOKEN;
  const orgId = process.env.EOTINISH_ORG_ID;

  if (!apiUrl || !apiToken || !orgId) {
    throw new Error('Отсутствуют обязательные переменные окружения для подключения к eOtinish');
  }

  return {
    apiUrl,
    apiToken,
    orgId,
  };
}

/**
 * Получает новые обращения из API eOtinish
 * @param lastSyncDate Дата последней синхронизации
 * @returns Массив полученных обращений
 */
export async function fetchNewRequestsFromEOtinish(lastSyncDate?: Date, limit: number = 50): Promise<any[]> {
  try {
    const config = getEOtinishConfig();
    
    // Формируем параметры запроса
    const params = {
      org_id: config.orgId,
      date_from: lastSyncDate ? lastSyncDate.toISOString() : undefined,
      limit: limit // Добавляем лимит запрашиваемых записей
    };
    
    // Выполняем запрос к API
    const response = await axios.get(`${config.apiUrl}/appeals`, {
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      params,
    });
    
    if (!response.data || !Array.isArray(response.data.items)) {
      throw new Error('Некорректный формат ответа от API eOtinish');
    }
    
    const items = response.data.items;
    
    // Дополнительно ограничиваем количество возвращаемых элементов, если API не поддерживает параметр limit
    return items.slice(0, limit);
  } catch (error) {
    console.error('Ошибка при получении обращений из eOtinish:', error);
    throw error;
  }
}

/**
 * Сохраняет сырые данные обращений из eOtinish в базу данных
 * @param requests Массив обращений из API eOtinish
 * @returns Результат сохранения
 */
export async function saveRawRequestsToDatabase(requests: any[]): Promise<{
  total: number;
  created: number;
  updated: number;
  errors: number;
  errorDetails: any[];
}> {
  const result = {
    total: requests.length,
    created: 0,
    updated: 0,
    errors: 0,
    errorDetails: [],
  };
  
  for (const request of requests) {
    try {
      // Проверяем наличие обязательного идентификатора
      if (!request.obr_id) {
        throw new Error('Отсутствует обязательный идентификатор обращения');
      }
      
      // Подготавливаем данные для вставки
      const rawRequest: InsertRawRequest = {
        sourceId: request.obr_id.toString(),
        payload: request,
      };
      
      // Проверяем, существует ли уже запись с таким sourceId
      const existingRequest = await storage.getRawRequestBySourceId(request.obr_id.toString());
      
      if (existingRequest) {
        // Обновляем существующую запись
        await storage.updateRawRequest(existingRequest.id, {
          payload: request,
        });
        result.updated++;
      } else {
        // Создаем новую запись
        await storage.createRawRequest(rawRequest);
        result.created++;
      }
    } catch (error) {
      console.error('Ошибка при сохранении обращения:', error);
      result.errors++;
      result.errorDetails.push({
        data: request,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  }
  
  // Логируем результат импорта
  await logActivity({
    action: ActivityType.SYSTEM_EVENT,
    entityType: 'eotinish_import',
    details: `Импортировано обращений из eOtinish: получено ${result.total}, создано ${result.created}, обновлено ${result.updated}, ошибок ${result.errors}`,
  });
  
  return result;
}

/**
 * Синхронизирует обращения из eOtinish
 * @param options Опции синхронизации
 * @returns Результат синхронизации
 */
export async function synchronizeRequestsFromEOtinish(options: {
  lastSyncDate?: Date;
  limit?: number;
} = {}): Promise<{
  success: boolean;
  total: number;
  created: number;
  updated: number;
  errors: number;
  errorDetails: any[];
}> {
  try {
    // Получаем новые обращения из API с учетом лимита
    const requests = await fetchNewRequestsFromEOtinish(options.lastSyncDate, options.limit);
    
    // Сохраняем полученные обращения в базу данных
    const result = await saveRawRequestsToDatabase(requests);
    
    return {
      success: true,
      ...result,
    };
  } catch (error) {
    console.error('Ошибка при синхронизации обращений из eOtinish:', error);
    
    return {
      success: false,
      total: 0,
      created: 0,
      updated: 0,
      errors: 1,
      errorDetails: [{
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      }],
    };
  }
}

/**
 * Преобразует необработанные обращения из raw_requests в task_cards
 * @returns Результат преобразования
 */
export async function processRawRequestsToTaskCards(): Promise<{
  success: boolean;
  total: number;
  processed: number;
  errors: number;
  errorDetails: any[];
}> {
  const result = {
    success: true,
    total: 0,
    processed: 0,
    errors: 0,
    errorDetails: [],
  };
  
  try {
    // Получаем все необработанные сырые обращения
    const unprocessedRequests = await storage.getUnprocessedRawRequests();
    result.total = unprocessedRequests.length;
    
    if (unprocessedRequests.length === 0) {
      return result;
    }
    
    for (const rawRequest of unprocessedRequests) {
      try {
        const payload = rawRequest.payload;
        
        // Преобразуем сырые данные в формат task_card
        const taskCardData = {
          rawRequestId: rawRequest.id,
          title: payload.subject || 'Обращение из eOtinish',
          fullName: payload.fio || 'Не указано',
          contactInfo: payload.contact || payload.email || payload.phone || 'Не указано',
          requestType: payload.reg_type || 'Не указано',
          description: payload.text || 'Без описания',
          status: 'new',
          priority: getPriorityFromPayload(payload),
          deadline: payload.deadline ? new Date(payload.deadline) : undefined,
          overdue: payload.overdue === 'Y',
          metadata: {
            externalId: payload.obr_id,
            externalRegNum: payload.reg_num,
            region: payload.region,
            district: payload.rayon,
            locality: payload.nas_punkt,
            category: payload.category,
            subcategory: payload.subcategory,
            responsibleOrg: payload.org_name,
            externalLoadDate: payload.SDU_LOAD_DATE,
            source: 'eotinish',
          },
          summary: generateSummaryFromPayload(payload),
        };
        
        // Создаем новую task_card
        await storage.createTaskCard(taskCardData);
        
        // Обновляем статус обработки в raw_request
        await storage.updateRawRequest(rawRequest.id, {
          processed: true,
        });
        
        result.processed++;
      } catch (error) {
        console.error(`Ошибка при обработке необработанного обращения ID ${rawRequest.id}:`, error);
        result.errors++;
        result.errorDetails.push({
          rawRequestId: rawRequest.id,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        });
        
        // Помечаем, что произошла ошибка при обработке
        await storage.updateRawRequest(rawRequest.id, {
          error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        });
      }
    }
    
    // Логируем результат обработки
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      entityType: 'raw_requests_processing',
      details: `Обработка необработанных обращений: всего ${result.total}, обработано ${result.processed}, ошибок ${result.errors}`,
    });
    
    return result;
  } catch (error) {
    console.error('Ошибка при обработке необработанных обращений:', error);
    
    return {
      success: false,
      total: result.total,
      processed: result.processed,
      errors: result.errors + 1,
      errorDetails: [
        ...result.errorDetails,
        {
          error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        },
      ],
    };
  }
}

/**
 * Определяет приоритет обращения на основе данных из eOtinish
 */
function getPriorityFromPayload(payload: any): string {
  // Логика определения приоритета
  if (payload.priority) {
    return payload.priority.toLowerCase();
  }
  
  // Если есть deadline и он близко, повышаем приоритет
  if (payload.deadline) {
    const deadline = new Date(payload.deadline);
    const now = new Date();
    const daysToDeadline = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysToDeadline <= 1) {
      return 'high';
    } else if (daysToDeadline <= 3) {
      return 'medium';
    }
  }
  
  // Определяем приоритет по типу обращения
  if (
    payload.reg_type && 
    /(жалоба|срочно|неотложно)/i.test(payload.reg_type)
  ) {
    return 'high';
  }
  
  return 'normal';
}

/**
 * Генерирует краткое описание обращения на основе данных из eOtinish
 */
function generateSummaryFromPayload(payload: any): string | null {
  if (!payload.text) {
    return null;
  }
  
  // Берем первые 200 символов текста обращения
  let summary = payload.text.substring(0, 200);
  
  // Если текст был обрезан, добавляем многоточие
  if (payload.text.length > 200) {
    summary += '...';
  }
  
  return summary;
}

// Экспортируем сервис как объект для использования в других модулях
export const eOtinishService = {
  fetchNewRequestsFromEOtinish,
  saveRawRequestsToDatabase,
  synchronizeRequestsFromEOtinish,
  processRawRequestsToTaskCards
};