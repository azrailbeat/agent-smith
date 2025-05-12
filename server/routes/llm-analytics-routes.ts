/**
 * API маршруты для ИИ-аналитики LLM моделей
 */

import { Router, Request, Response } from 'express';
import { processAIAnalysisRequest } from '../monitoring/ai-analytics';
import { generatePerformanceAnalysis } from '../monitoring/llm-monitoring';
import { 
  AIAnalysisRequest, 
  LLMPerformanceAnalysisRequest,
  LLMPerformanceAnalysisResponse
} from '../types/monitoring';

const router = Router();

/**
 * Маршрут для анализа данных мониторинга LLM с помощью ИИ
 * POST /api/llm-analytics/analyze
 */
router.post('/analyze', async (req: Request<{}, {}, AIAnalysisRequest>, res: Response) => {
  try {
    const { llmUsage, llmStatus, analysisType, userId } = req.body;
    
    if (!llmUsage || !llmUsage.length) {
      return res.status(400).json({
        success: false,
        analysisType,
        content: 'Отсутствуют данные о метриках использования LLM моделей',
        metadata: {
          error: 'Не предоставлены данные о метриках использования LLM',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    if (!llmStatus || !llmStatus.length) {
      return res.status(400).json({
        success: false,
        analysisType,
        content: 'Отсутствуют данные о статусе LLM сервисов',
        metadata: {
          error: 'Не предоставлены данные о статусе LLM сервисов',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const result = await processAIAnalysisRequest(llmUsage, llmStatus, analysisType, userId);
    return res.json(result);
  } catch (error) {
    console.error('Ошибка при обработке запроса на AI анализ:', error);
    return res.status(500).json({
      success: false,
      analysisType: req.body.analysisType || 'unknown',
      content: 'Произошла ошибка при обработке запроса анализа. Пожалуйста, попробуйте еще раз позже.',
      metadata: {
        error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Маршрут для получения аналитики производительности LLM моделей
 * POST /api/llm-analytics/performance
 */
router.post('/performance', async (req: Request<{}, {}, LLMPerformanceAnalysisRequest>, res: Response) => {
  try {
    const { model, startDate, endDate, metrics, includeAnomalyDetection } = req.body;
    
    const result = await generatePerformanceAnalysis({
      model,
      startDate,
      endDate,
      metrics,
      includeAnomalyDetection
    });
    
    const response: LLMPerformanceAnalysisResponse = {
      success: true,
      data: result,
      metadata: {
        analyzedModels: model ? [model] : ['gpt-4', 'gpt-3.5-turbo', 'claude-2', 'llama-2-70b'],
        dateRange: [
          startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate || new Date().toISOString().split('T')[0]
        ],
        generatedAt: new Date().toISOString()
      }
    };
    
    return res.json(response);
  } catch (error) {
    console.error('Ошибка при обработке запроса на анализ производительности:', error);
    return res.status(500).json({
      success: false,
      error: 'Произошла ошибка при анализе производительности LLM моделей',
      message: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
    });
  }
});

export default router;