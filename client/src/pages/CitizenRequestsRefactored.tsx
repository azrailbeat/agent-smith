import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ALLOWED_AGENT_TYPES } from '@shared/constants';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiRequest, queryClient } from '@/lib/queryClient';
import IntegrationSettings from '@/components/integration/IntegrationSettings';
import TrelloStyleRequestCard from '@/components/TrelloStyleRequestCard';
import AutoProcessingDialog, { AutoProcessSettings } from '@/components/AutoProcessingDialog';
import {
  ChevronDown,
  Plus,
  Bot,
  FileText,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Database,
  RefreshCw,
  Filter,
  MoreHorizontal,
  Tag
} from 'lucide-react';

// Интерфейсы для типизации
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

interface Agent {
  id: number;
  name: string;
  type: string;
  description?: string;
  isActive: boolean;
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

const CitizenRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRequest, setSelectedRequest] = useState<CitizenRequest | null>(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState<boolean>(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState<boolean>(false);
  // Состояние для настроек агентов
  const [agentSettings, setAgentSettings] = useState<{
    enabled: boolean;
    requestProcessingMode: 'manual' | 'auto' | 'smart';
    defaultAgent: number | null;
  }>({
    enabled: false,
    requestProcessingMode: 'manual',
    defaultAgent: null
  });
  const [selectedTab, setSelectedTab] = useState<string>('kanban');
  const [viewMode, setViewMode] = useState<'details' | 'ai' | 'history'>('details');

  // Состояние для формы создания запроса
  const [formData, setFormData] = useState<{
    fullName: string;
    contactInfo: string;
    requestType: string;
    subject: string;
    description: string;
  }>({
    fullName: "",
    contactInfo: "",
    requestType: "Обращение",
    subject: "",
    description: "",
  });
  
  // Загрузка списка обращений
  const { data: citizenRequests = [], isLoading } = useQuery<CitizenRequest[]>({
    queryKey: ["/api/citizen-requests"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/citizen-requests");
        if (!response.ok) throw new Error("Ошибка при загрузке обращений");
        return await response.json();
      } catch (error) {
        console.error("Ошибка при загрузке обращений:", error);
        // Возвращаем пустой массив в случае ошибки
        return [];
      }
    },
  });

  // Загрузка списка агентов
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    refetchOnWindowFocus: false,
  });

  // Фильтруем агентов для обработки обращений граждан
  const availableAgents = agents.filter(agent => 
    agent.type === "citizen_requests" && (agent.isActive !== false) // Считаем агента активным, если isActive не false или undefined
  );

  // Мутация для создания обращения
  const createRequestMutation = useMutation({
    mutationFn: (newRequest: any) => {
      return apiRequest('POST', '/api/citizen-requests', newRequest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
      toast({
        title: "Успешно",
        description: "Обращение создано",
      });
      setIsNewRequestOpen(false);
      setFormData({
        fullName: "",
        contactInfo: "",
        requestType: "Обращение",
        subject: "",
        description: "",
      });
    },
    onError: (error) => {
      console.error("Error creating request:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать обращение",
        variant: "destructive",
      });
    },
  });

  // Мутация для обновления статуса обращения
  const updateRequestMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PATCH', `/api/citizen-requests/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
    },
    onError: (error) => {
      console.error("Error updating request status:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус обращения",
        variant: "destructive",
      });
    },
  });

  // Мутация для обработки обращения агентом
  const processWithAgentMutation = useMutation({
    mutationFn: ({ requestId, agentId, action = "full" }: { requestId: number; agentId: number; action?: string }) => {
      return apiRequest('POST', `/api/citizen-requests/${requestId}/process-with-agent`, { agentId, action });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
      
      // Добавляем финальный результат в список результатов
      setProcessingState(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        results: [...prev.results, { 
          step: 'Результат обработки', 
          result: 'Обращение успешно обработано ИИ-агентом. Результаты доступны в карточке обращения.'
        }]
      }));
      
      toast({
        title: "Обращение обработано",
        description: "Обращение успешно обработано ИИ агентом",
      });
    },
    onError: (error) => {
      console.error("Error processing request with agent:", error);
      
      // Добавляем информацию об ошибке в список результатов
      setProcessingState(prev => ({
        ...prev,
        isProcessing: false,
        results: [...prev.results, { 
          step: 'Ошибка обработки', 
          result: 'Не удалось обработать обращение. Пожалуйста, попробуйте еще раз или обратитесь к администратору системы.'
        }]
      }));
      
      toast({
        title: "Ошибка",
        description: "Не удалось обработать обращение",
        variant: "destructive",
      });
    },
  });

  // Состояние для диалога обработки и отображения прогресса
  const [processingState, setProcessingState] = useState<{
    isProcessing: boolean;
    currentStep: string;
    progress: number;
    results: Array<{step: string, result: string}>;
  }>({
    isProcessing: false,
    currentStep: '',
    progress: 0,
    results: []
  });
  
  // Состояние для диалога обработки
  const [isProcessingDialogOpen, setIsProcessingDialogOpen] = useState(false);
  
  // Состояние для диалога автоматической обработки
  const [isAutoProcessDialogOpen, setIsAutoProcessDialogOpen] = useState(false);
  
  // Состояние для настроек автоматической обработки
  const [autoProcessSettings, setAutoProcessSettings] = useState<{
    aiEnabled: boolean;
    selectedAgent: number | null;
    autoClassification: boolean;
    responseGeneration: boolean;
    reprocessAI: boolean;
  }>({
    aiEnabled: false,
    selectedAgent: null,
    autoClassification: true,
    responseGeneration: false,
    reprocessAI: false
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

  // Статистика обращений
  const stats = {
    total: citizenRequests.length,
    new: citizenRequests.filter(req => req.status === "new").length,
    inProgress: citizenRequests.filter(req => req.status === "inProgress").length,
    waiting: citizenRequests.filter(req => req.status === "waiting").length,
    completed: citizenRequests.filter(req => req.status === "completed").length,
  };

  // Обработчик перетаскивания карточек в канбане
  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Если нет места назначения или место назначения совпадает с исходным
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }

    // Получаем исходную и целевую колонки
    const startColumn = board.columns[source.droppableId];
    const finishColumn = board.columns[destination.droppableId];

    // Обновляем порядок ID в исходной колонке
    const startRequestIds = Array.from(startColumn.requestIds);
    startRequestIds.splice(source.index, 1);

    // Обновляем порядок ID в целевой колонке
    const finishRequestIds = Array.from(finishColumn.requestIds);
    finishRequestIds.splice(destination.index, 0, parseInt(draggableId));

    // Создаем обновленные колонки
    const newStartColumn = {
      ...startColumn,
      requestIds: startRequestIds,
    };

    const newFinishColumn = {
      ...finishColumn,
      requestIds: finishRequestIds,
    };

    // Обновляем состояние доски
    const newBoard = {
      ...board,
      columns: {
        ...board.columns,
        [newStartColumn.id]: newStartColumn,
        [newFinishColumn.id]: newFinishColumn,
      },
    };

    setBoard(newBoard);

    // Обновляем статус обращения на сервере
    const requestId = parseInt(draggableId);
    const newStatus = destination.droppableId;
    updateRequestMutation.mutate({ id: requestId, status: newStatus });
    
    // Если включена ИИ обработка и есть выбранный агент, автоматически обрабатываем обращение при перемещении в колонку "inProgress"
    if (agentSettings.enabled && agentSettings.defaultAgent && destination.droppableId === 'inProgress') {
      // Находим обращение по ID
      const request = citizenRequests.find(r => r.id === requestId);
      if (request) {
        // Автоматически запускаем обработку перемещенного обращения выбранным агентом
        if (agentSettings.requestProcessingMode === 'auto' || agentSettings.requestProcessingMode === 'smart') {
          processRequestWithAgent(request, agentSettings.defaultAgent, "full");
          toast({
            title: "Автоматическая обработка",
            description: `Обращение автоматически отправлено на обработку ИИ`,
          });
        }
      }
    }
  };

  // Обработчик изменения в форме нового обращения
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Обработчик отправки формы
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newRequest = {
      ...formData,
      status: "new",
      priority: "medium",
      createdAt: new Date(),
      source: "web"
    };
    
    createRequestMutation.mutate(newRequest);
  };

  // Обработка обращения с помощью агента
  const processRequestWithAgent = (request: CitizenRequest, agentId: number, action: string = "full") => {
    // Сбрасываем состояние обработки
    setProcessingState({
      isProcessing: true,
      currentStep: 'Подготовка запроса',
      progress: 10,
      results: []
    });
    
    // Открываем диалоговое окно с процессом обработки
    setIsProcessingDialogOpen(true);
    
    // Имитируем шаги обработки (это будет заменено реальным API)
    const processingSteps = [
      { step: 'Анализ обращения', delay: 1000, progress: 30 },
      { step: 'Классификация темы', delay: 1500, progress: 50 },
      { step: 'Подготовка ответа', delay: 2000, progress: 70 },
      { step: 'Финальная проверка', delay: 1000, progress: 90 },
      { step: 'Сохранение результатов', delay: 500, progress: 100 }
    ];
    
    // Функция для последовательного выполнения шагов
    const runSteps = (stepIndex = 0) => {
      if (stepIndex >= processingSteps.length) {
        // Все шаги выполнены, отправляем запрос на сервер
        processWithAgentMutation.mutate({ 
          requestId: request.id, 
          agentId, 
          action 
        });
        return;
      }
      
      const currentStep = processingSteps[stepIndex];
      setProcessingState(prev => ({
        ...prev,
        currentStep: currentStep.step,
        progress: currentStep.progress
      }));
      
      // Имитация задержки обработки
      setTimeout(() => {
        // Добавляем результат шага (в реальном API будут настоящие результаты)
        setProcessingState(prev => ({
          ...prev,
          results: [...prev.results, { 
            step: currentStep.step, 
            result: `Успешно выполнен шаг: ${currentStep.step}`
          }]
        }));
        
        // Переходим к следующему шагу
        runSteps(stepIndex + 1);
      }, currentStep.delay);
    };
    
    // Запускаем процесс обработки
    runSteps();
    
    toast({
      title: "Отправка на обработку",
      description: "Обращение отправлено на обработку ИИ",
    });
  };

  // Форматируем текущее состояние канбан-доски на основе данных о обращениях
  useEffect(() => {
    if (citizenRequests.length > 0) {
      // Сортировка обращений по статусам
      const newIds: number[] = [];
      const inProgressIds: number[] = [];
      const waitingIds: number[] = [];
      const completedIds: number[] = [];

      citizenRequests.forEach(request => {
        switch (request.status) {
          case "new":
            newIds.push(request.id);
            break;
          case "inProgress":
            inProgressIds.push(request.id);
            break;
          case "waiting":
            waitingIds.push(request.id);
            break;
          case "completed":
            completedIds.push(request.id);
            break;
          default:
            newIds.push(request.id);
        }
      });

      // Обновляем состояние доски
      setBoard({
        ...board,
        columns: {
          ...board.columns,
          new: {
            ...board.columns.new,
            requestIds: newIds,
          },
          inProgress: {
            ...board.columns.inProgress,
            requestIds: inProgressIds,
          },
          waiting: {
            ...board.columns.waiting,
            requestIds: waitingIds,
          },
          completed: {
            ...board.columns.completed,
            requestIds: completedIds,
          },
        },
      });
    }
  }, [citizenRequests]);

  // Получение запроса по ID
  const getRequestById = (id: number): CitizenRequest | undefined => {
    return citizenRequests.find(request => request.id === id);
  };

  // Фильтрация запросов по поисковому запросу
  const filteredRequests = citizenRequests.filter(request => {
    const searchLower = searchQuery.toLowerCase();
    return (
      request.fullName?.toLowerCase().includes(searchLower) ||
      request.subject?.toLowerCase().includes(searchLower) ||
      request.description?.toLowerCase().includes(searchLower) ||
      request.requestType?.toLowerCase().includes(searchLower)
    );
  });

  // Константы для отображения
  const statusIcons: { [key: string]: React.ReactNode } = {
    new: <FileText className="h-4 w-4" />,
    inProgress: <Clock className="h-4 w-4" />,
    waiting: <Clock className="h-4 w-4" />,
    completed: <CheckCircle2 className="h-4 w-4" />,
  };

  const priorityColors: { [key: string]: string } = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  };

  // Цвета бордеров для приоритетов
  const priorityBorderColors: { [key: string]: string } = {
    low: "border-l-blue-400",
    medium: "border-l-yellow-400",
    high: "border-l-orange-500",
    urgent: "border-l-red-500",
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col mb-6">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-2xl font-bold">Воронка обращений</h1>
          <Button
            onClick={() => setIsNewRequestOpen(true)}
            className="bg-gradient-to-r from-green-600 to-green-700"
          >
            <Plus className="mr-2 h-4 w-4" /> Создать обращение
          </Button>
        </div>
        <p className="text-muted-foreground mb-4">
          Управление и обслуживание процесса обработки обращений
        </p>
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-gray-200 text-gray-700 px-2.5 py-1">
              Всего: {stats.total}
            </Badge>
            <Badge className="bg-blue-100 text-blue-700 px-2.5 py-1">
              Новых: {stats.new}
            </Badge>
            <Badge className="bg-amber-100 text-amber-700 px-2.5 py-1">
              В работе: {stats.inProgress}
            </Badge>
            <Badge className="bg-purple-100 text-purple-700 px-2.5 py-1">
              Ожидание: {stats.waiting}
            </Badge>
            <Badge className="bg-green-100 text-green-700 px-2.5 py-1">
              Выполнено: {stats.completed}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="relative w-64">
          <Input
            placeholder="Поиск обращений..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <Search className="h-4 w-4" />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="ai-processing" className="text-sm">
                ИИ обработка:
              </Label>
              <Switch
                id="ai-processing"
                checked={agentSettings.enabled}
                onCheckedChange={(enabled) => setAgentSettings(prev => ({ ...prev, enabled }))}
              />
              
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-4 bg-gray-50 text-xs h-8"
                onClick={() => setIsAutoProcessDialogOpen(true)}
              >
                <Bot className="mr-1.5 h-3.5 w-3.5" />
                Авто-обработка
              </Button>
            </div>
            
            {agentSettings.enabled && (
              <>
                <Label htmlFor="agent-select" className="text-sm ml-4">
                  Агент:
                </Label>
                <Select 
                  value={agentSettings.defaultAgent?.toString() || ""} 
                  onValueChange={(value) => setAgentSettings(prev => ({ ...prev, defaultAgent: parseInt(value) }))}
                >
                  <SelectTrigger id="agent-select" className="w-[180px]">
                    <SelectValue placeholder="Выберите агента" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAgents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Label htmlFor="processing-mode" className="text-sm ml-4">
                  Режим:
                </Label>
                <Select 
                  value={agentSettings.requestProcessingMode} 
                  onValueChange={(value: 'manual' | 'auto' | 'smart') => setAgentSettings(prev => ({ ...prev, requestProcessingMode: value }))}
                >
                  <SelectTrigger id="processing-mode" className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Ручной</SelectItem>
                    <SelectItem value="auto">Автоматический</SelectItem>
                    <SelectItem value="smart">Умный</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Все статусы
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Статус обращения</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Все статусы</DropdownMenuItem>
              <DropdownMenuItem>Новые</DropdownMenuItem>
              <DropdownMenuItem>В работе</DropdownMenuItem>
              <DropdownMenuItem>Ожидание</DropdownMenuItem>
              <DropdownMenuItem>Выполненные</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
          <p className="mt-2 text-gray-600">Загрузка обращений...</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {board.columnOrder.map((columnId) => {
              const column = board.columns[columnId];
              const requestsInColumn = column.requestIds
                .map((requestId) => getRequestById(requestId))
                .filter((request): request is CitizenRequest => request !== undefined);

              return (
                <div key={column.id} className="bg-background rounded-lg border border-border shadow-sm">
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium flex items-center">
                        {statusIcons[column.id]}
                        <span className="ml-2">{column.title}</span>
                      </h3>
                      <div className="bg-gray-100 px-2 py-1 rounded-full text-xs font-medium">
                        {requestsInColumn.length}
                      </div>
                    </div>
                  </div>
                  <Droppable droppableId={column.id}>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="p-2 min-h-[70vh]"
                      >
                        {requestsInColumn.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-32 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-md p-4 mt-2">
                            <div className="text-4xl mb-2">🗂️</div>
                            <p className="text-sm">Нет обращений</p>
                            <p className="text-xs">Перетащите карточки сюда</p>
                          </div>
                        ) : (
                          requestsInColumn.map((request, index) => (
                            <Draggable
                              key={request.id}
                              draggableId={request.id.toString()}
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
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="requestType">Тип обращения</Label>
                  <Select
                    name="requestType"
                    value={formData.requestType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, requestType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип обращения" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Обращение">Обращение</SelectItem>
                      <SelectItem value="Жалоба">Жалоба</SelectItem>
                      <SelectItem value="Предложение">Предложение</SelectItem>
                      <SelectItem value="Вопрос">Вопрос</SelectItem>
                      <SelectItem value="Благодарность">Благодарность</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="subject">Тема обращения</Label>
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
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={5}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewRequestOpen(false)}>
                Отмена
              </Button>
              <Button type="submit">Создать обращение</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Диалог просмотра деталей обращения */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        {selectedRequest && (
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {selectedRequest.subject || selectedRequest.title || "Обращение №" + selectedRequest.id}
              </DialogTitle>
              <DialogDescription>
                От {selectedRequest.fullName}, {new Date(selectedRequest.createdAt).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            
            <div className="border-t border-b py-2 mb-4">
              <Tabs defaultValue="details" onValueChange={(value) => setViewMode(value as any)}>
                <TabsList className="w-full justify-start border-b rounded-none bg-transparent">
                  <TabsTrigger 
                    value="details"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white data-[state=active]:shadow-none rounded-none h-12 px-6"
                  >
                    Информация
                  </TabsTrigger>
                  <TabsTrigger 
                    value="ai"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white data-[state=active]:shadow-none rounded-none h-12 px-6 relative"
                  >
                    ИИ обработка
                    {selectedRequest.aiProcessed && (
                      <div className="w-2 h-2 rounded-full bg-green-500 absolute top-3 right-3"></div>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {/* Содержимое вкладки "Информация" */}
            {viewMode === 'details' && (
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-base font-medium mb-3">Информация об обращении</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div>
                          <div className="text-sm text-gray-500">Тип обращения</div>
                          <div className="font-medium">{selectedRequest.requestType || "Обращение"}</div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-500">Приоритет</div>
                          <div>
                            <Badge className={`${priorityColors[selectedRequest.priority]}`}>
                              {selectedRequest.priority}
                            </Badge>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-500">Статус</div>
                          <div className="font-medium">
                            {selectedRequest.status === 'new' && 'Новое'}
                            {selectedRequest.status === 'inProgress' && 'В работе'}
                            {selectedRequest.status === 'waiting' && 'Ожидание'}
                            {selectedRequest.status === 'completed' && 'Выполнено'}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-500">ID</div>
                          <div className="font-medium">#{selectedRequest.id}</div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-500">Описание</div>
                        <div className="mt-1 whitespace-pre-wrap">{selectedRequest.description}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-medium mb-3">Информация о заявителе</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-500">ФИО</div>
                        <div className="font-medium">{selectedRequest.fullName}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-500">Контактная информация</div>
                        <div className="font-medium">{selectedRequest.contactInfo}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Содержимое вкладки "ИИ обработка" */}
            {viewMode === 'ai' && (
              <div className="p-4">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-base font-medium">Обработка с помощью ИИ</h3>
                      <Badge variant="outline" className={selectedRequest.aiProcessed ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"}>
                        {selectedRequest.aiProcessed ? "Обработано" : "Не обработано"}
                      </Badge>
                    </div>
                    
                    {selectedRequest && !selectedRequest.aiProcessed ? (
                      <div className="space-y-4">
                        <div className="p-4 border rounded-md bg-blue-50/30">
                          <div className="flex items-start space-x-3">
                            <Bot className="w-5 h-5 mt-1 text-blue-600" />
                            <div>
                              <h4 className="font-medium">Автоматическая обработка обращения</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                Выберите агента для анализа текста обращения. Искусственный интеллект классифицирует обращение и предложит рекомендации.
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {availableAgents.map(agent => (
                            <div key={agent.id} className="border rounded-md p-3 hover:border-primary hover:bg-blue-50/10 cursor-pointer transition-colors"
                              onClick={() => {
                                if (selectedRequest) {
                                  // Определяем тип действия в зависимости от типа агента
                                  const actionType = agent.type === 'citizen_requests' ? "full" : 
                                                    agent.type === 'blockchain' ? "blockchain" : "full";
                                                    
                                  processRequestWithAgent(selectedRequest, agent.id, actionType);
                                }
                              }}
                            >
                              <div className="flex items-center">
                                <div className="p-2 rounded-md bg-blue-100 text-blue-600 mr-3">
                                  <Bot className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="font-medium">{agent.name}</div>
                                  <div className="text-xs text-gray-500">{agent.type}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedRequest.aiClassification && (
                          <div className="p-4 border rounded-md">
                            <h4 className="font-medium flex items-center mb-2">
                              <Tag className="mr-2 h-5 w-5 text-blue-600" />
                              Классификация
                            </h4>
                            <p>{selectedRequest.aiClassification}</p>
                          </div>
                        )}
                        
                        {selectedRequest.aiSuggestion && (
                          <div className="p-4 border rounded-md">
                            <h4 className="font-medium flex items-center mb-2">
                              <Bot className="mr-2 h-5 w-5 text-purple-600" />
                              Рекомендации ИИ
                            </h4>
                            <p className="whitespace-pre-wrap">{selectedRequest.aiSuggestion}</p>
                          </div>
                        )}
                        
                        {selectedRequest.blockchainHash && (
                          <div className="p-4 border rounded-md">
                            <h4 className="font-medium flex items-center mb-2">
                              <Database className="mr-2 h-5 w-5 text-blue-600" />
                              Запись в блокчейне
                            </h4>
                            <p className="text-xs font-mono bg-gray-100 p-2 rounded overflow-x-auto">
                              {selectedRequest.blockchainHash}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDetailsOpen(false)}>
                Закрыть
              </Button>
              
              {!selectedRequest.aiProcessed && availableAgents.length > 0 && (
                <>
                  <Button 
                    onClick={() => {
                      if (selectedRequest && availableAgents.length > 0) {
                        processRequestWithAgent(selectedRequest, availableAgents[0].id);
                      }
                    }}
                    className="bg-blue-600"
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    Обработать ИИ
                  </Button>
                  
                  {/* Кнопка для автоматической обработки */}
                  <Button
                    onClick={() => {
                      if (selectedRequest && availableAgents.length > 0) {
                        // Запускаем автоматическую обработку
                        processRequestWithAgent(selectedRequest, availableAgents[0].id, "auto");
                      }
                    }}
                    className="bg-indigo-600 ml-2"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Авто-обработка
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Диалоговое окно процесса обработки */}
      <Dialog open={isProcessingDialogOpen} onOpenChange={setIsProcessingDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Процесс обработки ИИ</DialogTitle>
            <DialogDescription>
              Анализ обращения с использованием искусственного интеллекта
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <p className="text-sm font-medium">{processingState.currentStep}</p>
                <p className="text-sm font-medium">{processingState.progress}%</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${processingState.progress}%` }}
                ></div>
              </div>
            </div>
            
            <div className="mt-4 border rounded-md">
              <div className="font-medium p-3 bg-gray-100 border-b">
                Результаты обработки
              </div>
              <div className="divide-y">
                {processingState.results.map((result, index) => (
                  <div key={index} className="p-3">
                    <div className="font-medium text-sm">{result.step}</div>
                    <div className="text-sm text-gray-600 mt-1">{result.result}</div>
                  </div>
                ))}
                {processingState.results.length === 0 && (
                  <div className="p-3 text-gray-500 text-center">
                    Ожидание результатов обработки...
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProcessingDialogOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог автоматической обработки */}
      <AutoProcessingDialog 
        open={isAutoProcessDialogOpen}
        onOpenChange={setIsAutoProcessDialogOpen}
        agents={availableAgents}
        onStartProcessing={(settings) => {
          // Логика запуска автоматической обработки
          toast({
            title: "Автоматическая обработка",
            description: `Запущена автоматическая обработка ${settings.autoClassification ? 'с классификацией' : 'без классификации'}`,
          });
          
          // Здесь будет логика массовой обработки запросов
          console.log('Auto processing settings:', settings);
        }}
      />
    </div>
  );
};

export default CitizenRequests;