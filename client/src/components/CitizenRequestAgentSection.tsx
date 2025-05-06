import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Bot, Sparkles, Settings2, UserRound, FileCheck } from 'lucide-react';

import AgentButtonOrderConfig from './AgentButtonOrderConfig';
import AgentSelectionDialog from './AgentSelectionDialog';
import RAGSourceSelector from './RAGSourceSelector';
import AgentActionButtons from './AgentActionButtons';
import AgentResultCard, { AgentResultData } from './AgentResultCard';

interface CitizenRequestAgentSectionProps {
  requestId: number;
  requestText?: string;
  requestTitle?: string;
  requestType?: string;
  canEdit?: boolean;
}

const CitizenRequestAgentSection: React.FC<CitizenRequestAgentSectionProps> = ({
  requestId,
  requestText = '',
  requestTitle = 'Обращение граждан',
  requestType = 'general',
  canEdit = true
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('actions');
  const { toast } = useToast();

  // Загрузка результатов работы агентов
  const { data: agentResults, isLoading: isResultsLoading } = useQuery({
    queryKey: ['citizen-request-agent-results', requestId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/citizen-requests/${requestId}/agent-results`);
        if (!response.ok) {
          throw new Error('Failed to fetch agent results');
        }
        return response.json();
      } catch (error) {
        console.warn('Error loading agent results:', error);
        return [];
      }
    }
  });

  // Мутация для запуска обработки агентом
  const processWithAgentMutation = useMutation({
    mutationFn: async ({ agentId, actionType }: { agentId: number, actionType: string }) => {
      const response = await fetch(`/api/citizen-requests/${requestId}/process-with-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentId,
          actionType,
          text: requestText,
          requestType
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to process with agent');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citizen-request-agent-results', requestId] });
      toast({
        title: "Обработка завершена",
        description: "Обращение успешно обработано AI-агентом"
      });
      setIsProcessing(false);
      // Переключаемся на вкладку результатов
      setActiveTab('results');
    },
    onError: (error) => {
      console.error('Error processing with agent:', error);
      toast({
        title: "Ошибка обработки",
        description: "Не удалось обработать обращение AI-агентом",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  });

  // Обработчик запуска агента
  const handleAgentAction = async (agentId: number, agentName: string, actionType: string) => {
    try {
      setIsProcessing(true);
      toast({
        title: "Обработка обращения",
        description: `Агент ${agentName} обрабатывает обращение...`
      });
      
      await processWithAgentMutation.mutate({ agentId, actionType });
    } catch (error) {
      console.error('Error processing with agent:', error);
      setIsProcessing(false);
      
      toast({
        title: "Ошибка обработки",
        description: `Не удалось обработать обращение агентом ${agentName}`,
        variant: "destructive"
      });
    }
  };

  // Обработчик отзыва о результате
  const handleFeedback = async (resultId: number, feedback: "positive" | "negative") => {
    try {
      await fetch(`/api/citizen-requests/${requestId}/agent-results/${resultId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ feedback })
      });
      
      toast({
        title: "Отзыв сохранен",
        description: "Спасибо за ваш отзыв! Он поможет улучшить работу AI-агентов."
      });
    } catch (error) {
      console.error('Error saving feedback:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить отзыв",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span>AI-ассистенты</span>
        </CardTitle>
        <CardDescription>
          Используйте ИИ-агентов для автоматической обработки обращений граждан
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="actions" className="flex items-center gap-1">
                <Sparkles className="h-4 w-4" />
                <span>Действия</span>
              </TabsTrigger>
              <TabsTrigger value="results" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>Результаты</span>
                {agentResults && agentResults.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary text-primary-foreground w-5 h-5 flex items-center justify-center text-xs">
                    {agentResults.length}
                  </span>
                )}
              </TabsTrigger>
              {canEdit && (
                <TabsTrigger value="settings" className="flex items-center gap-1">
                  <Settings2 className="h-4 w-4" />
                  <span>Настройки</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>
          
          <TabsContent value="actions">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <AgentActionButtons 
                  pageType="citizen_requests"
                  entityId={requestId}
                  onAgentAction={handleAgentAction}
                  showSettings={false}
                  isProcessing={isProcessing}
                  actionTypes={[
                    { id: "classify", label: "Классифицировать", icon: <FileCheck className="h-4 w-4 mr-1" /> },
                    { id: "respond", label: "Предложить ответ", icon: <UserRound className="h-4 w-4 mr-1" /> },
                    { id: "summarize", label: "Сделать резюме", icon: <FileText className="h-4 w-4 mr-1" /> },
                    { id: "full", label: "Полная обработка", icon: <Sparkles className="h-4 w-4 mr-1" /> }
                  ]}
                />
              </div>
              
              {isProcessing && (
                <div className="flex items-center justify-center py-6">
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">
                      AI-агент обрабатывает обращение...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="results">
            <div className="space-y-4">
              {isResultsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : agentResults && agentResults.length > 0 ? (
                <div className="space-y-4">
                  {agentResults.map((result: AgentResultData) => (
                    <AgentResultCard 
                      key={`${result.agentId}-${result.timestamp}`}
                      data={result}
                      onFeedback={(feedback) => handleFeedback(result.agentId, feedback)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2" />
                  <p>Нет результатов обработки</p>
                  <p className="text-sm">Используйте AI-агентов для анализа обращения</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('actions')}
                    className="mt-4"
                  >
                    Перейти к действиям
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          {canEdit && (
            <TabsContent value="settings">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Настройки AI-агентов</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Настройте AI-агентов и источники данных для обработки обращений граждан
                  </p>
                  
                  <div className="flex flex-wrap gap-3 mb-4">
                    <AgentButtonOrderConfig pageType="citizen_requests" />
                    <AgentSelectionDialog 
                      entityType="citizen_request" 
                      entityId={requestId}
                      buttonLabel="Выбрать агентов"
                      dialogTitle="Выбор AI-агентов для обращений"
                      dialogDescription="Выберите AI-агентов, которые будут использоваться для обработки обращений граждан"
                    />
                    <RAGSourceSelector 
                      isGlobal={false} 
                      entityType="citizen_request"
                      entityId={requestId}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Правила обработки обращений</h3>
                  <p className="text-sm text-muted-foreground">
                    AI-агенты используют интеллектуальные алгоритмы для:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                    <li>Классификации типа обращения и определения ведомства</li>
                    <li>Извлечения персональных данных и ключевых требований</li>
                    <li>Подготовки предварительного ответа на обращение</li>
                    <li>Предложения задач и действий по обращению</li>
                    <li>Поиска аналогичных обращений и релевантной информации</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CitizenRequestAgentSection;