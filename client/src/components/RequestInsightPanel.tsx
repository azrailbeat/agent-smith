import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileCheck, Zap, Bot, Sparkles, Database as DatabaseIcon, Building, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RequestInsightPanelProps {
  requestId: number;
  agentResults: any[];
  compact?: boolean;
}

const RequestInsightPanel: React.FC<RequestInsightPanelProps> = ({
  requestId,
  agentResults,
  compact = false
}) => {
  // Если нет результатов обработки, не показываем панель
  if (!agentResults || agentResults.length === 0) {
    return null;
  }

  // Находим самый последний результат классификации
  const classificationResult = agentResults
    .filter(result => result.actionType === 'classification')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  // Находим самый последний результат резюмирования 
  const summaryResult = agentResults
    .filter(result => result.actionType === 'summarize')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  // Находим самый последний результат предложения ответа
  const responseResult = agentResults
    .filter(result => result.actionType === 'respond')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  // Находим самый последний результат блокчейн-записи
  const blockchainResult = agentResults
    .filter(result => result.actionType === 'blockchain')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  // Функция для парсинга JSON результата
  const parseResult = (result: any) => {
    try {
      if (!result) return null;
      if (typeof result.result === 'string') {
        return JSON.parse(result.result);
      }
      return result.result;
    } catch (e) {
      console.error('Error parsing result:', e);
      return null;
    }
  };

  // Парсим результаты
  const classificationData = parseResult(classificationResult);
  const summaryData = parseResult(summaryResult);
  const responseData = parseResult(responseResult);
  const blockchainData = parseResult(blockchainResult);
  
  // Рассчитываем общий уровень понимания (confidence)
  const confidenceScore = classificationData?.confidence || 0;
  const confidencePercent = Math.round(confidenceScore * 100);
  
  // Определяем цвет индикатора уверенности
  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'bg-green-500';
    if (score >= 0.7) return 'bg-blue-500';
    if (score >= 0.5) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // Получаем ключевые рекомендации
  const recommendations = [];
  if (responseData?.recommendation) {
    recommendations.push(responseData.recommendation);
  }
  
  if (compact) {
    // Компактный вид для карточки обращения
    return (
      <div className="mt-2">
        {classificationData && (
          <div className="mb-2">
            <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
              <span className="flex items-center">
                <Bot className="h-3 w-3 mr-1" /> Анализ AI
              </span>
              <span className="flex items-center">
                <span>{confidencePercent}/100</span>
              </span>
            </div>
            <Progress value={confidencePercent} className={`h-1.5 ${getConfidenceColor(confidenceScore)}`} />
          </div>
        )}
        
        {classificationData?.classification && (
          <div className="flex flex-wrap gap-1 mb-1">
            <Badge variant="outline" className="text-xs">
              <FileCheck className="h-3 w-3 mr-1" />
              {classificationData.classification}
            </Badge>
          </div>
        )}
        
        {(recommendations.length > 0 || summaryData?.keyPoints?.length > 0) && (
          <div className="text-xs text-muted-foreground truncate">
            <span className="font-medium">Рекомендация:</span> {recommendations[0] || summaryData?.keyPoints?.[0]}
          </div>
        )}
      </div>
    );
  }

  // Полный вид для детальной страницы
  return (
    <Card className="mb-4 overflow-hidden">
      <CardContent className="p-4">
        <Tabs defaultValue="analysis">
          <TabsList className="mb-4">
            <TabsTrigger value="analysis" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" /> Анализ
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs">
              <Zap className="h-3 w-3 mr-1" /> Рекомендации
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="analysis">
            <div className="space-y-3">
              {classificationData && (
                <div className="mb-4">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="font-medium flex items-center">
                      <Bot className="h-4 w-4 mr-1" /> Понимание обращения
                    </span>
                    <span className="flex items-center">
                      <span className="font-bold">{confidencePercent}</span>
                      <span className="text-muted-foreground">/100</span>
                    </span>
                  </div>
                  <Progress value={confidencePercent} className={`h-2 ${getConfidenceColor(confidenceScore)}`} />
                </div>
              )}
              
              {classificationData?.classification && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Тип обращения:</h4>
                  <Badge className="text-sm">
                    <FileCheck className="h-4 w-4 mr-1" />
                    {classificationData.classification}
                  </Badge>
                </div>
              )}
              
              {summaryData?.keyPoints && summaryData.keyPoints.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Ключевые моменты:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {summaryData.keyPoints.map((point: string, index: number) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {blockchainResult && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Сохранено в блокчейн:</h4>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <DatabaseIcon className="h-3 w-3 mr-1" />
                    Запись зафиксирована
                    {blockchainData?.transactionHash && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Хэш: {blockchainData.transactionHash.substring(0, 8)}...
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="recommendations">
            <div className="space-y-3">
              {responseData?.recommendation && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Рекомендуемое действие:</h4>
                  <p className="text-sm p-2 bg-muted rounded-md">{responseData.recommendation}</p>
                </div>
              )}
              
              {responseData?.nextSteps && responseData.nextSteps.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Следующие шаги:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {responseData.nextSteps.map((step: string, index: number) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {(classificationData?.department || classificationData?.assignTo) && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Маршрутизация:</h4>
                  {classificationData.department && (
                    <Badge variant="outline" className="mr-2 text-sm">
                      <Building className="h-3 w-3 mr-1" />
                      {classificationData.department}
                    </Badge>
                  )}
                  {classificationData.assignTo && (
                    <Badge variant="outline" className="text-sm">
                      <User className="h-3 w-3 mr-1" />
                      {classificationData.assignTo}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RequestInsightPanel;
