/**
 * Централизованный обработчик ошибок
 * 
 * Этот модуль предоставляет middleware для обработки ошибок в Express-приложении.
 * Он форматирует ошибки в единый формат и логирует их для дальнейшего анализа.
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { logActivity } from '../activity-logger';

export class HttpError extends Error {
  status: number;
  
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = 'Ресурс не найден') {
    super(message, 404);
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string = 'Некорректный запрос') {
    super(message, 400);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = 'Не авторизован') {
    super(message, 401);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string = 'Доступ запрещен') {
    super(message, 403);
  }
}

export class ValidationError extends BadRequestError {
  errors: any;
  
  constructor(message: string = 'Ошибка валидации', errors?: any) {
    super(message);
    this.errors = errors;
  }
}

export class ExternalApiError extends HttpError {
  originalError: any;
  
  constructor(message: string = 'Ошибка внешнего API', originalError?: any) {
    super(message, 502);
    this.originalError = originalError;
  }
}

export class DatabaseError extends HttpError {
  originalError: any;
  
  constructor(message: string = 'Ошибка базы данных', originalError?: any) {
    super(message, 500);
    this.originalError = originalError;
  }
}

/**
 * Middleware для обработки ошибок
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Если ошибка не является экземпляром HttpError, создаем новую ошибку
  const error = err instanceof HttpError 
    ? err 
    : new HttpError(err.message || 'Внутренняя ошибка сервера');
  
  // Логируем ошибку
  console.error(`[ERROR] ${error.status} - ${error.message}`, err.stack);
  
  // Записываем ошибку в журнал активности
  logErrorActivity(error, req).catch(e => {
    console.error('Ошибка при логировании ошибки:', e);
  });
  
  // Формируем ответ
  const response: any = {
    error: {
      message: error.message,
      status: error.status
    }
  };
  
  // Добавляем детали валидации, если это ошибка валидации
  if (error instanceof ValidationError && error.errors) {
    response.error.details = error.errors;
  }
  
  // В режиме разработки добавляем стек ошибки
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
    
    // Для ошибок внешних API добавляем оригинальную ошибку
    if (error instanceof ExternalApiError && error.originalError) {
      response.error.originalError = error.originalError;
    }
  }
  
  res.status(error.status).json(response);
}

/**
 * Логирование ошибки в журнал активности
 */
async function logErrorActivity(error: HttpError, req: Request): Promise<void> {
  try {
    const metadata: Record<string, any> = {
      url: req.originalUrl,
      method: req.method,
      statusCode: error.status,
      errorName: error.name
    };
    
    // Добавляем пользователя, если есть
    const userId = (req as any).session?.userId || null;
    
    // Для некоторых ошибок добавляем дополнительную информацию
    if (error instanceof ExternalApiError) {
      metadata.externalApi = true;
      if (error.originalError && error.originalError.code) {
        metadata.errorCode = error.originalError.code;
      }
    }
    
    await storage.createActivity({
      userId: userId,
      actionType: 'error',
      description: `Ошибка: ${error.message}`,
      relatedId: null,
      relatedType: null,
      entityType: 'system_error',
      entityId: null,
      metadata
    });
  } catch (logError) {
    console.error('Ошибка при записи ошибки в журнал активности:', logError);
  }
}

/**
 * Middleware для обработки несуществующих маршрутов
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  next(new NotFoundError(`Маршрут ${req.method} ${req.originalUrl} не найден`));
}

/**
 * Асинхронный обработчик для маршрутов
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}