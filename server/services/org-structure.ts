/**
 * Сервис для работы с организационной структурой и правилами распределения задач
 */

import { db } from "../db";
import { storage } from "../storage";
import { logActivity } from "../activity-logger";

// Тип данных для правил распределения задач
export interface TaskDistributionRule {
  id: number;
  name: string;
  description: string;
  sourceType: "meeting" | "citizen_request" | "document";
  keywords: string[];
  departmentId: number;
  positionId: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Демо данные правил распределения (используем, пока не подключена база данных)
const demoRules: TaskDistributionRule[] = [
  { 
    id: 1, 
    name: "Распределение задач по разработке", 
    description: "Автоматическое распределение задач, связанных с разработкой ПО",
    sourceType: "meeting",
    keywords: ["разработка", "ПО", "программирование", "код", "приложение"],
    departmentId: 5,
    positionId: 5,
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 30),
    updatedAt: new Date()
  },
  { 
    id: 2, 
    name: "Распределение задач поддержки", 
    description: "Автоматическое распределение задач технической поддержки",
    sourceType: "citizen_request",
    keywords: ["поддержка", "ошибка", "проблема", "сбой", "помощь"],
    departmentId: 6,
    positionId: 6,
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 20),
    updatedAt: new Date()
  },
  { 
    id: 3, 
    name: "Распределение задач по ИИ", 
    description: "Автоматическое распределение задач связанных с ИИ",
    sourceType: "document",
    keywords: ["ИИ", "искусственный интеллект", "машинное обучение", "НЛП", "анализ данных"],
    departmentId: 7,
    positionId: 7,
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 15),
    updatedAt: new Date()
  },
  { 
    id: 4, 
    name: "Распределение запросов по документам", 
    description: "Автоматическое распределение запросов о документах",
    sourceType: "citizen_request",
    keywords: ["документ", "справка", "удостоверение", "паспорт", "сертификат", "лицензия", "получение документов"],
    departmentId: 2,
    positionId: 8,
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 10),
    updatedAt: new Date()
  },
  { 
    id: 5, 
    name: "Распределение коммунальных запросов", 
    description: "Автоматическое распределение обращений по коммунальным вопросам",
    sourceType: "citizen_request",
    keywords: ["коммунальные", "свет", "вода", "отопление", "электричество", "ремонт", "освещение", "дорога"],
    departmentId: 4,
    positionId: 10,
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 5),
    updatedAt: new Date()
  }
];

// Получение всех правил распределения задач
export async function getTaskRules(): Promise<TaskDistributionRule[]> {
  try {
    // Здесь в будущем будет реализовано получение данных из базы
    // return await db.select().from(taskRules);
    
    // Пока используем демо-данные
    await logActivity({
      action: 'view_list',
      entityType: 'task_rule',
      details: 'Просмотр списка правил распределения задач'
    });
    
    return demoRules;
  } catch (error) {
    console.error('Error fetching task rules:', error);
    throw new Error('Failed to get task rules');
  }
}

// Получение правила по ID
export async function getTaskRuleById(id: number): Promise<TaskDistributionRule | null> {
  try {
    // В будущем - запрос к базе данных
    // return await db.select().from(taskRules).where(eq(taskRules.id, id)).first();
    
    // Пока используем демо-данные
    const rule = demoRules.find(rule => rule.id === id);
    
    if (rule) {
      await logActivity({
        action: 'view_detail',
        entityType: 'task_rule',
        entityId: id,
        details: `Просмотр правила распределения задач "${rule.name}"`
      });
    }
    
    return rule || null;
  } catch (error) {
    console.error(`Error fetching task rule with ID ${id}:`, error);
    throw new Error('Failed to get task rule');
  }
}

// Сохранение правила распределения задач
export async function saveTaskRule(rule: Partial<TaskDistributionRule>): Promise<TaskDistributionRule> {
  try {
    // Здесь будет сохранение в базу данных
    // if (rule.id) {
    //   // Обновление существующего правила
    //   const result = await db.update(taskRules).set(rule).where(eq(taskRules.id, rule.id));
    //   return await getTaskRuleById(rule.id);
    // } else {
    //   // Создание нового правила
    //   const newRule = await db.insert(taskRules).values(rule).returning();
    //   return newRule[0];
    // }
    
    // Пока используем демо-данные
    if (rule.id) {
      // Обновление существующего правила
      const index = demoRules.findIndex(r => r.id === rule.id);
      if (index === -1) {
        throw new Error(`Rule with ID ${rule.id} not found`);
      }
      
      const updatedRule = {
        ...demoRules[index],
        ...rule,
        updatedAt: new Date()
      };
      
      demoRules[index] = updatedRule as TaskDistributionRule;
      
      await logActivity({
        action: 'entity_update',
        entityType: 'task_rule',
        entityId: rule.id,
        details: `Обновлено правило распределения задач "${updatedRule.name}"`
      });
      
      return updatedRule as TaskDistributionRule;
    } else {
      // Создание нового правила
      const newRule: TaskDistributionRule = {
        id: demoRules.length + 1,
        name: rule.name || '',
        description: rule.description || '',
        sourceType: rule.sourceType || 'citizen_request',
        keywords: rule.keywords || [],
        departmentId: rule.departmentId || 0,
        positionId: rule.positionId || 0,
        isActive: rule.isActive !== undefined ? rule.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      demoRules.push(newRule);
      
      await logActivity({
        action: 'entity_create',
        entityType: 'task_rule',
        entityId: newRule.id,
        details: `Создано правило распределения задач "${newRule.name}"`
      });
      
      return newRule;
    }
  } catch (error) {
    console.error('Error saving task rule:', error);
    throw new Error('Failed to save task rule');
  }
}

// Функция для обработки обращения согласно правилам
export async function processRequestByOrgStructure(requestId: number, requestText: string): Promise<any> {
  try {
    // 1. Получаем обращение
    // const request = await storage.getRequestById(requestId);
    // if (!request) throw new Error(`Request with ID ${requestId} not found`);
    
    // 2. Получаем все правила
    const rules = await getTaskRules();
    
    // 3. Ищем подходящее правило по ключевым словам
    const requestTextLower = requestText.toLowerCase();
    const matchedRule = rules.find(rule => 
      rule.sourceType === 'citizen_request' && 
      rule.isActive && 
      rule.keywords.some(keyword => requestTextLower.includes(keyword.toLowerCase()))
    );
    
    if (!matchedRule) {
      return {
        processed: false,
        result: "Не найдено подходящее правило распределения",
        rule: null
      };
    }
    
    // 4. Логируем применение правила
    await logActivity({
      action: 'request_processed',
      entityType: 'citizen_request',
      entityId: requestId,
      details: `Обращение #${requestId} обработано по правилу "${matchedRule.name}"`,
      metadata: {
        ruleId: matchedRule.id,
        departmentId: matchedRule.departmentId,
        positionId: matchedRule.positionId
      }
    });
    
    // 5. Возвращаем результат
    return {
      processed: true,
      result: `Обращение автоматически распределено в отдел #${matchedRule.departmentId}`,
      rule: matchedRule
    };
  } catch (error) {
    console.error(`Error processing request with ID ${requestId} by org structure:`, error);
    throw new Error('Failed to process request by org structure');
  }
}

// Функция для удаления правила распределения
export async function deleteTaskRule(id: number): Promise<boolean> {
  try {
    // Здесь будет удаление из базы данных
    // const result = await db.delete(taskRules).where(eq(taskRules.id, id));
    // return result.rowCount > 0;
    
    // Пока используем демо-данные
    const index = demoRules.findIndex(rule => rule.id === id);
    if (index === -1) {
      return false;
    }
    
    const ruleName = demoRules[index].name;
    demoRules.splice(index, 1);
    
    await logActivity({
      action: 'entity_delete',
      entityType: 'task_rule',
      entityId: id,
      details: `Удалено правило распределения задач "${ruleName}"`
    });
    
    return true;
  } catch (error) {
    console.error(`Error deleting task rule with ID ${id}:`, error);
    throw new Error('Failed to delete task rule');
  }
}