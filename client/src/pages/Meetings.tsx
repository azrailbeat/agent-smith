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
  FileText, 
  Check, 
  Clock, 
  Save, 
  Download,
  RefreshCw,
  BarChart2,
  ListChecks,
  Users,
  Calendar,
  CheckCircle,
  ExternalLink
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Интерфейсы для типизации
interface Meeting {
  id: number;
  title: string;
  description: string;
  date: Date;
  location: string;
  participants: string[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  recordingUrl?: string;
  transcriptUrl?: string;
  protocol?: {
    summary: string;
    decisions: string[];
    tasks: MeetingTask[];
  };
  blockchainHash?: string;
  recordedAudio?: boolean;
  organizer: string;
  duration: number; // в минутах
}

interface MeetingTask {
  id: number;
  description: string;
  assignee: string;
  deadline: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  meetingId: number;
  blockchainHash?: string;
}

interface Department {
  id: string;
  name: string;
}

// Демо-департаменты для примера
const DEPARTMENTS: Department[] = [
  { id: "finance", name: "Департамент финансов" },
  { id: "education", name: "Министерство образования" },
  { id: "health", name: "Министерство здравоохранения" },
  { id: "digital", name: "Министерство цифрового развития" },
  { id: "agriculture", name: "Министерство сельского хозяйства" },
  { id: "internal", name: "Министерство внутренних дел" },
];

const Meetings = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentMeeting, setCurrentMeeting] = useState<Partial<Meeting>>({
    title: "",
    description: "",
    location: "",
    participants: [],
    status: "scheduled",
    date: new Date(),
    organizer: "Министерство цифрового развития",
    duration: 60
  });
  
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [viewProtocolDialogOpen, setViewProtocolDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [newTask, setNewTask] = useState<Partial<MeetingTask>>({
    description: "",
    assignee: "",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // через неделю
    status: "pending"
  });
  const [activeTab, setActiveTab] = useState("all");
  
  const { toast } = useToast();
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const audioRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // Запрос списка встреч
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['/api/meetings'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/meetings');
        const data = await res.json();
        return data as Meeting[];
      } catch (error) {
        // Демо-данные (в реальном приложении здесь был бы правильный обработчик ошибок)
        console.error("Failed to fetch meetings, using demo data", error);
        return getDemoMeetings();
      }
    },
    staleTime: 60000
  });

  // Мутация для сохранения встречи
  const saveMeetingMutation = useMutation({
    mutationFn: async (meeting: Partial<Meeting>) => {
      try {
        // Здесь в реальном приложении был бы API-запрос
        // return apiRequest('POST', '/api/meetings', meeting);
        
        // Для демо просто имитируем сохранение
        console.log("Saving meeting:", meeting);
        return { 
          id: Date.now(),
          status: 'scheduled',
          date: new Date(),
          participants: [],
          ...meeting
        } as Meeting;
      } catch (error) {
        console.error("Error saving meeting:", error);
        throw new Error("Не удалось сохранить встречу");
      }
    },
    onSuccess: () => {
      toast({
        title: "Встреча сохранена",
        description: "Встреча успешно зарегистрирована в системе"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      resetForm();
      setActiveTab("all");
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось сохранить встречу: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Мутация для добавления задачи
  const addTaskMutation = useMutation({
    mutationFn: async (task: Partial<MeetingTask>) => {
      try {
        // Здесь в реальном приложении был бы API-запрос
        // return apiRequest('POST', '/api/meeting-tasks', task);
        
        // Для демо просто имитируем сохранение
        console.log("Adding task:", task);
        return { 
          id: Date.now(),
          status: 'pending',
          ...task
        } as MeetingTask;
      } catch (error) {
        console.error("Error adding task:", error);
        throw new Error("Не удалось добавить задачу");
      }
    },
    onSuccess: () => {
      toast({
        title: "Задача добавлена",
        description: "Задача успешно добавлена к протоколу встречи"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      setIsCreateTaskDialogOpen(false);
      setNewTask({
        description: "",
        assignee: "",
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "pending"
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось добавить задачу: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Функция генерации транскрипции и протокола
  const generateProtocol = async (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setViewProtocolDialogOpen(true);
    
    if (meeting.protocol) {
      return; // Если протокол уже есть, просто показываем его
    }
    
    try {
      // Здесь был бы API-запрос для генерации протокола
      // const response = await apiRequest('POST', `/api/meetings/${meeting.id}/protocol`);
      // const data = await response.json();
      
      // Для демо просто имитируем задержку и генерацию
      setTimeout(() => {
        const updatedMeeting = { 
          ...meeting,
          protocol: {
            summary: "На встрече обсуждались вопросы цифровизации государственных услуг и внедрения системы Agent Smith в работу правительственных органов. Были представлены результаты пилотного проекта в Министерстве цифрового развития.",
            decisions: [
              "Утвердить план внедрения системы Agent Smith в 5 министерствах до конца года",
              "Выделить дополнительное финансирование на разработку модулей для работы с казахским языком",
              "Создать межведомственную рабочую группу по координации внедрения AI-инструментов"
            ],
            tasks: [
              {
                id: 1,
                description: "Подготовить детальный план внедрения системы Agent Smith",
                assignee: "Ержан Амиров",
                deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                status: "pending",
                meetingId: meeting.id
              },
              {
                id: 2,
                description: "Согласовать бюджет на разработку модулей для казахского языка",
                assignee: "Айжан Нурланова",
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                status: "pending",
                meetingId: meeting.id
              },
              {
                id: 3,
                description: "Сформировать состав межведомственной рабочей группы",
                assignee: "Марат Сагинтаев",
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: "pending",
                meetingId: meeting.id
              }
            ]
          }
        };
        
        setSelectedMeeting(updatedMeeting);
        
        // В реальном приложении здесь было бы обновление в БД
        queryClient.setQueryData(['/api/meetings'], (oldData: Meeting[]) => {
          return oldData.map(m => m.id === meeting.id ? updatedMeeting : m);
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сгенерировать протокол встречи",
        variant: "destructive"
      });
    }
  };

  // Функция сохранения в блокчейне
  const saveToBlockchain = async (meetingId: number) => {
    try {
      // Здесь был бы API-запрос для сохранения в блокчейне
      // await apiRequest('POST', `/api/meetings/${meetingId}/blockchain`);
      
      // Для демо просто имитируем
      toast({
        title: "Сохранено в блокчейне",
        description: "Протокол встречи и решения зафиксированы в GovChain"
      });
      
      // Обновляем кэш
      queryClient.setQueryData(['/api/meetings'], (oldData: Meeting[]) => {
        return oldData.map(m => {
          if (m.id === meetingId) {
            return {
              ...m,
              blockchainHash: "0x" + Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10)
            };
          }
          return m;
        });
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить протокол в блокчейне",
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
        
        setCurrentMeeting(prev => ({
          ...prev,
          recordedAudio: true
        }));
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
    setCurrentMeeting({
      title: "",
      description: "",
      location: "",
      participants: [],
      status: "scheduled",
      date: new Date(),
      organizer: "Министерство цифрового развития",
      duration: 60
    });
    setSelectedParticipant("");
    setIsRecording(false);
    setRecordingTime(0);
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
  };

  // Добавление участника
  const addParticipant = () => {
    if (!selectedParticipant) return;
    
    if (currentMeeting.participants?.includes(selectedParticipant)) {
      toast({
        title: "Ошибка",
        description: "Этот участник уже добавлен",
        variant: "destructive"
      });
      return;
    }
    
    setCurrentMeeting(prev => ({
      ...prev,
      participants: [...(prev.participants || []), selectedParticipant]
    }));
    
    setSelectedParticipant("");
  };

  // Удаление участника
  const removeParticipant = (participant: string) => {
    setCurrentMeeting(prev => ({
      ...prev,
      participants: prev.participants?.filter(p => p !== participant) || []
    }));
  };

  // Обработчик сохранения встречи
  const handleSaveMeeting = () => {
    if (!currentMeeting.title || !currentMeeting.organizer) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }
    
    saveMeetingMutation.mutate(currentMeeting);
  };

  // Обработчик добавления задачи
  const handleAddTask = () => {
    if (!newTask.description || !newTask.assignee || !selectedMeeting) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }
    
    addTaskMutation.mutate({
      ...newTask,
      meetingId: selectedMeeting.id
    });
  };

  // Открытие диалога для добавления задачи
  const openAddTaskDialog = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setIsCreateTaskDialogOpen(true);
  };

  // Отображение статуса встречи
  const renderMeetingStatus = (status: string) => {
    const statusMap = {
      'scheduled': { color: 'bg-blue-100 text-blue-800', text: 'Запланирована' },
      'in_progress': { color: 'bg-yellow-100 text-yellow-800', text: 'В процессе' },
      'completed': { color: 'bg-green-100 text-green-800', text: 'Завершена' },
      'cancelled': { color: 'bg-red-100 text-red-800', text: 'Отменена' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'bg-gray-100 text-gray-800', text: status };
    
    return (
      <Badge className={statusInfo.color}>{statusInfo.text}</Badge>
    );
  };

  // Отображение статуса задачи
  const renderTaskStatus = (status: string) => {
    const statusMap = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', text: 'Ожидает' },
      'in_progress': { color: 'bg-blue-100 text-blue-800', text: 'В работе' },
      'completed': { color: 'bg-green-100 text-green-800', text: 'Выполнена' },
      'cancelled': { color: 'bg-red-100 text-red-800', text: 'Отменена' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'bg-gray-100 text-gray-800', text: status };
    
    return (
      <Badge className={statusInfo.color}>{statusInfo.text}</Badge>
    );
  };

  // Форматирование даты
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  // Получение демо-данных (имитация API)
  const getDemoMeetings = (): Meeting[] => {
    return [
      {
        id: 1,
        title: "Совещание по внедрению Agent Smith",
        description: "Обсуждение плана внедрения системы Agent Smith в государственные органы Казахстана",
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // неделю назад
        location: "Конференц-зал, Министерство цифрового развития",
        participants: [
          "Министерство цифрового развития",
          "Министерство финансов",
          "Министерство внутренних дел"
        ],
        status: "completed",
        protocol: {
          summary: "На встрече обсуждались вопросы цифровизации государственных услуг и внедрения системы Agent Smith в работу правительственных органов. Были представлены результаты пилотного проекта в Министерстве цифрового развития.",
          decisions: [
            "Утвердить план внедрения системы Agent Smith в 5 министерствах до конца года",
            "Выделить дополнительное финансирование на разработку модулей для работы с казахским языком",
            "Создать межведомственную рабочую группу по координации внедрения AI-инструментов"
          ],
          tasks: [
            {
              id: 1,
              description: "Подготовить детальный план внедрения системы Agent Smith",
              assignee: "Ержан Амиров",
              deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              status: "in_progress",
              meetingId: 1
            },
            {
              id: 2,
              description: "Согласовать бюджет на разработку модулей для казахского языка",
              assignee: "Айжан Нурланова",
              deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              status: "pending",
              meetingId: 1
            },
            {
              id: 3,
              description: "Сформировать состав межведомственной рабочей группы",
              assignee: "Марат Сагинтаев",
              deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              status: "completed",
              meetingId: 1
            }
          ]
        },
        blockchainHash: "0x7843bf12a9c4817b3a49d452c7896bdf2d3acf8",
        recordedAudio: true,
        organizer: "Министерство цифрового развития",
        duration: 120
      },
      {
        id: 2,
        title: "Рабочая группа по улучшению казахского STT",
        description: "Обсуждение планов по улучшению распознавания казахской речи в Agent Smith",
        date: new Date(),
        location: "Онлайн, Zoom",
        participants: [
          "Министерство цифрового развития",
          "Министерство образования",
          "Институт языкознания"
        ],
        status: "scheduled",
        organizer: "Министерство цифрового развития",
        duration: 90
      },
      {
        id: 3,
        title: "Итоги пилотного внедрения в МВД",
        description: "Подведение итогов пилотного внедрения Agent Smith в работу МВД",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 дня назад
        location: "Конференц-зал, МВД",
        participants: [
          "Министерство внутренних дел",
          "Министерство цифрового развития",
          "Министерство юстиции"
        ],
        status: "completed",
        protocol: {
          summary: "На встрече обсуждались результаты пилотного внедрения Agent Smith в работу МВД. Представлена статистика по обработке обращений граждан и составлению протоколов.",
          decisions: [
            "Признать пилотное внедрение Agent Smith в МВД успешным",
            "Расширить функциональность для работы с базами данных МВД",
            "Провести обучение сотрудников работе с системой"
          ],
          tasks: [
            {
              id: 4,
              description: "Разработать план масштабирования на все отделения МВД",
              assignee: "Аскар Жумагалиев",
              deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
              status: "pending",
              meetingId: 3
            },
            {
              id: 5,
              description: "Составить техническое задание для интеграции с существующими БД",
              assignee: "Дамир Сериков",
              deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              status: "pending",
              meetingId: 3
            }
          ]
        },
        recordedAudio: true,
        organizer: "Министерство внутренних дел",
        duration: 150
      }
    ];
  };

  // Просмотр протокола
  const viewProtocol = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setViewProtocolDialogOpen(true);
  };

  // Загрузка протокола
  const downloadProtocol = (meeting: Meeting) => {
    if (!meeting.protocol) return;
    
    const protocolData = {
      meetingTitle: meeting.title,
      date: formatDate(meeting.date),
      organizer: meeting.organizer,
      participants: meeting.participants,
      summary: meeting.protocol.summary,
      decisions: meeting.protocol.decisions,
      tasks: meeting.protocol.tasks.map(task => ({
        description: task.description,
        assignee: task.assignee,
        deadline: formatDate(new Date(task.deadline)),
        status: task.status
      })),
      blockchainHash: meeting.blockchainHash
    };
    
    const jsonString = JSON.stringify(protocolData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `protocol_${meeting.id}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Протокол скачан",
      description: "Файл протокола успешно скачан"
    });
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Протоколы встреч</h1>
        <p className="mt-2 text-sm text-neutral-700">
          Запись, протоколирование и отслеживание стратегических совещаний
        </p>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-neutral-100">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-900">
            Все встречи
          </TabsTrigger>
          <TabsTrigger value="new" className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-900">
            Новая встреча
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-900">
            Задачи
          </TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-900">
            Статистика
          </TabsTrigger>
        </TabsList>
        
        {/* Вкладка всех встреч */}
        <TabsContent value="all">
          <div className="space-y-5">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="h-6 w-6 border-t-2 border-primary-500 rounded-full animate-spin"></div>
                <span className="ml-2 text-neutral-500">Загрузка встреч...</span>
              </div>
            ) : meetings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-neutral-300" />
                <h3 className="mt-2 text-lg font-medium text-neutral-900">Нет запланированных встреч</h3>
                <p className="mt-1 text-neutral-500">Создайте новую встречу или совещание</p>
                <Button className="mt-4" onClick={() => setActiveTab("new")}>
                  Создать встречу
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {meetings.map(meeting => (
                  <Card key={meeting.id} className="overflow-hidden">
                    <div className="p-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold">{meeting.title}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            {renderMeetingStatus(meeting.status)}
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                              <Users className="h-3 w-3 mr-1" /> {meeting.participants.length} участников
                            </Badge>
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" /> {meeting.duration} мин
                            </Badge>
                            {meeting.recordedAudio && (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                <Mic className="h-3 w-3 mr-1" /> Аудиозапись
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-neutral-500 mt-2">
                            {meeting.organizer} • {formatDate(meeting.date)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => meeting.protocol ? viewProtocol(meeting) : generateProtocol(meeting)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            {meeting.protocol ? "Протокол" : "Создать протокол"}
                          </Button>
                          
                          {meeting.protocol && !meeting.blockchainHash && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => saveToBlockchain(meeting.id)}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              В блокчейн
                            </Button>
                          )}
                          
                          {meeting.protocol && meeting.blockchainHash && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              В блокчейне
                            </Button>
                          )}
                          
                          {meeting.protocol && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => downloadProtocol(meeting)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Скачать
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="text-sm text-neutral-700 line-clamp-2">
                          {meeting.description}
                        </div>
                        
                        {meeting.protocol && meeting.protocol.tasks.length > 0 && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium">Задачи ({meeting.protocol.tasks.length})</h4>
                              <Button size="sm" variant="ghost" onClick={() => openAddTaskDialog(meeting)}>
                                + Добавить задачу
                              </Button>
                            </div>
                            <div className="bg-neutral-50 rounded-md">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Задача</TableHead>
                                    <TableHead>Ответственный</TableHead>
                                    <TableHead>Срок</TableHead>
                                    <TableHead>Статус</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {meeting.protocol.tasks.map(task => (
                                    <TableRow key={task.id}>
                                      <TableCell>{task.description}</TableCell>
                                      <TableCell>{task.assignee}</TableCell>
                                      <TableCell>{formatDate(task.deadline)}</TableCell>
                                      <TableCell>{renderTaskStatus(task.status)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Вкладка новой встречи */}
        <TabsContent value="new">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Форма встречи */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Регистрация встречи</CardTitle>
                  <CardDescription>
                    Запишите информацию о встрече или совещании
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="meetingTitle">Тема встречи</Label>
                    <Input 
                      id="meetingTitle" 
                      placeholder="Введите тему встречи"
                      value={currentMeeting.title}
                      onChange={(e) => setCurrentMeeting({...currentMeeting, title: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="organizer">Организатор</Label>
                    <Select 
                      value={currentMeeting.organizer}
                      onValueChange={(value) => setCurrentMeeting({...currentMeeting, organizer: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите организатора" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map(dept => (
                          <SelectItem key={dept.id} value={dept.name}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="meetingDate">Дата</Label>
                      <Input 
                        id="meetingDate" 
                        type="date"
                        value={currentMeeting.date ? new Date(currentMeeting.date).toISOString().slice(0, 10) : ""}
                        onChange={(e) => setCurrentMeeting({...currentMeeting, date: new Date(e.target.value)})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="meetingDuration">Продолжительность (мин)</Label>
                      <Input 
                        id="meetingDuration" 
                        type="number"
                        min="15"
                        step="15"
                        value={currentMeeting.duration || 60}
                        onChange={(e) => setCurrentMeeting({...currentMeeting, duration: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="meetingLocation">Место проведения</Label>
                    <Input 
                      id="meetingLocation" 
                      placeholder="Введите место проведения"
                      value={currentMeeting.location}
                      onChange={(e) => setCurrentMeeting({...currentMeeting, location: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Участники</Label>
                    <div className="flex space-x-2">
                      <Select value={selectedParticipant} onValueChange={setSelectedParticipant}>
                        <SelectTrigger className="w-[300px]">
                          <SelectValue placeholder="Выберите участника" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map(dept => (
                            <SelectItem key={dept.id} value={dept.name}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" onClick={addParticipant} disabled={!selectedParticipant}>
                        Добавить
                      </Button>
                    </div>
                    
                    <div className="mt-2">
                      {currentMeeting.participants && currentMeeting.participants.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {currentMeeting.participants.map(participant => (
                            <Badge key={participant} variant="secondary" className="flex items-center gap-1">
                              {participant}
                              <button
                                onClick={() => removeParticipant(participant)}
                                className="ml-1 h-4 w-4 rounded-full bg-neutral-200 text-neutral-500 hover:bg-neutral-300 flex items-center justify-center"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-500 mt-2">Нет добавленных участников</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="meetingDescription">Описание встречи</Label>
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
                      id="meetingDescription"
                      placeholder="Введите описание встречи или запишите аудио"
                      rows={5}
                      value={currentMeeting.description}
                      onChange={(e) => setCurrentMeeting({...currentMeeting, description: e.target.value})}
                      className="resize-none"
                    />
                  </div>
                </CardContent>
                <CardFooter className="justify-between border-t p-4">
                  <Button variant="outline" onClick={resetForm}>
                    Очистить
                  </Button>
                  <Button onClick={handleSaveMeeting} disabled={saveMeetingMutation.isPending}>
                    {saveMeetingMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Сохранение...
                      </>
                    ) : "Сохранить встречу"}
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
                      <h3 className="font-medium text-primary-900">Запись встречи</h3>
                      <p className="text-sm text-neutral-600">
                        Запишите аудио встречи или введите информацию вручную
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary-100 p-2 rounded-full">
                      <FileText className="h-5 w-5 text-primary-700" />
                    </div>
                    <div>
                      <h3 className="font-medium text-primary-900">Автоматический протокол</h3>
                      <p className="text-sm text-neutral-600">
                        RoAI создаст протокол встречи с решениями и задачами
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary-100 p-2 rounded-full">
                      <ListChecks className="h-5 w-5 text-primary-700" />
                    </div>
                    <div>
                      <h3 className="font-medium text-primary-900">Отслеживание задач</h3>
                      <p className="text-sm text-neutral-600">
                        Отслеживайте выполнение задач, назначенных на встрече
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary-100 p-2 rounded-full">
                      <Save className="h-5 w-5 text-primary-700" />
                    </div>
                    <div>
                      <h3 className="font-medium text-primary-900">Юридическая фиксация</h3>
                      <p className="text-sm text-neutral-600">
                        Решения сохраняются в блокчейне для юридической значимости
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Вкладка задач */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Задачи по итогам встреч</CardTitle>
              <CardDescription>
                Отслеживание и управление задачами, назначенными на стратегических совещаниях
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="bg-white">Все задачи</Button>
                    <Button variant="ghost" size="sm">Мои задачи</Button>
                    <Button variant="ghost" size="sm">Просроченные</Button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select defaultValue="status">
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Статус" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="status">Любой статус</SelectItem>
                        <SelectItem value="pending">Ожидает</SelectItem>
                        <SelectItem value="in_progress">В работе</SelectItem>
                        <SelectItem value="completed">Выполнена</SelectItem>
                        <SelectItem value="cancelled">Отменена</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[400px]">Задача</TableHead>
                        <TableHead>Протокол</TableHead>
                        <TableHead>Ответственный</TableHead>
                        <TableHead>Срок</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meetings.flatMap(meeting => 
                        meeting.protocol?.tasks.map(task => (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.description}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <span className="text-sm truncate max-w-[150px]">{meeting.title}</span>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                                  <a href="#" onClick={(e) => { e.preventDefault(); viewProtocol(meeting); }}>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{task.assignee}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3 text-neutral-500" />
                                <span>{formatDate(task.deadline)}</span>
                              </div>
                            </TableCell>
                            <TableCell>{renderTaskStatus(task.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-1">
                                <Button variant="ghost" size="sm" className="h-7 px-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )) || []
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Вкладка статистики */}
        <TabsContent value="stats">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Статистика встреч</CardTitle>
                <CardDescription>Количество встреч и протоколов</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-neutral-50 p-4 rounded-md">
                    <div className="text-sm text-neutral-500">Всего встреч</div>
                    <div className="text-3xl font-bold">{meetings.length}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-neutral-50 p-4 rounded-md">
                      <div className="text-sm text-neutral-500">С протоколами</div>
                      <div className="text-2xl font-semibold text-blue-600">
                        {meetings.filter(m => m.protocol).length}
                      </div>
                    </div>
                    
                    <div className="bg-neutral-50 p-4 rounded-md">
                      <div className="text-sm text-neutral-500">В блокчейне</div>
                      <div className="text-2xl font-semibold text-green-600">
                        {meetings.filter(m => m.blockchainHash).length}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-neutral-50 p-4 rounded-md">
                      <div className="text-sm text-neutral-500">С аудиозаписью</div>
                      <div className="text-2xl font-semibold text-purple-600">
                        {meetings.filter(m => m.recordedAudio).length}
                      </div>
                    </div>
                    
                    <div className="bg-neutral-50 p-4 rounded-md">
                      <div className="text-sm text-neutral-500">Запланировано</div>
                      <div className="text-2xl font-semibold text-yellow-600">
                        {meetings.filter(m => m.status === 'scheduled').length}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Задачи по встречам</CardTitle>
                <CardDescription>Статус задач по протоколам</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-neutral-50 p-4 rounded-md">
                    <div className="text-sm text-neutral-500">Всего задач</div>
                    <div className="text-3xl font-bold">
                      {meetings.reduce((acc, meeting) => acc + (meeting.protocol?.tasks.length || 0), 0)}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Задачи в ожидании */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span>Ожидает</span>
                        <span className="text-neutral-500">
                          {meetings.reduce((acc, meeting) => 
                            acc + (meeting.protocol?.tasks.filter(t => t.status === 'pending').length || 0), 0)}
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full w-[45%]"></div>
                      </div>
                    </div>
                    
                    {/* Задачи в работе */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span>В работе</span>
                        <span className="text-neutral-500">
                          {meetings.reduce((acc, meeting) => 
                            acc + (meeting.protocol?.tasks.filter(t => t.status === 'in_progress').length || 0), 0)}
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full w-[30%]"></div>
                      </div>
                    </div>
                    
                    {/* Выполненные задачи */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span>Выполнено</span>
                        <span className="text-neutral-500">
                          {meetings.reduce((acc, meeting) => 
                            acc + (meeting.protocol?.tasks.filter(t => t.status === 'completed').length || 0), 0)}
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full w-[25%]"></div>
                      </div>
                    </div>
                    
                    {/* Отмененные задачи */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span>Отменено</span>
                        <span className="text-neutral-500">
                          {meetings.reduce((acc, meeting) => 
                            acc + (meeting.protocol?.tasks.filter(t => t.status === 'cancelled').length || 0), 0)}
                        </span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full w-[5%]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Активность ведомств</CardTitle>
                <CardDescription>Встречи по министерствам</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-neutral-50 p-4 rounded-md">
                    <div className="text-sm text-neutral-500">Всего министерств</div>
                    <div className="text-3xl font-bold">{DEPARTMENTS.length}</div>
                  </div>
                  
                  <div className="space-y-3">
                    {DEPARTMENTS.map(dept => {
                      // Считаем встречи, где департамент был организатором или участником
                      const count = meetings.filter(m => 
                        m.organizer === dept.name || 
                        m.participants.includes(dept.name)
                      ).length;
                      
                      // Процент от общего числа встреч
                      const percentage = meetings.length > 0 ? Math.round((count / meetings.length) * 100) : 0;
                      
                      return (
                        <div key={dept.id} className="space-y-1">
                          <div className="flex justify-between items-center text-sm">
                            <span>{dept.name.replace('Министерство ', '')}</span>
                            <span className="text-neutral-500">{count}</span>
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
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Диалог для добавления задачи */}
      <Dialog open={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Добавление задачи</DialogTitle>
            <DialogDescription>
              Добавьте новую задачу к протоколу встречи
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="taskDescription" className="text-right">
                Описание
              </Label>
              <Textarea
                id="taskDescription"
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                className="col-span-3"
                placeholder="Введите описание задачи"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="taskAssignee" className="text-right">
                Ответственный
              </Label>
              <Input
                id="taskAssignee"
                value={newTask.assignee}
                onChange={(e) => setNewTask({...newTask, assignee: e.target.value})}
                className="col-span-3"
                placeholder="Укажите ответственного"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="taskDeadline" className="text-right">
                Срок
              </Label>
              <Input
                id="taskDeadline"
                type="date"
                value={newTask.deadline ? new Date(newTask.deadline).toISOString().slice(0, 10) : ""}
                onChange={(e) => setNewTask({...newTask, deadline: new Date(e.target.value)})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="taskStatus" className="text-right">
                Статус
              </Label>
              <Select 
                value={newTask.status}
                onValueChange={(value) => setNewTask({
                  ...newTask, 
                  status: value as MeetingTask['status']
                })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Ожидает</SelectItem>
                  <SelectItem value="in_progress">В работе</SelectItem>
                  <SelectItem value="completed">Выполнена</SelectItem>
                  <SelectItem value="cancelled">Отменена</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTaskDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddTask} disabled={addTaskMutation.isPending}>
              {addTaskMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Добавление...
                </>
              ) : "Добавить задачу"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог просмотра протокола */}
      <Dialog open={viewProtocolDialogOpen} onOpenChange={setViewProtocolDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>
              Протокол встречи
              {selectedMeeting?.blockchainHash && (
                <Badge className="ml-2 bg-green-100 text-green-800">В блокчейне</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedMeeting?.title} • {selectedMeeting?.date ? formatDate(selectedMeeting.date) : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {!selectedMeeting?.protocol ? (
              <div className="flex flex-col items-center justify-center h-40">
                <div className="h-6 w-6 border-t-2 border-primary-500 rounded-full animate-spin"></div>
                <span className="mt-3 text-neutral-500">Генерация протокола...</span>
                <p className="mt-2 text-xs text-neutral-400 text-center max-w-md">
                  RoAI анализирует содержание встречи и создает официальный протокол с решениями и задачами
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 mb-2">Участники:</h3>
                  <div className="flex flex-wrap gap-1">
                    {selectedMeeting.participants.map(participant => (
                      <Badge key={participant} variant="outline" className="mr-1">
                        {participant}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 mb-2">Резюме:</h3>
                  <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200 text-sm">
                    {selectedMeeting.protocol.summary}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 mb-2">Принятые решения:</h3>
                  <ul className="space-y-2">
                    {selectedMeeting.protocol.decisions.map((decision, index) => (
                      <li key={index} className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-primary-100 text-primary-800 mr-2 mt-0.5">
                          {index + 1}
                        </div>
                        <span className="text-sm">{decision}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-neutral-700">Задачи:</h3>
                    <Button variant="outline" size="sm" onClick={() => openAddTaskDialog(selectedMeeting)}>
                      Добавить задачу
                    </Button>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Описание</TableHead>
                          <TableHead>Ответственный</TableHead>
                          <TableHead>Срок</TableHead>
                          <TableHead>Статус</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedMeeting.protocol.tasks.map(task => (
                          <TableRow key={task.id}>
                            <TableCell>{task.description}</TableCell>
                            <TableCell>{task.assignee}</TableCell>
                            <TableCell>{formatDate(task.deadline)}</TableCell>
                            <TableCell>{renderTaskStatus(task.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                
                {selectedMeeting.blockchainHash && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-700 mb-2">Хэш в блокчейне:</h3>
                    <div className="p-3 bg-green-50 rounded-md border border-green-200 text-sm font-mono overflow-x-auto">
                      {selectedMeeting.blockchainHash}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            {selectedMeeting?.protocol && !selectedMeeting.blockchainHash && (
              <Button onClick={() => saveToBlockchain(selectedMeeting.id)}>
                Сохранить в блокчейне
              </Button>
            )}
            
            {selectedMeeting?.protocol && (
              <Button variant="outline" onClick={() => downloadProtocol(selectedMeeting)}>
                <Download className="h-4 w-4 mr-2" />
                Скачать протокол
              </Button>
            )}
            
            <Button variant="outline" onClick={() => setViewProtocolDialogOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Meetings;