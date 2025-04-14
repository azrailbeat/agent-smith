import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Task, FormattedTask, Activity, BlockchainRecord } from "@/lib/types";
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Calendar, 
  FileText, 
  PlusCircle, 
  BarChart,
  MoveHorizontal,
  History,
  Link,
  Shield,
  MessageSquare
} from "lucide-react";
import { isPast, isToday } from "date-fns";
import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";

// Интерфейс для колонок Канбан-доски
interface KanbanColumn {
  id: string;
  title: string;
  taskIds: number[];
}

// Объект, который будет содержать состояние доски
interface KanbanBoard {
  columns: {
    [key: string]: KanbanColumn;
  };
  columnOrder: string[];
}

const Tasks = () => {
  const { data: tasksData, isLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });
  
  const { toast } = useToast();
  
  // Состояния для диалогов
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [showTaskHistoryDialog, setShowTaskHistoryDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Состояние для новой задачи
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: ''
  });
  
  // Мутация для создания новой задачи
  const createTaskMutation = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      return await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(task)
      }).then(res => res.json());
    },
    onSuccess: () => {
      // Очищаем форму и закрываем диалог
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: ''
      });
      setShowNewTaskDialog(false);
      
      // Уведомляем пользователя
      toast({
        title: "Задача создана",
        description: "Новая задача успешно добавлена",
      });
      
      // Обновляем список задач
      queryClient.invalidateQueries({queryKey: ['/api/tasks']});
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать задачу",
        variant: "destructive",
      });
    }
  });
  
  // Мутация для обновления статуса задачи
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({id, status}: {id: number, status: string}) => {
      return await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['/api/tasks']});
      
      // Создаем запись в истории изменений
      // createTaskHistory({
      //   taskId: selectedTask?.id,
      //   action: 'status_changed',
      //   details: `Изменен статус задачи на ${newStatus}`
      // });
    }
  });
  
  // Обработчик создания новой задачи
  const handleCreateTask = () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Ошибка",
        description: "Название задачи обязательно",
        variant: "destructive",
      });
      return;
    }
    
    createTaskMutation.mutate({
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority as Task['priority'],
      dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
      status: 'pending',
      createdBy: 1, // Default to admin user for now
    });
  };
  
  // Запрос активностей, связанных с задачей и блокчейн-записей
  const { data: activities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
    enabled: showTaskHistoryDialog && !!selectedTask
  });
  
  const { data: blockchainRecords, isLoading: blockchainLoading } = useQuery<BlockchainRecord[]>({
    queryKey: ['/api/blockchain/records'],
    enabled: showTaskHistoryDialog && !!selectedTask
  });
  
  // Открытие диалога с историей изменений
  const openTaskHistory = (task: Task) => {
    setSelectedTask(task);
    setShowTaskHistoryDialog(true);
  };
  
  // Получение активностей, связанных с конкретной задачей
  const getTaskActivities = () => {
    if (!selectedTask || !activities) return [];
    return activities.filter(activity => 
      activity.entityType === 'task' && 
      activity.entityId === selectedTask.id
    ).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };
  
  // Получение блокчейн-записей, связанных с конкретной задачей
  const getTaskBlockchainRecords = () => {
    if (!selectedTask || !blockchainRecords) return [];
    return blockchainRecords.filter(record => 
      record.entityType === 'task' && 
      record.entityId === selectedTask.id
    ).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };
  
  // Состояние для Канбан-доски
  const [kanbanBoard, setKanbanBoard] = useState<KanbanBoard>({
    columns: {
      pending: {
        id: "pending",
        title: "Ожидает",
        taskIds: []
      },
      in_progress: {
        id: "in_progress",
        title: "В процессе",
        taskIds: []
      },
      ready_for_review: {
        id: "ready_for_review",
        title: "На проверку",
        taskIds: []
      },
      completed: {
        id: "completed",
        title: "Завершено",
        taskIds: []
      },
      requires_attention: {
        id: "requires_attention",
        title: "Требует внимания",
        taskIds: []
      }
    },
    columnOrder: ["pending", "in_progress", "ready_for_review", "completed", "requires_attention"]
  });

  // Format tasks for display
  const formatTasks = (tasks: Task[]): FormattedTask[] => {
    return tasks.map(task => {
      // Formatted due date
      const dueDateFormatted = task.dueDate
        ? isToday(new Date(task.dueDate))
          ? "Сегодня"
          : format(new Date(task.dueDate), "d MMMM", { locale: ru })
        : "Не указано";

      // Status badge
      let statusBadge = {
        color: "bg-neutral-100 text-neutral-800",
        text: "Ожидает"
      };

      switch (task.status) {
        case "in_progress":
          statusBadge = {
            color: "bg-yellow-100 text-yellow-800",
            text: "В процессе"
          };
          break;
        case "ready_for_review":
          statusBadge = {
            color: "bg-green-100 text-green-800",
            text: "Готово к проверке"
          };
          break;
        case "completed":
          statusBadge = {
            color: "bg-blue-100 text-blue-800",
            text: "Завершено"
          };
          break;
        case "requires_attention":
          statusBadge = {
            color: "bg-red-100 text-red-800",
            text: "Требует внимания"
          };
          break;
      }

      // Priority badge
      let priorityBadge = {
        color: "bg-neutral-100 text-neutral-800",
        text: "Обычный"
      };

      switch (task.priority) {
        case "low":
          priorityBadge = {
            color: "bg-blue-100 text-blue-800",
            text: "Низкий"
          };
          break;
        case "medium":
          priorityBadge = {
            color: "bg-green-100 text-green-800",
            text: "Средний"
          };
          break;
        case "high":
          priorityBadge = {
            color: "bg-yellow-100 text-yellow-800",
            text: "Высокий"
          };
          break;
        case "urgent":
          priorityBadge = {
            color: "bg-red-100 text-red-800",
            text: "Срочный"
          };
          break;
      }

      return {
        ...task,
        dueDateFormatted,
        statusBadge,
        priorityBadge,
      };
    });
  };

  const tasks = isLoading ? [] : formatTasks(tasksData || []);
  
  // Заполняем канбан-доску задачами при загрузке данных
  useEffect(() => {
    if (!isLoading && tasksData && tasksData.length > 0) {
      const newBoard = { ...kanbanBoard };
      
      // Сбрасываем все текущие задачи в колонках
      Object.keys(newBoard.columns).forEach((columnId) => {
        newBoard.columns[columnId].taskIds = [];
      });
      
      // Распределяем задачи по колонкам в соответствии со статусом
      tasksData.forEach((task) => {
        const status = task.status || "pending";
        if (newBoard.columns[status]) {
          newBoard.columns[status].taskIds.push(task.id);
        } else {
          // Если статус не соответствует ни одной колонке, добавляем в "pending"
          newBoard.columns["pending"].taskIds.push(task.id);
        }
      });
      
      setKanbanBoard(newBoard);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksData, isLoading]);

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Мои задачи</h1>
            <p className="mt-2 text-sm text-neutral-700">
              Всего задач: {isLoading ? "..." : tasks.length}
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button className="inline-flex items-center" onClick={() => setShowNewTaskDialog(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Новая задача
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog for creating a new task */}
      <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Создание новой задачи</DialogTitle>
            <DialogDescription>
              Заполните информацию о новой задаче
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Название задачи</Label>
              <input
                id="title"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                placeholder="Введите название задачи"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                placeholder="Введите описание задачи"
                className="min-h-[80px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Приоритет</Label>
              <Select
                value={newTask.priority}
                onValueChange={(value) => setNewTask({...newTask, priority: value})}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Выберите приоритет" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                  <SelectItem value="urgent">Срочный</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dueDate">Срок исполнения</Label>
              <input
                id="dueDate"
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowNewTaskDialog(false)}
            >
              Отмена
            </Button>
            <Button 
              type="button" 
              onClick={handleCreateTask}
              disabled={createTaskMutation.isPending}
            >
              {createTaskMutation.isPending ? "Создание..." : "Создать задачу"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for task history */}
      <Dialog open={showTaskHistoryDialog} onOpenChange={setShowTaskHistoryDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>История изменений задачи</DialogTitle>
            <DialogDescription>
              {selectedTask?.title}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="activities">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="activities">
                <History className="w-4 h-4 mr-2" />
                Активность
              </TabsTrigger>
              <TabsTrigger value="blockchain">
                <Shield className="w-4 h-4 mr-2" />
                Блокчейн
              </TabsTrigger>
              <TabsTrigger value="messages">
                <MessageSquare className="w-4 h-4 mr-2" />
                Сообщения
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="activities" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {activitiesLoading ? (
                    <div className="flex justify-center p-4">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  ) : getTaskActivities().length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>История активности отсутствует</p>
                    </div>
                  ) : (
                    getTaskActivities().map((activity, index) => {
                      // Определяем цвет и иконку для активности
                      let borderColor = "border-gray-300";
                      let bgColor = "bg-gray-300";
                      
                      switch (activity.actionType) {
                        case 'task_created':
                          borderColor = "border-green-500";
                          bgColor = "bg-green-500";
                          break;
                        case 'task_status_changed':
                          borderColor = "border-yellow-500";
                          bgColor = "bg-yellow-500";
                          break;
                        case 'task_updated':
                          borderColor = "border-blue-500";
                          bgColor = "bg-blue-500";
                          break;
                        case 'document_uploaded':
                        case 'document_processed':
                          borderColor = "border-purple-500";
                          bgColor = "bg-purple-500";
                          break;
                      }
                      
                      // Форматируем дату
                      const activityDate = activity.timestamp ? 
                        format(new Date(activity.timestamp), "d MMMM, HH:mm", { locale: ru }) : 
                        "Дата не указана";
                        
                      return (
                        <div 
                          key={`activity-${activity.id}`} 
                          className={`border-l-2 ${borderColor} pl-4 pb-4 relative ${index === getTaskActivities().length - 1 ? 'pb-0' : ''}`}
                        >
                          <div className={`absolute w-3 h-3 ${bgColor} rounded-full -left-[7px] top-0`}></div>
                          <div className="text-xs text-muted-foreground">{activityDate}</div>
                          <div className="text-sm mt-1">
                            {activity.description}
                            
                            {/* Если это изменение статуса, отображаем детали изменения */}
                            {activity.actionType === 'task_status_changed' && activity.metadata && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {activity.metadata.oldStatus && activity.metadata.newStatus && (
                                  <span>
                                    <span className="font-medium">{activity.metadata.oldStatus}</span> 
                                    {" → "} 
                                    <span className="font-medium">{activity.metadata.newStatus}</span>
                                  </span>
                                )}
                                {activity.metadata.comment && (
                                  <div className="mt-1 italic">"{activity.metadata.comment}"</div>
                                )}
                              </div>
                            )}
                            
                            {/* Если есть привязка к блокчейну */}
                            {activity.blockchainHash && (
                              <div className="mt-1 flex items-center text-xs text-emerald-600">
                                <Shield className="w-3 h-3 mr-1" />
                                <span>Подтверждено в блокчейне</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="blockchain" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {blockchainLoading ? (
                    <div className="flex justify-center p-4">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  ) : getTaskBlockchainRecords().length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Блокчейн-записи отсутствуют</p>
                    </div>
                  ) : (
                    getTaskBlockchainRecords().map((record, index) => {
                      // Форматируем дату
                      const recordDate = record.createdAt ? 
                        format(new Date(record.createdAt), "d MMMM, HH:mm", { locale: ru }) : 
                        "Дата не указана";
                        
                      return (
                        <div 
                          key={`record-${record.id}`} 
                          className="border border-emerald-100 bg-emerald-50 rounded-md p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div className="text-sm font-medium text-emerald-800">{record.title}</div>
                            <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                              {record.status === 'confirmed' ? 'Подтверждено' : 'Ожидание'}
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-muted-foreground mt-1">{recordDate}</div>
                          
                          {record.metadata && (
                            <div className="mt-3 text-sm">
                              {record.metadata.action && (
                                <div className="mb-1">
                                  <span className="font-medium">Действие: </span> 
                                  {record.metadata.action}
                                </div>
                              )}
                              
                              {record.metadata.oldStatus && record.metadata.newStatus && (
                                <div className="mb-1">
                                  <span className="font-medium">Изменение статуса: </span>
                                  <span>{record.metadata.oldStatus}</span> → <span>{record.metadata.newStatus}</span>
                                </div>
                              )}
                              
                              {record.metadata.comment && (
                                <div className="mb-1">
                                  <span className="font-medium">Комментарий: </span>
                                  <span className="italic">"{record.metadata.comment}"</span>
                                </div>
                              )}
                              
                              {record.metadata.summary && (
                                <div className="mb-1">
                                  <span className="font-medium">Описание: </span>
                                  <span>{record.metadata.summary}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="mt-3 pt-2 border-t border-emerald-200 flex items-center text-xs text-emerald-700">
                            <Link className="w-3 h-3 mr-1" />
                            <span className="font-mono text-xs truncate">{record.transactionHash}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="messages" className="mt-4">
              {/* Добавим позже компонент для сообщений */}
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Функциональность сообщений в разработке</p>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button 
              type="button" 
              onClick={() => setShowTaskHistoryDialog(false)}
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kanban Board View */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-1">Канбан-доска задач</h2>
        <p className="text-sm text-neutral-500">Перетаскивайте задачи для изменения их статуса</p>
      </div>
      
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-64 bg-neutral-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">Нет активных задач</h3>
              <p className="text-neutral-500 text-center max-w-md">
                У вас нет активных задач в данный момент. Создайте новую задачу, чтобы начать работу.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext 
          onDragEnd={(result: DropResult) => {
            // Обработчик перетаскивания элементов
            const { destination, source, draggableId } = result;
            if (!destination) return;
            
            if (
              destination.droppableId === source.droppableId &&
              destination.index === source.index
            ) {
              return;
            }
            
            // Клонируем текущее состояние
            const newBoard = {...kanbanBoard};
            const taskId = parseInt(draggableId.replace('task-', ''));
            
            // Удаляем из исходной колонки
            newBoard.columns[source.droppableId].taskIds = 
              newBoard.columns[source.droppableId].taskIds.filter(id => id !== taskId);
            
            // Добавляем в целевую колонку
            newBoard.columns[destination.droppableId].taskIds.splice(
              destination.index, 
              0, 
              taskId
            );
            
            // Обновляем состояние доски
            setKanbanBoard(newBoard);
            
            // Обновляем статус задачи в базе данных 
            updateTaskStatusMutation.mutate({ id: taskId, status: destination.droppableId });
            
            // Обновляем локальное состояние задач
            const taskToUpdate = tasks.find(t => t.id === taskId);
            if (taskToUpdate) {
              taskToUpdate.status = destination.droppableId as any;
            }
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {kanbanBoard.columnOrder.map((columnId) => {
              const column = kanbanBoard.columns[columnId];
              const columnTasks = column.taskIds
                .map(id => tasks.find(t => t.id === id))
                .filter(Boolean) as FormattedTask[];
              
              let headerColor = "bg-neutral-100";
              switch (columnId) {
                case "pending": headerColor = "bg-neutral-100"; break;
                case "in_progress": headerColor = "bg-yellow-50"; break;
                case "ready_for_review": headerColor = "bg-green-50"; break;
                case "completed": headerColor = "bg-blue-50"; break;
                case "requires_attention": headerColor = "bg-red-50"; break;
              }
              
              return (
                <div key={columnId} className="flex flex-col">
                  <div className={`rounded-t-lg px-4 py-3 border-x border-t border-border ${headerColor}`}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-medium text-foreground">
                        {column.title}
                      </h3>
                      <Badge variant="outline">
                        {columnTasks.length}
                      </Badge>
                    </div>
                  </div>
                  
                  <Droppable droppableId={columnId}>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="flex-1 bg-muted/40 rounded-b-lg p-2 min-h-[500px] border border-border"
                      >
                        {columnTasks.map((task, index) => (
                          <Draggable 
                            key={`task-${task.id}`}
                            draggableId={`task-${task.id}`} 
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="mb-3"
                                onClick={() => openTaskHistory(task)}
                              >
                                <Card className="overflow-hidden shadow-sm">
                                  <div className="p-4">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h3 className="text-sm font-semibold">{task.title}</h3>
                                        <div className="flex items-center flex-wrap gap-2 mt-1">
                                          <Badge variant="outline" className={task.priorityBadge.color}>
                                            {task.priorityBadge.text}
                                          </Badge>
                                          {task.dueDate && (
                                            <Badge variant="outline" className={isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) ? "bg-red-50 text-red-700" : ""}>
                                              <Clock className="h-3 w-3 mr-1" /> {task.dueDateFormatted}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="mt-3 flex justify-between items-center">
                                      <div>
                                        {task.documentCount > 0 && (
                                          <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                            <FileText className="h-3 w-3 mr-1" /> {task.documentCount} док.
                                          </Badge>
                                        )}
                                      </div>
                                      
                                      {task.aiProgress > 0 && (
                                        <div className="flex items-center">
                                          <span className="text-xs mr-2">{task.aiProgress}%</span>
                                          <div className="w-16 bg-neutral-200 rounded-full h-1.5">
                                            <div 
                                              className={`h-1.5 rounded-full ${
                                                task.aiProgress > 90 
                                                  ? 'bg-green-500' 
                                                  : task.aiProgress > 40 
                                                    ? 'bg-yellow-500' 
                                                    : 'bg-red-500'
                                              }`} 
                                              style={{ width: `${task.aiProgress}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {columnTasks.length === 0 && (
                          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground border border-dashed border-muted-foreground/30 rounded-md m-4">
                            <MoveHorizontal className="h-3 w-3 mr-2" />
                            Перетащите задачи сюда
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </>
  );
};

export default Tasks;