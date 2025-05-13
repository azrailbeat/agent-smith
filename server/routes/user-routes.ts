import { Router } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { insertUserSchema, userRoleSchema, UserRole, RolePermissions } from '@shared/schema';
import { requireAdmin, requireManager, checkPermission } from '../middleware/auth';
import bcrypt from 'bcrypt';

const router = Router();

/**
 * @route GET /api/users
 * @desc Получение списка всех пользователей
 * @access Только для администраторов и руководителей
 */
router.get('/users', requireManager, checkPermission('users.view'), async (req, res) => {
  try {
    const users = await storage.getUsers();
    
    // Удаляем хеши паролей из ответа
    const safeUsers = users.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });
    
    return res.json({ 
      success: true, 
      data: safeUsers 
    });
  } catch (error) {
    console.error('Ошибка при получении списка пользователей:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка при получении списка пользователей' 
    });
  }
});

/**
 * @route GET /api/users/:id
 * @desc Получение информации о пользователе по ID
 * @access Только для администраторов и руководителей, или самого пользователя
 */
router.get('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Некорректный ID пользователя' 
      });
    }
    
    // Проверяем права доступа - пользователь может просматривать только свои данные,
    // если он не админ/руководитель
    const currentUser = (req as any).user;
    
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'Требуется аутентификация' 
      });
    }
    
    const canView = 
      currentUser.id === userId || 
      currentUser.role === UserRole.ADMIN || 
      currentUser.role === UserRole.MANAGER;
      
    if (!canView) {
      return res.status(403).json({ 
        success: false, 
        message: 'Недостаточно прав для просмотра данных пользователя' 
      });
    }
    
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Пользователь не найден' 
      });
    }
    
    // Удаляем хеш пароля из ответа
    const { password, ...safeUser } = user;
    
    return res.json({ 
      success: true, 
      data: safeUser 
    });
  } catch (error) {
    console.error('Ошибка при получении информации о пользователе:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка при получении информации о пользователе' 
    });
  }
});

/**
 * @route POST /api/users
 * @desc Создание нового пользователя
 * @access Только для администраторов
 */
router.post('/users', requireAdmin, checkPermission('users.manage'), async (req, res) => {
  try {
    // Создаем schema с валидацией для создания пользователя
    const createUserSchema = insertUserSchema.extend({
      username: z.string().min(3, 'Имя пользователя должно быть не менее 3 символов'),
      password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
      fullName: z.string().min(3, 'ФИО должно быть не менее 3 символов'),
      role: userRoleSchema.default(UserRole.OPERATOR),
      email: z.string().email('Некорректный email').nullable().optional(),
      isActive: z.boolean().default(true),
    });

    // Валидируем данные
    const userData = createUserSchema.parse(req.body);
    
    // Проверяем, не занят ли username
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Пользователь с таким именем уже существует' 
      });
    }
    
    // Хешируем пароль
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
    
    // Создаем пользователя с хешированным паролем
    const newUser = await storage.createUser({
      ...userData,
      password: hashedPassword,
    });
    
    // Удаляем хеш пароля из ответа
    const { password, ...safeUser } = newUser;
    
    return res.status(201).json({ 
      success: true, 
      message: 'Пользователь успешно создан',
      data: safeUser
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ошибка валидации данных', 
        errors: error.errors 
      });
    }
    
    console.error('Ошибка при создании пользователя:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка при создании пользователя' 
    });
  }
});

/**
 * @route PUT /api/users/:id
 * @desc Обновление информации о пользователе
 * @access Администраторы или сам пользователь (с ограничениями)
 */
router.put('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Некорректный ID пользователя' 
      });
    }
    
    // Проверяем права доступа - пользователь может обновлять только свои данные,
    // если он не админ
    const currentUser = (req as any).user;
    
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'Требуется аутентификация' 
      });
    }
    
    const isAdmin = currentUser.role === UserRole.ADMIN;
    const isSelf = currentUser.id === userId;
    
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ 
        success: false, 
        message: 'Недостаточно прав для обновления данных пользователя' 
      });
    }
    
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Пользователь не найден' 
      });
    }
    
    // Определяем, какие поля могут быть обновлены
    // Обычные пользователи могут обновлять только свои личные данные
    let allowedFields = ['fullName', 'email', 'phone', 'avatarUrl'];
    
    // Администраторы могут обновлять все поля, включая роль и статус
    if (isAdmin) {
      allowedFields = [...allowedFields, 'username', 'role', 'department', 'departmentId', 'positionId', 'isActive'];
    }
    
    // Создаем schema с валидацией для обновления пользователя
    const updateUserSchema = z.object({
      username: z.string().min(3).optional(),
      password: z.string().min(6).optional(),
      fullName: z.string().min(3).optional(),
      avatarUrl: z.string().optional().nullable(),
      department: z.string().optional().nullable(),
      departmentId: z.number().optional().nullable(),
      positionId: z.number().optional().nullable(),
      role: userRoleSchema.optional(),
      email: z.string().email().optional().nullable(),
      phone: z.string().optional().nullable(),
      isActive: z.boolean().optional(),
    });
    
    // Валидируем данные
    const updateData = updateUserSchema.parse(req.body);
    
    // Фильтруем только разрешенные поля для обновления
    const filteredData: Record<string, any> = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key as keyof typeof updateData] !== undefined) {
        filteredData[key] = updateData[key as keyof typeof updateData];
      }
    });
    
    // Если пароль нужно обновить, хешируем его
    if (updateData.password) {
      // Только администраторы или сам пользователь могут менять пароль
      if (!isAdmin && !isSelf) {
        return res.status(403).json({ 
          success: false, 
          message: 'Недостаточно прав для смены пароля' 
        });
      }
      
      const saltRounds = 10;
      filteredData.password = await bcrypt.hash(updateData.password, saltRounds);
    }
    
    // Обновляем данные пользователя
    const updatedUser = await storage.updateUser(userId, filteredData);
    
    // Удаляем хеш пароля из ответа
    const { password, ...safeUser } = updatedUser;
    
    return res.json({ 
      success: true, 
      message: 'Данные пользователя успешно обновлены',
      data: safeUser
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ошибка валидации данных', 
        errors: error.errors 
      });
    }
    
    console.error('Ошибка при обновлении пользователя:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка при обновлении пользователя' 
    });
  }
});

/**
 * @route DELETE /api/users/:id
 * @desc Удаление пользователя
 * @access Только для администраторов
 */
router.delete('/users/:id', requireAdmin, checkPermission('users.manage'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Некорректный ID пользователя' 
      });
    }
    
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Пользователь не найден' 
      });
    }
    
    // Проверка, не удаляет ли пользователь сам себя
    const currentUser = (req as any).user;
    if (currentUser.id === userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Вы не можете удалить свой собственный аккаунт' 
      });
    }
    
    await storage.deleteUser(userId);
    
    return res.json({ 
      success: true, 
      message: 'Пользователь успешно удален'
    });
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка при удалении пользователя' 
    });
  }
});

/**
 * @route GET /api/users/me
 * @desc Получение информации о текущем пользователе
 * @access Для авторизованных пользователей
 */
router.get('/users/me', async (req, res) => {
  try {
    const currentUser = (req as any).user;
    
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'Требуется аутентификация' 
      });
    }
    
    // Получаем свежие данные пользователя из БД
    const user = await storage.getUser(currentUser.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Пользователь не найден' 
      });
    }
    
    // Удаляем хеш пароля из ответа
    const { password, ...safeUser } = user;
    
    // Добавляем список разрешений для пользователя
    const permissions = RolePermissions[user.role as UserRole] || [];
    
    return res.json({ 
      success: true, 
      data: {
        ...safeUser,
        permissions
      }
    });
  } catch (error) {
    console.error('Ошибка при получении информации о текущем пользователе:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка при получении информации о текущем пользователе' 
    });
  }
});

export default router;