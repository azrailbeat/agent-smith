/**
 * Agent Smith Platform - Маршруты для управления LLM провайдерами
 * 
 * Обеспечивает API для:
 * - Получения списка доступных провайдеров
 * - Добавления, обновления и удаления провайдеров
 * - Проверки настроек подключения
 * - Установки провайдера по умолчанию
 * 
 * @version 1.0.0
 * @since 14.05.2025
 */

import express from 'express';
import { llmProviderService, LLMProviderConfig } from '../services/llm-providers/llm-provider-service';
import { logActivity, ActivityType } from '../activity-logger';

const router = express.Router();

// Получение списка всех провайдеров
router.get('/', async (req, res) => {
  try {
    const providers = await llmProviderService.getProviders();
    
    // Скрываем API ключи в ответе
    const safeProviders = providers.map((provider) => {
      const { apiKey, ...safeProvider } = provider;
      return {
        ...safeProvider,
        hasApiKey: !!apiKey
      };
    });
    
    res.json(safeProviders);
  } catch (error) {
    console.error('Ошибка при получении провайдеров LLM:', error);
    res.status(500).json({ error: 'Не удалось получить список провайдеров LLM' });
  }
});

// Получение провайдера по умолчанию
router.get('/default', async (req, res) => {
  try {
    const defaultProvider = await llmProviderService.getDefaultProvider();
    
    if (!defaultProvider) {
      return res.status(404).json({ error: 'Провайдер LLM по умолчанию не настроен' });
    }
    
    // Скрываем API ключ в ответе
    const { apiKey, ...safeProvider } = defaultProvider;
    
    res.json({
      ...safeProvider,
      hasApiKey: !!apiKey
    });
  } catch (error) {
    console.error('Ошибка при получении провайдера LLM по умолчанию:', error);
    res.status(500).json({ error: 'Не удалось получить провайдер LLM по умолчанию' });
  }
});

// Получение провайдера по имени
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const provider = await llmProviderService.getProvider(name);
    
    if (!provider) {
      return res.status(404).json({ error: `Провайдер LLM ${name} не найден` });
    }
    
    // Скрываем API ключ в ответе
    const { apiKey, ...safeProvider } = provider;
    
    res.json({
      ...safeProvider,
      hasApiKey: !!apiKey
    });
  } catch (error) {
    console.error('Ошибка при получении провайдера LLM:', error);
    res.status(500).json({ error: 'Не удалось получить провайдер LLM' });
  }
});

// Добавление нового провайдера
router.post('/', async (req, res) => {
  try {
    const providerConfig: LLMProviderConfig = req.body;
    
    // Проверяем обязательные поля
    if (!providerConfig.name || !providerConfig.type || !providerConfig.apiUrl) {
      return res.status(400).json({
        error: 'Некорректные данные провайдера. Обязательные поля: name, type, apiUrl'
      });
    }
    
    // Проверяем, существует ли провайдер с таким именем
    const existingProvider = await llmProviderService.getProvider(providerConfig.name);
    if (existingProvider) {
      return res.status(409).json({ error: `Провайдер LLM с именем ${providerConfig.name} уже существует` });
    }
    
    // Добавляем провайдера
    const success = await llmProviderService.addProvider(providerConfig);
    
    if (!success) {
      return res.status(500).json({ error: 'Не удалось добавить провайдер LLM' });
    }
    
    // Логируем добавление провайдера
    await logActivity({
      action: ActivityType.SYSTEM_CONFIG,
      details: `Добавлен новый провайдер LLM: ${providerConfig.name} (${providerConfig.type})`,
      metadata: {
        providerName: providerConfig.name,
        providerType: providerConfig.type
      }
    });
    
    res.status(201).json({ success: true, message: 'Провайдер LLM успешно добавлен' });
  } catch (error) {
    console.error('Ошибка при добавлении провайдера LLM:', error);
    res.status(500).json({ error: 'Не удалось добавить провайдер LLM' });
  }
});

// Обновление провайдера
router.put('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const providerConfig: LLMProviderConfig = req.body;
    
    // Проверяем, существует ли провайдер
    const existingProvider = await llmProviderService.getProvider(name);
    if (!existingProvider) {
      return res.status(404).json({ error: `Провайдер LLM ${name} не найден` });
    }
    
    // Проверяем, что имя провайдера не меняется
    if (providerConfig.name !== name) {
      return res.status(400).json({ error: 'Нельзя изменить имя провайдера. Создайте нового провайдера.' });
    }
    
    // Обновляем провайдера
    const success = await llmProviderService.updateProvider(providerConfig);
    
    if (!success) {
      return res.status(500).json({ error: 'Не удалось обновить провайдер LLM' });
    }
    
    // Логируем обновление провайдера
    await logActivity({
      action: ActivityType.SYSTEM_CONFIG,
      details: `Обновлен провайдер LLM: ${providerConfig.name}`,
      metadata: {
        providerName: providerConfig.name,
        providerType: providerConfig.type
      }
    });
    
    res.json({ success: true, message: 'Провайдер LLM успешно обновлен' });
  } catch (error) {
    console.error('Ошибка при обновлении провайдера LLM:', error);
    res.status(500).json({ error: 'Не удалось обновить провайдер LLM' });
  }
});

// Удаление провайдера
router.delete('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    // Проверяем, существует ли провайдер
    const existingProvider = await llmProviderService.getProvider(name);
    if (!existingProvider) {
      return res.status(404).json({ error: `Провайдер LLM ${name} не найден` });
    }
    
    // Удаляем провайдера
    const success = await llmProviderService.deleteProvider(name);
    
    if (!success) {
      return res.status(500).json({ error: 'Не удалось удалить провайдер LLM' });
    }
    
    // Логируем удаление провайдера
    await logActivity({
      action: ActivityType.SYSTEM_CONFIG,
      details: `Удален провайдер LLM: ${name}`,
      metadata: {
        providerName: name
      }
    });
    
    res.json({ success: true, message: 'Провайдер LLM успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении провайдера LLM:', error);
    res.status(500).json({ error: 'Не удалось удалить провайдер LLM' });
  }
});

// Установка провайдера по умолчанию
router.put('/:name/default', async (req, res) => {
  try {
    const { name } = req.params;
    
    // Проверяем, существует ли провайдер
    const existingProvider = await llmProviderService.getProvider(name);
    if (!existingProvider) {
      return res.status(404).json({ error: `Провайдер LLM ${name} не найден` });
    }
    
    // Проверяем, включен ли провайдер
    if (!existingProvider.enabled) {
      return res.status(400).json({ error: `Провайдер LLM ${name} отключен. Нельзя установить отключенный провайдер по умолчанию.` });
    }
    
    // Устанавливаем провайдер по умолчанию
    const success = await llmProviderService.setDefaultProvider(name);
    
    if (!success) {
      return res.status(500).json({ error: 'Не удалось установить провайдер LLM по умолчанию' });
    }
    
    // Логируем изменение провайдера по умолчанию
    await logActivity({
      action: ActivityType.SYSTEM_CONFIG,
      details: `Установлен провайдер LLM по умолчанию: ${name}`,
      metadata: {
        providerName: name
      }
    });
    
    res.json({ success: true, message: `Провайдер LLM ${name} установлен по умолчанию` });
  } catch (error) {
    console.error('Ошибка при установке провайдера LLM по умолчанию:', error);
    res.status(500).json({ error: 'Не удалось установить провайдер LLM по умолчанию' });
  }
});

// Проверка настроек провайдера
router.post('/test', async (req, res) => {
  try {
    const providerConfig: LLMProviderConfig = req.body;
    
    // Проверяем обязательные поля
    if (!providerConfig.name || !providerConfig.type || !providerConfig.apiUrl) {
      return res.status(400).json({
        error: 'Некорректные данные провайдера. Обязательные поля: name, type, apiUrl'
      });
    }
    
    // Проверяем настройки провайдера
    const result = await llmProviderService.checkProviderSettings(providerConfig);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    // Логируем успешную проверку
    await logActivity({
      action: ActivityType.SYSTEM_CONFIG,
      details: `Проверены настройки провайдера LLM: ${providerConfig.name}`,
      metadata: {
        providerName: providerConfig.name,
        providerType: providerConfig.type,
        model: result.model
      }
    });
    
    res.json({
      success: true,
      message: result.message,
      model: result.model
    });
  } catch (error) {
    console.error('Ошибка при проверке настроек провайдера LLM:', error);
    res.status(500).json({ error: 'Не удалось проверить настройки провайдера LLM' });
  }
});

export default router;