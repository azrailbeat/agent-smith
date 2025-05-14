/**
 * Сервис для управления организационной структурой и маршрутизации задач
 * Обеспечивает связь между ИИ-агентами, пользователями и документами
 */

import { storage } from '../storage';
import { logActivity, ActivityType } from '../activity-logger';
import { agentService, TaskType, EntityType } from './agent-service';
import { recordToBlockchain, BlockchainRecordType } from '../blockchain';
import { Department, Position, User, CitizenRequest } from '@shared/schema';

/**
 * Находит подразделение по названию категории или отдела
 * @param departmentName Название отдела или категории задачи
 * @returns Найденное подразделение или undefined
 */
export async function findDepartmentByCategory(departmentName: string): Promise<Department | undefined> {
  try {
    // Ищем точное совпадение
    let department = await storage.getDepartmentByName(departmentName);
    
    if (!department) {
      // Ищем подразделение с близким названием
      const departments = await storage.getDepartments();
      
      department = departments.find(dept => 
        dept.name.toLowerCase().includes(departmentName.toLowerCase()) ||
        departmentName.toLowerCase().includes(dept.name.toLowerCase())
      );
    }
    
    return department;
  } catch (error) {
    console.error(`Ошибка при поиске подразделения по категории "${departmentName}":`, error);
    return undefined;
  }
}

/**
 * Находит руководителей подразделения
 * @param departmentId ID подразделения
 * @returns Список руководителей подразделения
 */
export async function getDepartmentManagers(departmentId: number): Promise<User[]> {
  try {
    // Получаем руководящие должности в подразделении
    const positions = await storage.getPositionsByDepartment(departmentId);
    const managerPositions = positions.filter(pos => 
      pos.isManager || pos.name.toLowerCase().includes('руководитель') || 
      pos.name.toLowerCase().includes('начальник') || pos.name.toLowerCase().includes('директор')
    );
    
    // Находим пользователей с этими должностями
    const managers = await storage.getUsersByDepartment(departmentId);
    
    // Фильтруем только руководителей
    return managers.filter(user => 
      managerPositions.some(pos => user.positionId === pos.id)
    );
  } catch (error) {
    console.error(`Ошибка при получении руководителей подразделения ID=${departmentId}:`, error);
    return [];
  }
}

/**
 * Создает базовую организационную структуру
 * @returns Результат создания базовой структуры
 */
export async function createDefaultOrgStructure(): Promise<{
  departments: Department[];
  positions: Position[];
}> {
  try {
    // Логируем начало операции
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      details: 'Создание базовой организационной структуры'
    });
    
    // Проверяем, существует ли уже базовая структура
    const existingDepts = await storage.getDepartments();
    if (existingDepts.length > 0) {
      return { 
        departments: existingDepts,
        positions: await storage.getPositions()
      };
    }
    
    // Создаем базовые подразделения
    const departments = [
      { name: 'Канцелярия', description: 'Прием и обработка входящей и исходящей корреспонденции' },
      { name: 'Отдел по работе с гражданами', description: 'Рассмотрение обращений и жалоб граждан' },
      { name: 'Юридический отдел', description: 'Правовая экспертиза документов и обращений' },
      { name: 'Аналитический отдел', description: 'Анализ данных и подготовка аналитических материалов' },
      { name: 'ИТ-отдел', description: 'Обеспечение работы информационных систем и ИИ-агентов' }
    ];
    
    // Создаем департаменты в БД
    const createdDepartments: Department[] = [];
    for (const dept of departments) {
      const createdDept = await storage.createDepartment({
        name: dept.name,
        description: dept.description
      });
      createdDepartments.push(createdDept);
    }
    
    // Создаем базовые должности для каждого подразделения
    const positions: Position[] = [];
    
    for (const dept of createdDepartments) {
      // Руководящие должности
      positions.push(await storage.createPosition({
        name: `Руководитель ${dept.name}`,
        departmentId: dept.id,
        isManager: true,
        level: 1
      }));
      
      // Рядовые сотрудники
      positions.push(await storage.createPosition({
        name: `Специалист ${dept.name}`,
        departmentId: dept.id,
        isManager: false,
        level: 2
      }));
      
      if (dept.name === 'ИТ-отдел') {
        positions.push(await storage.createPosition({
          name: 'Администратор ИИ-агентов',
          departmentId: dept.id,
          isManager: false,
          level: 2
        }));
      }
    }
    
    // Логируем завершение операции
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      details: `Создана базовая организационная структура. Департаментов: ${createdDepartments.length}, Должностей: ${positions.length}`
    });
    
    return {
      departments: createdDepartments,
      positions
    };
  } catch (error) {
    console.error('Ошибка при создании базовой организационной структуры:', error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      details: `Ошибка при создании организационной структуры: ${error.message}`
    });
    
    throw error;
  }
}

/**
 * Обрабатывает запрос в соответствии с организационной структурой
 * @param request Обращение для обработки
 * @returns Обработанное обращение с назначенными ответственными
 */
export async function processRequestByOrgStructure(request: CitizenRequest): Promise<CitizenRequest> {
  try {
    // Логируем начало обработки
    await logActivity({
      action: ActivityType.AI_PROCESSING,
      entityType: EntityType.CITIZEN_REQUEST,
      entityId: request.id,
      details: 'Начало обработки обращения через организационную структуру'
    });
    
    // Если у запроса нет категории или она была автоматически классифицирована,
    // выполняем классификацию с помощью ИИ-агента
    if (!request.aiClassification || request.aiClassification === 'pending') {
      // Получаем агентов для классификации
      const classificationAgents = await agentService.getAgentsByType('classification');
      
      if (classificationAgents.length > 0) {
        const classificationAgent = classificationAgents[0];
        
        // Обрабатываем запрос с помощью агента
        const classificationTask = {
          taskType: TaskType.CLASSIFICATION,
          entityType: EntityType.CITIZEN_REQUEST,
          entityId: request.id,
          agentId: classificationAgent.id,
          content: request.description,
          metadata: {
            subject: request.subject,
            fullName: request.fullName
          }
        };
        
        // Получаем результат классификации
        const classificationResult = await agentService.processTask(classificationTask);
        
        if (classificationResult.success && classificationResult.result) {
          // Обновляем запрос с результатами классификации
          const classification = classificationResult.result.classification || 'general';
          const priority = classificationResult.result.priority || 'medium';
          const summary = classificationResult.result.summary || '';
          
          // Обновляем запрос в БД
          request = await storage.updateCitizenRequest(request.id, {
            aiClassification: classification,
            priority: priority,
            summary: summary
          });
          
          // Логируем результат классификации
          await logActivity({
            action: ActivityType.AI_PROCESSING,
            entityType: EntityType.CITIZEN_REQUEST,
            entityId: request.id,
            details: `Обращение автоматически классифицировано как "${classification}" с приоритетом "${priority}"`
          });
        }
      }
    }
    
    // Находим подходящий отдел на основе классификации
    const targetDepartment = await findDepartmentByCategory(
      request.aiClassification || 'general'
    );
    
    if (targetDepartment) {
      // Находим правила маршрутизации для этого типа обращений
      const routingRules = await storage.getTaskRulesByEntityType(EntityType.CITIZEN_REQUEST);
      const matchingRule = routingRules.find(rule => 
        rule.conditions?.category === request.aiClassification ||
        rule.conditions?.priority === request.priority
      );
      
      // Если есть подходящее правило, используем его
      if (matchingRule) {
        // Применяем правило маршрутизации
        const targetDepartmentId = matchingRule.targetDepartmentId || targetDepartment.id;
        
        // Назначаем обращение в соответствии с правилом
        request = await assignToDepartment(request, targetDepartmentId);
        
        // Логируем применение правила
        await logActivity({
          action: ActivityType.SYSTEM_EVENT,
          entityType: EntityType.CITIZEN_REQUEST,
          entityId: request.id,
          details: `Применено правило маршрутизации #${matchingRule.id} для обращения`
        });
      } else {
        // Назначаем обращение напрямую найденному отделу
        request = await assignToDepartment(request, targetDepartment.id);
      }
      
      // Если приоритет высокий или срочный, дополнительно уведомляем руководство
      if (request.priority === 'high' || request.priority === 'urgent') {
        const managers = await getDepartmentManagers(targetDepartment.id);
        
        if (managers.length > 0) {
          // Выбираем первого руководителя
          const manager = managers[0];
          
          // Назначаем задачу руководителю
          request = await storage.updateCitizenRequest(request.id, {
            assignedTo: manager.id,
            status: 'assigned'
          });
          
          // Логируем назначение руководителю
          await logActivity({
            action: ActivityType.ENTITY_UPDATE,
            entityType: EntityType.CITIZEN_REQUEST,
            entityId: request.id,
            details: `Обращение с высоким приоритетом назначено руководителю: ${manager.fullName}`
          });
        }
      }
      
      // Если это обращение требует ответа, генерируем черновик ответа с помощью ИИ
      const responseAgents = await agentService.getAgentsByType('response');
      
      if (responseAgents.length > 0) {
        const responseAgent = responseAgents[0];
        
        // Формируем задачу для агента
        const responseTask = {
          taskType: TaskType.RESPONSE,
          entityType: EntityType.CITIZEN_REQUEST,
          entityId: request.id,
          agentId: responseAgent.id,
          content: request.description,
          metadata: {
            subject: request.subject,
            fullName: request.fullName,
            classification: request.aiClassification,
            summary: request.summary
          }
        };
        
        // Получаем черновик ответа
        const responseResult = await agentService.processTask(responseTask);
        
        if (responseResult.success && responseResult.result) {
          // Создаем комментарий с черновиком ответа
          await storage.createComment({
            entityType: EntityType.CITIZEN_REQUEST,
            entityId: request.id,
            userId: 0, // Системный пользователь
            content: `**Черновик автоматического ответа:**\n\n${responseResult.result.response}`,
            isInternal: true
          });
          
          // Логируем создание черновика
          await logActivity({
            action: ActivityType.AI_PROCESSING,
            entityType: EntityType.CITIZEN_REQUEST,
            entityId: request.id,
            details: 'Создан черновик автоматического ответа на обращение'
          });
        }
      }
    } else {
      // Если не удалось найти подходящий отдел, назначаем в Канцелярию по умолчанию
      const defaultDept = await storage.getDepartmentByName('Канцелярия');
      
      if (defaultDept) {
        request = await assignToDepartment(request, defaultDept.id);
      }
    }
    
    // Записываем результат в блокчейн для аудита
    try {
      const blockchainRecord = await recordToBlockchain({
        entityId: request.id,
        entityType: BlockchainRecordType.CITIZEN_REQUEST,
        action: 'route_by_org_structure',
        metadata: {
          departmentId: request.departmentId,
          assignedTo: request.assignedTo,
          priority: request.priority,
          status: request.status,
          timestamp: new Date().toISOString()
        }
      });
      
      // Обновляем хеш блокчейна
      request = await storage.updateCitizenRequest(request.id, {
        blockchainHash: blockchainRecord.hash
      });
      
      // Логируем запись в блокчейн
      await logActivity({
        action: ActivityType.BLOCKCHAIN_RECORD,
        entityType: EntityType.CITIZEN_REQUEST,
        entityId: request.id,
        details: `Результат маршрутизации сохранен в блокчейне с хешем ${blockchainRecord.hash.substring(0, 10)}...`
      });
    } catch (error) {
      console.error('Ошибка при записи в блокчейн:', error);
      
      // Логируем ошибку
      await logActivity({
        action: ActivityType.SYSTEM_EVENT,
        entityType: EntityType.CITIZEN_REQUEST,
        entityId: request.id,
        details: `Ошибка при записи в блокчейн: ${error.message}`
      });
    }
    
    return request;
  } catch (error) {
    console.error('Ошибка при обработке запроса через оргструктуру:', error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      entityType: EntityType.CITIZEN_REQUEST,
      entityId: request.id,
      details: `Ошибка при обработке через оргструктуру: ${error.message}`
    });
    
    return request;
  }
}

/**
 * Создает правило маршрутизации задач
 * @param rule Данные правила
 * @returns Созданное правило
 */
export async function createTaskRule(rule: any): Promise<any> {
  try {
    // Логируем создание правила
    await logActivity({
      action: ActivityType.ENTITY_CREATE,
      details: `Создание правила маршрутизации задач: ${rule.name}`
    });
    
    // Создаем правило в БД
    const createdRule = await storage.createTaskRule(rule);
    
    return createdRule;
  } catch (error) {
    console.error('Ошибка при создании правила маршрутизации:', error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      details: `Ошибка при создании правила маршрутизации: ${error.message}`
    });
    
    throw error;
  }
}

/**
 * Получает список всех правил маршрутизации задач
 * @returns Список правил маршрутизации
 */
export async function getTaskRules(): Promise<any[]> {
  try {
    // Получаем все правила из БД
    const rules = await storage.getTaskRules();
    return rules || [];
  } catch (error) {
    console.error('Ошибка при получении правил маршрутизации:', error);
    return [];
  }
}

/**
 * Получает правило маршрутизации по ID
 * @param id ID правила
 * @returns Правило маршрутизации или undefined, если не найдено
 */
export async function getTaskRuleById(id: number): Promise<any | undefined> {
  try {
    // Получаем правило по ID из БД
    const rule = await storage.getTaskRule(id);
    return rule;
  } catch (error) {
    console.error(`Ошибка при получении правила маршрутизации с ID ${id}:`, error);
    return undefined;
  }
}

/**
 * Обновляет или создает правило маршрутизации задач
 * @param rule Данные правила
 * @returns Обновленное или созданное правило
 */
export async function saveTaskRule(rule: any): Promise<any> {
  try {
    if (rule.id) {
      // Логируем обновление правила
      await logActivity({
        action: ActivityType.ENTITY_UPDATE,
        details: `Обновление правила маршрутизации задач: ${rule.name}`
      });
      
      // Обновляем правило в БД
      const updatedRule = await storage.updateTaskRule(rule.id, rule);
      return updatedRule;
    } else {
      // Если ID не указан, создаем новое правило
      return await createTaskRule(rule);
    }
  } catch (error) {
    console.error('Ошибка при сохранении правила маршрутизации:', error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_ERROR,
      details: `Ошибка при сохранении правила маршрутизации: ${error.message}`
    });
    
    throw error;
  }
}

/**
 * Удаляет правило маршрутизации задач
 * @param id ID правила для удаления
 * @returns true в случае успеха, false в случае ошибки
 */
export async function deleteTaskRule(id: number): Promise<boolean> {
  try {
    // Получаем правило перед удалением для логирования
    const rule = await storage.getTaskRuleById(id);
    
    if (!rule) {
      console.error(`Правило маршрутизации с ID ${id} не найдено`);
      return false;
    }
    
    // Логируем удаление правила
    await logActivity({
      action: ActivityType.ENTITY_DELETE,
      details: `Удаление правила маршрутизации задач: ${rule.name}`
    });
    
    // Удаляем правило из БД
    await storage.deleteTaskRule(id);
    
    return true;
  } catch (error) {
    console.error(`Ошибка при удалении правила маршрутизации с ID ${id}:`, error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_ERROR,
      details: `Ошибка при удалении правила маршрутизации: ${error.message}`
    });
    
    return false;
  }
}

/**
 * Назначает обращение конкретному сотруднику
 * @param requestId ID обращения
 * @param userId ID сотрудника
 * @returns Обновленное обращение
 */
export async function assignRequestToUser(requestId: number, userId: number): Promise<CitizenRequest> {
  try {
    // Получаем пользователя
    const user = await storage.getUser(userId);
    
    if (!user) {
      throw new Error(`Пользователь с ID ${userId} не найден`);
    }
    
    // Получаем обращение
    const request = await storage.getCitizenRequest(requestId);
    
    if (!request) {
      throw new Error(`Обращение с ID ${requestId} не найдено`);
    }
    
    // Обновляем статус и назначенного сотрудника
    const updatedRequest = await storage.updateCitizenRequest(requestId, {
      assignedTo: userId,
      status: 'assigned',
      departmentId: user.departmentId
    });
    
    // Логируем назначение
    await logActivity({
      action: ActivityType.ENTITY_UPDATE,
      entityType: EntityType.CITIZEN_REQUEST,
      entityId: requestId,
      details: `Обращение назначено сотруднику ${user.fullName} (ID: ${userId})`
    });
    
    return updatedRequest;
  } catch (error) {
    console.error('Ошибка при назначении обращения сотруднику:', error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      entityType: EntityType.CITIZEN_REQUEST,
      entityId: requestId,
      details: `Ошибка при назначении сотруднику: ${error.message}`
    });
    
    throw error;
  }
}

/**
 * Назначает обращение в подразделение
 * @param request Обращение для назначения
 * @param departmentId ID подразделения
 * @returns Обновленное обращение
 */
async function assignToDepartment(request: CitizenRequest, departmentId: number): Promise<CitizenRequest> {
  try {
    // Обновляем обращение
    const updatedRequest = await storage.updateCitizenRequest(request.id, {
      departmentId: departmentId,
      status: 'pending'
    });
    
    // Получаем название подразделения
    const department = await storage.getDepartment(departmentId);
    
    // Логируем назначение
    await logActivity({
      action: ActivityType.ENTITY_UPDATE,
      entityType: EntityType.CITIZEN_REQUEST,
      entityId: request.id,
      details: `Обращение направлено в подразделение: ${department?.name || 'Неизвестное подразделение'}`
    });
    
    return updatedRequest;
  } catch (error) {
    console.error('Ошибка при назначении обращения в подразделение:', error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      entityType: EntityType.CITIZEN_REQUEST,
      entityId: request.id,
      details: `Ошибка при назначении в подразделение: ${error.message}`
    });
    
    return request;
  }
}

/**
 * Интегрирует данные из eOtinish с организационной структурой
 * @param eotinishData Данные из eOtinish
 * @returns Результат интеграции
 */
export async function integrateEOtinishWithOrgStructure(eotinishData: any[]): Promise<{
  processed: number;
  created: number;
  error: number;
}> {
  let processed = 0;
  let created = 0;
  let error = 0;
  
  // Логируем начало интеграции
  await logActivity({
    action: ActivityType.SYSTEM_EVENT,
    details: `Начало интеграции данных из eOtinish. Количество записей: ${eotinishData.length}`
  });
  
  for (const eotinishRecord of eotinishData) {
    try {
      processed++;
      
      // Проверяем, существует ли уже такое обращение
      const existingRequests = await storage.getCitizenRequestsByExternalId(eotinishRecord.id);
      
      if (existingRequests.length > 0) {
        // Обращение уже импортировано, пропускаем
        continue;
      }
      
      // Преобразуем данные из eOtinish в формат нашей системы
      const citizenRequest = {
        description: eotinishRecord.text || eotinishRecord.description || 'Нет описания',
        fullName: eotinishRecord.fullName || eotinishRecord.name || 'Неизвестно',
        contactInfo: eotinishRecord.contactInfo || eotinishRecord.email || eotinishRecord.phone || '',
        requestType: mapEOtinishType(eotinishRecord.type),
        subject: eotinishRecord.subject || eotinishRecord.title || 'Без темы',
        priority: mapEOtinishPriority(eotinishRecord.priority),
        status: 'new',
        externalId: eotinishRecord.id.toString(),
        externalSource: 'eOtinish',
        metadata: JSON.stringify(eotinishRecord)
      };
      
      // Создаем обращение в системе
      const createdRequest = await storage.createCitizenRequest(citizenRequest);
      
      // Обрабатываем обращение через оргструктуру
      await processRequestByOrgStructure(createdRequest);
      
      created++;
      
      // Логируем создание обращения
      await logActivity({
        action: ActivityType.ENTITY_CREATE,
        entityType: EntityType.CITIZEN_REQUEST,
        entityId: createdRequest.id,
        details: `Создано обращение из eOtinish (externalId: ${eotinishRecord.id})`
      });
    } catch (error) {
      console.error('Ошибка при обработке записи из eOtinish:', error);
      
      // Логируем ошибку
      await logActivity({
        action: ActivityType.SYSTEM_EVENT,
        details: `Ошибка при обработке записи из eOtinish (ID: ${eotinishRecord.id}): ${error.message}`
      });
      
      error++;
    }
  }
  
  // Логируем результаты интеграции
  await logActivity({
    action: ActivityType.SYSTEM_EVENT,
    details: `Завершена интеграция данных из eOtinish. Обработано: ${processed}, Создано: ${created}, Ошибок: ${error}`
  });
  
  return { processed, created, error };
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