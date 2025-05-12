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
  Building, Users, LayoutGrid, CheckSquare 
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
    <div className="flex h-full max-h-[85vh]">
      {/* Основное содержимое */}
      <div className="flex-1 overflow-y-auto max-w-3xl pr-4">
        {/* Заголовок и информация о заявителе */}
        <div className="mb-4">
          <h1 className="text-xl font-semibold mb-2 line-clamp-2">
            {request.subject || request.title || "Обращение без темы"}
          </h1>
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <span>в списке</span>
            <Badge variant="outline" className="rounded-sm font-normal">
              {request.status === 'new' ? 'Новые' : 
               request.status === 'in_progress' || request.status === 'inProgress' ? 'В обработке' : 
               request.status === 'waiting' ? 'Ожидание' : 
               request.status === 'completed' ? 'Завершенные' : 'Другое'}
            </Badge>
          </div>
        </div>

        {/* Основная информация и ИИ-обработка в табах */}
        <Tabs defaultValue="info" className="mb-6">
          <TabsList className="mb-2">
            <TabsTrigger value="info" className="text-sm">Информация</TabsTrigger>
            <TabsTrigger value="ai" className="text-sm">ИИ обработка</TabsTrigger>
          </TabsList>
          
          {/* Вкладка с основной информацией */}
          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Тип обращения</label>
                <div className="font-medium">{request.requestType || "Не указан"}</div>
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Приоритет</label>
                <Badge className={`${priorityColors[request.priority] || "bg-gray-100 text-gray-800"}`}>
                  {request.priority === 'low' ? 'Низкий' : 
                   request.priority === 'medium' ? 'Средний' : 
                   request.priority === 'high' ? 'Высокий' : 
                   request.priority === 'urgent' ? 'Срочный' : 'Не указан'}
                </Badge>
              </div>
            </div>
            
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Описание</label>
              <div className="bg-gray-50 p-3 rounded-md text-sm min-h-[100px]">
                {request.description || request.content || "Описание отсутствует"}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Создано</label>
                <div className="text-sm flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-gray-500" />
                  {new Date(request.createdAt).toLocaleDateString('ru-RU')} в {new Date(request.createdAt).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Обновлено</label>
                <div className="text-sm flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-gray-500" />
                  {new Date(request.updatedAt).toLocaleDateString('ru-RU')} в {new Date(request.updatedAt).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Вкладка с ИИ-обработкой */}
          <TabsContent value="ai" className="space-y-4">
            {/* Результаты ИИ обработки */}
            {request.aiProcessed ? (
              <div className="space-y-4">
                {request.aiClassification && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" /> Классификация
                    </label>
                    <div className="bg-gray-50 p-3 rounded-md text-sm">
                      {request.aiClassification}
                    </div>
                  </div>
                )}
                
                {request.summary && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" /> Резюме
                    </label>
                    <div className="bg-gray-50 p-3 rounded-md text-sm">
                      {request.summary}
                    </div>
                  </div>
                )}
                
                {request.aiSuggestion && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                      <Lightbulb className="h-3.5 w-3.5" /> Рекомендация ИИ
                    </label>
                    <div className="bg-gray-50 p-3 rounded-md text-sm">
                      {request.aiSuggestion}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-md border border-amber-200 text-center">
                <Bot className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <h3 className="font-medium text-amber-800 mb-1">Обращение не обработано ИИ</h3>
                <p className="text-sm text-amber-700 mb-3">
                  Используйте ИИ-обработку для классификации, анализа и формирования рекомендаций по данному обращению.
                </p>
                
                <div className="grid grid-cols-1 gap-3">
                  <div className="mb-2">
                    <label className="text-xs font-medium text-amber-800 mb-1 block text-left">Выберите действие:</label>
                    <Select
                      value={selectedAction}
                      onValueChange={setSelectedAction}
                    >
                      <SelectTrigger className="border-amber-300 bg-white">
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
                        <SelectItem value="full">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            <span>Полная обработка</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleProcessWithAgent}
                    disabled={isProcessing}
                    className="w-full bg-amber-600 hover:bg-amber-700"
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
            )}
          </TabsContent>
        </Tabs>

        {/* Блок для комментариев */}
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
            <MessageSquare className="h-4 w-4" /> Комментарии
          </h3>
          
          <div className="mb-3">
            <Textarea
              placeholder="Напишите комментарий..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[80px] text-sm"
            />
            <div className="flex justify-end mt-2">
              <Button 
                size="sm" 
                onClick={handleAddComment}
                disabled={!comment.trim()}
              >
                Добавить комментарий
              </Button>
            </div>
          </div>
          
          {/* Список активностей */}
          <div className="space-y-3 mt-4">
            <h3 className="text-sm font-medium mb-2">История активностей</h3>
            
            {activitiesLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin h-5 w-5 border-2 border-primary rounded-full border-t-transparent mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Загрузка активностей...</p>
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {activities.map((activity) => (
                  <div key={activity.id} className="border-l-2 pl-3 py-1 border-gray-200 hover:border-primary transition-colors">
                    <div className="flex items-start gap-2">
                      <div className="p-1 rounded-full bg-gray-100 mt-0.5">
                        {getActionIcon(activity.actionType || activity.action || '')}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {activity.userName || 'Система'}
                        </div>
                        <div className="text-sm text-gray-600">{activity.description}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {formatActivityDate(activity.timestamp || activity.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                Нет активностей для этого обращения
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Правая панель с действиями */}
      <div className="w-64 border-l pl-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2">Действия</h3>
          <div className="space-y-1.5">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-sm"
              onClick={() => {
                // Окно формы перемещения в список
                // Пока просто показываем выбор статуса
              }}
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
            
            <Separator className="my-2" />
            
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
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2">Статус</h3>
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
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2">Заявитель</h3>
          <div className="p-2 bg-gray-50 rounded border">
            <div className="font-medium text-sm">{request.fullName}</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {request.contactInfo}
            </div>
          </div>
        </div>
        
        {/* Организационная структура и ответственные */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2">Ответственные</h3>
          <div className="space-y-2">
            {/* Отображаем заглушку с информацией о иерархии */}
            <div className="p-2 bg-gray-50 rounded border">
              <div className="text-xs font-medium">Министерство</div>
              <div className="text-sm">
                Министерство цифрового развития, инноваций и аэрокосмической промышленности
              </div>
            </div>
            
            <div className="p-2 bg-gray-50 rounded border">
              <div className="text-xs font-medium">Департамент</div>
              <div className="text-sm">
                Департамент цифровизации и развития государственных услуг
              </div>
            </div>
            
            <div className="p-2 bg-gray-50 rounded border">
              <div className="text-xs font-medium">Отдел</div>
              <div className="text-sm">
                Отдел по работе с обращениями граждан
              </div>
            </div>
            
            <div className="p-2 bg-gray-50 rounded border">
              <div className="text-xs font-medium">Ответственный</div>
              <div className="text-sm flex items-center gap-1">
                <User className="h-3 w-3" />
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
  );
};

export default TrelloStyleRequestDetailView;