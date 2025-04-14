import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Activity, SystemStatus, Task, BlockchainRecord } from "@/lib/types";
import { AlertCircle, BarChart2, PieChart as PieChartIcon, TrendingUp, Database, File, Users, Bot, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Analytics = () => {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiInsightText, setAiInsightText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Fetch system status
  const { data: systemStatuses, isLoading: isLoadingStatus } = useQuery<SystemStatus[]>({
    queryKey: ['/api/system/status'],
  });

  // Fetch tasks
  const { data: tasks, isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  // Fetch activities
  const { data: activities, isLoading: isLoadingActivities } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
  });

  // Fetch blockchain records
  const { data: blockchainRecords, isLoading: isLoadingBlockchain } = useQuery<BlockchainRecord[]>({
    queryKey: ['/api/blockchain/records'],
  });

  const isLoading = isLoadingStatus || isLoadingTasks || isLoadingActivities || isLoadingBlockchain;
  
  // Функция для запуска генерации инсайтов с помощью ИИ
  const generateAIInsights = async () => {
    if (!tasks || !activities || !blockchainRecords) return;
    
    setAiLoading(true);
    setShowAIDialog(true);
    
    try {
      // В реальном приложении здесь был бы запрос к API
      // Имитация обращения к API (в дальнейшем будет заменено на запрос к OpenAI)
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      await delay(1500);
      
      const taskStatuses = {
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
      };
      
      const recentActivities = activities.slice(0, 20);
      const blockchainCount = blockchainRecords.length;
      
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

  // Prepare data for charts
  const prepareTaskStatusData = () => {
    if (!tasks) return [];
    
    const statusCounts = {
      pending: 0,
      in_progress: 0,
      ready_for_review: 0,
      completed: 0,
      requires_attention: 0
    };
    
    tasks.forEach(task => {
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
    if (!activities) return [];
    
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
    activities.forEach(activity => {
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
    if (!activities || !blockchainRecords) return [];
    
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
    activities.forEach(activity => {
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

  const taskStatusData = prepareTaskStatusData();
  const dailyActivityData = prepareDailyActivityData();
  const blockchainRecordsData = prepareBlockchainRecordsData();
  const monthlyTrendsData = prepareMonthlyTrendsData();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Аналитика</h1>
            <p className="mt-2 text-sm text-neutral-700">
              Статистика и аналитические данные о работе системы
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3 items-center">
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
              className="w-[400px]"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="week">Неделя</TabsTrigger>
                <TabsTrigger value="month">Месяц</TabsTrigger>
                <TabsTrigger value="year">Год</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
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

      {/* Statistics overview */}
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
                  {isLoading ? "..." : tasks?.filter(t => t.status !== "completed").length || 0}
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
                  {isLoading ? "..." : tasks?.reduce((sum, task) => sum + (task.documentCount || 0), 0) || 0}
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

      {/* Charts */}
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
                    <Tooltip formatter={(value) => [`${value} задач`, 'Количество']} />
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
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value) => [`${value} действий`, 'Количество']} />
                    <Bar dataKey="count" name="Действия" fill="#0078d4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly trends */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Тренды активности
            </CardTitle>
            <CardDescription>
              Сравнение активности системы и записей в блокчейне по месяцам
            </CardDescription>
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
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="activities" name="Активности" stroke="#0078d4" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="blockchain" name="Записи в блокчейне" stroke="#107c10" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Blockchain records by type */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Записи в блокчейне по типам
            </CardTitle>
            <CardDescription>Распределение записей по типам</CardDescription>
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
                      data={blockchainRecordsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {blockchainRecordsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} записей`, 'Количество']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* System health */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Здоровье системы
            </CardTitle>
            <CardDescription>Текущий статус всех компонентов</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-80">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : !systemStatuses || systemStatuses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80">
                <AlertCircle className="h-12 w-12 text-neutral-300 mb-4" />
                <p className="text-neutral-500">Нет данных для отображения</p>
              </div>
            ) : (
              <div className="space-y-6 h-80 pt-4">
                {systemStatuses.map((status) => (
                  <div key={status.id}>
                    <div className="flex justify-between mb-2">
                      <div className="flex items-center">
                        <div className={`h-3 w-3 rounded-full mr-2 ${
                          status.status > 90 ? 'bg-green-500' : 
                          status.status > 70 ? 'bg-yellow-500' : 
                          'bg-red-500'
                        }`}></div>
                        <p className="text-sm font-medium text-neutral-800">{status.serviceName}</p>
                      </div>
                      <p className="text-sm text-neutral-500">{status.status}%</p>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          status.status > 90 ? 'bg-green-500' : 
                          status.status > 70 ? 'bg-yellow-500' : 
                          'bg-red-500'
                        }`} 
                        style={{ width: `${status.status}%` }}
                      ></div>
                    </div>
                    {status.details && (
                      <p className="text-xs text-neutral-500 mt-1">{status.details}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Analytics;
