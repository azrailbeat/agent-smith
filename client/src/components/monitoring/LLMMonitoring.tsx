import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CircleAlert, Database, Server, Cpu, BarChart } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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
 * Компонент мониторинга LLM моделей
 * Отображает статус и производительность LLM сервисов
 */
export const LLMMonitoring = () => {
  // Запрос статуса LLM сервисов
  const { data: services = [], isLoading: isLoadingServices } = useQuery<ServiceStatus[]>({
    queryKey: ['/api/system/llm-status'],
    // В демо-режиме используем тестовые данные
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/system/llm-status');
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch LLM status');
        return [];
      }
    },
    refetchInterval: 30000 // Обновляем каждые 30 секунд
  });

  // Запрос использования моделей
  const { data: usage = [], isLoading: isLoadingUsage } = useQuery<ModelUsage[]>({
    queryKey: ['/api/system/llm-usage'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/system/llm-usage');
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch LLM usage');
        return [];
      }
    },
    refetchInterval: 60000 // Обновляем каждую минуту
  });

  // Функция для получения цвета статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'down':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Функция для получения имени статуса
  const getStatusName = (status: string): string => {
    switch (status) {
      case 'healthy':
        return 'Работает';
      case 'degraded':
        return 'Замедление';
      case 'down':
        return 'Недоступен';
      default:
        return 'Неизвестно';
    }
  };

  // Функция для преобразования числа в форматированную строку
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  // Функция форматирования денежных значений
  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD' }).format(num);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Статус LLM сервисов */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="mr-2 h-5 w-5" /> Статус LLM сервисов
            </CardTitle>
            <CardDescription>
              Текущий статус и производительность сервисов искусственного интеллекта
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingServices ? (
                <div className="flex items-center justify-center p-4">
                  <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : services.length > 0 ? (
                services.map((service, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-medium">{service.serviceName}</div>
                      <Badge className={getStatusColor(service.status)}>
                        {getStatusName(service.status)}
                      </Badge>
                    </div>

                    {service.details && (
                      <div className="space-y-3 mt-2">
                        {service.details.queueLength !== undefined && (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Количество запросов в очереди</span>
                              <span className="font-medium">{service.details.queueLength}</span>
                            </div>
                            <Progress value={Math.min(service.details.queueLength * 10, 100)} className="h-2" />
                          </div>
                        )}

                        {service.details.gpuUtilization !== undefined && (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Загрузка GPU</span>
                              <span className="font-medium">{service.details.gpuUtilization}%</span>
                            </div>
                            <Progress 
                              value={service.details.gpuUtilization} 
                              className={`h-2 ${service.details.gpuUtilization > 80 ? 'bg-red-500' : service.details.gpuUtilization > 60 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                            />
                          </div>
                        )}

                        {service.details.avgResponseTime !== undefined && (
                          <div className="flex justify-between text-sm">
                            <span>Среднее время ответа</span>
                            <span className="font-medium">{service.details.avgResponseTime.toFixed(2)} сек</span>
                          </div>
                        )}

                        {service.details.requestsPerMinute !== undefined && (
                          <div className="flex justify-between text-sm">
                            <span>Запросов в минуту</span>
                            <span className="font-medium">{service.details.requestsPerMinute.toFixed(2)}</span>
                          </div>
                        )}

                        {service.details.latestError && (
                          <div className="mt-2 p-2 bg-red-50 text-red-800 text-sm rounded border border-red-200">
                            <div className="flex items-start">
                              <CircleAlert className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                              <span>{service.details.latestError}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground mt-3">
                      Обновлено: {new Date(service.lastUpdated).toLocaleString('ru-RU')}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Информация о сервисах недоступна
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              <Server className="mr-2 h-4 w-4" /> Проверить сервисы
            </Button>
          </CardFooter>
        </Card>

        {/* Использование и расходы */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="mr-2 h-5 w-5" /> Использование и расходы
            </CardTitle>
            <CardDescription>
              Статистика использования моделей и расходы на токены
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingUsage ? (
                <div className="flex items-center justify-center p-4">
                  <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : usage.length > 0 ? (
                <div className="space-y-4">
                  {usage.map((model, index) => (
                    <div key={index} className="p-4 rounded-lg border">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">{model.model}</h4>
                        <Badge variant="outline">{formatNumber(model.requestCount)} запросов</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div>
                          <div className="text-sm text-muted-foreground">Токенов использовано</div>
                          <div className="font-semibold">{formatNumber(model.tokensUsed)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Стоимость</div>
                          <div className="font-semibold">{formatCurrency(model.cost)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Ср. время ответа</div>
                          <div className="font-semibold">{model.avgResponseTime.toFixed(2)} сек</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Цена за 1K токенов</div>
                          <div className="font-semibold">
                            {formatCurrency(model.tokensUsed > 0 ? (model.cost / model.tokensUsed) * 1000 : 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Суммарная статистика */}
                  <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                    <div className="font-medium text-lg mb-2">Итого за период</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Всего запросов</div>
                        <div className="font-semibold">
                          {formatNumber(usage.reduce((acc, model) => acc + model.requestCount, 0))}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Всего токенов</div>
                        <div className="font-semibold">
                          {formatNumber(usage.reduce((acc, model) => acc + model.tokensUsed, 0))}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Общая стоимость</div>
                        <div className="font-semibold text-primary">
                          {formatCurrency(usage.reduce((acc, model) => acc + model.cost, 0))}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Ср. время ответа</div>
                        <div className="font-semibold">
                          {usage.length > 0
                            ? (usage.reduce((acc, model) => acc + model.avgResponseTime, 0) / usage.length).toFixed(2)
                            : '0.00'} сек
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Информация об использовании недоступна
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              <Cpu className="mr-2 h-4 w-4" /> Подробная статистика
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
