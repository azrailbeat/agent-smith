/**
 * Сервис для работы с Perplexity AI API
 */
import fetch from 'node-fetch';
import { systemSettings } from '../system-settings';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityCompletionOptions {
  model: string;
  messages: PerplexityMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  search_domain_filter?: string[];
  return_images?: boolean;
  return_related_questions?: boolean;
  search_recency_filter?: string;
  top_k?: number;
  stream?: boolean;
  presence_penalty?: number;
  frequency_penalty?: number;
}

interface PerplexityCitation {
  url: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations: PerplexityCitation[];
  choices: {
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta?: {
      role: string;
      content: string;
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Класс для работы с Perplexity API
 */
export class PerplexityService {
  private apiKey: string;
  private baseUrl: string = 'https://api.perplexity.ai';
  private defaultModel: string = 'llama-3.1-sonar-small-128k-online';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || '';
    this.loadSettings();
  }

  /**
   * Загружает настройки из системных настроек
   */
  private async loadSettings() {
    try {
      const settings = await systemSettings.getLlmSettings('perplexity');
      if (settings && settings.apiKey) {
        this.apiKey = settings.apiKey;
      }
      if (settings && settings.defaultModel) {
        this.defaultModel = settings.defaultModel;
      }
    } catch (error) {
      console.error('Error loading Perplexity settings:', error);
    }
  }

  /**
   * Проверяет, доступен ли API ключ
   */
  public isApiKeyAvailable(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * Выполняет запрос к Perplexity API для генерации ответа
   */
  public async createCompletion(options: PerplexityCompletionOptions): Promise<PerplexityResponse> {
    if (!this.isApiKeyAvailable()) {
      throw new Error('Perplexity API key is not configured');
    }

    // Устанавливаем модель по умолчанию, если она не указана
    if (!options.model) {
      options.model = this.defaultModel;
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }

      return await response.json() as PerplexityResponse;
    } catch (error: any) {
      console.error('Perplexity API request failed:', error);
      throw new Error(`Perplexity API request failed: ${error.message}`);
    }
  }

  /**
   * Генерирует ответ на основе промпта
   */
  public async generateResponse(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: PerplexityMessage[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });
    
    const response = await this.createCompletion({
      model: this.defaultModel,
      messages,
      temperature: 0.2
    });
    
    return response.choices[0].message.content;
  }

  /**
   * Анализирует текст с помощью Perplexity API
   */
  public async analyzeText(text: string, task: string): Promise<string> {
    const prompt = `Analyze the following text for ${task}:\n\n${text}`;
    
    return this.generateResponse(prompt, 'You are an expert analytical assistant specialized in text analysis.');
  }

  /**
   * Создает саммари для документа
   */
  public async summarizeDocument(document: string): Promise<string> {
    const prompt = `Please summarize the following document concisely while preserving all key information and main points:\n\n${document}`;
    
    return this.generateResponse(prompt, 'You are an expert summarization assistant. Create clear, concise summaries that capture the most important information.');
  }

  /**
   * Генерирует ответ на вопрос о данных в системе
   */
  public async answerDataQuestion(question: string, contextData: any): Promise<string> {
    let contextString = '';
    
    try {
      // Преобразуем контекстные данные в строку для вставки в промпт
      if (typeof contextData === 'object') {
        contextString = JSON.stringify(contextData, null, 2);
      } else if (Array.isArray(contextData)) {
        contextString = contextData.map(item => 
          typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)
        ).join('\n');
      } else {
        contextString = String(contextData);
      }
    } catch (err) {
      contextString = 'Error parsing context data';
    }
    
    const prompt = `I need you to analyze this data and answer a question about it.

Data:
${contextString}

Question: ${question}

Please provide a clear, detailed answer based only on the data provided.`;
    
    return this.generateResponse(prompt, 'You are a data analysis expert. Analyze data and provide accurate, insightful answers to questions.');
  }
}

export const perplexityService = new PerplexityService();