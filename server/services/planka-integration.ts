/**
 * Сервис для интеграции с Planka (система управления проектами Kanban)
 */

import axios from 'axios';
import { storage } from '../storage';

interface PlankaConfig {
  url: string;
  token: string;
  syncInterval?: number; // в минутах
  autoSync?: boolean;
}

interface SyncResult {
  success: boolean;
  updated: number;
  errors: string[];
  details: any;
}

interface ConnectionResult {
  success: boolean;
  message: string;
  details?: any;
}

interface CardCreateParams {
  name: string;
  description?: string;
  projectId: string;
  boardId: string;
  listId?: string; // Если не указан, будет использован первый список на доске
}

interface CardCreateResult {
  success: boolean;
  message: string;
  cardId?: string;
  cardUrl?: string;
  card?: any;
}

interface CardDetails {
  success: boolean;
  card?: any;
  error?: string;
}

class PlankaService {
  private config: PlankaConfig | null = null;
  private syncTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  
  // Методы REST API для Planka
  private apiClient = {
    get: async (endpoint: string, config?: any) => {
      if (!this.config) throw new Error('Planka не инициализирована');
      
      try {
        const response = await axios.get(`${this.config.url}/api/v1${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          },
          ...config
        });
        return response.data;
      } catch (error) {
        console.error(`Planka API error (GET ${endpoint}):`, error.response?.data || error.message);
        throw error;
      }
    },
    
    post: async (endpoint: string, data: any, config?: any) => {
      if (!this.config) throw new Error('Planka не инициализирована');
      
      try {
        const response = await axios.post(`${this.config.url}/api/v1${endpoint}`, data, {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          },
          ...config
        });
        return response.data;
      } catch (error) {
        console.error(`Planka API error (POST ${endpoint}):`, error.response?.data || error.message);
        throw error;
      }
    },
    
    patch: async (endpoint: string, data: any, config?: any) => {
      if (!this.config) throw new Error('Planka не инициализирована');
      
      try {
        const response = await axios.patch(`${this.config.url}/api/v1${endpoint}`, data, {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          },
          ...config
        });
        return response.data;
      } catch (error) {
        console.error(`Planka API error (PATCH ${endpoint}):`, error.response?.data || error.message);
        throw error;
      }
    },
    
    delete: async (endpoint: string, config?: any) => {
      if (!this.config) throw new Error('Planka не инициализирована');
      
      try {
        const response = await axios.delete(`${this.config.url}/api/v1${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          },
          ...config
        });
        return response.data;
      } catch (error) {
        console.error(`Planka API error (DELETE ${endpoint}):`, error.response?.data || error.message);
        throw error;
      }
    }
  };
  
  /**
   * Инициализация сервиса Planka
   */
  public async initialize(config: PlankaConfig): Promise<boolean> {
    this.config = config;
    
    // Проверяем подключение
    try {
      const testResult = await this.testConnection(config.url, config.token);
      if (!testResult.success) {
        console.error('Не удалось подключиться к Planka:', testResult.message);
        return false;
      }
      
      // Устанавливаем таймер синхронизации, если включена автосинхронизация
      if (config.autoSync && config.syncInterval) {
        this.startSyncTimer(config.syncInterval);
      }
      
      this.isInitialized = true;
      console.log('Planka интеграция инициализирована успешно');
      
      return true;
    } catch (error) {
      console.error('Ошибка при инициализации Planka:', error);
      return false;
    }
  }
  
  /**
   * Остановка сервиса
   */
  public stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    this.isInitialized = false;
    console.log('Planka интеграция остановлена');
  }
  
  /**
   * Запуск таймера синхронизации
   */
  private startSyncTimer(intervalMinutes: number): void {
    // Останавливаем предыдущий таймер, если был
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    // Устанавливаем новый таймер
    const intervalMs = intervalMinutes * 60 * 1000;
    this.syncTimer = setInterval(async () => {
      try {
        console.log('Запуск автоматической синхронизации с Planka...');
        await this.synchronize();
      } catch (error) {
        console.error('Ошибка при автоматической синхронизации с Planka:', error);
      }
    }, intervalMs);
    
    console.log(`Автоматическая синхронизация с Planka настроена на интервал ${intervalMinutes} минут`);
  }
  
  /**
   * Тестирование подключения к Planka
   */
  public async testConnection(url: string, token: string): Promise<ConnectionResult> {
    try {
      // Попробуем получить информацию о пользователе
      const response = await axios.get(`${url}/api/v1/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200 && response.data) {
        return {
          success: true,
          message: 'Успешное подключение к Planka',
          details: {
            user: response.data,
            serverVersion: response.headers['x-server-version'] || 'неизвестно'
          }
        };
      } else {
        return {
          success: false,
          message: 'Не удалось проверить подключение к Planka',
          details: response.data
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Ошибка подключения к Planka: ${error.message}`,
        details: {
          status: error.response?.status,
          data: error.response?.data
        }
      };
    }
  }
  
  /**
   * Синхронизация данных с Planka
   */
  public async synchronize(): Promise<SyncResult> {
    if (!this.isInitialized || !this.config) {
      throw new Error('Planka не инициализирована');
    }
    
    console.log('Синхронизация с Planka...');
    
    try {
      const result: SyncResult = {
        success: true,
        updated: 0,
        errors: [],
        details: {}
      };
      
      // Получаем все связи с Planka
      const links = await storage.getPlankaLinks();
      console.log(`Найдено ${links.length} связей для синхронизации`);
      
      // Обновляем каждую связь
      for (const link of links) {
        try {
          // Получаем информацию о карточке
          const cardDetails = await this.getCardDetails(link.plankaCardId);
          
          if (cardDetails.success && cardDetails.card) {
            // Обновляем дату последней синхронизации
            await storage.updatePlankaLink(link.id, {
              ...link,
              lastSyncedAt: new Date()
            });
            
            // Определяем тип сущности для обновления
            switch (link.entityType) {
              case 'task':
                // Обновляем задачу на основе карточки Planka, если нужно
                await this.updateTaskFromCard(link.entityId, cardDetails.card);
                break;
              
              case 'citizen_request':
                // Обновляем заявку гражданина на основе карточки Planka, если нужно
                await this.updateCitizenRequestFromCard(link.entityId, cardDetails.card);
                break;
              
              // Другие типы сущностей...
            }
            
            result.updated++;
          } else {
            result.errors.push(`Не удалось получить информацию о карточке #${link.plankaCardId}`);
          }
        } catch (error) {
          result.errors.push(`Ошибка при синхронизации связи #${link.id}: ${error.message}`);
        }
      }
      
      // Обновляем системный статус
      await storage.updateSystemStatus('PlankaIntegration', {
        serviceName: 'PlankaIntegration',
        status: result.errors.length === 0 ? 100 : 50,
        details: `Синхронизировано ${result.updated} из ${links.length} связей`
      });
      
      return result;
    } catch (error) {
      console.error('Ошибка при синхронизации с Planka:', error);
      
      // Обновляем системный статус с ошибкой
      await storage.updateSystemStatus('PlankaIntegration', {
        serviceName: 'PlankaIntegration',
        status: 0,
        details: `Ошибка синхронизации: ${error.message}`
      });
      
      throw error;
    }
  }
  
  /**
   * Обновление задачи на основе карточки Planka
   */
  private async updateTaskFromCard(taskId: number, card: any): Promise<void> {
    // Получаем задачу
    const task = await storage.getTask(taskId);
    
    if (!task) {
      console.warn(`Задача #${taskId} не найдена при синхронизации с Planka`);
      return;
    }
    
    // Определяем статус на основе списка карточки
    let status = task.status;
    if (card.list) {
      switch (card.list.name.toLowerCase()) {
        case 'в работе':
        case 'in progress':
          status = 'in_progress';
          break;
        case 'сделано':
        case 'done':
          status = 'completed';
          break;
        case 'отложено':
        case 'backlog':
          status = 'pending';
          break;
      }
    }
    
    // Обновляем задачу только если есть изменения
    if (task.status !== status || 
        task.title !== card.name || 
        task.description !== card.description) {
      
      await storage.updateTask(taskId, {
        status,
        title: card.name,
        description: card.description
      });
      
      console.log(`Задача #${taskId} обновлена на основе карточки Planka`);
    }
  }
  
  /**
   * Обновление заявки гражданина на основе карточки Planka
   */
  private async updateCitizenRequestFromCard(requestId: number, card: any): Promise<void> {
    // Получаем заявку
    const request = await storage.getCitizenRequest(requestId);
    
    if (!request) {
      console.warn(`Заявка #${requestId} не найдена при синхронизации с Planka`);
      return;
    }
    
    // Определяем статус на основе списка карточки
    let status = request.status;
    if (card.list) {
      switch (card.list.name.toLowerCase()) {
        case 'в работе':
        case 'in progress':
          status = 'processing';
          break;
        case 'сделано':
        case 'done':
          status = 'completed';
          break;
        case 'отложено':
        case 'backlog':
          status = 'pending';
          break;
      }
    }
    
    // Обновляем заявку только если есть изменения
    if (request.status !== status || 
        request.subject !== card.name || 
        request.description !== card.description) {
      
      await storage.updateCitizenRequest(requestId, {
        status,
        subject: card.name,
        description: card.description
      });
      
      console.log(`Заявка #${requestId} обновлена на основе карточки Planka`);
    }
  }
  
  /**
   * Получение списка проектов из Planka
   */
  public async getProjects(): Promise<any[]> {
    return await this.apiClient.get('/projects');
  }
  
  /**
   * Получение списка досок для проекта
   */
  public async getBoardsByProject(projectId: string): Promise<any[]> {
    return await this.apiClient.get(`/projects/${projectId}/boards`);
  }
  
  /**
   * Получение списков для доски
   */
  public async getListsByBoard(boardId: string): Promise<any[]> {
    return await this.apiClient.get(`/boards/${boardId}/lists`);
  }
  
  /**
   * Получение карточек для доски
   */
  public async getCardsByBoard(boardId: string): Promise<any[]> {
    return await this.apiClient.get(`/boards/${boardId}/cards`);
  }
  
  /**
   * Получение информации о карточке
   */
  public async getCardDetails(cardId: string): Promise<CardDetails> {
    try {
      const card = await this.apiClient.get(`/cards/${cardId}`);
      
      return {
        success: true,
        card
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Создание карточки в Planka
   */
  public async createCard(params: CardCreateParams): Promise<CardCreateResult> {
    try {
      // Если не указан listId, получаем первый список из доски
      let listId = params.listId;
      if (!listId) {
        const lists = await this.getListsByBoard(params.boardId);
        if (lists && lists.length > 0) {
          listId = lists[0].id;
        } else {
          return {
            success: false,
            message: 'Не найдены списки на доске'
          };
        }
      }
      
      // Создаем карточку
      const card = await this.apiClient.post('/cards', {
        name: params.name,
        description: params.description || '',
        projectId: params.projectId,
        boardId: params.boardId,
        listId
      });
      
      return {
        success: true,
        message: 'Карточка успешно создана',
        cardId: card.id,
        cardUrl: `${this.config?.url}/projects/${params.projectId}/boards/${params.boardId}?cardId=${card.id}`,
        card
      };
    } catch (error) {
      return {
        success: false,
        message: `Ошибка при создании карточки: ${error.message}`
      };
    }
  }
  
  /**
   * Обновление карточки в Planka
   */
  public async updateCard(cardId: string, data: any): Promise<any> {
    return await this.apiClient.patch(`/cards/${cardId}`, data);
  }
  
  /**
   * Удаление карточки в Planka
   */
  public async deleteCard(cardId: string): Promise<{ success: boolean, message?: string }> {
    try {
      await this.apiClient.delete(`/cards/${cardId}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

export const plankaService = new PlankaService();