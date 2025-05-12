/**
 * API маршруты для работы с Active Directory
 */

import express from 'express';
import { adService, testADService } from '../integrations/active-directory';
import { logActivity } from '../activity-logger';

export function registerADRoutes(app: express.Express): void {
  /**
   * Проверка статуса сервиса Active Directory
   */
  app.get('/api/ad/status', async (req, res) => {
    try {
      const isReady = adService.isReady();
      const connectionResult = await adService.testConnection();
      
      res.json({
        status: connectionResult.success ? 'success' : 'warning',
        ready: isReady,
        connection: connectionResult.success ? 'ok' : 'error',
        message: connectionResult.message || connectionResult.error,
        mode: isReady ? 'real' : 'demo'
      });
    } catch (error) {
      console.error('Ошибка проверки статуса AD:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  });

  /**
   * Аутентификация пользователя в AD
   */
  app.post('/api/ad/authenticate', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Не указаны обязательные параметры (username, password)'
        });
      }
      
      const result = await adService.authenticate(username, password);
      
      if (result.success) {
        res.json({
          status: 'success',
          message: result.message
        });
      } else {
        res.status(401).json({
          status: 'error',
          message: result.error
        });
      }
    } catch (error) {
      console.error('Ошибка аутентификации в AD:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  });

  /**
   * Поиск пользователя в AD
   */
  app.get('/api/ad/user/:username', async (req, res) => {
    try {
      const { username } = req.params;
      
      if (!username) {
        return res.status(400).json({
          status: 'error',
          message: 'Не указано имя пользователя'
        });
      }
      
      const user = await adService.findUser(username);
      
      if (user) {
        res.json({
          status: 'success',
          user
        });
      } else {
        res.status(404).json({
          status: 'error',
          message: 'Пользователь не найден'
        });
      }
    } catch (error) {
      console.error('Ошибка поиска пользователя в AD:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  });

  /**
   * Поиск пользователей в AD по фильтру
   */
  app.post('/api/ad/users/search', async (req, res) => {
    try {
      const { filter, limit } = req.body;
      
      if (!filter) {
        return res.status(400).json({
          status: 'error',
          message: 'Не указан фильтр поиска'
        });
      }
      
      const users = await adService.findUsers(filter, limit || 100);
      
      res.json({
        status: 'success',
        users,
        total: users.length
      });
    } catch (error) {
      console.error('Ошибка поиска пользователей в AD:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  });

  /**
   * Получение групп пользователя в AD
   */
  app.get('/api/ad/user/:username/groups', async (req, res) => {
    try {
      const { username } = req.params;
      
      if (!username) {
        return res.status(400).json({
          status: 'error',
          message: 'Не указано имя пользователя'
        });
      }
      
      const groups = await adService.getUserGroups(username);
      
      res.json({
        status: 'success',
        username,
        groups
      });
    } catch (error) {
      console.error('Ошибка получения групп пользователя в AD:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  });

  /**
   * Проверка принадлежности пользователя к группе
   */
  app.post('/api/ad/check-group-membership', async (req, res) => {
    try {
      const { username, groupName } = req.body;
      
      if (!username || !groupName) {
        return res.status(400).json({
          status: 'error',
          message: 'Не указаны обязательные параметры (username, groupName)'
        });
      }
      
      const isMember = await adService.isUserInGroup(username, groupName);
      
      res.json({
        status: 'success',
        username,
        groupName,
        isMember
      });
    } catch (error) {
      console.error('Ошибка проверки принадлежности к группе:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  });

  /**
   * Тестирование подключения к AD
   */
  app.post('/api/ad/test-connection', async (req, res) => {
    try {
      const result = await testADService();
      
      if (result) {
        res.json({
          status: 'success',
          message: 'Подключение к Active Directory успешно'
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: 'Не удалось подключиться к Active Directory'
        });
      }
    } catch (error) {
      console.error('Ошибка тестирования подключения к AD:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  });
}