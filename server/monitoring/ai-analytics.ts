/**
 * ИИ-аналитика для анализа данных мониторинга LLM моделей
 * Предоставляет функции для анализа данных мониторинга с помощью OpenAI
 */

import OpenAI from "openai";
import { ModelUsage, ServiceStatus, AIAnalysisRequest, AIAnalysisResponse } from "../types/monitoring";
import { logActivity } from "../activity-logger";

// Инициализация OpenAI API
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Типы анализа
export enum AnalysisType {
  OPTIMIZATION = "optimization",
  TRENDS = "trends",
  ALERTS = "alerts",
  COMPREHENSIVE = "comprehensive"
}

/**
 * Функция для анализа данных мониторинга LLM с помощью OpenAI
 * @param data Данные для анализа
 * @param analysisType Тип анализа
 * @param userId ID пользователя, запросившего анализ
 */
export async function analyzeMonitoringData(
  data: { llmUsage: ModelUsage[]; llmStatus: ServiceStatus[] },
  analysisType: AnalysisType,
  userId?: number
): Promise<AIAnalysisResponse> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY не настроен. Используем предопределенные ответы для анализа LLM данных.");
      return generateFallbackAnalysis(data, analysisType);
    }

    // Подготовка данных для отправки в OpenAI
    const { llmUsage, llmStatus } = data;
    
    // Формирование промпта в зависимости от типа анализа
    let systemPrompt = "Ты - эксперт по анализу данных производительности и использования LLM моделей. ";
    let userPrompt = "";
    
    // Общие данные о мониторинге
    const monitoringData = JSON.stringify({
      llmModels: llmUsage.map(model => ({
        name: model.model,
        tokensUsed: model.tokensUsed,
        cost: model.cost,
        requestCount: model.requestCount,
        avgResponseTime: model.avgResponseTime
      })),
      services: llmStatus.map(service => ({
        name: service.serviceName,
        status: service.status,
        lastUpdated: service.lastUpdated,
        details: service.details
      }))
    });
    
    switch (analysisType) {
      case AnalysisType.OPTIMIZATION:
        systemPrompt += "Предоставь подробный анализ оптимизации использования LLM моделей с акцентом на снижение затрат и улучшение эффективности.";
        userPrompt = `Проанализируй следующие данные мониторинга LLM моделей и предоставь рекомендации по оптимизации затрат и производительности. Обрати особое внимание на модели с высокими затратами и медленным временем ответа. Данные мониторинга: ${monitoringData}`;
        break;
        
      case AnalysisType.TRENDS:
        systemPrompt += "Предоставь анализ трендов использования LLM моделей с прогнозами будущего использования и рекомендациями по масштабированию.";
        userPrompt = `Проанализируй следующие данные мониторинга LLM моделей и выяви текущие тренды использования. Сделай прогноз будущего использования и затрат, а также предоставь рекомендации по масштабированию. Данные мониторинга: ${monitoringData}`;
        break;
        
      case AnalysisType.ALERTS:
        systemPrompt += "Проанализируй данные мониторинга LLM и выяви любые проблемы, предупреждения или потенциальные узкие места в работе сервисов.";
        userPrompt = `Проанализируй следующие данные мониторинга LLM моделей и выяви все проблемы, предупреждения и потенциальные узкие места. Сосредоточься на проблемных сервисах, высоких затратах и проблемах производительности. Данные мониторинга: ${monitoringData}`;
        break;
        
      case AnalysisType.COMPREHENSIVE:
        systemPrompt += "Предоставь комплексный анализ всех аспектов использования LLM моделей, включая оптимизацию, тренды и проблемы.";
        userPrompt = `Проанализируй следующие данные мониторинга LLM моделей и предоставь комплексный анализ, включающий оптимизацию затрат, тренды использования, проблемы и рекомендации. Данные мониторинга: ${monitoringData}`;
        break;
    }
    
    systemPrompt += " Структурируй ответ в формате markdown с разделами и подзаголовками. Будь конкретным и приведи числовые данные, где это возможно.";
    
    // Запрос к OpenAI API
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });
    
    const analysisContent = response.choices[0].message.content || "Не удалось выполнить анализ данных.";
    
    // Логируем активность
    await logActivity({
      action: "ai_analysis_completed",
      entityType: "monitoring",
      details: `AI анализ данных мониторинга LLM (тип: ${analysisType})`,
      userId: userId || 1, // Используем 1 как fallback ID
      metadata: {
        analysisType,
        tokensUsed: response.usage?.total_tokens || 0,
        llmModelsCount: llmUsage.length,
        servicesCount: llmStatus.length
      }
    });
    
    return {
      success: true,
      analysisType,
      content: analysisContent,
      metadata: {
        tokensUsed: response.usage?.total_tokens || 0,
        modelUsed: "gpt-4o",
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error("Ошибка при анализе данных мониторинга LLM:", error);
    // Логируем ошибку
    await logActivity({
      action: "ai_analysis_error",
      entityType: "monitoring",
      details: `Ошибка при анализе данных мониторинга LLM: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      userId: userId || 1
    });
    
    return {
      success: false,
      analysisType,
      content: "Произошла ошибка при анализе данных мониторинга. Пожалуйста, проверьте настройки OpenAI API и попробуйте снова.",
      metadata: {
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Генерация фиксированных ответов для анализа в случае отсутствия ключа OpenAI API
 */
function generateFallbackAnalysis(
  data: { llmUsage: ModelUsage[]; llmStatus: ServiceStatus[] },
  analysisType: AnalysisType
): AIAnalysisResponse {
  const { llmUsage, llmStatus } = data;
  
  // Общие метрики
  const totalRequests = llmUsage.reduce((sum, model) => sum + model.requestCount, 0);
  const totalTokens = llmUsage.reduce((sum, model) => sum + model.tokensUsed, 0);
  const totalCost = llmUsage.reduce((sum, model) => sum + model.cost, 0);
  const avgResponseTime = llmUsage.reduce((sum, model) => sum + model.avgResponseTime, 0) / (llmUsage.length || 1);
  
  // Проблемные сервисы
  const problemServices = llmStatus.filter(s => s.status !== 'healthy');
  
  // Контент в зависимости от типа анализа
  let content = "";
  
  switch (analysisType) {
    case AnalysisType.OPTIMIZATION:
      content = `
## Анализ оптимизации использования LLM моделей

### Общие метрики использования
- Всего запросов: ${totalRequests.toLocaleString()}
- Использовано токенов: ${totalTokens.toLocaleString()}
- Общие затраты: $${totalCost.toFixed(2)}
- Среднее время ответа: ${avgResponseTime.toFixed(2)} сек

### Рекомендации по оптимизации
1. **Оптимизация стоимости**: Рассмотрите возможность использования моделей меньшего размера для простых задач
2. **Оптимизация токенов**: Сократите размер промптов и используйте более эффективные запросы
3. **Кэширование**: Внедрите кэширование для часто используемых запросов

### Модели с высокой стоимостью
${llmUsage.sort((a, b) => b.cost - a.cost).slice(0, 3).map(model => 
  `- **${model.model}**: $${model.cost.toFixed(2)} (${model.tokensUsed.toLocaleString()} токенов)`
).join('\n')}

### Оптимизация производительности
- Оптимизируйте запросы к моделям с высоким временем ответа
- Рассмотрите балансировку нагрузки между моделями
- Увеличьте пропускную способность сервисов с высокой нагрузкой
      `;
      break;
      
    case AnalysisType.TRENDS:
      content = `
## Анализ трендов использования LLM моделей

### Текущие показатели использования
- Всего запросов: ${totalRequests.toLocaleString()}
- Использовано токенов: ${totalTokens.toLocaleString()}
- Общие затраты: $${totalCost.toFixed(2)}

### Прогноз использования
- При сохранении текущей динамики, ожидаемые затраты на следующий месяц: $${(totalCost * 1.15).toFixed(2)} (рост на 15%)
- Прогнозируемое увеличение использования токенов: ${(totalTokens * 1.2).toLocaleString()} (рост на 20%)

### Рекомендации по масштабированию
1. **Инфраструктура**: Увеличьте вычислительные ресурсы в соответствии с прогнозируемым ростом
2. **Бюджет**: Запланируйте увеличение бюджета на LLM сервисы
3. **Оптимизация**: Внедрите стратегии оптимизации для снижения стоимости при увеличении объема

### Наиболее востребованные модели
${llmUsage.sort((a, b) => b.requestCount - a.requestCount).slice(0, 3).map(model => 
  `- **${model.model}**: ${model.requestCount.toLocaleString()} запросов (${(model.requestCount / totalRequests * 100).toFixed(1)}% от общего числа)`
).join('\n')}
      `;
      break;
      
    case AnalysisType.ALERTS:
      content = `
## Анализ проблемных зон и предупреждений

### Статус сервисов
${problemServices.length === 0 
  ? '✅ Все сервисы работают в штатном режиме' 
  : problemServices.map(service => 
      `⚠️ **${service.serviceName}**: ${service.status === 'degraded' ? 'Снижена производительность' : 'Сервис недоступен'}
      - Последнее обновление: ${new Date(service.lastUpdated).toLocaleString()}
      ${service.details?.latestError ? `- Ошибка: ${service.details.latestError}` : ''}
      ${service.details?.queueLength ? `- Размер очереди: ${service.details.queueLength} запросов` : ''}`
    ).join('\n\n')
}

### Проблемы производительности
${llmUsage
  .filter(model => model.avgResponseTime > 2)
  .map(model => `🐢 **${model.model}**: Высокое время ответа (${model.avgResponseTime.toFixed(2)} сек)`)
  .join('\n')}
${llmUsage.filter(model => model.avgResponseTime > 2).length === 0 ? '✅ Все модели работают с нормальной скоростью ответа' : ''}

### Потенциальные проблемы со стоимостью
${llmUsage
  .filter(model => model.cost > 50)
  .map(model => `💰 **${model.model}**: Высокие затраты ($${model.cost.toFixed(2)})`)
  .join('\n')}
${llmUsage.filter(model => model.cost > 50).length === 0 ? '✅ Нет моделей с чрезмерно высокими затратами' : ''}

### Рекомендации
1. ${problemServices.length > 0 ? 'Необходимо проверить и перезапустить проблемные сервисы' : 'Продолжайте мониторинг сервисов для раннего выявления проблем'}
2. ${llmUsage.filter(model => model.avgResponseTime > 2).length > 0 ? 'Оптимизируйте запросы к моделям с высоким временем ответа' : 'Поддерживайте текущую оптимизацию запросов'}
3. ${llmUsage.filter(model => model.cost > 50).length > 0 ? 'Рассмотрите внедрение квот на использование дорогих моделей' : 'Продолжайте контролировать затраты на использование моделей'}
      `;
      break;
      
    case AnalysisType.COMPREHENSIVE:
      content = `
## Комплексный анализ использования LLM моделей

### Общий обзор
- Всего запросов: ${totalRequests.toLocaleString()}
- Использовано токенов: ${totalTokens.toLocaleString()}
- Общие затраты: $${totalCost.toFixed(2)}
- Среднее время ответа: ${avgResponseTime.toFixed(2)} сек
- Количество сервисов: ${llmStatus.length}
- Количество моделей: ${llmUsage.length}

### Статус инфраструктуры
${problemServices.length === 0 
  ? '✅ Все сервисы работают в штатном режиме' 
  : `⚠️ ${problemServices.length} из ${llmStatus.length} сервисов имеют проблемы`
}

### Оптимизация затрат
1. Определены модели с высокими затратами: ${llmUsage.filter(m => m.cost > 50).length > 0 ? 'Да' : 'Нет'}
2. Рекомендуется оптимизация размера промптов и структуры запросов
3. Возможная экономия при оптимизации: до 25% ($${(totalCost * 0.25).toFixed(2)})

### Анализ трендов
1. Прогнозируемый рост использования: 15-20% в месяц
2. Наиболее востребованные модели: ${llmUsage.sort((a, b) => b.requestCount - a.requestCount).slice(0, 2).map(m => m.model).join(', ')}
3. Необходимость масштабирования: ${totalRequests > 10000 ? 'Высокая' : 'Средняя'}

### Потенциальные проблемы
1. Производительность: ${llmUsage.filter(m => m.avgResponseTime > 2).length > 0 ? 'Обнаружены модели с высоким временем ответа' : 'Нет проблем'}
2. Доступность: ${problemServices.length > 0 ? 'Есть проблемные сервисы' : 'Все сервисы доступны'}
3. Стоимость: ${llmUsage.filter(m => m.cost > 50).length > 0 ? 'Обнаружены модели с высокими затратами' : 'Затраты в пределах нормы'}

### Ключевые рекомендации
1. **Оптимизация**: Внедрить кэширование и оптимизацию промптов
2. **Масштабирование**: Подготовить инфраструктуру к прогнозируемому росту
3. **Мониторинг**: Усилить мониторинг проблемных сервисов
4. **Бюджетирование**: Пересмотреть бюджет с учетом роста использования
      `;
      break;
  }
  
  return {
    success: true,
    analysisType,
    content,
    metadata: {
      generationMethod: "fallback",
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Обработчик запросов на анализ данных мониторинга
 * @param request Запрос на анализ
 */
export async function handleAnalysisRequest(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  const { llmUsage, llmStatus, analysisType, userId } = request;
  
  return await analyzeMonitoringData(
    { llmUsage, llmStatus },
    analysisType,
    userId
  );
}