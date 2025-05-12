/**
 * API маршруты для ИИ-аналитики LLM моделей
 */

import express, { Request, Response } from 'express';
import { analyzeMonitoringData, AnalysisType } from '../monitoring/ai-analytics';
import { 
  AIAnalysisRequest,
  AIAnalysisResponse,
  LLMPerformanceAnalysisRequest,
  LLMPerformanceAnalysisResponse
} from '../types/monitoring';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * Маршрут для анализа данных мониторинга LLM с помощью ИИ
 * POST /api/llm-analytics/analyze
 */
router.post('/analyze', async (req: Request<{}, {}, AIAnalysisRequest>, res: Response) => {
  try {
    const { llmUsage, llmStatus, analysisType, userId } = req.body;
    
    if (!llmUsage || !llmStatus || !analysisType) {
      return res.status(400).json({
        success: false,
        message: 'Отсутствуют необходимые данные для анализа'
      });
    }
    
    // Проверяем тип анализа
    if (!Object.values(AnalysisType).includes(analysisType as AnalysisType)) {
      return res.status(400).json({
        success: false,
        message: 'Неверный тип анализа'
      });
    }
    
    const response = await analyzeMonitoringData(
      { llmUsage, llmStatus },
      analysisType as AnalysisType,
      userId
    );
    
    res.json(response);
  } catch (error) {
    console.error('Ошибка при обработке запроса анализа LLM:', error);
    res.status(500).json({
      success: false,
      analysisType: req.body.analysisType || 'unknown',
      content: 'Произошла ошибка при обработке запроса анализа',
      metadata: {
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
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
    
    // В реальном приложении здесь был бы запрос к базе данных и анализ метрик
    // Сейчас возвращаем тестовые данные для демонстрации
    
    const response: LLMPerformanceAnalysisResponse = {
      success: true,
      data: {
        analysisId: uuidv4(),
        performanceAnalytics: {
          averages: {
            tokensPerRequest: 1245.8,
            costPerRequest: 0.0567,
            responseTime: 0.876
          },
          trends: {
            costTrend: 'stable',
            usageTrend: 'increasing',
            responseTimeTrend: 'decreasing'
          },
          anomalies: []
        },
        historicalData: [
          {
            model: 'gpt-4o',
            timePoints: ['2024-05-01', '2024-05-02', '2024-05-03', '2024-05-04', '2024-05-05'],
            responseTimeSeries: [0.92, 0.89, 0.85, 0.88, 0.82],
            costSeries: [125.45, 130.22, 128.76, 140.55, 135.89],
            tokensSeries: [1245780, 1356200, 1298450, 1450780, 1380560],
            requestsSeries: [980, 1020, 995, 1105, 1050]
          }
        ],
        aiInsights: "# Анализ производительности LLM моделей\n\n## Ключевые показатели\n- Наблюдается устойчивый рост использования токенов (+10.8% за последний месяц)\n- Стоимость остается стабильной, что указывает на хорошую оптимизацию\n- Время ответа улучшилось на 12.5%, что свидетельствует об оптимизации запросов\n\n## Рекомендации\n- Продолжайте оптимизацию промптов для дальнейшего улучшения производительности\n- Рассмотрите возможность балансировки нагрузки между разными моделями\n- Обратите внимание на рост использования, который может потребовать дополнительных вычислительных ресурсов в ближайшем будущем"
      },
      metadata: {
        analyzedModels: model ? [model] : ['gpt-4o', 'gpt-3.5-turbo'],
        dateRange: [
          startDate || '2024-05-01',
          endDate || '2024-05-05'
        ],
        generatedAt: new Date().toISOString()
      }
    };
    
    // Если требуется обнаружение аномалий
    if (includeAnomalyDetection) {
      response.data.performanceAnalytics.anomalies = [
        {
          timestamp: '2024-05-03T14:25:00Z',
          metric: 'responseTime',
          value: 1.85,
          expectedRange: [0.7, 1.2],
          severity: 'medium'
        }
      ];
    }
    
    res.json(response);
  } catch (error) {
    console.error('Ошибка при обработке запроса аналитики производительности LLM:', error);
    res.status(500).json({
      success: false,
      message: 'Произошла ошибка при обработке запроса аналитики производительности',
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
});

export default router;