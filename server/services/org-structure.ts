import { storage } from "../storage";
import { type OrganizationalRule, type InsertOrganizationalRule, type Department, type Position } from "@shared/schema";
import { agentService } from "./agent-service";

// Получение всех правил распределения задач
export async function getTaskRules(): Promise<OrganizationalRule[]> {
  await logActivity("view_list", "Просмотр списка правил распределения задач");
  return await storage.getTaskRules();
}

// Получение правила по ID
export async function getTaskRuleById(id: number): Promise<OrganizationalRule | undefined> {
  const rule = await storage.getTaskRule(id);
  
  if (rule) {
    await logActivity("view_details", `Просмотр правила распределения "${rule.name}"`, {
      entityType: "organizational_rule",
      entityId: rule.id,
    });
  }
  
  return rule;
}

// Сохранение (создание или обновление) правила
export async function saveTaskRule(rule: Partial<OrganizationalRule>): Promise<OrganizationalRule> {
  let savedRule: OrganizationalRule;
  
  if ('id' in rule && rule.id) {
    // Обновление
    const updatedRule = await storage.updateTaskRule(rule.id, rule);
    if (!updatedRule) {
      throw new Error(`Правило с ID ${rule.id} не найдено`);
    }
    savedRule = updatedRule;
  } else {
    // Создание
    savedRule = await storage.createTaskRule(rule);
  }
  
  return savedRule;
}

// Удаление правила
export async function deleteTaskRule(id: number): Promise<boolean> {
  return await storage.deleteTaskRule(id);
}

// Получение всех отделов
export async function getDepartments(): Promise<Department[]> {
  await logActivity("view_list", "Просмотр списка отделов");
  return await storage.getDepartments();
}

// Получение отдела по ID
export async function getDepartmentById(id: number): Promise<Department | undefined> {
  const department = await storage.getDepartment(id);
  
  if (department) {
    await logActivity("view_details", `Просмотр отдела "${department.name}"`, {
      entityType: "department",
      entityId: department.id,
    });
  }
  
  return department;
}

// Сохранение (создание или обновление) отдела
export async function saveDepartment(department: Partial<Department>): Promise<Department> {
  let savedDepartment: Department;
  
  if ('id' in department && department.id) {
    // Обновление
    const updatedDepartment = await storage.updateDepartment(department.id, department);
    if (!updatedDepartment) {
      throw new Error(`Отдел с ID ${department.id} не найден`);
    }
    savedDepartment = updatedDepartment;
  } else {
    // Создание
    savedDepartment = await storage.createDepartment(department);
  }
  
  return savedDepartment;
}

// Получение всех должностей
export async function getPositions(): Promise<Position[]> {
  await logActivity("view_list", "Просмотр списка должностей");
  return await storage.getPositions();
}

// Получение должности по ID
export async function getPositionById(id: number): Promise<Position | undefined> {
  const position = await storage.getPosition(id);
  
  if (position) {
    await logActivity("view_details", `Просмотр должности "${position.name}"`, {
      entityType: "position",
      entityId: position.id,
    });
  }
  
  return position;
}

// Сохранение (создание или обновление) должности
export async function savePosition(position: Partial<Position>): Promise<Position> {
  let savedPosition: Position;
  
  if ('id' in position && position.id) {
    // Обновление
    const updatedPosition = await storage.updatePosition(position.id, position);
    if (!updatedPosition) {
      throw new Error(`Должность с ID ${position.id} не найдена`);
    }
    savedPosition = updatedPosition;
  } else {
    // Создание
    savedPosition = await storage.createPosition(position);
  }
  
  return savedPosition;
}

// Обработка запроса гражданина согласно правилам организационной структуры
export async function processRequestByOrgStructure(requestId: number, textToAnalyze?: string): Promise<any> {
  const request = await storage.getCitizenRequest(requestId);
  if (!request) {
    throw new Error(`Запрос с ID ${requestId} не найден`);
  }
  
  // Получаем все активные правила распределения
  const rules = (await storage.getTaskRules()).filter(rule => 
    rule.isActive && rule.sourceType === 'citizen_request'
  );
  
  // Если правил нет, возвращаем запрос без изменений
  if (rules.length === 0) {
    return { 
      processed: false, 
      request,
      message: 'Нет активных правил распределения'
    };
  }
  
  // Текст для анализа может быть передан явно или взят из запроса
  const textForMatching = textToAnalyze || `${request.subject || ''} ${request.description || ''}`;
  
  // Проверяем каждое правило
  for (const rule of rules) {
    const matches = await matchRuleToRequest(rule, request, textForMatching);
    if (matches) {
      // Применяем правило - назначаем отдел, позицию или агента
      const updatedRequest = await applyRuleToRequest(rule, request);
      
      await logActivity("task_assigned", `Запрос "${request.subject}" обработан по правилу "${rule.name}"`, {
        entityType: "citizen_request",
        entityId: request.id,
        metadata: { ruleId: rule.id }
      });
      
      return { 
        processed: true, 
        request: updatedRequest,
        rule,
        message: `Запрос обработан по правилу "${rule.name}"`
      };
    }
  }
  
  // Если ничего не сработало, возвращаем запрос без изменений
  return { 
    processed: false, 
    request,
    message: 'Не найдено подходящих правил распределения'
  };
}

// Проверка соответствия запроса правилу
async function matchRuleToRequest(rule: OrganizationalRule, request: any, textToAnalyze?: string): Promise<boolean> {
  // Если у правила есть ключевые слова, проверяем их наличие в тексте запроса
  if (rule.keywordsList && rule.keywordsList.length > 0) {
    // Используем переданный текст или берем из запроса
    const textToCheck = (textToAnalyze || `${request.subject} ${request.description}`).toLowerCase();
    
    for (const keyword of rule.keywordsList) {
      if (textToCheck.includes(keyword.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }
  
  // Если ключевых слов нет, но указан тип правила, можно использовать AI для классификации
  if (rule.type) {
    // В простом случае просто проверяем, совпадает ли тип с классификацией
    if (request.aiClassification && request.aiClassification.toLowerCase().includes(rule.type.toLowerCase())) {
      return true;
    }
    
    // Можно добавить более сложную логику с использованием AI для классификации
    if (request.aiProcessed) {
      // Если уже обработано AI, но не классифицировано как нужный тип, то не подходит
      return false;
    }
    
    // Если еще не обработано AI, можно обработать и проверить
    // Но для простоты пока что просто возвращаем false
    return false;
  }
  
  // По умолчанию правило не подходит
  return false;
}

// Применение правила к запросу
async function applyRuleToRequest(rule: OrganizationalRule, request: any): Promise<any> {
  const updates: any = {};
  
  // Устанавливаем отдел, если указан
  if (rule.departmentId) {
    updates.departmentId = rule.departmentId;
    
    // Можно также добавить информацию об отделе в резюме
    const department = await storage.getDepartment(rule.departmentId);
    if (department) {
      updates.aiSuggestion = `Рекомендовано направить в отдел "${department.name}"`;
    }
  }
  
  // Если указана позиция, то можно найти сотрудника с такой позицией и назначить ему
  if (rule.assignToPositionId) {
    // В реальной системе здесь был бы поиск сотрудника по должности
    // Пока просто отмечаем, что запрос нужно назначить на эту должность
    updates.positionId = rule.assignToPositionId;
    
    const position = await storage.getPosition(rule.assignToPositionId);
    if (position) {
      updates.aiSuggestion = `${updates.aiSuggestion || ""} Следует назначить сотруднику с должностью "${position.name}"`;
    }
  }
  
  // Если указан агент, то можем сразу обработать запрос с его помощью
  if (rule.assignToAgentId) {
    // В реальной системе здесь был бы вызов агента для обработки запроса
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
          console.error(`Error processing request with agent ${agent.name}:`, error);
        }
      }
    }
  }
  
  // Обновляем статус, если еще не установлен
  if (request.status === 'new' || !request.status) {
    updates.status = 'processing';
  }
  
  // Применяем обновления
  if (Object.keys(updates).length > 0) {
    return await storage.updateCitizenRequest(request.id, updates);
  }
  
  return request;
}

// Вспомогательная функция для логирования
async function logActivity(action: string, description: string, metadata?: any) {
  await storage.createActivity({
    actionType: action,
    description,
    ...metadata
  });
}
