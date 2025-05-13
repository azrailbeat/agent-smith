import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requirePermission } from "../middleware/auth";
import { UserRole, insertUserSchema, userRoleSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { ZodError } from "zod";

const router = Router();

/**
 * @route GET /api/users
 * @desc Получение списка всех пользователей
 * @access Только для администраторов и руководителей
 */
router.get(
  "/users",
  requireAuth,
  requirePermission(["users.view"]),
  async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Не возвращаем хеши паролей
      const sanitizedUsers = users.map(user => {
        const { password, ...rest } = user;
        return rest;
      });
      
      res.json({ success: true, data: sanitizedUsers });
    } catch (error) {
      console.error("Ошибка при получении списка пользователей:", error);
      res.status(500).json({ 
        success: false, 
        message: "Ошибка при получении списка пользователей" 
      });
    }
  }
);

/**
 * @route GET /api/users/:id
 * @desc Получение информации о пользователе по ID
 * @access Только для администраторов и руководителей, или самого пользователя
 */
router.get(
  "/users/:id",
  requireAuth,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Пользователь может смотреть свой профиль
      const isSelfProfile = req.user?.id === userId;
      
      // Если не свой профиль, проверяем разрешение
      if (!isSelfProfile) {
        const hasViewPermission = await checkPermission(req, ["users.view"]);
        if (!hasViewPermission) {
          return res.status(403).json({ 
            success: false, 
            message: "Недостаточно прав для просмотра информации о пользователе" 
          });
        }
      }
      
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "Пользователь не найден" 
        });
      }
      
      // Не возвращаем хеш пароля
      const { password, ...sanitizedUser } = user;
      
      res.json({ success: true, data: sanitizedUser });
    } catch (error) {
      console.error("Ошибка при получении информации о пользователе:", error);
      res.status(500).json({ 
        success: false, 
        message: "Ошибка при получении информации о пользователе" 
      });
    }
  }
);

/**
 * @route POST /api/users
 * @desc Создание нового пользователя
 * @access Только для администраторов
 */
router.post(
  "/users",
  requireAuth,
  requirePermission(["users.manage"]),
  async (req, res) => {
    try {
      // Валидация входных данных
      const userData = insertUserSchema.parse(req.body);
      
      // Валидация роли
      const role = userRoleSchema.parse(userData.role);
      
      // Хешируем пароль
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      
      // Создаем пользователя
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
        role: role
      });
      
      // Не возвращаем хеш пароля
      const { password, ...sanitizedUser } = newUser;
      
      res.status(201).json({ 
        success: true, 
        message: "Пользователь успешно создан", 
        data: sanitizedUser 
      });
    } catch (error) {
      console.error("Ошибка при создании пользователя:", error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: "Некорректные данные пользователя", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: "Ошибка при создании пользователя" 
      });
    }
  }
);

/**
 * @route PUT /api/users/:id
 * @desc Обновление информации о пользователе
 * @access Администраторы или сам пользователь (с ограничениями)
 */
router.put(
  "/users/:id",
  requireAuth,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      // Проверяем существование пользователя
      const existingUser = await storage.getUserById(userId);
      
      if (!existingUser) {
        return res.status(404).json({ 
          success: false, 
          message: "Пользователь не найден" 
        });
      }
      
      // Определяем, является ли запрашивающий администратором
      const isAdmin = req.user?.role === UserRole.ADMIN;
      
      // Определяем, обновляет ли пользователь свой профиль
      const isSelfUpdate = req.user?.id === userId;
      
      // Если не администратор и не свой профиль - отказываем
      if (!isAdmin && !isSelfUpdate) {
        return res.status(403).json({ 
          success: false, 
          message: "У вас нет прав для обновления данного пользователя" 
        });
      }
      
      // Проверяем, пытается ли обычный пользователь изменить свою роль
      if (isSelfUpdate && !isAdmin && userData.role && userData.role !== existingUser.role) {
        return res.status(403).json({ 
          success: false, 
          message: "Вы не можете изменить свою роль" 
        });
      }
      
      // Если меняется пароль, хешируем его
      let hashedPassword;
      if (userData.password) {
        const saltRounds = 10;
        hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      }
      
      // Обновляем пользователя
      const updatedUser = await storage.updateUser(userId, {
        ...userData,
        ...(hashedPassword && { password: hashedPassword }),
      });
      
      // Не возвращаем хеш пароля
      const { password, ...sanitizedUser } = updatedUser;
      
      res.json({ 
        success: true, 
        message: "Информация о пользователе успешно обновлена", 
        data: sanitizedUser 
      });
    } catch (error) {
      console.error("Ошибка при обновлении пользователя:", error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: "Некорректные данные пользователя", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: "Ошибка при обновлении пользователя" 
      });
    }
  }
);

/**
 * @route DELETE /api/users/:id
 * @desc Удаление пользователя
 * @access Только для администраторов
 */
router.delete(
  "/users/:id",
  requireAuth,
  requirePermission(["users.manage"]),
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Запрещаем удалять самого себя
      if (req.user?.id === userId) {
        return res.status(400).json({ 
          success: false, 
          message: "Вы не можете удалить свою учетную запись" 
        });
      }
      
      // Проверяем существование пользователя
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "Пользователь не найден" 
        });
      }
      
      // Удаляем пользователя
      await storage.deleteUser(userId);
      
      res.json({ 
        success: true, 
        message: "Пользователь успешно удален" 
      });
    } catch (error) {
      console.error("Ошибка при удалении пользователя:", error);
      res.status(500).json({ 
        success: false, 
        message: "Ошибка при удалении пользователя" 
      });
    }
  }
);

/**
 * @route GET /api/users/me
 * @desc Получение информации о текущем пользователе
 * @access Для авторизованных пользователей
 */
router.get(
  "/users/me",
  requireAuth,
  async (req, res) => {
    try {
      // Не возвращаем хеш пароля
      const { password, ...sanitizedUser } = req.user!;
      
      res.json({ 
        success: true, 
        data: sanitizedUser 
      });
    } catch (error) {
      console.error("Ошибка при получении информации о текущем пользователе:", error);
      res.status(500).json({ 
        success: false, 
        message: "Ошибка при получении информации о текущем пользователе" 
      });
    }
  }
);

// Вспомогательная функция для проверки прав пользователя
async function checkPermission(req: any, permissions: string[]): Promise<boolean> {
  const userRole = req.user?.role as UserRole;
  
  if (!userRole) return false;
  
  const userPermissions = RolePermissions[userRole] || [];
  
  // Проверяем, что у пользователя есть все необходимые разрешения
  return permissions.every(permission => userPermissions.includes(permission));
}

export default router;