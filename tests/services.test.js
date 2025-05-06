const { AgentService } = require('../server/services/agent-service');
const { BlockchainService } = require('../server/services/blockchain');
const { ActivityLogger } = require('../server/services/activity-logger');
const { CacheService } = require('../server/services/cache-service');
const { db } = require('../server/db');

describe('Service Tests', () => {
  // Подготовка перед всеми тестами
  beforeAll(async () => {
    console.log('Service tests starting...');
  });

  // Очистка после всех тестов
  afterAll(async () => {
    console.log('Service tests completed');
    await db.end();
  });

  describe('AgentService', () => {
    let agentService;
    
    beforeEach(() => {
      agentService = new AgentService();
    });

    test('should initialize agent service', async () => {
      expect(agentService).toBeDefined();
    });

    test('should get agent by type', async () => {
      const agent = await agentService.getAgentByType('citizen_requests');
      
      expect(agent).toBeDefined();
      expect(agent.type).toBe('citizen_requests');
    });

    test('should process data with agent', async () => {
      // Создаем тестовые данные
      const testData = {
        subject: 'Тестовый запрос',
        description: 'Описание тестового запроса для обработки агентом'
      };
      
      // Получаем агента для гражданских запросов
      const agent = await agentService.getAgentByType('citizen_requests');
      
      // Обрабатываем данные с агентом
      const result = await agentService.processWithAgent(testData, 'citizen_requests', 'classification');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('should save agent result', async () => {
      // Тестовые данные для результата
      const testResult = {
        classification: 'test_category',
        confidence: 0.85
      };
      
      // Получаем агента для сохранения результата
      const agent = await agentService.getAgentByType('citizen_requests');
      
      // Сохраняем результат
      const savedResult = await agentService.saveAgentResult(
        testResult,
        agent.id,
        'citizen_request',
        1,
        'classification'
      );
      
      expect(savedResult).toBeDefined();
      expect(savedResult.id).toBeDefined();
      expect(savedResult.agentId).toBe(agent.id);
    });
  });

  describe('BlockchainService', () => {
    let blockchainService;
    
    beforeEach(() => {
      blockchainService = new BlockchainService();
    });

    test('should initialize blockchain service', async () => {
      expect(blockchainService).toBeDefined();
    });

    test('should record data to blockchain', async () => {
      // Тестовые данные для записи в блокчейн
      const testData = {
        entityType: 'test_entity',
        entityId: 999,
        action: 'test_action',
        userId: 1,
        metadata: {
          testField: 'testValue'
        }
      };
      
      // Записываем данные в блокчейн
      const transactionHash = await blockchainService.recordToBlockchain(testData);
      
      expect(transactionHash).toBeDefined();
      expect(typeof transactionHash).toBe('string');
    });

    test('should get transaction status', async () => {
      // Тестовые данные для записи в блокчейн
      const testData = {
        entityType: 'test_entity',
        entityId: 999,
        action: 'test_action',
        userId: 1,
        metadata: {
          testField: 'testValue'
        }
      };
      
      // Записываем данные в блокчейн
      const transactionHash = await blockchainService.recordToBlockchain(testData);
      
      // Получаем статус транзакции
      const status = await blockchainService.getTransactionStatus(transactionHash);
      
      expect(status).toBeDefined();
      expect(status.status).toBeDefined();
    });

    test('should get entity transactions', async () => {
      // Тестовые данные для записи в блокчейн
      const testData = {
        entityType: 'test_entity',
        entityId: 1000,
        action: 'test_action',
        userId: 1,
        metadata: {
          testField: 'testValue'
        }
      };
      
      // Записываем данные в блокчейн
      await blockchainService.recordToBlockchain(testData);
      
      // Получаем транзакции для сущности
      const transactions = await blockchainService.getEntityTransactions('test_entity', 1000);
      
      expect(transactions).toBeDefined();
      expect(Array.isArray(transactions)).toBe(true);
    });
  });

  describe('ActivityLogger', () => {
    let activityLogger;
    
    beforeEach(() => {
      activityLogger = new ActivityLogger();
    });

    test('should initialize activity logger', async () => {
      expect(activityLogger).toBeDefined();
    });

    test('should log activity', async () => {
      // Тестовые данные для логирования
      const testActivity = {
        action: 'test_action',
        entityType: 'test_entity',
        entityId: 777,
        userId: 1,
        details: 'Тестовая активность для проверки логирования',
        metadata: {
          testField: 'testValue'
        }
      };
      
      // Логируем активность
      await activityLogger.logActivity(testActivity);
      
      // Получаем последние активности
      const activities = await activityLogger.getRecentActivities(10);
      
      expect(activities).toBeDefined();
      expect(Array.isArray(activities)).toBe(true);
      
      // Проверяем, есть ли наша тестовая активность в списке
      const found = activities.some(a => 
        a.action === testActivity.action && 
        a.entityType === testActivity.entityType && 
        a.entityId === testActivity.entityId
      );
      
      expect(found).toBe(true);
    });

    test('should get entity activities', async () => {
      // Тестовые данные для логирования
      const testActivity = {
        action: 'test_action',
        entityType: 'test_entity',
        entityId: 888,
        userId: 1,
        details: 'Тестовая активность для проверки логирования сущности',
        metadata: {
          testField: 'testValue'
        }
      };
      
      // Логируем активность
      await activityLogger.logActivity(testActivity);
      
      // Получаем активности для сущности
      const activities = await activityLogger.getEntityActivities('test_entity', 888);
      
      expect(activities).toBeDefined();
      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBeGreaterThan(0);
    });

    test('should get user activities', async () => {
      // Тестовые данные для логирования
      const testActivity = {
        action: 'test_action',
        entityType: 'test_entity',
        entityId: 999,
        userId: 2, // Уникальный ID пользователя для теста
        details: 'Тестовая активность для проверки логирования пользователя',
        metadata: {
          testField: 'testValue'
        }
      };
      
      // Логируем активность
      await activityLogger.logActivity(testActivity);
      
      // Получаем активности пользователя
      const activities = await activityLogger.getUserActivities(2);
      
      expect(activities).toBeDefined();
      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBeGreaterThan(0);
    });
  });

  describe('CacheService', () => {
    let cacheService;
    
    beforeEach(() => {
      cacheService = new CacheService();
    });

    test('should initialize cache service', async () => {
      expect(cacheService).toBeDefined();
    });

    test('should set and get value from cache', async () => {
      const testKey = 'test_key';
      const testValue = { test: 'value' };
      
      // Устанавливаем значение в кэш
      await cacheService.set(testKey, testValue);
      
      // Получаем значение из кэша
      const value = await cacheService.get(testKey);
      
      expect(value).toBeDefined();
      expect(value).toEqual(testValue);
    });

    test('should delete value from cache', async () => {
      const testKey = 'test_key_to_delete';
      const testValue = { test: 'value_to_delete' };
      
      // Устанавливаем значение в кэш
      await cacheService.set(testKey, testValue);
      
      // Удаляем значение из кэша
      await cacheService.delete(testKey);
      
      // Пытаемся получить удаленное значение
      const value = await cacheService.get(testKey);
      
      expect(value).toBeNull();
    });

    test('should flush cache', async () => {
      const testKey1 = 'test_key1';
      const testKey2 = 'test_key2';
      
      // Устанавливаем значения в кэш
      await cacheService.set(testKey1, 'value1');
      await cacheService.set(testKey2, 'value2');
      
      // Проверяем, что значения установлены
      expect(await cacheService.get(testKey1)).toBe('value1');
      expect(await cacheService.get(testKey2)).toBe('value2');
      
      // Очищаем весь кэш
      await cacheService.flush();
      
      // Проверяем, что значения удалены
      expect(await cacheService.get(testKey1)).toBeNull();
      expect(await cacheService.get(testKey2)).toBeNull();
    });

    test('should respect TTL for cached values', async () => {
      const testKey = 'test_key_ttl';
      const testValue = 'test_value_ttl';
      
      // Устанавливаем значение с TTL в 1 секунду
      await cacheService.set(testKey, testValue, 1);
      
      // Сразу проверяем, значение должно быть доступно
      expect(await cacheService.get(testKey)).toBe(testValue);
      
      // Ждем 1.5 секунды, значение должно истечь
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Проверяем, что значение удалено по истечении TTL
      expect(await cacheService.get(testKey)).toBeNull();
    });
  });
});