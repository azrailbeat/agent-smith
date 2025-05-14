/**
 * Контроллер для работы с настройками Perplexity API
 */
import { Request, Response } from 'express';
import { z } from 'zod';
import { systemSettings } from '../system-settings';
import { perplexityService } from '../services/perplexity';
import { logActivity } from '../activity-logger';

// Схема для валидации настроек API
const apiSettingsSchema = z.object({
  apiKey: z.string().min(10).max(100),
  defaultModel: z.enum([
    'llama-3.1-sonar-small-128k-online',
    'llama-3.1-sonar-large-128k-online',
    'llama-3.1-sonar-huge-128k-online'
  ]).default('llama-3.1-sonar-small-128k-online')
});

type PerplexityApiSettings = z.infer<typeof apiSettingsSchema>;

/**
 * Получает текущие настройки Perplexity API
 */
export async function getApiSettings(req: Request, res: Response) {
  try {
    const settings = await systemSettings.getLlmSettings('perplexity');
    
    // Не отправляем API ключ в открытом виде, только статус его наличия
    const responseSettings = {
      apiKeyConfigured: !!settings?.apiKey,
      defaultModel: settings?.defaultModel || 'llama-3.1-sonar-small-128k-online'
    };
    
    res.json(responseSettings);
  } catch (error) {
    console.error('Error getting Perplexity API settings:', error);
    res.status(500).json({ 
      error: 'Failed to get Perplexity API settings' 
    });
  }
}

/**
 * Сохраняет настройки Perplexity API
 */
export async function saveApiSettings(req: Request, res: Response) {
  try {
    const validation = apiSettingsSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid settings data', 
        details: validation.error.format() 
      });
    }
    
    const { apiKey, defaultModel } = validation.data;
    
    // Проверяем работоспособность API ключа
    const testResult = await testApiKey(apiKey);
    
    if (!testResult.success) {
      return res.status(400).json({ 
        error: 'Invalid API key', 
        message: testResult.message 
      });
    }
    
    // Сохраняем настройки
    await systemSettings.updateLlmSettings('perplexity', {
      apiKey,
      defaultModel
    });
    
    // Логируем активность
    await logActivity({
      action: 'update_perplexity_settings',
      details: 'Updated Perplexity API settings'
    });
    
    res.json({ 
      success: true,
      message: 'Perplexity API settings saved successfully',
      defaultModel
    });
  } catch (error: any) {
    console.error('Error saving Perplexity API settings:', error);
    res.status(500).json({ 
      error: 'Failed to save Perplexity API settings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Проверяет работоспособность API ключа
 */
async function testApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    // Проверяем работоспособность ключа с помощью простого запроса к API
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'user', content: 'Hello, this is a test message to verify API key. Please respond with "API key is valid".' }
        ],
        max_tokens: 10,
        temperature: 0.1
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }
    
    // Если запрос успешный, значит ключ работает
    return { success: true, message: 'API key is valid' };
  } catch (error: any) {
    console.error('Error testing Perplexity API key:', error);
    
    return { 
      success: false, 
      message: error instanceof Error 
        ? `Invalid API key: ${error.message}` 
        : 'Failed to validate API key'
    };
  }
}