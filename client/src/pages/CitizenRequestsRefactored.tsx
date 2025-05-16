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
import TrelloStyleRequestCard from '@/components/TrelloStyleRequestCard.new';
import TrelloStyleRequestDetailView from '@/components/TrelloStyleRequestDetailView.new';
import AutoProcessingDialog, { AutoProcessSettings } from '@/components/AutoProcessingDialog.fixed';
import ImportRequestsDialog from '@/components/ImportRequestsDialog';
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
  assignedTo?: number | null;
  aiProcessed?: boolean;
  aiClassification?: string;
  aiSuggestion?: string;
  responseText?: string;
  closedAt?: Date;
  completedAt?: Date;
  
  // Поля для отслеживания крайних сроков
  deadline?: Date;
  overdue?: boolean;
  decision?: string;
  
  // Вложения и суммаризация
  attachments?: string[];
  summary?: string;
  blockchainHash?: string;
  
  // eOtinish-специфические поля
  externalId?: string;
  externalSource?: string;
  externalRegNum?: string;
  region?: string;
  district?: string;
  locality?: string;
  category?: string;
  subcategory?: string;
  responsibleOrg?: string;
  
  // Устаревшие поля, оставлены для совместимости
  title?: string;
  content?: string;
  source?: string;
  
  // Расширенная информация о гражданине
  citizenInfo?: {
    name?: string;
    contact?: string;
    address?: string;
    iin?: string;
    region?: string;
    district?: string;
    locality?: string;
    category?: string;
    subcategory?: string;
    source?: string;
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
  const [isImportDialogOpen, setIsImportDialogOpen] = useState<boolean>(false);
  // Состояние для отслеживания ID последней перемещенной карточки
  const [lastMovedRequestId, setLastMovedRequestId] = useState<number | null>(null);
  // Состояние для настроек агентов
  const [agentSettings, setAgentSettings] = useState<{
    enabled: boolean;
    requestProcessingMode: 'manual' | 'auto' | 'simple';
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
  const { data: citizenRequestsResponse, isLoading, isError } = useQuery<{ data: CitizenRequest[], pagination: any }>({
    queryKey: ["/api/citizen-requests"],
    queryFn: async () => {
      try {
        console.log("Отправка запроса на получение обращений...");
        // Добавляем параметры для сортировки и пагинации
        const response = await fetch("/api/citizen-requests?sortBy=createdAt&sortOrder=desc&limit=100");
        
        console.log("Получен ответ:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Ошибка при загрузке обращений. Статус:", response.status, "Текст:", errorText);
          throw new Error(`Ошибка при загрузке обращений: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        console.log("Данные обращений получены:", data);
        
        // Проверяем формат ответа
        if (data.data && Array.isArray(data.data)) {
          console.log("Получен массив обращений в поле data, возвращаем структуру с data и pagination");
          return data; // Возвращаем полную структуру { data: [...], pagination: {...} }
        }
        
        // Если данные пришли в корне ответа и это массив
        if (Array.isArray(data)) {
          console.log("Получен массив обращений в корне ответа, оборачиваем в структуру");
          return { data, pagination: { total: data.length, limit: 100, offset: 0 } };
        }
        
        console.log("Необычный формат данных, возвращаем с оберткой:", data);
        return { data: [], pagination: { total: 0, limit: 100, offset: 0 } };
      } catch (error) {
        console.error("Ошибка при загрузке обращений:", error);
        // Генерируем ошибку, чтобы React Query выполнил повторный запрос
        throw error;
      }
    },
    // Добавляем опции для повторных попыток и интервала повторных запросов
    retry: 2,
    retryDelay: 1000,
  });
  
  // Извлекаем массив обращений из ответа
  const citizenRequests = citizenRequestsResponse?.data || [];

  // Загрузка списка агентов
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    refetchOnWindowFocus: false,
  });

  // Фильтруем агентов для обработки обращений граждан и убираем дубликаты по имени
  const availableAgents = agents
    .filter(agent => agent.type === "citizen_requests" && (agent.isActive !== false)) // Считаем агента активным, если isActive не false или undefined
    .filter((agent, index, self) => 
      // Оставляем только первое вхождение каждого имени агента
      index === self.findIndex(a => a.name === agent.name)
    );
    
  // Показываем сообщение об ошибке, если не удалось загрузить обращения
  React.useEffect(() => {
    if (isError) {
      toast({
        title: "Ошибка загрузки данных",
        description: "Не удалось загрузить список обращений. Пожалуйста, попробуйте обновить страницу.",
        variant: "destructive",
      });
    }
  }, [isError, toast]);

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
      // Проверка параметров
      if (!requestId || !agentId) {
        throw new Error("Отсутствуют обязательные параметры");
      }
      
      return apiRequest('POST', `/api/citizen-requests/${requestId}/process-with-agent`, { 
        agentId, 
        actionType: action // Исправление: используем actionType вместо action
      });
    },
    onSuccess: (data) => {
      // После успешной обработки обновляем список обращений
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
      
      // Уведомляем пользователя об успешной обработке
      toast({
        title: "Обращение обработано",
        description: "Обращение успешно обработано ИИ агентом",
      });
      
      // Закрываем диалог через 2 секунды
      setTimeout(() => {
        if (isProcessingDialogOpen) {
          setIsProcessingDialogOpen(false);
        }
      }, 2000);
    },
    onError: (error) => {
      console.error("Error processing request with agent:", error);
      
      // Добавляем информацию об ошибке в список результатов
      setProcessingState(prev => ({
        ...prev,
        isProcessing: false,
        progress: 0,
        results: [...prev.results, { 
          step: 'Ошибка обработки', 
          result: 'Не удалось обработать обращение. Пожалуйста, попробуйте еще раз или обратитесь к администратору системы.'
        }]
      }));
      
      // Уведомляем пользователя об ошибке
      toast({
        title: "Ошибка",
        description: "Не удалось обработать обращение",
        variant: "destructive",
      });
    },
    // Добавляем retry для повторных попыток при сетевых ошибках
    retry: 1,
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
  const [autoProcessSettings, setAutoProcessSettings] = useState<AutoProcessSettings>({
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

  // Функция для получения человекочитаемого названия колонки
  const getColumnLabel = (columnId: string): string => {
    switch (columnId) {
      case 'new': return 'Новые';
      case 'inProgress': return 'В обработке';
      case 'completed': return 'Завершенные';
      case 'rejected': return 'Отклоненные';
      case 'waiting': return 'Ожидание';
      default: return columnId;
    }
  };

  // Обработка обращения с помощью агента
  const processRequestWithAgent = (request: CitizenRequest, agentId: number, action: string = "full") => {
    // Проверка параметров перед запуском обработки
    if (!request || !request.id || !agentId) {
      toast({
        title: "Ошибка",
        description: "Некорректные параметры для обработки обращения",
        variant: "destructive",
      });
      return;
    }
    
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
      { step: 'Классификация темы', delay: 1000, progress: 50 },
      { step: 'Подготовка ответа', delay: 1000, progress: 70 },
      { step: 'Финальная проверка', delay: 1000, progress: 90 },
      { step: 'Сохранение результатов', delay: 500, progress: 100 }
    ];
    
    // Используем setTimeout, чтобы не блокировать UI
    setTimeout(() => {
      // Функция для последовательного выполнения шагов
      const runSteps = (stepIndex = 0) => {
        // Защита от ошибок - проверяем, что диалог всё еще открыт
        if (!isProcessingDialogOpen) {
          return;
        }
        
        if (stepIndex >= processingSteps.length) {
          // Все шаги выполнены, отправляем запрос на сервер
          try {
            processWithAgentMutation.mutate({ 
              requestId: request.id, 
              agentId, 
              action  // API ждет action, но внутри функции переименовывает в actionType
            });
          } catch (error) {
            console.error("Error initiating agent processing:", error);
            setProcessingState(prev => ({
              ...prev,
              isProcessing: false,
              results: [...prev.results, { 
                step: 'Ошибка обработки', 
                result: 'Не удалось запустить обработку обращения. Попробуйте позже.'
              }]
            }));
          }
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
    }, 0);
    
    toast({
      title: "Отправка на обработку",
      description: "Обращение отправлено на обработку ИИ",
    });
  };

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
    
    // Получаем ID обращения и находим его в списке
    const requestId = parseInt(draggableId);
    const request = citizenRequests.find(r => r.id === requestId);
    
    if (!request) {
      console.error('Обращение не найдено:', requestId);
      return;
    }

    // Обновляем порядок ID в исходной колонке
    const startRequestIds = Array.from(startColumn.requestIds);
    startRequestIds.splice(source.index, 1);

    // Обновляем порядок ID в целевой колонке
    const finishRequestIds = Array.from(finishColumn.requestIds);
    finishRequestIds.splice(destination.index, 0, requestId);

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

    // Обновляем статус обращения на сервере
    let newStatus = destination.droppableId;
    
    // Устанавливаем ID последней перемещенной карточки для анимации
    setLastMovedRequestId(requestId);
    
    // Сбрасываем ID через 2 секунды
    setTimeout(() => {
      setLastMovedRequestId(null);
    }, 2000);
    
    console.log('Перемещение карточки:', {
      requestId,
      oldStatus: source.droppableId,
      newStatus: destination.droppableId
    });
    
    // Приводим статус к формату, который ожидает сервер
    if (newStatus === 'inProgress') {
      newStatus = 'in_progress';
    }
    
    // Находим старый и новый статус для записи в историю
    const oldStatusLabel = getColumnLabel(source.droppableId);
    const newStatusLabel = getColumnLabel(destination.droppableId);
    
    // Обновляем состояние UI немедленно для лучшего UX
    setBoard(newBoard);
    
    // Используем setTimeout, чтобы избежать конфликтов с библиотекой drag-and-drop
    setTimeout(() => {
      try {
        // Обновляем статус обращения на сервере напрямую
        updateRequestMutation.mutate({
          id: requestId,
          status: newStatus,
        }, {
          onSuccess: () => {
            // После успешного обновления обновляем локальные данные
            queryClient.setQueryData(['/api/citizen-requests'], (oldData: { data: CitizenRequest[], pagination: any } | undefined) => {
              if (!oldData || !oldData.data) return oldData;
              return {
                ...oldData,
                data: oldData.data.map(r => {
                  if (r.id === requestId) {
                    return { ...r, status: newStatus };
                  }
                  return r;
                })
              };
            });
            
            // В фоновом режиме создаем активность
            apiRequest('POST', `/api/citizen-requests/${requestId}/activities`, {
              actionType: 'status_change',
              description: `Статус изменен с "${oldStatusLabel}" на "${newStatusLabel}"`,
              relatedId: requestId,
              relatedType: 'citizen_request'
            }).catch(e => console.error('Ошибка при создании активности:', e));
            
            // В фоновом режиме записываем в блокчейн
            apiRequest('POST', `/api/citizen-requests/${requestId}/blockchain`, {
              action: 'status_change',
              entityType: 'citizen_request',
              entityId: requestId,
              metadata: {
                oldStatus: source.droppableId,
                newStatus: destination.droppableId,
                movedBy: 'operator',
                timestamp: new Date()
              }
            }).catch(e => console.error('Ошибка при записи в блокчейн:', e));
          },
          onError: (error) => {
            console.error('Ошибка при обновлении статуса:', error);
            // Откатываем UI в случае ошибки
            toast({
              title: "Ошибка!",
              description: "Возникла проблема при изменении статуса. Пожалуйста, попробуйте еще раз.",
              variant: "destructive"
            });
          }
        });
      } catch (error) {
        console.error('Ошибка при обновлении статуса:', error);
        toast({
          title: "Ошибка!",
          description: "Возникла проблема при изменении статуса. Пожалуйста, попробуйте еще раз.",
          variant: "destructive"
        });
      }
    }, 0);
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
          case "in_progress":
            inProgressIds.push(request.id);
            break;
          case "waiting":
            waitingIds.push(request.id);
            break;
          case "completed":
            completedIds.push(request.id);
            break;
        }
      });

      // Обновляем состояние канбан-доски
      setBoard({
        columns: {
          new: {
            id: "new",
            title: "Новые",
            requestIds: newIds,
          },
          inProgress: {
            id: "inProgress",
            title: "В работе",
            requestIds: inProgressIds,
          },
          waiting: {
            id: "waiting",
            title: "Ожидание",
            requestIds: waitingIds,
          },
          completed: {
            id: "completed",
            title: "Выполнено",
            requestIds: completedIds,
          },
        },
        columnOrder: ["new", "inProgress", "waiting", "completed"],
      });
    }
  }, [citizenRequests]);

  // Обработчик включения/выключения AI обработки
  const handleAIToggle = (enabled: boolean) => {
    setAgentSettings(prev => ({
      ...prev,
      enabled
    }));
  };

  // Обработчик выбора режима обработки обращений
  const handleProcessingModeChange = (mode: 'manual' | 'auto' | 'simple') => {
    setAgentSettings(prev => ({
      ...prev,
      requestProcessingMode: mode
    }));
  };

  // Обработчик выбора агента по умолчанию
  const handleDefaultAgentChange = (agentId: number) => {
    setAgentSettings(prev => ({
      ...prev,
      defaultAgent: agentId
    }));
  };
  
  // Функция для автоматической обработки обращения
  const handleAutoProcess = (request: CitizenRequest) => {
    if (autoProcessSettings.aiEnabled && autoProcessSettings.selectedAgent) {
      // Открываем диалоговое окно с процессом обработки
      setSelectedRequest(request);
      processRequestWithAgent(request, autoProcessSettings.selectedAgent, "full");
    } else {
      toast({
        title: "Ошибка",
        description: "Необходимо включить ИИ обработку и выбрать агента",
        variant: "destructive",
      });
      
      setIsAutoProcessDialogOpen(true);
    }
  };
  
  // Обработчик сохранения настроек автоматической обработки
  const handleSaveAutoProcessSettings = (settings: AutoProcessSettings) => {
    setAutoProcessSettings(settings);
    setIsAutoProcessDialogOpen(false);
    
    toast({
      title: "Настройки сохранены",
      description: `ИИ обработка ${settings.aiEnabled ? 'включена' : 'выключена'}`,
    });
  };
  
  // Функция для фильтрации обращений по поисковому запросу
  const filteredRequests = citizenRequests.filter(request => {
    const searchLower = searchQuery.toLowerCase();
    return (
      request.fullName.toLowerCase().includes(searchLower) ||
      request.subject.toLowerCase().includes(searchLower) ||
      request.description.toLowerCase().includes(searchLower) ||
      (request.title && request.title.toLowerCase().includes(searchLower)) ||
      (request.aiClassification && request.aiClassification.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Обращения граждан</h1>
        <div className="flex space-x-3">
          <Button onClick={() => setIsNewRequestOpen(true)} variant="default">
            <Plus className="h-4 w-4 mr-2" />
            Новое обращение
          </Button>
          <Button onClick={() => setIsImportDialogOpen(true)} variant="secondary">
            <FileText className="h-4 w-4 mr-2" />
            Импорт из файла
          </Button>
          <Button onClick={() => setIsAutoProcessDialogOpen(true)} variant="outline">
            <Bot className="h-4 w-4 mr-2" />
            Настройки ИИ
          </Button>
        </div>
      </div>
      
      {/* Верхняя панель информации и поиска */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white dark:bg-gray-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-md flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Статистика обращений
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <div className="text-lg font-bold">{stats.total}</div>
                <div className="text-xs text-gray-500">Всего</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{stats.new}</div>
                <div className="text-xs text-gray-500">Новых</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-amber-600">{stats.inProgress}</div>
                <div className="text-xs text-gray-500">В работе</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{stats.completed}</div>
                <div className="text-xs text-gray-500">Завершено</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-md flex items-center">
              <Search className="h-5 w-5 mr-2" />
              Поиск и фильтры
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <div className="flex-1">
                <Input
                  placeholder="Поиск по обращениям"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Фильтры
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Статус</DropdownMenuLabel>
                  <DropdownMenuItem>Все</DropdownMenuItem>
                  <DropdownMenuItem>Новые</DropdownMenuItem>
                  <DropdownMenuItem>В работе</DropdownMenuItem>
                  <DropdownMenuItem>Ожидание</DropdownMenuItem>
                  <DropdownMenuItem>Выполненные</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Приоритет</DropdownMenuLabel>
                  <DropdownMenuItem>Все</DropdownMenuItem>
                  <DropdownMenuItem>Высокий</DropdownMenuItem>
                  <DropdownMenuItem>Средний</DropdownMenuItem>
                  <DropdownMenuItem>Низкий</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Вкладки для переключения между представлениями */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="kanban">Канбан</TabsTrigger>
          <TabsTrigger value="table">Таблица</TabsTrigger>
          <TabsTrigger value="integrations">Интеграции</TabsTrigger>
        </TabsList>
        
        {/* Заголовок канбан-доски */}
        <TabsContent value="kanban" className="mt-0">
          <h2 className="text-xl font-semibold mb-1">Канбан-доска обращений граждан</h2>
          <p className="text-gray-500 mb-4">Перетаскивайте карточки для изменения статуса обращений</p>
          
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-2 pb-4">
              {board.columnOrder.map(columnId => {
                const column = board.columns[columnId];
                const requests = column.requestIds.map(requestId => 
                  citizenRequests.find(r => r.id === requestId)
                ).filter(r => r !== undefined) as CitizenRequest[];
                
                // Проверка на совпадение с поисковым запросом
                const filteredColumnRequests = searchQuery 
                  ? requests.filter(request => {
                      const searchLower = searchQuery.toLowerCase();
                      return (
                        request.fullName.toLowerCase().includes(searchLower) ||
                        request.subject.toLowerCase().includes(searchLower) ||
                        request.description.toLowerCase().includes(searchLower) ||
                        (request.title && request.title.toLowerCase().includes(searchLower)) ||
                        (request.aiClassification && request.aiClassification.toLowerCase().includes(searchLower))
                      );
                    })
                  : requests;
                
                // Определяем цвета заголовка и иконки в зависимости от колонки (как в Meetings.tsx)
                const getColumnStyle = (columnId: string) => {
                  if (columnId === 'new') return { bgColor: 'bg-yellow-100 text-yellow-800', icon: <FileText className="h-3.5 w-3.5 mr-1" /> };
                  if (columnId === 'in_progress') return { bgColor: 'bg-blue-100 text-blue-800', icon: <Clock className="h-3.5 w-3.5 mr-1" /> };
                  if (columnId === 'completed') return { bgColor: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> };
                  if (columnId === 'cancelled') return { bgColor: 'bg-red-100 text-red-800', icon: <AlertCircle className="h-3.5 w-3.5 mr-1" /> };
                  return { bgColor: 'bg-gray-100 text-gray-800', icon: <FileText className="h-3.5 w-3.5 mr-1" /> };
                };
                
                const columnStyle = getColumnStyle(columnId);
                
                return (
                  <div key={column.id} className="flex-1 rounded-md border shadow-sm bg-white overflow-hidden flex flex-col h-full min-w-[260px]">
                    <div className={`p-2 border-b sticky top-0 z-10 ${columnStyle.bgColor}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold flex items-center text-sm">
                          {columnStyle.icon}
                          <span>{column.title}</span>
                        </h3>
                        <div className="flex items-center gap-1">
                          <div className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-white border shadow-sm min-w-[22px] text-center">
                            {filteredColumnRequests.length}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 rounded-full hover:bg-white/80"
                            onClick={() => {
                              if (columnId === 'new') {
                                setIsNewRequestOpen(true);
                              }
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="p-2 flex-1 overflow-y-auto bg-gray-50/50 h-full"
                        >
                          {filteredColumnRequests.length === 0 ? (
                            <div className="text-center py-4 px-2 text-gray-500 text-sm bg-white/80 rounded-md border border-dashed border-gray-300 my-2 transition-all duration-300 hover:bg-white hover:border-gray-400">
                              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400 opacity-70" />
                              <p className="font-medium text-xs">Нет обращений</p>
                              <p className="text-xs text-gray-400 mt-1">Переместите карточки сюда</p>
                            </div>
                          ) : (
                            filteredColumnRequests.map((request, index) => {
                              // Определяем цвета в зависимости от приоритета
                              const priorityBorderColors = {
                                low: 'border-gray-300',
                                medium: 'border-blue-300',
                                high: 'border-orange-300',
                                urgent: 'border-red-300'
                              };
                              
                              const priorityColors = {
                                low: 'bg-gray-100 text-gray-800',
                                medium: 'bg-blue-100 text-blue-800',
                                high: 'bg-orange-100 text-orange-800',
                                urgent: 'bg-red-100 text-red-800'
                              };
                              
                              return (
                                <Draggable
                                  key={request.id.toString()}
                                  draggableId={request.id.toString()}
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      ref={provided.innerRef}
                                      className={`${snapshot.isDragging ? 'shadow-lg' : ''} ${lastMovedRequestId === request.id ? 'border-green-400 border-2' : ''}`}
                                    >
                                      <TrelloStyleRequestCard
                                        request={request}
                                        onClick={() => {
                                          setSelectedRequest(request);
                                          setIsViewDetailsOpen(true);
                                        }}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })
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
        </TabsContent>
        
        {/* Табличное представление */}
        <TabsContent value="table" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Список обращений</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Загрузка данных...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 text-left">ID</th>
                        <th className="py-3 text-left">Гражданин</th>
                        <th className="py-3 text-left">Тема</th>
                        <th className="py-3 text-left">Тип</th>
                        <th className="py-3 text-left">Статус</th>
                        <th className="py-3 text-left">Приоритет</th>
                        <th className="py-3 text-left">Создано</th>
                        <th className="py-3 text-left">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((request) => (
                        <tr key={request.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900">
                          <td className="py-3">{request.id}</td>
                          <td className="py-3">{request.fullName}</td>
                          <td className="py-3">{request.subject}</td>
                          <td className="py-3">{request.requestType}</td>
                          <td className="py-3">
                            <Badge 
                              variant={
                                request.status === 'new' ? 'default' : 
                                request.status === 'inProgress' || request.status === 'in_progress' ? 'secondary' :
                                request.status === 'completed' ? 'default' : 'outline'
                              }
                              className={request.status === 'completed' ? 'bg-green-500 hover:bg-green-600' : ''}
                            >
                              {getColumnLabel(request.status)}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <Badge 
                              variant={
                                request.priority === 'low' ? 'outline' :
                                request.priority === 'medium' ? 'default' :
                                request.priority === 'high' ? 'secondary' : 'destructive'
                              }
                            >
                              {request.priority === 'low' ? 'Низкий' : 
                               request.priority === 'medium' ? 'Средний' :
                               request.priority === 'high' ? 'Высокий' : 'Срочный'}
                            </Badge>
                          </td>
                          <td className="py-3">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setIsViewDetailsOpen(true);
                                }}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setIsViewDetailsOpen(true);
                                    }}
                                  >
                                    Просмотр деталей
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleAutoProcess(request)}
                                  >
                                    Автоматическая обработка
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel>Изменить статус</DropdownMenuLabel>
                                  <DropdownMenuItem>Переместить в "В работе"</DropdownMenuItem>
                                  <DropdownMenuItem>Переместить в "Ожидание"</DropdownMenuItem>
                                  <DropdownMenuItem>Завершить обработку</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Настройки интеграций */}
        <TabsContent value="integrations" className="mt-0">
          <IntegrationSettings />
        </TabsContent>
      </Tabs>
      
      {/* Диалоговое окно для создания нового обращения */}
      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Создать новое обращение</DialogTitle>
            <DialogDescription>
              Заполните информацию об обращении гражданина
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fullName" className="text-right">
                  ФИО
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contactInfo" className="text-right">
                  Контакты
                </Label>
                <Input
                  id="contactInfo"
                  name="contactInfo"
                  value={formData.contactInfo}
                  onChange={handleInputChange}
                  placeholder="Email или телефон"
                  required
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="requestType" className="text-right">
                  Тип обращения
                </Label>
                <Select
                  name="requestType"
                  value={formData.requestType}
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, requestType: value }))
                  }
                >
                  <SelectTrigger id="requestType" className="col-span-3">
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Обращение">Обращение</SelectItem>
                    <SelectItem value="Жалоба">Жалоба</SelectItem>
                    <SelectItem value="Запрос информации">Запрос информации</SelectItem>
                    <SelectItem value="Предложение">Предложение</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="subject" className="text-right">
                  Тема
                </Label>
                <Input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Описание
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  className="col-span-3"
                />
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
              <Button type="submit">Отправить</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Диалоговое окно для просмотра деталей обращения */}
      {selectedRequest && (
        <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <span className="mr-2">Обращение #{selectedRequest.id}</span>
                <Badge 
                  variant={
                    selectedRequest.priority === 'low' ? 'outline' :
                    selectedRequest.priority === 'medium' ? 'default' :
                    selectedRequest.priority === 'high' ? 'secondary' : 'destructive'
                  }
                  className="ml-2"
                >
                  {selectedRequest.priority === 'low' ? 'Низкий' : 
                   selectedRequest.priority === 'medium' ? 'Средний' :
                   selectedRequest.priority === 'high' ? 'Высокий' : 'Срочный'}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            
            <TrelloStyleRequestDetailView 
              request={selectedRequest}
              isOpen={true}
              onAutoProcess={() => {
                if (agentSettings.enabled && agentSettings.defaultAgent) {
                  processRequestWithAgent(selectedRequest, agentSettings.defaultAgent, "full");
                } else {
                  setIsAutoProcessDialogOpen(true);
                }
              }}
              onClose={() => setIsViewDetailsOpen(false)}
              availableAgents={availableAgents}
              onProcessWithAgent={(request, agentId, action) => {
                // Используем ID запроса вместо передачи всего объекта
                if (selectedRequest) {
                  processRequestWithAgent(selectedRequest, agentId, action);
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}
      
      {/* Диалоговое окно для отображения процесса обработки */}
      <Dialog open={isProcessingDialogOpen} onOpenChange={setIsProcessingDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Обработка обращения</DialogTitle>
            <DialogDescription>
              {processingState.isProcessing 
                ? `Выполняется: ${processingState.currentStep}` 
                : 'Обработка завершена'}
            </DialogDescription>
          </DialogHeader>
          
          {/* Прогресс-бар */}
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${processingState.progress}%` }}
            ></div>
          </div>
          
          {/* Результаты обработки */}
          <div className="mt-4 border rounded-md p-4 max-h-[300px] overflow-y-auto">
            <h3 className="font-medium mb-2">Ход обработки:</h3>
            {processingState.results.length > 0 ? (
              <div className="space-y-3">
                {processingState.results.map((result, idx) => (
                  <div key={idx} className="pb-2 border-b border-gray-100 last:border-0">
                    <div className="font-medium text-sm">{result.step}</div>
                    <div className="text-sm text-gray-600">{result.result}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                Ожидание начала обработки...
              </div>
            )}
          </div>
          
          <DialogFooter>
            {!processingState.isProcessing && (
              <Button 
                variant="default"
                onClick={() => setIsProcessingDialogOpen(false)}
              >
                Закрыть
              </Button>
            )}
            {processingState.isProcessing && (
              <Button 
                variant="outline"
                onClick={() => setIsProcessingDialogOpen(false)}
              >
                Скрыть (обработка продолжится)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалоговое окно для настройки автоматической обработки */}
      <AutoProcessingDialog 
        open={isAutoProcessDialogOpen}
        onOpenChange={setIsAutoProcessDialogOpen}
        settings={autoProcessSettings}
        onSave={handleSaveAutoProcessSettings}
        availableAgents={availableAgents}
      />
      
      {/* Диалоговое окно для импорта обращений из файла */}
      <ImportRequestsDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
      />
    </div>
  );
};

export default CitizenRequests;