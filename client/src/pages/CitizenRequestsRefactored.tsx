import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from '@hello-pangea/dnd';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import CitizenRequestAgentSection from '@/components/CitizenRequestAgentSection';
import RequestInsightPanel from '@/components/RequestInsightPanel';
import { AutoProcessDialog } from '../components/AutoProcessDialog';
import TrelloStyleRequestCard from '@/components/TrelloStyleRequestCard';
import { Bot, Calendar, Check, Clock, Database, FileText, Inbox, RefreshCw, User, Plus, ChevronDown } from 'lucide-react';

// Типы данных
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

interface KanbanColumn {
  id: string;
  title: string;
  requestIds: number[];
}

interface RequestsKanbanBoard {
  columns: {
    [key: string]: KanbanColumn;
  };
  columnOrder: string[];
}

interface FormData {
  fullName: string;
  contactInfo: string;
  requestType: string;
  subject: string;
  description: string;
  recordedAudio?: boolean;
}

interface AgentSettings {
  enabled: boolean;
  agentId?: number;
  autoProcess?: boolean;
  autoClassify?: boolean;
  autoRespond?: boolean;
}

/**
 * Компонент страницы обращений граждан
 */
const CitizenRequests: React.FC = () => {
  // Состояние запросов
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Запрос данных обращений
  const { data: citizenRequests = [], isLoading } = useQuery<CitizenRequest[]>({
    queryKey: ["/api/citizen-requests"],
    refetchOnWindowFocus: false
  });

  // Состояние для канбан-доски
  const [board, setBoard] = useState<RequestsKanbanBoard>({
    columns: {
      new: {
        id: "new",
        title: "Новые",
        requestIds: [],
      },
      inProgress: {
        id: "inProgress",
        title: "В работе",
        requestIds: [],
      },
      waiting: {
        id: "waiting",
        title: "Ожидание",
        requestIds: [],
      },
      completed: {
        id: "completed",
        title: "Выполнено",
        requestIds: [],
      },
    },
    columnOrder: ["new", "inProgress", "waiting", "completed"],
  });

  // Состояние для диалогов и форм
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isNewRequestOpen, setIsNewRequestOpen] = useState<boolean>(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState<boolean>(false);
  const [isAutoProcessOpen, setIsAutoProcessOpen] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<CitizenRequest | null>(null);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    contactInfo: "",
    requestType: "Обращение",
    subject: "",
    description: "",
  });
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [agentSettings, setAgentSettings] = useState<AgentSettings>({
    enabled: false,
    autoProcess: false,
    autoClassify: true,
    autoRespond: false,
  });

  // Цвета для приоритетов
  const priorityColors = {
    low: 'bg-green-50 text-green-700',
    medium: 'bg-blue-50 text-blue-700',
    high: 'bg-amber-50 text-amber-700',
    urgent: 'bg-red-50 text-red-700',
  };

  // Цвета бордеров для приоритетов
  const priorityBorderColors = {
    low: 'border-l-green-500',
    medium: 'border-l-blue-500',
    high: 'border-l-amber-500',
    urgent: 'border-l-red-500',
  };
  
  // Цвета для статусов
  const statusColors = {
    new: 'bg-blue-100 text-blue-800',
    inProgress: 'bg-amber-100 text-amber-800',
    waiting: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
  };
  
  // Иконки для статусов
  const statusIcons = {
    new: <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>,
    inProgress: <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>,
    waiting: <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>,
    completed: <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>,
  };

  // Функция для получения обращения по ID
  const getRequestById = (id: number): CitizenRequest | undefined => {
    return citizenRequests.find(request => request.id === id);
  };

  // Мутации для работы с данными
  const createRequestMutation = useMutation({
    mutationFn: (newRequest: any) => apiRequest('POST', '/api/citizen-requests', newRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
      toast({
        title: "Обращение создано",
        description: "Новое обращение успешно создано",
      });
      setIsNewRequestOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("Failed to create request:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать обращение",
        variant: "destructive",
      });
    },
  });

  const updateRequestStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest('PATCH', `/api/citizen-requests/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
    },
    onError: (error: any) => {
      console.error("Failed to update request status:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус обращения",
        variant: "destructive",
      });
    },
  });

  // Обработка обращения с помощью AI
  const processRequestWithAI = async (requestId: number, actionType: string = "classification") => {
    try {
      const response = await apiRequest('POST', `/api/citizen-requests/${requestId}/process`, {
        agentId: agentSettings.agentId,
        actionType
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
      
      return response;
    } catch (error) {
      console.error("Failed to process request with AI:", error);
      toast({
        title: "Ошибка AI-обработки",
        description: "Не удалось обработать обращение с помощью ИИ",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Обновление канбан-доски при изменении данных
  useEffect(() => {
    if (citizenRequests.length === 0) return;
    
    const newBoard: RequestsKanbanBoard = {
      columns: {
        new: {
          ...board.columns.new,
          requestIds: [],
        },
        inProgress: {
          ...board.columns.inProgress,
          requestIds: [],
        },
        waiting: {
          ...board.columns.waiting,
          requestIds: [],
        },
        completed: {
          ...board.columns.completed,
          requestIds: [],
        },
      },
      columnOrder: ["new", "inProgress", "waiting", "completed"],
    };

    citizenRequests.forEach((request) => {
      switch (request.status) {
        case "new":
          newBoard.columns.new.requestIds.push(request.id);
          break;
        case "in_progress":
        case "inProgress":
          newBoard.columns.inProgress.requestIds.push(request.id);
          break;
        case "waiting":
          newBoard.columns.waiting.requestIds.push(request.id);
          break;
        case "completed":
          newBoard.columns.completed.requestIds.push(request.id);
          break;
        default:
          newBoard.columns.new.requestIds.push(request.id);
      }
    });

    setBoard(newBoard);
  }, [citizenRequests]);

  // Обработчик завершения перетаскивания
  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Если нет места назначения или место назначения совпадает с местом источника, ничего не делаем
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    // Находим колонку источника и колонку назначения
    const sourceColumn = board.columns[source.droppableId];
    const destColumn = board.columns[destination.droppableId];

    // Если перемещение происходит в той же колонке
    if (sourceColumn.id === destColumn.id) {
      const newRequestIds = Array.from(sourceColumn.requestIds);
      newRequestIds.splice(source.index, 1);
      newRequestIds.splice(destination.index, 0, parseInt(draggableId));

      const newColumn = {
        ...sourceColumn,
        requestIds: newRequestIds,
      };

      const newBoard = {
        ...board,
        columns: {
          ...board.columns,
          [newColumn.id]: newColumn,
        },
      };

      setBoard(newBoard);
      return;
    }

    // Если перемещение между колонками
    const sourceRequestIds = Array.from(sourceColumn.requestIds);
    sourceRequestIds.splice(source.index, 1);
    const newSourceColumn = {
      ...sourceColumn,
      requestIds: sourceRequestIds,
    };

    const destinationRequestIds = Array.from(destColumn.requestIds);
    destinationRequestIds.splice(destination.index, 0, parseInt(draggableId));
    const newDestinationColumn = {
      ...destColumn,
      requestIds: destinationRequestIds,
    };

    const newBoard = {
      ...board,
      columns: {
        ...board.columns,
        [newSourceColumn.id]: newSourceColumn,
        [newDestinationColumn.id]: newDestinationColumn,
      },
    };

    setBoard(newBoard);

    // Находим перемещенный запрос и обновляем его статус
    const requestId = parseInt(draggableId);
    let newStatus = destination.droppableId;
    
    // Преобразуем статус для бэкенда
    if (newStatus === 'inProgress') {
      newStatus = 'in_progress';
    }

    // Вызываем мутацию для обновления статуса запроса в API
    updateRequestStatusMutation.mutate({
      id: requestId,
      status: newStatus,
    });
  };

  // Сброс формы после отправки
  const resetForm = () => {
    setFormData({
      fullName: "",
      contactInfo: "",
      requestType: "Обращение",
      subject: "",
      description: "",
      recordedAudio: false,
    });
    setAudioUrl("");
  };

  // Обработчик изменений в форме
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Обработчик отправки формы
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRequestMutation.mutate(formData);
  };

  // Обработка массовой обработки обращений с AI
  const handleBatchProcess = async (settings: { agentId?: number; autoProcess?: boolean; autoClassify?: boolean; autoRespond?: boolean }) => {
    try {
      // Проверка наличия агента
      if (!settings.agentId) {
        toast({
          title: "Ошибка",
          description: "Выберите ИИ-агента для обработки обращений",
          variant: "destructive",
        });
        return;
      }

      await apiRequest('POST', '/api/citizen-requests/process-batch', settings);
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
      toast({
        title: "Обработка запущена",
        description: "Массовая обработка обращений запущена",
      });
    } catch (error) {
      console.error("Failed to batch process requests:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось запустить массовую обработку обращений",
        variant: "destructive",
      });
    }
  };

  // Подсчет статистики
  const stats = {
    total: citizenRequests.length,
    new: citizenRequests.filter(r => r.status === 'new').length,
    inProgress: citizenRequests.filter(r => r.status === 'in_progress' || r.status === 'inProgress').length,
    waiting: citizenRequests.filter(r => r.status === 'waiting').length,
    completed: citizenRequests.filter(r => r.status === 'completed').length,
    aiProcessed: citizenRequests.filter(r => r.aiProcessed).length
  };

  // Поиск обращений
  const filteredRequests = searchQuery.length > 0
    ? citizenRequests.filter(request => 
        request.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (request.description && request.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : citizenRequests;

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] overflow-hidden">
      {/* Верхняя панель в стиле Etap Phuket */}
      <div className="bg-white border-b py-2 px-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Воронка обращений</h1>
            <p className="text-sm text-gray-500">Управление и обслуживание процесса обработки обращений</p>
          </div>

          <div className="flex items-center gap-1">
            <Badge variant="outline" className="px-2 py-0.5 text-xs">
              Всего: {stats.total}
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 px-2 py-0.5 text-xs">
              Новых: {stats.new}
            </Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 px-2 py-0.5 text-xs">
              В работе: {stats.inProgress}
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 px-2 py-0.5 text-xs">
              Ожидание: {stats.waiting}
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 px-2 py-0.5 text-xs">
              Выполнено: {stats.completed}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Панель инструментов */}
      <div className="bg-white border-b py-1 px-4 flex items-center justify-between">
        <div className="relative w-64">
          <Input
            placeholder="Поиск обращений..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">ИИ обработка:</span>
            <Switch
              className="h-4 w-7"
              checked={agentSettings.enabled}
              onCheckedChange={(checked) => setAgentSettings({ ...agentSettings, enabled: checked })}
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsAutoProcessOpen(true)}>
            <Bot className="h-3 w-3 mr-1" />
            Авто-обработка
          </Button>
          <div className="bg-gray-100 rounded-md px-2 py-1 flex items-center text-xs gap-1 h-8">
            <span>Все статусы</span>
            <ChevronDown className="h-3 w-3" />
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] })}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Обновить
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => setIsNewRequestOpen(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Создать обращение
          </Button>
        </div>
      </div>

      {/* Канбан-доска обращений */}
      <div className="flex-1 bg-gray-50 overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
              <p className="mt-2 text-gray-600">Загрузка обращений...</p>
            </div>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="h-full w-full py-2 px-1 flex gap-1">
              {board.columnOrder.map((columnId) => {
                  const column = board.columns[columnId];
                  const requestsInColumn = column.requestIds
                    .map((requestId) => getRequestById(requestId))
                    .filter((request): request is CitizenRequest => request !== undefined);
                  
                  // Определяем цвет фона для колонки
                  const columnColor = columnId === 'new' ? 'bg-blue-50' :
                                     columnId === 'inProgress' ? 'bg-amber-50' :
                                     columnId === 'waiting' ? 'bg-purple-50' :
                                     columnId === 'completed' ? 'bg-green-50' : 'bg-gray-50';
                  
                  // Определяем цвет заголовка для колонки
                  const headerColor = columnId === 'new' ? 'bg-blue-100 text-blue-800' :
                                     columnId === 'inProgress' ? 'bg-amber-100 text-amber-800' :
                                     columnId === 'waiting' ? 'bg-purple-100 text-purple-800' :
                                     columnId === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';

                  return (
                    <div key={column.id} className={`flex-1 rounded-md border shadow-sm bg-white overflow-hidden flex flex-col h-full min-w-[260px]`}>
                      <div className={`p-2 border-b sticky top-0 z-10 ${headerColor}`}>
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold flex items-center text-sm">
                            {statusIcons[column.id as keyof typeof statusIcons]}
                            <span className="ml-1">{column.title}</span>
                          </h3>
                          <div className="flex items-center gap-1">
                            <div className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-white border shadow-sm min-w-[22px] text-center">
                              {requestsInColumn.length}
                            </div>
                            <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-white/80" onClick={(e) => e.stopPropagation()}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <Droppable droppableId={column.id}>
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="p-2 flex-1 overflow-y-auto bg-gray-50/50 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 transition duration-200"
                          >
                          {requestsInColumn.length === 0 ? (
                            <div className="text-center py-4 px-2 text-gray-500 text-sm bg-white/80 rounded-md border border-dashed border-gray-300 my-2 transition-all duration-300 hover:bg-white hover:border-gray-400">
                              <Inbox className="h-8 w-8 mx-auto mb-2 text-gray-400 opacity-70" />
                              <p className="font-medium text-xs">Нет обращений</p>
                              <p className="text-xs text-gray-400 mt-1">Переместите карточки сюда</p>
                            </div>
                          ) : (
                            requestsInColumn.map((request, index) => (
                              <Draggable
                                key={request.id}
                                draggableId={String(request.id)}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <TrelloStyleRequestCard
                                    request={request}
                                    priorityBorderColors={priorityBorderColors}
                                    priorityColors={priorityColors}
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setIsViewDetailsOpen(true);
                                    }}
                                    draggableProps={provided.draggableProps}
                                    dragHandleProps={provided.dragHandleProps}
                                    innerRef={provided.innerRef}
                                    isDragging={snapshot.isDragging}
                                  />
                                )}
                              </Draggable>
                            ))
                          )}
                          {provided.placeholder}
                        </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Диалог создания нового обращения */}
      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Новое обращение</DialogTitle>
            <DialogDescription>
              Заполните форму для создания нового обращения гражданина
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="fullName">ФИО</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="contactInfo">Контактная информация</Label>
                  <Input
                    id="contactInfo"
                    name="contactInfo"
                    value={formData.contactInfo}
                    onChange={handleInputChange}
                    placeholder="Телефон или email"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="requestType">Тип обращения</Label>
                  <Select
                    value={formData.requestType}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, requestType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип обращения" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Обращение">Обращение</SelectItem>
                      <SelectItem value="Жалоба">Жалоба</SelectItem>
                      <SelectItem value="Предложение">Предложение</SelectItem>
                      <SelectItem value="Заявление">Заявление</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="subject">Тема</Label>
                  <Input
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewRequestOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit">Создать обращение</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Диалог просмотра деталей обращения */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedRequest.subject || selectedRequest.title || 'Без темы'}</span>
                  <Badge className={`${priorityColors[selectedRequest.priority as keyof typeof priorityColors]}`} variant="outline">
                    {selectedRequest.priority || 'Обычный'}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="flex items-center justify-between">
                  <span>
                    От: {selectedRequest.fullName} ({selectedRequest.contactInfo || 'Нет контактной информации'})
                  </span>
                  <span className="text-xs">
                    Создано: {new Date(selectedRequest.createdAt).toLocaleString('ru-RU')}
                  </span>
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Детали</TabsTrigger>
                  <TabsTrigger value="ai-processing">ИИ обработка</TabsTrigger>
                  <TabsTrigger value="history">История</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Информация об обращении</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium">Тип обращения</h4>
                        <p>{selectedRequest.requestType}</p>
                      </div>
                      <div>
                        <h4 className="font-medium">Описание</h4>
                        <p className="text-sm whitespace-pre-wrap">
                          {selectedRequest.description || selectedRequest.content || 'Нет описания'}
                        </p>
                      </div>
                      {selectedRequest.summary && (
                        <div>
                          <h4 className="font-medium">Резюме (AI)</h4>
                          <p className="text-sm text-muted-foreground">{selectedRequest.summary}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium">Статус</h4>
                          <Badge className={statusColors[selectedRequest.status as keyof typeof statusColors]} variant="outline">
                            {selectedRequest.status === 'new' ? 'Новое' :
                            selectedRequest.status === 'in_progress' || selectedRequest.status === 'inProgress' ? 'В работе' :
                            selectedRequest.status === 'waiting' ? 'Ожидание' :
                            selectedRequest.status === 'completed' ? 'Выполнено' : selectedRequest.status}
                          </Badge>
                        </div>
                        <div>
                          <h4 className="font-medium">Создано</h4>
                          <p className="text-sm">{new Date(selectedRequest.createdAt).toLocaleString('ru-RU')}</p>
                        </div>
                        {selectedRequest.assignedTo && (
                          <div>
                            <h4 className="font-medium">Назначено</h4>
                            <p className="text-sm">ID: {selectedRequest.assignedTo}</p>
                          </div>
                        )}
                        {selectedRequest.updatedAt && (
                          <div>
                            <h4 className="font-medium">Обновлено</h4>
                            <p className="text-sm">{new Date(selectedRequest.updatedAt).toLocaleString('ru-RU')}</p>
                          </div>
                        )}
                      </div>
                      {selectedRequest.responseText && (
                        <div>
                          <h4 className="font-medium">Ответ</h4>
                          <p className="text-sm whitespace-pre-wrap">{selectedRequest.responseText}</p>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter>
                      <div className="flex justify-between w-full">
                        <Button variant="outline" size="sm" onClick={() => setIsViewDetailsOpen(false)}>Закрыть</Button>
                        <div className="space-x-2">
                          {agentSettings.enabled && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                processRequestWithAI(selectedRequest.id, "classification").then(() => {
                                  toast({
                                    title: "Обработка завершена",
                                    description: "Обращение успешно обработано AI",
                                  });
                                });
                              }}
                            >
                              <Bot className="h-4 w-4 mr-2" />
                              Обработать AI
                            </Button>
                          )}
                          <Button size="sm">
                            <Check className="h-4 w-4 mr-2" />
                            Обработать
                          </Button>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                <TabsContent value="ai-processing" className="mt-4">
                  <CitizenRequestAgentSection 
                    request={selectedRequest} 
                    agentSettings={agentSettings}
                    onProcess={processRequestWithAI}
                  />
                </TabsContent>
                
                <TabsContent value="history" className="mt-4">
                  <RequestInsightPanel request={selectedRequest} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог настройки автоматической обработки */}
      <AutoProcessDialog
        open={isAutoProcessOpen}
        onOpenChange={setIsAutoProcessOpen}
        settings={agentSettings}
        onSettingsChange={setAgentSettings}
        onProcess={handleBatchProcess}
      />
    </div>
  );
};

export default CitizenRequests;