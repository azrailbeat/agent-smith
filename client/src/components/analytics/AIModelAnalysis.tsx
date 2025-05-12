import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bot, BrainCircuit, Sparkles, LineChart, ArrowUpRight, AlertTriangle, Cpu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ModelUsage {
  model: string;
  tokensUsed: number;
  cost: number;
  requestCount: number;
  avgResponseTime: number;
}

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

interface AIModelAnalysisProps {
  llmUsage?: ModelUsage[];
  llmStatus?: ServiceStatus[];
  isLoading?: boolean;
}

const AIModelAnalysis: React.FC<AIModelAnalysisProps> = ({ 
  llmUsage = [], 
  llmStatus = [], 
  isLoading = false 
}) => {
  const { toast } = useToast();
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'optimization' | 'trends' | 'alerts'>('optimization');
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Функция для запуска ИИ-анализа данных мониторинга LLM
  const runAIAnalysis = async (mode: 'optimization' | 'trends' | 'alerts') => {
    setAnalysisDialogOpen(true);
    setAnalysisMode(mode);
    setAnalysisLoading(true);
    
    try {
      // Имитируем запрос к серверу (в реальном приложении здесь будет запрос к API)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Подготавливаем данные для анализа
      let analysisText = '';
      
      if (mode === 'optimization') {
        const totalCost = llmUsage.reduce((sum, model) => sum + model.cost, 0);
        const totalTokens = llmUsage.reduce((sum, model) => sum + model.tokensUsed, 0);
        const avgResponseTime = llmUsage.reduce((sum, model) => sum + model.avgResponseTime, 0) / (llmUsage.length || 1);
        
        const modelWithHighestCost = [...llmUsage].sort((a, b) => b.cost - a.cost)[0];
        const modelWithLongestResponse = [...llmUsage].sort((a, b) => b.avgResponseTime - a.avgResponseTime)[0];
        
        analysisText = `
## Анализ оптимизации использования LLM моделей

На основе анализа использования моделей выявлены следующие возможности для оптимизации:

### Общие рекомендации

1. **Оптимизация стоимости**: Общие затраты на LLM составляют $${totalCost.toFixed(2)}. Основные расходы приходятся на модель **${modelWithHighestCost?.model || 'N/A'}** ($${modelWithHighestCost?.cost.toFixed(2) || 0}).

2. **Оптимизация производительности**: Средняя скорость ответа всех моделей составляет ${avgResponseTime.toFixed(2)} секунд, что ${avgResponseTime > 1.5 ? 'выше рекомендуемого порога в 1.5 секунды' : 'в пределах нормы'}.

3. **Рациональное использование токенов**: Всего использовано ${totalTokens.toLocaleString()} токенов. Рекомендуется рассмотреть следующие оптимизации:
   - Сокращение размера промптов
   - Использование сжатых версий моделей для задач, не требующих высокой точности
   - Реализация кэширования для часто запрашиваемых промптов

### Распределение ресурсов по сервисам

${llmStatus.map(service => 
  `- **${service.serviceName}**: ${
    service.status === 'healthy' ? '✅ Стабильный' : 
    service.status === 'degraded' ? '⚠️ Требует оптимизации' : 
    '❌ Требует немедленного вмешательства'
  }${
    service.details?.gpuUtilization && service.details.gpuUtilization > 80 
      ? ' - высокая загрузка GPU (' + service.details.gpuUtilization + '%)' 
      : ''
  }`
).join('\n')}

### Конкретные рекомендации

1. ${modelWithHighestCost?.model || 'N/A'}: Рассмотрите замену на более экономичную модель для задач, не требующих высокой точности.

2. ${modelWithLongestResponse?.model || 'N/A'}: Оптимизируйте запросы к модели для повышения скорости ответа.

3. Рассмотрите возможность ввода квот на использование наиболее дорогих моделей.
`;
      } else if (mode === 'trends') {
        analysisText = `
## Анализ трендов использования LLM моделей

### Тенденции использования 

1. **Изменение моделей**: Наблюдается ${Math.random() > 0.5 ? 'рост' : 'снижение'} использования больших моделей и ${Math.random() > 0.5 ? 'рост' : 'снижение'} использования специализированных моделей.

2. **Распределение запросов**: 
   - Высоконагруженные модели: ${llmUsage.filter(m => m.requestCount > 1000).map(m => m.model).join(', ') || 'Отсутствуют'}
   - Низконагруженные модели: ${llmUsage.filter(m => m.requestCount < 100).map(m => m.model).join(', ') || 'Отсутствуют'}

3. **Прогноз затрат**: При сохранении текущей динамики использования, прогнозируемые затраты на следующий месяц составят $${(llmUsage.reduce((sum, model) => sum + model.cost, 0) * 1.15).toFixed(2)} (рост на 15%).

### Рекомендации по тренду использования

1. **Масштабирование ресурсов**: На основе тренда роста использования рекомендуется рассмотреть возможность увеличения вычислительных ресурсов.

2. **Оптимизация рабочей нагрузки**: Распределите нагрузку равномерно между моделями для предотвращения перегрузки отдельных экземпляров.

3. **Сезонные тренды**: На основе исторических данных, пик использования ожидается в часы: 10:00-12:00 и 14:00-16:00. Рекомендуется планировать техническое обслуживание вне этих периодов.
`;
      } else if (mode === 'alerts') {
        const problemServices = llmStatus.filter(s => s.status !== 'healthy');
        const highCostModels = llmUsage.filter(m => m.cost > 50);
        const slowModels = llmUsage.filter(m => m.avgResponseTime > 2);
        
        analysisText = `
## Анализ проблемных зон и предупреждения

### Проблемы в работе сервисов

${problemServices.length === 0 ? '✅ Все сервисы работают в штатном режиме' : 
  problemServices.map(service => 
    `⚠️ **${service.serviceName}**: ${service.status === 'degraded' ? 'Снижена производительность' : 'Сервис недоступен'}
    - Последнее обновление: ${new Date(service.lastUpdated).toLocaleString()}
    ${service.details?.latestError ? `- Ошибка: ${service.details.latestError}` : ''}
    ${service.details?.queueLength ? `- Размер очереди: ${service.details.queueLength} запросов` : ''}
    `
  ).join('\n')
}

### Потенциальные проблемы затрат

${highCostModels.length === 0 ? '✅ Нет моделей с высоким потреблением ресурсов' :
  highCostModels.map(model => 
    `💰 **${model.model}**: Высокие затраты ($${model.cost.toFixed(2)})
    - Использовано токенов: ${model.tokensUsed.toLocaleString()}
    - Количество запросов: ${model.requestCount.toLocaleString()}
    `
  ).join('\n')
}

### Проблемы производительности

${slowModels.length === 0 ? '✅ Все модели работают с приемлемой скоростью' :
  slowModels.map(model => 
    `🐢 **${model.model}**: Низкая скорость ответа (${model.avgResponseTime.toFixed(2)} сек)
    - Рекомендуемое время ответа: до 2 секунд
    `
  ).join('\n')
}

### Рекомендации

1. ${problemServices.length > 0 ? 'Требуется проверка и возможный перезапуск проблемных сервисов' : 'Продолжайте мониторинг сервисов'}

2. ${highCostModels.length > 0 ? 'Рассмотрите внедрение квот или ограничений для дорогостоящих моделей' : 'Текущие затраты на модели находятся в пределах нормы'}

3. ${slowModels.length > 0 ? 'Оптимизируйте работу медленных моделей путем увеличения вычислительных ресурсов или кэширования' : 'Поддерживайте текущую конфигурацию производительности'}
`;
      }
      
      setAnalysisResult(analysisText);
    } catch (error) {
      toast({
        title: 'Ошибка анализа',
        description: 'Не удалось выполнить ИИ-анализ данных',
        variant: 'destructive',
      });
      setAnalysisResult('Произошла ошибка при анализе данных');
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BrainCircuit className="h-5 w-5 mr-2" />
            Умный анализ LLM моделей
          </CardTitle>
          <CardDescription>
            Используйте ИИ для анализа работы и оптимизации LLM моделей
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                  </div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                    Оптимизация
                  </Badge>
                </div>
                <h3 className="text-lg font-medium mb-1">Оптимизация ресурсов</h3>
                <p className="text-sm text-neutral-600 mb-4">
                  Анализ стоимости и эффективности использования LLM моделей с рекомендациями по оптимизации
                </p>
                <Button 
                  className="w-full" 
                  onClick={() => runAIAnalysis('optimization')}
                  disabled={isLoading || llmUsage.length === 0}
                >
                  Анализировать <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <LineChart className="h-5 w-5 text-purple-600" />
                  </div>
                  <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                    Тренды
                  </Badge>
                </div>
                <h3 className="text-lg font-medium mb-1">Анализ трендов</h3>
                <p className="text-sm text-neutral-600 mb-4">
                  Выявление трендов использования LLM моделей и прогнозирование будущих потребностей
                </p>
                <Button 
                  className="w-full" 
                  onClick={() => runAIAnalysis('trends')}
                  disabled={isLoading || llmUsage.length === 0}
                >
                  Анализировать <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                    Предупреждения
                  </Badge>
                </div>
                <h3 className="text-lg font-medium mb-1">Проблемные зоны</h3>
                <p className="text-sm text-neutral-600 mb-4">
                  Выявление проблемных зон и потенциальных узких мест в работе LLM моделей
                </p>
                <Button 
                  className="w-full" 
                  onClick={() => runAIAnalysis('alerts')}
                  disabled={isLoading || llmStatus.length === 0}
                >
                  Анализировать <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Статистика использования */}
          {!isLoading && llmUsage.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <Card className="bg-neutral-50">
                <CardContent className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-500">Всего запросов</span>
                    <span className="text-2xl font-semibold">
                      {llmUsage.reduce((sum, model) => sum + model.requestCount, 0).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-neutral-50">
                <CardContent className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-500">Использовано токенов</span>
                    <span className="text-2xl font-semibold">
                      {llmUsage.reduce((sum, model) => sum + model.tokensUsed, 0).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-neutral-50">
                <CardContent className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-500">Общая стоимость</span>
                    <span className="text-2xl font-semibold">
                      ${llmUsage.reduce((sum, model) => sum + model.cost, 0).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-neutral-50">
                <CardContent className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-500">Ср. время ответа</span>
                    <span className="text-2xl font-semibold">
                      {(llmUsage.reduce((sum, model) => sum + model.avgResponseTime, 0) / llmUsage.length).toFixed(2)} с
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог с результатами анализа */}
      <Dialog open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Bot className="h-5 w-5 mr-2" />
              {analysisMode === 'optimization' ? 'Анализ оптимизации LLM моделей' : 
               analysisMode === 'trends' ? 'Анализ трендов использования LLM' : 
               'Анализ проблемных зон LLM'}
            </DialogTitle>
            <DialogDescription>
              ИИ-анализ использования и производительности LLM моделей
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {analysisLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mb-4"></div>
                <p className="text-neutral-600">Анализируем данные LLM моделей...</p>
              </div>
            ) : (
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ 
                  __html: analysisResult 
                    ? analysisResult
                        .replace(/\n/g, '<br>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/^(#{1,6})\s+(.+)$/gm, (_, level, text) => {
                          const l = level.length;
                          return `<h${l} class="text-${l === 1 ? 'xl' : l === 2 ? 'lg' : 'base'} font-semibold mb-2 mt-4">${text}</h${l}>`;
                        })
                    : 'Нет данных для отображения'
                }} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AIModelAnalysis;