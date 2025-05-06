/**
 * Тестовый раннер для проверки функциональности обработки обращений граждан
 */

import { testRequestProcessing, testBatchProcessing, validateRequestObject } from '../utils/test-utils';
import { apiRequest } from '../lib/queryClient';

/**
 * Функция для ручного запуска тестов из консоли браузера
 * @param {string} testType - Тип теста для запуска ('processing' | 'batch' | 'validation')
 */
export async function runTests(testType = 'all') {
  console.log('Starting tests for citizen request processing...');
  
  try {
    // Получаем список обращений
    const requests = await apiRequest('GET', '/api/citizen-requests');
    if (!requests || !requests.length) {
      console.error('No requests found for testing');
      return;
    }
    
    // Получаем список агентов
    const agents = await apiRequest('GET', '/api/agents');
    if (!agents || !agents.length) {
      console.error('No agents found for testing');
      return;
    }
    
    // Находим агента для обработки обращений граждан
    const citizenRequestAgent = agents.find(agent => agent.type === 'citizen_requests');
    if (!citizenRequestAgent) {
      console.error('No citizen request agent found');
      return;
    }
    
    console.log('Found agent for testing:', citizenRequestAgent.name, `(ID: ${citizenRequestAgent.id})`);
    
    // Запуск тестов в зависимости от выбранного типа
    if (testType === 'all' || testType === 'validation') {
      console.log('\n=== Running validation tests ===');
      runValidationTests(requests);
    }
    
    if (testType === 'all' || testType === 'processing') {
      console.log('\n=== Running single request processing tests ===');
      await runProcessingTests(requests[0], citizenRequestAgent.id);
    }
    
    if (testType === 'all' || testType === 'batch') {
      console.log('\n=== Running batch processing tests ===');
      await runBatchTests(requests, citizenRequestAgent.id);
    }
    
    console.log('\n=== All tests completed ===');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

/**
 * Запуск тестов валидации объектов обращений
 * @param {Array} requests - Список обращений граждан
 */
function runValidationTests(requests) {
  console.log(`Testing validation of ${requests.length} request objects...`);
  
  let validCount = 0;
  let invalidCount = 0;
  
  requests.forEach((request, index) => {
    const { valid, errors } = validateRequestObject(request);
    
    if (valid) {
      validCount++;
    } else {
      invalidCount++;
      console.warn(`Request #${request.id} validation failed:`, errors);
    }
  });
  
  console.log(`Validation results: ${validCount} valid, ${invalidCount} invalid requests`);
}

/**
 * Запуск тестов обработки одиночного обращения
 * @param {Object} request - Обращение гражданина
 * @param {number} agentId - ID агента для обработки
 */
async function runProcessingTests(request, agentId) {
  console.log(`Testing processing of request #${request.id}...`);
  
  // Функция для обработки обращения
  const processFn = async (requestId, action) => {
    try {
      const result = await apiRequest('POST', `/api/citizen-requests/${requestId}/process`, {
        actionType: action,
        agentId
      });
      return result;
    } catch (error) {
      console.error(`Error processing request #${requestId}:`, error);
      throw error;
    }
  };
  
  // Тест классификации
  console.log('\nTesting classification...');
  await testRequestProcessing({
    request,
    action: 'classification',
    processFn,
    agentId
  });
  
  // Тест резюмирования
  console.log('\nTesting summarization...');
  await testRequestProcessing({
    request,
    action: 'summarization',
    processFn,
    agentId
  });
  
  // Тест генерации ответа
  console.log('\nTesting response generation...');
  await testRequestProcessing({
    request,
    action: 'response_generation',
    processFn,
    agentId
  });
}

/**
 * Запуск тестов массовой обработки обращений
 * @param {Array} requests - Список обращений граждан
 * @param {number} agentId - ID агента для обработки
 */
async function runBatchTests(requests, agentId) {
  console.log(`Testing batch processing of ${requests.length} requests...`);
  
  // Функция для массовой обработки обращений
  const batchProcessFn = async (settings) => {
    try {
      const result = await apiRequest('POST', '/api/citizen-requests/process-batch', settings);
      return result;
    } catch (error) {
      console.error('Error batch processing requests:', error);
      throw error;
    }
  };
  
  // Настройки для массовой обработки
  const settings = {
    agentId,
    autoProcess: true,
    autoClassify: true,
    autoRespond: false
  };
  
  // Запуск теста массовой обработки
  await testBatchProcessing({
    requests,
    batchProcessFn,
    settings
  });
}

// Экспортируем функцию для вызова из консоли
window.runCitizenRequestTests = runTests;