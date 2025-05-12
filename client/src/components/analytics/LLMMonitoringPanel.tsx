import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Server, AlertTriangle, RefreshCw, Zap, Clock, Cpu, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

const LLMMonitoringPanel: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('status');

  // Запрос статуса LLM сервисов
  const { data: llmStatus, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery<ServiceStatus[]>({
    queryKey: ['/api/system/llm-status'],
  });

  // Запрос использования LLM моделей
  const { data: llmUsage, isLoading: isLoadingUsage } = useQuery<ModelUsage[]>({
    queryKey: ['/api/system/llm-usage'],
  });

  // Обработка очистки кэша
  const handleClearCache = async () => {
    try {
      const response = await fetch('/api/system/llm-maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'clear_cache' }),
      });
      
      if (response.ok) {
        toast({
          title: 'Кэш очищен',
          description: 'Кэш LLM моделей успешно очищен',
        });
        refetchStatus();
      } else {
        throw new Error('Не удалось очистить кэш');
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось выполнить операцию очистки кэша',
        variant: 'destructive',
      });
    }
  };

  // Обработка перезапуска сервисов
  const handleRestartServices = async () => {
    try {
      const response = await fetch('/api/system/llm-maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'restart_services' }),
      });
      
      if (response.ok) {
        toast({
          title: 'Сервисы перезапущены',
          description: 'LLM сервисы успешно перезапущены',
        });
        refetchStatus();
      } else {
        throw new Error('Не удалось перезапустить сервисы');
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось выполнить операцию перезапуска сервисов',
        variant: 'destructive',
      });
    }
  };

  // Функция для форматирования чисел
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}М`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}К`;
    }
    return num.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h2 className="text-2xl font-semibold">Мониторинг LLM и аналитика</h2>
        <p className="text-muted-foreground">Мониторинг производительности и использования LLM-моделей</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Server className="h-5 w-5 mr-2" />
                Общий статус LLM сервисов
              </CardTitle>
              <CardDescription>
                Данные о статусе, производительности и затратах на использование AI моделей
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchStatus()}
                disabled={isLoadingStatus}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearCache}
              >
                Очистить кэш
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRestartServices}
              >
                Перезапустить сервисы
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="status">Статус сервисов</TabsTrigger>
              <TabsTrigger value="usage">Использование</TabsTrigger>
              <TabsTrigger value="performance">Производительность</TabsTrigger>
            </TabsList>
            
            <TabsContent value="status">
              {isLoadingStatus ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : !llmStatus || llmStatus.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <AlertTriangle className="h-12 w-12 text-neutral-300 mb-4" />
                  <p className="text-neutral-500">Нет данных для отображения</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {llmStatus.map((service, index) => (
                    <Card key={index} className="overflow-hidden border-t-4" 
                      style={{
                        borderTopColor: 
                          service.status === 'healthy' ? '#10B981' : 
                          service.status === 'degraded' ? '#F59E0B' : '#EF4444'
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-medium">{service.serviceName}</h3>
                          <Badge variant={
                            service.status === 'healthy' ? 'default' : 
                            service.status === 'degraded' ? 'outline' : 'destructive'
                          }>
                            {service.status === 'healthy' ? 'Работает' : 
                             service.status === 'degraded' ? 'Замедлена' : 'Недоступна'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3 text-sm">
                          {service.details?.queueLength !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Очередь запросов:</span>
                              <span className="font-medium">{service.details.queueLength}</span>
                            </div>
                          )}
                          
                          {service.details?.avgResponseTime !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Ср. время ответа:</span>
                              <span className="font-medium">{service.details.avgResponseTime.toFixed(2)} сек</span>
                            </div>
                          )}
                          
                          {service.details?.requestsPerMinute !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Запросов/мин:</span>
                              <span className="font-medium">{service.details.requestsPerMinute.toFixed(1)}</span>
                            </div>
                          )}
                          
                          {service.details?.gpuUtilization !== undefined && (
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between">
                                <span className="text-neutral-500">Загрузка GPU:</span>
                                <span className="font-medium">{service.details.gpuUtilization}%</span>
                              </div>
                              <Progress value={service.details.gpuUtilization} className="h-2" />
                            </div>
                          )}
                          
                          {service.details?.latestError && (
                            <div className="mt-3 text-xs p-2 bg-red-50 text-red-700 rounded border border-red-200">
                              <span className="flex items-center gap-1">
                                <AlertTriangle size={12} />
                                {service.details.latestError}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4 text-xs text-right text-neutral-500">
                          Обновлено: {new Date(service.lastUpdated).toLocaleTimeString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="usage">
              {isLoadingUsage ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : !llmUsage || llmUsage.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <AlertTriangle className="h-12 w-12 text-neutral-300 mb-4" />
                  <p className="text-neutral-500">Нет данных для отображения</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-neutral-700">
                    <thead className="text-xs uppercase bg-neutral-50">
                      <tr>
                        <th className="px-4 py-3">Модель</th>
                        <th className="px-4 py-3">Запросы</th>
                        <th className="px-4 py-3">Токенов</th>
                        <th className="px-4 py-3">Стоимость</th>
                        <th className="px-4 py-3">Ср. время ответа</th>
                        <th className="px-4 py-3">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {llmUsage.map((model, index) => (
                        <tr key={index} className="border-b hover:bg-neutral-50">
                          <td className="px-4 py-3 font-medium">{model.model}</td>
                          <td className="px-4 py-3">{model.requestCount.toLocaleString()}</td>
                          <td className="px-4 py-3">{formatNumber(model.tokensUsed)}</td>
                          <td className="px-4 py-3">${model.cost.toFixed(2)}</td>
                          <td className="px-4 py-3">{model.avgResponseTime.toFixed(2)} сек</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                                <Zap className="h-3 w-3 mr-1" />
                                Тест
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                История
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-medium text-neutral-900 bg-neutral-100">
                        <td className="px-4 py-3">Итого</td>
                        <td className="px-4 py-3">{llmUsage.reduce((sum, model) => sum + model.requestCount, 0).toLocaleString()}</td>
                        <td className="px-4 py-3">{formatNumber(llmUsage.reduce((sum, model) => sum + model.tokensUsed, 0))}</td>
                        <td className="px-4 py-3">${llmUsage.reduce((sum, model) => sum + model.cost, 0).toFixed(2)}</td>
                        <td className="px-4 py-3">-</td>
                        <td className="px-4 py-3">-</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="performance">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Распределение запросов</CardTitle>
                    <CardDescription>
                      Использование LLM моделей по запросам
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 flex items-center justify-center">
                    {isLoadingUsage ? (
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-50 rounded-md">
                        <Cpu className="h-12 w-12 text-neutral-300" />
                        <span className="ml-3 text-neutral-500">График распределения запросов</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Использование токенов</CardTitle>
                    <CardDescription>
                      Расход токенов по моделям
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 flex items-center justify-center">
                    {isLoadingUsage ? (
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-50 rounded-md">
                        <Database className="h-12 w-12 text-neutral-300" />
                        <span className="ml-3 text-neutral-500">График использования токенов</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default LLMMonitoringPanel;