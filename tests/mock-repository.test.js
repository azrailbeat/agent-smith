/**
 * Тесты для мок-репозиториев
 */
const {
  MockAgentRepository,
  MockCitizenRequestRepository,
  MockAgentResultRepository,
  MockBlockchainRepository,
  MockActivityRepository
} = require('./mocks/repositories-mock');

describe('Mock Repository Tests', () => {
  describe('AgentRepository', () => {
    let agentRepo;
    
    beforeEach(() => {
      agentRepo = new MockAgentRepository();
    });
    
    test('should get all agents', async () => {
      const agents = await agentRepo.getAll();
      
      expect(agents).toBeDefined();
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBeGreaterThan(0);
    });
    
    test('should get agent by id', async () => {
      const agent = await agentRepo.getById(1);
      
      expect(agent).toBeDefined();
      expect(agent.id).toBe(1);
      expect(agent.name).toBe('TestAgent');
    });
    
    test('should create a new agent', async () => {
      const newAgent = {
        name: 'NewAgent',
        type: 'test',
        description: 'New Test Agent',
        modelId: 1,
        isActive: true,
        systemPrompt: 'You are a test agent',
        config: {
          maxTokens: 1500,
          temperature: 0.7
        }
      };
      
      const created = await agentRepo.create(newAgent);
      
      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.name).toBe(newAgent.name);
      expect(created.createdAt).toBeDefined();
      
      // Проверяем, что агент действительно добавлен
      const all = await agentRepo.getAll();
      expect(all.find(a => a.id === created.id)).toBeDefined();
    });
    
    test('should update an agent', async () => {
      const updateData = {
        description: 'Updated description',
        isActive: false
      };
      
      const updated = await agentRepo.update(1, updateData);
      
      expect(updated).toBeDefined();
      expect(updated.id).toBe(1);
      expect(updated.description).toBe(updateData.description);
      expect(updated.isActive).toBe(updateData.isActive);
      expect(updated.updatedAt).toBeDefined();
    });
    
    test('should get agents by type', async () => {
      const agents = await agentRepo.getByType('citizen_requests');
      
      expect(agents).toBeDefined();
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBeGreaterThan(0);
      expect(agents[0].type).toBe('citizen_requests');
    });
  });
  
  describe('CitizenRequestRepository', () => {
    let requestRepo;
    
    beforeEach(() => {
      requestRepo = new MockCitizenRequestRepository();
    });
    
    test('should get all citizen requests', async () => {
      const requests = await requestRepo.getAll();
      
      expect(requests).toBeDefined();
      expect(Array.isArray(requests)).toBe(true);
      expect(requests.length).toBeGreaterThan(0);
    });
    
    test('should create a new citizen request', async () => {
      const newRequest = {
        fullName: 'New Test Citizen',
        contactInfo: 'new.test@example.com',
        requestType: 'Test',
        subject: 'New Test Request',
        description: 'New test request description',
        status: 'new',
        priority: 'high'
      };
      
      const created = await requestRepo.create(newRequest);
      
      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.fullName).toBe(newRequest.fullName);
      expect(created.status).toBe('new');
      expect(created.priority).toBe('high');
    });
    
    test('should update request status', async () => {
      const updated = await requestRepo.updateStatus(1, 'in_progress');
      
      expect(updated).toBeDefined();
      expect(updated.id).toBe(1);
      expect(updated.status).toBe('in_progress');
    });
    
    test('should get requests by status', async () => {
      // Сначала обновляем статус для теста
      await requestRepo.updateStatus(1, 'in_progress');
      
      const requests = await requestRepo.getByStatus('in_progress');
      
      expect(requests).toBeDefined();
      expect(Array.isArray(requests)).toBe(true);
      expect(requests.length).toBeGreaterThan(0);
      expect(requests[0].status).toBe('in_progress');
    });
    
    test('should get requests by priority', async () => {
      const requests = await requestRepo.getByPriority('medium');
      
      expect(requests).toBeDefined();
      expect(Array.isArray(requests)).toBe(true);
      expect(requests.some(r => r.priority === 'medium')).toBe(true);
    });
  });
  
  describe('AgentResultRepository', () => {
    let resultRepo;
    
    beforeEach(() => {
      resultRepo = new MockAgentResultRepository();
    });
    
    test('should get all agent results', async () => {
      const results = await resultRepo.getAll();
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
    
    test('should create a new agent result', async () => {
      const newResult = {
        agentId: 2,
        entityType: 'test_entity',
        entityId: 123,
        actionType: 'test_action',
        result: { 
          data: 'test_data',
          confidence: 0.75
        }
      };
      
      const created = await resultRepo.create(newResult);
      
      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.agentId).toBe(newResult.agentId);
      expect(created.entityType).toBe(newResult.entityType);
      expect(created.result).toEqual(newResult.result);
    });
    
    test('should get results by entity', async () => {
      const results = await resultRepo.getByEntity('citizen_request', 1);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entityType).toBe('citizen_request');
      expect(results[0].entityId).toBe(1);
    });
    
    test('should get results by agent id', async () => {
      const results = await resultRepo.getByAgentId(1);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].agentId).toBe(1);
    });
  });
  
  describe('BlockchainRepository', () => {
    let blockchainRepo;
    
    beforeEach(() => {
      blockchainRepo = new MockBlockchainRepository();
    });
    
    test('should get all blockchain records', async () => {
      const records = await blockchainRepo.getAll();
      
      expect(records).toBeDefined();
      expect(Array.isArray(records)).toBe(true);
      expect(records.length).toBeGreaterThan(0);
    });
    
    test('should create a new blockchain record', async () => {
      const newRecord = {
        recordType: 'test_record',
        title: 'Test Record',
        entityType: 'test_entity',
        entityId: 456,
        transactionHash: '0xabc123def456',
        status: 'pending',
        metadata: { test: 'data' }
      };
      
      const created = await blockchainRepo.create(newRecord);
      
      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.recordType).toBe(newRecord.recordType);
      expect(created.transactionHash).toBe(newRecord.transactionHash);
    });
    
    test('should get records by entity type', async () => {
      const records = await blockchainRepo.getByEntityType('citizen_request');
      
      expect(records).toBeDefined();
      expect(Array.isArray(records)).toBe(true);
      expect(records.length).toBeGreaterThan(0);
      expect(records[0].entityType).toBe('citizen_request');
    });
    
    test('should get record by transaction hash', async () => {
      const record = await blockchainRepo.getByTransaction('0x123456789');
      
      expect(record).toBeDefined();
      expect(record.transactionHash).toBe('0x123456789');
    });
    
    test('should verify transaction', async () => {
      const result = await blockchainRepo.verifyTransaction(1);
      
      expect(result).toBeDefined();
      expect(result.verified).toBe(true);
      expect(result.record).toBeDefined();
      expect(result.record.id).toBe(1);
    });
  });
});