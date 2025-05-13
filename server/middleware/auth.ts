import { Request, Response, NextFunction } from "express";
import { User, UserRole, RolePermissions } from "@shared/schema";

// Расширение типа Request для включения пользователя
declare global {
  namespace Express {
    interface Request {
      user?: User;
      isAuthenticated(): boolean;
    }
  }
}

// Middleware для аутентификации пользователя
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Проверка, что пользователь авторизован
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ success: false, message: "Требуется авторизация" });
  }
  
  next();
};

// Middleware для проверки роли
export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Сначала проверяем аутентификацию
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Требуется авторизация" });
    }
    
    // Проверяем, что пользователь имеет одну из требуемых ролей
    const userRole = req.user?.role as UserRole;
    if (!userRole || !roles.includes(userRole as UserRole)) {
      return res.status(403).json({ 
        success: false, 
        message: "Недостаточно прав для доступа к данному ресурсу" 
      });
    }
    
    next();
  };
};

// Middleware для проверки конкретных разрешений
export const requirePermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Сначала проверяем аутентификацию
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: "Требуется авторизация" });
    }
    
    // Получаем роль пользователя
    const userRole = req.user?.role as UserRole;
    if (!userRole) {
      return res.status(403).json({ 
        success: false, 
        message: "Роль пользователя не определена" 
      });
    }
    
    // Получаем разрешения для роли пользователя
    const userPermissions = RolePermissions[userRole] || [];
    
    // Проверяем, что у пользователя есть все необходимые разрешения
    const hasAllPermissions = permissions.every(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      return res.status(403).json({ 
        success: false, 
        message: "Недостаточно прав для выполнения данного действия",
        requiredPermissions: permissions,
        userPermissions: userPermissions
      });
    }
    
    next();
  };
};

// Вспомогательная функция для проверки прав в коде
export const hasPermission = (user: User, permission: string): boolean => {
  if (!user || !user.role) return false;
  
  const userRole = user.role as UserRole;
  const userPermissions = RolePermissions[userRole] || [];
  
  return userPermissions.includes(permission);
};

// Хелпер для создания объекта с разрешениями для фронтенда
export const getUserPermissions = (user: User): Record<string, boolean> => {
  if (!user || !user.role) return {};
  
  const userRole = user.role as UserRole;
  const userPermissions = RolePermissions[userRole] || [];
  
  // Создаем объект, где ключи - это имена разрешений, а значения - true
  return userPermissions.reduce((acc, permission) => {
    acc[permission] = true;
    return acc;
  }, {} as Record<string, boolean>);
};