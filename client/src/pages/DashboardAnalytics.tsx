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
  Server
} from "lucide-react";
import { LLMMonitoringPanel } from "@/components/analytics/LLMMonitoringPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import StatsCards from "@/components/dashboard/StatsCards";
import TasksList from "@/components/dashboard/TasksList";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import ChatInterface from "@/components/ai/ChatInterface";
import BlockchainRecords from "@/components/blockchain/BlockchainRecords";
import SystemStatusCard from "@/components/dashboard/SystemStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { StatCard, Task, Activity as ActivityType, User } from "@/lib/types";

export default function DashboardAnalytics() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [refreshTimestamp, setRefreshTimestamp] = useState(new Date());
  
  // Current user placeholder - in a real app this would come from auth context
  const currentUser: User = {
    id: 1,
    username: "admin",
    fullName: "Айнур Бекова",
    department: "Департамент цифровизации",
    role: "admin",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&h=256&q=80"
  };

  // Fetch tasks
  const { data: tasksData, isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  // Fetch activities
  const { data: activitiesData, isLoading: isLoadingActivities } = useQuery<ActivityType[]>({
    queryKey: ['/api/activities'],
  });

  // Stats cards
  const stats: StatCard[] = [
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
    },
    {
      title: "Активных агентов ИИ",
      value: 7,
      change: {
        value: "+2 за последнюю неделю",
        isPositive: true
      },
      icon: <Server className="h-5 w-5" />
    }
  ];
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshTimestamp(new Date());
  };
  
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Аналитическая панель</h1>
          <p className="text-slate-500 mt-1">
            Сегодня, {format(new Date(), "d MMMM yyyy", { locale: ru })} · Обновлено {format(refreshTimestamp, "HH:mm", { locale: ru })}
          </p>
        </div>
        <Button 
          variant="outline" 
          className="mt-4 md:mt-0"
          onClick={handleRefresh}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-white border w-full flex justify-start overflow-x-auto hide-scrollbar p-1 mb-6">
          <TabsTrigger
            value="dashboard"
            className="data-[state=active]:bg-slate-100 data-[state=active]:shadow-none rounded-md py-2 px-3 text-slate-700 text-base"
          >
            Дашборд
          </TabsTrigger>
          <TabsTrigger
            value="llm"
            className="data-[state=active]:bg-slate-100 data-[state=active]:shadow-none rounded-md py-2 px-3 text-slate-700 text-base"
          >
            LLM Аналитика
          </TabsTrigger>
          <TabsTrigger
            value="server"
            className="data-[state=active]:bg-slate-100 data-[state=active]:shadow-none rounded-md py-2 px-3 text-slate-700 text-base"
          >
            Состояние серверов
          </TabsTrigger>
          <TabsTrigger
            value="database"
            className="data-[state=active]:bg-slate-100 data-[state=active]:shadow-none rounded-md py-2 px-3 text-slate-700 text-base"
          >
            База данных
          </TabsTrigger>
          <TabsTrigger
            value="blockchain"
            className="data-[state=active]:bg-slate-100 data-[state=active]:shadow-none rounded-md py-2 px-3 text-slate-700 text-base"
          >
            Блокчейн
          </TabsTrigger>
        </TabsList>

        {/* Дашборд */}
        <TabsContent value="dashboard" className="space-y-8">
          {/* Общая статистика */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Card key={index} className="bg-white overflow-hidden shadow">
                <CardContent className="px-4 py-5 sm:p-6">
                  <dl>
                    <dt className="text-sm font-medium text-neutral-500 truncate">
                      {stat.title}
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold text-neutral-900">
                      {stat.value}
                    </dd>
                    {stat.change && (
                      <dd className="mt-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${stat.change.isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {stat.change.value}
                        </span>
                      </dd>
                    )}
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Дашборд сетка */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Левая колонка с задачами и активностями */}
            <div className="lg:col-span-2">
              {/* Список задач */}
              <TasksList limit={3} />
              
              {/* Лента активности */}
              <ActivityFeed limit={3} />
            </div>
            
            {/* Правая колонка с чатом, блокчейн записями и статусом системы */}
            <div className="space-y-6">
              {/* ИИ Ассистент */}
              <ChatInterface currentUser={currentUser} />
              
              {/* Blockchain Records */}
              <BlockchainRecords limit={2} />
              
              {/* Статус системы */}
              <SystemStatusCard />
            </div>
          </div>
        </TabsContent>

        {/* LLM Аналитика */}
        <TabsContent value="llm" className="space-y-8">
          <LLMMonitoringPanel />
        </TabsContent>
        
        {/* Состояние серверов */}
        <TabsContent value="server" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Состояние главного сервера</CardTitle>
                <CardDescription>
                  Мониторинг производительности сервера
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center text-slate-500">
                    <p>Раздел в разработке</p>
                    <p className="text-sm">Будет доступен в следующем обновлении</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Используемые ресурсы</CardTitle>
                <CardDescription>
                  Мониторинг использования ресурсов
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center text-slate-500">
                    <p>Раздел в разработке</p>
                    <p className="text-sm">Будет доступен в следующем обновлении</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* База данных */}
        <TabsContent value="database" className="space-y-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Мониторинг базы данных</CardTitle>
              <CardDescription>
                Статистика и производительность базы данных
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
        
        {/* Блокчейн */}
        <TabsContent value="blockchain" className="space-y-8">
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