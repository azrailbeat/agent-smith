/**
 * Интеграция с Planka - система управления проектами типа Kanban
 */

import axios, { AxiosInstance } from 'axios';
import { logActivity } from '../activity-logger';

// Интерфейсы для работы с Planka
export interface PlankaAuthConfig {
  baseUrl: string;
  username: string;
  password: string;
  projectId?: string;
}

export interface PlankaBoard {
  id: string;
  name: string;
  position: number;
  projectId: string;
}

export interface PlankaList {
  id: string;
  name: string;
  position: number;
  boardId: string;
}

export interface PlankaCard {
  id: string;
  name: string;
  description: string;
  position: number;
  listId: string;
  boardId: string;
  dueDate?: string;
  labels?: string[];
  members?: string[];
}

export interface PlankaComment {
  id: string;
  text: string;
  cardId: string;
  userId: string;
  createdAt: string;
}

// Класс для интеграции с Planka
export class PlankaIntegration {
  private static instance: PlankaIntegration;
  private api: AxiosInstance | null = null;
  private token: string | null = null;
  private config: PlankaAuthConfig | null = null;
  private initialized = false;

  // Получение экземпляра синглтона
  public static getInstance(): PlankaIntegration {
    if (!PlankaIntegration.instance) {
      PlankaIntegration.instance = new PlankaIntegration();
    }
    return PlankaIntegration.instance;
  }

  // Приватный конструктор для синглтона
  private constructor() {}

  // Проверка, инициализирована ли интеграция
  public isInitialized(): boolean {
    return this.initialized;
  }

  // Инициализация с конфигурацией
  public async initialize(config: PlankaAuthConfig): Promise<boolean> {
    try {
      this.config = config;
      this.api = axios.create({
        baseURL: config.baseUrl,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Аутентификация
      const response = await this.api.post('/api/access-tokens', {
        username: config.username,
        password: config.password,
      });

      this.token = response.data.item.accessToken;
      this.api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
      this.initialized = true;

      console.log('Planka интеграция инициализирована');
      return true;
    } catch (error) {
      console.error('Ошибка при инициализации Planka интеграции:', error);
      this.initialized = false;
      return false;
    }
  }

  // Получение конфигурации
  public getConfig(): PlankaAuthConfig | null {
    return this.config;
  }

  // Проверка соединения
  public async testConnection(): Promise<boolean> {
    try {
      if (!this.initialized || !this.api) {
        throw new Error('Интеграция не инициализирована');
      }

      await this.api.get('/api/users/me');
      return true;
    } catch (error) {
      console.error('Ошибка проверки соединения с Planka:', error);
      return false;
    }
  }

  // Получение проектов
  public async getProjects(): Promise<any[]> {
    try {
      if (!this.initialized || !this.api) {
        throw new Error('Интеграция не инициализирована');
      }

      const response = await this.api.get('/api/projects');
      return response.data.items;
    } catch (error) {
      console.error('Ошибка при получении проектов из Planka:', error);
      return [];
    }
  }

  // Получение досок для проекта
  public async getBoards(projectId: string): Promise<PlankaBoard[]> {
    try {
      if (!this.initialized || !this.api) {
        throw new Error('Интеграция не инициализирована');
      }

      const response = await this.api.get(`/api/projects/${projectId}/boards`);
      return response.data.items;
    } catch (error) {
      console.error(`Ошибка при получении досок для проекта ${projectId}:`, error);
      return [];
    }
  }

  // Получение списков для доски
  public async getLists(boardId: string): Promise<PlankaList[]> {
    try {
      if (!this.initialized || !this.api) {
        throw new Error('Интеграция не инициализирована');
      }

      const response = await this.api.get(`/api/boards/${boardId}/lists`);
      return response.data.items;
    } catch (error) {
      console.error(`Ошибка при получении списков для доски ${boardId}:`, error);
      return [];
    }
  }

  // Получение карточек для списка
  public async getCards(listId: string): Promise<PlankaCard[]> {
    try {
      if (!this.initialized || !this.api) {
        throw new Error('Интеграция не инициализирована');
      }

      const response = await this.api.get(`/api/lists/${listId}/cards`);
      return response.data.items;
    } catch (error) {
      console.error(`Ошибка при получении карточек для списка ${listId}:`, error);
      return [];
    }
  }

  // Создание карточки
  public async createCard(card: Omit<PlankaCard, 'id' | 'position'>): Promise<PlankaCard | null> {
    try {
      if (!this.initialized || !this.api) {
        throw new Error('Интеграция не инициализирована');
      }

      const response = await this.api.post(`/api/lists/${card.listId}/cards`, card);
      return response.data.item;
    } catch (error) {
      console.error('Ошибка при создании карточки в Planka:', error);
      return null;
    }
  }

  // Обновление карточки
  public async updateCard(cardId: string, updateData: Partial<PlankaCard>): Promise<PlankaCard | null> {
    try {
      if (!this.initialized || !this.api) {
        throw new Error('Интеграция не инициализирована');
      }

      const response = await this.api.patch(`/api/cards/${cardId}`, updateData);
      return response.data.item;
    } catch (error) {
      console.error(`Ошибка при обновлении карточки ${cardId}:`, error);
      return null;
    }
  }

  // Добавление комментария к карточке
  public async addComment(cardId: string, text: string): Promise<PlankaComment | null> {
    try {
      if (!this.initialized || !this.api) {
        throw new Error('Интеграция не инициализирована');
      }

      const response = await this.api.post(`/api/cards/${cardId}/comments`, { text });
      return response.data.item;
    } catch (error) {
      console.error(`Ошибка при добавлении комментария к карточке ${cardId}:`, error);
      return null;
    }
  }

  // Создание обращения гражданина в Planka
  public async createCitizenRequestCard(
    request: any,
    projectId: string,
    boardId: string,
    listId: string,
    userId: number
  ): Promise<PlankaCard | null> {
    try {
      if (!this.initialized || !this.api) {
        throw new Error('Интеграция не инициализирована');
      }

      // Создаем карточку для обращения
      const card = await this.createCard({
        name: `Обращение: ${request.subject}`,
        description: `От: ${request.fullName}\nКонтакт: ${request.contactInfo}\n\n${request.description}`,
        listId,
        boardId,
        dueDate: request.dueDate,
        labels: [request.priority, request.requestType]
      });

      if (card) {
        // Добавляем комментарий с дополнительной информацией
        const commentText = `
          Тип обращения: ${request.requestType}
          Приоритет: ${request.priority}
          Дата создания: ${new Date(request.createdAt).toLocaleDateString()}
          ${request.aiProcessed ? 'Классификация ИИ: ' + request.aiClassification : ''}
        `;
        
        await this.addComment(card.id, commentText);

        // Логируем создание карточки
        await logActivity({
          action: 'planka_card_created',
          userId,
          entityType: 'citizen_request',
          entityId: request.id,
          details: `Создана карточка в Planka для обращения ${request.id}`,
          metadata: { cardId: card.id, boardId, listId }
        });

        return card;
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка при создании карточки для обращения в Planka:', error);
      return null;
    }
  }

  // Создание задачи в Planka
  public async createTaskCard(
    task: any,
    projectId: string,
    boardId: string,
    listId: string,
    userId: number
  ): Promise<PlankaCard | null> {
    try {
      if (!this.initialized || !this.api) {
        throw new Error('Интеграция не инициализирована');
      }

      // Создаем карточку для задачи
      const card = await this.createCard({
        name: task.title,
        description: task.description || '',
        listId,
        boardId,
        dueDate: task.dueDate,
        labels: [task.priority, 'task']
      });

      if (card) {
        // Добавляем комментарий с дополнительной информацией
        const commentText = `
          Приоритет: ${task.priority}
          Статус: ${task.status}
          Назначена: ${task.assignedTo ? `ID пользователя ${task.assignedTo}` : 'Не назначена'}
          Дата создания: ${new Date(task.createdAt).toLocaleDateString()}
        `;
        
        await this.addComment(card.id, commentText);

        // Логируем создание карточки
        await logActivity({
          action: 'planka_card_created',
          userId,
          entityType: 'task',
          entityId: task.id,
          details: `Создана карточка в Planka для задачи ${task.id}`,
          metadata: { cardId: card.id, boardId, listId }
        });

        return card;
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка при создании карточки для задачи в Planka:', error);
      return null;
    }
  }

  // Синхронизация статуса карточки с задачей
  public async syncTaskWithCard(
    taskId: number,
    cardId: string,
    taskStatus: string,
    userId: number
  ): Promise<boolean> {
    try {
      if (!this.initialized || !this.api) {
        throw new Error('Интеграция не инициализирована');
      }

      // Получаем текущие данные карточки
      const response = await this.api.get(`/api/cards/${cardId}`);
      const card = response.data.item;
      
      if (!card) {
        throw new Error(`Карточка с ID ${cardId} не найдена`);
      }

      // Получаем списки на доске
      const lists = await this.getLists(card.boardId);
      
      // Сопоставляем статусы задач с названиями списков
      const statusToListMap: Record<string, string> = {
        'new': lists.find(l => l.name.toLowerCase().includes('новы'))?.id,
        'in_progress': lists.find(l => l.name.toLowerCase().includes('работ'))?.id,
        'review': lists.find(l => l.name.toLowerCase().includes('ревью') || l.name.toLowerCase().includes('проверк'))?.id,
        'done': lists.find(l => l.name.toLowerCase().includes('готов') || l.name.toLowerCase().includes('выполнен'))?.id,
        'canceled': lists.find(l => l.name.toLowerCase().includes('отмен'))?.id,
      };

      // Находим подходящий список по статусу
      const targetListId = statusToListMap[taskStatus];
      
      if (targetListId && targetListId !== card.listId) {
        // Перемещаем карточку в соответствующий список
        await this.api.patch(`/api/cards/${cardId}`, { listId: targetListId });
        
        // Добавляем комментарий о смене статуса
        await this.addComment(cardId, `Статус изменен на: ${taskStatus}`);
        
        // Логируем синхронизацию
        await logActivity({
          action: 'planka_card_updated',
          userId,
          entityType: 'task',
          entityId: taskId,
          details: `Карточка в Planka синхронизирована с задачей ${taskId}`,
          metadata: { cardId, taskStatus, listId: targetListId }
        });
        
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Ошибка при синхронизации задачи ${taskId} с карточкой в Planka:`, error);
      return false;
    }
  }
}

// Экспорт экземпляра синглтона
export const plankaIntegration = PlankaIntegration.getInstance();