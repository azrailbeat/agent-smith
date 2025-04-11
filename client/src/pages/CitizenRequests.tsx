import { useState, useRef } from "react";
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
  Database
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
import { Badge } from "@/components/ui/badge";

// Интерфейсы для типизации
interface CitizenRequest {
  id: number;
  title: string;
  content: string;
  summary?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  completedAt?: Date;
  assignedTo?: string;
  blockchainHash?: string;
  recordedAudio?: boolean;
  citizenInfo?: {
    name: string;
    contact: string;
    address: string;
    iin?: string;
  };
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
    title: "",
    content: "",
    category: "",
    priority: "medium",
    status: "pending",
    citizenInfo: {
      name: "",
      contact: "",
      address: "",
      iin: ""
    }
  });
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CitizenRequest | null>(null);
  const [activeTab, setActiveTab] = useState("new");
  
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
        // Здесь в реальном приложении был бы API-запрос
        // return apiRequest('POST', '/api/citizen-requests', request);
        
        // Для демо просто имитируем сохранение
        console.log("Saving request:", request);
        return { 
          id: Date.now(),
          status: 'pending',
          createdAt: new Date(),
          ...request
        } as CitizenRequest;
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
      // Здесь был бы API-запрос для генерации резюме
      // const response = await apiRequest('POST', `/api/citizen-requests/${request.id}/summary`);
      // const data = await response.json();
      
      // Для демо просто имитируем задержку и генерацию
      setTimeout(() => {
        const summaries = {
          "documents": "Запрос на получение нового удостоверения личности взамен утерянного. Требуется консультация по срокам и документам, необходимым для оформления.",
          "infrastructure": "Жалоба на отсутствие уличного освещения на участке улицы Абая (дома 23-27). Проблема существует в течение недели и требует оперативного вмешательства городских служб.",
          "social": "Запрос на консультацию по оформлению социального пособия для матери-одиночки с двумя детьми. Требуется информация о необходимых документах и порядке оформления."
        };
        
        const updatedRequest = { 
          ...request, 
          summary: summaries[request.category as keyof typeof summaries] || "Автоматически сгенерированное резюме обращения гражданина." 
        };
        
        setSelectedRequest(updatedRequest);
        
        // В реальном приложении здесь было бы обновление в БД
        queryClient.invalidateQueries({ queryKey: ['/api/citizen-requests'] });
      }, 1500);
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
      title: "",
      content: "",
      category: "",
      priority: "medium",
      status: "pending",
      citizenInfo: {
        name: "",
        contact: "",
        address: "",
        iin: ""
      }
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
    if (!currentRequest.title || !currentRequest.content || !currentRequest.category) {
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
                    <Label htmlFor="requestTitle">Тема обращения</Label>
                    <Input 
                      id="requestTitle" 
                      placeholder="Введите тему обращения"
                      value={currentRequest.title}
                      onChange={(e) => setCurrentRequest({...currentRequest, title: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Категория</Label>
                    <Select 
                      value={currentRequest.category}
                      onValueChange={(value) => setCurrentRequest({...currentRequest, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите категорию" />
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
                      <Label htmlFor="requestContent">Содержание обращения</Label>
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
                      id="requestContent"
                      placeholder="Введите содержание обращения или запишите аудио"
                      rows={8}
                      value={currentRequest.content}
                      onChange={(e) => setCurrentRequest({...currentRequest, content: e.target.value})}
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
                        RoAI создаст краткое резюме обращения и выделит ключевые моменты
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
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="h-6 w-6 border-t-2 border-primary-500 rounded-full animate-spin"></div>
                <span className="ml-2 text-neutral-500">Загрузка обращений...</span>
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
              <div className="grid grid-cols-1 gap-4">
                {requests.map(request => (
                  <Card key={request.id} className="overflow-hidden">
                    <div className="p-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold">{request.title}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline">{CATEGORIES.find(c => c.id === request.category)?.name || request.category}</Badge>
                            {renderStatusBadge(request.status)}
                            {renderPriorityBadge(request.priority)}
                            {request.recordedAudio && (
                              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                <Play className="h-3 w-3 mr-1" /> Аудиозапись
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-neutral-500 mt-2">
                            {request.citizenInfo?.name} • {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => generateSummary(request)}
                            disabled={!!request.summary}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            {request.summary ? "Просмотр резюме" : "Создать резюме"}
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => saveToBlockchain(request.id)}
                            disabled={!!request.blockchainHash}
                            className={request.blockchainHash ? "bg-green-50 text-green-700 border-green-200" : ""}
                          >
                            {request.blockchainHash ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                В блокчейне
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-1" />
                                В блокчейн
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="text-sm text-neutral-700 line-clamp-2">
                          {request.content}
                        </div>
                        {request.summary && (
                          <div className="mt-3 p-3 bg-neutral-50 rounded-md border border-neutral-200">
                            <div className="flex items-center text-sm font-medium text-neutral-900 mb-1">
                              <FileText className="h-4 w-4 mr-1 text-primary-500" />
                              Резюме AI
                            </div>
                            <p className="text-sm text-neutral-700">
                              {request.summary}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {request.assignedTo && (
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center text-sm text-neutral-500">
                            <User className="h-4 w-4 mr-1" />
                            Ответственный: {request.assignedTo}
                          </div>
                          {request.completedAt && (
                            <div className="flex items-center text-sm text-neutral-500">
                              <Clock className="h-4 w-4 mr-1" />
                              Завершено: {new Date(request.completedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
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
      
      {/* Диалог с информацией о гражданине */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Информация о гражданине</DialogTitle>
            <DialogDescription>
              Укажите данные гражданина для регистрации обращения
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="citizenName" className="text-right">
                ФИО
              </Label>
              <Input
                id="citizenName"
                value={currentRequest.citizenInfo?.name || ''}
                onChange={(e) => setCurrentRequest({
                  ...currentRequest, 
                  citizenInfo: {
                    ...currentRequest.citizenInfo as any,
                    name: e.target.value
                  }
                })}
                className="col-span-3"
                placeholder="Введите ФИО гражданина"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="citizenContact" className="text-right">
                Контакт
              </Label>
              <Input
                id="citizenContact"
                value={currentRequest.citizenInfo?.contact || ''}
                onChange={(e) => setCurrentRequest({
                  ...currentRequest, 
                  citizenInfo: {
                    ...currentRequest.citizenInfo as any,
                    contact: e.target.value
                  }
                })}
                className="col-span-3"
                placeholder="Телефон или email"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="citizenAddress" className="text-right">
                Адрес
              </Label>
              <Input
                id="citizenAddress"
                value={currentRequest.citizenInfo?.address || ''}
                onChange={(e) => setCurrentRequest({
                  ...currentRequest, 
                  citizenInfo: {
                    ...currentRequest.citizenInfo as any,
                    address: e.target.value
                  }
                })}
                className="col-span-3"
                placeholder="Адрес проживания"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="citizenIIN" className="text-right">
                ИИН
              </Label>
              <Input
                id="citizenIIN"
                value={currentRequest.citizenInfo?.iin || ''}
                onChange={(e) => setCurrentRequest({
                  ...currentRequest, 
                  citizenInfo: {
                    ...currentRequest.citizenInfo as any,
                    iin: e.target.value
                  }
                })}
                className="col-span-3"
                placeholder="ИИН (необязательно)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Назад
            </Button>
            <Button onClick={handleSaveRequest} disabled={saveRequestMutation.isPending}>
              {saveRequestMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : "Сохранить обращение"}
            </Button>
          </DialogFooter>
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
                  RoAI анализирует содержание обращения и создает краткое резюме с выделением ключевых моментов
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