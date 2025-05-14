/**
 * Сервис для работы с ИИ-агентами и управления задачами
 * 
 * Обеспечивает координацию между различными моделями ИИ и взаимодействие
 * с системами обработки естественного языка, блокчейном и базой знаний (RAG)
 */

import { storage } from '../storage';
import { logActivity, ActivityType } from '../activity-logger';
import { recordToBlockchain, BlockchainRecordType } from '../blockchain';
import { Agent, TaskResult } from '@shared/types';
import { fetchModelResponse } from './llm-service';
import { searchVectorStore } from './vector-store';

// Типы задач для агентов
export enum TaskType {
  CLASSIFICATION = 'classification',   // Классификация текста
  SUMMARIZATION = 'summarization',     // Суммаризация текста
  RESPONSE = 'response',               // Генерация ответа
  ANALYTICS = 'analytics',             // Аналитика данных
  TRANSLATION = 'translation',         // Перевод
  VALIDATION = 'validation',           // Валидация данных
  CITIZEN_REQUEST = 'citizen_request', // Обработка обращений граждан
  DOCUMENT = 'document',               // Обработка документов
  PROTOCOL = 'protocol',               // Обработка протоколов
  RAG = 'rag'                          // Поиск в базе знаний
}

// Типы сущностей системы
export enum EntityType {
  CITIZEN_REQUEST = 'citizen_request',
  DOCUMENT = 'document',
  PROTOCOL = 'protocol',
  TASK = 'task',
  MEETING = 'meeting'
}

// Интерфейс для задачи агенту
export interface AgentTask {
  taskType: string;
  entityType: string;
  entityId: number;
  agentId: number;
  content: string;
  metadata?: Record<string, any>;
  priority?: string;
}

// Интерфейс для результата выполнения задачи
export interface AgentTaskResult {
  success: boolean;
  taskId: number;
  agentId: number;
  result?: any;
  error?: string;
  blockchainHash?: string;
}

/**
 * Класс для работы с агентами
 */
class AgentService {
  /**
   * Получает доступные агенты системы
   * @returns Список агентов
   */
  async getAgents(): Promise<Agent[]> {
    return await storage.getAgents();
  }

  /**
   * Получает активные агенты заданного типа
   * @param type Тип агента
   * @returns Список активных агентов заданного типа
   */
  async getAgentsByType(type: string): Promise<Agent[]> {
    const agents = await storage.getAgents();
    return agents.filter(agent => agent.type === type && agent.isActive);
  }

  /**
   * Обрабатывает задачу с использованием подходящего агента
   * @param task Задача для обработки
   * @returns Результат выполнения задачи
   */
  async processTask(task: AgentTask): Promise<AgentTaskResult> {
    try {
      // Получаем агент из хранилища
      const agent = await storage.getAgent(task.agentId);
      
      if (!agent) {
        throw new Error(`Агент с ID ${task.agentId} не найден`);
      }
      
      if (!agent.isActive) {
        throw new Error(`Агент с ID ${task.agentId} неактивен`);
      }
      
      // Создаем задачу в хранилище
      const taskRecord = await storage.createAgentTask({
        agentId: task.agentId,
        type: task.taskType,
        entityType: task.entityType,
        entityId: task.entityId,
        status: 'processing',
        priority: task.priority || 'medium',
        metadata: task.metadata ? JSON.stringify(task.metadata) : null
      });
      
      // Логируем начало выполнения задачи
      await logActivity({
        action: ActivityType.AI_PROCESSING,
        entityType: task.entityType,
        entityId: task.entityId,
        details: `Началась обработка агентом "${agent.name}" (${agent.type})`
      });
      
      // Выполняем обработку задачи в зависимости от её типа
      let result: any;
      
      switch (task.taskType) {
        case TaskType.CLASSIFICATION:
          result = await this.classifyContent(agent, task.content, task.metadata);
          break;
        case TaskType.SUMMARIZATION:
          result = await this.summarizeContent(agent, task.content, task.metadata);
          break;
        case TaskType.RESPONSE:
          result = await this.generateResponse(agent, task.content, task.metadata);
          break;
        case TaskType.ANALYTICS:
          result = await this.analyzeData(agent, task.content, task.metadata);
          break;
        case TaskType.CITIZEN_REQUEST:
          result = await this.processCitizenRequest(agent, task.content, task.metadata);
          break;
        case TaskType.DOCUMENT:
          result = await this.processDocument(agent, task.content, task.metadata);
          break;
        case TaskType.PROTOCOL:
          result = await this.processProtocol(agent, task.content, task.metadata);
          break;
        case TaskType.TRANSLATION:
          result = await this.translateContent(agent, task.content, task.metadata);
          break;
        case TaskType.RAG:
          result = await this.searchKnowledgeBase(agent, task.content, task.metadata);
          break;
        default:
          throw new Error(`Неизвестный тип задачи: ${task.taskType}`);
      }
      
      // Сохраняем результат обработки
      const taskResult = await storage.updateAgentTask(taskRecord.id, {
        status: 'completed',
        result: JSON.stringify(result),
        completedAt: new Date()
      });
      
      // Записываем результат в блокчейн для обеспечения неизменности
      let blockchainHash: string | undefined;
      
      try {
        const blockchainRecord = await recordToBlockchain({
          entityId: task.entityId,
          entityType: BlockchainRecordType.AGENT_RESULT,
          action: `agent_${task.taskType.toLowerCase()}`,
          metadata: {
            agentId: agent.id,
            agentName: agent.name,
            taskType: task.taskType,
            taskId: taskRecord.id,
            result: this.getBlockchainSummary(result),
            timestamp: new Date().toISOString()
          }
        });
        
        blockchainHash = blockchainRecord.hash;
        
        // Обновляем хеш блокчейна в результате задачи
        await storage.updateAgentTask(taskRecord.id, { blockchainHash });
      } catch (blockchainError) {
        console.error('Ошибка при записи в блокчейн:', blockchainError);
      }
      
      // Логируем завершение задачи
      await logActivity({
        action: ActivityType.AI_PROCESSING,
        entityType: task.entityType,
        entityId: task.entityId,
        details: `Завершена обработка агентом "${agent.name}". Результат получен${blockchainHash ? ` и зафиксирован в блокчейне` : ''}`
      });
      
      return {
        success: true,
        taskId: taskRecord.id,
        agentId: agent.id,
        result,
        blockchainHash
      };
    } catch (error) {
      console.error('Ошибка при обработке задачи агентом:', error);
      
      // Логируем ошибку
      await logActivity({
        action: ActivityType.AI_PROCESSING,
        entityType: task.entityType,
        entityId: task.entityId,
        details: `Ошибка при обработке агентом: ${error.message}`
      });
      
      return {
        success: false,
        taskId: -1,
        agentId: task.agentId,
        error: error.message
      };
    }
  }
  
  /**
   * Классифицирует содержимое с помощью агента
   * @param agent Агент для классификации
   * @param content Текст для классификации
   * @param metadata Метаданные запроса
   * @returns Результат классификации
   */
  private async classifyContent(agent: Agent, content: string, metadata?: Record<string, any>): Promise<any> {
    const prompt = this.buildPrompt(agent, 'classification', content, metadata);
    const subject = metadata?.subject || '';
    
    // Включаем контекст из базы знаний, если это необходимо
    let contextFromRAG = '';
    if (agent.useRAG) {
      const ragResults = await searchVectorStore(content + ' ' + subject, 3);
      if (ragResults && ragResults.length > 0) {
        contextFromRAG = '\nКонтекст из базы знаний:\n' + ragResults.map(r => `${r.text} (Релевантность: ${r.score.toFixed(2)})`).join('\n\n');
      }
    }
    
    // Собираем полный запрос к модели
    const fullPrompt = prompt + (contextFromRAG ? contextFromRAG : '');
    
    // Получаем ответ от модели
    const modelResponse = await fetchModelResponse(fullPrompt, {
      model: agent.modelName,
      temperature: agent.temperature || 0.2,
      maxTokens: agent.maxTokens || 1000,
      responseFormat: { type: 'json_object' }
    });
    
    // Парсим JSON-ответ
    try {
      const result = JSON.parse(modelResponse);
      return {
        classification: result.category || 'other',
        confidence: result.confidence || 0.5,
        priority: result.priority || 'medium',
        summary: result.summary || '',
        keywords: result.keywords || [],
        needsHumanReview: result.needsHumanReview || false
      };
    } catch (error) {
      console.error('Ошибка при парсинге ответа модели:', error);
      // Возвращаем базовую классификацию при ошибке
      return {
        classification: 'other',
        confidence: 0.3,
        priority: 'medium',
        summary: 'Ошибка классификации',
        keywords: [],
        needsHumanReview: true
      };
    }
  }
  
  /**
   * Суммаризирует текст с помощью агента
   * @param agent Агент для суммаризации
   * @param content Текст для суммаризации
   * @param metadata Метаданные запроса
   * @returns Результат суммаризации
   */
  private async summarizeContent(agent: Agent, content: string, metadata?: Record<string, any>): Promise<any> {
    const prompt = this.buildPrompt(agent, 'summarization', content, metadata);
    
    // Получаем ответ от модели
    const modelResponse = await fetchModelResponse(prompt, {
      model: agent.modelName,
      temperature: agent.temperature || 0.3,
      maxTokens: agent.maxTokens || 1000
    });
    
    return {
      summary: modelResponse.trim(),
      wordCount: modelResponse.trim().split(/\s+/).length
    };
  }
  
  /**
   * Генерирует ответ на текст с помощью агента
   * @param agent Агент для генерации ответа
   * @param content Текст для ответа
   * @param metadata Метаданные запроса
   * @returns Сгенерированный ответ
   */
  private async generateResponse(agent: Agent, content: string, metadata?: Record<string, any>): Promise<any> {
    const prompt = this.buildPrompt(agent, 'response', content, metadata);
    
    // Включаем контекст из базы знаний, если это необходимо
    let contextFromRAG = '';
    if (agent.useRAG) {
      const subject = metadata?.subject || '';
      const classification = metadata?.classification || '';
      const query = content + ' ' + subject + ' ' + classification;
      
      const ragResults = await searchVectorStore(query, 5);
      if (ragResults && ragResults.length > 0) {
        contextFromRAG = '\nИнформация из базы знаний:\n' + ragResults.map(r => `${r.text} (Релевантность: ${r.score.toFixed(2)})`).join('\n\n');
      }
    }
    
    // Собираем полный запрос к модели
    const fullPrompt = prompt + (contextFromRAG ? contextFromRAG : '');
    
    // Получаем ответ от модели
    const modelResponse = await fetchModelResponse(fullPrompt, {
      model: agent.modelName,
      temperature: agent.temperature || 0.7,
      maxTokens: agent.maxTokens || 2000
    });
    
    return {
      response: modelResponse.trim(),
      isAutoGenerated: true,
      modelName: agent.modelName
    };
  }
  
  /**
   * Анализирует данные с помощью агента
   * @param agent Агент для анализа данных
   * @param content Данные для анализа
   * @param metadata Метаданные запроса
   * @returns Результат анализа
   */
  private async analyzeData(agent: Agent, content: string, metadata?: Record<string, any>): Promise<any> {
    const prompt = this.buildPrompt(agent, 'analytics', content, metadata);
    
    // Получаем ответ от модели
    const modelResponse = await fetchModelResponse(prompt, {
      model: agent.modelName,
      temperature: agent.temperature || 0.2,
      maxTokens: agent.maxTokens || 1500,
      responseFormat: { type: 'json_object' }
    });
    
    // Парсим JSON-ответ
    try {
      return JSON.parse(modelResponse);
    } catch (error) {
      console.error('Ошибка при парсинге ответа модели:', error);
      return {
        error: 'Ошибка анализа данных',
        rawResponse: modelResponse
      };
    }
  }
  
  /**
   * Обрабатывает обращение гражданина с помощью агента
   * @param agent Агент для обработки обращения
   * @param content Текст обращения
   * @param metadata Метаданные обращения
   * @returns Результат обработки
   */
  private async processCitizenRequest(agent: Agent, content: string, metadata?: Record<string, any>): Promise<any> {
    // В зависимости от подтипа агента, вызываем соответствующую функцию
    switch (agent.subtype) {
      case 'classification':
        return await this.classifyContent(agent, content, metadata);
      case 'response':
        return await this.generateResponse(agent, content, metadata);
      case 'routing':
        // Логика маршрутизации обращения
        const classificationResult = await this.classifyContent(agent, content, metadata);
        
        // Определение подразделения на основе классификации
        return {
          ...classificationResult,
          routing: {
            department: this.mapCategoryToDepartment(classificationResult.classification),
            priority: classificationResult.priority,
            needsHumanApproval: classificationResult.confidence < 0.7
          }
        };
      default:
        // Общая обработка обращения
        const prompt = this.buildPrompt(agent, 'citizen_request', content, metadata);
        
        // Получаем ответ от модели
        const modelResponse = await fetchModelResponse(prompt, {
          model: agent.modelName,
          temperature: agent.temperature || 0.4,
          maxTokens: agent.maxTokens || 1500,
          responseFormat: { type: 'json_object' }
        });
        
        try {
          return JSON.parse(modelResponse);
        } catch (error) {
          console.error('Ошибка при парсинге ответа модели:', error);
          return {
            error: 'Ошибка обработки обращения',
            rawResponse: modelResponse
          };
        }
    }
  }
  
  /**
   * Обрабатывает документ с помощью агента
   * @param agent Агент для обработки документа
   * @param content Текст документа
   * @param metadata Метаданные документа
   * @returns Результат обработки
   */
  private async processDocument(agent: Agent, content: string, metadata?: Record<string, any>): Promise<any> {
    const prompt = this.buildPrompt(agent, 'document', content, metadata);
    
    // Получаем ответ от модели
    const modelResponse = await fetchModelResponse(prompt, {
      model: agent.modelName,
      temperature: agent.temperature || 0.3,
      maxTokens: agent.maxTokens || 1500
    });
    
    return {
      analysis: modelResponse.trim(),
      documentType: metadata?.documentType || 'general',
      processedAt: new Date().toISOString()
    };
  }
  
  /**
   * Обрабатывает протокол с помощью агента
   * @param agent Агент для обработки протокола
   * @param content Текст протокола
   * @param metadata Метаданные протокола
   * @returns Результат обработки
   */
  private async processProtocol(agent: Agent, content: string, metadata?: Record<string, any>): Promise<any> {
    const prompt = this.buildPrompt(agent, 'protocol', content, metadata);
    
    // Получаем ответ от модели
    const modelResponse = await fetchModelResponse(prompt, {
      model: agent.modelName,
      temperature: agent.temperature || 0.2,
      maxTokens: agent.maxTokens || 2000,
      responseFormat: { type: 'json_object' }
    });
    
    try {
      const parsedResponse = JSON.parse(modelResponse);
      
      // Формируем структурированный результат
      return {
        summary: parsedResponse.summary || '',
        participants: parsedResponse.participants || [],
        decisions: parsedResponse.decisions || [],
        tasks: parsedResponse.tasks || [],
        deadlines: parsedResponse.deadlines || [],
        mainTopics: parsedResponse.mainTopics || []
      };
    } catch (error) {
      console.error('Ошибка при парсинге ответа модели:', error);
      return {
        error: 'Ошибка обработки протокола',
        rawResponse: modelResponse
      };
    }
  }
  
  /**
   * Переводит текст с помощью агента
   * @param agent Агент для перевода
   * @param content Текст для перевода
   * @param metadata Метаданные запроса
   * @returns Результат перевода
   */
  private async translateContent(agent: Agent, content: string, metadata?: Record<string, any>): Promise<any> {
    const sourceLanguage = metadata?.sourceLanguage || 'auto';
    const targetLanguage = metadata?.targetLanguage || 'ru';
    
    const prompt = this.buildPrompt(agent, 'translation', content, {
      ...metadata,
      sourceLanguage,
      targetLanguage
    });
    
    // Получаем ответ от модели
    const modelResponse = await fetchModelResponse(prompt, {
      model: agent.modelName,
      temperature: agent.temperature || 0.3,
      maxTokens: agent.maxTokens || 2000
    });
    
    return {
      translatedText: modelResponse.trim(),
      sourceLanguage,
      targetLanguage,
      wordCount: modelResponse.trim().split(/\s+/).length
    };
  }
  
  /**
   * Ищет информацию в базе знаний
   * @param agent Агент для поиска
   * @param content Запрос для поиска
   * @param metadata Метаданные запроса
   * @returns Результат поиска
   */
  private async searchKnowledgeBase(agent: Agent, content: string, metadata?: Record<string, any>): Promise<any> {
    // Выполняем поиск в векторном хранилище
    const limit = metadata?.limit || 5;
    const ragResults = await searchVectorStore(content, limit);
    
    if (!ragResults || ragResults.length === 0) {
      return {
        query: content,
        results: [],
        answer: 'Информация не найдена в базе знаний.'
      };
    }
    
    // Формируем вопрос к модели с контекстом из базы знаний
    const prompt = `
      Запрос пользователя: ${content}
      
      Информация из базы знаний:
      ${ragResults.map((r, i) => `[${i+1}] ${r.text}`).join('\n\n')}
      
      На основе предоставленной информации, пожалуйста, составь точный и информативный ответ на запрос пользователя.
      Если информации недостаточно, укажи это. Если информация противоречива, отметь это.
    `;
    
    // Получаем ответ от модели
    const modelResponse = await fetchModelResponse(prompt, {
      model: agent.modelName,
      temperature: agent.temperature || 0.3,
      maxTokens: agent.maxTokens || 1500
    });
    
    return {
      query: content,
      results: ragResults.map(r => ({
        text: r.text,
        score: r.score,
        source: r.source || 'база знаний'
      })),
      answer: modelResponse.trim()
    };
  }
  
  /**
   * Строит промпт для модели в зависимости от типа задачи
   * @param agent Агент для обработки
   * @param taskType Тип задачи
   * @param content Содержимое для обработки
   * @param metadata Метаданные
   * @returns Готовый промпт для модели
   */
  private buildPrompt(agent: Agent, taskType: string, content: string, metadata?: Record<string, any>): string {
    // Если у агента есть собственный шаблон, используем его
    if (agent.promptTemplate) {
      return this.fillPromptTemplate(agent.promptTemplate, {
        content,
        ...metadata
      });
    }
    
    // Иначе используем стандартные шаблоны в зависимости от типа задачи
    switch (taskType) {
      case 'classification':
        return `
          Ты экспертный классификатор обращений граждан и документов.
          
          Задача: Классифицировать следующее обращение гражданина и определить его приоритет.
          
          ${metadata?.subject ? `Тема: ${metadata.subject}\n` : ''}
          ${metadata?.fullName ? `Заявитель: ${metadata.fullName}\n` : ''}
          
          Обращение:
          ${content}
          
          Пожалуйста, проанализируй обращение и верни ответ в формате JSON:
          {
            "category": "complaint" | "proposal" | "application" | "information_request" | "appeal" | "gratitude" | "general" | "other",
            "confidence": <число от 0 до 1, отражающее уверенность в классификации>,
            "priority": "low" | "medium" | "high" | "urgent",
            "summary": <краткое изложение сути обращения, не более 100 слов>,
            "keywords": [<ключевые слова, характеризующие обращение>],
            "needsHumanReview": <true/false, нужна ли проверка человеком>
          }
        `;
      
      case 'summarization':
        return `
          Ты эксперт по составлению резюме текстов.
          
          Задача: Составить краткое и информативное резюме следующего текста, сохраняя все ключевые моменты и существенную информацию.
          
          ${metadata?.title ? `Название: ${metadata.title}\n` : ''}
          ${metadata?.context ? `Контекст: ${metadata.context}\n` : ''}
          
          Текст для резюмирования:
          ${content}
          
          Пожалуйста, составь краткое резюме, выделяя главные мысли и ключевые моменты.
        `;
      
      case 'response':
        return `
          Ты официальный представитель государственного органа, отвечающий на обращения граждан.
          
          Задача: Составить официальный, вежливый и информативный ответ на следующее обращение гражданина.
          
          ${metadata?.subject ? `Тема обращения: ${metadata.subject}\n` : ''}
          ${metadata?.fullName ? `Заявитель: ${metadata.fullName}\n` : ''}
          ${metadata?.classification ? `Классификация: ${metadata.classification}\n` : ''}
          ${metadata?.summary ? `Краткое содержание: ${metadata.summary}\n` : ''}
          
          Обращение:
          ${content}
          
          Пожалуйста, составь официальный, юридически корректный и вежливый ответ на данное обращение. 
          Ответ должен быть информативным, направленным на решение проблемы заявителя, и содержать 
          конкретные шаги или рекомендации, если это применимо.
        `;
      
      case 'analytics':
        return `
          Ты аналитик данных и текстовой информации.
          
          Задача: Проанализировать следующие данные и предоставить структурированный анализ.
          
          ${metadata?.context ? `Контекст: ${metadata.context}\n` : ''}
          ${metadata?.dataType ? `Тип данных: ${metadata.dataType}\n` : ''}
          
          Данные для анализа:
          ${content}
          
          Проведи детальный анализ предоставленных данных и верни результат в формате JSON со следующими ключами:
          - mainThemes (основные темы)
          - keyInsights (ключевые выводы)
          - trends (тренды или закономерности)
          - recommendations (рекомендации на основе анализа)
          - dataQuality (оценка качества данных)
        `;
      
      case 'protocol':
        return `
          Ты секретарь, обрабатывающий протоколы совещаний и встреч.
          
          Задача: Проанализировать протокол совещания и извлечь ключевую информацию.
          
          ${metadata?.title ? `Название совещания: ${metadata.title}\n` : ''}
          ${metadata?.date ? `Дата: ${metadata.date}\n` : ''}
          ${metadata?.attendees ? `Присутствовали: ${metadata.attendees}\n` : ''}
          
          Протокол совещания:
          ${content}
          
          Пожалуйста, проанализируй протокол и верни результат в формате JSON со следующими ключами:
          - summary (краткое резюме совещания)
          - participants (список участников с ролями)
          - decisions (список принятых решений)
          - tasks (список поставленных задач с исполнителями)
          - deadlines (сроки выполнения задач)
          - mainTopics (основные обсуждаемые темы)
        `;
      
      case 'translation':
        const sourceLanguage = metadata?.sourceLanguage || 'auto';
        const targetLanguage = metadata?.targetLanguage || 'ru';
        
        return `
          Ты профессиональный переводчик.
          
          Задача: Перевести следующий текст ${sourceLanguage !== 'auto' ? `с ${sourceLanguage}` : ''} на ${targetLanguage}.
          
          Текст для перевода:
          ${content}
          
          Пожалуйста, выполни качественный перевод, сохраняя стиль и смысл оригинального текста.
        `;
      
      case 'citizen_request':
        return `
          Ты специалист по обработке обращений граждан в государственном органе.
          
          Задача: Обработать следующее обращение гражданина.
          
          ${metadata?.subject ? `Тема обращения: ${metadata.subject}\n` : ''}
          ${metadata?.fullName ? `Заявитель: ${metadata.fullName}\n` : ''}
          ${metadata?.contactInfo ? `Контактная информация: ${metadata.contactInfo}\n` : ''}
          
          Обращение:
          ${content}
          
          Пожалуйста, проанализируй обращение и верни результат в формате JSON со следующими ключами:
          - category (категория обращения)
          - priority (приоритет обращения)
          - summary (краткое содержание)
          - suggestedResponse (предлагаемый ответ)
          - nextSteps (рекомендуемые следующие шаги)
          - estimatedTimeToResolve (примерное время решения в днях)
        `;
      
      case 'document':
        return `
          Ты специалист по обработке официальных документов.
          
          Задача: Проанализировать следующий документ и извлечь ключевую информацию.
          
          ${metadata?.documentType ? `Тип документа: ${metadata.documentType}\n` : ''}
          ${metadata?.title ? `Название: ${metadata.title}\n` : ''}
          ${metadata?.date ? `Дата: ${metadata.date}\n` : ''}
          
          Документ:
          ${content}
          
          Пожалуйста, проанализируй документ и предоставь:
          1. Краткое резюме документа
          2. Основные положения и требования
          3. Сроки и условия, если указаны
          4. Рекомендации по дальнейшей обработке документа
        `;
      
      default:
        return `
          Задача: Обработать следующий текст.
          
          ${metadata?.context ? `Контекст: ${metadata.context}\n` : ''}
          
          Текст:
          ${content}
          
          Пожалуйста, обработай этот текст наилучшим образом, учитывая контекст.
        `;
    }
  }
  
  /**
   * Заполняет шаблон промпта данными
   * @param template Шаблон промпта
   * @param data Данные для вставки в шаблон
   * @returns Заполненный промпт
   */
  private fillPromptTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\$\{([^}]+)\}/g, (match, key) => {
      const value = data[key];
      return value !== undefined ? String(value) : match;
    });
  }
  
  /**
   * Определяет подразделение на основе категории обращения
   * @param category Категория обращения
   * @returns Название ответственного подразделения
   */
  private mapCategoryToDepartment(category: string): string {
    const mapping: Record<string, string> = {
      'complaint': 'Отдел по работе с гражданами',
      'proposal': 'Канцелярия',
      'application': 'Отдел по работе с гражданами',
      'information_request': 'Канцелярия',
      'appeal': 'Юридический отдел',
      'gratitude': 'Отдел по работе с гражданами',
      'general': 'Отдел по работе с гражданами',
      'other': 'Канцелярия'
    };
    
    return mapping[category] || 'Канцелярия';
  }
  
  /**
   * Получает краткое описание результата для сохранения в блокчейне
   * @param result Полный результат обработки
   * @returns Сокращенная версия результата для блокчейна
   */
  private getBlockchainSummary(result: any): any {
    // Ограничиваем размер данных для блокчейна
    const stringifiedResult = JSON.stringify(result);
    
    if (stringifiedResult.length <= 1000) {
      return result;
    }
    
    // Для больших результатов создаем компактную версию
    if (result.classification) {
      return {
        classification: result.classification,
        confidence: result.confidence,
        priority: result.priority,
        summaryLength: result.summary?.length || 0
      };
    }
    
    if (result.summary) {
      return {
        summaryPreview: result.summary.substring(0, 200) + '...',
        fullResultSize: stringifiedResult.length
      };
    }
    
    if (result.response) {
      return {
        responsePreview: result.response.substring(0, 200) + '...',
        fullResultSize: stringifiedResult.length
      };
    }
    
    // Общий случай
    return {
      resultPreview: 'Полный результат слишком большой для сохранения в блокчейне',
      fullResultSize: stringifiedResult.length,
      timestamp: new Date().toISOString()
    };
  }
}

// Экспортируем сервис для использования в других модулях
export const agentService = new AgentService();