import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  CheckCircle, 
  AlertCircle, 
  Users, 
  FileText, 
  Database, 
  BarChart4, 
  RefreshCw, 
  Activity,
  Server,
  CalendarIcon,
  Clock,
  FolderIcon,
  ListChecks,
  ArrowRight,
  SearchIcon,
  Settings,
  TrendingUp,
  Bot,
  LineChart
} from "lucide-react";
import { LLMMonitoringPanel } from "@/components/analytics/LLMMonitoringPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SystemSettings from './SystemSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatsCounter } from "@/components/analytics/StatsCounter";
import { SystemActivityChart } from "@/components/analytics/SystemActivityChart";
import { TrendChart } from "@/components/analytics/TrendChart";
import { AIAnalysisPanel } from "@/components/analytics/AIAnalysisPanel";
import { TaskDistributionChart } from "@/components/analytics/TaskDistributionChart";
import RecentActivities from "@/components/dashboard/RecentActivities";
import BlockchainRecordsList from "@/components/dashboard/BlockchainRecordsList";
import AgentChatInterface from "@/components/dashboard/AgentChatInterface";
import { 
  NotificationCenter, 
  ContextualNotificationsContainer
} from "@/components/notifications";

// Import the notification types
import { 
  INotification,
  NotificationPriority,
  NotificationType
} from "@/components/notifications/shared-types";

// Типы уже импортированы из NotificationCenter
import { StatCard, Task, Activity as ActivityType, User } from "@/lib/types";

export default function DashboardAnalytics() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [refreshTimestamp, setRefreshTimestamp] = useState(new Date());
  const [timeRangeFilter, setTimeRangeFilter] = useState("month");
  const [activeContextualNotifications, setActiveContextualNotifications] = useState<INotification[]>([]);
  
  // Fetch tasks
  const { data: tasksData, isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  // Fetch activities
  const { data: activitiesData, isLoading: isLoadingActivities } = useQuery<ActivityType[]>({
    queryKey: ['/api/activities'],
  });

  // Данные для счетчиков статистики
  const counterStats = [
    {
      title: "Активные задачи",
      value: 0,
      change: "-2.5% с прошлой недели",
      icon: <FileText className="h-5 w-5 text-primary" />,
      color: "#3e63dd"
    },
    {
      title: "Обработано документов",
      value: 286,
      change: "+25% с прошлого месяца",
      icon: <FolderIcon className="h-5 w-5 text-green-600" />,
      color: "#16a34a"
    },
    {
      title: "Записей в блокчейне",
      value: 0,
      change: "Последняя: 14 минут назад",
      icon: <Database className="h-5 w-5 text-amber-600" />,
      color: "#d97706"
    }
  ];

  // Данные для диаграммы распределения задач по статусам
  const taskDistributionData = [
    { name: 'Категория 1', 'Создано': 3, 'В процессе': 2, 'Готово к проверке': 4, 'Завершено': 5, 'Требует внимания': 1 }
  ];

  // Данные для графика активности системы
  const systemActivityData = Array.from({ length: 12 }, (_, i) => {
    const day = 18 - i;
    return {
      date: `${day} апр.`,
      value: Math.floor(Math.random() * 9) + 1
    };
  }).reverse();

  // Данные для графика трендов активности
  const trendData = [
    { month: "июнь", activities: 0, tasks: 0 },
    { month: "июль", activities: 0, tasks: 0 },
    { month: "авг", activities: 0, tasks: 0 },
    { month: "сент", activities: 0, tasks: 0 },
    { month: "окт", activities: 0, tasks: 0 },
    { month: "нояб", activities: 0, tasks: 0 },
    { month: "дек", activities: 0, tasks: 0 },
    { month: "янв", activities: 0, tasks: 0 },
    { month: "фев", activities: 0, tasks: 0 },
    { month: "март", activities: 0, tasks: 0 },
    { month: "апр", activities: 0, tasks: 0 },
    { month: "май", activities: 10, tasks: 0 }
  ];

  // Данные для недавних активностей
  const recentActivities = [
    { id: 1, type: 'blockchain', title: 'Просмотр списка записей блокчейн (последние 10)', timeAgo: '1 минуту назад' },
    { id: 2, type: 'activity', title: 'Просмотр журнала активности (10 записей)', timeAgo: '1 минуту назад' },
    { id: 3, type: 'activity', title: 'Просмотр журнала активности (10 записей)', timeAgo: '1 минуту назад' }
  ];

  // Данные для записей в блокчейне
  const blockchainRecords = [
    { id: 1, entity: 'citizen_request', entityId: '39', hash: '0x1234...5678', timeAgo: '4 минуты назад' },
    { id: 2, entity: 'citizen_request', entityId: '38', hash: '0x8765...4321', timeAgo: '4 минуты назад' }
  ];
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshTimestamp(new Date());
  };

  // Обработчик запроса к ИИ для анализа
  const handleAIAnalysis = async (type: string, query: string) => {
    // В реальном приложении здесь был бы API-запрос к OpenAI или другой модели
    console.log(`Запрос к ИИ: ${type}, ${query}`);
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve(`Анализ ${type} по запросу: "${query}"\n\n` +
          "Основываясь на данных за последние 30 дней, система показывает стабильный рост активности на 15%. " +
          "Наблюдается увеличение количества обработанных документов и успешно завершенных задач. " +
          "Рекомендуется: 1) Обратить внимание на категорию задач 'Жалобы на госорган', где время ответа превышает средние показатели; " +
          "2) Активировать дополнительных агентов ИИ в часы пиковой нагрузки (14:00-17:00); " +
          "3) Рассмотреть возможность автоматизации рутинных процессов в региональных отделениях."
        );
      }, 1500);
    });
  };
  
  // Добавление демонстрационного уведомления
  const addDemoNotification = () => {
    const demoNotification: INotification = {
      id: Date.now().toString(),
      title: 'Истекает срок выполнения задачи',
      message: 'Задача "Анализ данных по обращениям граждан" требует выполнения в течение 2 часов.',
      timestamp: new Date(),
      read: false,
      priority: NotificationPriority.HIGH,
      type: NotificationType.TASK,
      entityId: '5432',
      entityType: 'task',
      actionUrl: '/tasks/5432'
    };
    
    setActiveContextualNotifications(prev => [demoNotification, ...prev]);
    
    // Автоматическое удаление уведомления через 6 секунд
    setTimeout(() => {
      setActiveContextualNotifications(prev => 
        prev.filter(n => n.id !== demoNotification.id)
      );
    }, 6000);
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Контекстные уведомления */}
      <ContextualNotificationsContainer 
        notifications={activeContextualNotifications}
        onClose={(id) => {
          setActiveContextualNotifications(prev => 
            prev.filter(n => n.id !== id)
          );
        }}
        position="top-right"
      />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Аналитика</h1>
          <p className="text-slate-500 mt-1">
            Статистика и аналитические данные о работе системы
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <div className="flex gap-2 items-center">
            <NotificationCenter />
            <Button 
              variant="outline" 
              className="flex items-center gap-1"
              onClick={addDemoNotification}
            >
              <Bot className="h-4 w-4" />
              Анализ с помощью ИИ
            </Button>
            <Select
              value={timeRangeFilter}
              onValueChange={setTimeRangeFilter}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Период" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Неделя</SelectItem>
                <SelectItem value="month">Месяц</SelectItem>
                <SelectItem value="year">Год</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Карточки со статистикой */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card className="flex items-stretch p-4">
          <div className="flex flex-col justify-center flex-1">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-slate-600 mr-2" />
              <h3 className="text-sm font-medium">Активные задачи</h3>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-semibold">0</p>
              <p className="text-xs text-muted-foreground mt-1">-2.5% с прошлой недели</p>
            </div>
          </div>
        </Card>
        
        <Card className="flex items-stretch p-4">
          <div className="flex flex-col justify-center flex-1">
            <div className="flex items-center">
              <Activity className="h-5 w-5 text-slate-600 mr-2" />
              <h3 className="text-sm font-medium">Активность за месяц</h3>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-semibold text-blue-600">10</p>
            </div>
          </div>
        </Card>
        
        <Card className="flex items-stretch p-4">
          <div className="flex flex-col justify-center flex-1">
            <div className="flex items-center">
              <FolderIcon className="h-5 w-5 text-slate-600 mr-2" />
              <h3 className="text-sm font-medium">Обработано документов</h3>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-semibold">0</p>
            </div>
          </div>
        </Card>
        
        <Card className="flex items-stretch p-4">
          <div className="flex flex-col justify-center flex-1">
            <div className="flex items-center">
              <Database className="h-5 w-5 text-slate-600 mr-2" />
              <h3 className="text-sm font-medium">Записей в блокчейне</h3>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-semibold text-purple-600">10</p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Графики и диаграммы */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <TaskDistributionChart 
          data={taskDistributionData}
        />
        
        <SystemActivityChart 
          data={systemActivityData}
          title="Активность системы"
          subtitle="Количество действий по дням за месяц"
        />
      </div>
      
      {/* График трендов активности */}
      <div className="mb-6">
        <TrendChart 
          data={trendData}
          title="Тренды активности"
          subtitle="Сравнение активности системы и записей в блокчейн по месяцам"
        />
      </div>
      
      {/* Нижняя секция с агентом, активностями и блокчейном */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Панель управления с активностями */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Активные задачи</CardTitle>
              <p className="text-sm text-muted-foreground">Нет активных задач</p>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-10">
              <div className="text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium mb-1">У вас нет активных задач в данный момент</p>
              </div>
            </CardContent>
          </Card>
          
          <RecentActivities activities={recentActivities} />
        </div>
        
        {/* Правая колонка */}
        <div className="space-y-6">
          {/* Агент и чат */}
          <AgentChatInterface 
            agentName="Agent Smith" 
            agentStatus="в сети"
          />
          
          {/* Блокчейн записи */}
          <BlockchainRecordsList records={blockchainRecords} />
        </div>
      </div>
      
      {/* Табы в нижней части страницы */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border w-full flex justify-start overflow-x-auto hide-scrollbar p-1">
          <TabsTrigger
            value="dashboard"
            className="data-[state=active]:bg-slate-100 data-[state=active]:shadow-none rounded-md py-2 px-3 text-slate-700 text-sm"
          >
            Общая аналитика
          </TabsTrigger>
          <TabsTrigger
            value="llm"
            className="data-[state=active]:bg-slate-100 data-[state=active]:shadow-none rounded-md py-2 px-3 text-slate-700 text-sm"
          >
            LLM Мониторинг
          </TabsTrigger>
          <TabsTrigger
            value="blockchain"
            className="data-[state=active]:bg-slate-100 data-[state=active]:shadow-none rounded-md py-2 px-3 text-slate-700 text-sm"
          >
            Блокчейн аналитика
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <AIAnalysisPanel onAnalyze={handleAIAnalysis} />
        </TabsContent>

        <TabsContent value="llm" className="space-y-6">
          <LLMMonitoringPanel />
        </TabsContent>
        
        <TabsContent value="blockchain" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Мониторинг блокчейна</CardTitle>
              <CardDescription>
                Статистика и производительность блокчейн-транзакций
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <p>Раздел в разработке</p>
                  <p className="text-sm">Будет доступен в следующем обновлении</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}