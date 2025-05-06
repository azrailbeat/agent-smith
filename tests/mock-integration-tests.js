/**
 * Интеграционные тесты с использованием мок-объектов
 */
const {
  MockAgentRepository,
  MockCitizenRequestRepository,
  MockAgentResultRepository,
  MockBlockchainRepository,
  MockActivityRepository
} = require('./mocks/repositories-mock');

const {
  MockCacheService,
  MockBlockchainService,
  MockActivityLoggerService,
  MockAgentService
} = require('./mocks/services-mock');

describe('Mock Integration Tests', () => {
  // Инициализация репозиториев и сервисов
  const agentRepo = new MockAgentRepository();
  const requestRepo = new MockCitizenRequestRepository();
  const resultRepo = new MockAgentResultRepository();
  const blockchainRepo = new MockBlockchainRepository();
  const activityRepo = new MockActivityRepository();
  
  const cacheService = new MockCacheService();
  const blockchainService = new MockBlockchainService();
  const activityLogger = new MockActivityLoggerService();
  const agentService = new MockAgentService();
  
  describe('Citizen Request Processing Flow', () => {
    let requestId;
    
    test('should create a new citizen request', async () => {
      const request = {
        fullName: 'Integration Test Citizen',
        contactInfo: 'integration.test@example.com',
        requestType: 'Integration Test',
        subject: 'Integration test request',
        description: 'This is a request for testing integration between components',
        status: 'new',
        priority: 'medium'
      };
      
      const created = await requestRepo.create(request);
      requestId = created.id;
      
      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.status).toBe('new');
      
      // Log the activity
      await activityLogger.logActivity({
        action: 'create',
        entityType: 'citizen_request',
        entityId: created.id,
        details: 'Создание обращения гражданина'
      });
    });
    
    test('should process request with agent', async () => {
      // Get the created request
      const request = await requestRepo.getById(requestId);
      expect(request).toBeDefined();
      
      // Log processing start
      await activityLogger.logActivity({
        action: 'process_start',
        entityType: 'citizen_request',
        entityId: requestId,
        details: 'Начало обработки обращения'
      });
      
      // Record to blockchain
      const blockchainHash = await blockchainService.recordToBlockchain({
        entityType: 'citizen_request',
        entityId: requestId,
        action: 'process_start'
      });
      
      expect(blockchainHash).toBeDefined();
      
      // Process with agent
      const result = await agentService.processWithAgent(
        {
          entityType: 'citizen_request',
          entityId: requestId,
          subject: request.subject,
          description: request.description
        },
        'citizen_requests',
        'classification'
      );
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      // Update request with classification
      const classification = result.data.classification;
      const updated = await requestRepo.update(requestId, {
        status: 'in_progress',
        aiClassification: classification
      });
      
      expect(updated).toBeDefined();
      expect(updated.aiClassification).toBe(classification);
      
      // Record completion to blockchain
      const completionHash = await blockchainService.recordToBlockchain({
        entityType: 'citizen_request',
        entityId: requestId,
        action: 'process_complete',
        metadata: {
          classification,
          resultId: result.resultId
        }
      });
      
      expect(completionHash).toBeDefined();
      
      // Log processing completion
      await activityLogger.logActivity({
        action: 'process_complete',
        entityType: 'citizen_request',
        entityId: requestId,
        details: `Обращение классифицировано как ${classification}`,
        metadata: {
          blockchainHash: completionHash
        }
      });
    });
    
    test('should generate response for the request', async () => {
      // Get the request
      const request = await requestRepo.getById(requestId);
      expect(request).toBeDefined();
      
      // Get cached response or generate new one
      let response = await cacheService.get(`request_response_${requestId}`);
      
      if (!response) {
        // Log generation start
        await activityLogger.logActivity({
          action: 'response_generation_start',
          entityType: 'citizen_request',
          entityId: requestId,
          details: 'Начало генерации ответа'
        });
        
        // Generate response with agent
        const result = await agentService.processWithAgent(
          {
            entityType: 'citizen_request',
            entityId: requestId,
            subject: request.subject,
            description: request.description
          },
          'citizen_requests',
          'response_generation'
        );
        
        response = result.data.response;
        
        // Cache the response
        await cacheService.set(`request_response_${requestId}`, response, 3600); // 1 hour TTL
        
        // Log generation completion
        await activityLogger.logActivity({
          action: 'response_generation_complete',
          entityType: 'citizen_request',
          entityId: requestId,
          details: 'Завершение генерации ответа'
        });
      }
      
      expect(response).toBeDefined();
      
      // Update request with response
      const updated = await requestRepo.update(requestId, {
        responseText: response
      });
      
      expect(updated).toBeDefined();
      expect(updated.responseText).toBe(response);
    });
    
    test('should complete the request', async () => {
      // Update request status to completed
      const updated = await requestRepo.update(requestId, {
        status: 'completed',
        completedAt: new Date()
      });
      
      expect(updated).toBeDefined();
      expect(updated.status).toBe('completed');
      expect(updated.completedAt).toBeDefined();
      
      // Record completion to blockchain
      const completionHash = await blockchainService.recordToBlockchain({
        entityType: 'citizen_request',
        entityId: requestId,
        action: 'completed',
        metadata: {
          completedAt: updated.completedAt
        }
      });
      
      expect(completionHash).toBeDefined();
      
      // Log completion activity
      await activityLogger.logActivity({
        action: 'request_completed',
        entityType: 'citizen_request',
        entityId: requestId,
        details: 'Обращение успешно обработано и завершено',
        metadata: {
          blockchainHash: completionHash
        }
      });
      
      // Get all activities for the request
      const activities = await activityLogger.getEntityActivities('citizen_request', requestId);
      
      expect(activities).toBeDefined();
      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBeGreaterThanOrEqual(5); // At least 5 activities recorded
      
      // Get all blockchain records for the request
      const blockchainRecords = await blockchainService.getEntityTransactions('citizen_request', requestId);
      
      expect(blockchainRecords).toBeDefined();
      expect(Array.isArray(blockchainRecords)).toBe(true);
      expect(blockchainRecords.length).toBeGreaterThanOrEqual(3); // At least 3 blockchain records
    });
  });
  
  describe('Error Handling and Recovery', () => {
    test('should handle and recover from errors', async () => {
      // Create a request
      const request = await requestRepo.create({
        fullName: 'Error Test Citizen',
        contactInfo: 'error.test@example.com',
        requestType: 'Error Test',
        subject: 'Error handling test',
        description: 'Testing error handling and recovery',
        status: 'new',
        priority: 'high'
      });
      
      expect(request).toBeDefined();
      
      try {
        // Simulate an error during processing
        throw new Error('Simulated processing error');
      } catch (error) {
        // Log the error
        await activityLogger.logError(error, 'request_processing', 1);
        
        // Update request status to error
        const updated = await requestRepo.update(request.id, {
          status: 'error'
        });
        
        expect(updated).toBeDefined();
        expect(updated.status).toBe('error');
        
        // Record error to blockchain
        const errorHash = await blockchainService.recordToBlockchain({
          entityType: 'citizen_request',
          entityId: request.id,
          action: 'processing_error',
          metadata: {
            error: error.message
          }
        });
        
        expect(errorHash).toBeDefined();
      }
      
      // Simulate recovery
      const recovered = await requestRepo.update(request.id, {
        status: 'in_progress'
      });
      
      expect(recovered).toBeDefined();
      expect(recovered.status).toBe('in_progress');
      
      // Log recovery activity
      await activityLogger.logActivity({
        action: 'request_recovery',
        entityType: 'citizen_request',
        entityId: request.id,
        details: 'Восстановление после ошибки'
      });
      
      // Verify activities include error and recovery
      const activities = await activityLogger.getEntityActivities('citizen_request', request.id);
      expect(activities).toBeDefined();
      
      const errorActivity = activities.find(a => a.action === 'error');
      expect(errorActivity).toBeDefined();
      
      const recoveryActivity = activities.find(a => a.action === 'request_recovery');
      expect(recoveryActivity).toBeDefined();
    });
  });
  
  describe('Cache System Integration', () => {
    test('should integrate caching with other components', async () => {
      // Create an entity to work with
      const entity = {
        id: 123,
        type: 'test_entity',
        name: 'Test Entity'
      };
      
      // Set entity in cache
      await cacheService.set(`entity_${entity.id}`, entity);
      
      // Check cache hit
      const cachedEntity = await cacheService.get(`entity_${entity.id}`);
      expect(cachedEntity).toEqual(entity);
      
      // Simulate update to entity
      const updatedEntity = {
        ...entity,
        name: 'Updated Entity',
        updatedAt: new Date()
      };
      
      // Update in cache
      await cacheService.set(`entity_${entity.id}`, updatedEntity);
      
      // Log update activity
      await activityLogger.logActivity({
        action: 'entity_update',
        entityType: 'test_entity',
        entityId: entity.id,
        details: 'Entity was updated and cached'
      });
      
      // Record to blockchain
      const hash = await blockchainService.recordToBlockchain({
        entityType: 'test_entity',
        entityId: entity.id,
        action: 'update'
      });
      
      expect(hash).toBeDefined();
      
      // Verify integrated flow
      const cachedAfterUpdate = await cacheService.get(`entity_${entity.id}`);
      expect(cachedAfterUpdate).toEqual(updatedEntity);
      
      const activities = await activityLogger.getEntityActivities('test_entity', entity.id);
      expect(activities).toBeDefined();
      expect(activities.length).toBeGreaterThan(0);
      
      const blockchainRecords = await blockchainService.getEntityTransactions('test_entity', entity.id);
      expect(blockchainRecords).toBeDefined();
      expect(blockchainRecords.length).toBeGreaterThan(0);
    });
  });
});