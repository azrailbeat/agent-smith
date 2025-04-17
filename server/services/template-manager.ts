/**
 * Менеджер шаблонов для импорта/экспорта агентов, правил и организационной структуры
 */

import fs from 'fs';
import path from 'path';
import { storage } from '../storage';
import { databaseConnector } from './database-connector';

// Logging utilities
const logger = {
  info: (message: string) => console.log(`[Template Manager] ${message}`),
  error: (message: string) => console.error(`[Template Manager Error] ${message}`),
  warn: (message: string) => console.warn(`[Template Manager Warning] ${message}`)
};

export enum TemplateType {
  AGENT = 'agent',
  MINISTRY = 'ministry',
  DEPARTMENT = 'department',
  POSITION = 'position',
  TASK_RULE = 'task_rule',
  SYSTEM_SETTING = 'system_setting',
  ORGANIZATION_STRUCTURE = 'organization_structure' // Включает департаменты, позиции и правила
}

export interface ExportOptions {
  exportDependencies?: boolean;
  exportIntegrations?: boolean;
  prettyPrint?: boolean;
}

export interface ImportOptions {
  overwriteExisting?: boolean;
  importDependencies?: boolean;
}

export interface TemplateExport {
  type: TemplateType;
  version: string;
  exportDate: string;
  data: any;
  dependencies?: {
    agents?: any[];
    ministries?: any[];
    departments?: any[];
    positions?: any[];
    taskRules?: any[];
    integrations?: any[];
    settings?: any[];
  };
}

export class TemplateManager {
  private static instance: TemplateManager;
  private templatesDir: string;
  
  private constructor() {
    this.templatesDir = path.join(__dirname, '..', '..', 'data', 'templates');
    // Создаем директорию, если она не существует
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }
  }
  
  public static getInstance(): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }
  
  /**
   * Экспорт агента в JSON шаблон
   */
  public async exportAgent(agentId: number, options: ExportOptions = {}): Promise<TemplateExport | null> {
    try {
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        logger.error(`Агент с ID ${agentId} не найден`);
        return null;
      }
      
      const template: TemplateExport = {
        type: TemplateType.AGENT,
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: { ...agent }
      };
      
      // Добавляем зависимости, если указано
      if (options.exportDependencies) {
        const dependencies: any = {};
        
        // Министерство, если есть
        if (agent.ministryId) {
          const ministry = await storage.getMinistry(agent.ministryId);
          if (ministry) {
            dependencies.ministries = [ministry];
          }
        }
        
        // Тип агента, если есть
        if (agent.typeId) {
          const agentType = await storage.getAgentType(agent.typeId);
          if (agentType) {
            dependencies.agentTypes = [agentType];
          }
        }
        
        template.dependencies = dependencies;
      }
      
      // Экспорт интеграций
      if (options.exportIntegrations && agent.modelId) {
        const integration = await storage.getIntegration(agent.modelId);
        if (integration) {
          if (!template.dependencies) {
            template.dependencies = {};
          }
          // Маскируем API ключи для безопасности
          const safeIntegration = { ...integration, apiKey: '***' };
          template.dependencies.integrations = [safeIntegration];
        }
      }
      
      return template;
    } catch (error) {
      logger.error(`Ошибка при экспорте агента: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Экспорт организационной структуры (департаменты, позиции, правила)
   */
  public async exportOrgStructure(options: ExportOptions = {}): Promise<TemplateExport | null> {
    try {
      const departments = await storage.getDepartments();
      const positions = await storage.getPositions();
      const taskRules = await storage.getTaskRules();
      
      const template: TemplateExport = {
        type: TemplateType.ORGANIZATION_STRUCTURE,
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: {
          departments,
          positions,
          taskRules
        }
      };
      
      return template;
    } catch (error) {
      logger.error(`Ошибка при экспорте организационной структуры: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Экспорт настроек системы
   */
  public async exportSystemSettings(options: ExportOptions = {}): Promise<TemplateExport | null> {
    try {
      const settings = await storage.getSystemSettings();
      
      const template: TemplateExport = {
        type: TemplateType.SYSTEM_SETTING,
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: settings
      };
      
      return template;
    } catch (error) {
      logger.error(`Ошибка при экспорте настроек системы: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Сохранение шаблона в файл
   */
  public saveTemplateToFile(template: TemplateExport, filename: string): string {
    try {
      if (!filename.endsWith('.json')) {
        filename += '.json';
      }
      
      const filePath = path.join(this.templatesDir, filename);
      const jsonData = JSON.stringify(template, null, 2);
      
      fs.writeFileSync(filePath, jsonData, 'utf8');
      logger.info(`Шаблон сохранен в ${filePath}`);
      
      return filePath;
    } catch (error) {
      logger.error(`Ошибка при сохранении шаблона в файл: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Загрузка шаблона из файла
   */
  public loadTemplateFromFile(filename: string): TemplateExport {
    try {
      if (!filename.endsWith('.json')) {
        filename += '.json';
      }
      
      const filePath = path.join(this.templatesDir, filename);
      const jsonData = fs.readFileSync(filePath, 'utf8');
      
      return JSON.parse(jsonData) as TemplateExport;
    } catch (error) {
      logger.error(`Ошибка при загрузке шаблона из файла: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Получение списка доступных шаблонов
   */
  public getAvailableTemplates(): { name: string, type: TemplateType }[] {
    try {
      const files = fs.readdirSync(this.templatesDir).filter(file => file.endsWith('.json'));
      
      const templates = [];
      for (const file of files) {
        try {
          const filePath = path.join(this.templatesDir, file);
          const jsonData = fs.readFileSync(filePath, 'utf8');
          const template = JSON.parse(jsonData) as TemplateExport;
          
          templates.push({
            name: file.replace('.json', ''),
            type: template.type
          });
        } catch (e) {
          // Игнорируем невалидные файлы
          logger.warn(`Невалидный файл шаблона: ${file}`);
        }
      }
      
      return templates;
    } catch (error) {
      logger.error(`Ошибка при получении списка шаблонов: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Импорт агента из шаблона
   */
  public async importAgent(template: TemplateExport, options: ImportOptions = {}): Promise<number | null> {
    try {
      if (template.type !== TemplateType.AGENT) {
        throw new Error('Неверный тип шаблона для импорта агента');
      }
      
      const agentData = template.data;
      
      // Проверяем, существует ли агент с таким именем
      const existingAgent = await storage.getAgentByName(agentData.name);
      
      if (existingAgent) {
        if (options.overwriteExisting) {
          // Обновляем существующего агента
          await storage.updateAgent(existingAgent.id, {
            ...agentData,
            id: existingAgent.id // Сохраняем оригинальный ID
          });
          logger.info(`Агент ${agentData.name} обновлен`);
          return existingAgent.id;
        } else {
          logger.warn(`Агент с именем ${agentData.name} уже существует`);
          return null;
        }
      }
      
      // Импортируем зависимости, если указано
      if (options.importDependencies && template.dependencies) {
        // Импорт интеграций (только если не существуют)
        if (template.dependencies.integrations) {
          for (const integration of template.dependencies.integrations) {
            const existingIntegration = await storage.getIntegrationByName(integration.name);
            
            if (!existingIntegration) {
              // Не импортируем скрытые API ключи
              if (integration.apiKey === '***') {
                integration.apiKey = '';
              }
              await storage.createIntegration(integration);
              logger.info(`Интеграция ${integration.name} создана`);
            }
          }
        }
        
        // Импорт министерств
        if (template.dependencies.ministries) {
          for (const ministry of template.dependencies.ministries) {
            const existingMinistry = await storage.getMinistryByName(ministry.name);
            
            if (!existingMinistry) {
              await storage.createMinistry(ministry);
              logger.info(`Министерство ${ministry.name} создано`);
            }
          }
        }
        
        // Импорт типов агентов
        if (template.dependencies.agentTypes) {
          for (const agentType of template.dependencies.agentTypes) {
            const existingType = await storage.getAgentTypeByName(agentType.name);
            
            if (!existingType) {
              await storage.createAgentType(agentType);
              logger.info(`Тип агента ${agentType.name} создан`);
            }
          }
        }
      }
      
      // Создаем агента
      const newAgent = await storage.createAgent({
        ...agentData,
        id: undefined // Удаляем ID, чтобы не было конфликта
      });
      
      logger.info(`Агент ${newAgent.name} импортирован с ID ${newAgent.id}`);
      return newAgent.id;
    } catch (error) {
      logger.error(`Ошибка при импорте агента: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Импорт организационной структуры из шаблона
   */
  public async importOrgStructure(template: TemplateExport, options: ImportOptions = {}): Promise<boolean> {
    try {
      if (template.type !== TemplateType.ORGANIZATION_STRUCTURE) {
        throw new Error('Неверный тип шаблона для импорта организационной структуры');
      }
      
      const { departments, positions, taskRules } = template.data;
      
      // Импорт департаментов
      if (departments && Array.isArray(departments)) {
        for (const department of departments) {
          const existingDepartment = await storage.getDepartmentByName(department.name);
          
          if (existingDepartment) {
            if (options.overwriteExisting) {
              await storage.updateDepartment(existingDepartment.id, department);
              logger.info(`Департамент ${department.name} обновлен`);
            }
          } else {
            await storage.createDepartment(department);
            logger.info(`Департамент ${department.name} создан`);
          }
        }
      }
      
      // Импорт позиций
      if (positions && Array.isArray(positions)) {
        for (const position of positions) {
          const existingPosition = await storage.getPositionByName(position.name);
          
          if (existingPosition) {
            if (options.overwriteExisting) {
              await storage.updatePosition(existingPosition.id, position);
              logger.info(`Позиция ${position.name} обновлена`);
            }
          } else {
            await storage.createPosition(position);
            logger.info(`Позиция ${position.name} создана`);
          }
        }
      }
      
      // Импорт правил задач
      if (taskRules && Array.isArray(taskRules)) {
        for (const rule of taskRules) {
          const existingRule = await storage.getTaskRuleByName(rule.name);
          
          if (existingRule) {
            if (options.overwriteExisting) {
              await storage.updateTaskRule(existingRule.id, rule);
              logger.info(`Правило ${rule.name} обновлено`);
            }
          } else {
            await storage.createTaskRule(rule);
            logger.info(`Правило ${rule.name} создано`);
          }
        }
      }
      
      return true;
    } catch (error) {
      logger.error(`Ошибка при импорте организационной структуры: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Импорт настроек системы из шаблона
   */
  public async importSystemSettings(template: TemplateExport, options: ImportOptions = {}): Promise<boolean> {
    try {
      if (template.type !== TemplateType.SYSTEM_SETTING) {
        throw new Error('Неверный тип шаблона для импорта настроек системы');
      }
      
      const settings = template.data;
      
      if (Array.isArray(settings)) {
        for (const setting of settings) {
          await storage.updateSystemSetting(setting.key, setting.value);
          logger.info(`Настройка ${setting.key} импортирована`);
        }
      }
      
      return true;
    } catch (error) {
      logger.error(`Ошибка при импорте настроек системы: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Экспорт всех шаблонов для резервного копирования
   */
  public async exportAllTemplates(options: ExportOptions = {}): Promise<string | null> {
    try {
      const backupDir = path.join(this.templatesDir, 'backup', new Date().toISOString().replace(/:/g, '-'));
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Экспорт агентов
      const agents = await storage.getAgents();
      for (const agent of agents) {
        const template = await this.exportAgent(agent.id, options);
        if (template) {
          const filename = `agent_${agent.name.replace(/\s+/g, '_').toLowerCase()}.json`;
          const filePath = path.join(backupDir, filename);
          fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf8');
        }
      }
      
      // Экспорт организационной структуры
      const orgStructure = await this.exportOrgStructure(options);
      if (orgStructure) {
        const filePath = path.join(backupDir, 'org_structure.json');
        fs.writeFileSync(filePath, JSON.stringify(orgStructure, null, 2), 'utf8');
      }
      
      // Экспорт настроек системы
      const systemSettings = await this.exportSystemSettings(options);
      if (systemSettings) {
        const filePath = path.join(backupDir, 'system_settings.json');
        fs.writeFileSync(filePath, JSON.stringify(systemSettings, null, 2), 'utf8');
      }
      
      // Обновляем системный статус с информацией о последнем бэкапе
      await storage.updateSystemStatus('BackupService', {
        serviceName: 'BackupService', 
        status: 100, 
        details: `Резервное копирование выполнено: ${new Date().toISOString()}`,
        lastChecked: new Date()
      });
      
      logger.info(`Полное резервное копирование выполнено в ${backupDir}`);
      return backupDir;
    } catch (error) {
      logger.error(`Ошибка при создании резервной копии: ${error.message}`);
      return null;
    }
  }
}

export const templateManager = TemplateManager.getInstance();