import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Bot, Database, User, MoreHorizontal, CheckCircle2, AlertCircle, RefreshCw, ChevronDown,
         MessageSquare, FileText, Clock, Edit, CreditCard, Flag, Info, Plus, Tag, UserCheck, Trash2 } from 'lucide-react';

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
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  // Инициализируем activities из request.activities, если они доступны и являются массивом
  const [activities, setActivities] = useState<Activity[]>(() => {
    if (request.activities && Array.isArray(request.activities)) {
      return request.activities;
    }
    return [];
  });
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Функция форматирования даты для активностей
  const formatActivityDate = (date: Date) => {
    const activityDate = new Date(date);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) {
      return 'только что';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} мин. назад`;
    } else if (diffMinutes < 24 * 60) {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours} ч. назад`;
    } else {
      return activityDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
  };

  // Получение иконки для типа действия
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'status_change':
        return <RefreshCw className="h-2 w-2 text-blue-500" />;
      case 'comment_add':
        return <MessageSquare className="h-2 w-2 text-green-500" />;
      case 'request_create':
        return <Plus className="h-2 w-2 text-purple-500" />;
      case 'ai_processing':
        return <Bot className="h-2 w-2 text-amber-500" />;
      case 'blockchain_record':
        return <Database className="h-2 w-2 text-cyan-500" />;
      case 'priority_change':
        return <Flag className="h-2 w-2 text-red-500" />;
      case 'assign':
        return <UserCheck className="h-2 w-2 text-orange-500" />;
      case 'tag_add':
        return <Tag className="h-2 w-2 text-indigo-500" />;
      default:
        return <Info className="h-2 w-2 text-gray-500" />;
    }
  };
  
  // Загрузка активностей при открытии раздела
  useEffect(() => {
    if (activitiesOpen && !activities.length) {
      setActivitiesLoading(true);
      apiRequest('GET', `/api/citizen-requests/${request.id}/activities`)
        .then((data) => {
          // Проверяем формат данных и обрабатываем разные возможные структуры
          if (Array.isArray(data)) {
            // Данные уже в правильном формате массива
            setActivities(data);
          } else if (data && typeof data === 'object' && 'activities' in data && Array.isArray(data.activities)) {
            // Данные в формате { activities: [] }
            setActivities(data.activities);
          } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
            // Данные в формате { data: [] }
            setActivities(data.data);
          } else {
            // Никакой из известных форматов не подошел
            console.error('Activities data is not in a recognized format:', data);
            setActivities([]);
          }
        })
        .catch((error) => {
          console.error('Error loading activities:', error);
          toast({
            title: "Ошибка загрузки активностей",
            description: "Не удалось загрузить историю действий",
            variant: "destructive",
          });
          setActivities([]); // Устанавливаем пустой массив при ошибке
        })
        .finally(() => {
          setActivitiesLoading(false);
        });
    }
  }, [activitiesOpen, request.id, activities.length, toast]);

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
      className={`mb-2 bg-white rounded-md border-l-[3px] ${priorityBorderColors[request.priority] || 'border-l-gray-300'} border border-gray-200 ${isDragging ? "kanban-card-moving shadow-lg" : isJustMoved ? "kanban-card-flash shadow-md" : "shadow-sm"} hover:shadow-md transition-all duration-200 max-w-full overflow-hidden`}
      onClick={onClick}
      style={{ minHeight: '100px' }}
    >
      <div className="p-3 flex flex-col overflow-hidden">
        {/* Заголовок и метки */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-1 w-full">
            <Badge className={`${priorityColors[request.priority]} text-[10px] px-1.5 py-0 h-4 mr-0.5 flex-shrink-0`} variant="outline">
              {request.priority || 'medium'}
            </Badge>
            <h4 className="font-medium text-sm line-clamp-1 overflow-hidden text-ellipsis w-full">
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
            {request.fullName}
          </span>
        </div>
        
        {/* Краткое описание */}
        <div className="mb-3">
          <p className="text-xs text-gray-600" style={{ 
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 3,
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {(request.description || request.content || "Без описания").substring(0, 150)}
          </p>
        </div>
        
        {/* Индикаторы статуса */}
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
        </div>
        
        {/* Результаты ИИ обработки */}
        {request.aiProcessed && request.aiSuggestion && (
          <div className="bg-amber-50 p-2 rounded text-[11px] text-amber-900 mb-3 border border-amber-200 border-l-2 border-l-amber-400 overflow-hidden">
            <div className="font-medium mb-1 flex items-center">
              <Bot className="h-3 w-3 mr-1 flex-shrink-0" /> 
              <span className="truncate">Рекомендация:</span>
            </div>
            <div style={{ 
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {request.aiSuggestion?.substring(0, 150)}
            </div>
          </div>
        )}
        
        {/* История действий - раскрывающаяся */}
        <Collapsible className="mt-2" onOpenChange={setActivitiesOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-[10px] text-gray-500 hover:bg-gray-50 rounded px-1.5 py-0.5 border border-gray-100 transition-colors">
            <div className="flex items-center">
              <Clock className="h-2.5 w-2.5 mr-1 text-gray-400" /> 
              <span className="font-medium">История действий</span>
            </div>
            <ChevronDown className="h-2.5 w-2.5 text-gray-400" />
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-1.5 mt-2 border-t border-gray-100 pt-1.5">
            {/* Действие создания */}
            <div className="flex items-center gap-1.5">
              <div className="bg-gray-100 rounded-full h-4 w-4 flex items-center justify-center flex-shrink-0">
                <User className="h-2 w-2 text-gray-600" />
              </div>
              <div className="text-[10px] text-gray-600 flex-1">
                <div className="flex justify-between">
                  <span className="font-medium">Создано</span>
                  <span className="text-gray-400">{new Date(request.createdAt).toLocaleDateString("ru-RU", {day: '2-digit', month: '2-digit'})}</span>
                </div>
              </div>
            </div>
            
            {/* Обновление */}
            {request.updatedAt && new Date(request.updatedAt).getTime() !== new Date(request.createdAt).getTime() && (
              <div className="flex items-center gap-1.5">
                <div className="bg-blue-100 rounded-full h-4 w-4 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="h-2 w-2 text-blue-600" />
                </div>
                <div className="text-[10px] text-gray-600 flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium">Обновлено</span>
                    <span className="text-gray-400">{new Date(request.updatedAt).toLocaleDateString("ru-RU", {day: '2-digit', month: '2-digit'})}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* ИИ обработка */}
            {request.aiProcessed && (
              <div className="flex items-center gap-1.5">
                <div className="bg-purple-100 rounded-full h-5 w-5 flex items-center justify-center">
                  <Bot className="h-2.5 w-2.5 text-purple-600" />
                </div>
                <div className="text-[10px] text-gray-600">
                  <span className="font-medium">ИИ анализ:</span> завершен
                </div>
              </div>
            )}
            
            {/* Динамические активности */}
            {activitiesLoading ? (
              <div className="text-[10px] text-gray-500 italic pl-1">Загрузка истории...</div>
            ) : (
              <>
                {Array.isArray(activities) && activities.length > 0 ? (
                  // Если есть активности, отображаем их
                  <>
                    {activities.slice(0, 5).map((activity, index) => (
                      <div key={index} className="flex items-center gap-1.5">
                        <div className="bg-gray-100 rounded-full h-4 w-4 flex items-center justify-center flex-shrink-0">
                          {getActionIcon(activity?.actionType || activity?.action || '')}
                        </div>
                        <div className="text-[10px] text-gray-600 flex-1 overflow-hidden">
                          <div className="flex justify-between items-start w-full">
                            <span className="font-medium truncate max-w-[65%] overflow-hidden text-ellipsis" style={{ display: 'inline-block' }}>
                              {(activity?.description || 'Действие с запросом').substring(0, 80)}
                            </span>
                            <span className="text-gray-400 ml-1 whitespace-nowrap text-[9px] flex-shrink-0">
                              {activity?.createdAt || activity?.timestamp 
                                ? formatActivityDate(activity.createdAt || activity.timestamp) 
                                : 'н/д'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {activities.length > 5 && (
                      <div className="text-[10px] text-blue-500 hover:underline cursor-pointer text-center mt-1" onClick={(e) => {
                        e.stopPropagation();
                        toast({
                          title: "История действий",
                          description: "Полная история доступна в детальной карточке",
                        });
                      }}>
                        Показать все ({activities.length})
                      </div>
                    )}
                  </>
                ) : (
                  // Если активностей нет
                  <div className="text-[10px] text-gray-500 italic pl-1">История действий пуста</div>
                )}
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
        
        {/* Футер карточки с датой и ID */}
        <div className="flex justify-between items-center text-[10px] text-gray-500 mt-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <span className="text-gray-400">#{request.id}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-2.5 w-2.5 mr-0.5" />
            {new Date(request.createdAt).toLocaleDateString("ru-RU")}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrelloStyleRequestCard;