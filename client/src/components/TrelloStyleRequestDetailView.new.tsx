/**
 * Agent Smith Platform - Компонент отображения деталей обращения со всеми табами одновременно
 * 
 * Объединяет информацию об обращении и результаты ИИ-обработки в единый интерфейс
 * в виде одной страницы без табов
 * 
 * @version 1.2.0
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
  Building, Users, LayoutGrid, CheckSquare, BrainCircuit, History,
  Loader2, Trash, Cpu, Zap
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

// Расширенный тип для детального представления обращения
interface RequestDetails extends CitizenRequest {
  contactInfo: string;
  citizenInfo?: {
    name?: string;
    contact?: string;
    address?: string;
    iin?: string;
  };
}

interface TrelloStyleRequestDetailViewProps {
  request: RequestDetails;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (request: RequestDetails) => void;
  onDelete?: (requestId: number) => void;
  onStatusChange?: (requestId: number, newStatus: string) => void;
  // Параметры для автоматической обработки
  onAutoProcess?: () => void;
  // Параметры для обработки с помощью ИИ-агентов
  availableAgents?: Agent[];
  onProcessWithAgent?: (request: RequestDetails, agentId: number, action?: string) => void;
}

const TrelloStyleRequestDetailView: React.FC<TrelloStyleRequestDetailViewProps> = ({
  request,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onStatusChange,
  onAutoProcess,
  availableAgents,
  onProcessWithAgent
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);
  const [aiClassification, setAiClassification] = useState<string | null>(null);
  const [processingAgent, setProcessingAgent] = useState<number | null>(null);
  
  // Форматирование даты
  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return "Не указано";
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleString('ru-RU');
  };
  
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
  
  // Получить цвет текста статуса
  const getStatusTextColor = (status: string): string => {
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
  
  // Получить фоновый цвет статуса
  const getStatusBgColor = (status: string): string => {
    const statusColors: {[key: string]: string} = {
      'pending': 'bg-yellow-400',
      'inprogress': 'bg-blue-400',
      'completed': 'bg-green-400',
      'cancelled': 'bg-red-400',
      'rejected': 'bg-gray-400',
      'new': 'bg-purple-400',
      'waiting': 'bg-orange-400'
    };
    return statusColors[status] || 'bg-gray-400';
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
      'priority_change': 'Изменение приоритета',
      'document_attach': 'Прикрепление документа'
    };
    return actionTypeMap[actionType] || actionType;
  };
  
  // Получить иконку для типа действия
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return <Plus className="h-3 w-3 text-green-500" />;
      case 'update':
        return <Edit className="h-3 w-3 text-blue-500" />;
      case 'status_change':
        return <RefreshCw className="h-3 w-3 text-yellow-500" />;
      case 'comment':
        return <MessageSquare className="h-3 w-3 text-purple-500" />;
      case 'assign':
        return <UserCheck className="h-3 w-3 text-orange-500" />;
      case 'process':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'ai_process':
        return <Bot className="h-3 w-3 text-amber-500" />;
      case 'blockchain_record':
        return <Database className="h-3 w-3 text-cyan-500" />;
      case 'priority_change':
        return <Flag className="h-3 w-3 text-red-500" />;
      case 'document_attach':
        return <FileText className="h-3 w-3 text-indigo-500" />;
      default:
        return <Info className="h-3 w-3 text-gray-500" />;
    }
  };
  
  // Обработка изменения статуса
  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(request.id, newStatus);
    }
  };
  
  // Обработка изменения агента
  const handleProcessWithAgent = () => {
    if (processingAgent && onProcessWithAgent) {
      setIsProcessing(true);
      onProcessWithAgent(request, processingAgent, 'full');
      setIsProcessing(false);
    } else {
      toast({
        title: "Ошибка",
        description: "Выберите агента для обработки",
        variant: "destructive"
      });
    }
  };
  
  // Обработка автоматической обработки
  const handleAutoProcess = () => {
    if (onAutoProcess) {
      onAutoProcess();
    }
  };
  
  // Отправка комментария
  const handleCommentSubmit = () => {
    if (!comment.trim()) return;
    
    // Отправляем комментарий на сервер
    const commentMutation = apiRequest('POST', `/api/citizen-requests/${request.id}/comment`, { text: comment });
    
    commentMutation
      .then(() => {
        setComment('');
        queryClient.invalidateQueries({ queryKey: [`/api/citizen-requests/${request.id}/activities`] });
        toast({
          title: "Комментарий добавлен",
          description: "Ваш комментарий успешно добавлен",
        });
      })
      .catch((err) => {
        console.error("Error submitting comment:", err);
        toast({
          title: "Ошибка",
          description: "Не удалось добавить комментарий",
          variant: "destructive",
        });
      });
  };
  
  // Сохранение изменений
  const handleSubmit = () => {
    if (onUpdate) {
      onUpdate(request);
    }
    onClose();
  };
  
  // Сохранить в блокчейн
  const saveToBlockchain = () => {
    apiRequest('POST', `/api/citizen-requests/${request.id}/blockchain`, {})
      .then((data) => {
        toast({
          title: "Сохранение в блокчейн",
          description: `Данные обращения сохранены в блокчейн: ${data.blockchainHash ? data.blockchainHash.substring(0, 8) + '...' : 'успешно'}`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
        queryClient.invalidateQueries({ queryKey: [`/api/citizen-requests/${request.id}/activities`] });
      })
      .catch((err) => {
        console.error("Error saving to blockchain:", err);
        toast({
          title: "Ошибка",
          description: "Не удалось сохранить данные в блокчейн",
          variant: "destructive",
        });
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={isOpen ? onClose : undefined}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-3 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl flex items-center gap-2">
              Обращение #{request.id} 
              <Badge className={`${getPriorityColor(request.priority)} text-white ml-2 px-3 py-1`}>
                {getPriorityLabel(request.priority)}
              </Badge>
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {/* Секция Детали */}
          <div className="border-b p-4 bg-gray-50">
            <h3 className="text-lg font-medium">Детали</h3>
          </div>
          <div className="p-6">
            <h4 className="text-lg font-medium mb-3">{request.subject}</h4>
            <p className="text-sm text-gray-700 mb-6 whitespace-pre-line leading-relaxed">{request.description}</p>
            
            <div className="grid md:grid-cols-2 gap-6 mt-4">
              <div>
                <h5 className="text-sm font-medium mb-2">Статус</h5>
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full ${getStatusBgColor(request.status)} mr-2`}></div>
                  <span className="text-sm">{getStatusLabel(request.status)}</span>
                </div>
              </div>
              
              <div>
                <h5 className="text-sm font-medium mb-2">Приоритет</h5>
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full ${getPriorityColor(request.priority)} mr-2`}></div>
                  <span className="text-sm">{getPriorityLabel(request.priority)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8">
              <h5 className="text-base font-medium mb-3">Информация о заявителе</h5>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center text-sm mb-3">
                  <User className="h-4 w-4 text-blue-500 mr-3" />
                  <span className="font-medium">{request.fullName}</span>
                </div>
                {/* Email, если есть */}
                {request.contactInfo && (
                  <div className="flex items-center text-sm mb-3">
                    <Mail className="h-4 w-4 text-blue-500 mr-3" />
                    <span>{request.contactInfo}</span>
                  </div>
                )}
                {request.citizenInfo && (
                  <>
                    {request.citizenInfo.address && (
                      <div className="flex items-start text-sm mb-3">
                        <Building className="h-4 w-4 text-blue-500 mr-3 mt-0.5" />
                        <span>{request.citizenInfo.address}</span>
                      </div>
                    )}
                    {request.citizenInfo.iin && (
                      <div className="flex items-center text-sm mb-3">
                        <CreditCard className="h-4 w-4 text-blue-500 mr-3" />
                        <span>ИИН: {request.citizenInfo.iin}</span>
                      </div>
                    )}
                  </>
                )}
                
                {/* Местоположение (данные из eOtinish) */}
                {(request.region || request.district || request.locality || 
                 (request.citizenInfo?.region || request.citizenInfo?.district || request.citizenInfo?.locality)) && (
                  <div className="flex items-start text-sm mt-3 pt-3 border-t border-gray-200">
                    <div className="w-full">
                      <div className="mb-2 text-gray-600 font-medium">Местоположение:</div>
                      <div className="pl-3 space-y-1">
                        {(request.region || request.citizenInfo?.region) && (
                          <div>Область: {request.region || request.citizenInfo?.region}</div>
                        )}
                        {(request.district || request.citizenInfo?.district) && (
                          <div>Район: {request.district || request.citizenInfo?.district}</div>
                        )}
                        {(request.locality || request.citizenInfo?.locality) && (
                          <div>Населенный пункт: {request.locality || request.citizenInfo?.locality}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Секция с категорией и подкатегорией (данные из eOtinish) */}
            {(request.category || request.subcategory || request.responsibleOrg || 
             (request.citizenInfo?.category || request.citizenInfo?.subcategory)) && (
              <div className="mt-5">
                <h5 className="text-base font-medium mb-3">Категоризация обращения</h5>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  {(request.category || request.citizenInfo?.category) && (
                    <div className="flex items-center text-sm mb-3">
                      <Tag className="h-4 w-4 text-blue-500 mr-3" />
                      <span className="text-gray-600 font-medium mr-2">Категория:</span>
                      <span>{request.category || request.citizenInfo?.category}</span>
                    </div>
                  )}
                  
                  {(request.subcategory || request.citizenInfo?.subcategory) && (
                    <div className="flex items-center text-sm mb-3">
                      <Tag className="h-4 w-4 text-blue-500 mr-3" />
                      <span className="text-gray-600 font-medium mr-2">Подкатегория:</span>
                      <span>{request.subcategory || request.citizenInfo?.subcategory}</span>
                    </div>
                  )}
                  
                  {request.responsibleOrg && (
                    <div className="flex items-center text-sm">
                      <Building className="h-4 w-4 text-blue-500 mr-3" />
                      <span className="text-gray-600 font-medium mr-2">Ответственная организация:</span>
                      <span>{request.responsibleOrg}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="mt-8">
              <h5 className="text-base font-medium mb-3">Обработка заявки</h5>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-3">
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 text-blue-500 mr-3" />
                  <span className="text-gray-600 font-medium mr-2">Создано:</span>
                  <span>{formatDate(request.createdAt)}</span>
                </div>
                
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 text-blue-500 mr-3" />
                  <span className="text-gray-600 font-medium mr-2">Последнее обновление:</span>
                  <span>{formatDate(request.updatedAt)}</span>
                </div>
                
                {request.deadline && (
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 text-orange-500 mr-3" />
                    <span className="text-gray-600 font-medium mr-2">Срок исполнения:</span>
                    <span className={request.overdue ? "text-red-500 font-semibold" : ""}>
                      {formatDate(request.deadline)}
                      {request.overdue && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 ml-2 px-2 py-0.5">
                          Просрочено
                        </Badge>
                      )}
                    </span>
                  </div>
                )}
                
                {request.completedAt && (
                  <div className="flex items-center text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-3" />
                    <span className="text-gray-600 font-medium mr-2">Завершено:</span>
                    <span>{formatDate(request.completedAt)}</span>
                  </div>
                )}
                
                {request.aiProcessed && (
                  <div className="flex items-center text-sm">
                    <Bot className="h-4 w-4 text-blue-500 mr-3" />
                    <span className="text-gray-600 font-medium mr-2">Обработано ИИ:</span>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 px-2 py-0.5">
                      Успешно
                    </Badge>
                  </div>
                )}
                
                {request.externalSource && (
                  <div className="flex items-center text-sm">
                    <Database className="h-4 w-4 text-blue-500 mr-3" />
                    <span className="text-gray-600 font-medium mr-2">Источник:</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-2 py-0.5">
                      {request.externalSource === 'eotinish' ? 'eӨтініш' : request.externalSource}
                    </Badge>
                    {request.externalRegNum && (
                      <span className="ml-2">№ {request.externalRegNum}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Секция ИИ обработка */}
          <div className="border-b p-4 bg-gray-50">
            <h3 className="text-lg font-medium">ИИ обработка</h3>
          </div>
          <div className="p-6">
            {/* Результаты обработки */}
            <div className="mb-6">
              <h4 className="text-base font-semibold flex items-center mb-4">
                <Bot className="h-5 w-5 text-purple-500 mr-2" />
                Результаты обработки ИИ
              </h4>
              
              {request.aiProcessed || request.aiClassification || request.aiSuggestion || request.aiResult ? (
                <div className="space-y-3">
                  {request.aiClassification && (
                    <div>
                      <p className="text-sm text-gray-600 font-medium mb-2">Классификация обращения</p>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 px-3 py-1 text-sm">
                        {request.aiClassification}
                      </Badge>
                    </div>
                  )}
                  
                  {request.aiSuggestion && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 font-medium mb-2">Рекомендации по обработке</p>
                      <div className="bg-purple-50 p-4 rounded-lg text-sm border border-purple-100 leading-relaxed">
                        {request.aiSuggestion}
                      </div>
                    </div>
                  )}
                  
                  {request.aiResult && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 font-medium mb-2">Подробный анализ</p>
                      <div className="bg-white border border-gray-200 p-4 rounded-lg text-sm shadow-sm">
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                          {typeof request.aiResult === 'object' 
                            ? JSON.stringify(request.aiResult, null, 2)
                            : request.aiResult}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center text-sm gap-2 px-4 py-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
                      onClick={saveToBlockchain}
                    >
                      <Database className="h-4 w-4 text-purple-500" />
                      Сохранить в блокчейн
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex flex-col items-center gap-3">
                    <Bot className="h-10 w-10 text-gray-300" />
                    <p className="text-gray-500 font-medium">Нет данных об обработке ИИ</p>
                    <p className="text-gray-400 text-sm">Используйте кнопки ниже для запуска обработки</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Обработать с помощью ИИ */}
            <div className="border-t pt-6 mt-6">
              <h4 className="text-base font-semibold mb-4 flex items-center">
                <Bot className="h-5 w-5 text-purple-600 mr-2" />
                Обработать с помощью ИИ
              </h4>
              <div className="space-y-3">
                <Select 
                  value={processingAgent?.toString() || ""} 
                  onValueChange={(value) => setProcessingAgent(parseInt(value))}
                >
                  <SelectTrigger className="w-full border-gray-200 h-10 hover:border-gray-300 focus:border-purple-400">
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
                
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button 
                    className="whitespace-nowrap px-4 py-6 h-10 bg-purple-600 hover:bg-purple-700 transition-colors rounded-md"
                    onClick={handleProcessWithAgent}
                    disabled={isProcessing || !processingAgent}
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Обработка...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4" /> Обработать ИИ
                      </div>
                    )}
                  </Button>
                  
                  {onAutoProcess && (
                    <Button 
                      variant="outline" 
                      onClick={onAutoProcess} 
                      disabled={isProcessing}
                      className="whitespace-nowrap px-4 h-10 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-purple-500" /> Автообработка
                      </div>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Секция История */}
          <div className="border-b p-4 bg-gray-50">
            <h3 className="text-lg font-medium">История</h3>
          </div>
          <div className="p-6">
            {/* История действий */}
            <div className="space-y-4">
              <h4 className="text-base font-semibold flex items-center mb-4">
                <History className="h-5 w-5 text-blue-500 mr-2" />
                История обращения
              </h4>
              
              {activitiesLoading ? (
                <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-100">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-500" />
                  <p className="text-gray-600 font-medium">Загрузка истории...</p>
                </div>
              ) : activities && Array.isArray(activities) && activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity: Activity, index: number) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="bg-white rounded-full h-8 w-8 mr-3 flex items-center justify-center border border-gray-200 shadow-sm">
                            {getActionIcon(activity.actionType)}
                          </div>
                          <span className="font-medium text-sm">{getActionTypeLabel(activity.actionType)}</span>
                        </div>
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-100">
                          {new Date(activity.createdAt).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      
                      {activity.description && (
                        <p className="text-sm text-gray-700 ml-8">{activity.description}</p>
                      )}
                      
                      {/* Комментарии */}
                      {activity.actionType === 'comment' && activity.metadata && (
                        <div className="mt-2 ml-8 p-3 bg-white rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-700 whitespace-pre-line">{activity.metadata.content || activity.metadata.text || activity.description}</p>
                        </div>
                      )}
                      
                      {/* Перемещения между списками */}
                      {activity.actionType === 'status_change' && activity.metadata && (
                        <div className="mt-2 ml-8 p-2 bg-white rounded-lg border border-gray-200">
                          <div className="flex items-center text-xs text-gray-700">
                            <div className="flex-1 flex items-center">
                              <div className={`h-2 w-2 rounded-full mr-1 ${getStatusBgColor(activity.metadata.oldStatus || '')}`}></div>
                              <span>{getStatusLabel(activity.metadata.oldStatus || '')}</span>
                            </div>
                            <RefreshCw className="h-3 w-3 mx-2 text-gray-400" />
                            <div className="flex-1 flex items-center">
                              <div className={`h-2 w-2 rounded-full mr-1 ${getStatusBgColor(activity.metadata.newStatus || '')}`}></div>
                              <span>{getStatusLabel(activity.metadata.newStatus || '')}</span>
                            </div>
                          </div>
                        </div>
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
                  <div className="flex flex-col items-center gap-2">
                    <Clock className="h-8 w-8 text-gray-300" />
                    <p className="text-gray-500">История пуста</p>
                    <p className="text-xs text-gray-400">Действия с этим обращением будут отображаться здесь</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Добавить комментарий */}
            <div className="mt-8 pt-6 border-t">
              <h4 className="text-base font-semibold mb-4">Добавить комментарий</h4>
              <div className="space-y-4">
                <Textarea 
                  placeholder="Введите комментарий..." 
                  value={comment} 
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[100px] border-gray-200 focus:border-blue-300 rounded-lg"
                />
                <div className="flex justify-end">
                  <Button 
                    variant="default" 
                    size="sm"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-colors"
                    onClick={handleCommentSubmit}
                    disabled={!comment.trim()}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Отправить
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Кнопки действий */}
        <div className="flex justify-between p-5 border-t bg-gray-50 sticky bottom-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onClose()}
            className="px-5 py-2 border-gray-300 hover:bg-gray-100 transition-colors"
          >
            Закрыть
          </Button>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={saveToBlockchain}
              className="px-4 py-2 border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                Сохранить в блокчейн
              </div>
            </Button>
            
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrelloStyleRequestDetailView;