/**
 * Мок-репозитории для тестирования без доступа к базе данных
 */

// Хранилище данных для мок-репозиториев
const storage = {
  agents: [
    {
      id: 1,
      name: 'TestAgent',
      type: 'citizen_requests',
      description: 'Тестовый агент',
      modelId: 1,
      isActive: true,
      systemPrompt: 'Вы тестовый агент',
      config: {
        maxTokens: 1000,
        temperature: 0.5
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 2,
      name: 'BlockchainAgent',
      type: 'blockchain',
      description: 'Агент для работы с блокчейном',
      modelId: 1,
      isActive: true,
      systemPrompt: 'Вы блокчейн агент',
      config: {
        maxTokens: 1000,
        temperature: 0.3
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  citizenRequests: [
    {
      id: 1,
      fullName: 'Тестовый Гражданин',
      contactInfo: 'test@example.com',
      requestType: 'Запрос',
      subject: 'Тестовый запрос',
      description: 'Описание тестового запроса',
      status: 'new',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  agentResults: [
    {
      id: 1,
      agentId: 1,
      entityType: 'citizen_request',
      entityId: 1,
      actionType: 'classification',
      result: { classification: 'test', confidence: 0.9 },
      createdAt: new Date()
    }
  ],
  blockchainRecords: [
    {
      id: 1,
      recordType: 'citizen_request',
      title: 'Тестовая запись',
      entityType: 'citizen_request',
      entityId: 1,
      transactionHash: '0x123456789',
      status: 'confirmed',
      metadata: { test: 'value' },
      createdAt: new Date(),
      confirmedAt: new Date()
    }
  ],
  activities: [
    {
      id: 1,
      actionType: 'view',
      description: 'Просмотр записи',
      entityType: 'citizen_request',
      entityId: 1,
      userId: 1,
      timestamp: new Date()
    }
  ]
};

// Базовый класс мок-репозитория
class MockBaseRepository {
  constructor(storageKey) {
    this.storageKey = storageKey;
  }

  async getAll() {
    return [...storage[this.storageKey]];
  }

  async getById(id) {
    return storage[this.storageKey].find(item => item.id === id);
  }

  async create(data) {
    const newId = Math.max(0, ...storage[this.storageKey].map(item => item.id)) + 1;
    const newItem = {
      id: newId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    storage[this.storageKey].push(newItem);
    return { ...newItem };
  }

  async update(id, data) {
    const index = storage[this.storageKey].findIndex(item => item.id === id);
    if (index === -1) return null;

    const updatedItem = {
      ...storage[this.storageKey][index],
      ...data,
      updatedAt: new Date()
    };
    storage[this.storageKey][index] = updatedItem;
    return { ...updatedItem };
  }

  async delete(id) {
    const index = storage[this.storageKey].findIndex(item => item.id === id);
    if (index === -1) return { success: false };

    storage[this.storageKey].splice(index, 1);
    return { success: true, message: 'Successfully deleted' };
  }
}

// Мок-репозиторий агентов
class MockAgentRepository extends MockBaseRepository {
  constructor() {
    super('agents');
  }

  async getByType(type) {
    return storage.agents.filter(agent => agent.type === type);
  }

  async getByName(name) {
    return storage.agents.find(agent => agent.name === name);
  }

  async normalizeAgentData(data) {
    return { ...data };
  }

  async checkAgentReferences(agentId) {
    return { hasReferences: false, referenceCount: 0 };
  }
}

// Мок-репозиторий обращений граждан
class MockCitizenRequestRepository extends MockBaseRepository {
  constructor() {
    super('citizenRequests');
  }

  async getByStatus(status) {
    return storage.citizenRequests.filter(request => request.status === status);
  }

  async getByPriority(priority) {
    return storage.citizenRequests.filter(request => request.priority === priority);
  }

  async updateStatus(id, status) {
    return this.update(id, { status });
  }

  async getByAssignee(userId) {
    return storage.citizenRequests.filter(request => request.assignedTo === userId);
  }
}

// Мок-репозиторий результатов агентов
class MockAgentResultRepository extends MockBaseRepository {
  constructor() {
    super('agentResults');
  }

  async getByEntity(entityType, entityId) {
    return storage.agentResults.filter(
      result => result.entityType === entityType && result.entityId === entityId
    );
  }

  async getByAgentId(agentId) {
    return storage.agentResults.filter(result => result.agentId === agentId);
  }

  async getByActionType(actionType) {
    return storage.agentResults.filter(result => result.actionType === actionType);
  }
}

// Мок-репозиторий записей блокчейна
class MockBlockchainRepository extends MockBaseRepository {
  constructor() {
    super('blockchainRecords');
  }

  async getByEntityType(entityType) {
    return storage.blockchainRecords.filter(record => record.entityType === entityType);
  }

  async getByEntityId(entityId) {
    return storage.blockchainRecords.filter(record => record.entityId === entityId);
  }

  async getByTransaction(transactionHash) {
    return storage.blockchainRecords.find(record => record.transactionHash === transactionHash);
  }

  async verifyTransaction(recordId) {
    const record = await this.getById(recordId);
    if (!record) return { verified: false };
    return { verified: true, record };
  }
}

// Мок-репозиторий активностей
class MockActivityRepository extends MockBaseRepository {
  constructor() {
    super('activities');
  }

  async getByEntityType(entityType) {
    return storage.activities.filter(activity => activity.entityType === entityType);
  }

  async getByEntityId(entityId) {
    return storage.activities.filter(activity => activity.entityId === entityId);
  }

  async getByUser(userId) {
    return storage.activities.filter(activity => activity.userId === userId);
  }

  async getRecent(limit = 10) {
    return storage.activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

module.exports = {
  MockAgentRepository,
  MockCitizenRequestRepository,
  MockAgentResultRepository,
  MockBlockchainRepository,
  MockActivityRepository,
  storage // Экспортируем хранилище для прямого доступа в тестах, если нужно
};