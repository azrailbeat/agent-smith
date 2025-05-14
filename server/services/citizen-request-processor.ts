/**
 * Сервис для обработки обращений граждан с использованием ИИ-агентов и организационной структуры
 * Система автоматически классифицирует обращения, назначает их ответственным отделам/сотрудникам
 * и обрабатывает с помощью соответствующих агентов
 */

import { storage } from '../storage';
import { agentService } from './agent-service';
import { logActivity } from '../activity-logger';
import { CitizenRequest } from '@shared/schema';
import { recordToBlockchain, BlockchainRecordType } from '../blockchain';
import { findDepartmentByCategory, getDepartmentManagers, processRequestByOrgStructure } from './org-structure';

/**
 * Константы типов обращений для классификации
 */
export enum RequestCategory {
  GENERAL = 'general',                  // Общие вопросы
  COMPLAINT = 'complaint',              // Жалоба
  PROPOSAL = 'proposal',                // Предложение
  APPLICATION = 'application',          // Заявление
  INFORMATION_REQUEST = 'info_request', // Запрос информации
  APPEAL = 'appeal',                    // Апелляция
  GRATITUDE = 'gratitude',              // Благодарность
  OTHER = 'other'                       // Прочее
}

/**
 * Карта соответствия категорий обращений и профильных отделов
 */
const CATEGORY_TO_DEPARTMENT_MAP: Record<string, string> = {
  [RequestCategory.GENERAL]: 'Отдел по работе с гражданами',
  [RequestCategory.COMPLAINT]: 'Отдел по работе с гражданами',
  [RequestCategory.PROPOSAL]: 'Канцелярия',
  [RequestCategory.APPLICATION]: 'Отдел по работе с гражданами',
  [RequestCategory.INFORMATION_REQUEST]: 'Канцелярия',
  [RequestCategory.APPEAL]: 'Юридический отдел',
  [RequestCategory.GRATITUDE]: 'Отдел по работе с гражданами',
  [RequestCategory.OTHER]: 'Канцелярия'
};

/**
 * Интерфейс для результатов классификации обращения
 */
interface ClassificationResult {
  category: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  summary: string;
  keywords: string[];
  departmentName?: string;
  needsHumanReview: boolean;
}

/**
 * Обрабатывает новое обращение гражданина
 * 1. Классифицирует обращение с помощью ИИ
 * 2. Определяет ответственное подразделение
 * 3. Назначает исполнителя в соответствии с орг. структурой
 * 4. Создает запись в блокчейне для обеспечения прозрачности
 * 5. Логирует действия системы
 * 
 * @param requestId ID обращения для обработки
 * @returns Обработанное обращение с заполненной информацией
 */
export async function processNewCitizenRequest(requestId: number): Promise<CitizenRequest> {
  try {
    // Получаем обращение по ID
    const request = await storage.getCitizenRequest(requestId);
    if (!request) {
      throw new Error(`Обращение с ID ${requestId} не найдено`);
    }

    // Логируем начало обработки
    await logActivity({
      action: 'process_start',
      entityType: 'citizen_request',
      entityId: requestId,
      details: `Начата автоматическая обработка обращения №${requestId}`
    });

    // Шаг 1: Классификация обращения с помощью AI-агента
    const classificationAgent = await findAIAgentByType('classification');
    
    if (!classificationAgent) {
      throw new Error('Не найден AI-агент для классификации обращений');
    }
    
    const classificationResult = await agentService.processTask({
      taskType: 'classification',
      entityType: 'citizen_request',
      entityId: requestId,
      agentId: classificationAgent.id,
      content: request.description,
      metadata: {
        subject: request.subject,
        fullName: request.fullName,
        contactInfo: request.contactInfo
      }
    });
    
    // Парсим результаты классификации
    const classification: ClassificationResult = classificationResult.result 
      ? JSON.parse(classificationResult.result.classification || '{}')
      : { 
          category: RequestCategory.OTHER, 
          confidence: 0.5, 
          priority: 'medium', 
          summary: '', 
          keywords: [],
          needsHumanReview: true
        };
    
    // Шаг 2: Определение ответственного подразделения
    const departmentName = CATEGORY_TO_DEPARTMENT_MAP[classification.category] || 'Канцелярия';
    const department = await findDepartmentByCategory(departmentName);
    
    if (!department) {
      throw new Error(`Не найдено соответствующее подразделение для категории ${classification.category}`);
    }
    
    // Шаг 3: Назначение исполнителя в соответствии с орг. структурой
    const managers = await getDepartmentManagers(department.id);
    let assignedTo = null;
    
    if (managers && managers.length > 0) {
      // Назначаем первому доступному руководителю подразделения
      assignedTo = managers[0].id;
    }
    
    // Шаг 4: Обновляем данные обращения
    const updatedRequest = await storage.updateCitizenRequest(requestId, {
      status: 'processing',
      aiProcessed: true,
      aiClassification: classification.category,
      priority: classification.priority,
      assignedTo,
      departmentId: department.id,
      summary: classification.summary || request.summary,
      aiSuggestion: `Обращение автоматически классифицировано как "${classification.category}" и направлено в ${departmentName}.`
    });
    
    // Шаг 5: Записываем информацию в блокчейн для обеспечения прозрачности
    try {
      const blockchainHash = await recordToBlockchain({
        entityId: requestId,
        entityType: BlockchainRecordType.CITIZEN_REQUEST,
        action: 'classification',
        metadata: {
          classification: classification.category,
          priority: classification.priority,
          department: departmentName,
          assignedTo,
          timestamp: new Date().toISOString()
        }
      });
      
      // Обновляем хеш блокчейна в обращении
      await storage.updateCitizenRequest(requestId, { blockchainHash });
      
    } catch (blockchainError) {
      console.error('Ошибка при записи в блокчейн:', blockchainError);
      
      // Логируем ошибку, но продолжаем обработку
      await logActivity({
        action: 'blockchain_error',
        entityType: 'citizen_request',
        entityId: requestId,
        details: `Ошибка при записи в блокчейн: ${blockchainError.message}`
      });
    }
    
    // Шаг 6: Логируем результат обработки
    await logActivity({
      action: 'process_complete',
      entityType: 'citizen_request',
      entityId: requestId,
      details: `Обращение №${requestId} обработано и классифицировано как "${classification.category}"`
    });
    
    // Получаем обновленное обращение и возвращаем его
    return await storage.getCitizenRequest(requestId);
  } catch (error) {
    console.error('Ошибка при обработке обращения:', error);
    
    // Логируем ошибку
    await logActivity({
      action: 'process_error',
      entityType: 'citizen_request',
      entityId: requestId,
      details: `Ошибка при обработке обращения: ${error.message}`
    });
    
    // В случае ошибки возвращаем исходное обращение
    return await storage.getCitizenRequest(requestId);
  }
}

/**
 * Находит AI-агента по типу
 * @param type Тип агента (classification, response, analytics)
 * @returns Агент указанного типа
 */
async function findAIAgentByType(type: string) {
  const agents = await storage.getAgents();
  return agents.find(agent => agent.type === type && agent.isActive);
}

/**
 * Обрабатывает обращение AI-агентом для генерации ответа
 * 
 * @param requestId ID обращения
 * @returns Результат обработки
 */
export async function generateResponseForRequest(requestId: number): Promise<CitizenRequest> {
  try {
    // Получаем обращение
    const request = await storage.getCitizenRequest(requestId);
    if (!request) {
      throw new Error(`Обращение с ID ${requestId} не найдено`);
    }
    
    // Находим агента для генерации ответов
    const responseAgent = await findAIAgentByType('response');
    if (!responseAgent) {
      throw new Error('Не найден AI-агент для генерации ответов');
    }
    
    // Логируем начало генерации ответа
    await logActivity({
      action: 'response_generation',
      entityType: 'citizen_request',
      entityId: requestId,
      details: `Начата генерация ответа на обращение №${requestId}`
    });
    
    // Обрабатываем запрос агентом
    const responseResult = await agentService.processTask({
      taskType: 'response',
      entityType: 'citizen_request',
      entityId: requestId,
      agentId: responseAgent.id,
      content: request.description,
      metadata: {
        subject: request.subject,
        fullName: request.fullName,
        contactInfo: request.contactInfo,
        classification: request.aiClassification,
        summary: request.summary
      }
    });
    
    // Получаем сгенерированный ответ
    const responseText = responseResult.result?.response || '';
    
    // Обновляем обращение с сгенерированным ответом
    const updatedRequest = await storage.updateCitizenRequest(requestId, {
      responseText,
      aiSuggestion: `${request.aiSuggestion || ''} Предложен автоматически сгенерированный ответ.`
    });
    
    // Логируем завершение генерации ответа
    await logActivity({
      action: 'response_complete',
      entityType: 'citizen_request',
      entityId: requestId,
      details: `Ответ на обращение №${requestId} сгенерирован`
    });
    
    return updatedRequest;
  } catch (error) {
    console.error('Ошибка при генерации ответа:', error);
    
    // Логируем ошибку
    await logActivity({
      action: 'response_error',
      entityType: 'citizen_request',
      entityId: requestId,
      details: `Ошибка при генерации ответа: ${error.message}`
    });
    
    // В случае ошибки возвращаем исходное обращение
    return await storage.getCitizenRequest(requestId);
  }
}

/**
 * Синхронизировать обращения из eOtinish
 * 
 * @param limit максимальное количество обращений для синхронизации
 * @returns результат синхронизации 
 */
export async function synchronizeRequestsFromEOtinish(limit: number = 50): Promise<{
  success: boolean;
  synchronized: number;
  failed: number;
  message: string;
}> {
  try {
    // Здесь будет логика интеграции с eOtinish API для получения новых обращений
    // Поскольку это зависит от конкретной реализации API eOtinish, оставляем как заглушку
    
    const newRequests = [];
    let synchronized = 0;
    let failed = 0;
    
    // Логируем начало синхронизации
    await logActivity({
      action: 'eotinish_sync_start',
      details: `Начата синхронизация обращений из eOtinish (лимит: ${limit})`
    });
    
    // Для каждого нового обращения
    for (const eotinishRequest of newRequests) {
      try {
        // Преобразуем формат данных из eOtinish в формат нашей системы
        const requestData = {
          // Маппинг полей из eOtinish в нашу структуру
          fullName: eotinishRequest.applicantName,
          contactInfo: eotinishRequest.applicantContact,
          requestType: eotinishRequest.type,
          subject: eotinishRequest.subject,
          description: eotinishRequest.content,
          externalId: eotinishRequest.id.toString(),
          externalSource: 'eotinish',
          status: 'new',
          createdAt: new Date(eotinishRequest.creationDate),
          citizenInfo: eotinishRequest.applicantDetails
        };
        
        // Создаем новое обращение в нашей системе
        const createdRequest = await storage.createCitizenRequest(requestData);
        
        // Запускаем обработку нового обращения
        await processNewCitizenRequest(createdRequest.id);
        
        synchronized++;
      } catch (error) {
        console.error(`Ошибка при импорте обращения из eOtinish:`, error);
        failed++;
      }
    }
    
    // Логируем результат синхронизации
    await logActivity({
      action: 'eotinish_sync_complete',
      details: `Синхронизация завершена. Импортировано: ${synchronized}, ошибок: ${failed}`
    });
    
    return {
      success: true,
      synchronized,
      failed,
      message: `Синхронизация завершена. Импортировано: ${synchronized}, ошибок: ${failed}`
    };
  } catch (error) {
    console.error('Ошибка при синхронизации с eOtinish:', error);
    
    // Логируем ошибку синхронизации
    await logActivity({
      action: 'eotinish_sync_error',
      details: `Ошибка при синхронизации с eOtinish: ${error.message}`
    });
    
    return {
      success: false,
      synchronized: 0,
      failed: 0,
      message: `Ошибка при синхронизации: ${error.message}`
    };
  }
}