import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bot, BrainCircuit, Sparkles, LineChart, ArrowUpRight, AlertTriangle, Cpu, BarChart2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { requestAIAnalysis, AnalysisType, ModelUsage, ServiceStatus } from '@/api/llm-analytics-api';

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
  const [analysisMode, setAnalysisMode] = useState<AnalysisType>(AnalysisType.OPTIMIZATION);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisMetadata, setAnalysisMetadata] = useState<any>(null);

  // Функция для запуска ИИ-анализа данных мониторинга LLM
  const runAIAnalysis = async (mode: AnalysisType) => {
    if (!llmUsage.length || !llmStatus.length) {
      toast({
        title: 'Недостаточно данных',
        description: 'Для анализа требуются данные о моделях и сервисах LLM',
        variant: 'destructive',
      });
      return;
    }
    
    setAnalysisDialogOpen(true);
    setAnalysisMode(mode);
    setAnalysisLoading(true);
    setAnalysisResult(null);
    setAnalysisMetadata(null);
    
    try {
      // Запрос к API для анализа данных
      const response = await requestAIAnalysis({
        llmUsage,
        llmStatus,
        analysisType: mode
      });
      
      if (response.success) {
        setAnalysisResult(response.content);
        setAnalysisMetadata(response.metadata);
      } else {
        throw new Error(response.metadata.error || 'Ошибка при выполнении анализа');
      }
    } catch (error) {
      console.error('Ошибка при анализе данных:', error);
      toast({
        title: 'Ошибка анализа',
        description: 'Не удалось выполнить ИИ-анализ данных. Проверьте наличие API ключа OpenAI в настройках.',
        variant: 'destructive',
      });
      setAnalysisResult('Произошла ошибка при анализе данных. Возможно, отсутствует API ключ OpenAI.');
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
                  onClick={() => runAIAnalysis(AnalysisType.OPTIMIZATION)}
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
                  onClick={() => runAIAnalysis(AnalysisType.TRENDS)}
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
                  onClick={() => runAIAnalysis(AnalysisType.ALERTS)}
                  disabled={isLoading || llmStatus.length === 0}
                >
                  Анализировать <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-4">
            <Card className="bg-gradient-to-br from-green-50 to-teal-50 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <BarChart2 className="h-5 w-5 text-green-600" />
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                    Комплексный анализ
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium mb-1">Полный анализ системы</h3>
                    <p className="text-sm text-neutral-600">
                      Комплексный ИИ-анализ всей системы с рекомендациями по оптимизации, выявлением трендов и предупреждений
                    </p>
                  </div>
                  <Button 
                    onClick={() => runAIAnalysis(AnalysisType.COMPREHENSIVE)}
                    disabled={isLoading || llmUsage.length === 0 || llmStatus.length === 0}
                    size="lg"
                    className="ml-4"
                  >
                    Запустить полный анализ <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
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