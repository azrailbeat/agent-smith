import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

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
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [modelUsage, setModelUsage] = useState<ModelUsage[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  const [refreshTimestamp, setRefreshTimestamp] = useState(new Date());

  // Загрузка данных о статусе сервисов
  useEffect(() => {
    const fetchServicesStatus = async () => {
      setIsLoadingServices(true);
      try {
        const response = await axios.get('/api/system/llm-status');
        setServices(response.data);
      } catch (error) {
        console.error('Ошибка при загрузке статуса сервисов:', error);
      } finally {
        setIsLoadingServices(false);
      }
    };

    const fetchModelUsage = async () => {
      setIsLoadingUsage(true);
      try {
        const response = await axios.get('/api/system/llm-usage');
        setModelUsage(response.data);
      } catch (error) {
        console.error('Ошибка при загрузке данных по использованию моделей:', error);
      } finally {
        setIsLoadingUsage(false);
      }
    };

    fetchServicesStatus();
    fetchModelUsage();
  }, [refreshTimestamp]);

  // Обновление данных
  const handleRefresh = () => {
    setRefreshTimestamp(new Date());
  };

  // Очистка кэша
  const handleClearCache = async () => {
    try {
      const response = await axios.post('/api/system/llm-maintenance', { action: 'clear_cache' });
      if (response.data.success) {
        alert(response.data.message);
        handleRefresh();
      }
    } catch (error) {
      console.error('Ошибка при очистке кэша:', error);
    }
  };

  // Перезапуск сервисов
  const handleRestartServices = async () => {
    try {
      const response = await axios.post('/api/system/llm-maintenance', { action: 'restart_services' });
      if (response.data.success) {
        alert(response.data.message);
        handleRefresh();
      }
    } catch (error) {
      console.error('Ошибка при перезапуске сервисов:', error);
    }
  };

  // Получение иконки статуса
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU');
    } catch (e) {
      return dateString;
    }
  };

  // Форматирование числа токенов
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)} млн`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)} тыс`;
    }
    return tokens.toString();
  };

  // Подготовка данных для графиков
  const usageChartData = modelUsage.map(item => ({
    name: item.model,
    tokens: item.tokensUsed,
    cost: item.cost,
    requests: item.requestCount
  }));

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопки действий */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Общий статус LLM сервисов</h3>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" /> Обновить
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearCache}>
            Очистить кэш
          </Button>
          <Button variant="outline" size="sm" onClick={handleRestartServices}>
            Перезапустить сервисы
          </Button>
        </div>
      </div>

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="status">Статус сервисов</TabsTrigger>
          <TabsTrigger value="usage">Использование</TabsTrigger>
          <TabsTrigger value="performance">Производительность</TabsTrigger>
        </TabsList>

        {/* Вкладка статуса сервисов */}
        <TabsContent value="status">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {isLoadingServices ? (
              <div className="col-span-3 flex justify-center items-center h-40">
                <div className="text-center">
                  <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-2"></div>
                  <p>Загрузка данных...</p>
                </div>
              </div>
            ) : (
              services.map((service) => (
                <Card key={service.serviceName} className={`
                  ${service.status === 'healthy' ? 'border-green-200' : ''}
                  ${service.status === 'degraded' ? 'border-amber-200' : ''}
                  ${service.status === 'down' ? 'border-red-200' : ''}
                `}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{service.serviceName}</CardTitle>
                      {getStatusIcon(service.status)}
                    </div>
                    <CardDescription>
                      Последнее обновление: {formatDate(service.lastUpdated)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {service.details?.avgResponseTime !== undefined && (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-muted-foreground">Среднее время ответа</span>
                            <span className="font-medium">{service.details.avgResponseTime} сек</span>
                          </div>
                          <Progress value={Math.min(service.details.avgResponseTime * 50, 100)} className="h-2" />
                        </div>
                      )}
                      
                      {service.details?.requestsPerMinute !== undefined && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Запросов в минуту</span>
                          <span>{service.details.requestsPerMinute}</span>
                        </div>
                      )}
                      
                      {service.details?.queueLength !== undefined && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Длина очереди</span>
                          <span>{service.details.queueLength}</span>
                        </div>
                      )}
                      
                      {service.details?.gpuUtilization !== undefined && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Загрузка GPU</span>
                          <span>{service.details.gpuUtilization}%</span>
                        </div>
                      )}
                      
                      {service.details?.latestError && (
                        <div className="mt-2 p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                          {service.details.latestError}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Вкладка использования моделей */}
        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>Статистика использования моделей</CardTitle>
              <CardDescription>Данные о токенах, запросах и расходах на каждую модель</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsage ? (
                <div className="flex justify-center items-center h-40">
                  <div className="text-center">
                    <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-2"></div>
                    <p>Загрузка данных...</p>
                  </div>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Модель</TableHead>
                        <TableHead className="text-right">Токены</TableHead>
                        <TableHead className="text-right">Запросы</TableHead>
                        <TableHead className="text-right">Кост</TableHead>
                        <TableHead className="text-right">Время ответа</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modelUsage.map((model) => (
                        <TableRow key={model.model}>
                          <TableCell className="font-medium">{model.model}</TableCell>
                          <TableCell className="text-right">{formatTokens(model.tokensUsed)}</TableCell>
                          <TableCell className="text-right">{model.requestCount}</TableCell>
                          <TableCell className="text-right">${model.cost.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{model.avgResponseTime.toFixed(2)} сек</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="mt-8 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={usageChartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" orientation="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="tokens" name="Токены" fill="#8884d8" />
                        <Bar yAxisId="right" dataKey="cost" name="Затраты ($)" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка производительности */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Производительность моделей</CardTitle>
              <CardDescription>Данные о времени ответа и количестве запросов</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsage ? (
                <div className="flex justify-center items-center h-40">
                  <div className="text-center">
                    <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-2"></div>
                    <p>Загрузка данных...</p>
                  </div>
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={usageChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="requests" name="Количество запросов" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="mt-6">
                <h4 className="font-medium mb-2">Статистика производительности по моделям</h4>
                <div className="space-y-4">
                  {modelUsage.map((model) => (
                    <div key={model.model}>
                      <div className="flex justify-between items-center mb-1">
                        <span>{model.model}</span>
                        <span className="text-sm text-muted-foreground">Среднее время ответа: {model.avgResponseTime.toFixed(2)} сек</span>
                      </div>
                      <Progress value={100 - (model.avgResponseTime / 3 * 100)} className="h-2" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
