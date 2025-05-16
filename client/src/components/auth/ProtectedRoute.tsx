import React from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string | string[];
}

/**
 * Компонент для защиты маршрутов, требующих аутентификации
 * Перенаправляет на страницу входа, если пользователь не авторизован
 */
export default function ProtectedRoute({ 
  children, 
  requiredRoles 
}: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, hasRole } = useAuth();

  // Отображаем индикатор загрузки, пока проверяем аутентификацию
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Если пользователь не авторизован, перенаправляем на страницу входа
  if (!isAuthenticated) {
    // Перенаправляем на страницу входа
    window.location.href = '/api/login';
    return null;
  }

  // Если есть требования к ролям, проверяем их
  if (requiredRoles && !hasRole(requiredRoles)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-2xl font-bold text-destructive">Доступ запрещен</h1>
        <p className="max-w-md text-muted-foreground">
          У вас недостаточно прав для доступа к этой странице. Требуется роль: 
          {Array.isArray(requiredRoles) ? requiredRoles.join(', ') : requiredRoles}
        </p>
        <Redirect to="/" />
      </div>
    );
  }

  // Если всё в порядке, отображаем защищенный контент
  return <>{children}</>;
}