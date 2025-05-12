/**
 * Типы данных для мониторинга и аналитики
 */

/**
 * Тип для статуса LLM сервисов
 */
export interface ServiceStatus {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'down';
  lastUpdated: string;
  details?: {
    queueLength?: number;
    gpuUtilization?: number;
    avgResponseTime?: number;
    requestsPerMinute?: number;
    latestError?: string;
  };
}

/**
 * Тип для использования LLM моделей
 */
export interface ModelUsage {
  model: string;
  tokensUsed: number;
  cost: number;
  requestCount: number;
  avgResponseTime: number;
}

/**
 * Тип для запроса анализа данных LLM
 */
export interface AIAnalysisRequest {
  llmUsage: ModelUsage[];
  llmStatus: ServiceStatus[];
  analysisType: 'optimization' | 'trends' | 'alerts' | 'comprehensive';
  userId?: number;
}

/**
 * Тип для ответа анализа данных LLM
 */
export interface AIAnalysisResponse {
  success: boolean;
  analysisType: string;
  content: string;
  metadata: {
    tokensUsed?: number;
    modelUsed?: string;
    generationMethod?: string;
    error?: string;
    timestamp: string;
  };
}

/**
 * Тип для записи метрик LLM моделей
 */
export interface LLMMetricsRecord {
  id: number;
  model: string;
  timestamp: string;
  requestCount: number;
  tokensUsed: number;
  cost: number;
  avgResponseTime: number;
  errorRate: number;
}

/**
 * Тип для истории производительности LLM
 */
export interface LLMPerformanceHistory {
  model: string;
  timePoints: string[];
  responseTimeSeries: number[];
  costSeries: number[];
  tokensSeries: number[];
  requestsSeries: number[];
}

/**
 * Тип для данных аналитики производительности LLM
 */
export interface LLMPerformanceAnalytics {
  averages: {
    tokensPerRequest: number;
    costPerRequest: number;
    responseTime: number;
  };
  trends: {
    costTrend: 'increasing' | 'decreasing' | 'stable';
    usageTrend: 'increasing' | 'decreasing' | 'stable';
    responseTimeTrend: 'increasing' | 'decreasing' | 'stable';
  };
  anomalies: Array<{
    timestamp: string;
    metric: string;
    value: number;
    expectedRange: [number, number];
    severity: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Тип для запроса анализа производительности LLM моделей
 */
export interface LLMPerformanceAnalysisRequest {
  model?: string;
  startDate?: string;
  endDate?: string;
  metrics?: Array<'responseTime' | 'cost' | 'tokens' | 'requests'>;
  includeAnomalyDetection?: boolean;
}

/**
 * Тип для ответа анализа производительности LLM моделей
 */
export interface LLMPerformanceAnalysisResponse {
  success: boolean;
  data: {
    analysisId: string;
    performanceAnalytics: LLMPerformanceAnalytics;
    historicalData: LLMPerformanceHistory[];
    aiInsights?: string;
  };
  metadata: {
    analyzedModels: string[];
    dateRange: [string, string];
    generatedAt: string;
  };
}