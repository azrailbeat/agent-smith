/**
 * Сервис кэширования данных
 * 
 * Реализует простое кэширование в памяти с возможностью установки TTL для записей.
 * В будущем может быть расширен для использования Redis или других систем кэширования.
 */

interface CacheItem<T> {
  value: T;
  expires: number; // Время истечения кэша в миллисекундах
}

export class CacheService {
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 минут по умолчанию
  
  /**
   * Получить запись из кэша
   * @param key Ключ записи
   * @returns Значение из кэша или undefined, если запись не найдена или устарела
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }
    
    // Проверяем, не истекла ли запись
    if (Date.now() > item.expires) {
      this.delete(key);
      return undefined;
    }
    
    return item.value as T;
  }
  
  /**
   * Добавить или обновить запись в кэше
   * @param key Ключ записи
   * @param value Значение для кэширования
   * @param ttl Время жизни записи в миллисекундах (опционально)
   */
  set<T>(key: string, value: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }
  
  /**
   * Удалить запись из кэша
   * @param key Ключ записи
   * @returns true, если запись была удалена, false в противном случае
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Очистить весь кэш или записи, начинающиеся с определенного префикса
   * @param prefix Префикс ключей для удаления (опционально)
   */
  clear(prefix?: string): void {
    if (!prefix) {
      this.cache.clear();
      return;
    }
    
    // Удаляем записи с указанным префиксом
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Получить запись из кэша или вычислить ее, если она отсутствует
   * @param key Ключ записи
   * @param factory Функция для вычисления значения
   * @param ttl Время жизни записи в миллисекундах (опционально)
   * @returns Значение из кэша или результат вызова factory
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cachedValue = this.get<T>(key);
    
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
  
  /**
   * Удалить устаревшие записи из кэша
   * @returns Количество удаленных записей
   */
  cleanup(): number {
    let removed = 0;
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    return removed;
  }
  
  /**
   * Установить время жизни по умолчанию для новых записей
   * @param ttl Время жизни в миллисекундах
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }
  
  /**
   * Получить количество записей в кэше
   * @returns Количество записей
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * Проверить наличие записи в кэше
   * @param key Ключ записи
   * @returns true, если запись существует и не устарела, false в противном случае
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }
    
    // Проверяем, не истекла ли запись
    if (Date.now() > item.expires) {
      this.delete(key);
      return false;
    }
    
    return true;
  }
}

// Создаем экземпляр сервиса кэширования
export const cacheService = new CacheService();