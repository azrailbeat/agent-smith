import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, LogOut, Settings, Shield, ChevronDown } from "lucide-react";

/**
 * Компонент меню пользователя с функциями авторизации
 */
export function UserMenu() {
  const { user, isLoading, isAuthenticated, isAdmin, login, logout } = useAuth();
  
  // Формирование инициалов пользователя для аватара
  const getUserInitials = () => {
    if (!user) return "?";
    
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    } else if (user.firstName) {
      return user.firstName[0].toUpperCase();
    } else if (user.username) {
      return user.username[0].toUpperCase();
    }
    
    return "?";
  };
  
  // Если данные загружаются, показываем загрузчик
  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </Button>
    );
  }
  
  // Если пользователь не авторизован, показываем кнопку входа
  if (!isAuthenticated) {
    return (
      <Button onClick={login} variant="default" size="sm">
        <UserCircle className="mr-2 h-4 w-4" />
        Войти
      </Button>
    );
  }
  
  // Полное имя пользователя для отображения
  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.username || 'Пользователь';
  
  // Роль пользователя
  const roleLabel = isAdmin 
    ? 'Администратор' 
    : user?.role === 'superadmin' 
      ? 'Супер-администратор' 
      : user?.role === 'manager' 
        ? 'Менеджер' 
        : 'Пользователь';
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 pl-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.profileImageUrl || ''} alt={displayName} />
            <AvatarFallback>{getUserInitials()}</AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-medium">{displayName}</span>
            <span className="text-xs text-muted-foreground">{roleLabel}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isAdmin && (
          <>
            <DropdownMenuItem className="cursor-pointer">
              <Shield className="mr-2 h-4 w-4" />
              <span>Панель администратора</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Настройки профиля</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Выйти</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}