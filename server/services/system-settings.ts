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

export interface SystemSettings {
  buttonConfigs: ButtonConfigSettings[];
  requestAgentSettings: RequestAgentSettings[];
  ragConfig: RAGConfig;
  [key: string]: any;
}

// Путь к файлу настроек
const SETTINGS_FILE = path.join(process.cwd(), 'data', 'system-settings.json');

// Инициализация директории
function ensureDirectoryExists() {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Значения настроек по умолчанию
const DEFAULT_SETTINGS: SystemSettings = {
  buttonConfigs: [],
  requestAgentSettings: [],
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

// Загрузка настроек из файла
export function loadSettings(): SystemSettings {
  ensureDirectoryExists();
  
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      const settings = JSON.parse(data);
      return { ...DEFAULT_SETTINGS, ...settings };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  
  return DEFAULT_SETTINGS;
}

// Сохранение настроек в файл
export function saveSettings(settings: SystemSettings): void {
  ensureDirectoryExists();
  
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving settings:', error);
    throw new Error('Failed to save settings');
  }
}

// Обновление настроек кнопок
export function updateButtonConfig(config: ButtonConfigSettings): void {
  const settings = loadSettings();
  
  const existingIndex = settings.buttonConfigs.findIndex(c => c.pageType === config.pageType);
  
  if (existingIndex >= 0) {
    settings.buttonConfigs[existingIndex] = config;
  } else {
    settings.buttonConfigs.push(config);
  }
  
  saveSettings(settings);
  
  // Логирование активности
  logActivity({
    actionType: 'system_update',
    description: `Обновлены настройки кнопок агентов для страницы "${config.pageType}"`,
    entityType: 'system_settings',
    action: 'update',
    metadata: {
      settingType: 'buttonConfig',
      pageType: config.pageType
    }
  }).catch(err => console.error('Error logging activity:', err));
}

// Получение настроек кнопок для определенной страницы
export function getButtonConfig(pageType: string): ButtonConfigSettings | undefined {
  const settings = loadSettings();
  return settings.buttonConfigs.find(c => c.pageType === pageType);
}

// Обновление настроек агентов для обработки запросов
export function updateRequestAgentSettings(config: RequestAgentSettings): void {
  const settings = loadSettings();
  
  const existingIndex = settings.requestAgentSettings.findIndex(c => c.requestType === config.requestType);
  
  if (existingIndex >= 0) {
    settings.requestAgentSettings[existingIndex] = config;
  } else {
    settings.requestAgentSettings.push(config);
  }
  
  saveSettings(settings);
  
  // Логирование активности
  logActivity({
    actionType: 'system_update',
    description: `Обновлены настройки агентов для типа запросов "${config.requestType}"`,
    entityType: 'system_settings',
    action: 'update',
    metadata: {
      settingType: 'requestAgentSettings',
      requestType: config.requestType
    }
  }).catch(err => console.error('Error logging activity:', err));
}

// Получение настроек агентов для определенного типа запросов
export function getRequestAgentSettings(requestType: string): RequestAgentSettings | undefined {
  const settings = loadSettings();
  return settings.requestAgentSettings.find(c => c.requestType === requestType);
}

// Обновление глобальных настроек RAG
export function updateRAGConfig(config: RAGConfig): void {
  const settings = loadSettings();
  settings.ragConfig = config;
  saveSettings(settings);
  
  // Логирование активности
  logActivity({
    actionType: 'system_update',
    description: `Обновлены глобальные настройки RAG для агентов`,
    entityType: 'system_settings',
    action: 'update',
    metadata: {
      settingType: 'ragConfig',
      enabled: config.enabled,
      retrievalStrategy: config.retrievalStrategy
    }
  }).catch(err => console.error('Error logging activity:', err));
}

// Получение глобальных настроек RAG
export function getRAGConfig(): RAGConfig {
  const settings = loadSettings();
  return settings.ragConfig;
}

// Инициализация настроек при запуске
export function initializeSettings(): void {
  const settings = loadSettings();
  
  // Если настройки пусты, заполняем значениями по умолчанию
  if (!settings || Object.keys(settings).length === 0) {
    saveSettings(DEFAULT_SETTINGS);
    
    // Логирование активности
    logActivity({
      actionType: 'system_update',
      description: 'Инициализированы настройки системы со значениями по умолчанию',
      entityType: 'system_settings',
      action: 'create'
    }).catch(err => console.error('Error logging activity:', err));
  }
}