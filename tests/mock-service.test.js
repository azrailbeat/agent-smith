/**
 * Тесты для мок-сервисов
 */
const {
  MockCacheService,
  MockBlockchainService,
  MockActivityLoggerService,
  MockAgentService
} = require('./mocks/services-mock');

describe('Mock Service Tests', () => {
  describe('CacheService', () => {
    let cacheService;
    
    beforeEach(() => {
      cacheService = new MockCacheService();
    });
    
    test('should set and get value', async () => {
      const key = 'test_key';
      const value = { test: 'data' };
      
      await cacheService.set(key, value);
      const result = await cacheService.get(key);
      
      expect(result).toEqual(value);
    });
    
    test('should respect TTL', async () => {
      const key = 'ttl_test';
      const value = 'test_value';
      
      // Set with 1 second TTL
      await cacheService.set(key, value, 1);
      
      // Check immediately
      const immediate = await cacheService.get(key);
      expect(immediate).toBe(value);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Check after TTL expired
      const expired = await cacheService.get(key);
      expect(expired).toBeNull();
    });
    
    test('should delete value', async () => {
      const key = 'delete_test';
      
      await cacheService.set(key, 'test');
      
      // Confirm it's set
      expect(await cacheService.get(key)).toBe('test');
      
      // Delete it
      await cacheService.delete(key);
      
      // Check it's gone
      expect(await cacheService.get(key)).toBeNull();
    });
    
    test('should flush cache', async () => {
      // Set multiple values
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      
      // Confirm they're set
      expect(await cacheService.get('key1')).toBe('value1');
      expect(await cacheService.get('key2')).toBe('value2');
      
      // Flush cache
      await cacheService.flush();
      
      // Check all keys are gone
      expect(await cacheService.get('key1')).toBeNull();
      expect(await cacheService.get('key2')).toBeNull();
    });
  });
  
  describe('BlockchainService', () => {
    let blockchainService;
    
    beforeEach(() => {
      blockchainService = new MockBlockchainService();
    });
    
    test('should record data to blockchain', async () => {
      const data = {
        entityType: 'test',
        entityId: 123,
        action: 'test_action',
        metadata: { test: 'value' }
      };
      
      const hash = await blockchainService.recordToBlockchain(data);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.startsWith('0x')).toBe(true);
    });
    
    test('should get transaction status', async () => {
      // First record something
      const data = { entityType: 'test', entityId: 123, action: 'test_action' };
      const hash = await blockchainService.recordToBlockchain(data);
      
      // Now get status
      const status = await blockchainService.getTransactionStatus(hash);
      
      expect(status).toBeDefined();
      expect(status.status).toBe('confirmed');
      expect(status.timestamp).toBeDefined();
      expect(status.blockHeight).toBeDefined();
    });
    
    test('should get entity transactions', async () => {
      // Record multiple transactions for the same entity
      const entityType = 'test_entity';
      const entityId = 456;
      
      await blockchainService.recordToBlockchain({ 
        entityType, 
        entityId, 
        action: 'action1' 
      });
      
      await blockchainService.recordToBlockchain({
        entityType,
        entityId,
        action: 'action2'
      });
      
      // Get transactions
      const transactions = await blockchainService.getEntityTransactions(entityType, entityId);
      
      expect(transactions).toBeDefined();
      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBe(2);
      expect(transactions[0].entityType).toBe(entityType);
      expect(transactions[0].entityId).toBe(entityId);
    });
  });
  
  describe('ActivityLoggerService', () => {
    let activityLogger;
    
    beforeEach(() => {
      activityLogger = new MockActivityLoggerService();
    });
    
    test('should log activity', async () => {
      const activity = {
        action: 'test_action',
        details: 'Test activity',
        entityType: 'test',
        entityId: 123,
        userId: 1
      };
      
      const logged = await activityLogger.logActivity(activity);
      
      expect(logged).toBeDefined();
      expect(logged.id).toBeDefined();
      expect(logged.action).toBe(activity.action);
      expect(logged.timestamp).toBeDefined();
    });
    
    test('should get recent activities', async () => {
      // Clear previous activities to start fresh
      activityLogger.activities = [];
      
      // Log multiple activities in specific order
      await activityLogger.logActivity({ action: 'action1', details: 'Activity 1' });
      await activityLogger.logActivity({ action: 'action2', details: 'Activity 2' });
      await activityLogger.logActivity({ action: 'action3', details: 'Activity 3' });
      
      // Get recent activities
      const activities = await activityLogger.getRecentActivities(2);
      
      expect(activities).toBeDefined();
      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBe(2);
      expect(activities[0].action).toBe('action3'); // Most recent first
      expect(activities[1].action).toBe('action2'); // Second most recent
    });
    
    test('should get entity activities', async () => {
      const entityType = 'test_entity';
      const entityId = 789;
      
      // Log activities for the entity
      await activityLogger.logActivity({ 
        action: 'view', 
        entityType, 
        entityId 
      });
      
      await activityLogger.logActivity({
        action: 'update',
        entityType,
        entityId
      });
      
      // Log activity for different entity
      await activityLogger.logActivity({
        action: 'view',
        entityType: 'other_entity',
        entityId: 999
      });
      
      // Get entity activities
      const activities = await activityLogger.getEntityActivities(entityType, entityId);
      
      expect(activities).toBeDefined();
      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBe(2);
      expect(activities[0].entityType).toBe(entityType);
      expect(activities[0].entityId).toBe(entityId);
    });
    
    test('should log error', async () => {
      const error = new Error('Test error');
      const context = 'test_context';
      const userId = 1;
      
      const logged = await activityLogger.logError(error, context, userId);
      
      expect(logged).toBeDefined();
      expect(logged.action).toBe('error');
      expect(logged.details).toBe(error.message);
      expect(logged.userId).toBe(userId);
      expect(logged.metadata).toBeDefined();
      expect(logged.metadata.context).toBe(context);
    });
  });
  
  describe('AgentService', () => {
    let agentService;
    
    beforeEach(() => {
      agentService = new MockAgentService();
    });
    
    test('should get agent by type', async () => {
      const agent = await agentService.getAgentByType('citizen_requests');
      
      expect(agent).toBeDefined();
      expect(agent.type).toBe('citizen_requests');
      expect(agent.name).toBe('TestAgent');
    });
    
    test('should get agent by id', async () => {
      const agent = await agentService.getAgentById(1);
      
      expect(agent).toBeDefined();
      expect(agent.id).toBe(1);
      expect(agent.name).toBe('TestAgent');
    });
    
    test('should process with agent - classification', async () => {
      const data = {
        entityType: 'citizen_request',
        entityId: 1,
        subject: 'Test request',
        description: 'This is a test request'
      };
      
      const result = await agentService.processWithAgent(data, 'citizen_requests', 'classification');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.classification).toBeDefined();
      expect(result.data.confidence).toBeDefined();
    });
    
    test('should process with agent - summarization', async () => {
      const data = {
        entityType: 'citizen_request',
        entityId: 1,
        subject: 'Test request',
        description: 'This is a test request with a lot of content that needs summarization'
      };
      
      const result = await agentService.processWithAgent(data, 'citizen_requests', 'summarization');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.summary).toBeDefined();
    });
    
    test('should save and retrieve agent result', async () => {
      const testResult = {
        classification: 'test_category',
        confidence: 0.9
      };
      
      // Save result
      const saved = await agentService.saveAgentResult(
        testResult,
        1,
        'citizen_request',
        1,
        'classification'
      );
      
      expect(saved).toBeDefined();
      expect(saved.id).toBeDefined();
      
      // Get results
      const results = await agentService.getAgentResults(1);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.some(r => r.id === saved.id)).toBe(true);
    });
    
    test('should get entity results', async () => {
      // Create some results
      await agentService.saveAgentResult(
        { test: 'result1' },
        1,
        'test_entity',
        123,
        'test_action'
      );
      
      await agentService.saveAgentResult(
        { test: 'result2' },
        2,
        'test_entity',
        123,
        'other_action'
      );
      
      // Get entity results
      const results = await agentService.getEntityResults('test_entity', 123);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      expect(results[0].entityType).toBe('test_entity');
      expect(results[0].entityId).toBe(123);
      expect(results.some(r => r.agentId === 1)).toBe(true);
      expect(results.some(r => r.agentId === 2)).toBe(true);
    });
  });
});