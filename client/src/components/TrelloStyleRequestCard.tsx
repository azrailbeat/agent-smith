import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Bot, Database, User, MoreHorizontal, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, MessageSquare, FileText, Clock, Edit, CreditCard } from 'lucide-react';

interface Activity {
  id: number;
  userId?: number;
  userName?: string;
  actionType: string;
  description: string;
  relatedId?: number;
  relatedType?: string;
  blockchainHash?: string;
  entityType?: string;
  entityId?: number;
  metadata?: any;
  action?: string;
  timestamp?: Date;
  createdAt: Date;
}

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
  activities?: Activity[];
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
  onAutoProcess?: (request: CitizenRequest) => void;
}

const TrelloStyleRequestCard: React.FC<TrelloStyleRequestCardProps> = ({
  request,
  priorityBorderColors,
  priorityColors,
  onClick,
  draggableProps,
  dragHandleProps,
  innerRef,
  isDragging,
  onAutoProcess
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
      return apiRequest('POST', `/api/citizen-requests/${request.id}/process-with-agent`, { agentId, actionType: 'full' });
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
      return apiRequest('POST', `/api/citizen-requests/${request.id}/process-with-agent`, { agentId, actionType: 'auto' });
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
      className={`mb-2 bg-white rounded-md border-l-[3px] ${priorityBorderColors[request.priority] || 'border-l-gray-300'} border border-gray-200 ${isDragging ? "shadow-lg rotate-1" : "shadow-sm"} hover:shadow-md transition-all duration-200`}
      onClick={onClick}
    >
      <div className="p-3">
        {/* Заголовок и меню */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`${priorityColors[request.priority]} text-[10px] px-1.5 py-0 h-4 mr-0.5`} variant="outline">
              {request.priority || 'medium'}
            </Badge>
            <h4 className="font-medium text-sm line-clamp-1 max-w-[75%]">
              {request.subject || request.title || "Без темы"}
            </h4>
          </div>
          
          <div className="flex-shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={e => e.stopPropagation()}>
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-2" side="bottom" align="end">
                <div className="space-y-1.5">
                  {/* Меню действий */}
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5">Действия</div>
                  
                  {/* Кнопка автообработки */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start text-[11px] h-7 mb-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAutoProcess) {
                        onAutoProcess(request);
                      }
                    }}
                    disabled={isProcessing}
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Авто-обработка
                  </Button>
                  
                  {/* Сохранить в блокчейн */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start text-[11px] h-7 mb-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Реализовать сохранение в блокчейн
                      toast({
                        title: "Сохранение",
                        description: "Запись о запросе сохранена в блокчейн",
                      });
                    }}
                  >
                    <Database className="h-3 w-3 mr-2" />
                    Сохранить в блокчейн
                  </Button>
                  
                  {/* Назначить агента */}
                  <div className="text-[11px] font-semibold text-slate-500 mt-2 mb-1.5">Назначить агенту</div>
                  <div className="grid grid-cols-1 gap-0.5">
                    {citizenRequestAgents.map(agent => (
                      <Button 
                        key={agent.id} 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-[11px] h-7"
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
        
        {/* Имя заявителя */}
        <div className="flex items-start mb-3">
          <span className="text-[12px] text-gray-700 truncate max-w-[95%] line-clamp-1">
            {request.fullName}
          </span>
        </div>
        
        {/* Индикаторы статуса в одну строку */}
        <div className="flex flex-wrap gap-1.5 mb-2">
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
          {request.aiClassification && (
            <Badge variant="outline" className="bg-gray-50 text-gray-700 text-[10px] border-gray-200 h-4 px-1">
              {request.aiClassification}
            </Badge>
          )}
          {request.aiSuggestion && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 text-[10px] flex items-center px-1 h-4 border-amber-200">
              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Результат
            </Badge>
          )}
        </div>
        
        {/* Отображение результатов AI обработки - в стиле Trello */}
        {(request.aiProcessed || request.aiClassification || request.aiSuggestion) && (
          <div className="bg-amber-50 p-2 rounded text-[11px] text-amber-900 mb-3 border border-amber-200 border-l-2 border-l-amber-400">
            <div className="font-semibold mb-1 flex items-center gap-1">
              <Bot className="h-3 w-3" /> 
              Результат обработки:
            </div>
            
            {/* Отображаем классификацию */}
            {request.aiClassification && (
              <div className="mb-1">
                <span className="font-semibold">Категория:</span> <span className="line-clamp-1">{request.aiClassification}</span>
              </div>
            )}
            
            {/* Отображаем рекомендации */}
            {request.aiSuggestion && (
              <div>
                <span className="font-semibold">Рекомендация:</span> <span className="line-clamp-2">{request.aiSuggestion}</span>
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
        
        {/* История действий с заявкой - как в Trello */}
        <div className="flex items-center gap-1.5 mb-2">
          <div className="bg-gray-100 rounded-full h-5 w-5 flex items-center justify-center">
            <User className="h-2.5 w-2.5 text-gray-600" />
          </div>
          <div className="text-[10px] text-gray-600">
            <span className="font-medium">Создано:</span> {new Date(request.createdAt).toLocaleDateString("ru-RU", {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})}
          </div>
        </div>
        
        {request.updatedAt && new Date(request.updatedAt).getTime() !== new Date(request.createdAt).getTime() && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="bg-blue-100 rounded-full h-5 w-5 flex items-center justify-center">
              <RefreshCw className="h-2.5 w-2.5 text-blue-600" />
            </div>
            <div className="text-[10px] text-gray-600">
              <span className="font-medium">Обновлено:</span> {new Date(request.updatedAt).toLocaleDateString("ru-RU", {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})}
            </div>
          </div>
        )}
        
        {request.aiProcessed && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="bg-purple-100 rounded-full h-5 w-5 flex items-center justify-center">
              <Bot className="h-2.5 w-2.5 text-purple-600" />
            </div>
            <div className="text-[10px] text-gray-600">
              <span className="font-medium">Обработано ИИ</span>
            </div>
          </div>
        )}
        
        {/* Кнопки для обработки ИИ внизу карточки */}
        {!request.aiProcessed && citizenRequestAgents.length > 0 && (
          <div className="flex justify-between gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-[10px] h-6 border-blue-300 hover:bg-blue-50 hover:text-blue-700"
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
              className="w-full text-[10px] h-6 border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
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
        <div className="flex justify-between items-center text-[10px] text-gray-500 mt-3 pt-2 border-t border-gray-100">
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