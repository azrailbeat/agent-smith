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

  const [showActions, setShowActions] = useState(false);
  
  // Форматирование даты
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}.${month} ${hours}:${minutes}`;
  };
  
  return (
    <div
      ref={innerRef}
      {...draggableProps}
      {...dragHandleProps}
      className="mb-2"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Card
        className={`overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer bg-white ${
          isDragging ? "shadow-md opacity-90" : ""
        }`}
        onClick={onClick}
      >
        <div className="p-3">
          <div>
            <h3 className="text-sm font-semibold line-clamp-1">{request.subject}</h3>
            <div className="mt-1 text-xs text-gray-500 flex items-center">
              <span className="flex-shrink-0">{formatDate(request.createdAt)}</span>
              <span className="mx-1">•</span>
              <span className="flex items-center gap-0.5">
                <User className="h-3 w-3" /> {request.fullName}
              </span>
            </div>
            <div className="mt-1">
              <Badge 
                variant="outline" 
                className={`${priorityColors[request.priority] || 'bg-gray-100 text-gray-800'} text-xs px-1.5 py-0 font-normal`}
              >
                {request.priority || 'medium'}
              </Badge>
            </div>
          </div>
          
          {request.description && (
            <div className="mt-1.5 text-xs text-gray-600 line-clamp-2 whitespace-pre-line">
              {request.description}
            </div>
          )}
          
          {request.aiProcessed && request.aiClassification && (
            <div className="mt-1.5">
              <Badge variant="outline" className="bg-purple-50 text-xs px-1.5 py-0 font-normal text-purple-700 border-purple-200 max-w-full overflow-hidden">
                <span className="truncate inline-block max-w-[200px]">Категория: {request.aiClassification}</span>
              </Badge>
            </div>
          )}
          
          {request.aiSuggestion && (
            <div className="mt-1.5 text-xs text-gray-700 bg-gray-50 p-1.5 rounded border border-gray-200 line-clamp-2">
              {request.aiSuggestion}
            </div>
          )}
          
          <div className="mt-2 flex justify-between items-center">
            <div className="flex gap-1">
              {request.aiProcessed && <Bot className="h-3 w-3 text-purple-500" />}
              {request.blockchainHash && <Database className="h-3 w-3 text-blue-500" />}
              {request.aiClassification && 
                <Badge variant="outline" className="text-[10px] h-4 px-1 bg-purple-50 text-purple-700 border-purple-100 max-w-[100px] overflow-hidden">
                  <span className="truncate inline-block max-w-full">{request.aiClassification}</span>
                </Badge>
              }
            </div>
            
            {showActions && onAutoProcess && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs p-0 px-1 hover:bg-gray-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onAutoProcess(request);
                }}
              >
                <Bot className="h-3 w-3 mr-1" />
                Автообработка
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TrelloStyleRequestCard;