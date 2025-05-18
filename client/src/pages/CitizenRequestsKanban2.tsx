import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from '@hello-pangea/dnd';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Filter,
  MoreHorizontal,
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
  title?: string;
}

// Интерфейс для колонки Канбан-доски
interface KanbanColumn {
  id: string;
  title: string;
  requestIds: number[];
}

// Интерфейс для структуры Канбан-доски
interface KanbanBoard {
  columns: {
    [key: string]: KanbanColumn;
  };
  columnOrder: string[];
}

// Интерфейс для активности
interface Activity {
  id?: number;
  actionType: string;
  description: string;
  createdAt: Date;
  userId?: string;
  metadata?: any;
}

// Компонент карточки для канбан-доски
const RequestCard = ({ 
  request, 
  index, 
  isJustMoved,
  onViewDetails
}: { 
  request: CitizenRequest; 
  index: number; 
  isJustMoved: boolean;
  onViewDetails: (request: CitizenRequest) => void;
}) => {
  return (
    <Draggable draggableId={request.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`mb-2 rounded-md border bg-white shadow-sm hover:shadow transition-shadow 
            ${snapshot.isDragging ? 'shadow-lg' : ''} 
            ${isJustMoved ? 'ring-2 ring-primary animate-pulse' : ''}`}
          onClick={() => onViewDetails(request)}
        >
          <div className="p-3">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium">{request.subject}</span>
              <Badge 
                variant={
                  request.priority === 'high' || request.priority === 'urgent' 
                    ? 'destructive' 
                    : request.priority === 'medium' 
                      ? 'default' 
                      : 'secondary'
                }
                className="text-xs"
              >
                {request.priority}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{request.description}</p>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <div className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                <span>{request.fullName}</span>
              </div>
              <div>
                <Calendar className="h-3 w-3 inline mr-1" />
                <span>{new Date(request.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

// Компонент деталей обращения
const RequestDetails = ({ 
  request, 
  activities,
  isOpen, 
  onClose 
}: { 
  request: CitizenRequest | null; 
  activities: Activity[];
  isOpen: boolean; 
  onClose: () => void;
}) => {
  const [activeTab, setActiveTab] = useState('details');

  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Обращение №{request.id}: {request.subject}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Подробная информация об обращении гражданина
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="details">Основная информация</TabsTrigger>
            <TabsTrigger value="history">История действий</TabsTrigger>
            <TabsTrigger value="ai">ИИ-анализ</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-1 text-gray-500">Заявитель</h3>
                <p className="mb-3">{request.fullName}</p>
                
                <h3 className="text-sm font-medium mb-1 text-gray-500">Контактная информация</h3>
                <p className="mb-3">{request.contactInfo}</p>
                
                <h3 className="text-sm font-medium mb-1 text-gray-500">Тип обращения</h3>
                <p className="mb-3">{request.requestType}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-1 text-gray-500">Дата создания</h3>
                <p className="mb-3">{new Date(request.createdAt).toLocaleString()}</p>
                
                <h3 className="text-sm font-medium mb-1 text-gray-500">Статус</h3>
                <div className="mb-3">
                  <Badge variant="secondary">{request.status}</Badge>
                </div>
                
                <h3 className="text-sm font-medium mb-1 text-gray-500">Приоритет</h3>
                <div className="mb-3">
                  <Badge 
                    variant={
                      request.priority === 'high' || request.priority === 'urgent' 
                        ? 'destructive' 
                        : request.priority === 'medium' 
                          ? 'default' 
                          : 'secondary'
                    }
                  >
                    {request.priority}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2 text-gray-500">Описание обращения</h3>
              <div className="border rounded-md p-3 bg-gray-50">
                <p>{request.description}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>История действий пуста</p>
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действие</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Описание</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activities.map((activity, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{activity.actionType}</td>
                        <td className="px-4 py-3 text-sm">{activity.description}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {new Date(activity.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai">
            <div className="space-y-4">
              {request.aiClassification ? (
                <div>
                  <h3 className="text-sm font-medium mb-2 text-gray-500">Классификация ИИ</h3>
                  <div className="border rounded-md p-3 bg-purple-50">
                    <p>{request.aiClassification}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Обращение еще не обработано ИИ</p>
                  <Button className="mt-4">
                    <Bot className="mr-2 h-4 w-4" />
                    Отправить на обработку ИИ
                  </Button>
                </div>
              )}
              
              {request.aiSuggestion && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2 text-gray-500">Рекомендация ИИ</h3>
                  <div className="border rounded-md p-3 bg-blue-50 text-blue-800">
                    <p>{request.aiSuggestion}</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Главный компонент
export default function CitizenRequestsKanban2() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Состояния
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState('kanban');
  const [lastMovedRequestId, setLastMovedRequestId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CitizenRequest | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Состояние для статистики
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    inProgress: 0,
    waiting: 0,
    completed: 0,
  });

  // Состояние для доски
  const [board, setBoard] = useState<KanbanBoard>({
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

  // Загрузка обращений
  const { data: citizenRequestsResponse, isLoading } = useQuery({
    queryKey: ["/api/citizen-requests"],
    queryFn: async () => {
      try {
        console.log("Загрузка обращений...");
        
        // Для демонстрации используем тестовые данные
        const testData = [
          {
            id: 1,
            fullName: "Асанов Асан Асанович",
            description: "Прошу рассмотреть вопрос по ремонту дороги на улице Абая",
            contactInfo: "asan@mail.kz",
            requestType: "Инфраструктура",
            subject: "Ремонт дороги",
            status: "Новый",
            priority: "high" as const,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 2,
            fullName: "Иванов Иван Иванович",
            description: "Необходимо проверить качество питьевой воды в районе Медеу",
            contactInfo: "ivan@mail.ru",
            requestType: "Экология",
            subject: "Качество питьевой воды",
            status: "В обработке",
            priority: "medium" as const,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 3,
            fullName: "Петров Петр Петрович",
            description: "Запрос на выдачу справки о составе семьи",
            contactInfo: "petrov@gmail.com",
            requestType: "Документы",
            subject: "Справка о составе семьи",
            status: "Выполнено",
            priority: "low" as const,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];
        
        console.log("Данные обращений получены");
        
        return {
          data: testData,
          pagination: {
            total: testData.length,
            limit: 10,
            offset: 0
          }
        };
      } catch (error) {
        console.error("Ошибка при загрузке обращений:", error);
        throw error;
      }
    },
    retry: false
  });

  const citizenRequests = citizenRequestsResponse?.data || [];

  // Мутация для обновления статуса обращения
  const updateRequestMutation = useMutation({
    mutationFn: (data: { id: number, status: string }) => {
      console.log("Обновление статуса обращения:", data);
      // В реальном приложении здесь будет API-запрос
      // return apiRequest('PATCH', `/api/citizen-requests/${data.id}`, { status: data.status });
      return Promise.resolve({ status: "success" });
    },
    onSuccess: () => {
      toast({
        title: "Статус обновлен",
        description: "Статус обращения успешно обновлен",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус обращения",
        variant: "destructive",
      });
    }
  });

  // Эффект для инициализации доски при загрузке обращений
  useEffect(() => {
    if (citizenRequests && citizenRequests.length > 0) {
      // Создаем новую структуру доски
      const newBoard: KanbanBoard = {
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
      };
      
      // Распределяем обращения по колонкам
      citizenRequests.forEach((request: CitizenRequest) => {
        // Приводим статус из API к ID колонки
        let columnId = "new"; // По умолчанию
        
        if (request.status === "Новый" || request.status === "new") {
          columnId = "new";
        } else if (request.status === "В обработке" || request.status === "in_progress" || request.status === "В работе") {
          columnId = "inProgress";
        } else if (request.status === "Ожидание" || request.status === "waiting") {
          columnId = "waiting";
        } else if (request.status === "Выполнено" || request.status === "completed" || request.status === "Завершено") {
          columnId = "completed";
        }
        
        // Добавляем ID обращения в соответствующую колонку
        if (newBoard.columns[columnId]) {
          newBoard.columns[columnId].requestIds.push(request.id);
        }
      });
      
      // Обновляем состояние канбан-доски
      setBoard(newBoard);
      
      // Обновляем статистику
      setStats({
        total: citizenRequests.length,
        new: newBoard.columns.new.requestIds.length,
        inProgress: newBoard.columns.inProgress.requestIds.length,
        waiting: newBoard.columns.waiting.requestIds.length,
        completed: newBoard.columns.completed.requestIds.length,
      });
    }
  }, [citizenRequests]);

  // Функция для загрузки истории действий
  const loadActivities = (requestId: number) => {
    // В реальном приложении здесь будет API-запрос
    // apiRequest('GET', `/api/citizen-requests/${requestId}/activities`).then(...)
    
    // Для демонстрации используем тестовые данные
    const demoActivities: Activity[] = [
      {
        actionType: "create",
        description: "Обращение создано",
        createdAt: new Date(Date.now() - 86400000) // вчера
      },
      {
        actionType: "status_change",
        description: "Статус изменен с 'Новый' на 'В обработке'",
        createdAt: new Date(Date.now() - 43200000) // 12 часов назад
      },
      {
        actionType: "ai_process",
        description: "Обращение обработано ИИ",
        createdAt: new Date(Date.now() - 21600000) // 6 часов назад
      }
    ];
    
    setActivities(demoActivities);
  };

  // Обработчик просмотра деталей обращения
  const handleViewDetails = (request: CitizenRequest) => {
    setSelectedRequest(request);
    setIsDetailsDialogOpen(true);
    loadActivities(request.id);
  };

  // Функция для создания записи в истории
  const createActivity = (requestId: number, actionType: string, description: string) => {
    console.log("Создание записи в истории:", { requestId, actionType, description });
    // В реальном приложении здесь будет API-запрос
    // apiRequest('POST', `/api/citizen-requests/${requestId}/activities`, { actionType, description }).then(...)
    
    // Если открыто диалоговое окно с деталями данного обращения, обновляем историю
    if (selectedRequest && selectedRequest.id === requestId) {
      const newActivity: Activity = {
        actionType,
        description,
        createdAt: new Date()
      };
      setActivities([newActivity, ...activities]);
    }
  };

  // Функция для создания записи в блокчейне
  const createBlockchainRecord = (requestId: number, action: string, metadata: any = {}) => {
    console.log("Создание записи в блокчейне:", { requestId, action, metadata });
    // В реальном приложении здесь будет API-запрос
    // apiRequest('POST', `/api/citizen-requests/${requestId}/blockchain`, { action, entityType: 'citizen_request', entityId: requestId, metadata }).then(...)
  };

  // Обработчик перетаскивания карточек
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

    // Получаем ID обращения
    const requestId = parseInt(draggableId);

    // Создаем новые массивы requestIds для колонок
    const startRequestIds = Array.from(startColumn.requestIds);
    startRequestIds.splice(source.index, 1);

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

    // Устанавливаем ID последней перемещенной карточки для анимации
    setLastMovedRequestId(requestId);
    
    // Сбрасываем ID через 2 секунды
    setTimeout(() => {
      setLastMovedRequestId(null);
    }, 2000);
    
    // Определяем новый статус для сервера
    let newStatus = destination.droppableId;
    if (newStatus === 'inProgress') {
      newStatus = 'in_progress';
    }
    
    // Получаем человекочитаемые названия статусов
    const oldStatusLabel = getColumnLabel(source.droppableId);
    const newStatusLabel = getColumnLabel(destination.droppableId);
    
    // Обновляем состояние UI немедленно для лучшего UX
    setBoard(newBoard);
    
    // Обновляем статус на сервере
    updateRequestMutation.mutate({
      id: requestId,
      status: newStatus,
    });
    
    // Создаем запись в истории
    const description = `Статус изменен с "${oldStatusLabel}" на "${newStatusLabel}"`;
    createActivity(requestId, "status_change", description);
    
    // Создаем запись в блокчейне
    createBlockchainRecord(requestId, "status_change", {
      oldStatus: source.droppableId,
      newStatus: destination.droppableId,
      movedBy: "user",
      timestamp: new Date()
    });
  };

  // Функция для получения человекочитаемого названия колонки
  const getColumnLabel = (columnId: string): string => {
    switch (columnId) {
      case 'new': return 'Новые';
      case 'inProgress': return 'В обработке';
      case 'waiting': return 'Ожидание';
      case 'completed': return 'Выполнено';
      default: return columnId;
    }
  };

  // Определение стилей для колонки
  const getColumnStyle = (columnId: string) => {
    switch(columnId) {
      case 'new': return 'bg-yellow-50 border-yellow-200';
      case 'inProgress': return 'bg-blue-50 border-blue-200';
      case 'waiting': return 'bg-orange-50 border-orange-200';
      case 'completed': return 'bg-green-50 border-green-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Обращения граждан</h1>
        <div className="flex space-x-3">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Новое обращение
          </Button>
          <Button variant="secondary">
            <FileText className="h-4 w-4 mr-2" />
            Импорт из файла
          </Button>
          <Button variant="outline">
            <Bot className="h-4 w-4 mr-2" />
            Настройки ИИ
          </Button>
        </div>
      </div>
      
      {/* Статистика и поиск */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
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
        
        <Card>
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
        
        {/* Канбан-доска */}
        <TabsContent value="kanban" className="mt-0">
          <h2 className="text-xl font-semibold mb-1">Канбан-доска обращений граждан</h2>
          <p className="text-gray-500 mb-4">Перетаскивайте карточки для изменения статуса обращений</p>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4">
                {board.columnOrder.map(columnId => {
                  const column = board.columns[columnId];
                  const requestsInColumn = column.requestIds
                    .map(reqId => citizenRequests.find(r => r.id === reqId))
                    .filter(Boolean) as CitizenRequest[];
                  
                  // Фильтрация по поисковому запросу
                  const filteredRequests = searchQuery 
                    ? requestsInColumn.filter(request => {
                        const query = searchQuery.toLowerCase();
                        return request.fullName.toLowerCase().includes(query) ||
                              request.subject.toLowerCase().includes(query) ||
                              request.description.toLowerCase().includes(query);
                      })
                    : requestsInColumn;
                  
                  return (
                    <div key={column.id} className={`rounded-md border shadow-sm overflow-hidden flex flex-col min-h-[200px] ${getColumnStyle(columnId)}`}>
                      <div className="p-3 border-b bg-white flex items-center justify-between">
                        <h3 className="font-medium flex items-center">
                          {column.title}
                          <Badge variant="secondary" className="ml-2">{filteredRequests.length}</Badge>
                        </h3>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Droppable droppableId={column.id}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="p-2 flex-1 overflow-y-auto min-h-[200px] max-h-[calc(100vh-400px)]"
                          >
                            {filteredRequests.length === 0 ? (
                              <div className="flex flex-col items-center justify-center h-full text-center p-4 text-gray-400">
                                <FileText className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-sm">Нет обращений</p>
                                <p className="text-xs">Перетащите карточку сюда</p>
                              </div>
                            ) : (
                              filteredRequests.map((request, index) => (
                                <RequestCard 
                                  key={request.id} 
                                  request={request} 
                                  index={index}
                                  isJustMoved={request.id === lastMovedRequestId}
                                  onViewDetails={handleViewDetails}
                                />
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
        </TabsContent>
        
        {/* Табличное представление */}
        <TabsContent value="table" className="mt-0">
          <h2 className="text-xl font-semibold mb-4">Список обращений</h2>
          
          <div className="border rounded-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Гражданин</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тема</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Приоритет</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Создано</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {citizenRequests.map(request => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{request.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{request.fullName}</td>
                    <td className="px-4 py-3 text-sm">{request.subject}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{request.requestType}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <Badge variant="secondary">{request.status}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <Badge variant={
                        request.priority === 'high' ? 'destructive' : 
                        request.priority === 'medium' ? 'default' : 'secondary'
                      }>
                        {request.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-0 h-8 w-8"
                        onClick={() => handleViewDetails(request)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        
        {/* Интеграции */}
        <TabsContent value="integrations" className="mt-0">
          <h2 className="text-xl font-semibold mb-4">Интеграции с внешними системами</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>eOtinish.kz</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  Интеграция с Электронным порталом обращений граждан Республики Казахстан.
                </p>
                <div className="flex items-center space-x-2">
                  <div className="rounded-full h-3 w-3 bg-green-500"></div>
                  <span className="text-sm">Активна</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">Настроить интеграцию</Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>E-Gov API</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  Интеграция с API электронного правительства для получения данных о гражданах.
                </p>
                <div className="flex items-center space-x-2">
                  <div className="rounded-full h-3 w-3 bg-green-500"></div>
                  <span className="text-sm">Активна</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">Настроить интеграцию</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Модальное окно с деталями обращения */}
      {selectedRequest && (
        <RequestDetails 
          request={selectedRequest}
          activities={activities}
          isOpen={isDetailsDialogOpen}
          onClose={() => setIsDetailsDialogOpen(false)}
        />
      )}
    </div>
  );
}