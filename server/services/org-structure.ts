/**
 * Сервис для управления организационной структурой и маршрутизации задач
 * Обеспечивает связь между ИИ-агентами, пользователями и документами
 */

import { storage } from '../storage';
import { agentService } from './agent-service';
import { logActivity } from '../activity-logger';
import { recordToBlockchain, BlockchainRecordType } from '../blockchain';
import { CitizenRequest, Department, Position, User } from '@shared/types';

/**
 * Находит подразделение по названию категории или отдела
 * @param departmentName Название отдела или категории задачи
 * @returns Найденное подразделение или undefined
 */
export async function findDepartmentByCategory(departmentName: string): Promise<Department | undefined> {
  try {
    const departments = await storage.getDepartments();
    return departments.find(dept => dept.name === departmentName || dept.description?.includes(departmentName));
  } catch (error) {
    console.error('Ошибка при поиске подразделения:', error);
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
    const positions = await storage.getPositionsByDepartment(departmentId);
    // Фильтруем руководящие должности (обычно имеют уровень 1-3)
    const managerPositions = positions.filter(pos => pos.level && pos.level <= 3);
    
    // Если нет руководящих должностей, возвращаем всех сотрудников отдела
    if (managerPositions.length === 0) {
      const users = await storage.getUsersByDepartment(departmentId);
      return users;
    }
    
    const managerIds = managerPositions.map(pos => pos.id);
    const managers = await storage.getUsersByPositions(managerIds);
    
    return managers;
  } catch (error) {
    console.error('Ошибка при получении руководителей подразделения:', error);
    return [];
  }
}

/**
 * Создает базовую организационную структуру
 * @returns Результат создания базовой структуры
 */
export async function createDefaultOrgStructure(): Promise<{
  success: boolean;
  message: string;
  data?: {
    departments: Department[];
    positions: Position[];
  };
}> {
  try {
    // Проверяем, есть ли уже созданные департаменты
    const existingDepartments = await storage.getDepartments();
    
    if (existingDepartments.length > 0) {
      return {
        success: false,
        message: 'Организационная структура уже существует'
      };
    }
    
    // Создаем базовую структуру департаментов
    const departments = [
      { name: 'Руководство', description: 'Высшее руководство организации' },
      { name: 'Канцелярия', description: 'Отдел документооборота и делопроизводства' },
      { name: 'ИТ отдел', description: 'Отдел информационных технологий' },
      { name: 'Кадровая служба', description: 'Отдел управления персоналом' },
      { name: 'Юридический отдел', description: 'Правовое сопровождение деятельности' },
      { name: 'Отдел по работе с гражданами', description: 'Обработка обращений граждан и оказание услуг' }
    ];
    
    // Создаем департаменты
    const createdDepartments: Record<string, any> = {};
    for (const dept of departments) {
      const department = await storage.createDepartment(dept);
      createdDepartments[dept.name] = department;
    }
    
    // Создаем должности
    const positions = [
      { name: 'Руководитель', departmentId: createdDepartments['Руководство'].id, level: 1, canApprove: true, canAssign: true },
      { name: 'Заместитель руководителя', departmentId: createdDepartments['Руководство'].id, level: 2, canApprove: true, canAssign: true },
      { name: 'Начальник отдела', departmentId: createdDepartments['Отдел по работе с гражданами'].id, level: 3, canApprove: true, canAssign: true },
      { name: 'Специалист по обработке обращений', departmentId: createdDepartments['Отдел по работе с гражданами'].id, level: 5, canApprove: false, canAssign: false },
      { name: 'Начальник канцелярии', departmentId: createdDepartments['Канцелярия'].id, level: 3, canApprove: true, canAssign: true },
      { name: 'Делопроизводитель', departmentId: createdDepartments['Канцелярия'].id, level: 6, canApprove: false, canAssign: false },
      { name: 'Начальник ИТ отдела', departmentId: createdDepartments['ИТ отдел'].id, level: 3, canApprove: true, canAssign: true },
      { name: 'Системный администратор', departmentId: createdDepartments['ИТ отдел'].id, level: 4, canApprove: false, canAssign: false },
      { name: 'Разработчик', departmentId: createdDepartments['ИТ отдел'].id, level: 4, canApprove: false, canAssign: false },
      { name: 'Руководитель юридической службы', departmentId: createdDepartments['Юридический отдел'].id, level: 3, canApprove: true, canAssign: true },
      { name: 'Юрист', departmentId: createdDepartments['Юридический отдел'].id, level: 4, canApprove: false, canAssign: false },
      { name: 'Руководитель кадровой службы', departmentId: createdDepartments['Кадровая служба'].id, level: 3, canApprove: true, canAssign: true },
      { name: 'Специалист по кадрам', departmentId: createdDepartments['Кадровая служба'].id, level: 4, canApprove: false, canAssign: false }
    ];
    
    const createdPositions = [];
    for (const pos of positions) {
      const position = await storage.createPosition(pos);
      createdPositions.push(position);
    }
    
    // Логируем создание базовой структуры
    await logActivity({
      action: 'create_org_structure',
      details: 'Создана базовая организационная структура'
    });
    
    return {
      success: true,
      message: 'Базовая организационная структура успешно создана',
      data: {
        departments: Object.values(createdDepartments),
        positions: createdPositions
      }
    };
  } catch (error) {
    console.error('Ошибка при создании базовой организационной структуры:', error);
    return {
      success: false,
      message: `Ошибка при создании базовой организационной структуры: ${error.message}`
    };
  }
}

/**
 * Обрабатывает запрос в соответствии с организационной структурой
 * @param request Обращение для обработки
 * @returns Обработанное обращение с назначенными ответственными
 */
export async function processRequestByOrgStructure(request: CitizenRequest): Promise<CitizenRequest> {
  try {
    // Проверяем наличие классификации
    if (!request.aiClassification) {
      throw new Error('Обращение не классифицировано, требуется предварительная обработка с помощью ИИ');
    }
    
    // Определяем ответственное подразделение на основе классификации
    let targetDepartment: Department | undefined;
    
    // Соответствие категорий подразделениям
    const categoryToDepartment: Record<string, string> = {
      'complaint': 'Отдел по работе с гражданами',
      'proposal': 'Канцелярия',
      'application': 'Отдел по работе с гражданами',
      'information_request': 'Канцелярия',
      'appeal': 'Юридический отдел',
      'gratitude': 'Отдел по работе с гражданами',
      'general': 'Отдел по работе с гражданами',
      'other': 'Канцелярия'
    };
    
    const departmentName = categoryToDepartment[request.aiClassification] || 'Канцелярия';
    targetDepartment = await findDepartmentByCategory(departmentName);
    
    if (!targetDepartment) {
      // Если подразделение не найдено, используем первое доступное
      const departments = await storage.getDepartments();
      targetDepartment = departments[0];
    }
    
    // Находим ответственных сотрудников
    const managers = await getDepartmentManagers(targetDepartment.id);
    let assignedTo = null;
    
    if (managers && managers.length > 0) {
      // Назначаем первому доступному руководителю
      assignedTo = managers[0].id;
    }
    
    // Обновляем обращение с информацией о назначении
    const updates: any = {
      departmentId: targetDepartment.id,
      status: 'assigned',
      assignedTo
    };
    
    // В случае высокого приоритета добавляем пометку
    if (request.priority === 'high' || request.priority === 'urgent') {
      updates.aiSuggestion = `${request.aiSuggestion || ''} Обращение имеет высокий приоритет и требует немедленного рассмотрения.`;
    }
    
    // Применяем правила маршрутизации для обработки запроса
    const rules = await storage.getTaskRulesByEntityType('citizen_request');
    
    // Проверяем, есть ли правило для автоматической обработки такого типа запроса
    for (const rule of rules) {
      if (
        rule.sourceType === 'citizen_request' && 
        rule.conditions && 
        rule.isActive &&
        rule.assignToAgentId
      ) {
        // Проверяем условия правила
        const conditions = JSON.parse(rule.conditions);
        
        // Проверяем соответствие категории
        if (
          conditions.category && 
          conditions.category === request.aiClassification
        ) {
          // Правило применимо, назначаем агенту для обработки запроса
          updates.aiProcessed = true;
          updates.assignedTo = null; // Сбрасываем назначение на сотрудника, так как обрабатывается агентом
          
          const agent = await storage.getAgent(rule.assignToAgentId);
          if (agent) {
            updates.aiSuggestion = `${updates.aiSuggestion || ""} Запрос автоматически обработан агентом "${agent.name}"`;
            
            // Здесь можно добавить логику вызова агента
            if (agent.isActive) {
              try {
                // Вызов агентского сервиса для обработки запроса
                const agentResult = await agentService.processTask({
                  taskType: "citizen_request",
                  entityType: "citizen_request",
                  entityId: request.id,
                  agentId: agent.id,
                  content: request.description,
                  metadata: {
                    subject: request.subject,
                    fullName: request.fullName,
                    contactInfo: request.contactInfo
                  }
                });
                
                if (agentResult && agentResult.result) {
                  updates.aiClassification = agentResult.result.classification || updates.aiClassification;
                  updates.summary = agentResult.result.summary || updates.summary;
                }
              } catch (error) {
                console.error(`Error processing request with agent: ${error}`);
              }
            }
          }
          
          break; // Прерываем цикл, так как нашли подходящее правило
        }
      }
    }
    
    // Обновляем обращение
    const updatedRequest = await storage.updateCitizenRequest(request.id, updates);
    
    // Логируем назначение
    await logActivity({
      action: 'assign_request',
      entityType: 'citizen_request',
      entityId: request.id,
      details: `Обращение №${request.id} назначено в ${targetDepartment.name}${assignedTo ? ` сотруднику ID:${assignedTo}` : ''}`,
    });
    
    // Записываем в блокчейн для обеспечения прозрачности
    try {
      const blockchainHash = await recordToBlockchain({
        entityId: request.id,
        entityType: BlockchainRecordType.CITIZEN_REQUEST,
        action: 'assignment',
        metadata: {
          department: targetDepartment.name,
          departmentId: targetDepartment.id,
          assignedTo,
          timestamp: new Date().toISOString()
        }
      });
      
      // Обновляем хеш блокчейна в обращении
      await storage.updateCitizenRequest(request.id, { blockchainHash });
    } catch (blockchainError) {
      console.error('Ошибка при записи в блокчейн:', blockchainError);
    }
    
    return updatedRequest;
  } catch (error) {
    console.error('Ошибка при обработке запроса по орг. структуре:', error);
    
    // Логируем ошибку
    await logActivity({
      action: 'org_structure_processing_error',
      entityType: 'citizen_request',
      entityId: request.id,
      details: `Ошибка при обработке через орг. структуру: ${error.message}`
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
    const taskRule = await storage.createTaskRule(rule);
    
    // Логируем создание правила
    await logActivity({
      action: 'create_task_rule',
      details: `Создано правило маршрутизации "${rule.name}"`
    });
    
    return taskRule;
  } catch (error) {
    console.error('Ошибка при создании правила маршрутизации:', error);
    throw error;
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
    const request = await storage.getCitizenRequest(requestId);
    
    if (!request) {
      throw new Error(`Обращение с ID ${requestId} не найдено`);
    }
    
    const user = await storage.getUser(userId);
    
    if (!user) {
      throw new Error(`Пользователь с ID ${userId} не найден`);
    }
    
    // Обновляем обращение
    const updatedRequest = await storage.updateCitizenRequest(requestId, {
      assignedTo: userId,
      status: 'assigned'
    });
    
    // Логируем назначение
    await logActivity({
      action: 'manual_assign_request',
      entityType: 'citizen_request',
      entityId: requestId,
      details: `Обращение №${requestId} назначено сотруднику ${user.name} (ID: ${userId})`,
    });
    
    return updatedRequest;
  } catch (error) {
    console.error('Ошибка при назначении обращения сотруднику:', error);
    throw error;
  }
}

/**
 * Интегрирует данные из eOtinish с организационной структурой
 * @param eotinishData Данные из eOtinish
 * @returns Результат интеграции
 */
export async function integrateEOtinishWithOrgStructure(eotinishData: any[]): Promise<{
  success: boolean;
  processed: number;
  failed: number;
  message: string;
}> {
  let processed = 0;
  let failed = 0;
  
  try {
    for (const item of eotinishData) {
      try {
        // Преобразуем формат eOtinish в формат нашей системы
        const citizenRequest = {
          fullName: item.applicantName,
          contactInfo: item.contactInfo || item.email || item.phone,
          requestType: mapEOtinishType(item.requestType),
          subject: item.subject || 'Обращение из eOtinish',
          description: item.content || item.description,
          status: 'new',
          priority: mapEOtinishPriority(item.priority),
          externalId: item.id.toString(),
          externalSource: 'eotinish',
          citizenInfo: JSON.stringify(item.applicantDetails || {})
        };
        
        // Создаем обращение в нашей системе
        const createdRequest = await storage.createCitizenRequest(citizenRequest);
        
        // Обрабатываем обращение с помощью ИИ для классификации
        await processRequestByOrgStructure(createdRequest);
        
        processed++;
      } catch (itemError) {
        console.error(`Ошибка при интеграции элемента eOtinish ID ${item.id}:`, itemError);
        failed++;
      }
    }
    
    // Логируем результат интеграции
    await logActivity({
      action: 'eotinish_integration',
      details: `Интеграция с eOtinish: обработано ${processed}, ошибок ${failed}`
    });
    
    return {
      success: true,
      processed,
      failed,
      message: `Интеграция с eOtinish выполнена. Обработано: ${processed}, ошибок: ${failed}`
    };
  } catch (error) {
    console.error('Ошибка при интеграции с eOtinish:', error);
    
    return {
      success: false,
      processed,
      failed: eotinishData.length - processed,
      message: `Ошибка при интеграции с eOtinish: ${error.message}`
    };
  }
}

/**
 * Сопоставляет типы обращений из eOtinish с типами в нашей системе
 * @param eotinishType Тип обращения в eOtinish
 * @returns Соответствующий тип в нашей системе
 */
function mapEOtinishType(eotinishType: string): string {
  const typeMap: Record<string, string> = {
    'complaint': 'complaint',
    'appeal': 'appeal',
    'suggestion': 'proposal',
    'request': 'information_request',
    'statement': 'application',
    'gratitude': 'gratitude',
    'default': 'other'
  };
  
  return typeMap[eotinishType.toLowerCase()] || 'other';
}

/**
 * Сопоставляет приоритеты из eOtinish с приоритетами в нашей системе
 * @param eotinishPriority Приоритет в eOtinish
 * @returns Соответствующий приоритет в нашей системе
 */
function mapEOtinishPriority(eotinishPriority: string): string {
  const priorityMap: Record<string, string> = {
    'critical': 'urgent',
    'high': 'high',
    'medium': 'medium',
    'low': 'low',
    'default': 'medium'
  };
  
  return priorityMap[eotinishPriority?.toLowerCase()] || 'medium';
}