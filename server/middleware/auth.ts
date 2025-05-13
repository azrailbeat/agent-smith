import { Request, Response, NextFunction } from 'express';
import { UserRole, RolePermissions } from '@shared/schema';
import { storage } from '../storage';

// Проверяет, аутентифицирован ли пользователь и имеет ли роль с достаточными правами
export const authMiddleware = (requiredRole: UserRole = UserRole.OPERATOR) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // В реальном приложении здесь будет проверка JWT или данных сессии
      // Для тестирования используем заголовок или параметр запроса
      const userId = req.headers['x-auth-user-id'] || req.query.userId;
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Требуется аутентификация' 
        });
      }

      const user = await storage.getUser(Number(userId));
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Пользователь не найден' 
        });
      }
      
      if (!user.isActive) {
        return res.status(403).json({ 
          success: false, 
          message: 'Учётная запись деактивирована' 
        });
      }

      // Проверяем, имеет ли пользователь требуемую роль или выше
      if (!hasRequiredRole(user.role as UserRole, requiredRole)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Недостаточно прав доступа' 
        });
      }

      // Добавляем пользователя к запросу для дальнейшего использования
      (req as any).user = user;
      
      next();
    } catch (error) {
      console.error('Ошибка аутентификации:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Ошибка аутентификации' 
      });
    }
  };
};

// Проверяет, имеет ли пользователь определенное разрешение
export const checkPermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Требуется аутентификация' 
      });
    }

    const userRole = user.role as UserRole;
    const permissions = RolePermissions[userRole] || [];
    
    if (!permissions.includes(permission)) {
      return res.status(403).json({ 
        success: false, 
        message: `Недостаточно прав для операции: ${permission}` 
      });
    }
    
    next();
  };
};

// Проверяет, имеет ли пользователь требуемую роль или выше
export const hasRequiredRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  const roleValues = {
    [UserRole.OPERATOR]: 1,
    [UserRole.MANAGER]: 2,
    [UserRole.ADMIN]: 3
  };
  
  return roleValues[userRole] >= roleValues[requiredRole];
};

// Экспортируем middleware для каждой роли для удобства
export const requireOperator = authMiddleware(UserRole.OPERATOR);
export const requireManager = authMiddleware(UserRole.MANAGER);
export const requireAdmin = authMiddleware(UserRole.ADMIN);