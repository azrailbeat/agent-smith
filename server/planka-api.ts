/**
 * API для интеграции с Planka (система управления проектами Kanban)
 */

import { Router } from 'express';
import { plankaIntegration } from './services/planka-integration';
import { logActivity } from './activity-logger';
import { storage } from './storage';
import { z } from 'zod';

// Схема валидации для конфигурации Planka
const plankaConfigSchema = z.object({
  baseUrl: z.string().url(),
  username: z.string().min(1),
  password: z.string().min(1),
  projectId: z.string().optional()
});

// Схема валидации для создания карточки
const createCardSchema = z.object({
  entityType: z.enum(['citizen_request', 'task', 'document']),
  entityId: z.number().int().positive(),
  projectId: z.string(),
  boardId: z.string(),
  listId: z.string()
});

// Схема валидации для синхронизации карточки с задачей
const syncCardSchema = z.object({
  taskId: z.number().int().positive(),
  cardId: z.string()
});

// Функция для регистрации API маршрутов
export function registerPlankaRoutes(router: Router): void {
  // Инициализация интеграции с Planka
  router.post('/api/planka/initialize', async (req, res) => {
    try {
      const config = plankaConfigSchema.parse(req.body);
      
      const initialized = await plankaIntegration.initialize(config);
      
      if (!initialized) {
        return res.status(400).json({ error: 'Failed to initialize Planka integration' });
      }
      
      // Сохраняем конфигурацию в системных настройках
      await storage.updateSystemSetting('planka_config', JSON.stringify(config));
      
      // Логируем активность
      await logActivity({
        action: 'integration_initialized',
        userId: req.session?.userId || 1,
        details: 'Инициализирована интеграция с Planka',
        metadata: { baseUrl: config.baseUrl }
      });
      
      res.json({ 
        success: true, 
        message: 'Интеграция с Planka успешно инициализирована'
      });
    } catch (error) {
      console.error('Ошибка при инициализации интеграции с Planka:', error);
      res.status(500).json({ 
        error: 'Planka initialization error',
        message: error.message || 'Ошибка при инициализации интеграции с Planka'
      });
    }
  });

  // Проверка статуса интеграции
  router.get('/api/planka/status', async (req, res) => {
    try {
      const initialized = plankaIntegration.isInitialized();
      
      if (!initialized) {
        return res.json({ 
          initialized: false,
          connected: false,
          message: 'Интеграция с Planka не инициализирована'
        });
      }
      
      const connected = await plankaIntegration.testConnection();
      
      res.json({ 
        initialized,
        connected, 
        config: plankaIntegration.getConfig(),
        message: connected 
          ? 'Интеграция с Planka активна и подключена' 
          : 'Интеграция с Planka инициализирована, но соединение не установлено'
      });
    } catch (error) {
      console.error('Ошибка при проверке статуса интеграции с Planka:', error);
      res.status(500).json({ 
        error: 'Planka status check error',
        message: error.message || 'Ошибка при проверке статуса интеграции с Planka'
      });
    }
  });

  // Получение проектов из Planka
  router.get('/api/planka/projects', async (req, res) => {
    try {
      if (!plankaIntegration.isInitialized()) {
        return res.status(400).json({ error: 'Planka integration not initialized' });
      }
      
      const projects = await plankaIntegration.getProjects();
      
      res.json(projects);
    } catch (error) {
      console.error('Ошибка при получении проектов из Planka:', error);
      res.status(500).json({ 
        error: 'Planka projects fetch error',
        message: error.message || 'Ошибка при получении проектов из Planka'
      });
    }
  });

  // Получение досок для проекта
  router.get('/api/planka/projects/:projectId/boards', async (req, res) => {
    try {
      if (!plankaIntegration.isInitialized()) {
        return res.status(400).json({ error: 'Planka integration not initialized' });
      }
      
      const { projectId } = req.params;
      const boards = await plankaIntegration.getBoards(projectId);
      
      res.json(boards);
    } catch (error) {
      console.error('Ошибка при получении досок из Planka:', error);
      res.status(500).json({ 
        error: 'Planka boards fetch error',
        message: error.message || 'Ошибка при получении досок из Planka'
      });
    }
  });

  // Получение списков для доски
  router.get('/api/planka/boards/:boardId/lists', async (req, res) => {
    try {
      if (!plankaIntegration.isInitialized()) {
        return res.status(400).json({ error: 'Planka integration not initialized' });
      }
      
      const { boardId } = req.params;
      const lists = await plankaIntegration.getLists(boardId);
      
      res.json(lists);
    } catch (error) {
      console.error('Ошибка при получении списков из Planka:', error);
      res.status(500).json({ 
        error: 'Planka lists fetch error',
        message: error.message || 'Ошибка при получении списков из Planka'
      });
    }
  });

  // Получение карточек для списка
  router.get('/api/planka/lists/:listId/cards', async (req, res) => {
    try {
      if (!plankaIntegration.isInitialized()) {
        return res.status(400).json({ error: 'Planka integration not initialized' });
      }
      
      const { listId } = req.params;
      const cards = await plankaIntegration.getCards(listId);
      
      res.json(cards);
    } catch (error) {
      console.error('Ошибка при получении карточек из Planka:', error);
      res.status(500).json({ 
        error: 'Planka cards fetch error',
        message: error.message || 'Ошибка при получении карточек из Planka'
      });
    }
  });

  // Создание карточки для сущности (обращение, задача и т.д.)
  router.post('/api/planka/cards', async (req, res) => {
    try {
      if (!plankaIntegration.isInitialized()) {
        return res.status(400).json({ error: 'Planka integration not initialized' });
      }
      
      const {
        entityType,
        entityId,
        projectId,
        boardId,
        listId
      } = createCardSchema.parse(req.body);
      
      let card = null;
      let entity = null;
      
      // В зависимости от типа сущности получаем данные и создаем карточку
      switch (entityType) {
        case 'citizen_request':
          entity = await storage.getCitizenRequest(entityId);
          if (!entity) {
            return res.status(404).json({ error: 'Citizen request not found' });
          }
          card = await plankaIntegration.createCitizenRequestCard(
            entity,
            projectId,
            boardId,
            listId,
            req.session?.userId || 1
          );
          break;
          
        case 'task':
          entity = await storage.getTask(entityId);
          if (!entity) {
            return res.status(404).json({ error: 'Task not found' });
          }
          card = await plankaIntegration.createTaskCard(
            entity,
            projectId,
            boardId,
            listId,
            req.session?.userId || 1
          );
          break;
          
        default:
          return res.status(400).json({ error: 'Unsupported entity type' });
      }
      
      if (!card) {
        return res.status(500).json({ error: 'Failed to create card' });
      }
      
      // Сохраняем связь карточки с сущностью
      await storage.createPlankaLink({
        entityType,
        entityId,
        cardId: card.id,
        boardId,
        listId,
        projectId,
        createdBy: req.session?.userId || 1,
        createdAt: new Date()
      });
      
      res.json({ 
        success: true, 
        card,
        message: `Карточка успешно создана для ${entityType} ID: ${entityId}`
      });
    } catch (error) {
      console.error('Ошибка при создании карточки в Planka:', error);
      res.status(500).json({ 
        error: 'Planka card creation error',
        message: error.message || 'Ошибка при создании карточки в Planka'
      });
    }
  });

  // Синхронизация статуса задачи с карточкой в Planka
  router.post('/api/planka/sync-task', async (req, res) => {
    try {
      if (!plankaIntegration.isInitialized()) {
        return res.status(400).json({ error: 'Planka integration not initialized' });
      }
      
      const { taskId, cardId } = syncCardSchema.parse(req.body);
      
      // Получаем задачу
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      // Синхронизируем статус
      const synced = await plankaIntegration.syncTaskWithCard(
        taskId,
        cardId,
        task.status,
        req.session?.userId || 1
      );
      
      if (!synced) {
        return res.json({ 
          success: false, 
          message: 'Синхронизация не требуется или не выполнена'
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Статус задачи успешно синхронизирован с карточкой в Planka'
      });
    } catch (error) {
      console.error('Ошибка при синхронизации задачи с карточкой в Planka:', error);
      res.status(500).json({ 
        error: 'Planka sync error',
        message: error.message || 'Ошибка при синхронизации задачи с карточкой в Planka'
      });
    }
  });

  // Получение связей между сущностями и карточками Planka
  router.get('/api/planka/links', async (req, res) => {
    try {
      const links = await storage.getPlankaLinks();
      res.json(links);
    } catch (error) {
      console.error('Ошибка при получении связей с Planka:', error);
      res.status(500).json({ 
        error: 'Planka links fetch error',
        message: error.message || 'Ошибка при получении связей с Planka'
      });
    }
  });

  // Получение связей для конкретной сущности
  router.get('/api/planka/links/:entityType/:entityId', async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const id = parseInt(entityId);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid entity ID' });
      }
      
      const links = await storage.getPlankaLinkByEntity(entityType, id);
      
      if (!links || links.length === 0) {
        return res.status(404).json({ error: 'No Planka links found for this entity' });
      }
      
      res.json(links);
    } catch (error) {
      console.error('Ошибка при получении связей с Planka для сущности:', error);
      res.status(500).json({ 
        error: 'Planka entity links fetch error',
        message: error.message || 'Ошибка при получении связей с Planka для сущности'
      });
    }
  });

  // Удаление связи
  router.delete('/api/planka/links/:linkId', async (req, res) => {
    try {
      const { linkId } = req.params;
      const id = parseInt(linkId);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid link ID' });
      }
      
      const deleted = await storage.deletePlankaLink(id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Link not found or could not be deleted' });
      }
      
      // Логируем активность
      await logActivity({
        action: 'planka_link_deleted',
        userId: req.session?.userId || 1,
        details: `Удалена связь с Planka ID: ${id}`
      });
      
      res.json({ 
        success: true, 
        message: 'Связь с Planka успешно удалена'
      });
    } catch (error) {
      console.error('Ошибка при удалении связи с Planka:', error);
      res.status(500).json({ 
        error: 'Planka link deletion error',
        message: error.message || 'Ошибка при удалении связи с Planka'
      });
    }
  });
}