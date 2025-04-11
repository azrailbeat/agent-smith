import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CheckCircle, AlertCircle, Users, FileText, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsCards from "@/components/dashboard/StatsCards";
import TasksList from "@/components/dashboard/TasksList";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import ChatInterface from "@/components/ai/ChatInterface";
import BlockchainRecords from "@/components/blockchain/BlockchainRecords";
import SystemStatusCard from "@/components/dashboard/SystemStatus";
import { StatCard, Task, Activity, User } from "@/lib/types";

const Dashboard = () => {
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
  const { data: activitiesData, isLoading: isLoadingActivities } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
  });

  // Calculate stats
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
    }
  ];

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Панель управления</h1>
            <p className="mt-2 text-sm text-neutral-700">
              Сегодня, {format(new Date(), "d MMMM yyyy", { locale: ru })} · Обновлено {format(new Date(), "HH:mm", { locale: ru })}
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button className="inline-flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Новая задача
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column with tasks and activities */}
        <div className="lg:col-span-2">
          {/* Stats cards */}
          <StatsCards stats={stats} isLoading={isLoadingTasks || isLoadingActivities} />
          
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
    </>
  );
};

export default Dashboard;
