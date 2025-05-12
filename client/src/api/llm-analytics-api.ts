/**
 * API клиент для взаимодействия с серверными эндпоинтами ИИ-аналитики LLM
 */

import { apiRequest } from "@/lib/queryClient";

// Типы для API LLM аналитики
export interface ModelUsage {
  model: string;
  tokensUsed: number;
  cost: number;
  requestCount: number;
  avgResponseTime: number;
}

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

export enum AnalysisType {
  OPTIMIZATION = "optimization",
  TRENDS = "trends",
  ALERTS = "alerts",
  COMPREHENSIVE = "comprehensive"
}

export interface AIAnalysisRequest {
  llmUsage: ModelUsage[];
  llmStatus: ServiceStatus[];
  analysisType: AnalysisType;
  userId?: number;
}

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

export interface LLMPerformanceAnalysisRequest {
  model?: string;
  startDate?: string;
  endDate?: string;
  metrics?: Array<'responseTime' | 'cost' | 'tokens' | 'requests'>;
  includeAnomalyDetection?: boolean;
}

/**
 * Запрос на ИИ-анализ данных LLM
 */
export async function requestAIAnalysis(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  try {
    const response = await fetch('/api/llm-analytics/analyze', {
      method: 'POST',
      body: JSON.stringify(request),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return await response.json() as AIAnalysisResponse;
  } catch (error) {
    console.error('Ошибка при запросе AI анализа:', error);
    
    return {
      success: false,
      analysisType: request.analysisType,
      content: 'Произошла ошибка при запросе анализа. Пожалуйста, попробуйте еще раз позже.',
      metadata: {
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Запрос на анализ производительности LLM моделей
 */
export async function requestPerformanceAnalysis(request: LLMPerformanceAnalysisRequest = {}) {
  try {
    const response = await fetch('/api/llm-analytics/performance', {
      method: 'POST',
      body: JSON.stringify(request),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('Ошибка при запросе анализа производительности:', error);
    throw error;
  }
}