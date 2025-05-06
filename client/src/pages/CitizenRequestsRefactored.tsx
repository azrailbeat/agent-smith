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
import { Bot, Calendar, Check, Clock, Database, FileText, RefreshCw, User } from 'lucide-react';

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
    setFormData(prev => ({ ...prev, [name]: value }));
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
    <div className="container mx-auto py-6">
      <div className="mb-6 flex flex-wrap justify-between items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold">Обращения граждан</h1>
          <p className="text-muted-foreground">Управление и обработка обращений с помощью ИИ</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="px-4 py-1">
              Всего: {stats.total}
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 px-4 py-1">
              Новых: {stats.new}
            </Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 px-4 py-1">
              В работе: {stats.inProgress}
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 px-4 py-1">
              Ожидание: {stats.waiting}
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 px-4 py-1">
              Выполнено: {stats.completed}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => setIsNewRequestOpen(true)}>
              Новое обращение
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Input
            placeholder="Поиск обращений..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">ИИ обработка:</span>
            <Switch
              checked={agentSettings.enabled}
              onCheckedChange={(checked) => setAgentSettings({ ...agentSettings, enabled: checked })}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsAutoProcessOpen(true)}>
            <Bot className="h-4 w-4 mr-2" />
            Авто-обработка
          </Button>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
        </div>
      </div>

      {/* Канбан-доска обращений */}
      {isLoading ? (
        <div className="py-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
          <p className="mt-2 text-gray-600">Загрузка обращений...</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="w-full overflow-x-auto pb-4">
            <div className="flex space-x-5 min-w-max px-4">
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
                  <div key={column.id} className={`w-72 flex-shrink-0 rounded-lg border shadow-sm bg-white`}>
                    <div className={`p-3 border-b sticky top-0 z-10 bg-white rounded-t-lg ${headerColor}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium flex items-center">
                          {statusIcons[column.id]}
                          <span className="ml-2">{column.title}</span>
                        </h3>
                        <div className="px-2 py-1 rounded-full text-xs font-medium bg-white border">
                          {requestsInColumn.length}
                        </div>
                      </div>
                    </div>
                    <Droppable droppableId={column.id}>
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="p-2 min-h-[70vh] max-h-[calc(100vh-220px)] overflow-y-auto"
                        >
                        {requestsInColumn.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            Нет обращений
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
          </div>
        </DragDropContext>
      )}

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
                  <Badge className={`${priorityColors[selectedRequest.priority]}`} variant="outline">
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
                          <h4 className="font-medium">Резюме (ИИ)</h4>
                          <p className="text-sm bg-blue-50 p-3 rounded-md">
                            {selectedRequest.summary}
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium">Статус</h4>
                          <Badge className={statusColors[selectedRequest.status === 'in_progress' ? 'inProgress' : selectedRequest.status]}>
                            {selectedRequest.status === 'new' ? 'Новое' :
                             selectedRequest.status === 'in_progress' || selectedRequest.status === 'inProgress' ? 'В работе' :
                             selectedRequest.status === 'waiting' ? 'Ожидание' :
                             selectedRequest.status === 'completed' ? 'Выполнено' : selectedRequest.status}
                          </Badge>
                        </div>
                        <div>
                          <h4 className="font-medium">Приоритет</h4>
                          <Badge className={priorityColors[selectedRequest.priority]}>
                            {selectedRequest.priority === 'low' ? 'Низкий' :
                             selectedRequest.priority === 'medium' ? 'Средний' :
                             selectedRequest.priority === 'high' ? 'Высокий' :
                             selectedRequest.priority === 'urgent' ? 'Срочный' : selectedRequest.priority}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => {
                        // Обновление статуса
                        const newStatus = selectedRequest.status === 'completed' ? 'in_progress' : 'completed';
                        updateRequestStatusMutation.mutate({
                          id: selectedRequest.id,
                          status: newStatus
                        });
                      }}>
                        {selectedRequest.status === 'completed' ? 'Вернуть в работу' : 'Отметить как выполненное'}
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                <TabsContent value="ai-processing" className="mt-4">
                  <CitizenRequestAgentSection 
                    request={selectedRequest} 
                    onRequestProcess={(requestId, actionType) => processRequestWithAI(requestId, actionType)}
                    enabled={agentSettings.enabled}
                  />
                  
                  {selectedRequest.aiProcessed && (
                    <RequestInsightPanel request={selectedRequest} />
                  )}
                </TabsContent>
                
                <TabsContent value="history" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>История обработки</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <FileText className="h-4 w-4 text-blue-700" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Обращение создано</p>
                            <p className="text-xs text-gray-500">
                              {new Date(selectedRequest.createdAt).toLocaleString('ru-RU')}
                            </p>
                          </div>
                        </div>
                        
                        {selectedRequest.aiProcessed && (
                          <div className="flex items-center gap-3">
                            <div className="bg-purple-100 p-2 rounded-full">
                              <Bot className="h-4 w-4 text-purple-700" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Обработано ИИ</p>
                              <p className="text-xs text-gray-500">
                                {new Date(selectedRequest.updatedAt).toLocaleString('ru-RU')}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {selectedRequest.status === 'completed' && (
                          <div className="flex items-center gap-3">
                            <div className="bg-green-100 p-2 rounded-full">
                              <Check className="h-4 w-4 text-green-700" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Обращение выполнено</p>
                              <p className="text-xs text-gray-500">
                                {new Date(selectedRequest.completedAt || selectedRequest.updatedAt).toLocaleString('ru-RU')}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {selectedRequest.blockchainHash && (
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-full">
                              <Database className="h-4 w-4 text-blue-700" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Записано в блокчейн</p>
                              <p className="text-xs text-gray-500 font-mono">
                                {selectedRequest.blockchainHash.substring(0, 16)}...{selectedRequest.blockchainHash.substring(selectedRequest.blockchainHash.length - 8)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
              
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsViewDetailsOpen(false)}>Закрыть</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог автоматической обработки с ИИ */}
      <AutoProcessDialog
        isOpen={isAutoProcessOpen}
        onOpenChange={setIsAutoProcessOpen}
        settings={agentSettings}
        onSettingsChange={setAgentSettings}
        onProcess={handleBatchProcess}
      />
    </div>
  );
};

export default CitizenRequests;