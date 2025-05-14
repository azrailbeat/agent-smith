/**
 * Сервис управления ИИ-агентами
 * Обеспечивает единое управление агентами для всех модулей системы
 */

import { logActivity } from '../activity-logger';

// Типы агентов в системе
export enum AgentType {
  CITIZEN_REQUESTS = 'citizen_requests',
  BLOCKCHAIN = 'blockchain',
  DOCUMENT_ANALYSIS = 'document_analysis',
  MEETING_PROTOCOLS = 'meeting_protocols'
}

// Доступные модели для агентов
export enum AgentModel {
  GPT4 = 'openai-gpt-4o',
  CLAUDE = 'anthropic-claude-3-7-sonnet',
  LLAMA = 'llama-3-sonar',
  GEMINI = 'gemini-1.5-flash',
  LOCAL = 'local-mistral-7b'
}

// Интерфейс агента
export interface Agent {
  id: number;
  name: string;
  type: AgentType | string;
  model: AgentModel | string;
  description?: string;
  isActive: boolean;
  systemPrompt?: string;
  config?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Интерфейс для создания нового агента
export interface CreateAgentData {
  name: string;
  type: AgentType | string;
  model: AgentModel | string;
  description?: string;
  isActive?: boolean;
  systemPrompt?: string;
  config?: Record<string, any>;
}

// Интерфейс для обновления агента
export interface UpdateAgentData {
  name?: string;
  model?: AgentModel | string;
  description?: string;
  isActive?: boolean;
  systemPrompt?: string;
  config?: Record<string, any>;
}

/**
 * Класс управления агентами
 */
export class AgentManagementService {
  private agents: Agent[] = [];
  private static instance: AgentManagementService;
  private nextId = 1;

  private constructor() {
    // Приватный конструктор для синглтона
    // Инициализация предопределенных агентов
    this.initializeDefaultAgents();
  }

  /**
   * Получение экземпляра сервиса (синглтон)
   */
  public static getInstance(): AgentManagementService {
    if (!AgentManagementService.instance) {
      AgentManagementService.instance = new AgentManagementService();
    }
    return AgentManagementService.instance;
  }

  /**
   * Инициализация предопределенных агентов
   */
  private initializeDefaultAgents() {
    // Агент для обработки обращений граждан
    this.createAgent({
      name: 'Обработка обращений граждан',
      type: AgentType.CITIZEN_REQUESTS,
      model: AgentModel.GPT4,
      description: 'Универсальный агент для обработки обращений граждан в государственные органы Казахстана',
      isActive: true,
      systemPrompt: 'Вы - помощник по обработке обращений граждан в государственные органы. Анализируйте обращения, классифицируйте их по тематике и предлагайте решения.'
    });

    // Агент для блокчейн-операций
    this.createAgent({
      name: 'BlockchainAgent',
      type: AgentType.BLOCKCHAIN,
      model: AgentModel.GPT4,
      description: 'Агент для записи данных в блокчейн через Moralis',
      isActive: true,
      systemPrompt: 'Вы - ассистент для работы с блокчейн записями. Помогайте формировать корректные данные для записи в блокчейн.'
    });

    // Агент для анализа документов
    this.createAgent({
      name: 'Анализ и проверка документов',
      type: AgentType.DOCUMENT_ANALYSIS,
      model: AgentModel.GPT4,
      description: 'Анализирует содержимое и структуру документов для государственных органов',
      isActive: true,
      systemPrompt: 'Вы - эксперт по анализу документов. Исследуйте содержимое документов, проверяйте их на соответствие требованиям и выявляйте ключевые моменты.'
    });

    // Агент для протоколов собраний
    this.createAgent({
      name: 'Автопротокол совещаний',
      type: AgentType.MEETING_PROTOCOLS,
      model: AgentModel.GPT4,
      description: 'Анализ и формирование протоколов заседаний и совещаний государственных органов',
      isActive: true,
      systemPrompt: 'Вы - специалист по созданию протоколов совещаний. Анализируйте аудиозаписи и стенограммы, выделяйте основные моменты, формируйте резюме и список поручений.'
    });
  }

  /**
   * Получение всех агентов
   */
  public getAllAgents(): Agent[] {
    return [...this.agents];
  }

  /**
   * Получение агентов по типу
   * @param type Тип агента
   */
  public getAgentsByType(type: AgentType | string): Agent[] {
    return this.agents.filter(agent => agent.type === type);
  }

  /**
   * Получение активных агентов
   */
  public getActiveAgents(): Agent[] {
    return this.agents.filter(agent => agent.isActive);
  }

  /**
   * Получение активных агентов по типу
   * @param type Тип агента
   */
  public getActiveAgentsByType(type: AgentType | string): Agent[] {
    return this.agents.filter(agent => agent.type === type && agent.isActive);
  }

  /**
   * Получение агента по ID
   * @param id ID агента
   */
  public getAgentById(id: number): Agent | undefined {
    return this.agents.find(agent => agent.id === id);
  }

  /**
   * Создание нового агента
   * @param data Данные для создания агента
   */
  public createAgent(data: CreateAgentData): Agent {
    const now = new Date();
    const newAgent: Agent = {
      id: this.nextId++,
      name: data.name,
      type: data.type,
      model: data.model,
      description: data.description || '',
      isActive: data.isActive ?? true,
      systemPrompt: data.systemPrompt || '',
      config: data.config || {},
      createdAt: now,
      updatedAt: now
    };

    this.agents.push(newAgent);

    // Логирование операции
    logActivity({
      action: 'agent_created',
      entityType: 'agent',
      entityId: newAgent.id,
      details: `Создан новый агент: ${newAgent.name} (тип: ${newAgent.type})`
    });

    return newAgent;
  }

  /**
   * Обновление агента
   * @param id ID агента
   * @param data Данные для обновления
   */
  public updateAgent(id: number, data: UpdateAgentData): Agent | null {
    const agentIndex = this.agents.findIndex(agent => agent.id === id);
    if (agentIndex === -1) return null;

    const updatedAgent = {
      ...this.agents[agentIndex],
      ...data,
      updatedAt: new Date()
    };

    this.agents[agentIndex] = updatedAgent;

    // Логирование операции
    logActivity({
      action: 'agent_updated',
      entityType: 'agent',
      entityId: updatedAgent.id,
      details: `Обновлен агент: ${updatedAgent.name} (тип: ${updatedAgent.type})`
    });

    return updatedAgent;
  }

  /**
   * Изменение статуса активности агента
   * @param id ID агента
   * @param isActive Новый статус активности
   */
  public setAgentStatus(id: number, isActive: boolean): Agent | null {
    return this.updateAgent(id, { isActive });
  }

  /**
   * Удаление агента
   * @param id ID агента
   */
  public deleteAgent(id: number): boolean {
    const agentIndex = this.agents.findIndex(agent => agent.id === id);
    if (agentIndex === -1) return false;

    const deletedAgent = this.agents[agentIndex];
    this.agents.splice(agentIndex, 1);

    // Логирование операции
    logActivity({
      action: 'agent_deleted',
      entityType: 'agent',
      entityId: id,
      details: `Удален агент: ${deletedAgent.name} (тип: ${deletedAgent.type})`
    });

    return true;
  }
}

// Экспортируем экземпляр сервиса
export const agentManagementService = AgentManagementService.getInstance();