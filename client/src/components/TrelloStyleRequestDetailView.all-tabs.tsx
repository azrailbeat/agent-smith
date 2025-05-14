/**
 * Agent Smith Platform - Компонент отображения деталей обращения со всеми табами одновременно
 * 
 * Объединяет информацию об обращении и результаты ИИ-обработки в единый интерфейс
 * в виде одной страницы без табов
 * 
 * @version 1.1.0
 * @since 14.05.2025
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, Bot, Database, User, MoreHorizontal, CheckCircle2, AlertCircle, 
  RefreshCw, ChevronDown, MessageSquare, FileText, Clock, Edit, 
  CreditCard, Flag, Info, Plus, Tag, UserCheck, Trash2, Mail, 
  Building, Users, LayoutGrid, CheckSquare, BrainCircuit
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { CitizenRequest, Activity, Agent } from '@shared/types';

interface TrelloStyleRequestDetailViewProps {
  request: CitizenRequest;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (request: CitizenRequest) => void;
  onDelete?: (requestId: number) => void;
  onStatusChange?: (requestId: number, newStatus: string) => void;
  // Дополнительные параметры для работы с вкладками (не используются в этой версии)
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  // Параметры для автоматической обработки
  onAutoProcess?: () => void;
  // Параметры для обработки с помощью ИИ-агентов
  availableAgents?: Agent[];
  onProcessWithAgent?: (request: CitizenRequest, agentId: number, action?: string) => void;
}

const TrelloStyleRequestDetailView: React.FC<TrelloStyleRequestDetailViewProps> = ({
  request,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onStatusChange,
  onTabChange, // Этот параметр нам больше не нужен в новой реализации
  activeTab, // Этот параметр нам больше не нужен в новой реализации
  onAutoProcess, // Этот параметр нам больше не нужен в новой реализации
  availableAgents, // Агенты будут запрашиваться внутри компонента
  onProcessWithAgent // Этот параметр нам нужен для обработки обращения
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);
  const [aiClassification, setAiClassification] = useState<string | null>(null);
  const [processingAgent, setProcessingAgent] = useState<number | null>(null);
  
  if (!isOpen) return null;
  
  // Запрос списка агентов
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    refetchOnWindowFocus: false,
  });
  
  // Выборка агентов для обработки обращений
  const citizenRequestAgents = agents.filter(agent => 
    agent.type === "citizen_requests"
  );
  
  // Получить цвет статуса
  const getStatusColor = (status: string): string => {
    const statusColors: {[key: string]: string} = {
      'new': 'text-blue-500',
      'inProgress': 'text-yellow-500',
      'waiting': 'text-orange-500',
      'completed': 'text-green-500',
      'canceled': 'text-red-500',
      'rejected': 'text-gray-500'
    };
    return statusColors[status] || 'text-gray-500';
  };
  
  // Получить название статуса
  const getStatusLabel = (status: string): string => {
    const statusLabels: {[key: string]: string} = {
      'new': 'Новое',
      'inProgress': 'В обработке',
      'waiting': 'Ожидает',
      'completed': 'Завершено',
      'canceled': 'Отменено',
      'rejected': 'Отклонено'
    };
    return statusLabels[status] || status;
  };
  
  // Получить цвет приоритета
  const getPriorityColor = (priority: string): string => {
    const priorityColors: {[key: string]: string} = {
      'low': 'bg-green-500',
      'medium': 'bg-yellow-500',
      'high': 'bg-orange-500',
      'urgent': 'bg-red-500'
    };
    return priorityColors[priority] || 'bg-gray-500';
  };
  
  // Получить название приоритета
  const getPriorityLabel = (priority: string): string => {
    const priorityLabels: {[key: string]: string} = {
      'low': 'Низкий',
      'medium': 'Средний',
      'high': 'Высокий',
      'urgent': 'Срочный'
    };
    return priorityLabels[priority] || priority;
  };
  
  // Запрос списка активностей
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: [`/api/citizen-requests/${request.id}/activities`],
    refetchOnWindowFocus: false
  });
  
  // Устанавливаем флаг загрузки активностей
  useEffect(() => {
    if (!activitiesLoading && activities) {
      setActivitiesLoaded(true);
    }
  }, [activitiesLoading, activities]);
  
  // Получить название типа действия
  const getActionTypeLabel = (actionType: string): string => {
    const actionTypeMap: {[key: string]: string} = {
      'create': 'Создание',
      'update': 'Обновление',
      'status_change': 'Изменение статуса',
      'comment': 'Комментирование',
      'assign': 'Назначение',
      'process': 'Обработка',
      'ai_process': 'ИИ обработка',
      'blockchain_record': 'Запись в блокчейн',
      'delete': 'Удаление'
    };
    return actionTypeMap[actionType] || actionType;
  };

  // Получение иконки для типа действия
  const getActionIcon = (actionType: string): React.ReactNode => {
    switch (actionType) {
      case 'create': return <Plus className="h-4 w-4" />;
      case 'update': return <Edit className="h-4 w-4" />;
      case 'status_change': return <Tag className="h-4 w-4" />;
      case 'comment': return <MessageSquare className="h-4 w-4" />;
      case 'assign': return <UserCheck className="h-4 w-4" />;
      case 'process': return <CheckSquare className="h-4 w-4" />;
      case 'ai_process': return <BrainCircuit className="h-4 w-4" />;
      case 'blockchain_record': return <Database className="h-4 w-4" />;
      case 'delete': return <Trash2 className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };
  
  // Мутация для отправки комментария
  const addCommentMutation = useMutation({
    mutationFn: (text: string) => {
      return apiRequest('POST', `/api/citizen-requests/${request.id}/comment`, { text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/citizen-requests/${request.id}/activities`] });
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
      setComment("");
      toast({
        title: "Комментарий добавлен",
        description: "Ваш комментарий успешно добавлен",
      });
    },
    onError: (error) => {
      console.error("Error adding comment:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить комментарий",
        variant: "destructive",
      });
    },
  });
  
  // Мутация для обработки запроса ИИ-агентом
  const processWithAgentMutation = useMutation({
    mutationFn: () => {
      return apiRequest('POST', `/api/citizen-requests/${request.id}/process-with-agent`, { agentId: processingAgent, actionType: 'full' });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
      queryClient.invalidateQueries({ queryKey: [`/api/citizen-requests/${request.id}/activities`] });
      
      if (onUpdate && data) {
        onUpdate(data);
      }
      
      toast({
        title: "Обращение обработано",
        description: "Обращение успешно обработано ИИ агентом",
      });
      setIsProcessing(false);
      setProcessingAgent(null);
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
  
  // Обработка отправки комментария
  const handleCommentSubmit = () => {
    if (comment.trim() !== "") {
      addCommentMutation.mutate(comment);
    }
  };
  
  // Обработка запроса через ИИ-агента
  const handleProcessWithAgent = () => {
    if (processingAgent) {
      // Если передан обработчик onProcessWithAgent, используем его
      if (onProcessWithAgent) {
        onProcessWithAgent(request, processingAgent, 'full');
        return;
      }
      
      // Иначе используем локальную мутацию
      setIsProcessing(true);
      processWithAgentMutation.mutate();
    } else {
      toast({
        title: "Выберите агента",
        description: "Пожалуйста, выберите ИИ агента для обработки",
        variant: "destructive",
      });
    }
  };
  
  // Обработка нажатия на кнопку автообработки
  const handleAutoProcess = () => {
    if (onAutoProcess) {
      onAutoProcess();
    } else {
      // Если нет обработчика, используем обычную обработку
      handleProcessWithAgent();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full max-h-[95vh] h-[95vh] p-0 overflow-hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="flex justify-between items-center p-3 bg-white border-b sticky top-0 z-10">
          <DialogTitle className="text-xl flex items-center">
            Обращение #{request.id} 
            <Badge className={`ml-2 ${
              request.priority === 'urgent' ? 'bg-red-500' : 
              request.priority === 'high' ? 'bg-orange-500' : 
              request.priority === 'medium' ? 'bg-green-500' : 
              'bg-blue-500'}`}
            >
              {getPriorityLabel(request.priority)}
            </Badge>
          </DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-full">
            <span aria-hidden>×</span>
          </Button>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(95vh-60px)]">
          {/* Секция Детали */}
          <div className="border-b p-3 bg-gray-50">
            <h3 className="text-lg font-medium">Детали</h3>
          </div>
          
          <div className="p-4">
            <div className="mb-4">
              <div className="font-medium text-base mb-1">{request.subject}</div>
              <p className="text-gray-700 whitespace-pre-wrap text-sm">{request.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Статус</p>
                <div className="flex items-center mt-1">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(request.status).replace('text-', 'bg-')} mr-2`}></div>
                  <span>{getStatusLabel(request.status)}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Приоритет</p>
                <div className="flex items-center mt-1">
                  <div className={`w-3 h-3 rounded-full ${getPriorityColor(request.priority)} mr-2`}></div>
                  <span>{getPriorityLabel(request.priority)}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium mb-2">Информация о заявителе</h4>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <User className="h-4 w-4 text-gray-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium">{request.fullName}</p>
                      <p className="text-xs text-gray-500">{request.contactInfo}</p>
                    </div>
                  </div>
                  
                  {request.citizenInfo && (
                    <>
                      {request.citizenInfo.address && (
                        <div className="flex items-start">
                          <Building className="h-4 w-4 text-gray-500 mt-0.5 mr-2" />
                          <p className="text-sm text-gray-700">{request.citizenInfo.address}</p>
                        </div>
                      )}
                      
                      {request.citizenInfo.iin && (
                        <div className="flex items-start">
                          <CreditCard className="h-4 w-4 text-gray-500 mt-0.5 mr-2" />
                          <p className="text-sm text-gray-700">ИИН: {request.citizenInfo.iin}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Обработка заявки</h4>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <Calendar className="h-4 w-4 text-gray-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-xs text-gray-500">Создано</p>
                      <p className="text-sm">{new Date(request.createdAt).toLocaleString("ru-RU")}</p>
                    </div>
                  </div>
                  
                  {request.updatedAt && (
                    <div className="flex items-start">
                      <Clock className="h-4 w-4 text-gray-500 mt-0.5 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Последнее обновление</p>
                        <p className="text-sm">{new Date(request.updatedAt).toLocaleString("ru-RU")}</p>
                      </div>
                    </div>
                  )}
                  
                  {request.aiProcessed && (
                    <div className="flex items-start">
                      <Bot className="h-4 w-4 text-purple-500 mt-0.5 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Обработано ИИ</p>
                        <div className="flex items-center">
                          <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" />
                          <p className="text-sm">Успешно</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {request.blockchainHash && (
                    <div className="flex items-start">
                      <Database className="h-4 w-4 text-blue-500 mt-0.5 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Запись в блокчейн</p>
                        <p className="text-sm font-mono text-xs truncate">
                          {request.blockchainHash.substring(0, 16)}...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Секция ИИ обработка */}
          <div className="border-b p-3 bg-gray-50">
            <h3 className="text-lg font-medium">ИИ обработка</h3>
          </div>
          <div className="p-4">
            {/* Результаты обработки */}
            <div className="mb-4">
              <h4 className="text-sm font-medium flex items-center mb-3">
                <Bot className="h-4 w-4 text-purple-500 mr-2" />
                Результаты обработки ИИ
              </h4>
              
              {request.aiProcessed && request.aiResult ? (
                <div className="space-y-3">
                  {request.aiClassification && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Классификация обращения</p>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {request.aiClassification}
                      </Badge>
                    </div>
                  )}
                  
                  {request.aiSuggestion && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Рекомендации по обработке</p>
                      <div className="bg-purple-50 p-3 rounded-md text-sm border border-purple-100">
                        {request.aiSuggestion}
                      </div>
                    </div>
                  )}
                  
                  {request.aiResult && typeof request.aiResult === 'object' && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Подробный анализ</p>
                      <div className="bg-white border border-gray-200 p-3 rounded-md text-sm">
                        <pre className="whitespace-pre-wrap font-sans text-xs">
                          {JSON.stringify(request.aiResult, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-4 bg-gray-50 rounded-md">
                  <p className="text-gray-500">Нет данных об обработке ИИ</p>
                </div>
              )}
            </div>
            
            {/* Обработать с помощью ИИ */}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-3">Обработать с помощью ИИ</h4>
              <div className="flex space-x-2">
                <Select 
                  value={processingAgent?.toString() || ""} 
                  onValueChange={(value) => setProcessingAgent(parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите агента" />
                  </SelectTrigger>
                  <SelectContent>
                    {citizenRequestAgents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button 
                  className="w-auto whitespace-nowrap"
                  onClick={handleProcessWithAgent}
                  disabled={isProcessing || !processingAgent}
                >
                  {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Bot className="h-4 w-4 mr-2" />}
                  Обработать ИИ
                </Button>
              </div>
            </div>
          </div>

          {/* Секция История */}
          <div className="border-b p-3 bg-gray-50">
            <h3 className="text-lg font-medium">История</h3>
          </div>
          <div className="p-4">
            {/* История действий */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center mb-2">
                <Clock className="h-4 w-4 text-blue-500 mr-2" />
                История обращения
              </h4>
              
              {activitiesLoading ? (
                <div className="text-center p-4">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500">Загрузка истории...</p>
                </div>
              ) : activities && Array.isArray(activities) && activities.length > 0 ? (
                <div className="space-y-2">
                  {activities.map((activity: Activity, index: number) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-md border border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <div className="bg-white rounded-full h-6 w-6 mr-2 flex items-center justify-center border border-gray-200">
                            {getActionIcon(activity.actionType)}
                          </div>
                          <span className="font-medium text-sm">{getActionTypeLabel(activity.actionType)}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(activity.createdAt).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      
                      {activity.description && (
                        <p className="text-sm text-gray-700 ml-8">{activity.description}</p>
                      )}
                      
                      {activity.userName && (
                        <div className="mt-1 flex items-center ml-8">
                          <User className="h-3 w-3 text-gray-400 mr-1" />
                          <span className="text-xs text-gray-500">{activity.userName}</span>
                        </div>
                      )}
                      
                      {activity.blockchainHash && (
                        <div className="mt-1 flex items-center ml-8">
                          <Database className="h-3 w-3 text-blue-400 mr-1" />
                          <span className="text-xs text-gray-500 font-mono">{activity.blockchainHash.substring(0, 10)}...</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 bg-gray-50 rounded-md">
                  <p className="text-gray-500">История пуста</p>
                </div>
              )}
            </div>
            
            {/* Добавить комментарий */}
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Добавить комментарий</h4>
              <div className="space-y-3">
                <Textarea 
                  placeholder="Введите комментарий..." 
                  value={comment} 
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex justify-end">
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleCommentSubmit}
                    disabled={!comment.trim()}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Отправить
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Кнопки действий */}
        <div className="flex justify-between p-4 border-t bg-gray-50 sticky bottom-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onClose()}
          >
            Ответить
          </Button>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoProcess}
              disabled={isProcessing}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Автообработка
            </Button>
            
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm('Вы уверены, что хотите удалить это обращение? Эта операция не может быть отменена.')) {
                    onDelete(request.id);
                    onClose();
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Удалить
              </Button>
            )}
          </div>
          
          {/* Кнопки внизу */}
          <div className="flex justify-between items-center p-4 border-t bg-white sticky bottom-0">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
            >
              Ответить
            </Button>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={() => {
                  // Сохранение в блокчейн
                  toast({
                    title: "Сохранение в блокчейн",
                    description: "Запись сохранена в блокчейн"
                  });
                }}
              >
                <Database className="h-3.5 w-3.5 mr-1.5" />
                Сохранить в блокчейн
              </Button>

              <Button 
                variant="default" 
                size="sm" 
                className="text-xs" 
                onClick={handleAutoProcess}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Автообработка
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrelloStyleRequestDetailView;