const { AgentRepository } = require('../server/repositories/agent-repository');
const { AgentResultRepository } = require('../server/repositories/agent-result-repository');
const { BlockchainRepository } = require('../server/repositories/blockchain-repository');
const { CitizenRequestRepository } = require('../server/repositories/citizen-request-repository');
const { db } = require('../server/db');

describe('Repository Tests', () => {
  // Mock данные для тестов
  const testAgent = {
    name: 'TestAgent',
    type: 'test',
    description: 'Тестовый агент для юнит-тестов',
    modelId: 1,
    isActive: true,
    systemPrompt: 'Вы тестовый агент.',
    config: {
      maxTokens: 1000,
      temperature: 0.5,
      capabilities: ['testing']
    }
  };

  const testRequest = {
    fullName: 'Тестовый Пользователь',
    contactInfo: 'test@example.com',
    requestType: 'Запрос',
    subject: 'Тестовый запрос',
    description: 'Описание тестового запроса',
    status: 'new',
    priority: 'medium'
  };

  // Подготовка перед всеми тестами
  beforeAll(async () => {
    // Подготовка тестовой среды, если необходимо
    console.log('Repository tests starting...');
  });

  // Очистка после всех тестов
  afterAll(async () => {
    // Очистка после тестов
    console.log('Repository tests completed');
    await db.end();
  });

  describe('AgentRepository', () => {
    let agentRepo;
    let createdAgentId;

    beforeEach(() => {
      agentRepo = new AgentRepository();
    });

    test('should create a new agent', async () => {
      const agent = await agentRepo.create(testAgent);
      createdAgentId = agent.id;
      
      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
      expect(agent.name).toBe(testAgent.name);
      expect(agent.type).toBe(testAgent.type);
      expect(agent.description).toBe(testAgent.description);
    });

    test('should get agent by id', async () => {
      const agent = await agentRepo.getById(createdAgentId);
      
      expect(agent).toBeDefined();
      expect(agent.id).toBe(createdAgentId);
    });

    test('should get agent by type', async () => {
      const agents = await agentRepo.getByType(testAgent.type);
      
      expect(agents).toBeDefined();
      expect(agents.length).toBeGreaterThan(0);
      expect(agents.some(a => a.id === createdAgentId)).toBe(true);
    });

    test('should update an agent', async () => {
      const updatedDescription = 'Обновленное описание тестового агента';
      const updated = await agentRepo.update(createdAgentId, { description: updatedDescription });
      
      expect(updated).toBeDefined();
      expect(updated.description).toBe(updatedDescription);
    });

    test('should delete an agent', async () => {
      const result = await agentRepo.delete(createdAgentId);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      const agent = await agentRepo.getById(createdAgentId);
      expect(agent).toBeUndefined();
    });
  });

  describe('CitizenRequestRepository', () => {
    let requestRepo;
    let createdRequestId;

    beforeEach(() => {
      requestRepo = new CitizenRequestRepository();
    });

    test('should create a new citizen request', async () => {
      const request = await requestRepo.create(testRequest);
      createdRequestId = request.id;
      
      expect(request).toBeDefined();
      expect(request.id).toBeDefined();
      expect(request.fullName).toBe(testRequest.fullName);
      expect(request.status).toBe(testRequest.status);
    });

    test('should get request by id', async () => {
      const request = await requestRepo.getById(createdRequestId);
      
      expect(request).toBeDefined();
      expect(request.id).toBe(createdRequestId);
    });

    test('should update request status', async () => {
      const newStatus = 'in_progress';
      const updated = await requestRepo.updateStatus(createdRequestId, newStatus);
      
      expect(updated).toBeDefined();
      expect(updated.status).toBe(newStatus);
    });

    test('should get requests by status', async () => {
      const requests = await requestRepo.getByStatus('in_progress');
      
      expect(requests).toBeDefined();
      expect(requests.length).toBeGreaterThan(0);
      expect(requests.some(r => r.id === createdRequestId)).toBe(true);
    });

    test('should get requests by priority', async () => {
      const requests = await requestRepo.getByPriority('medium');
      
      expect(requests).toBeDefined();
      expect(requests.some(r => r.id === createdRequestId)).toBe(true);
    });

    test('should delete a request', async () => {
      const result = await requestRepo.delete(createdRequestId);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      const request = await requestRepo.getById(createdRequestId);
      expect(request).toBeUndefined();
    });
  });

  describe('AgentResultRepository', () => {
    let resultRepo;
    let agentRepo;
    let requestRepo;
    let agent;
    let request;
    let createdResultId;

    beforeEach(async () => {
      resultRepo = new AgentResultRepository();
      agentRepo = new AgentRepository();
      requestRepo = new CitizenRequestRepository();
      
      // Создаем агента и запрос для тестов результатов
      agent = await agentRepo.create(testAgent);
      request = await requestRepo.create(testRequest);
    });

    afterEach(async () => {
      // Очистка после каждого теста
      if (createdResultId) {
        await resultRepo.delete(createdResultId);
      }
      await agentRepo.delete(agent.id);
      await requestRepo.delete(request.id);
    });

    test('should create a new agent result', async () => {
      const testResult = {
        agentId: agent.id,
        entityType: 'citizen_request',
        entityId: request.id,
        actionType: 'classification',
        result: {
          classification: 'test',
          confidence: 0.9
        }
      };
      
      const result = await resultRepo.create(testResult);
      createdResultId = result.id;
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.agentId).toBe(agent.id);
      expect(result.entityId).toBe(request.id);
    });

    test('should get result by id', async () => {
      const testResult = {
        agentId: agent.id,
        entityType: 'citizen_request',
        entityId: request.id,
        actionType: 'classification',
        result: {
          classification: 'test',
          confidence: 0.9
        }
      };
      
      const created = await resultRepo.create(testResult);
      createdResultId = created.id;
      
      const result = await resultRepo.getById(createdResultId);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(createdResultId);
    });

    test('should get results by entity', async () => {
      const testResult = {
        agentId: agent.id,
        entityType: 'citizen_request',
        entityId: request.id,
        actionType: 'classification',
        result: {
          classification: 'test',
          confidence: 0.9
        }
      };
      
      const created = await resultRepo.create(testResult);
      createdResultId = created.id;
      
      const results = await resultRepo.getByEntity('citizen_request', request.id);
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.id === createdResultId)).toBe(true);
    });
  });

  describe('BlockchainRepository', () => {
    let blockchainRepo;
    let createdRecordId;

    beforeEach(() => {
      blockchainRepo = new BlockchainRepository();
    });

    afterEach(async () => {
      // Очистка после каждого теста
      if (createdRecordId) {
        await blockchainRepo.delete(createdRecordId);
      }
    });

    test('should create a new blockchain record', async () => {
      const testRecord = {
        recordType: 'test_record',
        title: 'Test Blockchain Record',
        entityType: 'test',
        entityId: 999,
        transactionHash: `0x${Math.random().toString(16).substring(2, 34)}`,
        status: 'pending',
        metadata: {
          testField: 'testValue'
        }
      };
      
      const record = await blockchainRepo.create(testRecord);
      createdRecordId = record.id;
      
      expect(record).toBeDefined();
      expect(record.id).toBeDefined();
      expect(record.transactionHash).toBe(testRecord.transactionHash);
    });

    test('should get record by id', async () => {
      const testRecord = {
        recordType: 'test_record',
        title: 'Test Blockchain Record',
        entityType: 'test',
        entityId: 999,
        transactionHash: `0x${Math.random().toString(16).substring(2, 34)}`,
        status: 'pending',
        metadata: {
          testField: 'testValue'
        }
      };
      
      const created = await blockchainRepo.create(testRecord);
      createdRecordId = created.id;
      
      const record = await blockchainRepo.getById(createdRecordId);
      
      expect(record).toBeDefined();
      expect(record.id).toBe(createdRecordId);
    });

    test('should get records by entity type and id', async () => {
      const testRecord = {
        recordType: 'test_record',
        title: 'Test Blockchain Record',
        entityType: 'test_entity',
        entityId: 123,
        transactionHash: `0x${Math.random().toString(16).substring(2, 34)}`,
        status: 'pending',
        metadata: {
          testField: 'testValue'
        }
      };
      
      const created = await blockchainRepo.create(testRecord);
      createdRecordId = created.id;
      
      const records = await blockchainRepo.getByEntityId(123);
      
      expect(records).toBeDefined();
      expect(records.length).toBeGreaterThan(0);
      expect(records.some(r => r.id === createdRecordId)).toBe(true);
      
      const typeRecords = await blockchainRepo.getByEntityType('test_entity');
      
      expect(typeRecords).toBeDefined();
      expect(typeRecords.length).toBeGreaterThan(0);
      expect(typeRecords.some(r => r.id === createdRecordId)).toBe(true);
    });

    test('should update record status', async () => {
      const testRecord = {
        recordType: 'test_record',
        title: 'Test Blockchain Record',
        entityType: 'test',
        entityId: 999,
        transactionHash: `0x${Math.random().toString(16).substring(2, 34)}`,
        status: 'pending',
        metadata: {
          testField: 'testValue'
        }
      };
      
      const created = await blockchainRepo.create(testRecord);
      createdRecordId = created.id;
      
      const updated = await blockchainRepo.update(createdRecordId, { status: 'confirmed' });
      
      expect(updated).toBeDefined();
      expect(updated.status).toBe('confirmed');
    });
  });
});