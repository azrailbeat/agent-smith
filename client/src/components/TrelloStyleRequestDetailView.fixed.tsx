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
  priority: string;
  createdAt: Date;
  assignedTo?: number | null;
  deadline?: Date | null;
  aiProcessed?: boolean;
  aiResult?: any;
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
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onAutoProcess?: () => void;
  availableAgents?: Agent[];
  onProcessWithAgent?: (request: CitizenRequest, agentId: number, action?: string) => void;
}

const TrelloStyleRequestDetailView: React.FC<TrelloStyleRequestDetailViewProps> = ({
  request,
  onClose,
  onStatusChange,
  onRequestUpdate,
  onProcess,
  priorityColors,
  activeTab: externalActiveTab = 'details',
  onTabChange,
  onAutoProcess,
  availableAgents = [],
  onProcessWithAgent
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState('details');
  const activeTab = externalActiveTab || internalActiveTab;
  
  const handleTabChange = (tab: string) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [processAction, setProcessAction] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [isManualProcessDialogOpen, setIsManualProcessDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Загрузка активностей
  useEffect(() => {
    if (request?.id) {
      fetchActivities();
    }
  }, [request]);

  // Загрузка истории операций для обращения
  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const result = await apiRequest('GET', `/api/citizen-requests/${request.id}/activities`);
      setActivities(result);
    } catch (error) {
      console.error('Ошибка загрузки активностей:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить историю обращения',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Обработка комментирования заявки
  const handleAddComment = async () => {
    if (!comment.trim()) return;
    
    try {
      setIsSubmittingComment(true);
      await apiRequest('POST', `/api/citizen-requests/${request.id}/comments`, { text: comment });
      toast({
        title: 'Комментарий добавлен',
        description: 'Комментарий успешно добавлен к обращению',
      });
      setComment('');
      fetchActivities();
      onRequestUpdate();
    } catch (error) {
      console.error('Ошибка добавления комментария:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить комментарий',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Обработка удаления обращения
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await apiRequest('DELETE', `/api/citizen-requests/${request.id}`);
      toast({
        title: 'Обращение удалено',
        description: 'Обращение успешно удалено из системы',
      });
      onRequestUpdate();
      onClose();
    } catch (error) {
      console.error('Ошибка удаления обращения:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить обращение',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Обработка запроса с выбранным агентом
  const handleProcessWithSelectedAgent = () => {
    if (!selectedAgent) {
      toast({
        title: 'Выберите агента',
        description: 'Необходимо выбрать агента для обработки',
        variant: 'destructive',
      });
      return;
    }
    
    if (onProcessWithAgent) {
      onProcessWithAgent(request, selectedAgent, processAction);
      setIsManualProcessDialogOpen(false);
    }
  };

  // Преобразование метки приоритета для отображения
  const getPriorityLabel = (priority: string) => {
    const priorityMap: {[key: string]: string} = {
      'low': 'Низкий',
      'medium': 'Средний',
      'high': 'Высокий',
      'critical': 'Критический'
    };
    return priorityMap[priority] || priority;
  };

  // Преобразование метки статуса для отображения
  const getStatusLabel = (status: string) => {
    const statusMap: {[key: string]: string} = {
      'new': 'Новое',
      'in_progress': 'В работе',
      'pending': 'Ожидает',
      'resolved': 'Решено',
      'rejected': 'Отклонено',
      'archived': 'В архиве'
    };
    return statusMap[status] || status;
  };

  // Преобразование типа действия в удобочитаемый формат
  const getActionTypeLabel = (actionType: string) => {
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

  const getStatusColor = (status: string) => {
    const statusColorMap: {[key: string]: string} = {
      'new': 'bg-blue-500',
      'in_progress': 'bg-yellow-500',
      'pending': 'bg-purple-500',
      'resolved': 'bg-green-500',
      'rejected': 'bg-red-500',
      'archived': 'bg-gray-500'
    };
    return statusColorMap[status] || 'bg-gray-500';
  };

  // Получение статуса обработки ИИ
  const getAiStatus = () => {
    if (!request.aiProcessed) {
      return (
        <div className="flex items-center text-yellow-600">
          <AlertCircle className="h-4 w-4 mr-1" />
          <span>Не обработано ИИ</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center text-green-600">
        <CheckCircle2 className="h-4 w-4 mr-1" />
        <span>Обработано ИИ</span>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-lg">
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-gray-700" />
          <h2 className="text-lg font-semibold">Обращение #{request.id}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <span className="sr-only">Закрыть</span>
          <span aria-hidden>×</span>
        </Button>
      </div>
      
      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="bg-white border-b px-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Детали</TabsTrigger>
            <TabsTrigger value="ai">ИИ обработка</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(85vh-120px)]">
          {/* Вкладка с деталями */}
          <TabsContent value="details" className="p-0 m-0">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium text-base mb-2">{request.subject}</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{request.description}</p>
                  
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Статус</p>
                      <div className="flex items-center mt-1">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(request.status)} mr-2`}></div>
                        <span>{getStatusLabel(request.status)}</span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Приоритет</p>
                      <div className="flex items-center mt-1">
                        <div className={`w-3 h-3 rounded-full ${priorityColors[request.priority] || 'bg-gray-500'} mr-2`}></div>
                        <span>{getPriorityLabel(request.priority)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      
                      {request.citizenInfo?.iin && (
                        <div className="flex items-center">
                          <CreditCard className="h-4 w-4 text-gray-500 mr-2" />
                          <p className="text-sm">{request.citizenInfo.iin}</p>
                        </div>
                      )}
                      
                      {request.citizenInfo?.address && (
                        <div className="flex items-start">
                          <Building className="h-4 w-4 text-gray-500 mt-0.5 mr-2" />
                          <p className="text-sm">{request.citizenInfo.address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Обработка заявки</h4>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                        <p className="text-sm">{new Date(request.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      
                      {request.deadline && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-500 mr-2" />
                          <p className="text-sm">Срок: {new Date(request.deadline).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <Bot className="h-4 w-4 text-gray-500 mr-2" />
                        {getAiStatus()}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-2">
                  <Label htmlFor="comment" className="text-sm font-medium">Добавить комментарий</Label>
                  <div className="mt-1 flex space-x-2">
                    <Textarea 
                      id="comment" 
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Введите комментарий..."
                      className="flex-1 min-h-[80px]"
                    />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      onClick={handleAddComment}
                      disabled={!comment.trim() || isSubmittingComment}
                      size="sm"
                    >
                      {isSubmittingComment ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <MessageSquare className="h-4 w-4 mr-2" />
                      )}
                      Отправить
                    </Button>
                  </div>
                </div>
                
                <Separator className="my-2" />
                
                <div className="flex flex-wrap gap-2 justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsManualProcessDialogOpen(true)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Ответить
                    </Button>
                    
                    {onAutoProcess && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={onAutoProcess}
                      >
                        <Bot className="h-4 w-4 mr-2" />
                        Автообработка
                      </Button>
                    )}
                  </div>
                  
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить
                  </Button>
                </div>
              </div>
            </CardContent>
          </TabsContent>
          
          {/* Вкладка с ИИ обработкой */}
          <TabsContent value="ai" className="p-0 m-0">
            <CardContent className="p-4">
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <h3 className="font-medium text-base mb-2 flex items-center">
                  <BrainCircuit className="h-5 w-5 mr-2 text-indigo-600" />
                  Результаты обработки ИИ
                </h3>
                
                {!request.aiProcessed ? (
                  <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <p className="font-medium">Обращение не обработано ИИ</p>
                    </div>
                    <p className="text-sm">Запустите обработку с помощью кнопки "Обработать ИИ" или выберите автоматическую обработку.</p>
                  </div>
                ) : request.aiResult ? (
                  <div className="space-y-4">
                    {request.aiResult.classification && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Классификация</h4>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-sm">{request.aiResult.classification}</p>
                        </div>
                      </div>
                    )}
                    
                    {request.aiResult.summary && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Краткое содержание</h4>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-sm">{request.aiResult.summary}</p>
                        </div>
                      </div>
                    )}
                    
                    {request.aiResult.response && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Предлагаемый ответ</h4>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-sm whitespace-pre-wrap">{request.aiResult.response}</p>
                        </div>
                      </div>
                    )}
                    
                    {request.aiResult.recommendations && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Рекомендации</h4>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-sm">{request.aiResult.recommendations}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">Нет данных об обработке ИИ</p>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {onProcessWithAgent && availableAgents && availableAgents.length > 0 && (
                  <>
                    <Select
                      value={selectedAgent?.toString() || ""}
                      onValueChange={(value) => setSelectedAgent(parseInt(value))}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Выберите агента" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAgents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id.toString()}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onProcessWithAgent(request, selectedAgent || availableAgents[0].id)}
                      disabled={!selectedAgent}
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      Обработать ИИ
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </TabsContent>
          
          {/* Вкладка с историей */}
          <TabsContent value="history" className="p-0 m-0">
            <CardContent className="p-4">
              <h3 className="font-medium text-base mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-indigo-600" />
                История обращения
              </h3>
              
              {isLoading ? (
                <div className="flex justify-center my-4">
                  <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />
                </div>
              ) : activities && activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity, index) => (
                    <div key={activity.id} className="relative pl-6">
                      {index < activities.length - 1 && (
                        <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-gray-200"></div>
                      )}
                      
                      <div className="absolute left-0 top-1 h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center">
                        {getActionIcon(activity.actionType)}
                      </div>
                      
                      <div className="bg-white border rounded-md p-3">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center">
                            <span className="font-medium text-sm">{activity.userName || 'Система'}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {getActionTypeLabel(activity.actionType)}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(activity.createdAt).toLocaleDateString('ru-RU', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        
                        <p className="text-sm">{activity.description}</p>
                        
                        {activity.blockchainHash && (
                          <div className="mt-1 flex items-center">
                            <Database className="h-3 w-3 text-indigo-600 mr-1" />
                            <span className="text-xs text-gray-500">
                              Блокчейн: {activity.blockchainHash.substring(0, 10)}...
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">История пуста</p>
              )}
            </CardContent>
          </TabsContent>
        </div>
      </Tabs>
      
      {/* Диалог подтверждения удаления */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить обращение?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие невозможно отменить. Обращение #{request.id} будет удалено из системы вместе со всеми связанными данными.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Диалог для ручной обработки */}
      <Dialog open={isManualProcessDialogOpen} onOpenChange={setIsManualProcessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ручная обработка обращения</DialogTitle>
            <DialogDescription>
              Выберите агента и действие для обработки обращения
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="agent-select" className="text-sm font-medium">Выберите агента</Label>
              <Select
                value={selectedAgent?.toString() || ""}
                onValueChange={(value) => setSelectedAgent(parseInt(value))}
              >
                <SelectTrigger id="agent-select" className="w-full mt-1">
                  <SelectValue placeholder="Выберите агента" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(availableAgents) && availableAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="action-select" className="text-sm font-medium">Действие</Label>
              <Select
                value={processAction}
                onValueChange={setProcessAction}
              >
                <SelectTrigger id="action-select" className="w-full mt-1">
                  <SelectValue placeholder="Выберите действие" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classify">Классификация</SelectItem>
                  <SelectItem value="summarize">Обобщение</SelectItem>
                  <SelectItem value="respond">Ответ</SelectItem>
                  <SelectItem value="recommend">Рекомендации</SelectItem>
                  <SelectItem value="full">Полная обработка</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManualProcessDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleProcessWithSelectedAgent}>
              <Bot className="h-4 w-4 mr-2" />
              Обработать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TrelloStyleRequestDetailView;