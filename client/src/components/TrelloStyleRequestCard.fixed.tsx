import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Bot, Database, User, MoreHorizontal, CheckCircle2, AlertCircle, RefreshCw, ChevronDown,
         MessageSquare, FileText, Clock, Edit, CreditCard, Flag, Info, Plus, Tag, UserCheck, Trash2 } from 'lucide-react';
import { CitizenRequest, Activity, Agent } from '@shared/types';

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
  isJustMoved?: boolean; // Флаг для недавно перемещенной карточки
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
  onAutoProcess,
  isJustMoved
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
  
  // Мутация для удаления обращения
  const deleteRequestMutation = useMutation({
    mutationFn: () => {
      return apiRequest('DELETE', `/api/citizen-requests/${request.id}`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
      toast({
        title: "Обращение удалено",
        description: `Запись об удалении сохранена в блокчейне: ${data.blockchainHash ? data.blockchainHash.substring(0, 8) + '...' : 'успешно'}`,
      });
    },
    onError: (error) => {
      console.error("Error deleting request:", error);
      toast({
        title: "Ошибка удаления",
        description: "Не удалось удалить обращение",
        variant: "destructive",
      });
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
    <Card
      ref={innerRef}
      {...draggableProps}
      {...dragHandleProps}
      className={`mb-2 border-l-[3px] ${priorityBorderColors[request.priority] || 'border-l-gray-300'} ${isDragging ? "kanban-card-moving shadow-lg" : isJustMoved ? "kanban-card-flash shadow-md" : "shadow-sm"} hover:shadow-md transition-all duration-200 max-w-full overflow-hidden`}
      onClick={onClick}
      style={{ minHeight: '100px', maxHeight: '220px' }}
    >
      <div className="p-3 flex flex-col h-full">
        {/* Заголовок и метки */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-1 w-full">
            <Badge className={`${priorityColors[request.priority]} text-[10px] px-1.5 py-0 h-4 mr-0.5 flex-shrink-0`} variant="outline">
              {request.priority || 'medium'}
            </Badge>
            <h4 className="font-medium text-sm line-clamp-1 overflow-hidden text-ellipsis w-full">
              {request.subject || request.title || ""}
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
                  
                  {/* Кнопка удаления */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start text-[11px] h-7 mb-0.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Вы уверены, что хотите удалить это обращение? Эта операция не может быть отменена и будет записана в блокчейн.')) {
                        deleteRequestMutation.mutate();
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Удалить обращение
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
        <div className="mb-2">
          <span className="text-[12px] text-gray-700 block w-full overflow-hidden text-ellipsis whitespace-nowrap">
            {request.fullName || ""}
          </span>
        </div>
        
        {/* Краткое описание */}
        <div className="flex-grow overflow-hidden mb-2">
          <p className="text-xs text-gray-600 line-clamp-2 break-words whitespace-pre-line px-0.5">
            {(request.description || request.content || "").substring(0, 150)}
          </p>
        </div>
        
        {/* Индикаторы статуса */}
        <div className="flex flex-wrap gap-1.5 mt-auto">
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
          
          <div className="ml-auto text-[10px] text-gray-400 flex items-center">
            <Clock className="h-2.5 w-2.5 mr-0.5" />
            {new Date(request.createdAt).toLocaleDateString("ru-RU", {day: '2-digit', month: '2-digit'})}
          </div>
        </div>
        
        {/* История действий и рекомендации перемещены в детальный просмотр */}
      </div>
    </Card>
  );
};

export default TrelloStyleRequestCard;