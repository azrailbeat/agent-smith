/**
 * Константы для типов AI агентов
 */

/**
 * Разрешенные типы агентов для тестирования
 * Только эти 4 ключевых типа агентов будут разрешены и отображены в интерфейсе
 */
export const ALLOWED_AGENT_TYPES = [
  'citizen_requests',  // AgentSmith - Анализ обращений
  'blockchain',        // BlockchainAgent - Блокчейн-агент
  'document_processing', // DocumentAI - Обработка документов
  'meeting_protocols'   // ProtocolMaster - Анализ протоколов
] as const;

/**
 * Тип для разрешенных типов агентов
 */
export type AllowedAgentType = typeof ALLOWED_AGENT_TYPES[number];

/**
 * Функция проверки разрешенного типа агента
 */
export function isAllowedAgentType(type: string): boolean {
  return (ALLOWED_AGENT_TYPES as readonly string[]).includes(type);
}
