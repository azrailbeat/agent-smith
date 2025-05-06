import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Bot, Database, User, MoreHorizontal, CheckCircle2, AlertCircle } from 'lucide-react';

interface CitizenRequest {
  id: number;
  fullName: string;
  contactInfo: string;
  requestType: string;
  subject: string;
  description: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: number;
  aiProcessed?: boolean;
  aiClassification?: string;
  aiSuggestion?: string;
  responseText?: string;
  closedAt?: Date;
  attachments?: string[];
  title?: string;
  content?: string;
  category?: string;
  source?: string;
  summary?: string;
  blockchainHash?: string;
  completedAt?: Date;
  citizenInfo?: {
    name?: string;
    contact?: string;
    address?: string;
    iin?: string;
  };
}

interface Agent {
  id: number;
  name: string;
  type: string;
  description?: string;
}

interface TrelloStyleRequestCardProps {
  request: CitizenRequest;
  priorityBorderColors: { [key: string]: string };
  priorityColors: { [key: string]: string };
  onClick: () => void;
  draggableProps: any;
  dragHandleProps: any;
  innerRef: React.Ref<HTMLDivElement>;
  isDragging: boolean;
}

const TrelloStyleRequestCard: React.FC<TrelloStyleRequestCardProps> = ({
  request,
  priorityBorderColors,
  priorityColors,
  onClick,
  draggableProps,
  dragHandleProps,
  innerRef,
  isDragging
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Загружаем список агентов для обработки обращений
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    refetchOnWindowFocus: false,
  });

  // Фильтруем агентов по типу (citizen_requests)
  const citizenRequestAgents = agents.filter(agent => 
    agent.type === "citizen_requests" && agent.id !== 174 && agent.id !== 202
  );

  // Мутация для обработки обращения агентом
  const processWithAgentMutation = useMutation({
    mutationFn: (agentId: number) => {
      return apiRequest('POST', `/api/citizen-requests/${request.id}/process-with-agent`, { agentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
      toast({
        title: "Обращение обработано",
        description: "Обращение передано на обработку ИИ агенту",
      });
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error("Error processing request with agent:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обработать обращение",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  // Обработка клика по кнопке агента
  const handleProcessWithAgent = (agentId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем открытие диалога с деталями
    setIsProcessing(true);
    processWithAgentMutation.mutate(agentId);
  };

  // Определяем, есть ли дополнительная информация о гражданине
  const hasCitizenInfo = request.citizenInfo && (
    request.citizenInfo.name || 
    request.citizenInfo.contact || 
    request.citizenInfo.address || 
    request.citizenInfo.iin
  );

  // Получаем имя агента, если запрос был назначен
  const assignedAgent = request.assignedTo ? 
    agents.find(agent => agent.id === request.assignedTo) : null;

  // Определяем иконку статуса для обращения
  const getStatusIcon = () => {
    if (request.status === 'completed') {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    } else if (request.status === 'waiting' || request.status === 'in_progress' || request.status === 'inProgress') {
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    }
    return null;
  };

  return (
    <div
      ref={innerRef}
      {...draggableProps}
      {...dragHandleProps}
      className={`mb-3 bg-white rounded-md border-l-4 ${priorityBorderColors[request.priority] || 'border-l-gray-300'} border border-gray-200 ${isDragging ? "shadow-lg" : "shadow-sm"} hover:shadow-md transition-all duration-200`}
      onClick={onClick}
    >
      <div className="p-3">
        {/* Заголовок карточки */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">
              {request.fullName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full" onClick={e => e.stopPropagation()}>
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" side="bottom" align="end">
                <div className="space-y-1">
                  {/* Меню действий */}
                  <div className="text-xs font-bold text-muted-foreground mb-1">Действия</div>
                  {/* Назначить агента */}
                  <div className="text-xs font-bold text-muted-foreground mt-2 mb-1">Назначить агенту</div>
                  <div className="grid grid-cols-1 gap-1">
                    {citizenRequestAgents.map(agent => (
                      <Button 
                        key={agent.id} 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-xs h-7"
                        onClick={(e) => handleProcessWithAgent(agent.id, e)}
                        disabled={isProcessing}
                      >
                        <Bot className="h-3 w-3 mr-2" />
                        {agent.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        {/* ID и категория карточки */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">ID: {request.id}</span>
          </div>
          <Badge className={`${priorityColors[request.priority]}`} variant="outline">
            {request.priority || 'Обычный'}
          </Badge>
        </div>
        
        {/* Содержимое карточки */}
        <h4 className="font-medium text-sm mb-2 line-clamp-1 pb-1 border-b border-gray-100">
          {request.subject || request.title || "Без темы"}
        </h4>
        
        <p className="text-xs text-gray-600 line-clamp-2 mb-2 bg-gray-50 p-2 rounded border border-gray-100 shadow-sm">
          {request.description || request.content || "Без описания"}
        </p>

        {/* Дополнительные метки */}
        <div className="flex flex-wrap gap-1 mb-2">
          {request.category && (
            <Badge variant="outline" className="bg-gray-50 text-gray-700 text-xs border-gray-200 shadow-sm">
              {request.category}
            </Badge>
          )}
          {request.aiClassification && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs border-purple-200 shadow-sm">
              {request.aiClassification}
            </Badge>
          )}
        </div>
        
        {/* Дополнительная информация (резюме AI) */}
        {request.summary && (
          <div className="bg-blue-50 p-2 rounded-md text-xs text-blue-800 mb-2 border border-blue-100 shadow-sm">
            <span className="font-medium">Резюме: </span>
            <span className="line-clamp-2">{request.summary}</span>
          </div>
        )}

        {/* Футер карточки */}
        <div className="flex justify-between items-center text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(request.createdAt).toLocaleDateString("ru-RU")}
            </div>
            
            {request.contactInfo && (
              <div className="flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-gray-300"></span>
                <span title={request.contactInfo} className="truncate max-w-[80px]">{request.contactInfo}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {/* Индикаторы */}
            {request.aiProcessed && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs flex items-center px-1 h-5 border-purple-200 shadow-sm">
                <Bot className="h-3 w-3 mr-1" /> ИИ
              </Badge>
            )}
            {request.blockchainHash && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs flex items-center px-1 h-5 border-blue-200 shadow-sm">
                <Database className="h-3 w-3 mr-1" />
              </Badge>
            )}
            {assignedAgent && (
              <Badge variant="outline" className="bg-green-50 text-green-700 text-xs flex items-center px-1 h-5 border-green-200 shadow-sm">
                <User className="h-3 w-3 mr-1" />
                {assignedAgent.name.split(' ')[0]}
              </Badge>
            )}
            {request.assignedTo && !assignedAgent && (
              <Badge variant="outline" className="bg-green-50 text-green-700 text-xs flex items-center px-1 h-5 border-green-200 shadow-sm">
                <User className="h-3 w-3 mr-1" />
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrelloStyleRequestCard;