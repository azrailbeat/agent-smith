/**
 * Базовый репозиторий
 * 
 * Абстрактный класс репозитория, предоставляющий общие методы для работы с сущностями.
 * Использует инверсию зависимостей для уменьшения связанности компонентов системы.
 */

import { storage } from '../storage';

export interface IRepository<T, CreateDTO, UpdateDTO = Partial<CreateDTO>> {
  getAll(): Promise<T[]>;
  getById(id: number): Promise<T | undefined>;
  create(data: CreateDTO): Promise<T>;
  update(id: number, data: UpdateDTO): Promise<T | undefined>;
  delete?(id: number): Promise<boolean>;
}

export abstract class BaseRepository<T, CreateDTO, UpdateDTO = Partial<CreateDTO>> implements IRepository<T, CreateDTO, UpdateDTO> {
  protected abstract entityName: string;
  
  constructor() {}
  
  /**
   * Получить все записи сущности
   */
  abstract getAll(): Promise<T[]>;
  
  /**
   * Получить сущность по ID
   */
  abstract getById(id: number): Promise<T | undefined>;
  
  /**
   * Создать новую сущность
   */
  abstract create(data: CreateDTO): Promise<T>;
  
  /**
   * Обновить существующую сущность
   */
  abstract update(id: number, data: UpdateDTO): Promise<T | undefined>;
  
  /**
   * Удалить сущность (опционально)
   */
  delete?(id: number): Promise<boolean>;
  
  /**
   * Логировать операцию
   */
  protected async logOperation(operation: string, entityId?: number, details?: string): Promise<void> {
    try {
      await storage.createActivity({
        userId: 1, // Системный пользователь
        actionType: operation,
        description: details || `Операция ${operation} для ${this.entityName}${entityId ? ` #${entityId}` : ''}`,
        relatedId: entityId,
        relatedType: this.entityName,
        entityType: this.entityName,
        entityId: entityId,
        metadata: {}
      });
    } catch (error) {
      console.error(`Ошибка при логировании операции ${operation}:`, error);
    }
  }
}