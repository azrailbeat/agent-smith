/**
 * Test Utilities
 * 
 * Вспомогательный модуль с утилитами для тестирования компонентов
 */

/**
 * Проверяет обработку обращения от гражданина с указанным действием
 * 
 * @param {Object} params - Параметры тестирования
 * @param {Object} params.request - Обращение гражданина
 * @param {string} params.action - Тип действия (classification, summarization, response_generation)
 * @param {Function} params.processFn - Функция обработки запроса
 * @param {number} params.agentId - ID агента для обработки
 * @returns {Promise<boolean>} Результат тестирования
 */
export async function testRequestProcessing(params) {
  const { request, action, processFn, agentId } = params;
  
  try {
    console.log(`Test: Processing request ${request.id} with action ${action}`);
    
    // Проверка входных параметров
    if (!request || !request.id) {
      console.error('Test failed: Invalid request object');
      return false;
    }
    
    if (!['classification', 'summarization', 'response_generation'].includes(action)) {
      console.error('Test failed: Invalid action type');
      return false;
    }
    
    if (!processFn || typeof processFn !== 'function') {
      console.error('Test failed: Process function is not defined');
      return false;
    }
    
    // Засекаем время выполнения
    const startTime = Date.now();
    
    // Выполняем обработку запроса
    const result = await processFn(request.id, action);
    
    // Проверяем результат
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    console.log(`Test completed in ${executionTime}ms`);
    console.log('Result:', result);
    
    return true;
  } catch (error) {
    console.error('Test failed with error:', error);
    return false;
  }
}

/**
 * Проверяет массовую обработку обращений граждан
 * 
 * @param {Object} params - Параметры тестирования
 * @param {Array} params.requests - Список обращений граждан
 * @param {Function} params.batchProcessFn - Функция массовой обработки
 * @param {Object} params.settings - Настройки обработки
 * @returns {Promise<boolean>} Результат тестирования
 */
export async function testBatchProcessing(params) {
  const { requests, batchProcessFn, settings } = params;
  
  try {
    console.log(`Test: Batch processing ${requests.length} requests`);
    
    // Проверка входных параметров
    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      console.error('Test failed: Invalid requests array');
      return false;
    }
    
    if (!batchProcessFn || typeof batchProcessFn !== 'function') {
      console.error('Test failed: Batch process function is not defined');
      return false;
    }
    
    if (!settings || !settings.agentId) {
      console.error('Test failed: Invalid settings object');
      return false;
    }
    
    // Засекаем время выполнения
    const startTime = Date.now();
    
    // Выполняем массовую обработку запросов
    const result = await batchProcessFn(settings);
    
    // Проверяем результат
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    console.log(`Test completed in ${executionTime}ms`);
    console.log('Result:', result);
    
    return true;
  } catch (error) {
    console.error('Test failed with error:', error);
    return false;
  }
}

/**
 * Проверяет валидность данных объекта обращения
 * 
 * @param {Object} request - Объект обращения гражданина
 * @returns {Object} Результат проверки {valid: boolean, errors: string[]}
 */
export function validateRequestObject(request) {
  const errors = [];
  
  // Проверка обязательных полей
  if (!request.id) errors.push('Missing id field');
  if (!request.fullName) errors.push('Missing fullName field');
  if (!request.contactInfo) errors.push('Missing contactInfo field');
  if (!request.requestType) errors.push('Missing requestType field');
  if (!request.subject) errors.push('Missing subject field');
  if (!request.description) errors.push('Missing description field');
  if (!request.status) errors.push('Missing status field');
  
  // Проверка типов данных
  if (request.id && typeof request.id !== 'number') errors.push('id must be a number');
  if (request.fullName && typeof request.fullName !== 'string') errors.push('fullName must be a string');
  if (request.contactInfo && typeof request.contactInfo !== 'string') errors.push('contactInfo must be a string');
  if (request.requestType && typeof request.requestType !== 'string') errors.push('requestType must be a string');
  if (request.subject && typeof request.subject !== 'string') errors.push('subject must be a string');
  if (request.description && typeof request.description !== 'string') errors.push('description must be a string');
  if (request.status && typeof request.status !== 'string') errors.push('status must be a string');
  if (request.priority && typeof request.priority !== 'string') errors.push('priority must be a string');
  
  return {
    valid: errors.length === 0,
    errors
  };
}