/**
 * API для управления подключениями к базам данных и импортом/экспортом данных
 */

import { Router } from 'express';
import { dbConnector, DatabaseProvider } from './services/database-connector';
import { templateManager, TemplateType } from './services/template-manager';
import { logActivity } from './activity-logger';
import { z } from 'zod';

// Схема валидации для переключения провайдера
const switchProviderSchema = z.object({
  provider: z.enum([DatabaseProvider.LOCAL_POSTGRES, DatabaseProvider.SUPABASE])
});

// Схема валидации для метаданных шаблона
const templateMetadataSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500),
  version: z.string().max(20),
  author: z.string().max(100)
});

// Функция для регистрации API маршрутов
export function registerDatabaseRoutes(router: Router): void {
  // Получение текущего провайдера базы данных
  router.get('/api/database/provider', async (req, res) => {
    try {
      const provider = dbConnector.getCurrentProvider();
      res.json({ provider });
    } catch (error) {
      console.error('Ошибка при получении провайдера базы данных:', error);
      res.status(500).json({ 
        error: 'Database provider error',
        message: error.message || 'Ошибка при получении провайдера базы данных'
      });
    }
  });

  // Переключение провайдера базы данных
  router.post('/api/database/switch-provider', async (req, res) => {
    try {
      const { provider } = switchProviderSchema.parse(req.body);
      
      await dbConnector.switchProvider(provider);
      
      // Логируем активность
      await logActivity({
        action: 'database_provider_switched',
        userId: req.session?.userId || 1,
        details: `Провайдер базы данных переключен на ${provider}`,
        metadata: { provider }
      });
      
      res.json({ 
        success: true, 
        provider, 
        message: `Провайдер базы данных успешно переключен на ${provider}` 
      });
    } catch (error) {
      console.error('Ошибка при переключении провайдера базы данных:', error);
      res.status(500).json({ 
        error: 'Database provider switch error',
        message: error.message || 'Ошибка при переключении провайдера базы данных'
      });
    }
  });

  // Экспорт данных из базы
  router.post('/api/database/export', async (req, res) => {
    try {
      const { tables } = req.body as { tables?: string[] };
      
      const exportData = await dbConnector.exportData(tables);
      
      // Логируем активность
      await logActivity({
        action: 'database_export',
        userId: req.session?.userId || 1,
        details: 'Экспорт данных из базы',
        metadata: { tables }
      });
      
      res.json({ 
        success: true, 
        data: exportData,
        tables: tables || 'all',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Ошибка при экспорте данных из базы:', error);
      res.status(500).json({ 
        error: 'Database export error',
        message: error.message || 'Ошибка при экспорте данных из базы'
      });
    }
  });

  // Импорт данных в базу
  router.post('/api/database/import', async (req, res) => {
    try {
      const { data } = req.body as { data: Record<string, any[]> };
      
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Invalid data format' });
      }
      
      await dbConnector.importData(data);
      
      // Логируем активность
      await logActivity({
        action: 'database_import',
        userId: req.session?.userId || 1,
        details: 'Импорт данных в базу',
        metadata: { tables: Object.keys(data) }
      });
      
      res.json({ 
        success: true, 
        message: 'Данные успешно импортированы',
        tables: Object.keys(data),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Ошибка при импорте данных в базу:', error);
      res.status(500).json({ 
        error: 'Database import error',
        message: error.message || 'Ошибка при импорте данных в базу'
      });
    }
  });

  // Получение списка шаблонов
  router.get('/api/templates', async (req, res) => {
    try {
      const templates = await templateManager.getTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Ошибка при получении списка шаблонов:', error);
      res.status(500).json({ 
        error: 'Templates fetch error',
        message: error.message || 'Ошибка при получении списка шаблонов'
      });
    }
  });

  // Получение конкретного шаблона
  router.get('/api/templates/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      const template = await templateManager.getTemplate(filename);
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      res.json(template);
    } catch (error) {
      console.error('Ошибка при получении шаблона:', error);
      res.status(500).json({ 
        error: 'Template fetch error',
        message: error.message || 'Ошибка при получении шаблона'
      });
    }
  });

  // Создание шаблона
  router.post('/api/templates', async (req, res) => {
    try {
      const {
        templateType,
        name,
        description,
        version,
        author,
      } = req.body;
      
      // Проверяем корректность типа шаблона
      if (!templateType || (
          !Object.values(TemplateType).includes(templateType) &&
          !Array.isArray(templateType)
        )) {
        return res.status(400).json({
          error: 'Invalid template type',
          validTypes: Object.values(TemplateType)
        });
      }
      
      // Проверяем метаданные
      const metadata = templateMetadataSchema.parse({
        name,
        description,
        version,
        author
      });
      
      // Создаем шаблон
      const filename = await templateManager.createTemplate(
        templateType,
        metadata,
        req.session?.userId || 1
      );
      
      res.json({ 
        success: true, 
        filename,
        message: 'Шаблон успешно создан'
      });
    } catch (error) {
      console.error('Ошибка при создании шаблона:', error);
      res.status(500).json({ 
        error: 'Template creation error',
        message: error.message || 'Ошибка при создании шаблона'
      });
    }
  });

  // Импорт шаблона
  router.post('/api/templates/:filename/import', async (req, res) => {
    try {
      const { filename } = req.params;
      
      const imported = await templateManager.importTemplate(
        filename,
        req.session?.userId || 1
      );
      
      if (!imported) {
        return res.status(400).json({ error: 'Failed to import template' });
      }
      
      res.json({ 
        success: true, 
        message: 'Шаблон успешно импортирован'
      });
    } catch (error) {
      console.error('Ошибка при импорте шаблона:', error);
      res.status(500).json({ 
        error: 'Template import error',
        message: error.message || 'Ошибка при импорте шаблона'
      });
    }
  });

  // Удаление шаблона
  router.delete('/api/templates/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      
      const deleted = await templateManager.deleteTemplate(
        filename,
        req.session?.userId || 1
      );
      
      if (!deleted) {
        return res.status(400).json({ error: 'Failed to delete template' });
      }
      
      res.json({ 
        success: true, 
        message: 'Шаблон успешно удален'
      });
    } catch (error) {
      console.error('Ошибка при удалении шаблона:', error);
      res.status(500).json({ 
        error: 'Template deletion error',
        message: error.message || 'Ошибка при удалении шаблона'
      });
    }
  });

  // Экспорт конкретного типа данных как шаблон
  router.post('/api/export/:type', async (req, res) => {
    try {
      const { type } = req.params;
      
      // Проверяем корректность типа
      if (!Object.values(TemplateType).includes(type as TemplateType)) {
        return res.status(400).json({
          error: 'Invalid export type',
          validTypes: Object.values(TemplateType)
        });
      }
      
      const {
        name,
        description,
        version,
        author,
      } = req.body;
      
      // Проверяем метаданные
      const metadata = templateMetadataSchema.parse({
        name,
        description,
        version,
        author
      });
      
      // Создаем шаблон указанного типа
      const filename = await templateManager.createTemplate(
        type as TemplateType,
        metadata,
        req.session?.userId || 1
      );
      
      res.json({ 
        success: true, 
        filename,
        message: `Данные типа ${type} успешно экспортированы как шаблон`
      });
    } catch (error) {
      console.error('Ошибка при экспорте данных как шаблона:', error);
      res.status(500).json({ 
        error: 'Export error',
        message: error.message || 'Ошибка при экспорте данных как шаблона'
      });
    }
  });
}