import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Activity, SystemStatus, Task, BlockchainRecord, User } from "@/lib/types";
import { 
  AlertCircle, 
  BarChart2, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Database, 
  File, 
  Users, 
  Bot, 
  BrainCircuit,
  CheckCircle,
  FileText,
  Cpu,
  Zap,
  AlertTriangle,
  Server,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import StatsCards from "@/components/dashboard/StatsCards";
import TasksList from "@/components/dashboard/TasksList";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import ChatInterface from "@/components/ai/ChatInterface";
import BlockchainRecords from "@/components/blockchain/BlockchainRecords";
import SystemStatusCard from "@/components/dashboard/SystemStatus";

// Типы LLM мониторинга
interface ServiceStatus {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'down';
  lastUpdated: string;
  details?: {
    queueLength?: number;
    gpuUtilization?: number;
    avgResponseTime?: number;
    requestsPerMinute?: number;
    latestError?: string;
  };
}

interface ModelUsage {
  model: string;
  tokensUsed: number;
  cost: number;
  requestCount: number;
  avgResponseTime: number;
}

const DashboardAnalytics = () => {
  // Current user placeholder - in a real app this would come from auth context
  const currentUser: User = {
    id: 1,
    username: "admin",
    fullName: "Айнур Бекова",
    department: "Департамент цифровизации",
    role: "admin",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&h=256&q=80"
  };

  // Настройка вкладок и UI состояний
  const [activeTab, setActiveTab] = useState<"dashboard" | "analytics" | "llm-monitoring">("dashboard");
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiInsightText, setAiInsightText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Fetch tasks
  const { data: tasksData, isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  // Fetch activities
  const { data: activitiesData, isLoading: isLoadingActivities } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
  });

  // Fetch system status
  const { data: systemStatuses, isLoading: isLoadingStatus } = useQuery<SystemStatus[]>({
    queryKey: ['/api/system/status'],
  });

  // Fetch blockchain records
  const { data: blockchainRecords, isLoading: isLoadingBlockchain } = useQuery<BlockchainRecord[]>({
    queryKey: ['/api/blockchain/records'],
  });

  // Fetch LLM статус
  const { data: llmStatus, isLoading: isLoadingLlmStatus } = useQuery<ServiceStatus[]>({
    queryKey: ['/api/system/llm-status'],
  });

  // Fetch LLM использование
  const { data: llmUsage, isLoading: isLoadingLlmUsage } = useQuery<ModelUsage[]>({
    queryKey: ['/api/system/llm-usage'],
  });

  const isLoading = isLoadingTasks || isLoadingActivities || isLoadingStatus || isLoadingBlockchain || isLoadingLlmStatus || isLoadingLlmUsage;
  
  // Calculate stats for dashboard
  const stats = [
    {
      title: "Активные задачи",
      value: isLoadingTasks ? "..." : tasksData?.filter(t => t.status !== "completed").length || 0,
      change: {
        value: "+2.5% с прошлой недели",
        isPositive: true
      },
      icon: <CheckCircle className="h-5 w-5" />
    },
    {
      title: "Обработано документов",
      value: isLoadingTasks ? "..." : 286,
      change: {
        value: "+12% с прошлого месяца",
        isPositive: true
      },
      icon: <FileText className="h-5 w-5" />
    },
    {
      title: "Записей в блокчейне",
      value: isLoadingActivities ? "..." : activitiesData?.filter(a => a.blockchainHash).length || 0,
      change: {
        value: "Последняя: 14 минут назад",
        isPositive: true
      },
      icon: <Database className="h-5 w-5" />
    }
  ];

  // Функция для запуска генерации инсайтов с помощью ИИ
  const generateAIInsights = async () => {
    if (!tasksData || !activitiesData || !blockchainRecords) return;
    
    setAiLoading(true);
    setShowAIDialog(true);
    
    try {
      // В реальном приложении здесь был бы запрос к API
      // Имитация обращения к API (в дальнейшем будет заменено на запрос к OpenAI)
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      await delay(1500);
      
      const taskStatuses = {
        pending: tasksData.filter(t => t.status === 'pending').length,
        in_progress: tasksData.filter(t => t.status === 'in_progress').length,
        completed: tasksData.filter(t => t.status === 'completed').length,
      };
      
      const recentActivities = activitiesData?.slice(0, 20) || [];
      const blockchainCount = blockchainRecords?.length || 0;
      
      // Пример аналитики, которую в будущем будет генерировать ИИ
      setAiInsightText(`
        ## Анализ производительности системы
        
        На основе анализа данных, можно выделить несколько ключевых трендов:
        
        1. **Статус задач**: В системе ${taskStatuses.pending} задач в ожидании, ${taskStatuses.in_progress} задач в работе и ${taskStatuses.completed} завершенных задач.
        
        2. **Записи в блокчейне**: Всего ${blockchainCount} записей, что свидетельствует о высоком уровне активности. Рекомендуется проверить настройки подключения к Moralis Testnet для тестовых интеграций.
        
        3. **Активность пользователей**: Наблюдается рост активности в последнем месяце, что говорит о высоком уровне использования системы.
        
        4. **Рекомендации**: 
           - Уделить внимание задачам со статусом "требует внимания"
           - Оптимизировать процесс обработки документов для повышения эффективности
           - Рассмотреть возможность масштабирования инфраструктуры в следующем квартале
      `);
    } catch (error) {
      setAiInsightText("Произошла ошибка при генерации аналитики. Пожалуйста, попробуйте снова позже.");
    } finally {
      setAiLoading(false);
    }
  };

  // Подготовка данных для графиков
  const prepareTaskStatusData = () => {
    if (!tasksData) return [];
    
    const statusCounts = {
      pending: 0,
      in_progress: 0,
      ready_for_review: 0,
      completed: 0,
      requires_attention: 0
    };
    
    tasksData.forEach(task => {
      statusCounts[task.status as keyof typeof statusCounts]++;
    });
    
    return [
      { name: "Ожидает", value: statusCounts.pending, color: "#e1dfdd" },
      { name: "В процессе", value: statusCounts.in_progress, color: "#ffb900" },
      { name: "Готово к проверке", value: statusCounts.ready_for_review, color: "#107c10" },
      { name: "Завершено", value: statusCounts.completed, color: "#0078d4" },
      { name: "Требует внимания", value: statusCounts.requires_attention, color: "#d13438" }
    ];
  };

  const prepareDailyActivityData = () => {
    if (!activitiesData) return [];
    
    const today = new Date();
    const daysToShow = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 365;
    
    const days: { [key: string]: { date: string, count: number } } = {};
    
    // Initialize all days with 0 count
    for (let i = 0; i < daysToShow; i++) {
      const date = subDays(today, i);
      const formattedDate = format(date, "yyyy-MM-dd");
      const displayDate = format(date, "d MMM", { locale: ru });
      days[formattedDate] = { date: displayDate, count: 0 };
    }
    
    // Count activities per day
    activitiesData.forEach(activity => {
      const formattedDate = format(new Date(activity.timestamp), "yyyy-MM-dd");
      if (days[formattedDate]) {
        days[formattedDate].count++;
      }
    });
    
    // Convert to array and sort by date
    return Object.values(days)
      .reverse()
      .slice(0, timeRange === "week" ? 7 : timeRange === "month" ? 30 : 365);
  };

  const prepareBlockchainRecordsData = () => {
    if (!blockchainRecords) return [];
    
    // Group records by type
    const recordByType: { [key: string]: number } = {};
    
    blockchainRecords.forEach(record => {
      const type = record.recordType;
      recordByType[type] = (recordByType[type] || 0) + 1;
    });
    
    // Convert to array
    return Object.entries(recordByType).map(([name, value]) => ({ name, value }));
  };

  const prepareMonthlyTrendsData = () => {
    if (!activitiesData || !blockchainRecords) return [];
    
    const monthsToShow = 12;
    const today = new Date();
    
    const months: { [key: string]: { month: string, activities: number, blockchain: number } } = {};
    
    // Initialize all months with 0 counts
    for (let i = 0; i < monthsToShow; i++) {
      const date = subMonths(today, i);
      const formattedMonth = format(date, "yyyy-MM");
      const displayMonth = format(date, "MMM", { locale: ru });
      months[formattedMonth] = { month: displayMonth, activities: 0, blockchain: 0 };
    }
    
    // Count activities per month
    activitiesData.forEach(activity => {
      const formattedMonth = format(new Date(activity.timestamp), "yyyy-MM");
      if (months[formattedMonth]) {
        months[formattedMonth].activities++;
      }
    });
    
    // Count blockchain records per month
    blockchainRecords.forEach(record => {
      const formattedMonth = format(new Date(record.createdAt), "yyyy-MM");
      if (months[formattedMonth]) {
        months[formattedMonth].blockchain++;
      }
    });
    
    // Convert to array and sort by date
    return Object.values(months).reverse();
  };

  // Графики данных для аналитики
  const taskStatusData = prepareTaskStatusData();
  const dailyActivityData = prepareDailyActivityData();
  const blockchainRecordsData = prepareBlockchainRecordsData();
  const monthlyTrendsData = prepareMonthlyTrendsData();

  // Цвета для графиков
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Вспомогательная функция для форматирования чисел
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}М`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}К`;
    }
    return num.toString();
  };

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              {activeTab === "dashboard" 
                ? "Панель управления" 
                : activeTab === "analytics" 
                  ? "Аналитика" 
                  : "Мониторинг LLM моделей"}
            </h1>
            <p className="mt-2 text-sm text-neutral-700">
              {activeTab === "dashboard" ? (
                <>Сегодня, {format(new Date(), "d MMMM yyyy", { locale: ru })} · Обновлено {format(new Date(), "HH:mm", { locale: ru })}</>
              ) : activeTab === "analytics" ? (
                <>Статистика и аналитические данные о работе системы</>
              ) : (
                <>Статус и использование LLM моделей и сервисов</>
              )}
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Tabs 
              value={activeTab} 
              onValueChange={(value) => setActiveTab(value as "dashboard" | "analytics" | "llm-monitoring")}
              className="w-[400px]"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dashboard">Дашборд</TabsTrigger>
                <TabsTrigger value="analytics">Аналитика</TabsTrigger>
                <TabsTrigger value="llm-monitoring">LLM Мониторинг</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Вкладка Дашборда */}
      {activeTab === "dashboard" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column with tasks and activities */}
          <div className="lg:col-span-2">
            {/* Stats cards */}
            <StatsCards stats={stats} isLoading={isLoading} />
            
            {/* Tasks list */}
            <TasksList limit={3} />
            
            {/* Activity feed */}
            <ActivityFeed limit={3} />
          </div>
          
          {/* Right column with chat, blockchain records, and system status */}
          <div className="space-y-6">
            {/* AI Assistant */}
            <ChatInterface currentUser={currentUser} />
            
            {/* Blockchain Records */}
            <BlockchainRecords limit={2} />
            
            {/* System Status */}
            <SystemStatusCard />
          </div>
        </div>
      )}

      {/* Вкладка Аналитики */}
      {activeTab === "analytics" && (
        <>
          {/* Панель управления временным диапазоном и кнопка ИИ-анализа */}
          <div className="flex justify-end items-center mb-6 gap-3">
            <Button 
              variant="outline"
              className="flex items-center space-x-2"
              onClick={generateAIInsights}
              disabled={aiLoading || isLoading}
            >
              <BrainCircuit className="h-4 w-4" />
              <span>Анализ с помощью ИИ</span>
            </Button>
            
            <Tabs 
              value={timeRange} 
              onValueChange={(value) => setTimeRange(value as "week" | "month" | "year")}
              className="w-[300px]"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="week">Неделя</TabsTrigger>
                <TabsTrigger value="month">Месяц</TabsTrigger>
                <TabsTrigger value="year">Год</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Диалог для ИИ инсайтов */}
          <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Bot className="h-5 w-5 mr-2" />
                  Анализ данных с помощью ИИ
                </DialogTitle>
                <DialogDescription>
                  Аналитические выводы и рекомендации на основе данных системы
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mb-4"></div>
                    <p className="text-neutral-600">Анализируем данные системы...</p>
                  </div>
                ) : (
                  <div className="prose max-w-none">
                    <div dangerouslySetInnerHTML={{ 
                      __html: aiInsightText ? aiInsightText.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') : 'Нет данных для отображения' 
                    }} />
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Карточки статистики */}
          <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart2 className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-neutral-500">Активные задачи</p>
                    <p className="text-3xl font-semibold text-neutral-900">
                      {isLoading ? "..." : tasksData?.filter(t => t.status !== "completed").length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-neutral-500">Активности за {timeRange === "week" ? "неделю" : timeRange === "month" ? "месяц" : "год"}</p>
                    <p className="text-3xl font-semibold text-neutral-900">
                      {isLoading ? "..." : dailyActivityData.reduce((sum, day) => sum + day.count, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <File className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-neutral-500">Обработано документов</p>
                    <p className="text-3xl font-semibold text-neutral-900">
                      {isLoading ? "..." : tasksData?.reduce((sum, task) => sum + (task.documentCount || 0), 0) || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Database className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-neutral-500">Записей в блокчейне</p>
                    <p className="text-3xl font-semibold text-neutral-900">
                      {isLoading ? "..." : blockchainRecords?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Графики */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Task status distribution */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2" />
                  Распределение задач по статусам
                </CardTitle>
                <CardDescription>Количество задач в каждом статусе</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-80">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                ) : taskStatusData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-80">
                    <AlertCircle className="h-12 w-12 text-neutral-300 mb-4" />
                    <p className="text-neutral-500">Нет данных для отображения</p>
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={taskStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {taskStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value) => [`${value} задач`, 'Количество']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Daily activity */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart2 className="h-5 w-5 mr-2" />
                  Активность системы
                </CardTitle>
                <CardDescription>
                  Количество действий по дням за {timeRange === "week" ? "неделю" : timeRange === "month" ? "месяц" : "год"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-80">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                ) : dailyActivityData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-80">
                    <AlertCircle className="h-12 w-12 text-neutral-300 mb-4" />
                    <p className="text-neutral-500">Нет данных для отображения</p>
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dailyActivityData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <RechartsTooltip formatter={(value) => [`${value} активности`, 'Количество']} />
                        <Bar dataKey="count" fill="#0078d4" name="Активности" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Blockchain distribution */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Распределение записей блокчейна
                </CardTitle>
                <CardDescription>По типам записей</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-80">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                ) : blockchainRecordsData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-80">
                    <AlertCircle className="h-12 w-12 text-neutral-300 mb-4" />
                    <p className="text-neutral-500">Нет данных для отображения</p>
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          dataKey="value"
                          isAnimationActive={false}
                          data={blockchainRecordsData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {blockchainRecordsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly trends */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Месячные тренды
                </CardTitle>
                <CardDescription>Активности и записи блокчейна по месяцам</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-80">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                ) : monthlyTrendsData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-80">
                    <AlertCircle className="h-12 w-12 text-neutral-300 mb-4" />
                    <p className="text-neutral-500">Нет данных для отображения</p>
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={monthlyTrendsData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Line type="monotone" dataKey="activities" stroke="#0078d4" name="Активности" />
                        <Line type="monotone" dataKey="blockchain" stroke="#107c10" name="Записи блокчейна" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Вкладка LLM Мониторинга */}
      {activeTab === "llm-monitoring" && (
        <>
          {/* LLM Services Status Section */}
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  Статус LLM сервисов
                </CardTitle>
                <CardDescription>
                  Текущий статус и производительность сервисов LLM моделей
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLlmStatus ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                ) : !llmStatus || llmStatus.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <AlertCircle className="h-12 w-12 text-neutral-300 mb-4" />
                    <p className="text-neutral-500">Нет данных для отображения</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {llmStatus.map((service, index) => (
                      <Card key={index} className="overflow-hidden border-t-4" 
                        style={{
                          borderTopColor: 
                            service.status === 'healthy' ? '#10B981' : 
                            service.status === 'degraded' ? '#F59E0B' : '#EF4444'
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-medium">{service.serviceName}</h3>
                            <Badge variant={
                              service.status === 'healthy' ? 'default' : 
                              service.status === 'degraded' ? 'outline' : 'destructive'
                            }>
                              {service.status === 'healthy' ? 'Работает' : 
                               service.status === 'degraded' ? 'Замедлена' : 'Недоступна'}
                            </Badge>
                          </div>
                          
                          <div className="space-y-3 text-sm">
                            {service.details?.queueLength !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-neutral-500">Очередь запросов:</span>
                                <span className="font-medium">{service.details.queueLength}</span>
                              </div>
                            )}
                            
                            {service.details?.avgResponseTime !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-neutral-500">Ср. время ответа:</span>
                                <span className="font-medium">{service.details.avgResponseTime.toFixed(2)} сек</span>
                              </div>
                            )}
                            
                            {service.details?.requestsPerMinute !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-neutral-500">Запросов/мин:</span>
                                <span className="font-medium">{service.details.requestsPerMinute.toFixed(1)}</span>
                              </div>
                            )}
                            
                            {service.details?.gpuUtilization !== undefined && (
                              <div className="flex flex-col gap-1">
                                <div className="flex justify-between">
                                  <span className="text-neutral-500">Загрузка GPU:</span>
                                  <span className="font-medium">{service.details.gpuUtilization}%</span>
                                </div>
                                <Progress value={service.details.gpuUtilization} className="h-2" />
                              </div>
                            )}
                            
                            {service.details?.latestError && (
                              <div className="mt-3 text-xs p-2 bg-red-50 text-red-700 rounded border border-red-200">
                                <span className="flex items-center gap-1">
                                  <AlertTriangle size={12} />
                                  {service.details.latestError}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-4 text-xs text-right text-neutral-500">
                            Обновлено: {new Date(service.lastUpdated).toLocaleTimeString()}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* LLM Usage Stats */}
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Cpu className="h-5 w-5 mr-2" />
                  Использование LLM моделей
                </CardTitle>
                <CardDescription>
                  Статистика использования, стоимость и производительность
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLlmUsage ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                ) : !llmUsage || llmUsage.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <AlertCircle className="h-12 w-12 text-neutral-300 mb-4" />
                    <p className="text-neutral-500">Нет данных для отображения</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-neutral-700">
                      <thead className="text-xs uppercase bg-neutral-50">
                        <tr>
                          <th className="px-4 py-3">Модель</th>
                          <th className="px-4 py-3">Запросы</th>
                          <th className="px-4 py-3">Токенов</th>
                          <th className="px-4 py-3">Стоимость</th>
                          <th className="px-4 py-3">Ср. время ответа</th>
                          <th className="px-4 py-3">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {llmUsage.map((model, index) => (
                          <tr key={index} className="border-b hover:bg-neutral-50">
                            <td className="px-4 py-3 font-medium">{model.model}</td>
                            <td className="px-4 py-3">{model.requestCount.toLocaleString()}</td>
                            <td className="px-4 py-3">{formatNumber(model.tokensUsed)}</td>
                            <td className="px-4 py-3">${model.cost.toFixed(2)}</td>
                            <td className="px-4 py-3">{model.avgResponseTime.toFixed(2)} сек</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Тест
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  История
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-medium text-neutral-900 bg-neutral-100">
                          <td className="px-4 py-3">Итого</td>
                          <td className="px-4 py-3">{llmUsage.reduce((sum, model) => sum + model.requestCount, 0).toLocaleString()}</td>
                          <td className="px-4 py-3">{formatNumber(llmUsage.reduce((sum, model) => sum + model.tokensUsed, 0))}</td>
                          <td className="px-4 py-3">${llmUsage.reduce((sum, model) => sum + model.cost, 0).toFixed(2)}</td>
                          <td className="px-4 py-3">-</td>
                          <td className="px-4 py-3">-</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* LLM Usage Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart2 className="h-5 w-5 mr-2" />
                  Использование по моделям
                </CardTitle>
                <CardDescription>
                  Распределение запросов и токенов по моделям
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLlmUsage ? (
                  <div className="flex items-center justify-center h-80">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                ) : !llmUsage || llmUsage.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-80">
                    <AlertCircle className="h-12 w-12 text-neutral-300 mb-4" />
                    <p className="text-neutral-500">Нет данных для отображения</p>
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={llmUsage}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="model" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                        <RechartsTooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="requestCount" name="Запросы" fill="#8884d8" />
                        <Bar yAxisId="right" dataKey="tokensUsed" name="Токены (тыс.)" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2" />
                  Распределение стоимости
                </CardTitle>
                <CardDescription>
                  Стоимость использования по моделям
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLlmUsage ? (
                  <div className="flex items-center justify-center h-80">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                ) : !llmUsage || llmUsage.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-80">
                    <AlertCircle className="h-12 w-12 text-neutral-300 mb-4" />
                    <p className="text-neutral-500">Нет данных для отображения</p>
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={llmUsage}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="cost"
                          nameKey="model"
                          label={({ model, percent }) => `${model}: ${percent !== undefined ? (percent * 100).toFixed(0) : 0}%`}
                        >
                          {llmUsage.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: any) => [`$${typeof value === 'number' ? value.toFixed(2) : value}`, 'Стоимость']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
};

export default DashboardAnalytics;