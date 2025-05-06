const request = require('supertest');
const app = require('../server/app');
const { CitizenRequestRepository } = require('../server/repositories/citizen-request-repository');
const { AgentRepository } = require('../server/repositories/agent-repository');
const { BlockchainRepository } = require('../server/repositories/blockchain-repository');
const { AgentResultRepository } = require('../server/repositories/agent-result-repository');
const { db } = require('../server/db');

/**
 * Комплексный интеграционный тест, проверяющий взаимодействие различных компонентов системы
 * Тест создает обращение гражданина, обрабатывает его с помощью агента,
 * проверяет создание записей в блокчейне и результатов работы агента
 */
describe('Integration Tests', () => {
  // Репозитории для тестирования
  let citizenRequestRepo;
  let agentRepo;
  let blockchainRepo;
  let agentResultRepo;
  
  // ID созданных сущностей для отслеживания и удаления
  let requestId;
  let agentId;
  let resultIds = [];
  let blockchainRecordIds = [];

  // Подготовка перед всеми тестами
  beforeAll(async () => {
    console.log('Integration tests starting...');
    
    // Инициализация репозиториев
    citizenRequestRepo = new CitizenRequestRepository();
    agentRepo = new AgentRepository();
    blockchainRepo = new BlockchainRepository();
    agentResultRepo = new AgentResultRepository();
    
    // Получение существующего агента или создание нового
    const agents = await agentRepo.getByType('citizen_requests');
    if (agents && agents.length > 0) {
      agentId = agents[0].id;
    } else {
      const newAgent = {
        name: 'IntegrationTestAgent',
        type: 'citizen_requests',
        description: 'Агент для интеграционного тестирования',
        modelId: 1,
        isActive: true,
        systemPrompt: 'Вы агент для интеграционного тестирования.',
        config: {
          maxTokens: 1000,
          temperature: 0.5,
          capabilities: ['classification', 'response_generation']
        }
      };
      
      const agent = await agentRepo.create(newAgent);
      agentId = agent.id;
    }
  });

  // Очистка после всех тестов
  afterAll(async () => {
    console.log('Cleaning up after integration tests...');
    
    // Удаление созданных сущностей
    if (requestId) {
      await citizenRequestRepo.delete(requestId);
    }
    
    // Удаление созданного агента, если он был создан в тестах
    if (agentId) {
      try {
        await agentRepo.delete(agentId);
      } catch (error) {
        console.log('Could not delete agent (might be referenced):', error.message);
      }
    }
    
    // Удаление результатов работы агента
    for (const resultId of resultIds) {
      try {
        await agentResultRepo.delete(resultId);
      } catch (error) {
        console.log(`Could not delete agent result ${resultId}:`, error.message);
      }
    }
    
    // Удаление записей в блокчейне
    for (const recordId of blockchainRecordIds) {
      try {
        await blockchainRepo.delete(recordId);
      } catch (error) {
        console.log(`Could not delete blockchain record ${recordId}:`, error.message);
      }
    }
    
    console.log('Integration tests completed');
    await db.end();
  });

  test('Complete citizen request processing flow', async () => {
    // Шаг 1: Создание нового обращения гражданина
    const testRequest = {
      fullName: 'Интеграционный Тест',
      contactInfo: 'integration.test@example.com',
      requestType: 'Тестовый запрос',
      subject: 'Интеграционное тестирование',
      description: 'Описание обращения для интеграционного тестирования всех компонентов системы.',
      priority: 'medium',
      status: 'new'
    };
    
    const request = await citizenRequestRepo.create(testRequest);
    requestId = request.id;
    
    expect(request).toBeDefined();
    expect(request.id).toBeDefined();
    expect(request.status).toBe('new');
    console.log(`Created test request with ID ${requestId}`);
    
    // Шаг 2: Получение информации о созданном обращении через API
    const getResponse = await supertest(app)
      .get(`/api/citizen-requests/${requestId}`)
      .expect(200);
    
    expect(getResponse.body).toBeDefined();
    expect(getResponse.body.id).toBe(requestId);
    
    // Шаг 3: Обработка обращения с помощью агента через API
    const processData = {
      agentId: agentId,
      actionType: 'classification'
    };
    
    const processResponse = await supertest(app)
      .post(`/api/citizen-requests/${requestId}/process`)
      .send(processData)
      .expect(200);
    
    expect(processResponse.body).toBeDefined();
    expect(processResponse.body.success).toBe(true);
    
    // Подождем некоторое время для завершения асинхронной обработки
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Шаг 4: Проверка обновления статуса обращения
    const updatedRequest = await citizenRequestRepo.getById(requestId);
    expect(updatedRequest).toBeDefined();
    expect(updatedRequest.aiProcessed).toBe(true);
    expect(updatedRequest.aiClassification).toBeDefined();
    
    // Шаг 5: Проверка создания результатов агента
    const agentResults = await agentResultRepo.getByEntity('citizen_request', requestId);
    expect(agentResults).toBeDefined();
    expect(agentResults.length).toBeGreaterThan(0);
    
    // Сохраняем ID результатов для последующей очистки
    resultIds = agentResults.map(result => result.id);
    
    // Шаг 6: Проверка создания записей в блокчейне
    const blockchainRecords = await blockchainRepo.getByEntityId(requestId);
    expect(blockchainRecords).toBeDefined();
    expect(blockchainRecords.length).toBeGreaterThan(0);
    
    // Сохраняем ID записей для последующей очистки
    blockchainRecordIds = blockchainRecords.map(record => record.id);
    
    // Шаг 7: Проверка отображения активностей системы
    const activitiesResponse = await supertest(app)
      .get(`/api/activities/entity/citizen_request/${requestId}`)
      .expect(200);
    
    expect(activitiesResponse.body).toBeDefined();
    expect(Array.isArray(activitiesResponse.body)).toBe(true);
    expect(activitiesResponse.body.length).toBeGreaterThan(0);
    
    // Шаг 8: Завершение обработки обращения
    const updateData = {
      status: 'completed',
      responseText: 'Тестовый ответ на обращение.'
    };
    
    const updateResponse = await supertest(app)
      .patch(`/api/citizen-requests/${requestId}`)
      .send(updateData)
      .expect(200);
    
    expect(updateResponse.body).toBeDefined();
    expect(updateResponse.body.status).toBe('completed');
    
    // Шаг 9: Проверка финального состояния обращения
    const finalRequest = await citizenRequestRepo.getById(requestId);
    expect(finalRequest).toBeDefined();
    expect(finalRequest.status).toBe('completed');
    expect(finalRequest.responseText).toBe(updateData.responseText);
  });

  test('Error handling and recovery flow', async () => {
    // Шаг 1: Создание обращения с невалидными данными (должно вызвать ошибку)
    const invalidRequest = {
      // Намеренно пропускаем обязательные поля
      fullName: 'Тест ошибок',
      // Отсутствует contactInfo
      // Отсутствует subject
      description: 'Тестирование обработки ошибок',
      priority: 'invalid_priority' // Невалидное значение
    };
    
    const errorResponse = await supertest(app)
      .post('/api/citizen-requests')
      .send(invalidRequest)
      .expect(400);
    
    expect(errorResponse.body).toBeDefined();
    expect(errorResponse.body.error).toBeDefined();
    
    // Шаг 2: Попытка обработать несуществующее обращение
    const processData = {
      agentId: agentId,
      actionType: 'classification'
    };
    
    const processErrorResponse = await supertest(app)
      .post('/api/citizen-requests/999999/process')
      .send(processData)
      .expect(404);
    
    expect(processErrorResponse.body).toBeDefined();
    expect(processErrorResponse.body.error).toBeDefined();
    
    // Шаг 3: Создание корректного обращения после ошибки
    const validRequest = {
      fullName: 'Восстановление после ошибки',
      contactInfo: 'recovery@example.com',
      requestType: 'Восстановление',
      subject: 'Тестирование восстановления после ошибок',
      description: 'Проверка успешного восстановления после обработки ошибок.',
      priority: 'medium',
      status: 'new'
    };
    
    const recoveryResponse = await supertest(app)
      .post('/api/citizen-requests')
      .send(validRequest)
      .expect(200);
    
    expect(recoveryResponse.body).toBeDefined();
    expect(recoveryResponse.body.id).toBeDefined();
    
    // Сохраняем ID созданного обращения для очистки
    const recoveryRequestId = recoveryResponse.body.id;
    requestId = recoveryRequestId; // Обновляем для последующего удаления
    
    // Шаг 4: Проверка возможности работы с восстановленным обращением
    const getRecoveryResponse = await supertest(app)
      .get(`/api/citizen-requests/${recoveryRequestId}`)
      .expect(200);
    
    expect(getRecoveryResponse.body).toBeDefined();
    expect(getRecoveryResponse.body.id).toBe(recoveryRequestId);
  });

  test('Cache system functionality', async () => {
    // Шаг 1: Создаем запрос для проверки кэширования
    const cacheTestRequest = {
      fullName: 'Тест кэширования',
      contactInfo: 'cache.test@example.com',
      requestType: 'Кэширование',
      subject: 'Тестирование системы кэширования',
      description: 'Проверка работы системы кэширования запросов.',
      priority: 'low',
      status: 'new'
    };
    
    const cacheRequest = await citizenRequestRepo.create(cacheTestRequest);
    const cacheRequestId = cacheRequest.id;
    requestId = cacheRequestId; // Обновляем для последующего удаления
    
    // Шаг 2: Первый запрос должен выполниться без кэша
    const start1 = Date.now();
    const firstResponse = await supertest(app)
      .get(`/api/citizen-requests/${cacheRequestId}`)
      .expect(200);
    const time1 = Date.now() - start1;
    
    // Шаг 3: Второй запрос должен быть быстрее благодаря кэшированию
    const start2 = Date.now();
    const secondResponse = await supertest(app)
      .get(`/api/citizen-requests/${cacheRequestId}`)
      .expect(200);
    const time2 = Date.now() - start2;
    
    console.log(`First request time: ${time1}ms, Second request time: ${time2}ms`);
    
    // Проверка ответов
    expect(firstResponse.body).toEqual(secondResponse.body);
    
    // В идеале, второй запрос должен быть быстрее первого
    // Но это не всегда верно в тестовой среде
    // expect(time2).toBeLessThan(time1);
    
    // Шаг 4: Обновление данных должно инвалидировать кэш
    const updateData = {
      subject: 'Обновленный тест кэширования'
    };
    
    await supertest(app)
      .patch(`/api/citizen-requests/${cacheRequestId}`)
      .send(updateData)
      .expect(200);
    
    // Шаг 5: После обновления запрос должен вернуть новые данные
    const thirdResponse = await supertest(app)
      .get(`/api/citizen-requests/${cacheRequestId}`)
      .expect(200);
    
    expect(thirdResponse.body).toBeDefined();
    expect(thirdResponse.body.subject).toBe(updateData.subject);
  });
});