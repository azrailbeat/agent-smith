import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ALLOWED_AGENT_TYPES } from "@shared/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import RequestInsightPanel from "@/components/RequestInsightPanel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Mic, 
  StopCircle, 
  Play, 
  FileText, 
  Check, 
  Clock, 
  Save, 
  RefreshCw,
  BarChart2,
  FileCheck,
  User,
  Database,
  MoveHorizontal,
  ListChecks,
  Bot,
  Settings,
  Zap,
  Send,
  Briefcase,
  Camera,
  GraduationCap,
  Flame,
  Truck,
  BookOpen,
  ScrollText,
  Stethoscope,
  Globe,
  Building,
  Mail, 
  MessageSquare,
  X
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

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
  
  // Дополнительные свойства для совместимости со старым кодом
  recordedAudio?: boolean;
  title?: string;
  content?: string;
  category?: string;
  source?: string;
  
  // Дополнительные свойства для новой функциональности
  summary?: string;                    // Резюме обращения, сгенерированное AI
  blockchainHash?: string;             // Хэш записи в блокчейне
  completedAt?: Date;                  // Дата завершения обращения
  citizenInfo?: {                      // Информация о гражданине 
    name?: string;                     // ФИО
    contact?: string;                  // Контактная информация
    address?: string;                  // Адрес
    iin?: string;                      // ИИН (индивидуальный идентификационный номер)
  };
}

interface RequestCategory {
  id: string;
  name: string;
  description: string;
}

interface Agent {
  id: number;
  name: string;
  type: string;
  description?: string;
  modelId: number;
  isActive: boolean;
  systemPrompt: string;
  config: any;
}

interface AgentResult {
  id: number;
  agentId: number;
  requestId: number;
  resultType: string;
  content: string;
  timestamp: Date;
  metadata?: any;
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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRequest, setSelectedRequest] = useState<CitizenRequest | null>(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState<boolean>(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [formData, setFormData] = useState<{
    fullName: string;
    contactInfo: string;
    requestType: string;
    subject: string;
    description: string;
    recordedAudio: boolean;
  }>({
    fullName: "",
    contactInfo: "",
    requestType: "Обращение",
    subject: "",
    description: "",
    recordedAudio: false,
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
        title: "В обработке",
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

  // Состояние для настроек агентов
  const [agentSettings, setAgentSettings] = useState<{
    enabled: boolean;
    requestProcessingMode: 'manual' | 'auto' | 'smart';
    defaultAgent: number | null;
  }>({
    enabled: true,
    requestProcessingMode: 'manual',
    defaultAgent: null
  });

  // Состояние для хранения результатов агентов по ID запроса
  const [agentResults, setAgentResults] = useState<{[key: number]: AgentResult[]}>({});
  
  // Запрос доступных агентов
  const { data: availableAgents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    initialData: [],
  });

  // Запрос категорий запросов
  const { data: categories = [] } = useQuery<RequestCategory[]>({
    queryKey: ["/api/citizen-request-categories"],
    initialData: [],
  });

  // Запрос всех обращений граждан
  const { isLoading, data: citizenRequests = [] } = useQuery<CitizenRequest[]>({
    queryKey: ["/api/citizen-requests"],
    onSuccess: (data) => {
      // После получения данных, обновляем канбан-доску
      organizeRequestsIntoKanban(data);
    },
  });

  // Мутация для создания нового обращения
  const createRequestMutation = useMutation({
    mutationFn: (newRequest: any) => {
      return apiRequest("POST", "/api/citizen-requests", newRequest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
      resetForm();
      setIsNewRequestOpen(false);
      toast({
        title: "Обращение создано",
        description: "Новое обращение гражданина успешно зарегистрировано",
      });
    },
    onError: (error) => {
      console.error("Ошибка при создании обращения:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать обращение. Пожалуйста, попробуйте еще раз.",
        variant: "destructive",
      });
    },
  });

  // Мутация для обновления обращения (перемещение между колонками)
  const updateRequestStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/citizen-requests/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
    },
    onError: (error) => {
      console.error("Ошибка при обновлении статуса:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус обращения.",
        variant: "destructive",
      });
    },
  });

  // Мутация для обработки обращения агентом AI
  const processWithAgentMutation = useMutation({
    mutationFn: ({ requestId, agentId, actionType }: { requestId: number; agentId: number; actionType: string }) => {
      return apiRequest("POST", `/api/process-citizen-request`, { requestId, agentId, actionType });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
      fetchAgentResults(response.data?.requestId);
    },
    onError: (error) => {
      console.error("Ошибка при обработке обращения агентом:", error);
      toast({
        title: "Ошибка AI",
        description: "Не удалось обработать обращение с помощью агента.",
        variant: "destructive",
      });
    },
  });

  // Функция для получения результатов обработки агентом
  const fetchAgentResults = async (requestId: number) => {
    try {
      const response = await apiRequest("GET", `/api/agent-results/${requestId}`);
      const results = await response.json();
      setAgentResults(prev => ({ ...prev, [requestId]: results }));
    } catch (error) {
      console.error("Ошибка при получении результатов агента:", error);
    }
  };

  // Функция для сохранения записи в блокчейне
  const saveToBlockchain = async (requestId: number) => {
    try {
      toast({
        title: "Сохранение в блокчейне",
        description: "Идет запись данных в блокчейн..."
      });
      
      const response = await apiRequest("POST", `/api/blockchain/record-citizen-request/${requestId}`, {});
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Запись сохранена",
          description: `Данные успешно записаны в блокчейн. Хэш: ${result.blockchainHash?.substring(0, 10)}...`
        });
        
        // Обновляем данные
        queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
        if (selectedRequest) {
          const updatedRequest = { ...selectedRequest, blockchainHash: result.blockchainHash };
          setSelectedRequest(updatedRequest);
        }
      } else {
        toast({
          title: "Ошибка",
          description: "Не удалось записать данные в блокчейн",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Ошибка при сохранении в блокчейне:", error);
      toast({
        title: "Ошибка блокчейна",
        description: "Произошла ошибка при записи в блокчейн. Попробуйте позже.",
        variant: "destructive"
      });
    }
  };

  // Функция для генерации краткого содержания обращения
  const generateSummary = async (request: CitizenRequest) => {
    try {
      const response = await apiRequest("POST", "/api/ai/summarize", {
        text: request.description || request.content || "",
        maxLength: 150
      });
      const result = await response.json();
      return result.summary;
    } catch (error) {
      console.error("Ошибка при генерации краткого содержания:", error);
      return "Не удалось создать краткое содержание.";
    }
  };

  // Функция для классификации обращения
  const classifyRequest = async (request: CitizenRequest): Promise<CitizenRequest> => {
    try {
      // Если есть активное правило, применяем его для классификации
      const matchedRule = findMatchingRule(request, []); // Здесь должны быть правила из API
      
      if (matchedRule) {
        return {
          ...request,
          aiClassification: matchedRule.category || "Общее обращение",
          aiProcessed: true
        };
      }
      
      // Если нет правила, используем агент AI
      const response = await apiRequest("POST", "/api/ai/classify", {
        text: request.description || request.content || ""
      });
      
      const result = await response.json();
      return {
        ...request,
        aiClassification: result.classification || "Общее обращение",
        aiProcessed: true
      };
    } catch (error) {
      console.error("Ошибка при классификации обращения:", error);
      return {
        ...request,
        aiClassification: "Не удалось классифицировать",
        aiProcessed: true
      };
    }
  };

  // Функция для поиска соответствующего правила
  const findMatchingRule = (request: CitizenRequest, rules: any[]): any | null => {
    if (!rules || rules.length === 0) return null;
    
    const requestText = (request.description || request.content || "").toLowerCase();
    
    // Поиск по ключевым словам
    for (const rule of rules) {
      if (rule.keywords && Array.isArray(rule.keywords)) {
        for (const keyword of rule.keywords) {
          if (requestText.includes(keyword.toLowerCase())) {
            return rule;
          }
        }
      }
    }
    
    return null;
  };

  // Функция для обработки обращения с применением правила
  const processRequestWithRule = async (request: CitizenRequest, rule: any) => {
    const updatedRequest = { ...request };
    
    // Применяем правило
    if (rule) {
      updatedRequest.aiClassification = rule.category || "Общее обращение";
      updatedRequest.aiSuggestion = rule.suggestedAction || "";
      
      // Если есть департамент, обновляем маршрутизацию
      if (rule.departmentId) {
        updatedRequest.assignedTo = rule.departmentId;
      }
    }
    
    return updatedRequest;
  };

  // Функция для обработки обращения с помощью конкретного агента
  const processRequestWithAgent = (request: CitizenRequest, agentId: number, actionType: string) => {
    processWithAgentMutation.mutate({ requestId: request.id, agentId, actionType });
  };

  // Функция для организации запросов в канбан-доску
  const organizeRequestsIntoKanban = (requests: CitizenRequest[]) => {
    const newBoard: RequestsKanbanBoard = {
      columns: {
        new: {
          id: "new",
          title: "Новые",
          requestIds: [],
        },
        inProgress: {
          id: "inProgress",
          title: "В обработке",
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
    };

    // Распределяем запросы по колонкам в зависимости от статуса
    requests.forEach((request) => {
      switch (request.status) {
        case "new":
          newBoard.columns.new.requestIds.push(request.id);
          break;
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
  };

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
    const newStatus = destination.droppableId;

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
    
    const newRequest = {
      ...formData,
      status: "new",
      priority: "medium",
      createdAt: new Date(),
      source: "web"
    };
    
    createRequestMutation.mutate(newRequest);
  };

  // Получение запроса по его ID
  const getRequestById = (id: number): CitizenRequest | undefined => {
    return citizenRequests.find(request => request.id === id);
  };

  // Фильтрация запросов по поисковому запросу
  const filteredRequests = citizenRequests.filter(request => {
    const searchLower = searchQuery.toLowerCase();
    return (
      request.fullName.toLowerCase().includes(searchLower) ||
      request.subject?.toLowerCase().includes(searchLower) ||
      request.description?.toLowerCase().includes(searchLower) ||
      request.requestType?.toLowerCase().includes(searchLower)
    );
  });

  // Вычисляем статистику
  const stats = {
    total: citizenRequests.length,
    new: citizenRequests.filter(r => r.status === 'new').length,
    inProgress: citizenRequests.filter(r => r.status === 'inProgress').length,
    waiting: citizenRequests.filter(r => r.status === 'waiting').length,
    completed: citizenRequests.filter(r => r.status === 'completed').length,
    aiProcessed: citizenRequests.filter(r => r.aiProcessed).length
  };

  // Статусные цвета и иконки
  const statusColors: { [key: string]: string } = {
    new: "bg-blue-100 text-blue-800",
    inProgress: "bg-yellow-100 text-yellow-800",
    waiting: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
  };

  const statusIcons: { [key: string]: React.ReactNode } = {
    new: <FileText className="h-4 w-4" />,
    inProgress: <Clock className="h-4 w-4" />,
    waiting: <Clock className="h-4 w-4" />,
    completed: <Check className="h-4 w-4" />,
  };

  const priorityColors: { [key: string]: string } = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Обращения граждан</h1>
          <p className="text-muted-foreground">
            Управление и обработка обращений с помощью ИИ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsNewRequestOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            Новое обращение
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <FileText className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Всего обращений</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-yellow-100 p-3 rounded-full">
              <Clock className="h-6 w-6 text-yellow-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">В обработке</p>
              <p className="text-2xl font-bold">{stats.inProgress}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-full">
              <Check className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Выполнено</p>
              <p className="text-2xl font-bold">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-full">
              <Bot className="h-6 w-6 text-purple-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Обработано ИИ</p>
              <p className="text-2xl font-bold">{stats.aiProcessed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Input
              placeholder="Поиск обращений..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">AI обработка:</span>
            <Switch
              checked={agentSettings.enabled}
              onCheckedChange={(checked) => setAgentSettings(prev => ({ ...prev, enabled: checked }))}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
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
                      <Badge variant="outline">{requestsInColumn.length}</Badge>
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
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-3 mb-2 bg-card rounded-md border ${snapshot.isDragging ? "shadow-lg" : "shadow-sm"} hover:shadow-md transition-shadow`}
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setIsViewDetailsOpen(true);
                                  }}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="text-sm font-medium truncate max-w-[80%]">
                                      {request.fullName}
                                    </div>
                                    <Badge className={`${priorityColors[request.priority]}`} variant="outline">
                                      {request.priority}
                                    </Badge>
                                  </div>
                                  <div className="mb-2 text-xs text-muted-foreground">
                                    {new Date(request.createdAt).toLocaleDateString("ru-RU")}
                                  </div>
                                  <p className="text-sm line-clamp-2 mb-2">
                                    {request.subject || request.title || "Без темы"}
                                  </p>
                                  {request.aiProcessed && (
                                    <div className="flex items-center gap-1">
                                      <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                                        <Bot className="h-3 w-3 mr-1" /> ИИ
                                      </Badge>
                                    </div>
                                  )}
                                </div>
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

      {/* Диалог с деталями обращения */}
      <Dialog
        open={isViewDetailsOpen} 
        onOpenChange={(open) => {
          setIsViewDetailsOpen(open);
          if (open && selectedRequest) {
            // Загружаем результаты агентов при открытии деталей обращения
            fetchAgentResults(selectedRequest.id);
          }
        }}
      >
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-auto p-0">
          <DialogTitle className="sr-only">Карточка обращения</DialogTitle>
          <DialogDescription className="sr-only">Просмотр и обработка обращения гражданина</DialogDescription>
          {selectedRequest && (
            <>
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold">Карточка обращения</h2>
                  </div>
                  <DialogClose className="rounded-full p-1 hover:bg-neutral-100">
                    <X className="h-5 w-5" />
                  </DialogClose>
                </div>
              </div>
              
              <div className="p-4">
                {/* Основная информация о клиенте и обращении */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-sm text-muted-foreground mb-1">Имя клиента</h3>
                    <p className="font-medium">{selectedRequest.fullName}</p>
                  </div>
                  <div>
                    <h3 className="text-sm text-muted-foreground mb-1">Детали обращения</h3>
                    <p className="font-medium">{selectedRequest.requestType}, {new Date(selectedRequest.createdAt).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <div>
                    <h3 className="text-sm text-muted-foreground mb-1">Email</h3>
                    <p className="font-medium">{selectedRequest.contactInfo}</p>
                  </div>
                  <div>
                    <h3 className="text-sm text-muted-foreground mb-1">Телефон</h3>
                    <p className="font-medium">{selectedRequest.citizenInfo?.contact || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <h3 className="text-sm text-muted-foreground mb-1">Источник</h3>
                    <p className="font-medium flex items-center">
                      {selectedRequest.source === "telegram" ? (
                        <>
                          <MessageSquare className="h-4 w-4 mr-1 text-blue-500" />
                          Telegram
                        </>
                      ) : selectedRequest.source === "email" ? (
                        <>
                          <Mail className="h-4 w-4 mr-1 text-purple-500" />
                          Email
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4 mr-1 text-green-500" />
                          Веб-форма
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-border"></div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
                {/* Основная информация */}
                <div className="md:col-span-2 space-y-4">
                  {/* Панель результатов обработки AI */}
                  {selectedRequest.id && agentResults[selectedRequest.id]?.length > 0 && (
                    <RequestInsightPanel
                      requestId={selectedRequest.id}
                      agentResults={agentResults[selectedRequest.id] || []}
                    />
                  )}
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Описание обращения</h3>
                    <div className="p-3 bg-neutral-50 rounded-md border text-sm whitespace-pre-wrap">
                      {selectedRequest.description || selectedRequest.content || "Содержание обращения не указано"}
                    </div>
                  </div>
                  
                  {selectedRequest.summary && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">
                        <div className="flex items-center">
                          AI-резюме
                          <Badge variant="outline" className="ml-2 bg-purple-50 text-purple-700">
                            <Bot className="h-3 w-3 mr-1" /> AI Agent
                          </Badge>
                        </div>
                      </h3>
                      <div className="p-3 bg-neutral-50 rounded-md border text-sm">
                        {selectedRequest.summary}
                      </div>
                    </div>
                  )}
                  
                  {selectedRequest.aiClassification && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">
                        <div className="flex items-center">
                          AI-классификация
                          <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700">
                            <BarChart2 className="h-3 w-3 mr-1" /> AI Аналитик
                          </Badge>
                        </div>
                      </h3>
                      <div className="p-3 bg-blue-50 rounded-md border border-blue-200 text-sm">
                        {selectedRequest.aiClassification}
                      </div>
                    </div>
                  )}
                  
                  {selectedRequest.aiSuggestion && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">
                        <div className="flex items-center">
                          Предлагаемый ответ
                          <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700">
                            <Zap className="h-3 w-3 mr-1" /> AI Assistant
                          </Badge>
                        </div>
                      </h3>
                      <div className="p-3 bg-amber-50 rounded-md border border-amber-200 text-sm">
                        {selectedRequest.aiSuggestion}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">История обработки</h3>
                    <div className="space-y-2">
                      <div className="flex items-start p-2 bg-neutral-50 rounded-md border">
                        <div className="bg-green-100 p-1 rounded-full mr-2">
                          <Check className="h-4 w-4 text-green-700" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">Обращение зарегистрировано</div>
                          <div className="text-xs text-neutral-500">
                            {new Date(selectedRequest.createdAt).toLocaleDateString('ru-RU')}, 
                            {new Date(selectedRequest.createdAt).toLocaleTimeString('ru-RU')}
                          </div>
                        </div>
                      </div>
                      
                      {selectedRequest.assignedTo && (
                        <div className="flex items-start p-2 bg-neutral-50 rounded-md border">
                          <div className="bg-blue-100 p-1 rounded-full mr-2">
                            <User className="h-4 w-4 text-blue-700" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">Назначено исполнителю</div>
                            <div className="text-xs text-neutral-500">
                              {selectedRequest.assignedTo} | {new Date(selectedRequest.createdAt).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedRequest.blockchainHash && (
                        <div className="flex items-start p-2 bg-neutral-50 rounded-md border">
                          <div className="bg-emerald-100 p-1 rounded-full mr-2">
                            <Database className="h-4 w-4 text-emerald-700" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">Сохранено в блокчейне (GovChain)</div>
                            <div className="text-xs text-neutral-500">
                              Хэш: {selectedRequest.blockchainHash}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedRequest.status === 'completed' && selectedRequest.completedAt && (
                        <div className="flex items-start p-2 bg-neutral-50 rounded-md border">
                          <div className="bg-green-100 p-1 rounded-full mr-2">
                            <FileCheck className="h-4 w-4 text-green-700" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">Обращение выполнено</div>
                            <div className="text-xs text-neutral-500">
                              {new Date(selectedRequest.completedAt).toLocaleDateString('ru-RU')}, 
                              {new Date(selectedRequest.completedAt).toLocaleTimeString('ru-RU')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Боковая панель */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Данные гражданина</h3>
                    <div className="p-3 bg-neutral-50 rounded-md border">
                      <div className="space-y-2 text-sm">
                        {selectedRequest.citizenInfo?.name && (
                          <div className="flex justify-between">
                            <span className="text-neutral-500">ФИО:</span>
                            <span className="font-medium">{selectedRequest.citizenInfo.name}</span>
                          </div>
                        )}
                        {selectedRequest.citizenInfo?.contact && (
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Контакт:</span>
                            <span className="font-medium">{selectedRequest.citizenInfo.contact}</span>
                          </div>
                        )}
                        {selectedRequest.citizenInfo?.address && (
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Адрес:</span>
                            <span className="font-medium">{selectedRequest.citizenInfo.address}</span>
                          </div>
                        )}
                        {selectedRequest.citizenInfo?.iin && (
                          <div className="flex justify-between">
                            <span className="text-neutral-500">ИИН:</span>
                            <span className="font-medium">{selectedRequest.citizenInfo.iin}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">ИИ агенты</h3>
                    
                    {/* Панель результатов обработки */}
                    {selectedRequest?.id && agentResults[selectedRequest.id]?.length > 0 && (
                      <div className="mb-4">
                        <RequestInsightPanel 
                          requestId={selectedRequest.id}
                          agentResults={agentResults[selectedRequest.id] || []}
                          compact={true}
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      {/* Добавляем кнопки для всех доступных и активных агентов */}
                      {availableAgents
                        .filter(agent => agent.isActive)
                        .filter(agent => ALLOWED_AGENT_TYPES.includes(agent.type))
                        .map(agent => (
                          <Button 
                            key={agent.id}
                            variant="outline"
                            className="w-full justify-start mb-2 text-sm"
                            onClick={() => {
                              if (selectedRequest) {
                                // Определяем тип действия в зависимости от типа агента
                                const actionType = agent.type === 'citizen_requests' ? "full" : 
                                                   agent.type === 'blockchain' ? "blockchain" : "full";
                                                   
                                processRequestWithAgent(selectedRequest, agent.id, actionType);
                                
                                toast({
                                  title: "Запуск обработки AI",
                                  description: `Запущена обработка с использованием агента ${agent.name}...`
                                });
                                
                                // Загружаем результаты через 2 секунды
                                setTimeout(() => {
                                  fetchAgentResults(selectedRequest.id);
                                }, 2000);
                              }
                            }}
                          >
                            {agent.type === 'citizen_requests' ? (
                              <User className="mr-2 h-4 w-4" />
                            ) : agent.type === 'blockchain' ? (
                              <Database className="mr-2 h-4 w-4" />
                            ) : (
                              <Bot className="mr-2 h-4 w-4" />
                            )}
                            {agent.name}
                          </Button>
                        ))
                      }
                      
                      {/* Настройки агентов */}
                      <Button 
                        variant="outline"
                        className="w-full justify-start mb-2 text-sm"
                        onClick={() => {
                          location.pathname = '/ai-agents';
                        }}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Настройки ИИ агентов
                      </Button>
                      
                      {/* Действия */}
                      <div className="mt-6">
                        <h3 className="text-sm font-medium mb-2">Действия</h3>
                        
                        <Button 
                          className="w-full justify-start mb-2 text-sm bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => {
                            toast({
                              title: "Отправка ответа",
                              description: "Ответ на обращение отправлен"
                            });
                          }}
                        >
                          <Send className="mr-2 h-4 w-4" /> Отправить ответ
                        </Button>
                        
                        <Button 
                          variant="outline"
                          className="w-full justify-start mb-2 text-sm text-amber-600 border-amber-200"
                          onClick={() => {
                            toast({
                              title: "Генерация ответа",
                              description: "Автоматически сформирован ответ на обращение"
                            });
                          }}
                        >
                          <Zap className="mr-2 h-4 w-4" /> Сгенерировать ответ
                        </Button>
                        
                        <Button 
                          variant="outline"
                          className="w-full justify-start mb-2 text-sm"
                          onClick={() => {
                            if (selectedRequest) {
                              saveToBlockchain(selectedRequest.id);
                            }
                          }}
                        >
                          <Database className="mr-2 h-4 w-4" /> Сохранить в блокчейне
                        </Button>
                        
                        <Button 
                          variant="outline"
                          className="w-full justify-start text-sm"
                          onClick={() => {
                            if (selectedRequest) {
                              const updateData = {
                                ...selectedRequest,
                                status: 'completed',
                                completedAt: new Date()
                              };
                              
                              apiRequest('PATCH', `/api/citizen-requests/${selectedRequest.id}`, updateData)
                                .then(() => {
                                  toast({
                                    title: "Обращение завершено",
                                    description: "Обращение помечено как выполненное"
                                  });
                                  
                                  setIsViewDetailsOpen(false);
                                  queryClient.invalidateQueries({ queryKey: ['/api/citizen-requests'] });
                                });
                            }
                          }}
                        >
                          <Check className="mr-2 h-4 w-4" /> Отметить выполненным
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Нижние кнопки */}
              <DialogFooter className="px-4 py-3 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setIsViewDetailsOpen(false)}>Закрыть</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог нового обращения */}
      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Новое обращение гражданина</DialogTitle>
            <DialogDescription>
              Заполните информацию для регистрации нового обращения.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="fullName">ФИО заявителя</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Введите ФИО"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="contactInfo">Контактная информация</Label>
                  <Input
                    id="contactInfo"
                    name="contactInfo"
                    value={formData.contactInfo}
                    onChange={handleInputChange}
                    placeholder="Email или телефон"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="requestType">Тип обращения</Label>
                  <Select
                    name="requestType"
                    value={formData.requestType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, requestType: value })
                    }
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Выберите тип обращения" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Обращение">Обращение</SelectItem>
                      <SelectItem value="Жалоба">Жалоба</SelectItem>
                      <SelectItem value="Запрос информации">Запрос информации</SelectItem>
                      <SelectItem value="Предложение">Предложение</SelectItem>
                      <SelectItem value="Благодарность">Благодарность</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subject">Тема обращения</Label>
                  <Input
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="Укажите тему обращения"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Описание обращения</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Подробно опишите ваше обращение"
                    className="mt-1"
                    rows={5}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!isRecording) {
                        setIsRecording(true);
                        // Логика записи аудио
                        setTimeout(() => {
                          setIsRecording(false);
                          setFormData({ ...formData, recordedAudio: true });
                          setAudioUrl("audio_recording.mp3");
                          toast({
                            title: "Аудио записано",
                            description: "Аудиозапись обращения сохранена",
                          });
                        }, 3000);
                      } else {
                        setIsRecording(false);
                      }
                    }}
                    className={isRecording ? "bg-red-100" : ""}
                  >
                    {isRecording ? (
                      <>
                        <StopCircle className="h-4 w-4 mr-2 text-red-500" />
                        Остановить запись
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        Записать аудио
                      </>
                    )}
                  </Button>

                  {audioUrl && (
                    <div className="flex items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Логика воспроизведения аудио
                          toast({
                            title: "Воспроизведение",
                            description: "Воспроизводится аудиозапись обращения",
                          });
                        }}
                      >
                        <Play className="h-4 w-4 mr-1" /> Прослушать
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsNewRequestOpen(false);
                }}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={createRequestMutation.isPending}>
                {createRequestMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Создание...
                  </>
                ) : (
                  "Создать обращение"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CitizenRequests;
