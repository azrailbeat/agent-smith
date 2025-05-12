/**
 * Agent Smith Platform - Компонент отображения деталей обращения в стиле Trello
 * 
 * Объединяет информацию об обращении и результаты ИИ-обработки в единый интерфейс
 * в стиле Trello с отображением ответственных лиц по иерархии организации
 * 
 * @version 1.0.0
 * @since 12.05.2025
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface Department {
  id: number;
  name: string;
  parentId?: number;
  code?: string;
  level?: number;
}

interface Position {
  id: number;
  name: string;
  departmentId: number;
  level?: number;
  description?: string;
}

interface OrganizationUser {
  id: number;
  name: string;
  email: string;
  positionId?: number;
  position?: Position;
  departmentId?: number;
  department?: Department;
}

interface TrelloStyleRequestDetailViewProps {
  request: CitizenRequest;
  onClose: () => void;
  onStatusChange: (id: number, status: string) => void;
  onRequestUpdate: () => void;
  onProcess?: (requestId: number, actionType: string) => Promise<any>;
  priorityColors: { [key: string]: string };
}

const TrelloStyleRequestDetailView: React.FC<TrelloStyleRequestDetailViewProps> = ({
  request,
  onClose,
  onStatusChange,
  onRequestUpdate,
  onProcess,
  priorityColors
}) => {
  const [activeTab, setActiveTab] = useState('main');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [comment, setComment] = useState('');
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>("classification");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Загружаем список агентов для обработки обращений
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    refetchOnWindowFocus: false,
  });

  // Загружаем организационную структуру (заглушка, будет реализована позже)
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    refetchOnWindowFocus: false,
    // Пока не реализована структура, возвращаем пустой массив
    enabled: false,
  });

  // Загружаем список должностей (заглушка, будет реализована позже)
  const { data: positions = [] } = useQuery<Position[]>({
    queryKey: ["/api/positions"],
    refetchOnWindowFocus: false,
    // Пока не реализована структура, возвращаем пустой массив
    enabled: false,
  });

  // Загружаем список сотрудников (заглушка, будет реализована позже)
  const { data: users = [] } = useQuery<OrganizationUser[]>({
    queryKey: ["/api/users"],
    refetchOnWindowFocus: false,
    // Пока не реализована структура, возвращаем пустой массив
    enabled: false,
  });

  // Фильтруем агентов и оставляем только основных ключевых
  const citizenRequestAgents = agents.filter(agent => 
    agent.type === "citizen_requests" && 
    // Оставляем только ключевого агента (640) и удаляем все остальные дубликаты
    agent.id === 640
  );

  // Мутация для обработки обращения агентом
  const processWithAgentMutation = useMutation({
    mutationFn: ({ requestId, actionType }: { requestId: number, actionType: string }) => {
      return apiRequest('POST', `/api/citizen-requests/${requestId}/process-with-agent`, { 
        agentId: citizenRequestAgents[0]?.id || 640, 
        actionType 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
      toast({
        title: "Обращение обработано",
        description: "Обращение успешно обработано ИИ агентом",
      });
      onRequestUpdate();
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

  // Мутация для добавления комментария
  const addCommentMutation = useMutation({
    mutationFn: ({ requestId, comment }: { requestId: number, comment: string }) => {
      return apiRequest('POST', `/api/citizen-requests/${requestId}/comments`, { text: comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/citizen-requests/${request.id}/activities`] });
      loadActivities();
      toast({
        title: "Комментарий добавлен",
        description: "Ваш комментарий был успешно добавлен к обращению",
      });
      setComment('');
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

  // Мутация для удаления обращения
  const deleteRequestMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest('DELETE', `/api/citizen-requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
      onClose();
      toast({
        title: "Обращение удалено",
        description: "Обращение успешно удалено из системы",
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

  // Загрузка активностей при открытии компонента
  useEffect(() => {
    loadActivities();
  }, [request.id]);

  // Функция для загрузки активностей
  const loadActivities = () => {
    setActivitiesLoading(true);
    apiRequest('GET', `/api/citizen-requests/${request.id}/activities`)
      .then((data) => {
        if (Array.isArray(data)) {
          setActivities(data);
        } else if (data && typeof data === 'object' && 'activities' in data && Array.isArray(data.activities)) {
          setActivities(data.activities);
        } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
          setActivities(data.data);
        } else {
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
        setActivities([]);
      })
      .finally(() => {
        setActivitiesLoading(false);
      });
  };

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
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'comment_add':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'request_create':
        return <Plus className="h-4 w-4 text-purple-500" />;
      case 'ai_processing':
        return <Bot className="h-4 w-4 text-amber-500" />;
      case 'blockchain_record':
        return <Database className="h-4 w-4 text-cyan-500" />;
      case 'priority_change':
        return <Flag className="h-4 w-4 text-red-500" />;
      case 'assign':
        return <UserCheck className="h-4 w-4 text-orange-500" />;
      case 'tag_add':
        return <Tag className="h-4 w-4 text-indigo-500" />;
      case 'request_deleted':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  // Обработка ИИ запроса
  const handleProcessWithAgent = async () => {
    setIsProcessing(true);
    try {
      if (onProcess) {
        await onProcess(request.id, selectedAction);
      } else {
        await processWithAgentMutation.mutate({ requestId: request.id, actionType: selectedAction });
      }
    } catch (error) {
      console.error('Error processing with agent:', error);
      setIsProcessing(false);
    }
  };

  // Добавление комментария
  const handleAddComment = () => {
    if (!comment.trim()) return;
    addCommentMutation.mutate({ requestId: request.id, comment });
  };

  // Подтверждение удаления обращения
  const handleDeleteRequest = () => {
    deleteRequestMutation.mutate(request.id);
  };

  return (
    <div>
      {/* Скрытый заголовок для доступности */}
      <DialogHeader className="sr-only">
        <DialogTitle>Детали обращения №{request.id}</DialogTitle>
        <DialogDescription id="request-detail-view">
          Просмотр деталей обращения от {request.fullName}
        </DialogDescription>
      </DialogHeader>
      
      <div className="flex h-full">
        {/* Основная секция */}
        <div className="flex-1 pl-4 pb-4 pr-8 pt-4">
          {/* Заголовок обращения */}
          <div className="border-b pb-2 mb-4">
            <h2 className="text-lg font-medium">Обращение через виджет</h2>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <div className="flex items-center">
                <span className="mr-1">в списке</span>
                <Badge variant="outline" className="rounded-sm font-normal text-xs mr-4">
                  {request.status === 'new' ? 'Новые' : 
                  request.status === 'in_progress' || request.status === 'inProgress' ? 'В обработке' : 
                  request.status === 'waiting' ? 'Ожидание' : 
                  request.status === 'completed' ? 'Завершенные' : 'Другое'}
                </Badge>
              </div>
              <div>
                в обработке
              </div>
            </div>
          </div>

          {/* Табы */}
          <div className="border-b mb-6">
            <div className="flex">
              <div className={`py-2 px-4 border-b-2 ${activeTab === 'main' ? 'border-green-600 font-medium' : 'border-transparent'}`}>
                <button 
                  className="text-sm" 
                  onClick={() => setActiveTab('main')}
                >
                  Информация
                </button>
              </div>
              <div className={`py-2 px-4 border-b-2 ${activeTab === 'ai' ? 'border-green-600 font-medium' : 'border-transparent'}`}>
                <button 
                  className="text-sm flex items-center" 
                  onClick={() => setActiveTab('ai')}
                >
                  ИИ обработка
                  {request.aiProcessed && <div className="ml-1 h-2 w-2 rounded-full bg-green-500"></div>}
                </button>
              </div>
            </div>
          </div>

          {/* Контент в зависимости от активной вкладки */}
          {activeTab === 'main' && (
            <div>
              <div className="grid grid-cols-2 gap-x-16 gap-y-6 mb-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Тип обращения</div>
                  <div className="font-medium">{request.requestType || "Не указан"}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Приоритет</div>
                  <Badge className={`bg-amber-100 text-amber-800 border-0`}>
                    {request.priority === 'low' ? 'Низкий' : 
                    request.priority === 'medium' ? 'Средний' : 
                    request.priority === 'high' ? 'Высокий' : 
                    request.priority === 'urgent' ? 'Срочный' : 'Не указан'}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Статус</div>
                  <div className="font-medium">
                    {request.status === 'new' ? 'Новое' : 
                    request.status === 'in_progress' || request.status === 'inProgress' ? 'В обработке' : 
                    request.status === 'waiting' ? 'Ожидание' : 
                    request.status === 'completed' ? 'Выполнено' : 'Другое'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">ID</div>
                  <div className="font-medium">#{request.id}</div>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="text-sm text-gray-500 mb-1">Описание</div>
                <div className="whitespace-pre-wrap">
                  {request.description || request.content || "Описание отсутствует"}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Создано</div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-500 mr-1" />
                    {new Date(request.createdAt).toLocaleDateString('ru-RU')} в {new Date(request.createdAt).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Обновлено</div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-gray-500 mr-1" />
                    {new Date(request.updatedAt).toLocaleDateString('ru-RU')} в {new Date(request.updatedAt).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div>
              {request.aiProcessed ? (
                <div className="space-y-4">
                  {request.aiClassification && (
                    <div>
                      <div className="flex items-center mb-2">
                        <Tag className="h-4 w-4 mr-2 text-blue-600" />
                        <div className="font-medium">Классификация</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-md">
                        {request.aiClassification}
                      </div>
                    </div>
                  )}
                  
                  {request.aiSuggestion && (
                    <div>
                      <div className="flex items-center mb-2">
                        <BrainCircuit className="h-4 w-4 mr-2 text-purple-600" />
                        <div className="font-medium">Рекомендации ИИ</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-md whitespace-pre-wrap">
                        {request.aiSuggestion}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" className="mr-2">
                      Обработано
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-center py-6">
                    <Bot className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <div className="font-medium text-lg mb-2">Обращение не обработано ИИ</div>
                    <p className="text-gray-500 mb-4 max-w-md mx-auto">
                      Для анализа обращения и получения рекомендаций используйте ИИ-обработку
                    </p>
                    
                    <div className="flex justify-center">
                      <Button
                        onClick={handleProcessWithAgent}
                        disabled={isProcessing}
                        className="px-6"
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                            Обработка...
                          </>
                        ) : (
                          <>
                            <Bot className="h-4 w-4 mr-2" />
                            Обработать с помощью ИИ
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Комментарии */}
          <div className="mt-8">
            <div className="flex items-center mb-3">
              <MessageSquare className="h-4 w-4 mr-2" />
              <h3 className="font-medium">Комментарии</h3>
            </div>
            
            <div className="mb-4">
              <Textarea
                placeholder="Напишите комментарий..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[80px] text-sm mb-2"
              />
              <div className="flex justify-end">
                <Button 
                  size="sm" 
                  onClick={handleAddComment}
                  disabled={!comment.trim()}
                >
                  Добавить комментарий
                </Button>
              </div>
            </div>
          </div>
          
          {/* История активностей */}
          <div className="mt-6">
            <h3 className="font-medium mb-4">История активностей</h3>
            
            {activitiesLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin h-5 w-5 border-2 border-primary rounded-full border-t-transparent mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Загрузка активностей...</p>
              </div>
            ) : activities.length > 0 ? (
              <div>
                {activities.map((activity) => (
                  <div key={activity.id} className="py-2 border-b">
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded-full bg-gray-100">
                        {getActionIcon(activity.actionType || activity.action || '')}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          {activity.userName || 'Система'}
                        </div>
                        <div className="text-sm text-gray-600">{activity.description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {formatActivityDate(activity.timestamp || activity.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                Нет активностей для этого обращения
              </div>
            )}
          </div>
        </div>

        {/* Правая панель с действиями */}
        <div className="w-64 border-l p-4 bg-gray-50">
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3">Действия</h3>
            <div className="space-y-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-sm"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Переместить
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-sm"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Копировать
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-sm"
                onClick={() => handleProcessWithAgent()}
                disabled={isProcessing}
              >
                <Bot className="h-4 w-4 mr-2" />
                Обработка ИИ
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Удалить
              </Button>
            </div>
          </div>
          
          {/* Блок статуса */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3">Статус</h3>
            <Select
              defaultValue={request.status}
              onValueChange={(value) => {
                onStatusChange(request.id, value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Новое</SelectItem>
                <SelectItem value="in_progress">В обработке</SelectItem>
                <SelectItem value="waiting">Ожидание</SelectItem>
                <SelectItem value="completed">Выполнено</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Блок с информацией о заявителе */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3">Заявитель</h3>
            <div className="border bg-white p-3 rounded-md">
              <div className="font-medium mb-1">{request.fullName}</div>
              <div className="text-sm text-gray-500 flex items-center">
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                {request.contactInfo}
              </div>
            </div>
          </div>
          
          {/* Организационная структура и ответственные */}
          <div>
            <h3 className="text-sm font-medium mb-3">Ответственные</h3>
            <div className="space-y-2">
              <div className="border bg-white p-3 rounded-md">
                <div className="text-xs text-gray-500 mb-1">Министерство</div>
                <div className="text-sm leading-tight">
                  Министерство цифрового развития, инноваций и аэрокосмической промышленности
                </div>
              </div>
              
              <div className="border bg-white p-3 rounded-md">
                <div className="text-xs text-gray-500 mb-1">Департамент</div>
                <div className="text-sm leading-tight">
                  Департамент цифровизации и развития государственных услуг
                </div>
              </div>
              
              <div className="border bg-white p-3 rounded-md">
                <div className="text-xs text-gray-500 mb-1">Отдел</div>
                <div className="text-sm leading-tight">
                  Отдел по работе с обращениями граждан
                </div>
              </div>
              
              <div className="border bg-white p-3 rounded-md">
                <div className="text-xs text-gray-500 mb-1">Ответственный</div>
                <div className="text-sm flex items-center">
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  Оператор системы
                </div>
              </div>
            </div>
            <div className="text-xs text-center mt-2 text-gray-500">
              * Данные организационной структуры будут автоматически подгружаться после её настройки
            </div>
          </div>
        </div>
      
      {/* Диалог подтверждения удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить обращение?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь удалить обращение №{request.id}. Это действие нельзя отменить.
              Информация об удалении будет записана в блокчейн для аудита.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRequest}
              className="bg-red-600 hover:bg-red-700"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </div>
  );
};

export default TrelloStyleRequestDetailView;