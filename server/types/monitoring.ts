/**
 * Типы данных для системы мониторинга
 */

// Запрос на анализ производительности LLM модели
export interface LLMPerformanceAnalysisRequest {
  // Имя модели для анализа (если не указано, анализируются все модели)
  model?: string;
  
  // Включать ли обнаружение аномалий
  includeAnomalyDetection?: boolean;
  
  // Период для анализа в днях (по умолчанию 30)
  period?: number;
}

// Типы трендов
export type TrendType = 'increasing' | 'decreasing' | 'stable';

// Аналитика производительности LLM
export interface LLMPerformanceAnalytics {
  // Средние показатели
  averages: {
    tokensPerRequest: number;
    costPerRequest: number;
    responseTime: number;
  };
  
  // Тренды
  trends: {
    costTrend: TrendType;
    usageTrend: TrendType;
    responseTimeTrend: TrendType;
  };
  
  // Аномалии
  anomalies: Array<{
    timestamp: string;
    metric: string;
    value: number;
    expectedRange: [number, number];
    severity: 'low' | 'medium' | 'high';
  }>;
}

// История производительности LLM
export interface LLMPerformanceHistory {
  // Название модели
  model: string;
  
  // Временные точки
  timePoints: string[];
  
  // Серия данных времени ответа
  responseTimeSeries: number[];
  
  // Серия данных стоимости
  costSeries: number[];
  
  // Серия данных токенов
  tokensSeries: number[];
  
  // Серия данных запросов
  requestsSeries: number[];
}

// Тип анализа для AI моделей
export enum AIAnalysisType {
  PERFORMANCE = 'performance',
  OPTIMIZATION = 'optimization',
  TREND = 'trend',
  ALERTS = 'alerts'
}

// Запрос на анализ с помощью AI
export interface AIModelAnalysisRequest {
  // Тип анализа
  analysisType: AIAnalysisType;
  
  // Модель для анализа
  model?: string;
  
  // Дополнительные параметры
  options?: Record<string, any>;
}

// Результат анализа производительности LLM с помощью AI
export interface AIModelAnalysisResult {
  // Идентификатор анализа
  analysisId: string;
  
  // Тип анализа
  analysisType: AIAnalysisType;
  
  // Модель
  model?: string;
  
  // Результаты анализа
  results: {
    // Базовая аналитика
    analytics?: LLMPerformanceAnalytics;
    
    // Исторические данные
    historicalData?: LLMPerformanceHistory[];
    
    // Рекомендации по оптимизации
    optimizationSuggestions?: string[];
    
    // Предупреждения
    alerts?: Array<{
      level: 'info' | 'warning' | 'critical';
      message: string;
      timestamp: string;
    }>;
    
    // Анализ тенденций
    trendAnalysis?: {
      usage: {
        trend: TrendType;
        analysis: string;
      };
      cost: {
        trend: TrendType;
        analysis: string;
      };
      performance: {
        trend: TrendType;
        analysis: string;
      };
    };
  };
  
  // Выводы AI
  aiInsights: string;
  
  // Дата создания
  createdAt: string;
}