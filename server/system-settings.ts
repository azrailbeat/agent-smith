/**
 * Системные настройки
 */
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Тип для настроек LLM моделей
export interface LlmSettings {
  apiKey?: string;
  defaultModel?: string;
  [key: string]: any;
}

// Тип для настроек интеграций
export interface IntegrationSettings {
  enabled?: boolean;
  apiKey?: string;
  baseUrl?: string;
  [key: string]: any;
}

// Тип для системных настроек
export interface SystemSettingsData {
  llmModels?: {
    [key: string]: LlmSettings;
  };
  integrations?: {
    [key: string]: IntegrationSettings;
  };
  appSettings?: {
    [key: string]: any;
  };
}

class SystemSettings {
  private settingsPath: string;
  private settings: SystemSettingsData = {};
  
  constructor() {
    this.settingsPath = path.join(process.cwd(), 'data', 'settings');
  }
  
  /**
   * Инициализирует системные настройки
   */
  public async init(): Promise<void> {
    await this.ensureDirectoryExists(this.settingsPath);
    await this.loadSettings();
  }
  
  /**
   * Убеждается, что директория существует
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      console.error(`Failed to create directory ${dirPath}:`, error);
      throw new Error(`Failed to create settings directory: ${error}`);
    }
  }
  
  /**
   * Загружает настройки из файловой системы
   */
  private async loadSettings(): Promise<void> {
    const llmSettingsPath = path.join(this.settingsPath, 'llm-settings.json');
    const integrationSettingsPath = path.join(this.settingsPath, 'integration-settings.json');
    const appSettingsPath = path.join(this.settingsPath, 'app-settings.json');
    
    try {
      this.settings.llmModels = await this.loadJsonFile(llmSettingsPath, {});
      this.settings.integrations = await this.loadJsonFile(integrationSettingsPath, {});
      this.settings.appSettings = await this.loadJsonFile(appSettingsPath, {});
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = {
        llmModels: {},
        integrations: {},
        appSettings: {}
      };
    }
  }
  
  /**
   * Загружает JSON файл
   */
  private async loadJsonFile(filePath: string, defaultValue: any): Promise<any> {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Файл не существует, создаем с дефолтными значениями
        await this.saveJsonFile(filePath, defaultValue);
        return defaultValue;
      }
      
      console.error(`Error loading ${filePath}:`, error);
      return defaultValue;
    }
  }
  
  /**
   * Сохраняет JSON файл
   */
  private async saveJsonFile(filePath: string, data: any): Promise<void> {
    try {
      await this.ensureDirectoryExists(path.dirname(filePath));
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error(`Error saving ${filePath}:`, error);
      throw new Error(`Failed to save settings file ${filePath}: ${error}`);
    }
  }
  
  /**
   * Получает настройки LLM модели
   */
  public async getLlmSettings(modelName: string): Promise<LlmSettings | null> {
    if (!this.settings.llmModels) {
      await this.loadSettings();
    }
    
    return this.settings.llmModels?.[modelName] || null;
  }
  
  /**
   * Обновляет настройки LLM модели
   */
  public async updateLlmSettings(modelName: string, settings: LlmSettings): Promise<void> {
    if (!this.settings.llmModels) {
      this.settings.llmModels = {};
    }
    
    this.settings.llmModels[modelName] = {
      ...this.settings.llmModels[modelName] || {},
      ...settings
    };
    
    await this.saveJsonFile(
      path.join(this.settingsPath, 'llm-settings.json'),
      this.settings.llmModels
    );
  }
  
  /**
   * Получает настройки интеграции
   */
  public async getIntegrationSettings(integrationName: string): Promise<IntegrationSettings | null> {
    if (!this.settings.integrations) {
      await this.loadSettings();
    }
    
    return this.settings.integrations?.[integrationName] || null;
  }
  
  /**
   * Обновляет настройки интеграции
   */
  public async updateIntegrationSettings(integrationName: string, settings: IntegrationSettings): Promise<void> {
    if (!this.settings.integrations) {
      this.settings.integrations = {};
    }
    
    this.settings.integrations[integrationName] = {
      ...this.settings.integrations[integrationName] || {},
      ...settings
    };
    
    await this.saveJsonFile(
      path.join(this.settingsPath, 'integration-settings.json'),
      this.settings.integrations
    );
  }
  
  /**
   * Получает настройки приложения
   */
  public async getAppSettings(settingName: string): Promise<any | null> {
    if (!this.settings.appSettings) {
      await this.loadSettings();
    }
    
    return this.settings.appSettings?.[settingName] || null;
  }
  
  /**
   * Обновляет настройки приложения
   */
  public async updateAppSettings(settingName: string, value: any): Promise<void> {
    if (!this.settings.appSettings) {
      this.settings.appSettings = {};
    }
    
    this.settings.appSettings[settingName] = value;
    
    await this.saveJsonFile(
      path.join(this.settingsPath, 'app-settings.json'),
      this.settings.appSettings
    );
  }
  
  /**
   * Получает все системные настройки
   */
  public async getAllSettings(): Promise<SystemSettingsData> {
    return this.settings;
  }
  
  /**
   * Генерирует уникальный идентификатор
   */
  public generateId(): string {
    return uuidv4();
  }
}

// Синглтон для системных настроек
export const systemSettings = new SystemSettings();

// Инициализация при импорте
(async () => {
  try {
    await systemSettings.init();
  } catch (error) {
    console.error('Failed to initialize system settings:', error);
  }
})();