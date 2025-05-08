import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ALLOWED_AGENT_TYPES } from "@shared/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import RequestInsightPanel from "@/components/RequestInsightPanel";
import { AutoProcessDialog } from "@/components/AutoProcessDialog";
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
  X,
  Inbox as InboxIcon,
  Trash2,
  GanttChartSquare,
  MessageCircle,
  Tag,
  Lightbulb,
  Phone
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
  const [isAutoProcessOpen, setIsAutoProcessOpen] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [viewMode, setViewMode] = useState<'details' | 'ai' | 'history'>('details');
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
    enabled: false,
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

  // Мутация для удаления обращения
  const deleteRequestMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest("DELETE", `/api/citizen-requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
      setIsViewDetailsOpen(false);
      setSelectedRequest(null);
      toast({
        title: "Обращение удалено",
        description: "Обращение успешно удалено из системы",
      });
    },
    onError: (error) => {
      console.error("Ошибка при удалении обращения:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить обращение",
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
        case "in_progress":
        case "inProgress": // Поддержка обоих форматов
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
    inProgress: citizenRequests.filter(r => r.status === 'in_progress' || r.status === 'inProgress').length,
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

  // Цвета бордеров для приоритетов
  const priorityBorderColors: { [key: string]: string } = {
    low: "border-l-blue-400",
    medium: "border-l-yellow-400",
    high: "border-l-orange-500",
    urgent: "border-l-red-500",
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
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-lg font-bold text-blue-600">{stats.total.toLocaleString('ru-RU')}</div>
            <div className="text-xs text-gray-500">Всего обращений</div>
          </div>
          <div className="h-10 border-r border-gray-200 mx-1"></div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">{stats.completed.toLocaleString('ru-RU')}</div>
            <div className="text-xs text-gray-500">Закрыто</div>
          </div>
          <div className="h-10 border-r border-gray-200 mx-1"></div>
          <Button
            onClick={() => setIsNewRequestOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            Новое обращение
          </Button>
        </div>
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
            onClick={() => setIsAutoProcessOpen(true)}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
          >
            <Bot className="h-4 w-4 mr-2 text-blue-600" />
            Авто-обработка
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Создаем 10 тестовых обращений
              apiRequest('POST', '/api/v1/citizen-requests/generate-test', { count: 10 })
                .then(() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/citizen-requests"] });
                  toast({
                    title: 'Тестовые обращения созданы',
                    description: 'Успешно создано 10 тестовых обращений',
                    variant: 'default',
                  });
                })
                .catch(error => {
                  console.error('Failed to generate test requests:', error);
                  toast({
                    title: 'Ошибка',
                    description: 'Не удалось создать тестовые обращения',
                    variant: 'destructive',
                  });
                });
            }}
            className="bg-gradient-to-r from-green-50 to-teal-50 border-green-200"
          >
            <FileText className="h-4 w-4 mr-2 text-teal-600" />
            Создать тестовые
          </Button>
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
                          <div className="flex flex-col items-center justify-center py-6 px-2 border-2 border-dashed border-gray-200 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-2">
                              <InboxIcon className="h-8 w-8 text-gray-300" />
                            </div>
                            <h4 className="text-sm font-medium text-gray-600 mb-1">Нет обращений</h4>
                            <p className="text-xs text-gray-500 text-center">Переместите карточки сюда</p>
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
                                  className={`p-4 mb-3 bg-card rounded-md border-l-4 ${priorityBorderColors[request.priority] || 'border-l-gray-300'} border-t border-r border-b ${snapshot.isDragging ? "shadow-lg" : "shadow-sm"} hover:shadow-md transition-shadow`}
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setIsViewDetailsOpen(true);
                                  }}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="text-sm font-medium">
                                      {request.fullName}
                                    </div>
                                    <Badge className={`${priorityColors[request.priority]}`} variant="outline">
                                      {request.priority || 'Обычный'}
                                    </Badge>
                                  </div>
                                  
                                  <h4 className="font-medium text-sm mb-2 line-clamp-1">
                                    {request.subject || request.title || "Без темы"}
                                  </h4>
                                  
                                  <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                                    {request.description || request.content || "Без описания"}
                                  </p>
                                  
                                  <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(request.createdAt).toLocaleDateString("ru-RU")}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      {request.aiProcessed && (
                                        <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs flex items-center">
                                          <Bot className="h-3 w-3 mr-1" /> ИИ
                                        </Badge>
                                      )}
                                      {request.blockchainHash && (
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs flex items-center">
                                          <Database className="h-3 w-3 mr-1" />
                                        </Badge>
                                      )}
                                      {request.assignedTo && (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 text-xs flex items-center">
                                          <User className="h-3 w-3 mr-1" />
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
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

      {/* Диалог с деталями обращения в стиле CRM */}
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
        <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-auto p-0">
          <DialogTitle className="sr-only">Карточка обращения</DialogTitle>
          <DialogDescription className="sr-only">Просмотр и обработка обращения гражданина</DialogDescription>
          {selectedRequest && (
            <>
              {/* Шапка с идентификатором и крестиком закрытия */}
              <div className="flex justify-between items-center">
                <div className="bg-blue-50 py-2 px-4 rounded-tl-md">
                  <div className="text-sm font-medium text-blue-600">#{selectedRequest.id}</div>
                </div>
                <div className="flex items-center gap-2 p-2">
                  <Badge className={`${priorityColors[selectedRequest.priority]}`}>
                    {selectedRequest.priority}
                  </Badge>
                  <DialogClose className="rounded-full p-1 hover:bg-neutral-100">
                    <X className="h-5 w-5" />
                  </DialogClose>
                </div>
              </div>
              
              {/* Заголовок обращения */}
              <div className="px-4 py-3 border-b">
                <h2 className="text-lg font-semibold">{selectedRequest.subject || selectedRequest.title || "Без имени"}</h2>
              </div>
              
              {/* Табы для переключения разделов */}
              <div className="border-b">
                <Tabs defaultValue="details" onValueChange={(value) => setViewMode(value as 'details' | 'ai' | 'history')}>
                  <TabsList className="w-full justify-start h-12 bg-white border-b p-0">
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
                    <TabsTrigger 
                      value="history"
                      className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white data-[state=active]:shadow-none rounded-none h-12 px-6"
                    >
                      История
                      <span className="ml-1 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs">
                        {selectedRequest.blockchainHash ? 2 : 1}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="documents"
                      className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white data-[state=active]:shadow-none rounded-none h-12 px-6"
                    >
                      Документы
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Содержимое вкладки "Информация" */}
              {viewMode === 'details' && (
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-base font-medium mb-3">Информация об обращении</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <div>
                            <div className="text-sm text-gray-500">Тип обращения</div>
                            <div className="font-medium">{selectedRequest.requestType || "Жалоба"}</div>
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
                            <div>
                              <Badge variant="outline" className="font-medium">
                                {selectedRequest.status === 'new' ? 'Новое' : 
                                selectedRequest.status === 'in_progress' || selectedRequest.status === 'inProgress' ? 'В обработке' : 
                                selectedRequest.status === 'waiting' ? 'Ожидание' : 
                                selectedRequest.status === 'completed' ? 'Выполнено' : selectedRequest.status}
                              </Badge>
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-gray-500">Источник</div>
                            <div className="font-medium flex items-center">
                              {selectedRequest.source === "telegram" ? (
                                <>
                                  <MessageSquare className="h-3 w-3 mr-1 text-blue-500" />
                                  Telegram
                                </>
                              ) : selectedRequest.source === "email" ? (
                                <>
                                  <Mail className="h-3 w-3 mr-1 text-purple-500" />
                                  Email
                                </>
                              ) : (
                                <>
                                  <Globe className="h-3 w-3 mr-1 text-green-500" />
                                  Веб-форма
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-gray-500">Создано</div>
                            <div className="font-medium">{new Date(selectedRequest.createdAt).toLocaleString('ru-RU')}</div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-gray-500">Обновлено</div>
                            <div className="font-medium">{new Date(selectedRequest.updatedAt).toLocaleString('ru-RU')}</div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Статус сделки</div>
                          <div className="flex items-center">
                            <Select 
                              defaultValue={selectedRequest.status} 
                              onValueChange={(value) => {
                                if (selectedRequest) {
                                  updateRequestStatusMutation.mutate({
                                    id: selectedRequest.id,
                                    status: value
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Выберите статус" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">Новое</SelectItem>
                                <SelectItem value="inProgress">В обработке</SelectItem>
                                <SelectItem value="waiting">Ожидание</SelectItem>
                                <SelectItem value="completed">Выполнено</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <div className="flex justify-between mb-1">
                            <div className="text-sm text-gray-500">ИИ обработка</div>
                            {selectedRequest.aiProcessed && (
                              <Badge variant="outline" className="ml-1 bg-purple-50 text-purple-700">
                                Обработано
                              </Badge>
                            )}
                          </div>
                          <div>
                            <Button 
                              variant="outline"
                              className="w-full justify-center text-sm"
                              onClick={() => setViewMode('ai')}
                            >
                              <Bot className="mr-2 h-4 w-4" /> Запустить ИИ обработку
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-base font-medium mb-3">Информация о гражданине</h3>
                      <div className="bg-blue-50 p-4 rounded-md mb-4">
                        <div className="flex flex-col space-y-3">
                          <div className="flex justify-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                              <User className="h-6 w-6" />
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-lg">{selectedRequest.citizenInfo?.name || selectedRequest.fullName}</div>
                            <div className="text-sm text-gray-500 flex justify-center items-center gap-2 mt-1">
                              <Mail className="h-3 w-3" />
                              {selectedRequest.citizenInfo?.contact || selectedRequest.contactInfo}
                            </div>
                          </div>
                          
                          <div className="flex justify-center gap-2 mt-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white">
                              <Phone className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white">
                              <Mail className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white">
                              <MessageSquare className="h-4 w-4 text-blue-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-base font-medium mb-2">Описание обращения</h3>
                        <div className="p-3 bg-white rounded-md border text-sm whitespace-pre-wrap max-h-[180px] overflow-y-auto mb-4">
                          {selectedRequest.description || selectedRequest.content || "Содержание обращения не указано"}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-base font-medium mb-2">Действия</h3>
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            className="justify-start text-sm bg-blue-600 hover:bg-blue-700 text-white"
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
                            className="justify-start text-sm"
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
                          
                          <Button 
                            variant="outline"
                            className="justify-start text-sm"
                            onClick={() => {
                              if (selectedRequest) {
                                saveToBlockchain(selectedRequest.id);
                              }
                            }}
                          >
                            <Database className="mr-2 h-4 w-4" /> Сохранить в блокчейне
                          </Button>
                          
                          {/* Кнопка удаления обращения */}
                          <Button 
                            variant="outline"
                            className="justify-start text-sm text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => {
                              if (selectedRequest) {
                                // Показываем диалог подтверждения
                                if (window.confirm(`Вы уверены, что хотите удалить обращение "${selectedRequest.subject || selectedRequest.title || "Без темы"}"?`)) {
                                  deleteRequestMutation.mutate(selectedRequest.id);
                                }
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Удалить обращение
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Содержимое вкладки "ИИ обработка" */}
              {viewMode === 'ai' && (
                <div className="p-5">
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
                            {availableAgents
                              .filter(agent => agent.isActive)
                              .filter(agent => ALLOWED_AGENT_TYPES.includes(agent.type))
                              .map(agent => (
                                <div key={agent.id} className="border rounded-md p-3 hover:border-primary hover:bg-blue-50/10 cursor-pointer transition-colors"
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
                                  <div className="flex items-center">
                                    {agent.type === 'citizen_requests' ? (
                                      <User className="w-5 h-5 mr-2 text-blue-600" />
                                    ) : agent.type === 'blockchain' ? (
                                      <Database className="w-5 h-5 mr-2 text-blue-600" />
                                    ) : (
                                      <Bot className="w-5 h-5 mr-2 text-blue-600" />
                                    )}
                                    <div className="font-medium">{agent.name}</div>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {agent.description || "Анализ и обработка обращений граждан"}
                                  </div>
                                </div>
                              ))
                            }
                            
                            <div className="border border-amber-200 rounded-md p-3 hover:bg-amber-50/10 cursor-pointer transition-colors"
                              onClick={() => {
                                toast({
                                  title: "Генерация ответа",
                                  description: "Автоматически сформирован ответ на обращение"
                                });
                              }}
                            >
                              <div className="flex items-center">
                                <Zap className="w-5 h-5 mr-2 text-amber-600" />
                                <div className="font-medium text-amber-700">Сгенерировать ответ</div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Автоматическое формирование ответа на основе текста обращения
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : selectedRequest && selectedRequest.aiProcessed ? (
                        <div className="space-y-4">
                          {/* Результаты обработки агентом */}
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => {
                                const firstAgent = availableAgents.find(agent => 
                                  (agent.type === 'citizen_requests' || agent.name.includes('обращений')) && agent.isActive
                                );
                                
                                if (firstAgent && selectedRequest) {
                                  processRequestWithAgent(selectedRequest, firstAgent.id, "full");
                                }
                              }}
                            >
                              <RefreshCw className="mr-2 h-3 w-3" /> Повторная обработка
                            </Button>
                          </div>
                          
                          {/* Показываем результаты AI в карточках */}
                          <div className="grid grid-cols-1 gap-4">
                            {/* AI-классификация */}
                            <div className="bg-white rounded-md border p-4">
                              <div className="flex items-center text-sm font-medium text-gray-700 mb-3 pb-2 border-b">
                                <Tag className="h-4 w-4 mr-2 text-blue-600" />
                                Классификация обращения
                              </div>
                              <div className="bg-blue-50 p-3 rounded-md text-sm">
                                {selectedRequest.aiClassification || "Не классифицировано"}
                              </div>
                            </div>
                            
                            {/* AI-резюме */}
                            {selectedRequest.summary && (
                              <div className="bg-white rounded-md border p-4">
                                <div className="flex items-center text-sm font-medium text-gray-700 mb-3 pb-2 border-b">
                                  <FileText className="h-4 w-4 mr-2 text-purple-600" />
                                  Резюме обращения
                                </div>
                                <div className="bg-purple-50 p-3 rounded-md text-sm">
                                  {selectedRequest.summary}
                                </div>
                              </div>
                            )}
                            
                            {/* Предлагаемый ответ */}
                            {selectedRequest.aiSuggestion && (
                              <div className="bg-white rounded-md border p-4">
                                <div className="flex items-center text-sm font-medium text-gray-700 mb-3 pb-2 border-b">
                                  <MessageCircle className="h-4 w-4 mr-2 text-amber-600" />
                                  Предлагаемый ответ
                                </div>
                                <div className="bg-amber-50 p-3 rounded-md text-sm whitespace-pre-wrap">
                                  {selectedRequest.aiSuggestion}
                                </div>
                                <div className="mt-3 flex justify-end">
                                  <Button size="sm" variant="outline" className="text-xs">
                                    <Send className="h-3 w-3 mr-1" /> Отправить этот ответ
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Дополнительные результаты агентов */}
                          {selectedRequest.id && agentResults[selectedRequest.id]?.length > 0 && (
                            <div className="mt-6">
                              <div className="flex items-center text-sm font-medium text-gray-700 mb-3">
                                <ListChecks className="h-4 w-4 mr-2" /> История обработки агентами
                              </div>
                              
                              <div className="space-y-3">
                                {agentResults[selectedRequest.id].map((result, index) => (
                                  <div key={index} className="bg-white rounded-md border p-3">
                                    <div className="flex justify-between items-center text-xs font-medium text-gray-500 mb-2">
                                      <div className="flex items-center">
                                        <Bot className="h-3 w-3 mr-1" />
                                        Агент: {availableAgents.find(a => a.id === result.agentId)?.name || `ID: ${result.agentId}`}
                                      </div>
                                      <div>
                                        {new Date(result.timestamp).toLocaleString('ru-RU')}
                                      </div>
                                    </div>
                                    <div className="text-sm bg-gray-50 p-2 rounded whitespace-pre-wrap">
                                      {result.content}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                            <Bot className="h-8 w-8 text-blue-600" />
                          </div>
                          <h4 className="text-lg font-medium mb-2">Обращение не обработано</h4>
                          <p className="text-gray-500 max-w-md mb-6">Запустите ИИ-обработку для анализа обращения, его классификации и получения рекомендаций</p>
                          <Button
                            onClick={() => {
                              const firstAgent = availableAgents.find(agent => 
                                (agent.type === 'citizen_requests' || agent.name.includes('обращений')) && agent.isActive
                              );
                              
                              if (firstAgent && selectedRequest) {
                                processRequestWithAgent(selectedRequest, firstAgent.id, "full");
                              }
                            }}
                          >
                            <Bot className="mr-2 h-4 w-4" /> Запустить обработку
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Содержимое вкладки "История" */}
              {viewMode === 'history' && (
                <div className="p-5">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-medium">История обращения</h3>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        Обновлено: {new Date(selectedRequest.updatedAt).toLocaleString('ru-RU')}
                      </div>
                    </div>
                    
                    <div className="relative border-l-2 border-gray-200 pl-8 space-y-8">
                      {/* Создание обращения */}
                      <div className="relative">
                        <div className="absolute w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center -left-[26px] mt-0 text-white">
                          <FileText className="h-3 w-3" />
                        </div>
                        <div>
                          <div className="flex items-center">
                            <span className="font-medium">Регистрация обращения</span>
                            <span className="text-xs text-gray-500 ml-auto">
                              {selectedRequest && new Date(selectedRequest.createdAt).toLocaleString('ru-RU')}
                            </span>
                          </div>
                          <div className="text-sm mt-1 text-gray-600">
                            Обращение #{selectedRequest.id} зарегистрировано в системе
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Badge variant="outline" className="bg-blue-50 text-blue-600 text-xs font-normal">
                              {selectedRequest.requestType || "Обращение гражданина"}
                            </Badge>
                            <Badge variant="outline" className={`${priorityColors[selectedRequest.priority]} text-xs font-normal`}>
                              {selectedRequest.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {/* ИИ обработка, если была */}
                      {selectedRequest?.aiProcessed && (
                        <div className="relative">
                          <div className="absolute w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center -left-[26px] mt-0 text-white">
                            <Bot className="h-3 w-3" />
                          </div>
                          <div>
                            <div className="flex items-center">
                              <span className="font-medium">Обработка ИИ</span>
                              <span className="text-xs text-gray-500 ml-auto">
                                {selectedRequest && new Date(selectedRequest.updatedAt).toLocaleString('ru-RU')}
                              </span>
                            </div>
                            <div className="text-sm mt-1 text-gray-600">
                              Обращение обработано ИИ-агентом
                            </div>
                            {selectedRequest.aiClassification && (
                              <div className="mt-2 p-3 bg-purple-50 rounded-md text-sm">
                                <div className="font-medium mb-1 text-purple-800">Классификация:</div>
                                <div>{selectedRequest.aiClassification}</div>
                              </div>
                            )}
                            {selectedRequest.aiSuggestion && (
                              <div className="mt-2 p-3 bg-amber-50 rounded-md text-sm">
                                <div className="font-medium mb-1 text-amber-800">Рекомендация:</div>
                                <div>{selectedRequest.aiSuggestion}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Назначение исполнителю */}
                      {selectedRequest.assignedTo && (
                        <div className="relative">
                          <div className="absolute w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center -left-[26px] mt-0 text-white">
                            <User className="h-3 w-3" />
                          </div>
                          <div>
                            <div className="flex items-center">
                              <span className="font-medium">Назначено исполнителю</span>
                              <span className="text-xs text-gray-500 ml-auto">
                                {new Date(selectedRequest.updatedAt).toLocaleString('ru-RU')}
                              </span>
                            </div>
                            <div className="text-sm mt-1 text-gray-600">
                              Обращение назначено исполнителю ID: {selectedRequest.assignedTo}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Запись в блокчейн, если была */}
                      {selectedRequest?.blockchainHash && (
                        <div className="relative">
                          <div className="absolute w-6 h-6 bg-green-600 rounded-full flex items-center justify-center -left-[26px] mt-0 text-white">
                            <Database className="h-3 w-3" />
                          </div>
                          <div>
                            <div className="flex items-center">
                              <span className="font-medium">Запись в блокчейн</span>
                              <span className="text-xs text-gray-500 ml-auto">
                                {selectedRequest && new Date(selectedRequest.updatedAt).toLocaleString('ru-RU')}
                              </span>
                            </div>
                            <div className="text-sm mt-1 text-gray-600">
                              Данные обращения записаны в блокчейн для неизменяемого хранения
                            </div>
                            <div className="mt-2 p-2 bg-green-50 rounded text-xs font-mono text-green-800 flex items-center">
                              <Database className="h-3 w-3 inline mr-1" />
                              Hash: {selectedRequest.blockchainHash.substring(0, 20)}...
                            </div>
                            <div className="mt-2">
                              <Button variant="outline" size="sm" className="text-xs">
                                <MoveHorizontal className="h-3 w-3 mr-1" /> Просмотреть детали транзакции
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Завершение обращения, если было */}
                      {selectedRequest?.status === 'completed' && (
                        <div className="relative">
                          <div className="absolute w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center -left-[26px] mt-0 text-white">
                            <Check className="h-3 w-3" />
                          </div>
                          <div>
                            <div className="flex items-center">
                              <span className="font-medium">Завершение обращения</span>
                              <span className="text-xs text-gray-500 ml-auto">
                                {selectedRequest && selectedRequest.completedAt 
                                  ? new Date(selectedRequest.completedAt).toLocaleString('ru-RU') 
                                  : new Date(selectedRequest.updatedAt).toLocaleString('ru-RU')}
                              </span>
                            </div>
                            <div className="text-sm mt-1 text-gray-600">
                              Обращение успешно обработано и отмечено как выполненное
                            </div>
                            <div className="mt-2">
                              <Badge variant="outline" className="bg-green-50 text-green-600">
                                Выполнено
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
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

      {/* Диалоговое окно автоматической обработки обращений */}
      <AutoProcessDialog 
        open={isAutoProcessOpen} 
        onOpenChange={setIsAutoProcessOpen} 
      />
    </div>
  );
};

export default CitizenRequests;
