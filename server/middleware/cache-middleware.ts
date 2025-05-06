/**
 * Middleware для кэширования ответов API
 * 
 * Позволяет кэшировать ответы API для повышения производительности.
 * Поддерживает настройку TTL и условий кэширования для разных маршрутов.
 */

import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache-service';

/**
 * Опции кэширования
 */
interface CacheOptions {
  /**
   * Время жизни кэша в миллисекундах
   */
  ttl?: number;
  
  /**
   * Функция для определения ключа кэша
   * По умолчанию используется URL запроса
   */
  keyGenerator?: (req: Request) => string;
  
  /**
   * Функция для определения, следует ли кэшировать ответ
   * По умолчанию кэшируются только успешные GET-запросы
   */
  shouldCache?: (req: Request, res: Response) => boolean;
}

/**
 * Создает middleware для кэширования ответов API
 * @param options Опции кэширования
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  // Значения по умолчанию
  const ttl = options.ttl || 5 * 60 * 1000; // 5 минут
  
  const keyGenerator = options.keyGenerator || ((req: Request) => {
    return `api:${req.originalUrl || req.url}`;
  });
  
  const shouldCache = options.shouldCache || ((req: Request, res: Response) => {
    return req.method === 'GET' && res.statusCode < 400;
  });
  
  // Middleware функция
  return (req: Request, res: Response, next: NextFunction) => {
    // Проверяем только GET-запросы
    if (req.method !== 'GET') {
      return next();
    }
    
    // Генерируем ключ кэша
    const key = keyGenerator(req);
    
    // Проверяем, есть ли ответ в кэше
    const cachedResponse = cacheService.get(key);
    if (cachedResponse) {
      // Устанавливаем заголовок, чтобы клиент знал, что ответ из кэша
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cachedResponse);
    }
    
    // Сохраняем оригинальную функцию json
    const originalJson = res.json;
    
    // Перехватываем вызов json для кэширования ответа
    (res as any).json = function(body: any) {
      // Восстанавливаем оригинальную функцию
      (res as any).json = originalJson;
      
      // Проверяем, нужно ли кэшировать ответ
      if (shouldCache(req, res)) {
        // Сохраняем ответ в кэш
        cacheService.set(key, body, ttl);
        
        // Устанавливаем заголовок, чтобы клиент знал, что ответ не из кэша
        res.setHeader('X-Cache', 'MISS');
      }
      
      // Продолжаем обычную обработку
      return originalJson.call(this, body);
    };
    
    next();
  };
}

/**
 * Middleware для очистки кэша по префиксу
 * @param prefix Префикс ключей для очистки
 */
export function clearCacheMiddleware(prefix: string = 'api:') {
  return (req: Request, res: Response, next: NextFunction) => {
    // Очищаем кэш с указанным префиксом
    cacheService.clear(prefix);
    
    // Устанавливаем заголовок, чтобы клиент знал, что кэш был очищен
    res.setHeader('X-Cache-Cleared', 'true');
    
    next();
  };
}