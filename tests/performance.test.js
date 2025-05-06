const request = require('supertest');
const app = require('../server/app');
const { CitizenRequestRepository } = require('../server/repositories/citizen-request-repository');
const { AgentRepository } = require('../server/repositories/agent-repository');
const { BlockchainRepository } = require('../server/repositories/blockchain-repository');
const { AgentResultRepository } = require('../server/repositories/agent-result-repository');
const { CacheService } = require('../server/services/cache-service');
const { db } = require('../server/db');

/**
 * Тесты производительности для оценки эффективности системы под нагрузкой
 * Проверяют время отклика API, эффективность кэширования и обработку параллельных запросов
 */
describe('Performance Tests', () => {
  let requestIds = [];
  const citizenRequestRepo = new CitizenRequestRepository();
  const cacheService = new CacheService();
  
  // Время, которое считается приемлемым для отклика API (в мс)
  const ACCEPTABLE_RESPONSE_TIME = 500;
  
  // Подготовка перед всеми тестами
  beforeAll(async () => {
    console.log('Performance tests starting...');
    
    // Создаем несколько тестовых запросов для тестирования производительности
    for (let i = 0; i < 5; i++) {
      const testRequest = {
        fullName: `Тест производительности ${i}`,
        contactInfo: `perf.test${i}@example.com`,
        requestType: 'Тест производительности',
        subject: `Тестирование производительности ${i}`,
        description: `Описание для тестирования производительности системы #${i}.`,
        priority: 'medium',
        status: 'new'
      };
      
      const request = await citizenRequestRepo.create(testRequest);
      requestIds.push(request.id);
    }
  });
  
  // Очистка после всех тестов
  afterAll(async () => {
    console.log('Cleaning up after performance tests...');
    
    // Удаление созданных тестовых запросов
    for (const requestId of requestIds) {
      await citizenRequestRepo.delete(requestId);
    }
    
    // Очистка кэша
    await cacheService.flush();
    
    console.log('Performance tests completed');
    await db.end();
  });
  
  // Тест на скорость отклика API
  test('API response time should be acceptable', async () => {
    const endpoints = [
      '/api/citizen-requests',
      '/api/agents',
      '/api/blockchain/records',
      '/api/activities',
      '/api/system/status'
    ];
    
    for (const endpoint of endpoints) {
      const start = Date.now();
      await request(app).get(endpoint);
      const responseTime = Date.now() - start;
      
      console.log(`Endpoint ${endpoint} response time: ${responseTime}ms`);
      expect(responseTime).toBeLessThan(ACCEPTABLE_RESPONSE_TIME);
    }
  });
  
  // Тест на эффективность кэширования
  test('Caching should improve response time', async () => {
    if (requestIds.length === 0) return;
    
    const requestId = requestIds[0];
    
    // Первый запрос (без кэша)
    const start1 = Date.now();
    await request(app).get(`/api/citizen-requests/${requestId}`);
    const time1 = Date.now() - start1;
    
    // Второй запрос (должен использовать кэш)
    const start2 = Date.now();
    await request(app).get(`/api/citizen-requests/${requestId}`);
    const time2 = Date.now() - start2;
    
    console.log(`Without cache: ${time1}ms, With cache: ${time2}ms`);
    
    // Второй запрос должен быть значительно быстрее
    expect(time2).toBeLessThan(time1 * 0.8); // Должен быть как минимум на 20% быстрее
  });
  
  // Тест на обработку параллельных запросов
  test('System should handle parallel requests efficiently', async () => {
    const numRequests = 10;
    const endpoint = '/api/citizen-requests';
    
    const start = Date.now();
    
    // Создаем массив промисов для параллельных запросов
    const promises = Array(numRequests).fill().map(() => 
      request(app).get(endpoint)
    );
    
    // Ждем завершения всех запросов
    await Promise.all(promises);
    
    const totalTime = Date.now() - start;
    const avgTimePerRequest = totalTime / numRequests;
    
    console.log(`Processed ${numRequests} parallel requests in ${totalTime}ms (avg: ${avgTimePerRequest}ms per request)`);
    
    // Среднее время на запрос должно быть приемлемым
    expect(avgTimePerRequest).toBeLessThan(ACCEPTABLE_RESPONSE_TIME);
  });
  
  // Тест на эффективность обновления кэша при изменении данных
  test('Cache should be invalidated correctly after updates', async () => {
    if (requestIds.length === 0) return;
    
    const requestId = requestIds[0];
    
    // Первый запрос (загрузка в кэш)
    await request(app).get(`/api/citizen-requests/${requestId}`);
    
    // Обновление данных
    const updateData = {
      subject: `Updated subject ${Date.now()}`
    };
    
    await request(app)
      .patch(`/api/citizen-requests/${requestId}`)
      .send(updateData);
    
    // Запрос после обновления
    const response = await request(app).get(`/api/citizen-requests/${requestId}`);
    
    // Проверяем, что получили обновленные данные, а не кэшированные
    expect(response.body.subject).toBe(updateData.subject);
  });
  
  // Тест на эффективность запросов с фильтрацией
  test('Filtered queries should perform efficiently', async () => {
    // Запрос с фильтрацией по статусу
    const start1 = Date.now();
    await request(app).get('/api/citizen-requests?status=new');
    const time1 = Date.now() - start1;
    
    // Запрос с фильтрацией по приоритету
    const start2 = Date.now();
    await request(app).get('/api/citizen-requests?priority=medium');
    const time2 = Date.now() - start2;
    
    console.log(`Filter by status time: ${time1}ms, Filter by priority time: ${time2}ms`);
    
    // Время выполнения запросов с фильтрацией должно быть приемлемым
    expect(time1).toBeLessThan(ACCEPTABLE_RESPONSE_TIME);
    expect(time2).toBeLessThan(ACCEPTABLE_RESPONSE_TIME);
  });
  
  // Тест на нагрузку системы блокчейна
  test('Blockchain system should handle multiple records efficiently', async () => {
    if (requestIds.length === 0) return;
    
    const requestId = requestIds[0];
    
    // Создаем несколько последовательных запросов к блокчейну
    const start = Date.now();
    
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post(`/api/blockchain/record`)
        .send({
          entityType: 'performance_test',
          entityId: requestId,
          action: `test_action_${i}`,
          metadata: { test: `value_${i}` }
        });
    }
    
    const totalTime = Date.now() - start;
    
    console.log(`Created 3 blockchain records in ${totalTime}ms (avg: ${totalTime / 3}ms per record)`);
    
    // Суммарное время должно быть приемлемым
    expect(totalTime).toBeLessThan(ACCEPTABLE_RESPONSE_TIME * 3);
  });
});