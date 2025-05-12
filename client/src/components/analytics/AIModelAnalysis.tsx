import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Lightbulb, TrendingUp, ArrowUpRightFromCircle, BrainCircuit, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface AIModelAnalysisProps {
  analysisResult: AnalysisResult;
  refreshAnalysis: () => void;
  loading: boolean;
}

export function AIModelAnalysis({ analysisResult, refreshAnalysis, loading }: AIModelAnalysisProps) {
  const [activeTab, setActiveTab] = useState("overview");
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <div className="flex items-center">
          <BrainCircuit className="h-6 w-6 mr-2 text-blue-600" />
          <h3 className="text-xl font-bold">AI Анализ производительности моделей</h3>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshAnalysis}
          disabled={loading}
          className="mt-2 sm:mt-0"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Обновить анализ
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="optimization">Оптимизация</TabsTrigger>
          <TabsTrigger value="trends">Тренды</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card className="border-blue-100">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-lg flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-blue-600" />
                Ключевые выводы
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 mb-4">{analysisResult.overview}</p>
              
              <h4 className="font-medium text-base mb-2">Основные инсайты:</h4>
              <ul className="space-y-2 mb-4">
                {analysisResult.insights.map((insight, index) => (
                  <li key={index} className="flex">
                    <span className="text-blue-500 mr-2">•</span>
                    <span className="text-slate-700">{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          
          {analysisResult.anomalies && analysisResult.anomalies.length > 0 && (
            <Alert className="border-amber-300 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Обнаружено {analysisResult.anomalies.length} аномалий в работе моделей. 
                Проверьте вкладку "Аномалии" для получения подробной информации.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        
        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                Рекомендации по оптимизации
              </CardTitle>
              <CardDescription>
                Предложения по улучшению производительности и снижению затрат на использование LLM моделей
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {analysisResult.recommendations.map((recommendation, index) => (
                  <li key={index} className="border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start">
                      <div className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-slate-700">{recommendation}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="bg-slate-50 rounded-b-lg border-t flex justify-between items-center">
              <p className="text-sm text-slate-600">
                Рекомендации основаны на анализе данных за последние 14 дней
              </p>
              <Badge variant="outline" className="bg-white">
                <ArrowUpRightFromCircle className="h-3 w-3 mr-1" />
                Потенциальная экономия: ~15%
              </Badge>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Сравнение моделей</CardTitle>
              <CardDescription>
                Анализ эффективности различных моделей по стоимости и производительности
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-base mb-3">По соотношению цена/качество:</h4>
                  <ol className="space-y-2">
                    <li className="flex justify-between items-center border-b pb-2">
                      <div className="flex items-center">
                        <Badge className="bg-green-100 text-green-800 border-0 mr-2">1</Badge>
                        <span className="font-medium">GPT-3.5 Turbo</span>
                      </div>
                      <Badge variant="outline" className="bg-white">Отличное</Badge>
                    </li>
                    <li className="flex justify-between items-center border-b pb-2">
                      <div className="flex items-center">
                        <Badge className="bg-green-50 text-green-800 border-0 mr-2">2</Badge>
                        <span className="font-medium">Llama 2 70B</span>
                      </div>
                      <Badge variant="outline" className="bg-white">Хорошее</Badge>
                    </li>
                    <li className="flex justify-between items-center border-b pb-2">
                      <div className="flex items-center">
                        <Badge className="bg-slate-100 text-slate-800 border-0 mr-2">3</Badge>
                        <span className="font-medium">Claude 3 Sonnet</span>
                      </div>
                      <Badge variant="outline" className="bg-white">Среднее</Badge>
                    </li>
                    <li className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Badge className="bg-slate-100 text-slate-800 border-0 mr-2">4</Badge>
                        <span className="font-medium">GPT-4o</span>
                      </div>
                      <Badge variant="outline" className="bg-white">Низкое</Badge>
                    </li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-medium text-base mb-3">По качеству ответов:</h4>
                  <ol className="space-y-2">
                    <li className="flex justify-between items-center border-b pb-2">
                      <div className="flex items-center">
                        <Badge className="bg-green-100 text-green-800 border-0 mr-2">1</Badge>
                        <span className="font-medium">GPT-4o</span>
                      </div>
                      <Badge variant="outline" className="bg-white">Превосходное</Badge>
                    </li>
                    <li className="flex justify-between items-center border-b pb-2">
                      <div className="flex items-center">
                        <Badge className="bg-green-50 text-green-800 border-0 mr-2">2</Badge>
                        <span className="font-medium">Claude 3 Sonnet</span>
                      </div>
                      <Badge variant="outline" className="bg-white">Очень хорошее</Badge>
                    </li>
                    <li className="flex justify-between items-center border-b pb-2">
                      <div className="flex items-center">
                        <Badge className="bg-slate-100 text-slate-800 border-0 mr-2">3</Badge>
                        <span className="font-medium">GPT-3.5 Turbo</span>
                      </div>
                      <Badge variant="outline" className="bg-white">Хорошее</Badge>
                    </li>
                    <li className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Badge className="bg-slate-100 text-slate-800 border-0 mr-2">4</Badge>
                        <span className="font-medium">Llama 2 70B</span>
                      </div>
                      <Badge variant="outline" className="bg-white">Среднее</Badge>
                    </li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                Тренды и прогнозы
              </CardTitle>
              <CardDescription>
                Анализ тенденций и прогнозы использования LLM моделей
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-base mb-3">Обнаруженные тренды:</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <div className="text-blue-500 mr-2 mt-1">•</div>
                      <div>
                        <p className="text-slate-700">
                          <span className="font-medium">Снижение времени отклика:</span> Наблюдается общая тенденция к снижению времени отклика для моделей GPT-4o и GPT-3.5-Turbo на 10-15% за последние 2 недели.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="text-blue-500 mr-2 mt-1">•</div>
                      <div>
                        <p className="text-slate-700">
                          <span className="font-medium">Увеличение использования GPT-3.5-Turbo:</span> Количество запросов к GPT-3.5-Turbo увеличилось на 22% по сравнению с предыдущим периодом.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="text-blue-500 mr-2 mt-1">•</div>
                      <div>
                        <p className="text-slate-700">
                          <span className="font-medium">Снижение уровня ошибок:</span> Общий уровень ошибок снизился на 15% благодаря оптимизации промптов и улучшению обработки ошибок.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="text-blue-500 mr-2 mt-1">•</div>
                      <div>
                        <p className="text-slate-700">
                          <span className="font-medium">Стабилизация расходов:</span> Несмотря на увеличение количества запросов, общие расходы остаются стабильными благодаря оптимизации использования моделей.
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-base mb-3">Прогнозы на следующий период:</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <div className="text-green-500 mr-2 mt-1">•</div>
                      <div>
                        <p className="text-slate-700">
                          <span className="font-medium">Прогноз использования:</span> Ожидается увеличение общего количества запросов на 15-20% в следующем месяце.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="text-green-500 mr-2 mt-1">•</div>
                      <div>
                        <p className="text-slate-700">
                          <span className="font-medium">Прогноз расходов:</span> При сохранении текущей стратегии использования моделей, ожидается увеличение расходов на 5-10%.
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="text-green-500 mr-2 mt-1">•</div>
                      <div>
                        <p className="text-slate-700">
                          <span className="font-medium">Прогноз производительности:</span> Ожидается дальнейшее снижение времени отклика на 5-7% благодаря оптимизации запросов.
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 rounded-b-lg border-t flex justify-between items-center">
              <p className="text-sm text-slate-600">
                Прогнозы основаны на анализе исторических данных и текущих тенденций
              </p>
              <Badge variant="outline" className="bg-white">
                <RefreshCw className="h-3 w-3 mr-1" />
                Обновлено: 12 мая 2025
              </Badge>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}