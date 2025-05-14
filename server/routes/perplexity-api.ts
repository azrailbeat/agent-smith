/**
 * API маршруты для работы с Perplexity AI
 */
import express, { Request, Response, Router } from 'express';
import { z } from 'zod';
import { perplexityService } from '../services/perplexity';
import { logActivity } from '../activity-logger';
import { saveApiSettings, getApiSettings } from '../controllers/perplexity-controller';

// Схема для запроса генерации текста
const generateTextSchema = z.object({
  prompt: z.string(),
  systemPrompt: z.string().optional(),
  model: z.enum(['llama-3.1-sonar-small-128k-online', 
                'llama-3.1-sonar-large-128k-online', 
                'llama-3.1-sonar-huge-128k-online']).optional(),
  temperature: z.number().min(0).max(1).optional(),
});

// Схема для запроса анализа текста
const analyzeTextSchema = z.object({
  text: z.string(),
  task: z.string(),
  model: z.enum(['llama-3.1-sonar-small-128k-online', 
                'llama-3.1-sonar-large-128k-online', 
                'llama-3.1-sonar-huge-128k-online']).optional(),
});

// Схема для запроса саммаризации документа
const summarizeDocumentSchema = z.object({
  document: z.string(),
  model: z.enum(['llama-3.1-sonar-small-128k-online', 
                'llama-3.1-sonar-large-128k-online', 
                'llama-3.1-sonar-huge-128k-online']).optional(),
});

// Схема для запроса ответа на вопрос по данным
const dataQuestionSchema = z.object({
  question: z.string(),
  contextData: z.any(),
  model: z.enum(['llama-3.1-sonar-small-128k-online', 
                'llama-3.1-sonar-large-128k-online', 
                'llama-3.1-sonar-huge-128k-online']).optional(),
});

export function registerPerplexityRoutes(app: express.Express): void {
  const router = Router();

  /**
   * Проверка доступности API ключа Perplexity
   */
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const isApiKeyAvailable = perplexityService.isApiKeyAvailable();
      
      res.json({
        available: isApiKeyAvailable,
        message: isApiKeyAvailable 
          ? 'Perplexity API key is available' 
          : 'Perplexity API key is not configured'
      });
    } catch (error: any) {
      console.error('Error checking Perplexity API status:', error);
      res.status(500).json({ 
        error: 'Failed to check Perplexity API status',
        message: error.message 
      });
    }
  });

  /**
   * Получение настроек API
   */
  router.get('/settings', getApiSettings);

  /**
   * Сохранение настроек API
   */
  router.post('/settings', saveApiSettings);

  /**
   * Генерация текста с помощью Perplexity API
   */
  router.post('/generate', async (req: Request, res: Response) => {
    try {
      const validation = generateTextSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: validation.error.format() 
        });
      }
      
      const { prompt, systemPrompt, model, temperature } = validation.data;
      
      const response = await perplexityService.createCompletion({
        model: model || "llama-3.1-sonar-small-128k-online",
        messages: [
          ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
          { role: 'user' as const, content: prompt }
        ],
        temperature: temperature
      });
      
      await logActivity({
        action: 'perplexity_generate',
        details: 'Generated text with Perplexity API',
        metadata: {
          model: model || "llama-3.1-sonar-small-128k-online",
          promptLength: prompt.length,
          responseLength: response.choices[0].message.content.length,
          tokens: response.usage.total_tokens
        }
      });
      
      res.json({
        text: response.choices[0].message.content,
        model: response.model,
        usage: response.usage,
        citations: response.citations
      });
    } catch (error: any) {
      console.error('Error generating text with Perplexity:', error);
      res.status(500).json({ 
        error: 'Failed to generate text', 
        message: error.message 
      });
    }
  });

  /**
   * Анализ текста с помощью Perplexity API
   */
  router.post('/analyze', async (req: Request, res: Response) => {
    try {
      const validation = analyzeTextSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: validation.error.format() 
        });
      }
      
      const { text, task, model } = validation.data;
      
      const result = await perplexityService.analyzeText(text, task);
      
      await logActivity({
        action: 'perplexity_analyze',
        details: `Analyzed text for ${task}`,
        metadata: {
          model: model || "llama-3.1-sonar-small-128k-online",
          textLength: text.length,
          task
        }
      });
      
      res.json({
        analysis: result
      });
    } catch (error: any) {
      console.error('Error analyzing text with Perplexity:', error);
      res.status(500).json({ 
        error: 'Failed to analyze text', 
        message: error.message 
      });
    }
  });

  /**
   * Саммаризация документа с помощью Perplexity API
   */
  router.post('/summarize', async (req: Request, res: Response) => {
    try {
      const validation = summarizeDocumentSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: validation.error.format() 
        });
      }
      
      const { document, model } = validation.data;
      
      const summary = await perplexityService.summarizeDocument(document);
      
      await logActivity({
        action: 'perplexity_summarize',
        details: 'Summarized document',
        metadata: {
          model: model || "llama-3.1-sonar-small-128k-online",
          documentLength: document.length,
          summaryLength: summary.length
        }
      });
      
      res.json({
        summary
      });
    } catch (error: any) {
      console.error('Error summarizing document with Perplexity:', error);
      res.status(500).json({ 
        error: 'Failed to summarize document', 
        message: error.message 
      });
    }
  });

  /**
   * Ответ на вопрос по данным с помощью Perplexity API
   */
  router.post('/answer', async (req: Request, res: Response) => {
    try {
      const validation = dataQuestionSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: validation.error.format() 
        });
      }
      
      const { question, contextData, model } = validation.data;
      
      const answer = await perplexityService.answerDataQuestion(question, contextData);
      
      await logActivity({
        action: 'perplexity_answer',
        details: 'Answered data question',
        metadata: {
          model: model || "llama-3.1-sonar-small-128k-online",
          question,
          contextDataSize: JSON.stringify(contextData).length
        }
      });
      
      res.json({
        answer
      });
    } catch (error: any) {
      console.error('Error answering data question with Perplexity:', error);
      res.status(500).json({ 
        error: 'Failed to answer data question', 
        message: error.message 
      });
    }
  });

  // Регистрируем маршруты с префиксом /api/perplexity
  app.use('/api/perplexity', router);
}