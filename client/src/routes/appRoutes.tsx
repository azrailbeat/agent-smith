import React from "react";
import { Route } from "wouter";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Импорт компонентов страниц
import Dashboard from "@/pages/Dashboard";
import DashboardAnalytics from "@/pages/DashboardAnalytics";
import HistoryPage from "@/pages/History";
import NotFound from "@/pages/not-found";
import AboutSystem from "@/pages/AboutSystem";
import EmbedForm from "@/pages/EmbedForm";

// Административные
import SystemSettings from "@/pages/SystemSettings"; 
import Users from "@/pages/Users";
import RbacManagement from "@/pages/RbacManagement";

// Обращения граждан
import CitizenRequests from "@/pages/CitizenRequestsKanban2";

// Знания
import KnowledgeManagement from "@/pages/KnowledgeManagement";
import UnifiedCompanyKnowledge from "@/pages/UnifiedCompanyKnowledge";

// Задачи и встречи
import Tasks from "@/pages/Tasks";
import Meetings from "@/pages/Meetings";

// Организационная структура
import OrgStructureManagement2 from "@/pages/OrgStructureManagement2";

// ИИ и блокчейн
import AIAgents from "@/pages/AIAgents";
import DAOVoting from "@/pages/DAOVoting";
import Translate from "@/pages/Translate";

// Профиль пользователя
import UserProfile from "@/pages/UserProfile";

// Определяем типы маршрутов
type RouteType = {
  path: string;
  component: React.ComponentType<any>;
  exact?: boolean;
  protected?: boolean;
  requiredRoles?: string[];
  name: string;
  icon?: JSX.Element;
  group?: string;
  children?: RouteType[];
};

// Функция для создания маршрута с настройками доступа
export const createRoute = (
  path: string,
  Component: React.ComponentType<any>,
  options: {
    protected?: boolean;
    requiredRoles?: string[];
    name: string;
    icon?: JSX.Element;
    group?: string;
    exact?: boolean;
    children?: RouteType[];
  }
) => {
  const { protected: isProtected = false, requiredRoles = [], ...rest } = options;
  
  return {
    path,
    component: Component,
    protected: isProtected,
    requiredRoles,
    ...rest
  };
};

// Функция для рендеринга маршрута
export const renderRoute = (route: RouteType) => {
  if (route.protected) {
    return (
      <Route
        key={route.path}
        path={route.path}
        // Для маршрутов с параметрами не нужно передавать параметр
        children={() => (
          <ProtectedRoute requiredRoles={route.requiredRoles}>
            <route.component />
          </ProtectedRoute>
        )}
      />
    );
  }
  
  return (
    <Route
      key={route.path}
      path={route.path}
      component={route.component}
    />
  );
};

// Экспортируем все маршруты приложения
export const appRoutes: RouteType[] = [
  // Публичные маршруты
  createRoute("/", Dashboard, { name: "Главная", group: "Основное" }),
  createRoute("/about", AboutSystem, { name: "О системе", group: "Информация" }),
  createRoute("/embed", EmbedForm, { name: "Встраивание", group: "Информация" }),
  
  // Защищенные маршруты
  createRoute("/dashboard", Dashboard, { 
    protected: true, 
    name: "Мониторинг", 
    group: "Основное" 
  }),
  
  // Группа "Обращения граждан"
  createRoute("/citizen-requests", CitizenRequests, { 
    protected: true, 
    name: "Обращения граждан", 
    group: "Основное"
  }),
  
  // Группа "Задачи и встречи"
  createRoute("/tasks", Tasks, { 
    protected: true, 
    name: "Задачи", 
    group: "Основное"
  }),
  createRoute("/meetings", Meetings, { 
    protected: true, 
    name: "Протоколы собраний", 
    group: "Основное" 
  }),
  
  // Группа "Управление"
  createRoute("/users", Users, { 
    protected: true, 
    requiredRoles: ["admin"], 
    name: "Пользователи", 
    group: "Управление" 
  }),
  createRoute("/ai-agents", AIAgents, { 
    protected: true, 
    name: "ИИ агенты", 
    group: "Управление" 
  }),
  createRoute("/ai-agents/:id", AIAgents, { 
    protected: true,
    name: "Детали агента", 
    group: "Управление"
  }),
  createRoute("/org-structure", OrgStructureManagement2, { 
    protected: true, 
    name: "Орг. структура", 
    group: "Управление" 
  }),

  createRoute("/dao-voting", DAOVoting, { 
    protected: true, 
    name: "DAO Голосования", 
    group: "Управление" 
  }),
  
  // Группа "Информация"
  createRoute("/history", HistoryPage, { 
    protected: true, 
    name: "История", 
    group: "Информация" 
  }),
  createRoute("/settings", SystemSettings, { 
    protected: true, 
    requiredRoles: ["admin"], 
    name: "Настройки", 
    group: "Информация" 
  }),
  createRoute("/translate", Translate, { 
    protected: true, 
    name: "Переводчик", 
    group: "Информация" 
  }),
  
  // Группа "Знания"
  createRoute("/knowledge", UnifiedCompanyKnowledge, { 
    protected: true, 
    name: "База знаний", 
    group: "Информация" 
  }),
  createRoute("/company-knowledge", UnifiedCompanyKnowledge, { 
    protected: true, 
    name: "Знания компании", 
    group: "Информация" 
  }),
  createRoute("/knowledge-base", UnifiedCompanyKnowledge, { 
    protected: true, 
    name: "База знаний", 
    group: "Информация" 
  }),
  
  // Профиль
  createRoute("/profile", UserProfile, { 
    protected: true, 
    name: "Профиль", 
    group: "Информация" 
  }),
  
  // Управление доступом
  createRoute("/rbac", RbacManagement, { 
    protected: true, 
    requiredRoles: ["admin"], 
    name: "Управление ролями", 
    group: "Управление" 
  }),
  
  // Обработка перенаправления на страницу настроек с вкладкой интеграций
  createRoute("/integration-settings", SystemSettings, { 
    protected: true, 
    requiredRoles: ["admin"], 
    name: "Настройки интеграций", 
    group: "Информация" 
  }),
];

// Группировка маршрутов по группам для боковой панели
export const getRouteGroups = () => {
  const groups: Record<string, RouteType[]> = {};
  
  appRoutes.forEach(route => {
    if (route.group) {
      if (!groups[route.group]) {
        groups[route.group] = [];
      }
      
      // Исключаем дублирующиеся и скрытые маршруты из меню
      const isHidden = route.path.includes("/:") || 
                        route.path === "/embed" || 
                        (groups[route.group].some(r => r.name === route.name));
      
      if (!isHidden) {
        groups[route.group].push(route);
      }
    }
  });
  
  return groups;
};

// Компонент для отображения всех маршрутов
export const AllRoutes = () => (
  <>
    {appRoutes.map(route => renderRoute(route))}
    <Route component={NotFound} />
  </>
);

export default AllRoutes;