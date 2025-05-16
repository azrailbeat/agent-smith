import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

// Определение типа пользователя
export interface AuthUser {
  id: number;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: string;
  departmentId?: number;
  isAuthenticated: boolean;
}

/**
 * Хук для получения и управления состоянием аутентификации пользователя
 */
export function useAuth() {
  const { 
    data: user, 
    isLoading, 
    error 
  } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 минут
    refetchOnWindowFocus: true,
  });

  // Проверяем, авторизован ли пользователь
  const isAuthenticated = !!user?.isAuthenticated;

  // Проверяем, имеет ли пользователь указанную роль
  const hasRole = (roles: string | string[]) => {
    if (!isAuthenticated || !user || !user.role) return false;
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(user.role);
  };

  // Проверяем, является ли пользователь администратором
  const isAdmin = isAuthenticated && user?.role && ['admin', 'superadmin'].includes(user.role);

  // Функция для выхода из системы
  const logout = async () => {
    try {
      window.location.href = '/api/auth/logout';
    } catch (error) {
      console.error('Ошибка при выходе из системы:', error);
    }
  };

  // Функция для входа в систему
  const login = () => {
    window.location.href = '/api/auth/login';
  };

  // Инвалидация кеша аутентификации
  const invalidateAuth = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    hasRole,
    isAdmin,
    login,
    logout,
    invalidateAuth
  };
}