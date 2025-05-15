/**
 * API маршруты для интеграции с eOtinish
 */

import express, { Request, Response } from 'express';
import { logActivity, ActivityType } from '../activity-logger';
import { 
  synchronizeRequestsFromEOtinish, 
  processRawRequestsToTaskCards 
} from '../integrations/eotinish-service';
import { storage } from '../storage';

/**
 * Регистрирует маршруты API для интеграции с eOtinish
 */
export function registerEOtinishRoutes(app: express.Express): void {
  /**
   * Запускает синхронизацию обращений из eOtinish
   */
  app.post('/api/eotinish/sync', async (req: Request, res: Response) => {
    try {
      const options = req.body || {};
      const lastSyncDate = options.lastSyncDate ? new Date(options.lastSyncDate) : undefined;
      
      const result = await synchronizeRequestsFromEOtinish({
        lastSyncDate,
      });
      
      if (result.success) {
        await logActivity({
          action: ActivityType.SYSTEM_EVENT,
          entityType: 'eotinish_sync',
          details: `Синхронизация с eOtinish успешно завершена. Получено: ${result.total}, создано: ${result.created}, обновлено: ${result.updated}`,
        });
      } else {
        await logActivity({
          action: ActivityType.SYSTEM_ERROR,
          entityType: 'eotinish_sync',
          details: `Ошибка при синхронизации с eOtinish: ${JSON.stringify(result.errorDetails)}`,
        });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Ошибка при синхронизации с eOtinish:', error);
      
      await logActivity({
        action: ActivityType.SYSTEM_ERROR,
        entityType: 'eotinish_sync',
        details: `Необработанная ошибка при синхронизации с eOtinish: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Необработанная ошибка при синхронизации'
      });
    }
  });
  
  /**
   * Запускает обработку необработанных запросов из raw_requests в task_cards
   */
  app.post('/api/eotinish/process', async (req: Request, res: Response) => {
    try {
      const result = await processRawRequestsToTaskCards();
      
      if (result.success) {
        await logActivity({
          action: ActivityType.SYSTEM_EVENT,
          entityType: 'raw_requests_processing',
          details: `Обработка raw_requests успешно завершена. Всего: ${result.total}, обработано: ${result.processed}, с ошибками: ${result.errors}`,
        });
      } else {
        await logActivity({
          action: ActivityType.SYSTEM_ERROR,
          entityType: 'raw_requests_processing',
          details: `Ошибка при обработке raw_requests: ${JSON.stringify(result.errorDetails)}`,
        });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Ошибка при обработке raw_requests:', error);
      
      await logActivity({
        action: ActivityType.SYSTEM_ERROR,
        entityType: 'raw_requests_processing',
        details: `Необработанная ошибка при обработке raw_requests: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      });
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Необработанная ошибка при обработке'
      });
    }
  });
  
  /**
   * Получение списка необработанных raw_requests
   */
  app.get('/api/eotinish/raw-requests/unprocessed', async (req: Request, res: Response) => {
    try {
      const rawRequests = await storage.getUnprocessedRawRequests();
      res.json({
        success: true,
        total: rawRequests.length,
        data: rawRequests,
      });
    } catch (error) {
      console.error('Ошибка при получении необработанных raw_requests:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Необработанная ошибка при получении данных'
      });
    }
  });
  
  /**
   * Получение списка всех raw_requests
   */
  app.get('/api/eotinish/raw-requests', async (req: Request, res: Response) => {
    try {
      const options = {
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        processed: req.query.processed === 'true' ? true : 
                  (req.query.processed === 'false' ? false : undefined),
      };
      
      const rawRequests = await storage.getRawRequests(options);
      res.json({
        success: true,
        total: rawRequests.length,
        data: rawRequests,
      });
    } catch (error) {
      console.error('Ошибка при получении raw_requests:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Необработанная ошибка при получении данных'
      });
    }
  });
  
  /**
   * Получение списка task_cards
   */
  app.get('/api/eotinish/task-cards', async (req: Request, res: Response) => {
    try {
      const options = {
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        status: req.query.status as string,
        assignedTo: req.query.assignedTo ? parseInt(req.query.assignedTo as string) : undefined,
        departmentId: req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined,
      };
      
      const taskCards = await storage.getTaskCards(options);
      const total = await storage.countTaskCards(options);
      
      res.json({
        success: true,
        total,
        data: taskCards,
      });
    } catch (error) {
      console.error('Ошибка при получении task_cards:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Необработанная ошибка при получении данных'
      });
    }
  });
  
  /**
   * Получение task_card по ID
   */
  app.get('/api/eotinish/task-cards/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'Некорректный ID карточки',
        });
      }
      
      const taskCard = await storage.getTaskCard(id);
      if (!taskCard) {
        return res.status(404).json({
          success: false,
          error: 'Карточка не найдена',
        });
      }
      
      // Получаем историю изменений карточки
      const history = await storage.getTaskCardHistory(id);
      
      res.json({
        success: true,
        data: {
          ...taskCard,
          history,
        },
      });
    } catch (error) {
      console.error(`Ошибка при получении task_card ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Необработанная ошибка при получении данных'
      });
    }
  });
  
  /**
   * Обновление статуса task_card
   */
  app.put('/api/eotinish/task-cards/:id/status', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'Некорректный ID карточки',
        });
      }
      
      const { newStatus, comment } = req.body;
      if (!newStatus) {
        return res.status(400).json({
          success: false,
          error: 'Статус обязателен',
        });
      }
      
      // Получаем текущую карточку
      const taskCard = await storage.getTaskCard(id);
      if (!taskCard) {
        return res.status(404).json({
          success: false,
          error: 'Карточка не найдена',
        });
      }
      
      const previousStatus = taskCard.status;
      
      // Подготавливаем обновленные данные
      const updateData: Partial<TaskCard> = {
        status: newStatus,
        updatedAt: new Date(),
      };
      
      // Обрабатываем специальные статусы
      if (newStatus === 'in_progress' && !taskCard.startedAt) {
        updateData.startedAt = new Date();
      } else if (newStatus === 'done' && !taskCard.completedAt) {
        updateData.completedAt = new Date();
      } else if (newStatus === 'awaiting_confirmation' && !taskCard.completedAt) {
        updateData.completedAt = new Date();
      }
      
      // Обновляем карточку
      const updatedTaskCard = await storage.updateTaskCard(id, updateData);
      
      // Создаем запись в истории изменений
      const historyEntry = await storage.createTaskCardHistory({
        cardId: id,
        previousStatus,
        newStatus,
        userId: req.body.userId,
        comment,
      });
      
      // Логируем активность
      await logActivity({
        action: ActivityType.ENTITY_UPDATE,
        entityType: 'task_card',
        entityId: id,
        userId: req.body.userId,
        details: `Изменен статус карточки: ${previousStatus} -> ${newStatus}`,
      });
      
      res.json({
        success: true,
        data: updatedTaskCard,
        history: historyEntry,
      });
    } catch (error) {
      console.error(`Ошибка при обновлении статуса task_card ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Необработанная ошибка при обновлении данных'
      });
    }
  });
  
  /**
   * Обновление данных task_card
   */
  app.put('/api/eotinish/task-cards/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'Некорректный ID карточки',
        });
      }
      
      const updateData = req.body;
      
      // Получаем текущую карточку
      const taskCard = await storage.getTaskCard(id);
      if (!taskCard) {
        return res.status(404).json({
          success: false,
          error: 'Карточка не найдена',
        });
      }
      
      // Если меняется статус, создаем запись в истории
      if (updateData.status && updateData.status !== taskCard.status) {
        await storage.createTaskCardHistory({
          cardId: id,
          previousStatus: taskCard.status,
          newStatus: updateData.status,
          userId: req.body.userId,
          comment: req.body.comment,
        });
        
        // Обрабатываем специальные статусы
        if (updateData.status === 'in_progress' && !taskCard.startedAt) {
          updateData.startedAt = new Date();
        } else if (updateData.status === 'done' && !taskCard.completedAt) {
          updateData.completedAt = new Date();
        } else if (updateData.status === 'awaiting_confirmation' && !taskCard.completedAt) {
          updateData.completedAt = new Date();
        }
      }
      
      // Обновляем карточку
      const updatedTaskCard = await storage.updateTaskCard(id, {
        ...updateData,
        updatedAt: new Date(),
      });
      
      // Логируем активность
      await logActivity({
        action: ActivityType.ENTITY_UPDATE,
        entityType: 'task_card',
        entityId: id,
        userId: req.body.userId,
        details: `Обновлена карточка задачи`,
      });
      
      res.json({
        success: true,
        data: updatedTaskCard,
      });
    } catch (error) {
      console.error(`Ошибка при обновлении task_card ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Необработанная ошибка при обновлении данных'
      });
    }
  });
  
  /**
   * Назначение task_card пользователю
   */
  app.put('/api/eotinish/task-cards/:id/assign', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'Некорректный ID карточки',
        });
      }
      
      const { assignedTo, userId } = req.body;
      if (assignedTo === undefined) {
        return res.status(400).json({
          success: false,
          error: 'ID пользователя для назначения обязателен',
        });
      }
      
      // Получаем текущую карточку
      const taskCard = await storage.getTaskCard(id);
      if (!taskCard) {
        return res.status(404).json({
          success: false,
          error: 'Карточка не найдена',
        });
      }
      
      // Получаем данные о пользователе
      let assigneeName = "Не назначено";
      if (assignedTo) {
        const user = await storage.getUser(assignedTo);
        if (user) {
          assigneeName = user.fullName;
        }
      }
      
      // Обновляем карточку
      const updatedTaskCard = await storage.updateTaskCard(id, {
        assignedTo,
        updatedAt: new Date(),
      });
      
      // Если карточка не в работе и назначен пользователь, меняем статус
      if (assignedTo && taskCard.status === 'new') {
        await storage.updateTaskCard(id, {
          status: 'in_progress',
          startedAt: new Date(),
        });
        
        // Создаем запись в истории изменений
        await storage.createTaskCardHistory({
          cardId: id,
          previousStatus: 'new',
          newStatus: 'in_progress',
          userId,
          comment: `Карточка назначена пользователю ${assigneeName} и переведена в работу`,
        });
      }
      
      // Логируем активность
      await logActivity({
        action: ActivityType.ENTITY_UPDATE,
        entityType: 'task_card',
        entityId: id,
        userId,
        details: assignedTo 
          ? `Карточка назначена пользователю ${assigneeName}` 
          : `Снято назначение карточки с пользователя`,
      });
      
      res.json({
        success: true,
        data: updatedTaskCard,
      });
    } catch (error) {
      console.error(`Ошибка при назначении task_card ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Необработанная ошибка при назначении'
      });
    }
  });
  
  /**
   * Получение статистики по task_cards
   */
  app.get('/api/eotinish/task-cards/stats', async (req: Request, res: Response) => {
    try {
      const totalNew = await storage.countTaskCards({ status: 'new' });
      const totalInProgress = await storage.countTaskCards({ status: 'in_progress' });
      const totalAwaitingConfirmation = await storage.countTaskCards({ status: 'awaiting_confirmation' });
      const totalDone = await storage.countTaskCards({ status: 'done' });
      const total = await storage.countTaskCards();
      
      res.json({
        success: true,
        data: {
          total,
          new: totalNew,
          in_progress: totalInProgress,
          awaiting_confirmation: totalAwaitingConfirmation,
          done: totalDone,
        },
      });
    } catch (error) {
      console.error('Ошибка при получении статистики task_cards:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Необработанная ошибка при получении статистики'
      });
    }
  });
}