/**
 * Сервис для взаимодействия с языковыми моделями (LLM) от разных провайдеров
 * 
 * Поддерживает работу с OpenAI, Anthropic Claude и другими API, а также
 * может маршрутизировать запросы между различными моделями в зависимости
 * от требований задачи
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logActivity, ActivityType } from '../activity-logger';

// Инициализация клиентов для разных провайдеров
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Типы поддерживаемых провайдеров
export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  PERPLEXITY = 'perplexity',
  KAZLLM = 'kazllm', // Локальная модель Казахстана
  LLAMA = 'llama',   // Локальные open-source модели
  GROQ = 'groq'      // API провайдер Groq
}

// Параметры для запроса к модели
export interface ModelRequestParams {
  model: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: string };
  stopWords?: string[];
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * Отправляет запрос к языковой модели и получает ответ
 * 
 * @param prompt Текст запроса к модели
 * @param params Параметры запроса
 * @returns Ответ модели в виде текста
 */
export async function fetchModelResponse(prompt: string, params: ModelRequestParams): Promise<string> {
  // Определяем провайдера на основе названия модели
  const provider = determineProvider(params.model);
  
  try {
    let response: string;
    
    switch (provider) {
      case LLMProvider.OPENAI:
        response = await fetchFromOpenAI(prompt, params);
        break;
        
      case LLMProvider.ANTHROPIC:
        response = await fetchFromAnthropic(prompt, params);
        break;
        
      // Добавьте другие провайдеры при необходимости
      
      default:
        // По умолчанию используем OpenAI
        response = await fetchFromOpenAI(prompt, params);
    }
    
    // Логируем успешный запрос к LLM
    await logActivity({
      action: ActivityType.AI_PROCESSING,
      details: `Успешный запрос к модели ${params.model}. Размер ответа: ${response.length} символов.`
    });
    
    return response;
  } catch (error) {
    console.error(`Ошибка при запросе к модели ${params.model}:`, error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.AI_PROCESSING,
      details: `Ошибка при запросе к модели ${params.model}: ${error.message}`
    });
    
    throw error;
  }
}

/**
 * Определяет провайдера LLM на основе названия модели
 * 
 * @param modelName Название модели
 * @returns Тип провайдера
 */
function determineProvider(modelName: string): LLMProvider {
  const model = modelName.toLowerCase();
  
  if (model.includes('gpt') || model.includes('text-davinci') || model.includes('dall-e')) {
    return LLMProvider.OPENAI;
  }
  
  if (model.includes('claude')) {
    return LLMProvider.ANTHROPIC;
  }
  
  if (model.includes('kazllm')) {
    return LLMProvider.KAZLLM;
  }
  
  if (model.includes('llama') || model.includes('mistral') || model.includes('gemma')) {
    return LLMProvider.LLAMA;
  }
  
  if (model.includes('perplexity') || model.includes('sonar')) {
    return LLMProvider.PERPLEXITY;
  }
  
  if (model.includes('groq')) {
    return LLMProvider.GROQ;
  }
  
  // По умолчанию используем OpenAI
  return LLMProvider.OPENAI;
}

/**
 * Отправляет запрос к API OpenAI
 * 
 * @param prompt Текст запроса
 * @param params Параметры запроса
 * @returns Ответ от модели
 */
async function fetchFromOpenAI(prompt: string, params: ModelRequestParams): Promise<string> {
  // Формируем параметры запроса для OpenAI
  const requestParams: any = {
    model: params.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: params.temperature || 0.7,
    max_tokens: params.maxTokens || 1000,
  };
  
  // Добавляем дополнительные параметры, если они указаны
  if (params.responseFormat) {
    requestParams.response_format = params.responseFormat;
  }
  
  if (params.topP) {
    requestParams.top_p = params.topP;
  }
  
  if (params.frequencyPenalty) {
    requestParams.frequency_penalty = params.frequencyPenalty;
  }
  
  if (params.presencePenalty) {
    requestParams.presence_penalty = params.presencePenalty;
  }
  
  if (params.stopWords && params.stopWords.length > 0) {
    requestParams.stop = params.stopWords;
  }
  
  try {
    // Отправляем запрос к API OpenAI
    const response = await openai.chat.completions.create(requestParams);
    
    // Извлекаем текст из ответа
    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Ошибка при запросе к OpenAI:', error);
    
    // Если ключ API недействителен или истек, возвращаем специальную ошибку
    if (error.status === 401) {
      throw new Error('Недействительный ключ API OpenAI. Пожалуйста, проверьте настройки API ключа.');
    }
    
    // Если превышен лимит запросов, возвращаем специальную ошибку
    if (error.status === 429) {
      throw new Error('Превышен лимит запросов к API OpenAI. Пожалуйста, повторите запрос позже.');
    }
    
    throw error;
  }
}

/**
 * Отправляет запрос к API Anthropic Claude
 * 
 * @param prompt Текст запроса
 * @param params Параметры запроса
 * @returns Ответ от модели
 */
async function fetchFromAnthropic(prompt: string, params: ModelRequestParams): Promise<string> {
  try {
    // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
    // Используем значение из параметров или claude-3.7 по умолчанию
    const model = params.model || 'claude-3-7-sonnet-20250219';
    
    // Отправляем запрос к API Anthropic
    const response = await anthropic.messages.create({
      model: model,
      max_tokens: params.maxTokens || 1000,
      temperature: params.temperature || 0.7,
      system: "Ты помощник государственной системы в Казахстане. Твои ответы должны быть точными, информативными и полезными.",
      messages: [
        { role: 'user', content: prompt }
      ]
    });
    
    // Возвращаем текст ответа
    return response.content[0]?.text || '';
  } catch (error) {
    console.error('Ошибка при запросе к Anthropic:', error);
    
    // Если ключ API недействителен или истек, возвращаем специальную ошибку
    if (error.status === 401) {
      throw new Error('Недействительный ключ API Anthropic. Пожалуйста, проверьте настройки API ключа.');
    }
    
    throw error;
  }
}

/**
 * Выбирает оптимальную модель для задачи на основе её типа, приоритета,
 * размера входных данных и других параметров
 * 
 * @param taskType Тип задачи
 * @param content Текст для обработки
 * @param priority Приоритет задачи
 * @returns Информация о выбранной модели
 */
export function selectOptimalModel(taskType: string, content: string, priority: string = 'medium'): {
  model: string;
  provider: LLMProvider;
  maxTokens: number;
  temperature: number;
} {
  // Размер входного текста примерно в токенах (примерно 4 символа на токен)
  const inputTokens = Math.ceil(content.length / 4);
  
  // Высокий приоритет - используем более мощные модели
  if (priority === 'high' || priority === 'urgent') {
    // Определяем модель в зависимости от типа задачи
    switch (taskType) {
      case 'classification':
      case 'summarization':
        return {
          model: 'gpt-4o',
          provider: LLMProvider.OPENAI,
          maxTokens: 1000,
          temperature: 0.2
        };
      
      case 'response':
      case 'protocol':
        return {
          model: 'claude-3-7-sonnet-20250219',
          provider: LLMProvider.ANTHROPIC,
          maxTokens: 2000,
          temperature: 0.7
        };
      
      default:
        return {
          model: 'gpt-4o',
          provider: LLMProvider.OPENAI,
          maxTokens: 1500,
          temperature: 0.5
        };
    }
  }
  
  // Для объемных текстов используем модели с большим контекстным окном
  if (inputTokens > 64000) {
    return {
      model: 'claude-3-7-opus-20250219',
      provider: LLMProvider.ANTHROPIC,
      maxTokens: 4000,
      temperature: 0.3
    };
  }
  
  // Для обычных задач используем более экономичные модели
  switch (taskType) {
    case 'classification':
      return {
        model: 'gpt-3.5-turbo',
        provider: LLMProvider.OPENAI,
        maxTokens: 800,
        temperature: 0.2
      };
    
    case 'summarization':
      return {
        model: 'gpt-4o-mini',
        provider: LLMProvider.OPENAI,
        maxTokens: 1500,
        temperature: 0.3
      };
    
    case 'response':
      return {
        model: 'claude-3-5-sonnet-20240620',
        provider: LLMProvider.ANTHROPIC,
        maxTokens: 2000,
        temperature: 0.7
      };
    
    default:
      return {
        model: 'gpt-4o-mini',
        provider: LLMProvider.OPENAI,
        maxTokens: 1000,
        temperature: 0.5
      };
  }
}