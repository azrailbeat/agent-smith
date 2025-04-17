/**
 * Сервис для управления шаблонами, импорта и экспорта настроек системы
 */

import fs from 'fs/promises';
import path from 'path';
import { dbConnector } from './database-connector';
import { logActivity } from '../activity-logger';
import { storage } from '../storage';

// Типы экспортируемых данных
export enum TemplateType {
  AGENTS = 'agents',
  ORG_STRUCTURE = 'org_structure',
  TASK_RULES = 'task_rules',
  SYSTEM_SETTINGS = 'system_settings',
  ALL = 'all'
}

// Интерфейс для метаданных шаблона
export interface TemplateMetadata {
  name: string;
  description: string;
  version: string;
  createdAt: string;
  author: string;
  templateType: TemplateType | TemplateType[];
}

// Интерфейс шаблона
export interface Template {
  metadata: TemplateMetadata;
  data: Record<string, any>;
}

// Класс для управления шаблонами и экспортом/импортом настроек
export class TemplateManager {
  private static instance: TemplateManager;
  private templatesDir: string;

  // Получение экземпляра синглтона
  public static getInstance(): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }

  // Приватный конструктор для синглтона
  private constructor() {
    this.templatesDir = path.join(process.cwd(), 'data', 'templates');
    this.ensureTemplatesDirExists();
  }

  // Создание директории для шаблонов, если она не существует
  private async ensureTemplatesDirExists(): Promise<void> {
    try {
      await fs.mkdir(this.templatesDir, { recursive: true });
    } catch (error) {
      console.error('Ошибка при создании директории для шаблонов:', error);
    }
  }

  // Экспорт настроек агентов
  public async exportAgents(): Promise<any> {
    const agents = await storage.getAgents();
    const integrations = await storage.getIntegrations();
    
    return {
      agents,
      integrations
    };
  }

  // Экспорт организационной структуры
  public async exportOrgStructure(): Promise<any> {
    const departments = await storage.getDepartments();
    const positions = await storage.getPositions();
    
    return {
      departments,
      positions
    };
  }

  // Экспорт правил распределения задач
  public async exportTaskRules(): Promise<any> {
    const taskRules = await storage.getTaskRules();
    
    return {
      taskRules
    };
  }

  // Экспорт системных настроек
  public async exportSystemSettings(): Promise<any> {
    const settings = await storage.getSystemSettings();
    const statuses = await storage.getSystemStatuses();
    
    return {
      settings,
      statuses
    };
  }

  // Экспорт всех настроек системы
  public async exportAll(): Promise<any> {
    const agents = await this.exportAgents();
    const orgStructure = await this.exportOrgStructure();
    const taskRules = await this.exportTaskRules();
    const systemSettings = await this.exportSystemSettings();
    
    return {
      agents,
      orgStructure,
      taskRules,
      systemSettings
    };
  }

  // Экспорт по указанному типу
  public async exportByType(type: TemplateType): Promise<any> {
    switch (type) {
      case TemplateType.AGENTS:
        return this.exportAgents();
      case TemplateType.ORG_STRUCTURE:
        return this.exportOrgStructure();
      case TemplateType.TASK_RULES:
        return this.exportTaskRules();
      case TemplateType.SYSTEM_SETTINGS:
        return this.exportSystemSettings();
      case TemplateType.ALL:
        return this.exportAll();
      default:
        throw new Error(`Неизвестный тип шаблона: ${type}`);
    }
  }

  // Создание и сохранение шаблона
  public async createTemplate(
    templateType: TemplateType | TemplateType[],
    metadata: Omit<TemplateMetadata, 'templateType' | 'createdAt'>,
    userId: number
  ): Promise<string> {
    try {
      // Создаем метаданные шаблона
      const fullMetadata: TemplateMetadata = {
        ...metadata,
        templateType,
        createdAt: new Date().toISOString()
      };

      // Получаем данные в зависимости от типа шаблона
      let data: Record<string, any> = {};

      if (Array.isArray(templateType)) {
        // Если указано несколько типов
        for (const type of templateType) {
          const typeData = await this.exportByType(type);
          data[type] = typeData;
        }
      } else if (templateType === TemplateType.ALL) {
        // Если экспортируем все
        data = await this.exportAll();
      } else {
        // Если один конкретный тип
        data = await this.exportByType(templateType);
      }

      // Формируем полный шаблон
      const template: Template = {
        metadata: fullMetadata,
        data
      };

      // Генерируем имя файла
      const filename = `${fullMetadata.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
      const filePath = path.join(this.templatesDir, filename);

      // Сохраняем шаблон в файл
      await fs.writeFile(filePath, JSON.stringify(template, null, 2), 'utf-8');

      // Логируем активность
      await logActivity({
        action: 'template_created',
        userId,
        details: `Создан шаблон: ${fullMetadata.name}`,
        metadata: { templateType, filename }
      });

      return filename;
    } catch (error) {
      console.error('Ошибка при создании шаблона:', error);
      throw error;
    }
  }

  // Получение списка доступных шаблонов
  public async getTemplates(): Promise<{ filename: string; metadata: TemplateMetadata }[]> {
    try {
      const files = await fs.readdir(this.templatesDir);
      const templates = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.templatesDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const template = JSON.parse(content) as Template;
          
          templates.push({
            filename: file,
            metadata: template.metadata
          });
        }
      }

      return templates;
    } catch (error) {
      console.error('Ошибка при получении списка шаблонов:', error);
      return [];
    }
  }

  // Получение конкретного шаблона по имени файла
  public async getTemplate(filename: string): Promise<Template | null> {
    try {
      const filePath = path.join(this.templatesDir, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as Template;
    } catch (error) {
      console.error(`Ошибка при получении шаблона ${filename}:`, error);
      return null;
    }
  }

  // Импорт шаблона
  public async importTemplate(filename: string, userId: number): Promise<boolean> {
    try {
      const template = await this.getTemplate(filename);
      if (!template) {
        throw new Error(`Шаблон не найден: ${filename}`);
      }

      const { metadata, data } = template;
      let imported = false;

      // Определяем, какие типы данных импортировать
      const typesToImport = Array.isArray(metadata.templateType)
        ? metadata.templateType
        : [metadata.templateType];

      // Импортируем каждый тип данных
      for (const type of typesToImport) {
        if (type === TemplateType.ALL || typesToImport.includes(TemplateType.ALL)) {
          // Импортируем все типы данных
          if (data.agents) await this.importAgents(data.agents, userId);
          if (data.orgStructure) await this.importOrgStructure(data.orgStructure, userId);
          if (data.taskRules) await this.importTaskRules(data.taskRules, userId);
          if (data.systemSettings) await this.importSystemSettings(data.systemSettings, userId);
          imported = true;
          break;
        } else {
          // Импортируем конкретный тип
          switch (type) {
            case TemplateType.AGENTS:
              await this.importAgents(data, userId);
              break;
            case TemplateType.ORG_STRUCTURE:
              await this.importOrgStructure(data, userId);
              break;
            case TemplateType.TASK_RULES:
              await this.importTaskRules(data, userId);
              break;
            case TemplateType.SYSTEM_SETTINGS:
              await this.importSystemSettings(data, userId);
              break;
          }
          imported = true;
        }
      }

      // Логируем активность
      await logActivity({
        action: 'template_imported',
        userId,
        details: `Импортирован шаблон: ${metadata.name}`,
        metadata: { templateType: metadata.templateType, filename }
      });

      return imported;
    } catch (error) {
      console.error(`Ошибка при импорте шаблона ${filename}:`, error);
      throw error;
    }
  }

  // Импорт агентов
  private async importAgents(data: any, userId: number): Promise<void> {
    if (data.agents && Array.isArray(data.agents)) {
      // Сначала удаляем существующих агентов
      // В реальной системе нужно добавить дополнительные проверки и подтверждения
      
      // Импортируем новых агентов
      for (const agent of data.agents) {
        // Проверяем, существует ли агент с таким именем
        const existingAgent = await storage.getAgentByName(agent.name);
        
        if (existingAgent) {
          // Обновляем существующего агента
          await storage.updateAgent(existingAgent.id, { ...agent, id: existingAgent.id });
        } else {
          // Создаем нового агента
          const { id, ...agentData } = agent; // Удаляем id из данных
          await storage.createAgent(agentData);
        }
      }
    }

    if (data.integrations && Array.isArray(data.integrations)) {
      // Импортируем интеграции
      for (const integration of data.integrations) {
        // Проверяем, существует ли интеграция с таким именем
        const existingIntegration = await storage.getIntegrationByName(integration.name);
        
        if (existingIntegration) {
          // Обновляем существующую интеграцию
          await storage.updateIntegration(existingIntegration.id, { ...integration, id: existingIntegration.id });
        } else {
          // Создаем новую интеграцию
          const { id, ...integrationData } = integration; // Удаляем id из данных
          await storage.createIntegration(integrationData);
        }
      }
    }

    // Логируем активность
    await logActivity({
      action: 'agents_imported',
      userId,
      details: 'Импортированы агенты и интеграции'
    });
  }

  // Импорт организационной структуры
  private async importOrgStructure(data: any, userId: number): Promise<void> {
    if (data.departments && Array.isArray(data.departments)) {
      // Импортируем отделы
      for (const department of data.departments) {
        const existingDepartment = await storage.getDepartmentByName(department.name);
        
        if (existingDepartment) {
          // Обновляем существующий отдел
          await storage.updateDepartment(existingDepartment.id, { ...department, id: existingDepartment.id });
        } else {
          // Создаем новый отдел
          const { id, ...departmentData } = department;
          await storage.createDepartment(departmentData);
        }
      }
    }

    if (data.positions && Array.isArray(data.positions)) {
      // Импортируем должности
      for (const position of data.positions) {
        const existingPosition = await storage.getPositionByName(position.name);
        
        if (existingPosition) {
          // Обновляем существующую должность
          await storage.updatePosition(existingPosition.id, { ...position, id: existingPosition.id });
        } else {
          // Создаем новую должность
          const { id, ...positionData } = position;
          await storage.createPosition(positionData);
        }
      }
    }

    // Логируем активность
    await logActivity({
      action: 'org_structure_imported',
      userId,
      details: 'Импортирована организационная структура'
    });
  }

  // Импорт правил распределения задач
  private async importTaskRules(data: any, userId: number): Promise<void> {
    if (data.taskRules && Array.isArray(data.taskRules)) {
      // Импортируем правила распределения задач
      for (const rule of data.taskRules) {
        const existingRule = await storage.getTaskRuleByName(rule.name);
        
        if (existingRule) {
          // Обновляем существующее правило
          await storage.updateTaskRule(existingRule.id, { ...rule, id: existingRule.id });
        } else {
          // Создаем новое правило
          const { id, ...ruleData } = rule;
          await storage.createTaskRule(ruleData);
        }
      }
    }

    // Логируем активность
    await logActivity({
      action: 'task_rules_imported',
      userId,
      details: 'Импортированы правила распределения задач'
    });
  }

  // Импорт системных настроек
  private async importSystemSettings(data: any, userId: number): Promise<void> {
    if (data.settings && Array.isArray(data.settings)) {
      // Импортируем системные настройки
      for (const setting of data.settings) {
        await storage.updateSystemSetting(setting.key, setting.value);
      }
    }

    if (data.statuses && Array.isArray(data.statuses)) {
      // Импортируем статусы системы
      for (const status of data.statuses) {
        await storage.updateSystemStatus(status.serviceName, {
          serviceName: status.serviceName,
          status: status.status,
          details: status.details,
          lastChecked: new Date()
        });
      }
    }

    // Логируем активность
    await logActivity({
      action: 'system_settings_imported',
      userId,
      details: 'Импортированы системные настройки'
    });
  }

  // Удаление шаблона
  public async deleteTemplate(filename: string, userId: number): Promise<boolean> {
    try {
      const filePath = path.join(this.templatesDir, filename);
      
      // Проверяем, существует ли файл
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`Шаблон не найден: ${filename}`);
      }

      // Удаляем файл
      await fs.unlink(filePath);

      // Логируем активность
      await logActivity({
        action: 'template_deleted',
        userId,
        details: `Удален шаблон: ${filename}`
      });

      return true;
    } catch (error) {
      console.error(`Ошибка при удалении шаблона ${filename}:`, error);
      return false;
    }
  }
}

// Экспорт экземпляра синглтона
export const templateManager = TemplateManager.getInstance();