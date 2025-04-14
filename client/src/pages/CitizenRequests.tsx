import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  ListChecks
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
}

interface RequestCategory {
  id: string;
  name: string;
  description: string;
}

// Демо-категории обращений
const CATEGORIES: RequestCategory[] = [
  { id: "documents", name: "Документы", description: "Выдача и обновление документов" },
  { id: "services", name: "Услуги ЦОН", description: "Получение государственных услуг" },
  { id: "social", name: "Социальные вопросы", description: "Пособия, льготы и социальная помощь" },
  { id: "infrastructure", name: "Инфраструктура", description: "Ремонт дорог, освещение, благоустройство" },
  { id: "utilities", name: "Коммунальные услуги", description: "Проблемы с водой, отоплением, электричеством" },
  { id: "other", name: "Другое", description: "Прочие обращения" },
];

const CitizenRequests = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentRequest, setCurrentRequest] = useState<Partial<CitizenRequest>>({
    subject: "",
    description: "",
    requestType: "",
    priority: "medium",
    status: "pending",
    fullName: "",
    contactInfo: "",
  });
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CitizenRequest | null>(null);
  const [activeTab, setActiveTab] = useState("new");
  const [showAgentSettingsDialog, setShowAgentSettingsDialog] = useState(false);
  const [agentSettings, setAgentSettings] = useState({
    enabled: true,
    autoProcess: true,
    modelId: 1,
    temperature: 0.3,
    systemPrompt: "Вы - помощник для классификации обращений граждан. Ваша задача - определить тип обращения, уровень приоритета и предложить решение."
  });
  
  // Интерфейс для колонок Канбан-доски
  interface KanbanColumn {
    id: string;
    title: string;
    requestIds: number[];
  }
  
  // Объект для канбан-доски
  interface RequestsKanbanBoard {
    columns: {
      [key: string]: KanbanColumn;
    };
    columnOrder: string[];
  }
  
  // Состояние канбан-доски
  const [kanbanBoard, setKanbanBoard] = useState<RequestsKanbanBoard>({
    columns: {
      pending: {
        id: "pending",
        title: "Ожидает",
        requestIds: []
      },
      in_progress: {
        id: "in_progress",
        title: "В работе",
        requestIds: []
      },
      completed: {
        id: "completed",
        title: "Выполнено",
        requestIds: []
      },
      rejected: {
        id: "rejected",
        title: "Отклонено",
        requestIds: []
      }
    },
    columnOrder: ["pending", "in_progress", "completed", "rejected"]
  });
  
  const { toast } = useToast();
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const audioRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // Запрос списка обращений
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['/api/citizen-requests'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/citizen-requests');
        const data = await res.json();
        return data as CitizenRequest[];
      } catch (error) {
        // Демо-данные (в реальном приложении здесь был бы правильный обработчик ошибок)
        console.error("Failed to fetch requests, using demo data", error);
        const demoData: CitizenRequest[] = [
          {
            id: 1,
            title: "Получение удостоверения личности",
            content: "Необходимо получить новое удостоверение личности взамен утерянного. Нужна консультация по срокам и необходимым документам.",
            summary: "Запрос на получение удостоверения личности взамен утерянного. Требуется консультация по процедуре и документам.",
            status: "completed",
            category: "documents",
            priority: "medium",
            createdAt: new Date(Date.now() - 86400000 * 3),
            completedAt: new Date(Date.now() - 86400000),
            assignedTo: "Марат Сагинтаев",
            blockchainHash: "0x7843bf12a9c4817b3a49d452c7896bdf2d3acf8",
            recordedAudio: true,
            citizenInfo: {
              name: "Асанов Азамат",
              contact: "+7 701 234 5678",
              address: "г. Астана, ул. Достык 12, кв. 45",
              iin: "870513300123"
            }
          },
          {
            id: 2,
            title: "Проблема с уличным освещением",
            content: "В районе улицы Абая, дома 23-27 не работает уличное освещение уже неделю. Просьба устранить проблему в кратчайшие сроки.",
            summary: "Жалоба на отсутствие уличного освещения на улице Абая, дома 23-27 в течение недели.",
            status: "in_progress",
            category: "infrastructure",
            priority: "high",
            createdAt: new Date(Date.now() - 86400000 * 2),
            assignedTo: "Департамент городского хозяйства",
            citizenInfo: {
              name: "Бекова Алия",
              contact: "+7 702 345 6789",
              address: "г. Астана, ул. Абая 24, кв. 12",
            }
          },
          {
            id: 3,
            title: "Оформление социального пособия",
            content: "Требуется консультация по оформлению социального пособия для матери-одиночки с двумя детьми. Какие документы необходимы и каков порядок оформления?",
            status: "pending",
            category: "social",
            priority: "medium",
            createdAt: new Date(),
            citizenInfo: {
              name: "Сериккызы Айнур",
              contact: "+7 777 456 7890",
              address: "г. Астана, мкр. Самал 7, кв. 89",
            }
          }
        ];
        return demoData;
      }
    },
    staleTime: 60000
  });

  // Мутация для сохранения обращения
  const saveRequestMutation = useMutation({
    mutationFn: async (request: Partial<CitizenRequest>) => {
      try {
        // Отправляем запрос на API
        const response = await apiRequest('POST', '/api/citizen-requests', request);
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error saving request:", error);
        throw new Error("Не удалось сохранить обращение");
      }
    },
    onSuccess: () => {
      toast({
        title: "Обращение сохранено",
        description: "Обращение гражданина успешно зарегистрировано в системе"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/citizen-requests'] });
      resetForm();
      setActiveTab("all");
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось сохранить обращение: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Функция сохранения обращения в блокчейне
  const saveToBlockchain = async (requestId: number) => {
    try {
      // Здесь был бы API-запрос для сохранения в блокчейне
      // await apiRequest('POST', `/api/citizen-requests/${requestId}/blockchain`);
      
      // Для демо просто имитируем
      toast({
        title: "Сохранено в блокчейне",
        description: "Хэш обращения зафиксирован в GovChain"
      });
      
      // Обновляем кэш
      queryClient.invalidateQueries({ queryKey: ['/api/citizen-requests'] });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить обращение в блокчейне",
        variant: "destructive"
      });
    }
  };

  // Функция генерации резюме с помощью OpenAI
  const generateSummary = async (request: CitizenRequest) => {
    setSelectedRequest(request);
    setShowSummaryDialog(true);
    
    try {
      // Отправляем на обработку AI
      const response = await apiRequest('POST', `/api/citizen-requests/${request.id}/process`);
      const data = await response.json();
      
      setSelectedRequest(data);
      
      toast({
        title: "Обработано AI",
        description: "Обращение успешно обработано AI-агентом"
      });
      
      // Обновляем кэш данных
      queryClient.invalidateQueries({ queryKey: ['/api/citizen-requests'] });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сгенерировать резюме обращения",
        variant: "destructive"
      });
    }
  };

  // Запуск записи аудио
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      
      audioRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };
      
      audioRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Здесь была бы отправка аудио на сервер для распознавания
        // Для демо просто уведомляем пользователя
        toast({
          title: "Запись завершена",
          description: `Продолжительность: ${recordingTime} сек. Аудио готово к обработке.`
        });
        
        // Имитация распознавания речи
        setTimeout(() => {
          setCurrentRequest(prev => ({
            ...prev,
            content: prev.content + "\n\nТранскрипция (STT): Здравствуйте, я хотел бы узнать о получении справки о несудимости. Какие документы необходимы и каковы сроки получения? Также интересует возможность получения справки онлайн через портал электронного правительства.",
            recordedAudio: true
          }));
        }, 2000);
      };
      
      audioRecorder.current.start();
      setIsRecording(true);
      
      // Запускаем таймер
      let seconds = 0;
      recordingInterval.current = setInterval(() => {
        seconds++;
        setRecordingTime(seconds);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Ошибка записи",
        description: "Не удалось запустить запись аудио. Проверьте доступ к микрофону.",
        variant: "destructive"
      });
    }
  };

  // Остановка записи аудио
  const stopRecording = () => {
    if (audioRecorder.current && isRecording) {
      audioRecorder.current.stop();
      setIsRecording(false);
      
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
    }
  };

  // Сброс формы
  const resetForm = () => {
    setCurrentRequest({
      subject: "",
      description: "",
      requestType: "",
      priority: "medium",
      status: "pending",
      fullName: "",
      contactInfo: ""
    });
    setIsRecording(false);
    setRecordingTime(0);
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
  };

  // Обработчик сохранения обращения
  const handleSaveRequest = () => {
    if (!currentRequest.subject || !currentRequest.description || !currentRequest.requestType || !currentRequest.fullName) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }
    
    saveRequestMutation.mutate(currentRequest);
  };

  // Отображение статуса обращения
  const renderStatusBadge = (status: string) => {
    const statusMap = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', text: 'Ожидает' },
      'in_progress': { color: 'bg-blue-100 text-blue-800', text: 'В работе' },
      'completed': { color: 'bg-green-100 text-green-800', text: 'Выполнено' },
      'rejected': { color: 'bg-red-100 text-red-800', text: 'Отклонено' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'bg-gray-100 text-gray-800', text: status };
    
    return (
      <Badge className={statusInfo.color}>{statusInfo.text}</Badge>
    );
  };

  // Отображение приоритета обращения
  const renderPriorityBadge = (priority: string) => {
    const priorityMap = {
      'low': { color: 'bg-green-100 text-green-800', text: 'Низкий' },
      'medium': { color: 'bg-blue-100 text-blue-800', text: 'Средний' },
      'high': { color: 'bg-orange-100 text-orange-800', text: 'Высокий' },
      'urgent': { color: 'bg-red-100 text-red-800', text: 'Срочный' }
    };
    
    const priorityInfo = priorityMap[priority as keyof typeof priorityMap] || { color: 'bg-gray-100 text-gray-800', text: priority };
    
    return (
      <Badge className={priorityInfo.color}>{priorityInfo.text}</Badge>
    );
  };
  
  // Заполняем канбан-доску обращениями при загрузке данных
  useEffect(() => {
    if (!isLoading && requests && requests.length > 0) {
      const newBoard = { ...kanbanBoard };
      
      // Сбрасываем все текущие обращения в колонках
      Object.keys(newBoard.columns).forEach((columnId) => {
        newBoard.columns[columnId].requestIds = [];
      });
      
      // Распределяем обращения по колонкам в соответствии со статусом
      requests.forEach((request) => {
        const status = request.status || "pending";
        if (newBoard.columns[status]) {
          newBoard.columns[status].requestIds.push(request.id);
        } else {
          // Если статус не соответствует ни одной колонке, добавляем в "pending"
          newBoard.columns["pending"].requestIds.push(request.id);
        }
      });
      
      setKanbanBoard(newBoard);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, isLoading]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Обращения граждан</h1>
        <p className="mt-2 text-sm text-neutral-700">
          Запись, обработка и отслеживание обращений граждан в ЦОН и акимат
        </p>
      </div>

      <Tabs defaultValue="new" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-neutral-100">
          <TabsTrigger value="new" className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-900">
            Новое обращение
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-900">
            Все обращения
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-900">
            Интеграции
          </TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-900">
            Статистика
          </TabsTrigger>
        </TabsList>
        
        {/* Вкладка нового обращения */}
        <TabsContent value="new">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Форма обращения */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Регистрация обращения</CardTitle>
                  <CardDescription>
                    Запишите обращение гражданина голосом или введите вручную
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Ф.И.О. заявителя</Label>
                    <Input 
                      id="fullName" 
                      placeholder="Введите имя заявителя"
                      value={currentRequest.fullName}
                      onChange={(e) => setCurrentRequest({...currentRequest, fullName: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contactInfo">Контактная информация</Label>
                    <Input 
                      id="contactInfo" 
                      placeholder="Номер телефона, email или адрес"
                      value={currentRequest.contactInfo}
                      onChange={(e) => setCurrentRequest({...currentRequest, contactInfo: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subject">Тема обращения</Label>
                    <Input 
                      id="subject" 
                      placeholder="Введите тему обращения"
                      value={currentRequest.subject}
                      onChange={(e) => setCurrentRequest({...currentRequest, subject: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="requestType">Тип обращения</Label>
                    <Select 
                      value={currentRequest.requestType}
                      onValueChange={(value) => setCurrentRequest({...currentRequest, requestType: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип обращения" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="priority">Приоритет</Label>
                    <Select 
                      value={currentRequest.priority}
                      onValueChange={(value) => setCurrentRequest({
                        ...currentRequest, 
                        priority: value as CitizenRequest['priority']
                      })}
                    >
                      <SelectTrigger>
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
                    <div className="flex justify-between items-center">
                      <Label htmlFor="description">Содержание обращения</Label>
                      <div className="flex items-center space-x-1">
                        {isRecording ? (
                          <div className="flex items-center">
                            <div className="animate-pulse mr-2 h-2 w-2 rounded-full bg-red-500"></div>
                            <span className="text-xs text-red-500 mr-2">Запись: {recordingTime} сек</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 bg-red-50 hover:bg-red-100 border-red-200"
                              onClick={stopRecording}
                            >
                              <StopCircle className="h-4 w-4 mr-1 text-red-500" />
                              Стоп
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={startRecording}
                          >
                            <Mic className="h-4 w-4 mr-1" />
                            Запись
                          </Button>
                        )}
                      </div>
                    </div>
                    <Textarea 
                      id="description"
                      placeholder="Введите содержание обращения или запишите аудио"
                      rows={8}
                      value={currentRequest.description}
                      onChange={(e) => setCurrentRequest({...currentRequest, description: e.target.value})}
                      className="resize-none"
                    />
                  </div>
                </CardContent>
                <CardFooter className="justify-between border-t p-4">
                  <Button variant="outline" onClick={resetForm}>
                    Очистить
                  </Button>
                  <Button onClick={() => setIsDetailsOpen(true)}>
                    Далее
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            {/* Информационная карточка */}
            <div>
              <Card className="bg-gradient-to-br from-primary-50 to-white">
                <CardHeader>
                  <CardTitle>Как это работает</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary-100 p-2 rounded-full">
                      <Mic className="h-5 w-5 text-primary-700" />
                    </div>
                    <div>
                      <h3 className="font-medium text-primary-900">Запись обращения</h3>
                      <p className="text-sm text-neutral-600">
                        Запишите обращение гражданина с помощью аудио или введите вручную
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary-100 p-2 rounded-full">
                      <FileText className="h-5 w-5 text-primary-700" />
                    </div>
                    <div>
                      <h3 className="font-medium text-primary-900">Автоматическое резюме</h3>
                      <p className="text-sm text-neutral-600">
                        Agent Smith создаст краткое резюме обращения и выделит ключевые моменты
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary-100 p-2 rounded-full">
                      <Database className="h-5 w-5 text-primary-700" />
                    </div>
                    <div>
                      <h3 className="font-medium text-primary-900">Сохранение в GovChain</h3>
                      <p className="text-sm text-neutral-600">
                        Данные обращения сохраняются в блокчейне для обеспечения прозрачности
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary-100 p-2 rounded-full">
                      <BarChart2 className="h-5 w-5 text-primary-700" />
                    </div>
                    <div>
                      <h3 className="font-medium text-primary-900">Аналитика и отслеживание</h3>
                      <p className="text-sm text-neutral-600">
                        Руководство получает аналитику и может отслеживать статус обращений
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Вкладка всех обращений */}
        <TabsContent value="all">
          <div className="space-y-5">
            <div className="mb-4 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold mb-1">Канбан-доска обращений</h2>
                <p className="text-sm text-neutral-500">Перетаскивайте обращения для изменения их статуса</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm" className="flex items-center">
                  <Bot className="h-4 w-4 mr-2 text-primary-600" />
                  <span>Настройки AI-агента</span>
                </Button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-64 bg-neutral-100 rounded-lg"></div>
                  ))}
                </div>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-neutral-300" />
                <h3 className="mt-2 text-lg font-medium text-neutral-900">Нет обращений</h3>
                <p className="mt-1 text-neutral-500">Зарегистрируйте новое обращение гражданина</p>
                <Button className="mt-4" onClick={() => setActiveTab("new")}>
                  Создать обращение
                </Button>
              </div>
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
                  const requestId = parseInt(draggableId.replace('request-', ''));
                  
                  // Удаляем из исходной колонки
                  newBoard.columns[source.droppableId].requestIds = 
                    newBoard.columns[source.droppableId].requestIds.filter(id => id !== requestId);
                  
                  // Добавляем в целевую колонку
                  newBoard.columns[destination.droppableId].requestIds.splice(
                    destination.index, 
                    0, 
                    requestId
                  );
                  
                  // Обновляем состояние доски
                  setKanbanBoard(newBoard);
                  
                  // Обновляем статус обращения в базе данных (в реальном приложении)
                  // updateRequestStatus({ id: requestId, status: destination.droppableId });
                  
                  // Обновляем локальное состояние обращений
                  const request = requests.find(r => r.id === requestId);
                  if (request) {
                    request.status = destination.droppableId as any;
                  }
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {kanbanBoard.columnOrder.map((columnId) => {
                    const column = kanbanBoard.columns[columnId];
                    const columnRequests = column.requestIds
                      .map(id => requests.find(r => r.id === id))
                      .filter(Boolean) as CitizenRequest[];
                    
                    let headerColor = "bg-neutral-100";
                    switch (columnId) {
                      case "pending": headerColor = "bg-yellow-50"; break;
                      case "in_progress": headerColor = "bg-blue-50"; break;
                      case "completed": headerColor = "bg-green-50"; break;
                      case "rejected": headerColor = "bg-red-50"; break;
                    }
                    
                    return (
                      <div key={columnId} className="flex flex-col">
                        <div className={`rounded-t-lg px-4 py-3 border-x border-t border-border ${headerColor}`}>
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-medium text-foreground">
                              {column.title}
                            </h3>
                            <Badge variant="outline">
                              {columnRequests.length}
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
                              {columnRequests.map((request, index) => (
                                <Draggable 
                                  key={`request-${request.id}`}
                                  draggableId={`request-${request.id}`} 
                                  index={index}
                                >
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="mb-3"
                                    >
                                      <Card className="overflow-hidden shadow-sm">
                                        <div className="p-4">
                                          <div>
                                            <h3 className="text-sm font-semibold line-clamp-1">{request.title}</h3>
                                            <div className="flex items-center flex-wrap gap-2 mt-1">
                                              <Badge variant="outline">{CATEGORIES.find(c => c.id === request.category)?.name || request.category}</Badge>
                                              {renderPriorityBadge(request.priority)}
                                            </div>
                                            {request.citizenInfo?.name && (
                                              <div className="mt-2 text-xs text-neutral-500">
                                                {request.citizenInfo.name}
                                              </div>
                                            )}
                                          </div>
                                          
                                          {request.summary && (
                                            <div className="mt-2 text-xs text-neutral-700 bg-neutral-50 p-2 rounded border border-neutral-200 line-clamp-2">
                                              {request.summary}
                                            </div>
                                          )}
                                          
                                          <div className="mt-3 flex justify-between items-center">
                                            <div>
                                              {request.recordedAudio && (
                                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700">
                                                  <Play className="h-3 w-3 mr-1" /> Аудио
                                                </Badge>
                                              )}
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                              {request.blockchainHash && (
                                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                                  <Check className="h-3 w-3 mr-1" /> GovChain
                                                </Badge>
                                              )}
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 px-2 text-xs"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedRequest(request);
                                                  setIsDetailsOpen(true);
                                                }}
                                              >
                                                Подробнее
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      </Card>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              
                              {columnRequests.length === 0 && (
                                <div className="flex items-center justify-center h-20 text-xs text-muted-foreground border border-dashed border-muted-foreground/30 rounded-md m-4">
                                  <MoveHorizontal className="h-3 w-3 mr-2" />
                                  Перетащите обращения сюда
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
          </div>
        </TabsContent>
        
        {/* Вкладка интеграций */}
        <TabsContent value="integrations">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Внешние интеграции</CardTitle>
                  <CardDescription>
                    Настройка источников для получения обращений граждан
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Documentolog интеграция */}
                  <div className="space-y-4 border p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-green-100 p-2 rounded-full">
                          <FileCheck className="h-5 w-5 text-green-700" />
                        </div>
                        <div>
                          <h3 className="font-medium">Документолог (documentolog.com)</h3>
                          <p className="text-sm text-neutral-500">Импорт обращений из СЭД Документолог</p>
                        </div>
                      </div>
                      <Switch checked={true} />
                    </div>
                    
                    <div className="bg-neutral-50 p-4 rounded-lg space-y-4">
                      <h4 className="font-medium text-sm">Импорт документа из Документолог</h4>
                      <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-5">
                          <Label htmlFor="docId">ID документа</Label>
                          <Input 
                            id="docId" 
                            placeholder="Введите ID документа" 
                            className="mt-1"
                          />
                        </div>
                        <div className="col-span-5">
                          <Label htmlFor="docTaskId">Связать с задачей (опционально)</Label>
                          <Input 
                            id="docTaskId" 
                            placeholder="ID задачи" 
                            className="mt-1"
                          />
                        </div>
                        <div className="col-span-2 flex items-end">
                          <Button className="w-full" onClick={() => {
                            const docId = (document.getElementById('docId') as HTMLInputElement).value;
                            const taskId = (document.getElementById('docTaskId') as HTMLInputElement).value;
                            
                            if (!docId) {
                              toast({
                                title: "Ошибка",
                                description: "Введите ID документа",
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            // Отправка запроса на API
                            fetch('/api/documents/documentolog', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({
                                docId,
                                taskId: taskId || null
                              })
                            })
                            .then(response => response.json())
                            .then(data => {
                              if (data.success) {
                                toast({
                                  title: "Документ импортирован",
                                  description: `Документ ${data.document.title} успешно импортирован`
                                });
                                
                                // Очистить поля
                                (document.getElementById('docId') as HTMLInputElement).value = '';
                                (document.getElementById('docTaskId') as HTMLInputElement).value = '';
                              } else {
                                throw new Error(data.error || 'Не удалось импортировать документ');
                              }
                            })
                            .catch(error => {
                              toast({
                                title: "Ошибка",
                                description: error.message,
                                variant: "destructive"
                              });
                            });
                          }}>
                            Импорт
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-xs text-neutral-500 pt-2">
                        <p>URL интеграции для настройки в Документолог:</p>
                        <code className="bg-neutral-100 p-1 rounded">
                          {window.location.origin}/api/webhook/documentolog
                        </code>
                      </div>
                    </div>
                  </div>
                  
                  {/* Telegram интеграция */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <svg className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.568 8.16c-.18 1.896-.978 6.504-1.378 8.628-.168.9-.504 1.2-.822 1.23-.696.06-1.224-.456-1.896-.9-1.05-.696-1.638-1.128-2.676-1.8-1.182-.762-.42-1.182.258-1.86.174-.18 3.162-2.892 3.222-3.136.006-.03.01-.132-.048-.186s-.18-.036-.258-.024c-.108.024-1.8 1.14-5.064 3.348-.48.33-.912.486-1.302.48-.426-.012-1.242-.24-1.848-.444-.744-.24-1.332-.366-1.284-.774.024-.21.324-.426.888-.648 3.504-1.524 5.832-2.532 6.984-3.024 3.318-1.422 4.014-1.674 4.476-1.682.106-.002.356.016.516.2.13.13.174.376.162.57z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium">Telegram Bot</h3>
                          <p className="text-sm text-neutral-500">Получение обращений через Telegram</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Switch id="telegram-integration" />
                        <Button variant="outline" size="sm">Настроить</Button>
                      </div>
                    </div>
                    <div className="pl-11 space-y-2">
                      <div className="text-sm text-neutral-500">API Token</div>
                      <div className="flex space-x-2">
                        <Input type="password" value="••••••••••••••••••••••••••••••" disabled className="font-mono" />
                        <Button variant="ghost" size="icon">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Button>
                      </div>
                      <div className="text-sm text-neutral-500">Webhook URL</div>
                      <div className="flex space-x-2">
                        <Input value="https://api.agent-smith.gov.kz/webhook/telegram" disabled />
                        <Button variant="ghost" size="icon">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Email интеграция */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-orange-100 p-2 rounded-full">
                          <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium">Email</h3>
                          <p className="text-sm text-neutral-500">Получение обращений через электронную почту</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Switch id="email-integration" />
                        <Button variant="outline" size="sm">Настроить</Button>
                      </div>
                    </div>
                    <div className="pl-11 space-y-2">
                      <div className="text-sm text-neutral-500">Email для обращений</div>
                      <div className="flex space-x-2">
                        <Input value="appeals@agent-smith.gov.kz" />
                      </div>
                      <div className="text-sm text-neutral-500">IMAP-сервер</div>
                      <div className="flex space-x-2">
                        <Input value="imap.agent-smith.gov.kz" />
                      </div>
                      <div className="text-sm text-neutral-500">Частота проверки</div>
                      <div className="flex space-x-2">
                        <select className="px-3 py-1 border rounded-md w-full">
                          <option value="5">Каждые 5 минут</option>
                          <option value="10">Каждые 10 минут</option>
                          <option value="30">Каждые 30 минут</option>
                          <option value="60">Каждый час</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* API интеграция */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-purple-100 p-2 rounded-full">
                          <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium">REST API</h3>
                          <p className="text-sm text-neutral-500">Получение обращений через JSON API</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Switch id="api-integration" checked={true} />
                        <Button variant="outline" size="sm">Настроить</Button>
                      </div>
                    </div>
                    <div className="pl-11 space-y-2">
                      <div className="text-sm text-neutral-500">API Endpoint</div>
                      <div className="flex space-x-2">
                        <Input value="https://api.agent-smith.gov.kz/v1/citizen-requests" />
                        <Button variant="ghost" size="icon">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </Button>
                      </div>
                      <div className="text-sm text-neutral-500">API Token</div>
                      <div className="flex space-x-2">
                        <Input type="password" value="sk_••••••••••••••••••••••••••••••" className="font-mono" />
                        <Button variant="ghost" size="icon">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Button>
                      </div>
                      <div className="text-sm text-neutral-500">Формат запроса</div>
                      <div className="flex space-x-2">
                        <Textarea 
                          rows={6} 
                          className="font-mono text-xs"
                          value={`{
  "title": "Обращение гражданина",
  "content": "Текст обращения...",
  "category": "documents",
  "priority": "medium",
  "citizenInfo": {
    "name": "Иванов Иван",
    "contact": "+7 701 123 4567",
    "address": "г. Астана, ул. Примерная 123"
  }
}`}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button>Сохранить настройки</Button>
                </CardFooter>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Журнал событий</CardTitle>
                  <CardDescription>
                    События интеграций и обработки данных
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-l-4 border-green-500 pl-4 py-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Получено обращение через API</span>
                        <span className="text-xs text-neutral-500">2 мин назад</span>
                      </div>
                      <p className="text-sm text-neutral-600">ID: 1234, тема: "Запрос на справку"</p>
                    </div>
                    
                    <div className="border-l-4 border-green-500 pl-4 py-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Получено обращение через Email</span>
                        <span className="text-xs text-neutral-500">1 час назад</span>
                      </div>
                      <p className="text-sm text-neutral-600">От: citizen@example.com, тема: "Проблема с дорогой"</p>
                    </div>
                    
                    <div className="border-l-4 border-orange-500 pl-4 py-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Ошибка авторизации в Telegram</span>
                        <span className="text-xs text-neutral-500">3 часа назад</span>
                      </div>
                      <p className="text-sm text-neutral-600">Неверный API токен или истек срок его действия</p>
                    </div>
                    
                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Синхронизация выполнена</span>
                        <span className="text-xs text-neutral-500">5 часов назад</span>
                      </div>
                      <p className="text-sm text-neutral-600">Обработано 15 обращений из всех источников</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4 justify-center">
                  <Button variant="outline" size="sm">
                    Показать все события
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Информация</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-neutral-600">
                      Agent Smith поддерживает получение обращений граждан из нескольких источников:
                    </p>
                    <ul className="space-y-1 list-disc list-inside text-sm text-neutral-600">
                      <li>Telegram-бот для мгновенных обращений</li>
                      <li>Email для официальных писем</li>
                      <li>REST API для интеграции с другими системами</li>
                    </ul>
                    <p className="text-sm text-neutral-600 mt-4">
                      Все обращения обрабатываются по единому алгоритму с анализом через AI и фиксацией в блокчейне.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Вкладка статистики */}
        <TabsContent value="stats">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Статистика обращений</CardTitle>
                <CardDescription>Общая статистика по обращениям граждан</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-neutral-50 p-4 rounded-md">
                    <div className="text-sm text-neutral-500">Всего обращений</div>
                    <div className="text-3xl font-bold">{requests.length}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-neutral-50 p-4 rounded-md">
                      <div className="text-sm text-neutral-500">Завершено</div>
                      <div className="text-2xl font-semibold text-green-600">
                        {requests.filter(r => r.status === 'completed').length}
                      </div>
                    </div>
                    
                    <div className="bg-neutral-50 p-4 rounded-md">
                      <div className="text-sm text-neutral-500">В работе</div>
                      <div className="text-2xl font-semibold text-blue-600">
                        {requests.filter(r => r.status === 'in_progress').length}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-neutral-50 p-4 rounded-md">
                      <div className="text-sm text-neutral-500">Ожидает</div>
                      <div className="text-2xl font-semibold text-yellow-600">
                        {requests.filter(r => r.status === 'pending').length}
                      </div>
                    </div>
                    
                    <div className="bg-neutral-50 p-4 rounded-md">
                      <div className="text-sm text-neutral-500">Отклонено</div>
                      <div className="text-2xl font-semibold text-red-600">
                        {requests.filter(r => r.status === 'rejected').length}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Категории обращений</CardTitle>
                <CardDescription>Распределение обращений по категориям</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {CATEGORIES.map(category => {
                    const count = requests.filter(r => r.category === category.id).length;
                    const percentage = requests.length > 0 ? Math.round((count / requests.length) * 100) : 0;
                    
                    return (
                      <div key={category.id} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                          <span>{category.name}</span>
                          <span className="text-neutral-500">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-neutral-100 rounded-full h-2">
                          <div 
                            className="bg-primary-500 h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Эффективность обработки</CardTitle>
                <CardDescription>Среднее время обработки обращений</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary-600">1.4</div>
                      <div className="text-sm text-neutral-500">дня в среднем</div>
                    </div>
                    
                    <div className="h-12 border-l border-neutral-200"></div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">92%</div>
                      <div className="text-sm text-neutral-500">решено в срок</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span>Срочные</span>
                        <span className="text-neutral-500">0.5 дней</span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full w-[20%]"></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span>Высокий приоритет</span>
                        <span className="text-neutral-500">1.2 дня</span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full w-[48%]"></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span>Средний приоритет</span>
                        <span className="text-neutral-500">2.5 дня</span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full w-[80%]"></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span>Низкий приоритет</span>
                        <span className="text-neutral-500">3.8 дня</span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full w-[95%]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Диалог подтверждения нового обращения */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Подтверждение обращения</DialogTitle>
            <DialogDescription>Проверьте данные перед отправкой</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-neutral-700">ФИО заявителя</h3>
                <p className="text-sm mt-1">{currentRequest.fullName || 'Не указано'}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-neutral-700">Контакты</h3>
                <p className="text-sm mt-1">{currentRequest.contactInfo || 'Не указаны'}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-neutral-700">Тема</h3>
                <p className="text-sm mt-1">{currentRequest.subject || 'Не указана'}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-neutral-700">Тип обращения</h3>
                <p className="text-sm mt-1">{CATEGORIES.find(c => c.id === currentRequest.requestType)?.name || 'Не указан'}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-neutral-700">Приоритет</h3>
                <p className="text-sm mt-1">{currentRequest.priority === 'low' ? 'Низкий' : 
                  currentRequest.priority === 'medium' ? 'Средний' : 
                  currentRequest.priority === 'high' ? 'Высокий' : 
                  currentRequest.priority === 'urgent' ? 'Срочный' : 'Не указан'}</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-neutral-700">Содержание обращения</h3>
              <p className="text-sm mt-1 whitespace-pre-wrap border p-2 rounded-md bg-muted/30">{currentRequest.description || 'Не указано'}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Назад
            </Button>
            <Button onClick={handleSaveRequest} disabled={saveRequestMutation.isPending}>
              {saveRequestMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог с детальной информацией по обращению */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <DialogTitle>{selectedRequest.title}</DialogTitle>
                    <DialogDescription>
                      Обращение #{selectedRequest.id} | {new Date(selectedRequest.createdAt).toLocaleDateString('ru-RU')}
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2">
                    {renderStatusBadge(selectedRequest.status)}
                    {renderPriorityBadge(selectedRequest.priority)}
                    {selectedRequest.blockchainHash && (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        <Database className="h-3 w-3 mr-1" /> GovChain
                      </Badge>
                    )}
                  </div>
                </div>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-2">
                {/* Основная информация */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Описание обращения</h3>
                    <div className="p-3 bg-neutral-50 rounded-md border text-sm">
                      {selectedRequest.content}
                    </div>
                  </div>
                  
                  {selectedRequest.summary && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">
                        <div className="flex items-center">
                          AI-резюме
                          <Badge variant="outline" className="ml-2 bg-purple-50 text-purple-700">
                            <Mic className="h-3 w-3 mr-1" /> AI Agent
                          </Badge>
                        </div>
                      </h3>
                      <div className="p-3 bg-neutral-50 rounded-md border text-sm">
                        {selectedRequest.summary}
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
                    <h3 className="text-sm font-medium mb-2">AI-агенты</h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start" size="sm">
                        <User className="h-4 w-4 mr-2" />
                        <span>Департамент документов</span>
                      </Button>
                      <Button variant="outline" className="w-full justify-start" size="sm">
                        <BarChart2 className="h-4 w-4 mr-2" />
                        <span>Аналитик данных</span>
                      </Button>
                      <Button variant="outline" className="w-full justify-start" size="sm">
                        <ListChecks className="h-4 w-4 mr-2" />
                        <span>Проверка статуса</span>
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Действия</h3>
                    <div className="space-y-2">
                      {!selectedRequest.summary && (
                        <Button 
                          className="w-full justify-start" 
                          size="sm"
                          onClick={() => generateSummary(selectedRequest)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          <span>Сгенерировать резюме</span>
                        </Button>
                      )}
                      
                      {!selectedRequest.blockchainHash && (
                        <Button 
                          className="w-full justify-start" 
                          size="sm"
                          variant="outline"
                          onClick={() => saveToBlockchain(selectedRequest.id)}
                        >
                          <Database className="h-4 w-4 mr-2" />
                          <span>Сохранить в блокчейне</span>
                        </Button>
                      )}
                      
                      {selectedRequest.status !== 'completed' && (
                        <Button className="w-full justify-start" size="sm" variant="outline">
                          <Check className="h-4 w-4 mr-2" />
                          <span>Отметить выполненным</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Диалог резюме обращения */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Резюме обращения</DialogTitle>
            <DialogDescription>
              Автоматически сгенерированное резюме обращения гражданина
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {!selectedRequest?.summary ? (
              <div className="flex flex-col items-center justify-center h-40">
                <div className="h-6 w-6 border-t-2 border-primary-500 rounded-full animate-spin"></div>
                <span className="mt-3 text-neutral-500">Генерация резюме...</span>
                <p className="mt-2 text-xs text-neutral-400 text-center max-w-md">
                  Agent Smith анализирует содержание обращения и создает краткое резюме с выделением ключевых моментов
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">Обращение</h3>
                  <p className="mt-1 p-3 bg-neutral-50 rounded-md border border-neutral-200 text-sm">
                    {selectedRequest.content}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">Резюме AI</h3>
                  <div className="mt-1 p-3 bg-primary-50 rounded-md border border-primary-200 text-sm">
                    {selectedRequest.summary}
                  </div>
                </div>
                
                {selectedRequest.blockchainHash && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500">Хэш в блокчейне</h3>
                    <div className="mt-1 p-3 bg-neutral-50 rounded-md border border-neutral-200 text-sm font-mono">
                      {selectedRequest.blockchainHash}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSummaryDialog(false)}>
              Закрыть
            </Button>
            {selectedRequest?.summary && !selectedRequest.blockchainHash && (
              <Button onClick={() => saveToBlockchain(selectedRequest.id)}>
                Сохранить в блокчейне
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CitizenRequests;