/**
 * Agent Smith Platform - Сервис для работы с различными провайдерами LLM
 * 
 * Обеспечивает единый интерфейс для работы с различными API языковых моделей:
 * - OpenAI
 * - Anthropic
 * - OpenRouter
 * - vLLM
 * - Perplexity
 * - Любые провайдеры с совместимым REST API
 * 
 * @version 1.0.0
 * @since 14.05.2025
 */

import axios from 'axios';
import { storage } from '../../storage';
import { logActivity, ActivityType } from '../../activity-logger';

// Типы провайдеров LLM
export enum LLMProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  OPENROUTER = 'openrouter',
  VLLM = 'vllm',
  PERPLEXITY = 'perplexity',
  CUSTOM = 'custom' // Для произвольных REST API с совместимым форматом
}

// Интерфейс конфигурации провайдера
export interface LLMProviderConfig {
  type: LLMProviderType;
  name: string;
  apiKey?: string;
  apiUrl: string;
  defaultModel: string;
  availableModels: string[];
  enabled: boolean;
  isDefault?: boolean;
  requestTimeout?: number; // в миллисекундах
  contextWindow?: number; // максимальный размер контекста
  temperature?: number; // значение по умолчанию
  maxTokens?: number; // максимальное кол-во токенов по умолчанию
  customHeaders?: Record<string, string>; // Дополнительные заголовки
}

// Формат сообщения для API LLM
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string | null;
  name?: string;
  function_call?: any;
}

// Параметры запроса к LLM
export interface LLMRequestParams {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  functions?: any[];
  function_call?: string | { name: string };
  stream?: boolean;
  response_format?: { type: string };
  seed?: number;
  tools?: any[];
  tool_choice?: string | { name: string };
}

// Формат ответа от LLM
export interface LLMResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  choices: {
    index: number;
    message: LLMMessage;
    finish_reason: string;
    logprobs?: any;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Класс для работы с различными LLM API
export class LLMProviderService {
  private providers: Map<string, LLMProviderConfig> = new Map();
  private defaultProvider: string | null = null;

  constructor() {
    this.loadProviders();
  }

  // Загрузка конфигураций провайдеров из хранилища
  private async loadProviders(): Promise<void> {
    try {
      const providersValue = await storage.getSystemSetting('llm_providers');
      
      if (providersValue) {
        // Напрямую используем значение, так как storage.getSystemSetting возвращает само значение
        const providers = JSON.parse(providersValue) as LLMProviderConfig[];
        
        // Очищаем текущие конфигурации
        this.providers.clear();
        
        // Загружаем конфигурации
        for (const provider of providers) {
          this.providers.set(provider.name, provider);
          if (provider.isDefault) {
            this.defaultProvider = provider.name;
          }
        }
        
        if (!this.defaultProvider && providers.length > 0) {
          this.defaultProvider = providers[0].name;
        }
      } else {
        // Если настройки не найдены, устанавливаем базовые
        await this.setupDefaultProviders();
      }
    } catch (error: any) {
      console.error('Ошибка при загрузке провайдеров LLM:', error);
      
      // Логируем ошибку
      await logActivity({
        action: ActivityType.SYSTEM_ERROR,
        details: `Ошибка при загрузке провайдеров LLM: ${error.message}`
      });
      
      // Устанавливаем базовые настройки
      await this.setupDefaultProviders();
    }
  }

  // Настройка провайдеров по умолчанию
  private async setupDefaultProviders(): Promise<void> {
    // Добавляем настройки для OpenAI
    const openaiConfig: LLMProviderConfig = {
      type: LLMProviderType.OPENAI,
      name: 'OpenAI',
      apiKey: process.env.OPENAI_API_KEY,
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      defaultModel: 'gpt-4o',
      availableModels: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      enabled: true,
      isDefault: true,
      requestTimeout: 60000,
      contextWindow: 128000,
      temperature: 0.7,
      maxTokens: 2048
    };
    
    // Добавляем настройки для Anthropic
    const anthropicConfig: LLMProviderConfig = {
      type: LLMProviderType.ANTHROPIC,
      name: 'Anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      apiUrl: 'https://api.anthropic.com/v1/messages',
      defaultModel: 'claude-3-7-sonnet-20250219',
      availableModels: ['claude-3-7-sonnet-20250219', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
      enabled: false,
      requestTimeout: 60000,
      contextWindow: 200000,
      temperature: 0.7,
      maxTokens: 2048
    };
    
    // Добавляем настройки для OpenRouter
    const openRouterConfig: LLMProviderConfig = {
      type: LLMProviderType.OPENROUTER,
      name: 'OpenRouter',
      apiKey: process.env.OPENROUTER_API_KEY,
      apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
      defaultModel: 'openai/gpt-4o',
      availableModels: [
        'openai/gpt-4o',
        'anthropic/claude-3-7-sonnet-20250219',
        'anthropic/claude-3-opus-20240229',
        'meta-llama/llama-3-70b-instruct',
        'mistralai/mistral-7b-instruct'
      ],
      enabled: false,
      requestTimeout: 60000,
      contextWindow: 128000,
      temperature: 0.7,
      maxTokens: 2048,
      customHeaders: {
        'HTTP-Referer': 'https://agent-smith.kz',
        'X-Title': 'Agent Smith Platform'
      }
    };
    
    // Добавляем настройки для vLLM
    const vllmConfig: LLMProviderConfig = {
      type: LLMProviderType.VLLM,
      name: 'vLLM',
      apiUrl: process.env.VLLM_API_URL || 'http://localhost:8000/v1/chat/completions',
      defaultModel: 'meta-llama/Llama-3-70b-chat-hf',
      availableModels: ['meta-llama/Llama-3-70b-chat-hf', 'mistralai/Mistral-7B-Instruct-v0.2'],
      enabled: false,
      requestTimeout: 60000,
      contextWindow: 8192,
      temperature: 0.7,
      maxTokens: 2048
    };
    
    // Добавляем настройки для Perplexity
    const perplexityConfig: LLMProviderConfig = {
      type: LLMProviderType.PERPLEXITY,
      name: 'Perplexity',
      apiKey: process.env.PERPLEXITY_API_KEY,
      apiUrl: 'https://api.perplexity.ai/chat/completions',
      defaultModel: 'llama-3.1-sonar-small-128k-online',
      availableModels: [
        'llama-3.1-sonar-small-128k-online',
        'llama-3.1-sonar-large-128k-online',
        'llama-3.1-sonar-huge-128k-online'
      ],
      enabled: false,
      requestTimeout: 60000,
      contextWindow: 128000,
      temperature: 0.7,
      maxTokens: 2048
    };
    
    // Сохраняем в Map
    this.providers.set(openaiConfig.name, openaiConfig);
    this.providers.set(anthropicConfig.name, anthropicConfig);
    this.providers.set(openRouterConfig.name, openRouterConfig);
    this.providers.set(vllmConfig.name, vllmConfig);
    this.providers.set(perplexityConfig.name, perplexityConfig);
    
    // Устанавливаем OpenAI как провайдер по умолчанию
    this.defaultProvider = openaiConfig.name;
    
    // Сохраняем в хранилище
    await this.saveProviders();
  }

  // Сохранение конфигураций провайдеров в хранилище
  private async saveProviders(): Promise<void> {
    try {
      const providers = Array.from(this.providers.values());
      await storage.updateSystemSetting('llm_providers', JSON.stringify(providers));
    } catch (error: any) {
      console.error('Ошибка при сохранении провайдеров LLM:', error);
      
      // Логируем ошибку
      await logActivity({
        action: ActivityType.SYSTEM_ERROR,
        details: `Ошибка при сохранении провайдеров LLM: ${error.message}`
      });
    }
  }

  // Получение всех провайдеров
  async getProviders(): Promise<LLMProviderConfig[]> {
    if (this.providers.size === 0) {
      await this.loadProviders();
    }
    return Array.from(this.providers.values());
  }

  // Получение провайдера по имени
  async getProvider(name: string): Promise<LLMProviderConfig | null> {
    if (this.providers.size === 0) {
      await this.loadProviders();
    }
    return this.providers.get(name) || null;
  }

  // Получение провайдера по умолчанию
  async getDefaultProvider(): Promise<LLMProviderConfig | null> {
    if (this.providers.size === 0) {
      await this.loadProviders();
    }
    return this.defaultProvider ? this.providers.get(this.defaultProvider) || null : null;
  }

  // Добавление нового провайдера
  async addProvider(config: LLMProviderConfig): Promise<boolean> {
    try {
      // Валидация конфигурации
      if (!config.name || !config.apiUrl || !config.type) {
        throw new Error('Неверная конфигурация провайдера LLM');
      }
      
      // Если провайдер устанавливается как дефолтный, сбрасываем флаг у других
      if (config.isDefault) {
        for (const [name, provider] of this.providers.entries()) {
          if (name !== config.name) {
            provider.isDefault = false;
          }
        }
        this.defaultProvider = config.name;
      }
      
      // Если это первый провайдер, устанавливаем его по умолчанию
      if (this.providers.size === 0) {
        config.isDefault = true;
        this.defaultProvider = config.name;
      }
      
      // Сохраняем провайдер
      this.providers.set(config.name, config);
      
      // Обновляем хранилище
      await this.saveProviders();
      
      // Логируем добавление провайдера
      await logActivity({
        action: ActivityType.SYSTEM_CONFIG,
        details: `Добавлен новый провайдер LLM: ${config.name}`
      });
      
      return true;
    } catch (error: any) {
      console.error('Ошибка при добавлении провайдера LLM:', error);
      
      // Логируем ошибку
      await logActivity({
        action: ActivityType.SYSTEM_ERROR,
        details: `Ошибка при добавлении провайдера LLM: ${error.message}`
      });
      
      return false;
    }
  }

  // Обновление настроек провайдера
  async updateProvider(config: LLMProviderConfig): Promise<boolean> {
    try {
      // Проверяем, существует ли провайдер
      if (!this.providers.has(config.name)) {
        throw new Error(`Провайдер LLM ${config.name} не найден`);
      }
      
      // Если провайдер устанавливается как дефолтный, сбрасываем флаг у других
      if (config.isDefault) {
        for (const [name, provider] of this.providers.entries()) {
          if (name !== config.name) {
            provider.isDefault = false;
          }
        }
        this.defaultProvider = config.name;
      }
      
      // Сохраняем провайдер
      this.providers.set(config.name, config);
      
      // Обновляем хранилище
      await this.saveProviders();
      
      // Логируем обновление провайдера
      await logActivity({
        action: ActivityType.SYSTEM_CONFIG,
        details: `Обновлен провайдер LLM: ${config.name}`
      });
      
      return true;
    } catch (error: any) {
      console.error('Ошибка при обновлении провайдера LLM:', error);
      
      // Логируем ошибку
      await logActivity({
        action: ActivityType.SYSTEM_ERROR,
        details: `Ошибка при обновлении провайдера LLM: ${error.message}`
      });
      
      return false;
    }
  }

  // Удаление провайдера
  async deleteProvider(name: string): Promise<boolean> {
    try {
      // Проверяем, существует ли провайдер
      if (!this.providers.has(name)) {
        throw new Error(`Провайдер LLM ${name} не найден`);
      }
      
      // Если удаляемый провайдер был по умолчанию, выбираем другой
      if (this.defaultProvider === name) {
        const providers = Array.from(this.providers.values());
        for (const provider of providers) {
          if (provider.name !== name && provider.enabled) {
            provider.isDefault = true;
            this.defaultProvider = provider.name;
            break;
          }
        }
      }
      
      // Удаляем провайдер
      this.providers.delete(name);
      
      // Если провайдеров больше нет, сбрасываем дефолтный
      if (this.providers.size === 0) {
        this.defaultProvider = null;
      }
      
      // Обновляем хранилище
      await this.saveProviders();
      
      // Логируем удаление провайдера
      await logActivity({
        action: ActivityType.SYSTEM_CONFIG,
        details: `Удален провайдер LLM: ${name}`
      });
      
      return true;
    } catch (error: any) {
      console.error('Ошибка при удалении провайдера LLM:', error);
      
      // Логируем ошибку
      await logActivity({
        action: ActivityType.SYSTEM_ERROR,
        details: `Ошибка при удалении провайдера LLM: ${error.message}`
      });
      
      return false;
    }
  }

  // Установка провайдера по умолчанию
  async setDefaultProvider(name: string): Promise<boolean> {
    try {
      // Проверяем, существует ли провайдер
      if (!this.providers.has(name)) {
        throw new Error(`Провайдер LLM ${name} не найден`);
      }
      
      // Получаем провайдер
      const provider = this.providers.get(name);
      
      // Проверяем, включен ли провайдер
      if (!provider?.enabled) {
        throw new Error(`Провайдер LLM ${name} отключен`);
      }
      
      // Сбрасываем флаг у всех провайдеров
      for (const [providerName, providerConfig] of this.providers.entries()) {
        providerConfig.isDefault = providerName === name;
      }
      
      // Устанавливаем новый провайдер по умолчанию
      this.defaultProvider = name;
      
      // Обновляем хранилище
      await this.saveProviders();
      
      // Логируем изменение провайдера по умолчанию
      await logActivity({
        action: ActivityType.SYSTEM_CONFIG,
        details: `Установлен провайдер LLM по умолчанию: ${name}`
      });
      
      return true;
    } catch (error: any) {
      console.error('Ошибка при установке провайдера LLM по умолчанию:', error);
      
      // Логируем ошибку
      await logActivity({
        action: ActivityType.SYSTEM_ERROR,
        details: `Ошибка при установке провайдера LLM по умолчанию: ${error.message}`
      });
      
      return false;
    }
  }

  // Проверка настроек провайдера
  async checkProviderSettings(config: LLMProviderConfig): Promise<{
    success: boolean;
    message: string;
    model?: string;
  }> {
    try {
      // Проверяем URL
      if (!config.apiUrl) {
        return {
          success: false,
          message: 'URL API не указан'
        };
      }
      
      // Проверяем API ключ для провайдеров, требующих его
      if (
        (config.type !== LLMProviderType.VLLM && !config.apiKey) || 
        (config.type === LLMProviderType.CUSTOM && !config.apiKey)
      ) {
        return {
          success: false,
          message: 'API ключ не указан'
        };
      }
      
      // Проверяем доступность API с простым запросом
      const messages: LLMMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, this is a test message. Please respond with "Test successful".' }
      ];
      
      // Выполняем тестовый запрос
      const result = await this.sendRequest(config, {
        model: config.defaultModel,
        messages,
        max_tokens: 20,
        temperature: 0.1
      });
      
      return {
        success: true,
        message: 'Настройки провайдера проверены успешно',
        model: result.model
      };
    } catch (error: any) {
      console.error('Ошибка при проверке настроек провайдера LLM:', error);
      
      return {
        success: false,
        message: `Ошибка при проверке настроек: ${error.message}`
      };
    }
  }

  // Отправка запроса к API LLM
  async sendRequest(
    providerConfig: LLMProviderConfig | string,
    params: LLMRequestParams
  ): Promise<LLMResponse> {
    try {
      // Если передано имя провайдера, получаем его конфигурацию
      let config: LLMProviderConfig;
      if (typeof providerConfig === 'string') {
        const provider = await this.getProvider(providerConfig);
        if (!provider) {
          throw new Error(`Провайдер LLM ${providerConfig} не найден`);
        }
        config = provider;
      } else {
        config = providerConfig;
      }
      
      // Проверяем, включен ли провайдер
      if (!config.enabled) {
        throw new Error(`Провайдер LLM ${config.name} отключен`);
      }
      
      // Формируем заголовки запроса
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Добавляем заголовок с API ключом в зависимости от типа провайдера
      if (config.apiKey) {
        switch (config.type) {
          case LLMProviderType.OPENAI:
            headers['Authorization'] = `Bearer ${config.apiKey}`;
            break;
          case LLMProviderType.ANTHROPIC:
            headers['x-api-key'] = config.apiKey;
            headers['anthropic-version'] = '2023-06-01';
            break;
          case LLMProviderType.OPENROUTER:
            headers['Authorization'] = `Bearer ${config.apiKey}`;
            // Добавляем заголовки для OpenRouter
            if (config.customHeaders) {
              Object.assign(headers, config.customHeaders);
            }
            break;
          case LLMProviderType.PERPLEXITY:
            headers['Authorization'] = `Bearer ${config.apiKey}`;
            break;
          case LLMProviderType.CUSTOM:
            // Для пользовательского API используем заголовки из конфигурации
            headers['Authorization'] = `Bearer ${config.apiKey}`;
            if (config.customHeaders) {
              Object.assign(headers, config.customHeaders);
            }
            break;
        }
      }
      
      // Адаптируем параметры для разных провайдеров
      let requestData: any;
      let apiUrl = config.apiUrl;
      
      switch (config.type) {
        case LLMProviderType.OPENAI:
        case LLMProviderType.OPENROUTER:
        case LLMProviderType.VLLM:
        case LLMProviderType.PERPLEXITY:
        case LLMProviderType.CUSTOM:
          // Формат OpenAI-совместимого API
          requestData = {
            model: params.model,
            messages: params.messages,
            temperature: params.temperature ?? config.temperature ?? 0.7,
            max_tokens: params.max_tokens ?? config.maxTokens ?? 1024,
            top_p: params.top_p ?? 1,
            frequency_penalty: params.frequency_penalty ?? 0,
            presence_penalty: params.presence_penalty ?? 0
          };
          
          // Добавляем дополнительные параметры, если они указаны
          if (params.stop) requestData.stop = params.stop;
          if (params.functions) requestData.functions = params.functions;
          if (params.function_call) requestData.function_call = params.function_call;
          if (params.response_format) requestData.response_format = params.response_format;
          if (params.seed !== undefined) requestData.seed = params.seed;
          if (params.tools) requestData.tools = params.tools;
          if (params.tool_choice) requestData.tool_choice = params.tool_choice;
          
          break;
          
        case LLMProviderType.ANTHROPIC:
          // Формат Anthropic API
          requestData = {
            model: params.model,
            messages: params.messages,
            temperature: params.temperature ?? config.temperature ?? 0.7,
            max_tokens: params.max_tokens ?? config.maxTokens ?? 1024,
            top_p: params.top_p ?? 1
          };
          
          // Добавляем дополнительные параметры для Anthropic
          if (params.stop) requestData.stop_sequences = params.stop;
          
          break;
      }
      
      // Отправляем запрос
      const response = await axios.post(apiUrl, requestData, {
        headers,
        timeout: config.requestTimeout || 60000
      });
      
      // Адаптируем ответ к общему формату
      let result: LLMResponse;
      
      switch (config.type) {
        case LLMProviderType.ANTHROPIC:
          // Преобразуем ответ Anthropic в формат OpenAI
          result = {
            id: response.data.id,
            model: response.data.model,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: response.data.content.map((part: any) => part.text).join('')
                },
                finish_reason: response.data.stop_reason
              }
            ],
            usage: {
              prompt_tokens: response.data.usage?.input_tokens || 0,
              completion_tokens: response.data.usage?.output_tokens || 0,
              total_tokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0)
            }
          };
          break;
          
        default:
          // Формат OpenAI и совместимых API
          result = response.data;
      }
      
      // Логируем использование LLM
      await logActivity({
        action: ActivityType.EXTERNAL_API,
        details: `Использован LLM провайдер: ${config.name}, модель: ${params.model}`,
        metadata: {
          provider: config.name,
          model: params.model,
          tokens: result.usage?.total_tokens || 0
        }
      });
      
      return result;
    } catch (error: any) {
      console.error('Ошибка при отправке запроса к LLM API:', error);
      
      // Логируем ошибку
      await logActivity({
        action: ActivityType.SYSTEM_ERROR,
        details: `Ошибка при отправке запроса к LLM API: ${error.message}`,
        metadata: {
          provider: typeof providerConfig === 'string' ? providerConfig : providerConfig.name,
          model: params.model,
          error: error.message
        }
      });
      
      throw new Error(`Ошибка при отправке запроса к LLM API: ${error.message}`);
    }
  }

  // Отправка запроса с использованием провайдера по умолчанию
  async sendRequestWithDefaultProvider(params: LLMRequestParams): Promise<LLMResponse> {
    const defaultProvider = await this.getDefaultProvider();
    if (!defaultProvider) {
      throw new Error('Провайдер LLM по умолчанию не настроен');
    }
    
    // Если модель не указана, используем модель по умолчанию
    if (!params.model) {
      params.model = defaultProvider.defaultModel;
    }
    
    return this.sendRequest(defaultProvider, params);
  }
}

// Экспортируем экземпляр сервиса
export const llmProviderService = new LLMProviderService();