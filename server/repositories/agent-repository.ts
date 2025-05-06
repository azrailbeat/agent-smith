/**
 * Репозиторий для работы с AI-агентами
 */

import { BaseRepository } from './base-repository';
import { storage } from '../storage';
import { Agent, InsertAgent } from '@shared/schema';
import { logActivity } from '../activity-logger';

export class AgentRepository extends BaseRepository<Agent, InsertAgent, Partial<InsertAgent>> {
  protected entityName = 'agent';

  /**
   * Получить всех агентов
   */
  async getAll(): Promise<Agent[]> {
    try {
      return await storage.getAgents();
    } catch (error) {
      console.error('Ошибка при получении списка агентов:', error);
      throw new Error('Не удалось загрузить список агентов');
    }
  }

  /**
   * Получить агента по ID
   */
  async getById(id: number): Promise<Agent | undefined> {
    try {
      return await storage.getAgent(id);
    } catch (error) {
      console.error(`Ошибка при получении агента #${id}:`, error);
      throw new Error(`Не удалось загрузить агента #${id}`);
    }
  }

  /**
   * Создать нового агента
   */
  async create(data: InsertAgent): Promise<Agent> {
    try {
      // Нормализуем кириллический текст в описании и промптах
      const normalizedData = this.normalizeAgentData(data);
      
      const agent = await storage.createAgent(normalizedData);
      await this.logOperation('create', agent.id, `Создан агент "${agent.name}"`);
      return agent;
    } catch (error) {
      console.error('Ошибка при создании агента:', error);
      throw new Error('Не удалось создать агента');
    }
  }

  /**
   * Обновить агента
   */
  async update(id: number, data: Partial<InsertAgent>): Promise<Agent | undefined> {
    try {
      // Проверяем, есть ли ссылки на этого агента в agent_results
      const hasReferences = await this.checkAgentReferences(id);
      
      if (hasReferences) {
        console.log(`Агент с ID ${id} имеет ссылки в результатах, обновляем существующую запись`);
        
        // Нормализуем кириллический текст в описании и промптах
        const normalizedData = this.normalizeAgentData(data);
        
        const updatedAgent = await storage.updateAgent(id, normalizedData);
        
        if (updatedAgent) {
          await this.logOperation('update', id, `Обновлен агент "${updatedAgent.name}"`);
          console.log(`Обновлен существующий агент ${updatedAgent.name} (ID: ${id})`);
        }
        
        return updatedAgent;
      } else {
        // Если нет ссылок, можно обновлять обычным способом
        // Нормализуем кириллический текст в описании и промптах
        const normalizedData = this.normalizeAgentData(data);
        
        const updatedAgent = await storage.updateAgent(id, normalizedData);
        
        if (updatedAgent) {
          await this.logOperation('update', id, `Обновлен агент "${updatedAgent.name}"`);
        }
        
        return updatedAgent;
      }
    } catch (error) {
      console.error(`Ошибка при обновлении агента #${id}:`, error);
      throw new Error(`Не удалось обновить агента #${id}`);
    }
  }

  /**
   * Удалить агента
   */
  async delete(id: number): Promise<boolean> {
    try {
      // Проверяем, есть ли ссылки на этого агента в agent_results
      const hasReferences = await this.checkAgentReferences(id);
      
      if (hasReferences) {
        console.log(`Пропускаем удаление агента с ID ${id} (есть ссылки в agent_results)`);
        return false;
      }
      
      const result = await storage.deleteAgent(id);
      
      if (result) {
        await this.logOperation('delete', id, `Удален агент #${id}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Ошибка при удалении агента #${id}:`, error);
      throw new Error(`Не удалось удалить агента #${id}`);
    }
  }

  /**
   * Получить агентов по типу
   */
  async getByType(type: string): Promise<Agent[]> {
    try {
      return await storage.getAgentsByType(type);
    } catch (error) {
      console.error(`Ошибка при получении агентов типа "${type}":`, error);
      throw new Error(`Не удалось получить агентов типа "${type}"`);
    }
  }

  /**
   * Получить агента по имени
   */
  async getByName(name: string): Promise<Agent | undefined> {
    try {
      return await storage.getAgentByName(name);
    } catch (error) {
      console.error(`Ошибка при получении агента по имени "${name}":`, error);
      throw new Error(`Не удалось получить агента по имени "${name}"`);
    }
  }

  /**
   * Проверить, есть ли ссылки на агента в результатах
   */
  private async checkAgentReferences(agentId: number): Promise<boolean> {
    try {
      // Получаем все результаты агентов
      const allResults = await storage.getAllAgentResults();
      
      // Проверяем, есть ли ссылки на данного агента
      return allResults.some(result => result.agentId === agentId);
    } catch (error) {
      console.error(`Ошибка при проверке ссылок для агента #${agentId}:`, error);
      return false; // В случае ошибки считаем, что ссылок нет
    }
  }

  /**
   * Нормализация данных агента (исправление кириллицы)
   */
  private normalizeAgentData(data: Partial<InsertAgent>): Partial<InsertAgent> {
    const normalized = { ...data };
    
    // Нормализуем описание
    if (normalized.description) {
      normalized.description = this.normalizeText(normalized.description);
    }
    
    // Нормализуем промпты
    if (normalized.prompts && typeof normalized.prompts === 'string') {
      normalized.prompts = this.normalizeText(normalized.prompts);
    }
    
    return normalized;
  }

  /**
   * Нормализация текста с кириллицей
   */
  private normalizeText(text: string): string {
    if (!text) return text;
    
    // Проверяем, что текст в UTF-8
    if (this.isValidUTF8(text)) {
      return text;
    }
    
    // Пытаемся декодировать текст, предполагая, что он в другой кодировке
    try {
      // Для простоты используем простую замену некорректных символов
      return text.replace(/[\uFFFD\uD800-\uDFFF]/g, '');
    } catch (e) {
      console.error('Ошибка при нормализации текста:', e);
      return text; // Возвращаем исходный текст в случае ошибки
    }
  }

  /**
   * Проверка валидности UTF-8 текста
   */
  private isValidUTF8(text: string): boolean {
    // Простая проверка на наличие некорректных символов UTF-8
    return !text.includes('\uFFFD');
  }
}

// Создаем экземпляр репозитория
export const agentRepository = new AgentRepository();