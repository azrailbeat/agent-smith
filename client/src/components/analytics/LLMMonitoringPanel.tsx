import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, RefreshCw, Lightbulb, PieChart, LineChart, BarChart, TrendingUp } from "lucide-react";
import { AIModelAnalysis } from "./AIModelAnalysis";

// Типы для данных мониторинга
interface TimeSeriesData {
  timePoints: string[];
  responseTimeSeries: number[];
  costSeries: number[];
  tokensSeries: number[];
  requestsSeries: number[];
}

interface ModelData {
  [model: string]: TimeSeriesData;
}

interface ModelStats {
  [model: string]: {
    totalRequests: number;
    totalTokens: number;
    avgResponseTime: number;
    totalCost: number;
    errorRate: number;
  }
}

interface AnalysisResult {
  overview: string;
  insights: string[];
  recommendations: string[];
  anomalies?: {
    description: string;
    severity: "low" | "medium" | "high";
    affectedModel: string;
    date: string;
    metric: string;
  }[];
}

// Демо-данные для визуализации
const demoModelData: ModelData = {
  "gpt-4o": {
    timePoints: [...Array(14)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      return date.toISOString().split('T')[0];
    }),
    responseTimeSeries: [1.2, 1.1, 1.3, 1.4, 1.5, 1.2, 1.1, 1.3, 1.2, 1.4, 1.3, 1.2, 1.1, 1.0],
    costSeries: [2.5, 2.8, 3.1, 3.3, 2.9, 3.0, 3.2, 3.5, 3.6, 3.4, 3.2, 3.0, 2.9, 2.7],
    tokensSeries: [1500, 1600, 1800, 1900, 1750, 1600, 1700, 1900, 2000, 1950, 1800, 1700, 1650, 1600],
    requestsSeries: [120, 125, 140, 150, 145, 130, 135, 155, 165, 160, 145, 135, 130, 125]
  },
  "gpt-3.5-turbo": {
    timePoints: [...Array(14)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      return date.toISOString().split('T')[0];
    }),
    responseTimeSeries: [0.6, 0.5, 0.7, 0.8, 0.7, 0.6, 0.5, 0.7, 0.6, 0.8, 0.7, 0.6, 0.5, 0.4],
    costSeries: [0.5, 0.6, 0.7, 0.8, 0.7, 0.6, 0.7, 0.9, 0.8, 0.7, 0.6, 0.5, 0.5, 0.4],
    tokensSeries: [2500, 2600, 2800, 2900, 2750, 2600, 2700, 2900, 3000, 2950, 2800, 2700, 2650, 2600],
    requestsSeries: [320, 325, 340, 350, 345, 330, 335, 355, 365, 360, 345, 335, 330, 325]
  },
  "claude-3-sonnet": {
    timePoints: [...Array(14)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      return date.toISOString().split('T')[0];
    }),
    responseTimeSeries: [0.8, 0.7, 0.9, 1.0, 0.9, 0.8, 0.7, 0.9, 0.8, 1.0, 0.9, 0.8, 0.7, 0.6],
    costSeries: [1.5, 1.6, 1.7, 1.8, 1.7, 1.6, 1.7, 1.9, 1.8, 1.7, 1.6, 1.5, 1.5, 1.4],
    tokensSeries: [2000, 2100, 2300, 2400, 2250, 2100, 2200, 2400, 2500, 2450, 2300, 2200, 2150, 2100],
    requestsSeries: [220, 225, 240, 250, 245, 230, 235, 255, 265, 260, 245, 235, 230, 225]
  },
  "llama-2-70b": {
    timePoints: [...Array(14)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      return date.toISOString().split('T')[0];
    }),
    responseTimeSeries: [0.9, 0.8, 1.0, 1.1, 1.0, 0.9, 0.8, 1.0, 0.9, 1.1, 1.0, 0.9, 0.8, 0.7],
    costSeries: [0.2, 0.3, 0.4, 0.5, 0.4, 0.3, 0.4, 0.6, 0.5, 0.4, 0.3, 0.2, 0.2, 0.1],
    tokensSeries: [1800, 1900, 2100, 2200, 2050, 1900, 2000, 2200, 2300, 2250, 2100, 2000, 1950, 1900],
    requestsSeries: [180, 185, 200, 210, 205, 190, 195, 215, 225, 220, 205, 195, 190, 185]
  }
};

// Статистика по моделям
const demoModelStats: ModelStats = {
  "gpt-4o": {
    totalRequests: 1850,
    totalTokens: 25000,
    avgResponseTime: 1.2,
    totalCost: 42.4,
    errorRate: 0.5
  },
  "gpt-3.5-turbo": {
    totalRequests: 4500,
    totalTokens: 38000,
    avgResponseTime: 0.6,
    totalCost: 8.5,
    errorRate: 0.2
  },
  "claude-3-sonnet": {
    totalRequests: 3200,
    totalTokens: 32000,
    avgResponseTime: 0.85,
    totalCost: 22.6,
    errorRate: 0.3
  },
  "llama-2-70b": {
    totalRequests: 2600,
    totalTokens: 28000,
    avgResponseTime: 0.95,
    totalCost: 4.2,
    errorRate: 0.8
  }
};

// Анализ данных ИИ
const demoAnalysisResult: AnalysisResult = {
  overview: "На основе анализа данных за последние 14 дней выявлена общая стабильная работа систем ИИ с небольшими колебаниями в производительности. Наблюдается тенденция к снижению времени отклика для моделей GPT-4o и GPT-3.5-Turbo.",
  insights: [
    "GPT-3.5-Turbo демонстрирует наилучшее соотношение цена/качество с самым низким временем отклика (0.6 сек) и стоимостью ($0.02 за запрос).",
    "GPT-4o обрабатывает наиболее сложные запросы, что отражается в более высоком среднем времени отклика (1.2 сек).",
    "Claude 3 Sonnet показывает стабильную производительность с низким уровнем ошибок (0.3%).",
    "Llama-2-70b имеет наименьшую стоимость использования, но самый высокий уровень ошибок (0.8%)."
  ],
  recommendations: [
    "Рассмотрите возможность увеличения использования GPT-3.5-Turbo для стандартных задач для оптимизации затрат.",
    "Оптимизируйте промпты для GPT-4o, чтобы уменьшить количество токенов и снизить стоимость.",
    "Внедрите кэширование ответов для частых запросов, чтобы снизить общее количество запросов к API.",
    "Рассмотрите возможность создания гибридной системы, использующей различные модели в зависимости от сложности задачи."
  ],
  anomalies: [
    {
      description: "Необычное увеличение времени отклика",
      severity: "medium",
      affectedModel: "gpt-4o",
      date: "2025-05-08",
      metric: "response_time"
    },
    {
      description: "Повышенный уровень ошибок",
      severity: "high",
      affectedModel: "llama-2-70b",
      date: "2025-05-10",
      metric: "error_rate"
    }
  ]
};

export function LLMMonitoringPanel() {
  const [timeRange, setTimeRange] = useState("14d");
  const [selectedModel, setSelectedModel] = useState("all");
  const [loading, setLoading] = useState(false);
  const [modelData, setModelData] = useState<ModelData>(demoModelData);
  const [modelStats, setModelStats] = useState<ModelStats>(demoModelStats);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>(demoAnalysisResult);
  const [showAPIKeyWarning, setShowAPIKeyWarning] = useState(true);
  
  const refreshData = async () => {
    setLoading(true);
    
    try {
      // В реальном приложении здесь был бы API-запрос
      // const response = await fetch('/api/llm-analytics/data');
      // const data = await response.json();
      // setModelData(data.modelData);
      // setModelStats(data.modelStats);
      
      // Имитация задержки загрузки данных
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error fetching LLM monitoring data:", error);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, selectedModel]);
  
  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case "low": return "text-yellow-500";
      case "medium": return "text-orange-500";
      case "high": return "text-red-600";
      default: return "text-slate-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold">Мониторинг LLM</h2>
          <p className="text-muted-foreground">
            Анализ производительности и использования моделей искусственного интеллекта
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select
            value={timeRange}
            onValueChange={setTimeRange}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 часа</SelectItem>
              <SelectItem value="7d">7 дней</SelectItem>
              <SelectItem value="14d">14 дней</SelectItem>
              <SelectItem value="30d">30 дней</SelectItem>
              <SelectItem value="90d">90 дней</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={selectedModel}
            onValueChange={setSelectedModel}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Модель" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все модели</SelectItem>
              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
              <SelectItem value="llama-2-70b">Llama 2 70B</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={refreshData} 
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </Button>
        </div>
      </div>
      
      {showAPIKeyWarning && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            API ключ OpenAI не настроен. Система работает в демонстрационном режиме с тестовыми данными.{' '}
            <Button 
              variant="link" 
              className="p-0 h-auto text-amber-800 underline"
              onClick={() => window.location.href = "/settings"}
            >
              Настроить в Настройках
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего запросов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(modelStats).reduce((sum, stat) => sum + stat.totalRequests, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              За последние {timeRange === "24h" ? "24 часа" : timeRange === "7d" ? "7 дней" : timeRange === "14d" ? "14 дней" : timeRange === "30d" ? "30 дней" : "90 дней"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Использовано токенов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(modelStats).reduce((sum, stat) => sum + stat.totalTokens, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Примерно {Math.round(Object.values(modelStats).reduce((sum, stat) => sum + stat.totalTokens, 0) / 750).toLocaleString()} страниц текста
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Общая стоимость</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Object.values(modelStats).reduce((sum, stat) => sum + stat.totalCost, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Среднее ${(Object.values(modelStats).reduce((sum, stat) => sum + stat.totalCost, 0) / 30).toFixed(2)} в день
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Среднее время отклика</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(Object.values(modelStats).reduce((sum, stat) => sum + stat.avgResponseTime, 0) / Object.values(modelStats).length).toFixed(2)} сек
            </div>
            <p className="text-xs text-muted-foreground">
              От {Math.min(...Object.values(modelStats).map(stat => stat.avgResponseTime)).toFixed(2)} до {Math.max(...Object.values(modelStats).map(stat => stat.avgResponseTime)).toFixed(2)} сек
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="models">Модели</TabsTrigger>
          <TabsTrigger value="analysis">AI Анализ</TabsTrigger>
          <TabsTrigger value="anomalies">Аномалии</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Использование по моделям</CardTitle>
              <CardDescription>
                Количество запросов и токенов, обработанных каждой моделью
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {/* Здесь будет график использования моделей */}
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <BarChart className="mx-auto h-16 w-16 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-500">
                      [Здесь будет график использования моделей]
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Время отклика</CardTitle>
                <CardDescription>
                  Среднее время ответа моделей в секундах
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {/* Здесь будет график времени отклика */}
                  <div className="flex items-center justify-center h-full text-center">
                    <div>
                      <LineChart className="mx-auto h-12 w-12 text-slate-400" />
                      <p className="mt-2 text-sm text-slate-500">
                        [Здесь будет график времени отклика]
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Стоимость</CardTitle>
                <CardDescription>
                  Расходы на использование API по дням
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {/* Здесь будет график расходов */}
                  <div className="flex items-center justify-center h-full text-center">
                    <div>
                      <LineChart className="mx-auto h-12 w-12 text-slate-400" />
                      <p className="mt-2 text-sm text-slate-500">
                        [Здесь будет график расходов]
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="models" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(modelStats).map(([model, stats]) => (
              <Card key={model}>
                <CardHeader>
                  <CardTitle>{model}</CardTitle>
                  <CardDescription>
                    Статистика использования модели
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Запросы:</span>
                      <span className="font-medium">{stats.totalRequests.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Токены:</span>
                      <span className="font-medium">{stats.totalTokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Среднее время ответа:</span>
                      <span className="font-medium">{stats.avgResponseTime} сек</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Стоимость:</span>
                      <span className="font-medium">${stats.totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Уровень ошибок:</span>
                      <span className={`font-medium ${stats.errorRate > 0.5 ? 'text-red-500' : 'text-green-500'}`}>
                        {(stats.errorRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="analysis" className="space-y-6">
          <AIModelAnalysis 
            analysisResult={analysisResult}
            refreshAnalysis={refreshData}
            loading={loading}
          />
        </TabsContent>
        
        <TabsContent value="anomalies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Обнаруженные аномалии</CardTitle>
              <CardDescription>
                Необычные паттерны в производительности моделей
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysisResult.anomalies && analysisResult.anomalies.length > 0 ? (
                <div className="space-y-4">
                  {analysisResult.anomalies.map((anomaly, index) => (
                    <div key={index} className="flex items-start border-b pb-4 last:border-0 last:pb-0">
                      <div className={`mr-4 mt-1 rounded-full p-1 ${getSeverityColor(anomaly.severity)} bg-opacity-20`}>
                        <AlertCircle className={`h-5 w-5 ${getSeverityColor(anomaly.severity)}`} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-medium">{anomaly.description}</span>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            anomaly.severity === 'high' ? 'bg-red-100 text-red-800' : 
                            anomaly.severity === 'medium' ? 'bg-orange-100 text-orange-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {anomaly.severity.charAt(0).toUpperCase() + anomaly.severity.slice(1)}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600">
                          <span className="font-medium">Модель:</span> {anomaly.affectedModel}
                        </div>
                        <div className="text-sm text-slate-600">
                          <span className="font-medium">Дата:</span> {anomaly.date}
                        </div>
                        <div className="text-sm text-slate-600">
                          <span className="font-medium">Метрика:</span> {
                            anomaly.metric === 'response_time' ? 'Время отклика' :
                            anomaly.metric === 'error_rate' ? 'Уровень ошибок' :
                            anomaly.metric === 'cost' ? 'Стоимость' : anomaly.metric
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-center">
                  <div>
                    <TrendingUp className="mx-auto h-12 w-12 text-green-500 opacity-50" />
                    <p className="mt-4 text-lg font-medium text-slate-600">
                      Аномалий не обнаружено
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Все системы работают в пределах нормальных параметров
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}