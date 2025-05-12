/**
 * Сервис для мониторинга и анализа производительности LLM моделей
 */

import { 
  LLMPerformanceAnalytics, 
  LLMPerformanceHistory,
  LLMPerformanceAnalysisRequest
} from '../types/monitoring';
import { logActivity } from '../activity-logger';

/**
 * Моковые данные метрик LLM моделей
 * В реальной реализации эти данные должны поступать из систем мониторинга и хранилища
 */
const mockMetricsData = {
  'gpt-4': {
    timePoints: generateTimePoints(30),
    responseTimeSeries: generateRandomSeries(30, 1.2, 2.8),
    costSeries: generateRandomSeries(30, 0.05, 0.12),
    tokensSeries: generateRandomSeries(30, 1500, 3000),
    requestsSeries: generateRandomSeries(30, 80, 200),
  },
  'gpt-3.5-turbo': {
    timePoints: generateTimePoints(30),
    responseTimeSeries: generateRandomSeries(30, 0.6, 1.5),
    costSeries: generateRandomSeries(30, 0.002, 0.008),
    tokensSeries: generateRandomSeries(30, 2000, 5000),
    requestsSeries: generateRandomSeries(30, 400, 800),
  },
  'claude-2': {
    timePoints: generateTimePoints(30),
    responseTimeSeries: generateRandomSeries(30, 1.0, 2.2),
    costSeries: generateRandomSeries(30, 0.02, 0.07),
    tokensSeries: generateRandomSeries(30, 1800, 3500),
    requestsSeries: generateRandomSeries(30, 120, 300),
  },
  'llama-2-70b': {
    timePoints: generateTimePoints(30),
    responseTimeSeries: generateRandomSeries(30, 1.5, 3.0),
    costSeries: generateRandomSeries(30, 0.005, 0.015),
    tokensSeries: generateRandomSeries(30, 1000, 2500),
    requestsSeries: generateRandomSeries(30, 50, 150),
  }
};

/**
 * Генерация массива временных точек
 * @param days количество дней
 */
function generateTimePoints(days: number): string[] {
  const result = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    result.push(date.toISOString().split('T')[0]);
  }
  
  return result;
}

/**
 * Генерация массива случайных значений
 * @param count количество значений 
 * @param min минимальное значение
 * @param max максимальное значение
 */
function generateRandomSeries(count: number, min: number, max: number): number[] {
  const result = [];
  
  for (let i = 0; i < count; i++) {
    result.push(min + Math.random() * (max - min));
  }
  
  return result;
}

/**
 * Определение тренда по массиву значений
 * @param values массив значений
 */
function determineTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (!values.length || values.length < 2) return 'stable';
  
  // Используем линейную регрессию для определения тренда
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  
  for (let i = 0; i < values.length; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  
  const n = values.length;
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  if (slope > 0.01) {
    return 'increasing';
  } else if (slope < -0.01) {
    return 'decreasing';
  } else {
    return 'stable';
  }
}

/**
 * Выявление аномалий в данных
 * @param values массив значений
 * @param thresholdMultiplier множитель стандартного отклонения для определения аномалии
 */
function detectAnomalies(
  values: number[], 
  timePoints: string[], 
  metric: string, 
  thresholdMultiplier: number = 2
): Array<{
  timestamp: string;
  metric: string;
  value: number;
  expectedRange: [number, number];
  severity: 'low' | 'medium' | 'high';
}> {
  if (!values.length || values.length < 5) return [];
  
  // Вычисляем среднее
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  // Вычисляем стандартное отклонение
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // Определяем пороги для аномалий
  const lowerThreshold = mean - thresholdMultiplier * stdDev;
  const upperThreshold = mean + thresholdMultiplier * stdDev;
  
  // Находим аномалии
  const anomalies = [];
  
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    
    if (value < lowerThreshold || value > upperThreshold) {
      // Определяем степень аномалии
      const deviationRatio = Math.abs(value - mean) / stdDev;
      let severity: 'low' | 'medium' | 'high' = 'low';
      
      if (deviationRatio > 3) {
        severity = 'high';
      } else if (deviationRatio > 2.5) {
        severity = 'medium';
      }
      
      anomalies.push({
        timestamp: timePoints[i],
        metric,
        value,
        expectedRange: [
          Math.max(0, mean - stdDev), 
          mean + stdDev
        ],
        severity
      });
    }
  }
  
  return anomalies;
}

/**
 * Получение среднего значения из массива
 */
function getAverage(values: number[]): number {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Генерация данных мониторинга производительности LLM моделей
 */
export async function generatePerformanceAnalysis(request: LLMPerformanceAnalysisRequest): Promise<any> {
  try {
    const { model, includeAnomalyDetection = true } = request;
    
    // Выбираем данные конкретной модели или всех моделей
    const modelsToAnalyze = model 
      ? [model]
      : Object.keys(mockMetricsData);
    
    const historicalData: LLMPerformanceHistory[] = [];
    
    // Собираем исторические данные для всех моделей
    for (const modelName of modelsToAnalyze) {
      if (mockMetricsData[modelName]) {
        historicalData.push({
          model: modelName,
          timePoints: mockMetricsData[modelName].timePoints,
          responseTimeSeries: mockMetricsData[modelName].responseTimeSeries,
          costSeries: mockMetricsData[modelName].costSeries,
          tokensSeries: mockMetricsData[modelName].tokensSeries,
          requestsSeries: mockMetricsData[modelName].requestsSeries
        });
      }
    }
    
    // Подготавливаем первую модель для подробного анализа (в реальной реализации здесь будет больше данных)
    const mainModel = historicalData[0];
    
    if (!mainModel) {
      throw new Error('Не найдены данные для анализа');
    }
    
    // Вычисляем средние показатели
    const tokensPerRequest = getAverage(mainModel.tokensSeries) / getAverage(mainModel.requestsSeries);
    const costPerRequest = getAverage(mainModel.costSeries) / getAverage(mainModel.requestsSeries);
    const responseTime = getAverage(mainModel.responseTimeSeries);
    
    // Определяем тренды
    const costTrend = determineTrend(mainModel.costSeries);
    const usageTrend = determineTrend(mainModel.requestsSeries);
    const responseTimeTrend = determineTrend(mainModel.responseTimeSeries);
    
    // Выявляем аномалии если требуется
    let anomalies = [];
    
    if (includeAnomalyDetection) {
      const costAnomalies = detectAnomalies(
        mainModel.costSeries, 
        mainModel.timePoints, 
        'cost', 
        2.5
      );
      
      const usageAnomalies = detectAnomalies(
        mainModel.requestsSeries, 
        mainModel.timePoints, 
        'requests', 
        2.5
      );
      
      const responseTimeAnomalies = detectAnomalies(
        mainModel.responseTimeSeries, 
        mainModel.timePoints, 
        'responseTime', 
        2.5
      );
      
      anomalies = [
        ...costAnomalies,
        ...usageAnomalies,
        ...responseTimeAnomalies
      ];
    }
    
    // Логируем запрос анализа
    await logActivity({
      action: 'LLM_PERFORMANCE_ANALYSIS',
      entityType: 'llm_monitoring',
      entityId: 0,
      details: `Выполнен анализ производительности ${modelsToAnalyze.length} LLM моделей`,
      metadata: {
        models: modelsToAnalyze,
        includeAnomalyDetection,
        anomalyCount: anomalies.length,
        timestamp: new Date().toISOString()
      }
    });
    
    // Формируем данные аналитики
    const performanceAnalytics: LLMPerformanceAnalytics = {
      averages: {
        tokensPerRequest,
        costPerRequest,
        responseTime
      },
      trends: {
        costTrend,
        usageTrend,
        responseTimeTrend
      },
      anomalies
    };
    
    return {
      analysisId: `llm-analysis-${Date.now()}`,
      performanceAnalytics,
      historicalData,
      aiInsights: `Анализ производительности моделей ${modelsToAnalyze.join(', ')} показал ${
        usageTrend === 'increasing' 
          ? 'растущий тренд использования' 
          : usageTrend === 'decreasing' 
            ? 'снижение использования' 
            : 'стабильное использование'
      } при ${
        costTrend === 'increasing' 
          ? 'растущих затратах' 
          : costTrend === 'decreasing' 
            ? 'снижающихся затратах' 
            : 'стабильных затратах'
      }. Среднее время ответа ${
        responseTimeTrend === 'increasing' 
          ? 'увеличивается' 
          : responseTimeTrend === 'decreasing' 
            ? 'снижается' 
            : 'остается стабильным'
      }. ${
        anomalies.length 
          ? `Выявлено ${anomalies.length} аномалий в данных.` 
          : 'Аномалий в данных не выявлено.'
      }`
    };
  } catch (error) {
    console.error('Ошибка при генерации анализа производительности LLM:', error);
    throw error;
  }
}