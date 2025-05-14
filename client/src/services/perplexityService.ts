/**
 * Сервис для работы с Perplexity API на стороне клиента
 */
import { apiRequest } from '../lib/api';

/**
 * Интерфейс для ответа от API статуса
 */
interface ApiStatusResponse {
  available: boolean;
  message: string;
}

/**
 * Интерфейс для настроек API
 */
interface ApiSettings {
  apiKeyConfigured: boolean;
  defaultModel: string;
}

/**
 * Интерфейс для результата генерации текста
 */
interface GenerateTextResponse {
  text: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  citations: Array<{ url: string }>;
}

/**
 * Интерфейс для результата анализа текста
 */
interface AnalyzeTextResponse {
  analysis: string;
}

/**
 * Интерфейс для результата саммаризации документа
 */
interface SummarizeDocumentResponse {
  summary: string;
}

/**
 * Интерфейс для результата ответа на вопрос по данным
 */
interface AnswerDataQuestionResponse {
  answer: string;
}

/**
 * Класс для работы с Perplexity API
 */
export class PerplexityService {
  /**
   * Проверяет статус API ключа
   */
  public async checkApiStatus(): Promise<ApiStatusResponse> {
    return apiRequest('/api/perplexity/status');
  }
  
  /**
   * Получает настройки API
   */
  public async getApiSettings(): Promise<ApiSettings> {
    return apiRequest('/api/perplexity/settings');
  }
  
  /**
   * Сохраняет API ключ
   */
  public async saveApiKey(apiKey: string, defaultModel: string = 'llama-3.1-sonar-small-128k-online'): Promise<{success: boolean}> {
    return apiRequest('/api/perplexity/settings', {
      method: 'POST',
      data: { apiKey, defaultModel }
    });
  }
  
  /**
   * Генерирует текст с использованием Perplexity API
   */
  public async generateText(
    prompt: string, 
    systemPrompt?: string, 
    model?: string, 
    temperature?: number
  ): Promise<GenerateTextResponse> {
    return apiRequest('/api/perplexity/generate', {
      method: 'POST',
      data: {
        prompt,
        systemPrompt,
        model,
        temperature
      }
    });
  }
  
  /**
   * Анализирует текст с помощью Perplexity API
   */
  public async analyzeText(
    text: string, 
    task: string, 
    model?: string
  ): Promise<AnalyzeTextResponse> {
    return apiRequest('/api/perplexity/analyze', {
      method: 'POST',
      data: {
        text,
        task,
        model
      }
    });
  }
  
  /**
   * Создает саммари для документа с помощью Perplexity API
   */
  public async summarizeDocument(
    document: string, 
    model?: string
  ): Promise<SummarizeDocumentResponse> {
    return apiRequest('/api/perplexity/summarize', {
      method: 'POST',
      data: {
        document,
        model
      }
    });
  }
  
  /**
   * Отвечает на вопрос по данным с помощью Perplexity API
   */
  public async answerDataQuestion(
    question: string, 
    contextData: any, 
    model?: string
  ): Promise<AnswerDataQuestionResponse> {
    return apiRequest('/api/perplexity/answer', {
      method: 'POST',
      data: {
        question,
        contextData,
        model
      }
    });
  }
}

// Создаем и экспортируем экземпляр сервиса для использования в приложении
export const perplexityService = new PerplexityService();