import { useQuery } from '@tanstack/react-query';
import { useToast } from './use-toast';

interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  roles?: string[];
  department?: string;
  position?: string;
}

export function useAuth() {
  const { toast } = useToast();
  
  // Запрос на получение данных аутентифицированного пользователя
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    retry: false, // Не повторять запрос при ошибке
    refetchOnWindowFocus: false, // Не обновлять при фокусе окна
    staleTime: 1000 * 60 * 5, // Данные считаются актуальными в течение 5 минут
    // Обработка ошибок 401 (Unauthorized) без показа уведомлений
    gcTime: 0, // Не кэшировать ошибки
  });

  // Проверка, имеет ли пользователь указанную роль
  const hasRole = (requiredRoles: string | string[]): boolean => {
    if (!user || !user.roles || user.roles.length === 0) {
      return false;
    }

    if (typeof requiredRoles === 'string') {
      return user.roles.includes(requiredRoles);
    }

    // Если хотя бы одна из требуемых ролей присутствует у пользователя
    return requiredRoles.some(role => user.roles?.includes(role));
  };

  // Проверка, может ли пользователь выполнять действие
  const canPerformAction = (action: string): boolean => {
    // Здесь может быть более сложная логика проверки прав на действие
    // Например, на основе матрицы прав доступа
    // Пока просто проверяем наличие администраторской роли
    return hasRole('admin');
  };

  // Выход из системы
  const logout = () => {
    window.location.href = '/api/logout';
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    hasRole,
    canPerformAction,
    logout,
  };
}