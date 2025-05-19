import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogIn, User as UserIcon, LogOut, Settings, Shield } from 'lucide-react';

/**
 * Компонент меню пользователя с функциями авторизации
 */
export function UserMenu() {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  // Проверка наличия роли у пользователя
  const hasRole = (role: string) => {
    if (!user || !user.roles || !Array.isArray(user.roles)) {
      return false;
    }
    return user.roles.includes(role);
  };

  // Инициалы пользователя для аватара
  const getUserInitials = () => {
    if (!user || (!user.firstName && !user.lastName)) {
      return '?';
    }
    
    const firstInitial = user.firstName ? user.firstName.charAt(0) : '';
    const lastInitial = user.lastName ? user.lastName.charAt(0) : '';
    
    return `${firstInitial}${lastInitial}`.toUpperCase() || '?';
  };

  // Полное имя пользователя
  const getDisplayName = () => {
    if (!user) return 'Гость';
    
    const nameParts = [];
    if (user.firstName) nameParts.push(user.firstName);
    if (user.lastName) nameParts.push(user.lastName);
    
    return nameParts.length > 0 ? nameParts.join(' ') : user.email || 'Пользователь';
  };

  // Если данные ещё загружаются, показываем индикатор загрузки
  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <span className="ml-2">Загрузка...</span>
      </Button>
    );
  }

  // Если пользователь не авторизован, показываем кнопку входа
  if (!isAuthenticated) {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={() => window.location.href = '/api/login'}
      >
        <LogIn className="mr-2 h-4 w-4" />
        Войти
      </Button>
    );
  }

  // Пользователь авторизован, показываем меню с опциями
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.profileImageUrl} alt={getDisplayName()} />
            <AvatarFallback>{getUserInitials()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {hasRole('admin') && (
          <DropdownMenuItem onClick={() => window.location.href = '/system-settings'}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Настройки системы</span>
          </DropdownMenuItem>
        )}
        
        {user.department && (
          <DropdownMenuItem>
            <Shield className="mr-2 h-4 w-4" />
            <span>{user.department} - {user.position}</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => window.location.href = '/api/logout'}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Выйти</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}