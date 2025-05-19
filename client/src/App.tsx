import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import HistoryPage from "@/pages/History";
import Analytics from "@/pages/Analytics";
import DashboardAnalytics from "@/pages/DashboardAnalytics";
import Translate from "@/pages/Translate";
import CitizenRequests from "@/pages/CitizenRequestsKanban2";
import Meetings from "@/pages/Meetings";
import SystemSettings from "@/pages/SystemSettings";
import NotFound from "@/pages/not-found";
import AboutSystem from "@/pages/AboutSystem";
import OrgStructureManagement2 from "@/pages/OrgStructureManagement2";
import Documents from "@/pages/Documents";
import AIAgents from "@/pages/AIAgents";
import DAOVoting from "@/pages/DAOVoting";
import UserProfile from "@/pages/UserProfile";
import KnowledgeManagement from "@/pages/KnowledgeManagement";
import EmbedForm from "@/pages/EmbedForm";
import Users from "@/pages/Users";
import UnifiedCompanyKnowledge from "@/pages/UnifiedCompanyKnowledge";
import RbacManagement from "@/pages/RbacManagement";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

function Router() {
  return (
    <Switch>
      {/* Общедоступные маршруты */}
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/about" component={AboutSystem} />
      <Route path="/embed" component={EmbedForm} />
      
      {/* Защищенные маршруты - требуют аутентификации */}
      <Route path="/tasks">
        {() => (
          <ProtectedRoute>
            <Tasks />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/history">
        {() => (
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/analytics">
        {() => (
          <ProtectedRoute>
            <DashboardAnalytics />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/translate">
        {() => (
          <ProtectedRoute>
            <Translate />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/citizen-requests">
        {() => (
          <ProtectedRoute>
            <CitizenRequests />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/meetings">
        {() => (
          <ProtectedRoute>
            <Meetings />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/documents">
        {() => (
          <ProtectedRoute>
            <Documents />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/org-structure">
        {() => (
          <ProtectedRoute>
            <OrgStructureManagement2 />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/ai-agents/:id">
        {() => (
          <ProtectedRoute>
            <AIAgents />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/ai-agents">
        {() => (
          <ProtectedRoute>
            <AIAgents />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/rbac">
        {() => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <RbacManagement />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/knowledge">
        {() => (
          <ProtectedRoute>
            <UnifiedCompanyKnowledge />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/company-knowledge">
        {() => (
          <ProtectedRoute>
            <UnifiedCompanyKnowledge />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/knowledge-base">
        {() => (
          <ProtectedRoute>
            <UnifiedCompanyKnowledge />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/profile">
        {() => (
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/settings">
        {() => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <SystemSettings />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/users">
        {() => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <Users />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/integration-settings">
        {() => {
          // Перенаправление на страницу настроек с вкладкой интеграций
          window.location.href = '/settings';
          return null;
        }}
      </Route>
      <Route path="/dao-voting">
        {() => (
          <ProtectedRoute>
            <DAOVoting />
          </ProtectedRoute>
        )}
      </Route>
      
      {/* Маршрут по умолчанию - 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Проверка, если страница встроена как iframe или это страница embed
  // Используем только проверку по пути, так как проверка window.self !== window.top может
  // некорректно работать в среде разработки
  const isEmbedded = window.location.pathname.startsWith('/embed');

  // Определение состояния мобильного устройства 
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Начальное значение, которое будет обновлено в useEffect
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarVisible(!sidebarVisible);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };
  
  // Обновление состояния мобильного устройства при изменении размера окна
  useEffect(() => {
    // Инициализация состояния при монтировании компонента
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Задаем начальное состояние сайдбара на основе размера экрана
      if (mobile) {
        setSidebarVisible(false);
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };
    
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Если переключаемся на мобильный вид, скрываем боковую панель
      if (mobile && !isMobile) {
        setSidebarVisible(false);
      }
    };
    
    // Первоначальная проверка
    checkMobile();
    
    // Обработчик изменения размера окна
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        {isEmbedded ? (
        // Встроенный режим без хедера, футера и сайдбара
        <div className="min-h-screen flex flex-col bg-white text-slate-800">
          <main className="flex-1">
            <Router />
          </main>
        </div>
      ) : (
        // Обычный режим с полным интерфейсом
        <div className="min-h-screen flex flex-col bg-white text-slate-800">
          {/* Добавляем компонент Header с меню пользователя */}
          <Header />
          
          <div className="flex flex-1">
            {/* Настольная версия сайдбара */}
            <Sidebar 
              collapsed={sidebarCollapsed} 
              onToggle={toggleSidebar} 
              isMobile={isMobile}
              visible={sidebarVisible}
            />
            
            {/* Затемняющий оверлей при открытом сайдбаре на мобильных */}
            {isMobile && sidebarVisible && (
              <div 
                className="fixed inset-0 bg-black/30 z-20 backdrop-blur-sm"
                onClick={() => setSidebarVisible(false)}
                style={{ animation: 'fadeIn 0.2s ease-in-out' }}
              ></div>
            )}
            
            {/* Кнопка открытия меню на мобильных */}
            {isMobile && !sidebarVisible && (
              <button 
                className="fixed left-4 top-4 z-20 p-2 bg-white rounded-full shadow-md text-slate-700 hover:text-emerald-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                onClick={() => setSidebarVisible(true)}
                aria-label="Открыть меню"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            
            <main className={`flex-1 py-5 sm:py-7 transition-all duration-300 ease-in-out ${
              isMobile ? 'ml-0 pt-16' : (sidebarCollapsed ? 'ml-14 sm:ml-16' : 'ml-56 sm:ml-64')
            }`}>
              <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                <Router />
              </div>
            </main>
          </div>
          <Footer />
        </div>
      )}
      <Toaster />
      </NotificationProvider>
    </QueryClientProvider>
  );
}

export default App;
