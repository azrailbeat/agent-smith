import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { Bot, Tag, FileText, Lightbulb, AlertTriangle } from 'lucide-react';

interface CitizenRequest {
  id: number;
  fullName: string;
  contactInfo: string;
  requestType: string;
  subject: string;
  description: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  aiProcessed?: boolean;
  aiClassification?: string;
  aiSuggestion?: string;
  summary?: string;
}

interface Agent {
  id: number;
  name: string;
  type: string;
  description?: string;
}

interface CitizenRequestAgentSectionProps {
  request: CitizenRequest;
  onRequestProcess: (requestId: number, actionType: string) => Promise<any>;
  enabled: boolean;
}

const CitizenRequestAgentSection: React.FC<CitizenRequestAgentSectionProps> = ({
  request,
  onRequestProcess,
  enabled,
}) => {
  const [selectedAction, setSelectedAction] = useState<string>("classification");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Загрузка списка агентов
  const { data: agents = [], isLoading: isAgentsLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    refetchOnWindowFocus: false,
  });

  // Фильтруем агентов по типу (citizen_requests)
  const citizenRequestAgents = agents.filter(agent => 
    agent.type === "citizen_requests" && agent.id !== 174 && agent.id !== 202
  );

  // Обработка запроса
  const handleProcess = async () => {
    if (!enabled) return;
    
    setIsProcessing(true);
    try {
      await onRequestProcess(request.id, selectedAction);
    } catch (error) {
      console.error("Error processing request:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!enabled) {
    return (
      <Card className="bg-gray-50 border border-dashed">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
            <div>
              <h3 className="font-medium">ИИ-обработка отключена</h3>
              <p className="text-sm text-gray-500">
                Для обработки обращений включите ИИ-обработку в настройках страницы.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isAgentsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-indigo-500 rounded-full border-t-transparent"></div>
            <span className="ml-2">Загрузка агентов...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (citizenRequestAgents.length === 0) {
    return (
      <Card className="bg-gray-50 border border-dashed">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <Bot className="h-8 w-8 text-gray-400" />
            <div>
              <h3 className="font-medium">Нет доступных агентов</h3>
              <p className="text-sm text-gray-500">
                Создайте агента типа "citizen_requests" в разделе ИИ-Агенты.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Обработка с помощью ИИ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Выберите действие:</label>
              <Select
                value={selectedAction}
                onValueChange={setSelectedAction}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classification">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <span>Классификация</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="summarization">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Резюмирование</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="response_generation">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      <span>Генерация ответа</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleProcess}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                Обработка...
              </>
            ) : (
              <>
                <Bot className="h-4 w-4 mr-2" />
                {selectedAction === "classification" && "Классифицировать"}
                {selectedAction === "summarization" && "Создать резюме"}
                {selectedAction === "response_generation" && "Сформировать ответ"}
              </>
            )}
          </Button>

          {request.aiProcessed && (
            <div className="text-xs text-green-600 flex items-center">
              <Bot className="h-3 w-3 mr-1" />
              Это обращение уже было обработано с помощью ИИ. Повторная обработка перезапишет результаты.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CitizenRequestAgentSection;
