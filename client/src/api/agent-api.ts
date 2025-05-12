/**
 * Клиент API для управления агентами
 */

import { queryClient } from '@/lib/queryClient';

// Интерфейсы для типизации агентов
export interface Agent {
  id: number;
  name: string;
  type: string;
  model: string;
  description?: string;
  isActive: boolean;
  systemPrompt?: string;
  config?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentData {
  name: string;
  type: string;
  model: string;
  description?: string;
  isActive?: boolean;
  systemPrompt?: string;
  config?: Record<string, any>;
}

export interface UpdateAgentData {
  name?: string;
  model?: string;
  description?: string;
  isActive?: boolean;
  systemPrompt?: string;
  config?: Record<string, any>;
}

// Типы агентов в системе
export enum AgentType {
  CITIZEN_REQUESTS = 'citizen_requests',
  BLOCKCHAIN = 'blockchain',
  DOCUMENT_ANALYSIS = 'document_analysis',
  MEETING_PROTOCOLS = 'meeting_protocols'
}

/**
 * Получение всех агентов
 */
export async function getAllAgents(): Promise<Agent[]> {
  const response = await fetch('/api/agents');
  if (!response.ok) {
    throw new Error(`Ошибка при получении агентов: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Получение агента по ID
 */
export async function getAgentById(id: number): Promise<Agent> {
  const response = await fetch(`/api/agents/${id}`);
  if (!response.ok) {
    throw new Error(`Ошибка при получении агента: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Получение агентов по типу
 */
export async function getAgentsByType(type: AgentType | string): Promise<Agent[]> {
  const response = await fetch(`/api/agents/type/${type}`);
  if (!response.ok) {
    throw new Error(`Ошибка при получении агентов по типу: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Получение активных агентов
 */
export async function getActiveAgents(): Promise<Agent[]> {
  const response = await fetch('/api/agents/active');
  if (!response.ok) {
    throw new Error(`Ошибка при получении активных агентов: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Получение активных агентов по типу
 */
export async function getActiveAgentsByType(type: AgentType | string): Promise<Agent[]> {
  const response = await fetch(`/api/agents/active/${type}`);
  if (!response.ok) {
    throw new Error(`Ошибка при получении активных агентов по типу: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Создание нового агента
 */
export async function createAgent(data: CreateAgentData): Promise<Agent> {
  const response = await fetch('/api/agents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Ошибка при создании агента: ${response.statusText}`);
  }

  // Инвалидируем кеш для всех запросов к агентам
  queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
  
  return response.json();
}

/**
 * Обновление агента
 */
export async function updateAgent(id: number, data: UpdateAgentData): Promise<Agent> {
  const response = await fetch(`/api/agents/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Ошибка при обновлении агента: ${response.statusText}`);
  }

  // Инвалидируем кеш для всех запросов к агентам
  queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
  
  return response.json();
}

/**
 * Изменение статуса активности агента
 */
export async function toggleAgentStatus(id: number, isActive: boolean): Promise<Agent> {
  const response = await fetch(`/api/agents/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isActive }),
  });

  if (!response.ok) {
    throw new Error(`Ошибка при изменении статуса агента: ${response.statusText}`);
  }

  // Инвалидируем кеш для всех запросов к агентам
  queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
  
  return response.json();
}

/**
 * Удаление агента
 */
export async function deleteAgent(id: number): Promise<void> {
  const response = await fetch(`/api/agents/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Ошибка при удалении агента: ${response.statusText}`);
  }

  // Инвалидируем кеш для всех запросов к агентам
  queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
}