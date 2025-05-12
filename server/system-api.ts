/**
 * API для системных настроек
 * Обеспечивает доступ к настройкам через HTTP API
 */

import express, { Request, Response } from 'express';
import { 
  getButtonConfig, 
  updateButtonConfig,
  getRequestAgentSettings,
  updateRequestAgentSettings,
  getRAGConfig,
  updateRAGConfig,
  getIntegrationSettings,
  updateIntegrationSettings,
  ButtonConfigSettings,
  RequestAgentSettings,
  RAGConfig,
  IntegrationSettings
} from './services/system-settings';

export function registerSystemRoutes(app: express.Express): void {
  /**
   * Настройки интеграций
   */
  
  // Получение настроек интеграции по типу
  app.get('/api/system/integration-settings', (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      
      if (!type || typeof type !== 'string') {
        return res.status(400).json({ error: 'Integration type is required' });
      }
      
      const settings = getIntegrationSettings(type);
      
      if (!settings) {
        return res.status(404).json({ error: 'Integration settings not found for the specified type' });
      }
      
      res.json(settings);
    } catch (error) {
      console.error('Error getting integration settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Сохранение настроек интеграции
  app.post('/api/system/integration-settings', (req: Request, res: Response) => {
    try {
      const { type, enabled, settings } = req.body;
      
      if (!type || settings === undefined) {
        return res.status(400).json({ error: 'Invalid settings format' });
      }
      
      const integrationSettings: IntegrationSettings = {
        type,
        enabled: enabled || false,
        settings
      };
      
      updateIntegrationSettings(integrationSettings);
      
      res.json({ success: true, settings: integrationSettings });
    } catch (error) {
      console.error('Error saving integration settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Получение списка всех настроек интеграций
  app.get('/api/system/integration-settings/all', (_req: Request, res: Response) => {
    try {
      // Получаем все настройки интеграций из системных настроек
      const settings = SystemSettings.getSettings();
      res.json(settings.integrationSettings || []);
    } catch (error) {
      console.error('Error getting all integration settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Генерировать новый API ключ
  app.post('/api/system/generate-api-key', (_req: Request, res: Response) => {
    try {
      // Генерируем случайный API ключ
      const apiKey = generateApiKey();
      res.json({ apiKey });
    } catch (error) {
      console.error('Error generating API key:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Функция для генерации API ключа
  function generateApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const keyLength = 32;
    let key = '';
    
    for (let i = 0; i < keyLength; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return key;
  }
  
  /**
   * Настройки кнопок агентов
   */
  
  // Получение настроек кнопок для определенной страницы
  app.get('/api/system/button-config', (req: Request, res: Response) => {
    try {
      const { pageType } = req.query;
      
      if (!pageType || typeof pageType !== 'string') {
        return res.status(400).json({ error: 'Page type is required' });
      }
      
      const config = getButtonConfig(pageType);
      
      if (!config) {
        return res.status(404).json({ error: 'Button configuration not found for the specified page type' });
      }
      
      res.json(config);
    } catch (error) {
      console.error('Error getting button configuration:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Сохранение настроек кнопок
  app.post('/api/system/button-config', (req: Request, res: Response) => {
    try {
      const { pageType, buttons } = req.body;
      
      if (!pageType || !Array.isArray(buttons)) {
        return res.status(400).json({ error: 'Invalid configuration format' });
      }
      
      const buttonConfig: ButtonConfigSettings = {
        pageType,
        buttons: buttons.map(button => ({
          agentId: button.agentId,
          visible: button.visible,
          order: button.order
        }))
      };
      
      updateButtonConfig(buttonConfig);
      
      res.json({ success: true, config: buttonConfig });
    } catch (error) {
      console.error('Error saving button configuration:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Настройки агентов для обработки запросов
   */
  
  // Получение настроек агентов для определенного типа запросов
  app.get('/api/system/request-agent-settings', (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      
      if (!type || typeof type !== 'string') {
        return res.status(400).json({ error: 'Request type is required' });
      }
      
      const settings = getRequestAgentSettings(type);
      
      if (!settings) {
        return res.status(404).json({ error: 'Agent settings not found for the specified request type' });
      }
      
      res.json(settings);
    } catch (error) {
      console.error('Error getting request agent settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Сохранение настроек агентов для обработки запросов
  app.post('/api/system/request-agent-settings', (req: Request, res: Response) => {
    try {
      const { requestType, selectedAgents } = req.body;
      
      if (!requestType || !Array.isArray(selectedAgents)) {
        return res.status(400).json({ error: 'Invalid settings format' });
      }
      
      const settings: RequestAgentSettings = {
        requestType,
        selectedAgents
      };
      
      updateRequestAgentSettings(settings);
      
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Error saving request agent settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Настройки RAG
   */
  
  // Получение глобальных настроек RAG
  app.get('/api/system/rag-config', (_req: Request, res: Response) => {
    try {
      const config = getRAGConfig();
      res.json(config);
    } catch (error) {
      console.error('Error getting RAG configuration:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Сохранение глобальных настроек RAG
  app.post('/api/system/rag-config', (req: Request, res: Response) => {
    try {
      const { enabled, retrievalStrategy, retrievalTopK, sources, defaultPrompt } = req.body;
      
      if (typeof enabled !== 'boolean' || !retrievalStrategy || !Array.isArray(sources)) {
        return res.status(400).json({ error: 'Invalid RAG configuration format' });
      }
      
      const config: RAGConfig = {
        enabled,
        retrievalStrategy,
        retrievalTopK: retrievalTopK || 5,
        sources,
        defaultPrompt: defaultPrompt || ''
      };
      
      updateRAGConfig(config);
      
      res.json({ success: true, config });
    } catch (error) {
      console.error('Error saving RAG configuration:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}