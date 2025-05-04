/**
 * LLM Monitoring Service
 * Мониторинг статуса и использования LLM-моделей
 */

import { Router } from 'express';

// Типы данных для мониторинга
interface ServiceStatus {
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

interface ModelUsage {
  model: string;
  tokensUsed: number;
  cost: number;
  requestCount: number;
  avgResponseTime: number;
}

/**
 * Демо-данные для тестирования
 * В реальном приложении здесь были бы данные из мониторинга API или базы данных
 */
const demoStatuses: ServiceStatus[] = [
  {
    serviceName: 'OpenAI API',
    status: 'healthy',
    lastUpdated: new Date().toISOString(),
    details: {
      queueLength: 0,
      avgResponseTime: 0.58,
      requestsPerMinute: 12.3
    }
  },
  {
    serviceName: 'Anthropic API',
    status: 'degraded',
    lastUpdated: new Date().toISOString(),
    details: {
      queueLength: 3,
      avgResponseTime: 1.25,
      requestsPerMinute: 5.7,
      latestError: 'Повышенная латентность для batch запросов'
    }
  },
  {
    serviceName: 'Local Inference Server',
    status: 'healthy',
    lastUpdated: new Date().toISOString(),
    details: {
      queueLength: 0,
      gpuUtilization: 48,
      avgResponseTime: 0.84,
      requestsPerMinute: 3.1
    }
  }
];

const demoUsage: ModelUsage[] = [
  {
    model: 'gpt-4o',
    tokensUsed: 1245800,
    cost: 24.91,
    requestCount: 842,
    avgResponseTime: 0.72
  },
  {
    model: 'claude-3-7-sonnet',
    tokensUsed: 873500,
    cost: 17.47,
    requestCount: 326,
    avgResponseTime: 1.05
  },
  {
    model: 'gemini-1.5-flash',
    tokensUsed: 532100,
    cost: 5.32,
    requestCount: 215,
    avgResponseTime: 0.64
  },
  {
    model: 'local-mistral-7b',
    tokensUsed: 312600,
    cost: 0,
    requestCount: 195,
    avgResponseTime: 1.37
  }
];

/**
 * Регистрация маршрутов мониторинга
 */
export function registerLLMMonitoringRoutes(router: Router): void {
  // Получение статуса LLM сервисов
  router.get('/api/system/llm-status', (req, res) => {
    // В реальном приложении здесь был бы сбор актуальных данных
    res.json(demoStatuses);
  });

  // Получение статистики использования LLM моделей
  router.get('/api/system/llm-usage', (req, res) => {
    // В реальном приложении здесь были бы данные из базы данных
    res.json(demoUsage);
  });

  // Интеграция с внешними системами мониторинга
  router.post('/api/system/llm-maintenance', (req, res) => {
    const { action } = req.body;

    // Пример обработки действий мониторинга
    switch (action) {
      case 'clear_cache':
        // Очистка кэша запросов (в продакшене была бы реальная логика)
        res.json({ success: true, message: 'Кэш очищен' });
        break;

      case 'restart_services':
        // Перезапуск сервисов (в продакшене была бы реальная логика)
        res.json({ success: true, message: 'Сервисы перезапущены' });
        break;

      default:
        res.status(400).json({ success: false, message: 'Неизвестное действие' });
    }
  });
}
