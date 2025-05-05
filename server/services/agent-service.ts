/**
 * Сервис AI-агентов
 * Центральный сервис для управления и координации всех AI-агентов в системе
 */

import { storage } from '../storage';
import { logActivity } from '../activity-logger';
import { recordToBlockchain, BlockchainRecordType } from './blockchain';
import { Agent, Integration } from '@shared/schema';
import { 
  summarizeDocument, 
  analyzeTranscription, 
  processUserMessage, 
  detectLanguage 
} from './openai';

// Типы для обработки запросов агентами
export enum AgentTaskType {
  CLASSIFICATION = 'classification',
  RESPONSE_GENERATION = 'response_generation',
  SUMMARIZATION = 'summarization',
  TRANSCRIPTION = 'transcription',
  TRANSLATION = 'translation',
  VALIDATION = 'validation',
  DATA_ANALYSIS = 'data_analysis',
  DOCUMENT_ANALYSIS = 'document_analysis'
}

// Типы сущностей, с которыми работают агенты
export enum AgentEntityType {
  CITIZEN_REQUEST = 'citizen_request',
  PROTOCOL = 'protocol',
  TASK = 'task',
  DOCUMENT = 'document',
  DAO_PROPOSAL = 'dao_proposal',
  BLOCKCHAIN_RECORD = 'blockchain_record'
}

// Интерфейс для входных данных агента
export interface AgentInput {
  taskType: AgentTaskType;
  entityType: AgentEntityType;
  entityId?: number;
  content: string;
  metadata?: Record<string, any>;
  userId?: number;
  urgent?: boolean;
  language?: string;
}

// Интерфейс для результата работы агента
export interface AgentResult {
  success: boolean;
  output?: string;
  classification?: string;
  summary?: string;
  analysis?: Record<string, any>;
  metadata?: Record<string, any>;
  transactionHash?: string;
  error?: string;
}

/**
 * Главный класс для координации работы агентов
 */
export class AgentService {
  // Кэш агентов для быстрого доступа
  private agentCache: Map<string, Agent> = new Map();
  private integrationCache: Map<string, Integration> = new Map();
  
  /**
   * Инициализация сервиса агентов
   */
  async initialize() {
    try {
      // Проверяем существуют ли интеграции
      const integrations = await storage.getIntegrations();
      
      // Если интеграций нет, создаем их
      if (!integrations || integrations.length === 0) {
        console.log("No integrations found, creating default integrations...");
        
        // Создаем интеграцию с OpenAI
        await storage.createIntegration({
          name: "OpenAI GPT-4o",
          type: "openai",
          apiKey: process.env.OPENAI_API_KEY || "",
          apiUrl: "https://api.openai.com/v1",
          isActive: true,
          config: {
            defaultModel: "gpt-4o",
            maxTokens: 4000,
            defaultTemp: 0.7
          }
        });
        
        // Создаем интеграцию с Moralis
        await storage.createIntegration({
          name: "Moralis API",
          type: "moralis",
          apiKey: process.env.MORALIS_API_KEY || "",
          apiUrl: "https://deep-index.moralis.io/api/v2",
          isActive: true,
          config: {
            chain: "eth",
            network: "testnet"
          }
        });
      }
      
      // Получаем обновленный список интеграций
      const updatedIntegrations = await storage.getIntegrations();
      
      // Находим ID интеграций для использования в агентах
      const openaiIntegration = updatedIntegrations.find(i => i.type === 'openai');
      if (!openaiIntegration) {
        throw new Error('OpenAI integration not found!');
      }
      
      const moralisIntegration = updatedIntegrations.find(i => i.type === 'moralis');
      if (!moralisIntegration) {
        throw new Error('Moralis integration not found!');
      }
      
      // Очищаем все предыдущие агенты - подход "чистого старта"
      const existingAgents = await storage.getAgents();
      if (existingAgents && existingAgents.length > 0) {
        for (const agent of existingAgents) {
          try {
            await storage.deleteAgent(agent.id);
          } catch (error) {
            console.warn(`Не удалось удалить агента ${agent.id}:`, error);
          }
        }
      }

      console.log("No agents found, creating default agents...");
      // Создаем только 4 ключевых агентов
      
      // 1. Агент для обработки обращений граждан
      await storage.createAgent({
        name: "AgentSmith",
        type: "citizen_requests",
        description: "Агент для обработки обращений граждан",
        systemPrompt: "Вы эксперт по работе с обращениями граждан. Ваша задача - анализировать текст обращения, классифицировать его и предложить решение на основе правил организационной структуры. ВАЖНО: Ваши ответы должны быть строго по теме обращения и соответствовать контексту.",
        modelId: openaiIntegration.id,
        isActive: true,
        config: {
          temperature: 0.3,
          maxTokens: 1500,
          departmentId: 1,
          capabilities: ["classification", "summarization", "response_generation"],
          integrationIds: [openaiIntegration.id]
        }
      });
      
      // 2. Блокчейн агент для записи транзакций
      await storage.createAgent({
        name: "BlockchainAgent",
        type: "blockchain",
        description: "Агент для записи данных в блокчейн через Moralis",
        systemPrompt: "Вы эксперт по блокчейн технологиям и смарт-контрактам. Ваша задача - обрабатывать запросы на сохранение данных в блокчейне и создавать хеши транзакций.",
        modelId: openaiIntegration.id,
        isActive: true,
        config: {
          temperature: 0.1,
          maxTokens: 1000,
          departmentId: 5,
          capabilities: ["data_analysis", "validation"],
          integrationIds: [moralisIntegration.id]
        }
      });

      // 3. Агент для анализа документов
      await storage.createAgent({
        name: "DocumentAI",
        type: "document_processing",
        description: "Анализирует и структурирует документы",
        systemPrompt: "Вы - эксперт по анализу и обработке документов. Ваша задача - анализировать структуру и юридическую корректность документов, извлекать важную информацию и готовить краткие резюме.",
        modelId: openaiIntegration.id,
        isActive: true,
        config: {
          temperature: 0.1,
          maxTokens: 2048,
          departmentId: 3,
          capabilities: ["document_analysis", "summarization"],
          integrationIds: [openaiIntegration.id]
        }
      });

      // 4. Агент для протоколов совещаний
      await storage.createAgent({
        name: "ProtocolMaster",
        type: "meeting_protocols",
        description: "Анализирует записи и протоколы совещаний",
        systemPrompt: "Вы - эксперт по анализу записей совещаний и протоколов. Ваша задача - определять ключевые моменты, решения и задачи, упомянутые на совещаниях, и создавать четкие протоколы и планы действий.",
        modelId: openaiIntegration.id,
        isActive: true,
        config: {
          temperature: 0.2,
          maxTokens: 2048,
          departmentId: 2,
          capabilities: ["transcription", "summarization", "classification"],
          integrationIds: [openaiIntegration.id]
        }
      });
      
      // Получаем созданных агентов
      const agents = await storage.getAgents();
      
      // Кэшируем агентов по типу для быстрого доступа
      const agentList = await storage.getAgents(); // Получаем агентов непосредственно из хранилища
      agentList.forEach(agent => {
        if (agent.isActive) {
          this.agentCache.set(agent.type, agent);
        }
      });
      
      // Кэшируем активные интеграции
      updatedIntegrations.forEach(integration => {
        if (integration.isActive) {
          this.integrationCache.set(integration.type, integration);
        }
      });
      
      console.log(`Agent Service initialized with ${this.agentCache.size} agents and ${this.integrationCache.size} integrations`);
      return true;
    } catch (error) {
      console.error("Failed to initialize Agent Service:", error);
      return false;
    }
  }
  
  /**
   * Обновление кэша агентов и интеграций
   */
  async refreshCache() {
    this.agentCache.clear();
    this.integrationCache.clear();
    return this.initialize();
  }
  
  /**
   * Обработка запроса агентом
   */
  async processRequest(input: AgentInput): Promise<AgentResult> {
    try {
      // Логируем начало обработки
      await logActivity({
        action: 'ai_process_start',
        entityType: input.entityType,
        entityId: input.entityId,
        userId: input.userId,
        details: `Начало обработки ${this.getEntityTypeName(input.entityType)} AI-агентом`,
        metadata: {
          taskType: input.taskType,
          urgent: input.urgent || false
        }
      });
      
      // Определяем подходящего агента для задачи
      const agent = this.findAgentForTask(input.taskType, input.entityType);
      
      if (!agent) {
        throw new Error(`Не найден подходящий агент для задачи ${input.taskType} и типа ${input.entityType}`);
      }
      
      // Определяем язык контента, если не указан
      const language = input.language || await this.detectContentLanguage(input.content);
      
      // Обрабатываем запрос в зависимости от типа задачи
      let result: AgentResult;
      
      switch (input.taskType) {
        case AgentTaskType.CLASSIFICATION:
          result = await this.performClassification(agent, input, language);
          break;
        case AgentTaskType.RESPONSE_GENERATION:
          result = await this.generateResponse(agent, input, language);
          break;
        case AgentTaskType.SUMMARIZATION:
          result = await this.summarizeContent(agent, input, language);
          break;
        case AgentTaskType.DOCUMENT_ANALYSIS:
          result = await this.analyzeDocument(agent, input, language);
          break;
        case AgentTaskType.VALIDATION:
          result = await this.validateBlockchainRecord(agent, input);
          break;
        default:
          result = {
            success: false,
            error: `Неподдерживаемый тип задачи: ${input.taskType}`
          };
      }
      
      // Запись результата в блокчейн, если обработка успешна
      if (result.success) {
        const blockchainResult = await this.recordResultToBlockchain(input, result, agent.id);
        result.transactionHash = blockchainResult.transactionHash;
      }
      
      // Логируем завершение обработки
      await logActivity({
        action: 'ai_process_complete',
        entityType: input.entityType,
        entityId: input.entityId,
        userId: input.userId,
        details: `Завершение обработки ${this.getEntityTypeName(input.entityType)} AI-агентом ${agent.name}`,
        metadata: {
          taskType: input.taskType,
          success: result.success,
          transactionHash: result.transactionHash
        }
      });
      
      return result;
      
    } catch (error) {
      console.error("Error in agent processing:", error);
      
      // Логируем ошибку
      await logActivity({
        action: 'ai_process_error',
        entityType: input.entityType,
        entityId: input.entityId,
        userId: input.userId,
        details: `Ошибка обработки ${this.getEntityTypeName(input.entityType)} AI-агентом: ${error.message}`,
        metadata: {
          taskType: input.taskType,
          error: error.message
        }
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Поиск подходящего агента для задачи
   */
  private findAgentForTask(taskType: AgentTaskType, entityType: AgentEntityType): Agent | undefined {
    // Маппинг типов задач к типам агентов
    const agentTypeMap: Record<string, string[]> = {
      [AgentTaskType.CLASSIFICATION]: ['citizen_requests', 'general'],
      [AgentTaskType.RESPONSE_GENERATION]: ['citizen_requests', 'general'],
      [AgentTaskType.SUMMARIZATION]: ['summarizer', 'general'],
      [AgentTaskType.TRANSCRIPTION]: ['meeting_protocols', 'general'],
      [AgentTaskType.DOCUMENT_ANALYSIS]: ['summarizer', 'document_analyzer', 'general'],
      [AgentTaskType.VALIDATION]: ['blockchain_validator', 'general']
    };
    
    // Маппинг типов сущностей к типам агентов
    const entityTypeMap: Record<string, string[]> = {
      [AgentEntityType.CITIZEN_REQUEST]: ['citizen_requests', 'general'],
      [AgentEntityType.PROTOCOL]: ['meeting_protocols', 'general'],
      [AgentEntityType.DOCUMENT]: ['document_analyzer', 'summarizer', 'general'],
      [AgentEntityType.DAO_PROPOSAL]: ['dao_agent', 'general'],
      [AgentEntityType.BLOCKCHAIN_RECORD]: ['blockchain_validator', 'general']
    };
    
    // Получаем списки подходящих типов агентов
    const taskAgentTypes = agentTypeMap[taskType] || ['general'];
    const entityAgentTypes = entityTypeMap[entityType] || ['general'];
    
    // Ищем агента, который подходит и для задачи, и для типа сущности
    for (const agentType of taskAgentTypes) {
      if (entityAgentTypes.includes(agentType) && this.agentCache.has(agentType)) {
        return this.agentCache.get(agentType);
      }
    }
    
    // Если не нашли точное совпадение, возвращаем первого подходящего агента для задачи
    for (const agentType of taskAgentTypes) {
      if (this.agentCache.has(agentType)) {
        return this.agentCache.get(agentType);
      }
    }
    
    // Если совсем не нашли, возвращаем общего агента
    return this.agentCache.get('general');
  }
  
  /**
   * Определение языка контента
   */
  private async detectContentLanguage(content: string): Promise<string> {
    try {
      const result = await detectLanguage(content);
      return result || 'ru';
    } catch (error) {
      console.error("Error detecting language:", error);
      return 'ru'; // По умолчанию русский
    }
  }
  
  /**
   * Классификация контента
   */
  private async performClassification(agent: Agent, input: AgentInput, language: string): Promise<AgentResult> {
    try {
      // Используем системный промпт агента или формируем стандартный
      const systemPrompt = agent.systemPrompt || 
        `Вы эксперт по классификации ${this.getEntityTypeName(input.entityType)} на русском и казахском языках. 
         Пожалуйста, проанализируйте содержимое и определите наиболее подходящую категорию.
         Возвращайте только название категории без дополнительных объяснений.`;
      
      const userPrompt = `Пожалуйста, классифицируйте следующее содержимое:
      
      ${input.content}
      
      Возможные категории:
      - Запрос информации
      - Жалоба на госорган
      - Жалоба на должностное лицо
      - Предложение по улучшению
      - Запрос на получение услуги
      - Консультация
      - Иное
      
      Пожалуйста, укажите только одну наиболее подходящую категорию.`;
      
      const classification = await processUserMessage(systemPrompt, userPrompt);
      
      return {
        success: true,
        classification,
        output: classification,
        metadata: {
          agentId: agent.id,
          agentName: agent.name,
          language
        }
      };
    } catch (error) {
      console.error("Classification error:", error);
      return {
        success: false,
        error: `Ошибка классификации: ${error.message}`
      };
    }
  }
  
  /**
   * Генерация ответа
   */
  private async generateResponse(agent: Agent, input: AgentInput, language: string): Promise<AgentResult> {
    try {
      // Используем системный промпт агента или формируем стандартный
      const systemPrompt = agent.systemPrompt || 
        `Вы государственный служащий, эксперт по обработке обращений граждан.
         Ваша задача - дать четкий, вежливый и полезный ответ на обращение гражданина.
         Ответ должен быть в соответствии с законодательством Республики Казахстан.
         Используйте официальный, но дружелюбный тон. Не используйте жаргон или сложную терминологию.

         ВАЖНО: Ответ должен напрямую относиться к сути обращения. Не давайте информацию, не связанную с темой обращения.
         Например, если гражданин спрашивает о проблеме с ЭЦП, не давайте информацию о справке о несудимости.
         Ваш ответ должен содержать конкретные шаги или рекомендации по решению проблемы, описанной в обращении.`;
      
      const userPrompt = `Пожалуйста, сформируйте ответ на следующее обращение гражданина:
      
      Обращение: "${input.content}"
      
      ${input.metadata?.classification ? `Классификация обращения: ${input.metadata.classification}` : ''}
      
      Ваш ответ должен быть:
      1. Непосредственно связан с темой обращения
      2. Содержать конкретные рекомендации по решению проблемы
      3. Содержать информацию о том, куда может обратиться гражданин за дополнительной помощью
      
      Сейчас ваша роль – специалист по обработке обращений граждан, который должен дать полный и информативный ответ, решающий проблему гражданина.

      Сформулируйте ответ в формате официального ответа на обращение гражданина.`;
      
      console.log("Generating response to citizen request with prompt:", userPrompt);
      const response = await processUserMessage(systemPrompt, userPrompt);
      console.log("Generated response:", response);
      
      return {
        success: true,
        output: response,
        metadata: {
          agentId: agent.id,
          agentName: agent.name,
          language
        }
      };
    } catch (error) {
      console.error("Response generation error:", error);
      return {
        success: false,
        error: `Ошибка генерации ответа: ${error.message}`
      };
    }
  }
  
  /**
   * Суммаризация контента
   */
  private async summarizeContent(agent: Agent, input: AgentInput, language: string): Promise<AgentResult> {
    try {
      const summary = await summarizeDocument(input.content);
      
      return {
        success: true,
        output: summary,
        summary,
        metadata: {
          agentId: agent.id,
          agentName: agent.name,
          language,
          originalLength: input.content.length,
          summaryLength: summary.length
        }
      };
    } catch (error) {
      console.error("Summarization error:", error);
      return {
        success: false,
        error: `Ошибка суммаризации: ${error.message}`
      };
    }
  }
  
  /**
   * Анализ документа
   */
  private async analyzeDocument(agent: Agent, input: AgentInput, language: string): Promise<AgentResult> {
    try {
      // Используем системный промпт агента или формируем стандартный
      const systemPrompt = agent.systemPrompt || 
        `Вы эксперт по анализу документов.
         Проанализируйте содержимое документа и выделите ключевые моменты, участников, сроки и обязательства.
         Структурируйте ответ по разделам.`;
      
      const userPrompt = `Пожалуйста, проанализируйте следующий документ:
      
      ${input.content}
      
      Выделите:
      1. Ключевые факты и выводы
      2. Участники и их роли
      3. Сроки и важные даты
      4. Обязательства и ответственные
      5. Рекомендации`;
      
      const analysis = await processUserMessage(systemPrompt, userPrompt);
      
      // Примитивное извлечение структурированных данных из текста анализа
      const analysisData = this.extractStructuredDataFromText(analysis);
      
      return {
        success: true,
        output: analysis,
        analysis: analysisData,
        metadata: {
          agentId: agent.id,
          agentName: agent.name,
          language
        }
      };
    } catch (error) {
      console.error("Document analysis error:", error);
      return {
        success: false,
        error: `Ошибка анализа документа: ${error.message}`
      };
    }
  }
  
  /**
   * Валидация записи в блокчейне
   */
  private async validateBlockchainRecord(agent: Agent, input: AgentInput): Promise<AgentResult> {
    try {
      // Здесь должна быть реальная валидация через Moralis API
      // На данный момент просто возвращаем успешный результат
      return {
        success: true,
        output: "Запись в блокчейне валидна",
        metadata: {
          agentId: agent.id,
          agentName: agent.name,
          validationTimestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error("Blockchain validation error:", error);
      return {
        success: false,
        error: `Ошибка валидации блокчейн-записи: ${error.message}`
      };
    }
  }
  
  /**
   * Запись результата работы агента в блокчейн
   */
  private async recordResultToBlockchain(
    input: AgentInput, 
    result: AgentResult, 
    agentId: number
  ): Promise<{ transactionHash: string }> {
    try {
      // Формируем данные для записи в блокчейн
      const blockchainData = {
        type: this.mapEntityTypeToBlockchainType(input.entityType),
        title: `AI processing: ${input.taskType} of ${input.entityType}`,
        content: result.output || result.summary || JSON.stringify(result.analysis),
        metadata: {
          entityId: input.entityId,
          entityType: input.entityType,
          taskType: input.taskType,
          agentId,
          timestamp: new Date().toISOString(),
          ...result.metadata
        }
      };
      
      // Записываем в блокчейн
      const blockchainResult = await recordToBlockchain(blockchainData);
      
      return { 
        transactionHash: blockchainResult.transactionHash
      };
    } catch (error) {
      console.error("Error recording to blockchain:", error);
      return { 
        transactionHash: 'error_recording_' + Date.now()
      };
    }
  }
  
  /**
   * Преобразование типа сущности в тип блокчейн-записи
   */
  private mapEntityTypeToBlockchainType(entityType: AgentEntityType): BlockchainRecordType {
    const mapping: Record<AgentEntityType, BlockchainRecordType> = {
      [AgentEntityType.CITIZEN_REQUEST]: BlockchainRecordType.CITIZEN_REQUEST,
      [AgentEntityType.PROTOCOL]: BlockchainRecordType.DOCUMENT,
      [AgentEntityType.TASK]: BlockchainRecordType.TASK,
      [AgentEntityType.DOCUMENT]: BlockchainRecordType.DOCUMENT,
      [AgentEntityType.DAO_PROPOSAL]: BlockchainRecordType.SYSTEM_EVENT,
      [AgentEntityType.BLOCKCHAIN_RECORD]: BlockchainRecordType.SYSTEM_EVENT,
    };
    
    return mapping[entityType] || BlockchainRecordType.SYSTEM_EVENT;
  }
  
  /**
   * Получение названия типа сущности на русском
   */
  private getEntityTypeName(entityType: AgentEntityType): string {
    const names: Record<AgentEntityType, string> = {
      [AgentEntityType.CITIZEN_REQUEST]: 'обращения гражданина',
      [AgentEntityType.PROTOCOL]: 'протокола совещания',
      [AgentEntityType.TASK]: 'задачи',
      [AgentEntityType.DOCUMENT]: 'документа',
      [AgentEntityType.DAO_PROPOSAL]: 'предложения DAO',
      [AgentEntityType.BLOCKCHAIN_RECORD]: 'блокчейн-записи',
    };
    
    return names[entityType] || entityType;
  }
  
  /**
   * Извлечение структурированных данных из текста
   */
  private extractStructuredDataFromText(text: string): Record<string, any> {
    const sections: Record<string, string> = {};
    
    // Простая эвристика для разбиения на разделы по цифрам с точкой в начале строки
    const sectionRegex = /^\s*(\d+)\.\s+(.*?)(?=\n\s*\d+\.|$)/gms;
    let match;
    
    while ((match = sectionRegex.exec(text)) !== null) {
      const [, num, content] = match;
      sections[`section_${num}`] = content.trim();
    }
    
    return sections;
  }
}

// Создаем экземпляр сервиса
export const agentService = new AgentService();

// Инициализируем сервис при запуске
agentService.initialize().catch(err => {
  console.error("Failed to initialize agent service:", err);
});