import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Bot, Database, User, MoreHorizontal, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

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

  // Фильтруем агентов и оставляем только основных ключевых
  const citizenRequestAgents = agents.filter(agent => 
    agent.type === "citizen_requests" && 
    // Оставляем только ключевого агента (640) и удаляем все остальные дубликаты
    agent.id === 640
  );

  // Мутация для обработки обращения агентом
  const processWithAgentMutation = useMutation({
    mutationFn: (agentId: number) => {
      return apiRequest('POST', `/api/citizen-requests/${request.id}/process-with-agent`, { agentId, action: 'full' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
      toast({
        title: "Обращение обработано",
        description: "Обращение успешно обработано ИИ агентом",
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
  
  // Мутация для автоматической обработки
  const autoProcessMutation = useMutation({
    mutationFn: (agentId: number) => {
      return apiRequest('POST', `/api/citizen-requests/${request.id}/process-with-agent`, { agentId, action: 'auto' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
      toast({
        title: "Авто-обработка",
        description: "Обращение успешно обработано в автоматическом режиме",
      });
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error("Error auto-processing request:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось выполнить автоматическую обработку",
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
      className={`mb-2 bg-white rounded border-l-[3px] ${priorityBorderColors[request.priority] || 'border-l-gray-300'} border border-gray-200 ${isDragging ? "shadow-lg rotate-1" : "shadow-sm"} hover:shadow-md transition-all duration-200`}
      onClick={onClick}
    >
      <div className="p-2.5">
        {/* Заголовок и приоритет */}
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-medium text-xs line-clamp-1 max-w-[75%]">
            {request.subject || request.title || "Без темы"}
          </h4>
          <Badge className={`${priorityColors[request.priority]} text-[10px] px-1.5 py-0 h-4`} variant="outline">
            {request.priority || 'Обычный'}
          </Badge>
        </div>
        
        {/* Имя заявителя */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-1">
            {getStatusIcon()}
            <span className="text-xs text-gray-700 font-medium truncate max-w-[90%]">
              {request.fullName}
            </span>
          </div>
          <div className="flex-shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full" onClick={e => e.stopPropagation()}>
                  <MoreHorizontal className="h-2.5 w-2.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-1.5" side="bottom" align="end">
                <div className="space-y-1">
                  {/* Меню действий */}
                  <div className="text-[10px] font-bold text-muted-foreground mb-1">Действия</div>
                  
                  {/* Кнопка автообработки */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start text-[10px] h-6 mb-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAutoProcess) {
                        onAutoProcess(request);
                      }
                    }}
                    disabled={isProcessing}
                  >
                    <RefreshCw className="h-2.5 w-2.5 mr-1.5" />
                    Авто-обработка
                  </Button>
                  
                  {/* Назначить агента */}
                  <div className="text-[10px] font-bold text-muted-foreground mt-1.5 mb-1">Назначить агенту</div>
                  <div className="grid grid-cols-1 gap-0.5">
                    {citizenRequestAgents.map(agent => (
                      <Button 
                        key={agent.id} 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-[10px] h-6"
                        onClick={(e) => handleProcessWithAgent(agent.id, e)}
                        disabled={isProcessing}
                      >
                        <Bot className="h-2.5 w-2.5 mr-1.5" />
                        {agent.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        {/* Индикаторы статуса в одну строку */}
        <div className="flex flex-wrap gap-1 mb-2">
          {request.aiProcessed && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 text-[10px] flex items-center px-1 h-4 border-purple-200">
              <Bot className="h-2.5 w-2.5 mr-0.5" /> ИИ
            </Badge>
          )}
          {request.blockchainHash && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 text-[10px] flex items-center px-1 h-4 border-blue-200">
              <Database className="h-2.5 w-2.5 mr-0.5" /> Блокчейн
            </Badge>
          )}
          {assignedAgent && (
            <Badge variant="outline" className="bg-green-50 text-green-700 text-[10px] flex items-center px-1 h-4 border-green-200">
              <User className="h-2.5 w-2.5 mr-0.5" />
              {assignedAgent.name.split(' ')[0]}
            </Badge>
          )}
          {request.assignedTo && !assignedAgent && (
            <Badge variant="outline" className="bg-green-50 text-green-700 text-[10px] flex items-center px-1 h-4 border-green-200">
              <User className="h-2.5 w-2.5 mr-0.5" /> Назначено
            </Badge>
          )}
          {request.category && (
            <Badge variant="outline" className="bg-gray-50 text-gray-700 text-[10px] border-gray-200 h-4 px-1">
              {request.category}
            </Badge>
          )}
          {request.aiSuggestion && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 text-[10px] flex items-center px-1 h-4 border-amber-200">
              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Результат
            </Badge>
          )}
        </div>
        
        {/* Отображение результатов AI обработки */}
        {(request.aiProcessed || request.aiClassification || request.aiSuggestion) && (
          <div className="bg-amber-50 p-1.5 rounded text-[10px] text-amber-800 mb-2 border border-amber-200">
            <div className="font-medium mb-0.5 flex items-center">
              <Bot className="h-2.5 w-2.5 mr-1" /> 
              Результат обработки:
            </div>
            
            {/* Отображаем классификацию */}
            {request.aiClassification && (
              <div className="mb-1">
                <span className="font-semibold">Категория:</span> {request.aiClassification}
              </div>
            )}
            
            {/* Отображаем рекомендации */}
            {request.aiSuggestion && (
              <div className="line-clamp-2">
                <span className="font-semibold">Рекомендация:</span> {request.aiSuggestion}
              </div>
            )}
            
            {/* Если есть только aiProcessed но нет результатов */}
            {request.aiProcessed && !request.aiClassification && !request.aiSuggestion && (
              <div className="text-gray-600 italic">
                Обработано ИИ, ожидание результатов...
              </div>
            )}
          </div>
        )}
        
        {/* Кнопки для обработки ИИ внизу карточки */}
        {!request.aiProcessed && citizenRequestAgents.length > 0 && (
          <div className="flex justify-between gap-2 mb-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-[10px] h-6 border-dashed border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              onClick={(e) => {
                e.stopPropagation();
                if (citizenRequestAgents.length > 0) {
                  handleProcessWithAgent(citizenRequestAgents[0].id, e);
                }
              }}
              disabled={isProcessing}
            >
              <Bot className="h-2.5 w-2.5 mr-1.5" />
              {isProcessing ? "Обработка..." : "Обработать ИИ"}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full text-[10px] h-6 border-dashed border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
              onClick={(e) => {
                e.stopPropagation();
                if (citizenRequestAgents.length > 0) {
                  setIsProcessing(true);
                  autoProcessMutation.mutate(citizenRequestAgents[0].id);
                }
              }}
              disabled={isProcessing}
            >
              <RefreshCw className="h-2.5 w-2.5 mr-1.5" />
              {isProcessing ? "Обработка..." : "Авто-обработка"}
            </Button>
          </div>
        )}
        
        {/* Футер карточки */}
        <div className="flex justify-between items-center text-[10px] text-gray-500 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <span className="text-gray-400">ID: {request.id}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-2.5 w-2.5" />
            {new Date(request.createdAt).toLocaleDateString("ru-RU")}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrelloStyleRequestCard;