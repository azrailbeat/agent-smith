/**
 * Сервис управления системными настройками
 * Обеспечивает централизованное хранение и доступ к настройкам системы
 */

import fs from 'fs';
import path from 'path';
import { logActivity } from '../activity-logger';

// Интерфейсы для типов настроек
export interface AgentButtonConfig {
  agentId: number;
  visible: boolean;
  order: number;
}

export interface ButtonConfigSettings {
  pageType: string;
  buttons: AgentButtonConfig[];
}

export interface RequestAgentSettings {
  requestType: string;
  selectedAgents: number[];
}

export interface RAGSourceSettings {
  id: string;
  name: string;
  type: 'vectordb' | 'database' | 'document' | 'web' | 'internal';
  description: string;
  enabled: boolean;
  metadata?: Record<string, any>;
}

export interface RAGConfig {
  enabled: boolean;
  retrievalStrategy: 'similarity' | 'mmr' | 'hybrid';
  retrievalTopK: number;
  sources: RAGSourceSettings[];
  defaultPrompt: string;
}

export interface IntegrationSettings {
  type: string;  // 'api' | 'widget' | 'bolt' | 'email' | 'activedirectory'
  enabled: boolean;
  settings: Record<string, any>;
}

export interface ISystemSettings {
  buttonConfigs: ButtonConfigSettings[];
  requestAgentSettings: RequestAgentSettings[];
  ragConfig: RAGConfig;
  integrationSettings: IntegrationSettings[];
  [key: string]: any;
}

// Путь к файлу настроек
const SETTINGS_FILE = path.join(process.cwd(), 'data', 'system-settings.json');

// Класс для управления системными настройками
export class SystemSettings {
  private static instance: SystemSettings;
  private settings: ISystemSettings;

  private constructor() {
    this.settings = this.loadSettings();
  }

  public static getInstance(): SystemSettings {
    if (!SystemSettings.instance) {
      SystemSettings.instance = new SystemSettings();
    }
    return SystemSettings.instance;
  }

  public static initialize(): void {
    const instance = SystemSettings.getInstance();
    instance.initializeSettings();
  }
  
  private loadSettings(): ISystemSettings {
    this.ensureDirectoryExists();
    
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
        const settings = JSON.parse(data);
        return { ...DEFAULT_SETTINGS, ...settings };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    
    return { ...DEFAULT_SETTINGS };
  }
  
  private saveSettings(settings: ISystemSettings): void {
    this.ensureDirectoryExists();
    
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error('Failed to save settings');
    }
  }
  
  public initializeSettings(): void {
    // Если настройки пусты, заполняем значениями по умолчанию
    if (!this.settings || Object.keys(this.settings).length === 0) {
      this.saveSettings(DEFAULT_SETTINGS);
      
      // Логирование активности
      logActivity({
        action: 'create',
        entityType: 'system_settings',
        description: 'Инициализированы настройки системы со значениями по умолчанию'
      }).catch(err => console.error('Error logging activity:', err));
    }
  }
  
  public static getSettings(): ISystemSettings {
    return SystemSettings.getInstance().settings;
  }
  
  public static updateSettings(settings: Partial<ISystemSettings>): void {
    const instance = SystemSettings.getInstance();
    instance.settings = { ...instance.settings, ...settings };
    instance.saveSettings(instance.settings);
    
    logActivity({
      action: 'update',
      entityType: 'system_settings',
      description: 'Обновлены настройки системы'
    }).catch(err => console.error('Error logging activity:', err));
  }
  
  public static getButtonConfig(pageType: string): ButtonConfigSettings | undefined {
    const settings = SystemSettings.getSettings();
    return settings.buttonConfigs.find(c => c.pageType === pageType);
  }
  
  public static updateButtonConfig(config: ButtonConfigSettings): void {
    const instance = SystemSettings.getInstance();
    const settings = instance.settings;
    
    const existingIndex = settings.buttonConfigs.findIndex(c => c.pageType === config.pageType);
    
    if (existingIndex >= 0) {
      settings.buttonConfigs[existingIndex] = config;
    } else {
      settings.buttonConfigs.push(config);
    }
    
    instance.saveSettings(settings);
    
    // Логирование активности
    logActivity({
      action: 'update',
      entityType: 'system_settings',
      description: `Обновлены настройки кнопок агентов для страницы "${config.pageType}"`,
      metadata: {
        settingType: 'buttonConfig',
        pageType: config.pageType
      }
    }).catch(err => console.error('Error logging activity:', err));
  }
  
  public static getRequestAgentSettings(requestType: string): RequestAgentSettings | undefined {
    const settings = SystemSettings.getSettings();
    return settings.requestAgentSettings.find(c => c.requestType === requestType);
  }
  
  public static updateRequestAgentSettings(config: RequestAgentSettings): void {
    const instance = SystemSettings.getInstance();
    const settings = instance.settings;
    
    const existingIndex = settings.requestAgentSettings.findIndex(c => c.requestType === config.requestType);
    
    if (existingIndex >= 0) {
      settings.requestAgentSettings[existingIndex] = config;
    } else {
      settings.requestAgentSettings.push(config);
    }
    
    instance.saveSettings(settings);
    
    // Логирование активности
    logActivity({
      action: 'update',
      entityType: 'system_settings',
      description: `Обновлены настройки агентов для типа запросов "${config.requestType}"`,
      metadata: {
        settingType: 'requestAgentSettings',
        requestType: config.requestType
      }
    }).catch(err => console.error('Error logging activity:', err));
  }
  
  public static getRAGConfig(): RAGConfig {
    const settings = SystemSettings.getSettings();
    return settings.ragConfig;
  }
  
  public static updateRAGConfig(config: RAGConfig): void {
    const instance = SystemSettings.getInstance();
    const settings = instance.settings;
    settings.ragConfig = config;
    instance.saveSettings(settings);
    
    // Логирование активности
    logActivity({
      action: 'update',
      entityType: 'system_settings',
      description: `Обновлены глобальные настройки RAG для агентов`,
      metadata: {
        settingType: 'ragConfig',
        enabled: config.enabled,
        retrievalStrategy: config.retrievalStrategy
      }
    }).catch(err => console.error('Error logging activity:', err));
  }
  // Инициализация директории
  private ensureDirectoryExists(): void {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  // Методы для работы с настройками интеграций
  public static getIntegrationSettings(type: string): IntegrationSettings | undefined {
    const settings = SystemSettings.getSettings();
    return settings.integrationSettings.find(c => c.type === type);
  }

  public static updateIntegrationSettings(config: IntegrationSettings): void {
    const instance = SystemSettings.getInstance();
    const settings = instance.settings;
    
    const existingIndex = settings.integrationSettings.findIndex(c => c.type === config.type);
    
    if (existingIndex >= 0) {
      settings.integrationSettings[existingIndex] = config;
    } else {
      settings.integrationSettings.push(config);
    }
    
    instance.saveSettings(settings);
    
    // Логирование активности
    logActivity({
      action: 'update',
      entityType: 'system_settings',
      description: `Обновлены настройки интеграции "${config.type}"`,
      metadata: {
        settingType: 'integrationSettings',
        integrationType: config.type,
        enabled: config.enabled
      }
    }).catch(err => console.error('Error logging activity:', err));
  }
}

// Значения настроек по умолчанию
const DEFAULT_SETTINGS: ISystemSettings = {
  buttonConfigs: [],
  requestAgentSettings: [],
  integrationSettings: [
    {
      type: 'api',
      enabled: false,
      settings: {
        apiKey: '',
        autoProcess: false,
        selectedAgent: null
      }
    },
    {
      type: 'widget',
      enabled: false,
      settings: {
        title: 'Форма обращения',
        primaryColor: '#1c64f2',
        theme: 'light',
        formFields: [
          { id: 1, type: 'text', label: 'ФИО', required: true },
          { id: 2, type: 'email', label: 'Email', required: true }
        ]
      }
    },
    {
      type: 'bolt',
      enabled: false,
      settings: {
        template: 'landing-page',
        integrationMethod: 'javascript-widget',
        generatedTemplate: false
      }
    },
    {
      type: 'email',
      enabled: false,
      settings: {
        provider: 'smtp',
        sendgrid: {
          apiKey: '',
          defaultFrom: 'Agent Smith <no-reply@agentsmith.gov.kz>'
        },
        smtp: {
          host: '',
          port: 587,
          secure: false,
          auth: {
            user: '',
            pass: ''
          }
        }
      }
    },
    {
      type: 'activedirectory',
      enabled: false,
      settings: {
        url: '',
        baseDN: '',
        domain: '',
        username: '',
        password: '',
        useTLS: false
      }
    }
  ],
  ragConfig: {
    enabled: true,
    retrievalStrategy: 'hybrid',
    retrievalTopK: 5,
    sources: [
      {
        id: 'milvus-gov',
        name: 'Государственные документы',
        type: 'vectordb',
        description: 'База государственных документов и НПА',
        enabled: true,
        metadata: {
          collection: 'gov_documents',
          engine: 'milvus'
        }
      },
      {
        id: 'internal-knowledge',
        name: 'Внутренние базы знаний',
        type: 'internal',
        description: 'Внутренние справочники и базы знаний',
        enabled: true,
        metadata: {
          path: '/data/knowledge'
        }
      },
      {
        id: 'document-archive',
        name: 'Архив документов',
        type: 'document',
        description: 'Исторический архив документов и справочников',
        enabled: false,
        metadata: {
          path: '/data/archive'
        }
      },
      {
        id: 'web-sources',
        name: 'Веб-источники',
        type: 'web',
        description: 'Данные из проверенных государственных веб-ресурсов',
        enabled: false,
        metadata: {
          allowedDomains: ['gov.kz', 'egov.kz']
        }
      }
    ],
    defaultPrompt: 'Используйте только данные из проверенных источников для ответа на этот вопрос:'
  }
};

// Для совместимости со старым кодом
export function loadSettings(): ISystemSettings {
  return SystemSettings.getSettings();
}

// Для совместимости со старым кодом
export function saveSettings(settings: ISystemSettings): void {
  SystemSettings.updateSettings(settings);
}

// Для совместимости со старым кодом
export function updateButtonConfig(config: ButtonConfigSettings): void {
  SystemSettings.updateButtonConfig(config);
}

// Для совместимости со старым кодом
export function getButtonConfig(pageType: string): ButtonConfigSettings | undefined {
  return SystemSettings.getButtonConfig(pageType);
}

// Для совместимости со старым кодом
export function updateRequestAgentSettings(config: RequestAgentSettings): void {
  SystemSettings.updateRequestAgentSettings(config);
}

// Для совместимости со старым кодом
export function getRequestAgentSettings(requestType: string): RequestAgentSettings | undefined {
  return SystemSettings.getRequestAgentSettings(requestType);
}

// Для совместимости со старым кодом
export function updateRAGConfig(config: RAGConfig): void {
  SystemSettings.updateRAGConfig(config);
}

// Для совместимости со старым кодом
export function getRAGConfig(): RAGConfig {
  return SystemSettings.getRAGConfig();
}

// Для совместимости со старым кодом
export function initializeSettings(): void {
  SystemSettings.initialize();
}

// Для совместимости со старым кодом для настроек интеграций
export function getIntegrationSettings(type: string): IntegrationSettings | undefined {
  return SystemSettings.getIntegrationSettings(type);
}

// Для совместимости со старым кодом для настроек интеграций
export function updateIntegrationSettings(config: IntegrationSettings): void {
  SystemSettings.updateIntegrationSettings(config);
}