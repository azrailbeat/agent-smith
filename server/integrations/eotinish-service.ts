/**
 * Сервис интеграции с системой электронных обращений граждан eOtinish.kz
 * Обеспечивает синхронизацию данных между системами
 */

import axios from 'axios';
import { storage } from '../storage';
import { logActivity, ActivityType } from '../activity-logger';
import { InsertCitizenRequest } from '@shared/schema';
import { withRetry } from '../utils/retry-utils';

// Константы
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

// Конфигурация
interface EOtinishConfig {
  apiUrl: string;
  apiKey: string;
  syncInterval: number; // в миллисекундах
  lastSyncTimestamp?: string;
}

// Типы данных eOtinish
interface EOtinishRequest {
  reg_date: string;
  obr_id: string;
  text: string;
  reg_num: string;
  reg_type: string;
  region?: string;
  rayon?: string; // district
  nas_punkt?: string; // locality
  category?: string;
  subcategory?: string;
  org_name?: string;
  status: string;
  decision?: string;
  deadline?: string;
  overdue?: boolean;
  SOURCE?: string;
  SDU_LOAD_DATE?: string;
}

let eotinishConfig: EOtinishConfig = {
  apiUrl: process.env.EOTINISH_API_URL || 'https://api.eotinish.kz/v1',
  apiKey: process.env.EOTINISH_API_KEY || '',
  syncInterval: parseInt(process.env.EOTINISH_SYNC_INTERVAL || '3600000') // По умолчанию раз в час
};

/**
 * Инициализация конфигурации eOtinish
 */
export async function initEOtinishConfig(): Promise<void> {
  try {
    // Загружаем сохраненную конфигурацию из БД или настроек
    const savedConfig = await storage.getSystemSettingByKey('eotinish_config');
    
    if (savedConfig) {
      eotinishConfig = {
        ...eotinishConfig,
        ...JSON.parse(savedConfig.value)
      };
    }
    
    // Логируем успешную инициализацию
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      details: 'Инициализирована конфигурация eOtinish',
      metadata: { 
        apiUrl: eotinishConfig.apiUrl,
        syncInterval: eotinishConfig.syncInterval,
        lastSyncTimestamp: eotinishConfig.lastSyncTimestamp || 'не проводилась'
      }
    });
  } catch (error: any) {
    console.error('Ошибка при инициализации конфигурации eOtinish:', error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_ERROR,
      details: `Ошибка при инициализации конфигурации eOtinish: ${error.message}`
    });
  }
}

/**
 * Получение списка обращений из eOtinish
 * @param fromDate Дата начала периода (ISO формат)
 * @param toDate Дата окончания периода (ISO формат)
 * @returns Массив обращений из eOtinish
 */
export async function fetchRequestsFromEOtinish(
  fromDate?: string,
  toDate?: string
): Promise<EOtinishRequest[]> {
  try {
    // Если API ключ не настроен, возвращаем пустой массив
    if (!eotinishConfig.apiKey) {
      console.warn('API ключ eOtinish не настроен');
      return [];
    }
    
    const params: any = {};
    
    // Добавляем параметры дат, если они указаны
    if (fromDate) {
      params.from_date = fromDate;
    }
    if (toDate) {
      params.to_date = toDate;
    }
    
    // Выполняем запрос к API eOtinish с использованием механизма retry
    const response = await withRetry(
      async () => {
        return axios.get(`${eotinishConfig.apiUrl}/requests`, {
          params,
          headers: {
            'Authorization': `Bearer ${eotinishConfig.apiKey}`,
            'Accept': 'application/json'
          }
        });
      },
      'получение обращений из eOtinish',
      MAX_RETRY_ATTEMPTS,
      RETRY_DELAY_MS
    );
    
    // Логируем успешное получение данных
    await logActivity({
      action: ActivityType.EXTERNAL_API,
      details: `Получены данные из eOtinish: ${response.data.length} обращений`,
      metadata: { fromDate, toDate }
    });
    
    return response.data;
  } catch (error: any) {
    console.error('Ошибка при получении данных из eOtinish:', error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_ERROR,
      details: `Ошибка при получении данных из eOtinish: ${error.message}`
    });
    
    // Возвращаем пустой массив в случае ошибки
    return [];
  }
}

/**
 * Нормализация текста из некорректной кодировки
 * @param text Исходный текст
 * @returns Нормализованный текст
 */
function normalizeText(text: string): string {
  if (!text) return '';
  
  // Базовая нормализация: удаление лишних пробелов, переносов строк и т.д.
  let normalized = text.trim()
    .replace(/\s+/g, ' ')
    .replace(/\\n/g, '\n');
  
  // Если текст в некорректной кодировке, применяем соответствующие преобразования
  // Эта часть зависит от конкретной проблемы с кодировкой в eOtinish
  
  return normalized;
}

/**
 * Преобразование данных eOtinish в формат системы
 * @param request Данные обращения из eOtinish
 * @returns Данные для вставки в нашу систему
 */
function mapEOtinishToSystemRequest(request: EOtinishRequest): InsertCitizenRequest {
  // Преобразуем нормализованный текст в поля subject и description
  const normalizedText = normalizeText(request.text || '');
  const textLines = normalizedText.split('\n').filter(line => line.trim().length > 0);
  
  // Первая строка как тема, остальное как описание
  const subject = textLines.length > 0 
    ? textLines[0].substring(0, 255) 
    : `Обращение ${request.reg_num || request.obr_id}`;
  
  const description = textLines.length > 1 
    ? textLines.slice(1).join('\n') 
    : normalizedText;
  
  // Определяем имя заявителя из текста или используем заглушку
  const fullName = 'ФИО заявителя'; // В идеале получать из eOtinish, если доступно
  
  // Формируем контактную информацию
  const contactInfo = 'Контактная информация'; // В идеале получать из eOtinish, если доступно
  
  // Преобразуем статус
  const statusMap: Record<string, string> = {
    'в процессе': 'in_progress',
    'завершено': 'completed',
    'завершено с просрочкой': 'completed_overdue',
    'просрочено': 'overdue',
    'новое': 'new',
    'зарегистрировано': 'registered'
    // Другие возможные статусы
  };
  
  // Приоритет по умолчанию - средний, но можно определять из других полей
  const priority = request.overdue ? 'high' : 'medium';
  
  // Дата дедлайна, если есть
  const deadline = request.deadline ? new Date(request.deadline) : undefined;
  
  // Информация о гражданине и прочие метаданные
  const citizenInfo = {
    region: request.region || '',
    district: request.rayon || '',
    locality: request.nas_punkt || '',
    category: request.category || '',
    subcategory: request.subcategory || '',
    source: request.SOURCE || 'eotinish',
    originalData: {
      ...request,
      text: undefined // Не дублируем большие поля
    }
  };
  
  return {
    fullName,
    contactInfo,
    requestType: request.reg_type || 'unknown',
    subject,
    description,
    status: statusMap[request.status.toLowerCase()] || 'new',
    priority,
    externalId: request.obr_id,
    externalSource: 'eotinish',
    externalRegNum: request.reg_num,
    region: request.region,
    district: request.rayon,
    locality: request.nas_punkt,
    category: request.category,
    subcategory: request.subcategory,
    responsibleOrg: request.org_name,
    decision: request.decision,
    deadline: deadline,
    overdue: Boolean(request.overdue),
    citizenInfo,
    attachments: []
  };
}

/**
 * Синхронизация обращений из eOtinish
 * @param fromDate Дата начала периода (ISO формат)
 * @returns Результат синхронизации
 */
export async function synchronizeRequestsFromEOtinish(fromDate?: string): Promise<{
  totalProcessed: number;
  newRequests: number;
  updatedRequests: number;
  errors: number;
}> {
  try {
    const result = {
      totalProcessed: 0,
      newRequests: 0,
      updatedRequests: 0,
      errors: 0
    };
    
    // Получаем данные с API eOtinish
    const externalRequests = await fetchRequestsFromEOtinish(
      fromDate || eotinishConfig.lastSyncTimestamp,
      new Date().toISOString()
    );
    
    if (externalRequests.length === 0) {
      console.log('Нет новых обращений для синхронизации');
      return result;
    }
    
    result.totalProcessed = externalRequests.length;
    
    // Обрабатываем каждое обращение
    for (const externalRequest of externalRequests) {
      try {
        // Проверяем, существует ли уже такое обращение
        const existingRequest = await storage.getCitizenRequestByExternalId(
          externalRequest.obr_id, 
          'eotinish'
        );
        
        if (existingRequest) {
          // Обновляем существующее обращение
          const updateData = mapEOtinishToSystemRequest(externalRequest);
          
          await storage.updateCitizenRequest(existingRequest.id, updateData);
          
          result.updatedRequests++;
          
          // Логируем обновление
          await logActivity({
            action: ActivityType.ENTITY_UPDATE,
            entityType: 'citizen_request',
            entityId: existingRequest.id,
            details: `Обновлено обращение из eOtinish: ${externalRequest.reg_num || externalRequest.obr_id}`,
            metadata: { externalId: externalRequest.obr_id }
          });
        } else {
          // Создаем новое обращение
          const newRequestData = mapEOtinishToSystemRequest(externalRequest);
          
          const newRequest = await storage.createCitizenRequest(newRequestData);
          
          result.newRequests++;
          
          // Логируем создание
          await logActivity({
            action: ActivityType.ENTITY_CREATE,
            entityType: 'citizen_request',
            entityId: newRequest.id,
            details: `Создано новое обращение из eOtinish: ${externalRequest.reg_num || externalRequest.obr_id}`,
            metadata: { externalId: externalRequest.obr_id }
          });
        }
      } catch (requestError: any) {
        console.error(`Ошибка при обработке обращения ${externalRequest.obr_id}:`, requestError);
        
        // Логируем ошибку
        await logActivity({
          action: ActivityType.SYSTEM_ERROR,
          details: `Ошибка при обработке обращения из eOtinish: ${requestError.message}`,
          metadata: { 
            externalId: externalRequest.obr_id,
            regNum: externalRequest.reg_num
          }
        });
        
        result.errors++;
      }
    }
    
    // Обновляем время последней синхронизации
    const now = new Date().toISOString();
    eotinishConfig.lastSyncTimestamp = now;
    
    // Сохраняем обновленную конфигурацию
    await storage.setSystemSetting('eotinish_config', JSON.stringify(eotinishConfig));
    
    // Логируем успешную синхронизацию
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      details: `Завершена синхронизация с eOtinish: новых: ${result.newRequests}, обновлено: ${result.updatedRequests}, ошибок: ${result.errors}`,
      metadata: { 
        totalProcessed: result.totalProcessed,
        lastSyncTimestamp: now
      }
    });
    
    return result;
  } catch (error: any) {
    console.error('Ошибка при синхронизации данных с eOtinish:', error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_ERROR,
      details: `Ошибка при синхронизации данных с eOtinish: ${error.message}`
    });
    
    return {
      totalProcessed: 0,
      newRequests: 0,
      updatedRequests: 0,
      errors: 1
    };
  }
}

/**
 * Отправка статуса обращения в eOtinish
 * @param requestId ID обращения в нашей системе
 * @param status Новый статус
 * @param comment Комментарий к изменению статуса
 * @returns Результат операции
 */
export async function updateRequestStatusInEOtinish(
  requestId: number,
  status: string,
  comment?: string
): Promise<boolean> {
  try {
    // Если API ключ не настроен, возвращаем ошибку
    if (!eotinishConfig.apiKey) {
      console.warn('API ключ eOtinish не настроен');
      return false;
    }
    
    // Получаем обращение из нашей системы
    const request = await storage.getCitizenRequest(requestId);
    
    if (!request || !request.externalId || request.externalSource !== 'eotinish') {
      console.warn(`Обращение ${requestId} не найдено или не связано с eOtinish`);
      return false;
    }
    
    // Преобразуем статус из нашей системы в формат eOtinish
    const statusMap: Record<string, string> = {
      'new': 'новое',
      'in_progress': 'в процессе',
      'completed': 'завершено',
      'completed_overdue': 'завершено с просрочкой',
      'overdue': 'просрочено',
      'registered': 'зарегистрировано'
    };
    
    const eotinishStatus = statusMap[status] || status;
    
    // Выполняем запрос к API eOtinish для обновления статуса
    const response = await withRetry(
      async () => {
        return axios.post(
          `${eotinishConfig.apiUrl}/requests/${request.externalId}/status`, 
          {
            status: eotinishStatus,
            comment: comment || `Статус изменен на: ${eotinishStatus}`
          },
          {
            headers: {
              'Authorization': `Bearer ${eotinishConfig.apiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );
      },
      'обновление статуса в eOtinish',
      MAX_RETRY_ATTEMPTS,
      RETRY_DELAY_MS
    );
    
    // Логируем успешное обновление
    await logActivity({
      action: ActivityType.EXTERNAL_API,
      entityType: 'citizen_request',
      entityId: requestId,
      details: `Статус обращения обновлен в eOtinish: ${eotinishStatus}`,
      metadata: { 
        externalId: request.externalId,
        oldStatus: request.status,
        newStatus: status,
        comment
      }
    });
    
    return true;
  } catch (error: any) {
    console.error(`Ошибка при обновлении статуса обращения в eOtinish:`, error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_ERROR,
      details: `Ошибка при обновлении статуса обращения в eOtinish: ${error.message}`,
      metadata: { requestId, status }
    });
    
    return false;
  }
}

/**
 * Получение детальной информации об обращении из eOtinish
 * @param externalId ID обращения в eOtinish
 * @returns Детальная информация об обращении или null в случае ошибки
 */
export async function getRequestDetailsFromEOtinish(externalId: string): Promise<EOtinishRequest | null> {
  try {
    // Если API ключ не настроен, возвращаем null
    if (!eotinishConfig.apiKey) {
      console.warn('API ключ eOtinish не настроен');
      return null;
    }
    
    // Выполняем запрос к API eOtinish с использованием механизма retry
    const response = await withRetry(
      async () => {
        return axios.get(`${eotinishConfig.apiUrl}/requests/${externalId}`, {
          headers: {
            'Authorization': `Bearer ${eotinishConfig.apiKey}`,
            'Accept': 'application/json'
          }
        });
      },
      'получение деталей обращения из eOtinish',
      MAX_RETRY_ATTEMPTS,
      RETRY_DELAY_MS
    );
    
    // Логируем успешное получение данных
    await logActivity({
      action: ActivityType.EXTERNAL_API,
      details: `Получены детали обращения из eOtinish: ${externalId}`,
      metadata: { externalId }
    });
    
    return response.data;
  } catch (error: any) {
    console.error(`Ошибка при получении деталей обращения из eOtinish:`, error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_ERROR,
      details: `Ошибка при получении деталей обращения из eOtinish: ${error.message}`,
      metadata: { externalId }
    });
    
    return null;
  }
}

/**
 * Настройка планировщика для регулярной синхронизации
 */
export function setupEOtinishSyncScheduler(): NodeJS.Timeout {
  console.log(`Настройка планировщика синхронизации с eOtinish (интервал: ${eotinishConfig.syncInterval}мс)`);
  
  // Инициализируем конфигурацию перед запуском
  initEOtinishConfig().catch(console.error);
  
  // Возвращаем идентификатор таймера для возможности остановки при необходимости
  return setInterval(async () => {
    try {
      console.log('Запуск плановой синхронизации с eOtinish...');
      await synchronizeRequestsFromEOtinish();
    } catch (error: any) {
      console.error('Ошибка в планировщике синхронизации eOtinish:', error);
    }
  }, eotinishConfig.syncInterval);
}

/**
 * Вспомогательная функция для перекодирования текста из eOtinish
 * @param text Исходный текст с проблемами кодировки
 * @returns Исправленный текст
 */
export function decodeEOtinishText(text: string): string {
  if (!text) return '';
  
  try {
    // Примеры преобразований для типичных проблем с кодировкой
    let decodedText = text
      // Замена типичных проблемных последовательностей
      .replace(/Ð¢/g, 'Т')
      .replace(/Ð°/g, 'а')
      .replace(/Ð±/g, 'б')
      .replace(/Ð²/g, 'в')
      .replace(/Ð³/g, 'г')
      .replace(/Ð´/g, 'д')
      .replace(/Ðµ/g, 'е')
      .replace(/Ñ'/g, 'ё')
      .replace(/Ð¶/g, 'ж')
      .replace(/Ð·/g, 'з')
      .replace(/Ð¸/g, 'и')
      .replace(/Ð¹/g, 'й')
      .replace(/Ðº/g, 'к')
      .replace(/Ð»/g, 'л')
      .replace(/Ð¼/g, 'м')
      .replace(/Ð½/g, 'н')
      .replace(/Ð¾/g, 'о')
      .replace(/Ð¿/g, 'п')
      .replace(/Ñ€/g, 'р')
      .replace(/Ñ/g, 'с')
      .replace(/Ñ‚/g, 'т')
      .replace(/Ñƒ/g, 'у')
      .replace(/Ñ„/g, 'ф')
      .replace(/Ñ…/g, 'х')
      .replace(/Ñ†/g, 'ц')
      .replace(/Ñ‡/g, 'ч')
      .replace(/Ñˆ/g, 'ш')
      .replace(/Ñ‰/g, 'щ')
      .replace(/ÑŠ/g, 'ъ')
      .replace(/Ñ‹/g, 'ы')
      .replace(/ÑŒ/g, 'ь')
      .replace(/Ñ/g, 'э')
      .replace(/ÑŽ/g, 'ю')
      .replace(/Ñ/g, 'я')
      // Можно добавить другие замены
      
      // Общая нормализация
      .replace(/\s+/g, ' ')
      .trim();
    
    return decodedText;
  } catch (error) {
    console.error('Ошибка при декодировании текста:', error);
    return text; // Возвращаем исходный текст в случае ошибки
  }
}

/**
 * Вспомогательная утилита для тестирования API eOtinish
 */
export async function testEOtinishConnection(): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  try {
    // Если API ключ не настроен, возвращаем ошибку
    if (!eotinishConfig.apiKey) {
      return {
        success: false,
        message: 'API ключ eOtinish не настроен'
      };
    }
    
    // Тестовый запрос к API
    const response = await axios.get(`${eotinishConfig.apiUrl}/status`, {
      headers: {
        'Authorization': `Bearer ${eotinishConfig.apiKey}`,
        'Accept': 'application/json'
      }
    });
    
    return {
      success: true,
      message: 'Соединение с eOtinish успешно установлено',
      data: response.data
    };
  } catch (error: any) {
    console.error('Ошибка при тестировании соединения с eOtinish:', error);
    
    return {
      success: false,
      message: `Ошибка соединения: ${error.message}`,
      data: error.response?.data
    };
  }
}