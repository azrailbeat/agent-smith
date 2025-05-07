/**
 * Мок-сервисы для тестирования без доступа к внешним сервисам
 */

// Мок кэш-сервиса
class MockCacheService {
  constructor() {
    this.cache = new Map();
  }

  async get(key) {
    if (!this.cache.has(key)) return null;
    
    const item = this.cache.get(key);
    
    // Проверка TTL
    if (item.expiration && item.expiration < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key, value, ttl = null) {
    const expiration = ttl ? Date.now() + ttl * 1000 : null;
    this.cache.set(key, { value, expiration });
    return true;
  }

  async delete(key) {
    return this.cache.delete(key);
  }

  async flush() {
    this.cache.clear();
    return true;
  }

  async getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Мок блокчейн-сервиса
class MockBlockchainService {
  constructor() {
    this.records = new Map();
    this.lastTransactionHash = 0;
  }

  async recordToBlockchain(data) {
    const transactionHash = `0x${this._generateHash()}`;
    this.records.set(transactionHash, {
      ...data,
      timestamp: Date.now(),
      status: 'confirmed'
    });
    return transactionHash;
  }

  async getTransactionStatus(transactionHash) {
    if (!this.records.has(transactionHash)) {
      return { status: 'not_found' };
    }
    
    const record = this.records.get(transactionHash);
    return {
      status: record.status,
      timestamp: new Date(record.timestamp),
      blockHeight: Math.floor(Math.random() * 1000000),
      confirmations: 10
    };
  }

  async getEntityTransactions(entityType, entityId) {
    const result = [];
    
    for (const [hash, record] of this.records.entries()) {
      if (record.entityType === entityType && record.entityId === entityId) {
        result.push({
          transactionHash: hash,
          ...record
        });
      }
    }
    
    return result;
  }

  async verifyTransaction(transactionHash) {
    if (!this.records.has(transactionHash)) {
      return { verified: false };
    }
    
    return { 
      verified: true,
      record: this.records.get(transactionHash)
    };
  }

  _generateHash() {
    this.lastTransactionHash++;
    return (this.lastTransactionHash + Date.now()).toString(16).padStart(64, '0');
  }
}

// Мок сервиса логирования активности
class MockActivityLoggerService {
  constructor() {
    this.activities = [];
    this.lastId = 0;
  }

  async logActivity(data) {
    this.lastId++;
    
    // Add a small delay between activities to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));
    
    const activity = {
      id: this.lastId,
      timestamp: new Date(),
      ...data
    };
    
    this.activities.push(activity);
    return activity;
  }

  async getRecentActivities(limit = 50) {
    // Make a copy of the array before sorting to avoid modifying the original
    return [...this.activities]
      .sort((a, b) => {
        // Ensure proper sorting by timestamp
        if (!a.timestamp || !b.timestamp) return 0;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
      .slice(0, limit);
  }

  async getEntityActivities(entityType, entityId) {
    return this.activities.filter(
      activity => activity.entityType === entityType && activity.entityId === entityId
    );
  }

  async getUserActivities(userId) {
    return this.activities.filter(activity => activity.userId === userId);
  }

  async addBlockchainHashToActivity(activityId, blockchainHash) {
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity) return false;
    
    activity.blockchainHash = blockchainHash;
    return true;
  }

  async logError(error, context, userId) {
    return this.logActivity({
      action: 'error',
      details: error.message,
      metadata: { context, stack: error.stack },
      userId
    });
  }
}

// Мок сервиса агентов
class MockAgentService {
  constructor() {
    this.agents = [
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
        }
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
        }
      }
    ];
    
    this.results = [];
    this.lastResultId = 0;
  }

  async getAgentByType(type) {
    return this.agents.find(agent => agent.type === type);
  }

  async getAgentById(id) {
    return this.agents.find(agent => agent.id === id);
  }

  async processWithAgent(data, agentType, actionType) {
    const agent = await this.getAgentByType(agentType);
    
    if (!agent) {
      throw new Error(`Agent of type ${agentType} not found`);
    }
    
    let result;
    
    switch (actionType) {
      case 'classification':
        result = {
          classification: 'test_category',
          confidence: 0.85,
          scores: {
            test_category: 0.85,
            other_category: 0.15
          }
        };
        break;
        
      case 'summarization':
        result = {
          summary: 'Это тестовое резюме запроса гражданина.',
          keyPoints: ['Тестовый запрос', 'Проверка функциональности']
        };
        break;
        
      case 'response_generation':
        result = {
          response: 'Это тестовый ответ на запрос гражданина.',
          followupQuestions: ['Есть ли у вас дополнительные вопросы?']
        };
        break;
        
      default:
        result = { message: 'Действие не поддерживается' };
    }
    
    // Имитация обработки
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Имитация сохранения результата
    const savedResult = await this.saveAgentResult(
      result,
      agent.id,
      data.entityType || 'test',
      data.entityId || 1,
      actionType
    );
    
    return {
      success: true,
      message: `Успешно обработано агентом ${agent.name}`,
      data: result,
      resultId: savedResult.id
    };
  }

  async saveAgentResult(result, agentId, entityType, entityId, actionType) {
    this.lastResultId++;
    
    const newResult = {
      id: this.lastResultId,
      agentId,
      entityType,
      entityId,
      actionType,
      result,
      createdAt: new Date()
    };
    
    this.results.push(newResult);
    return newResult;
  }

  async getAgentResults(agentId) {
    return this.results.filter(result => result.agentId === agentId);
  }

  async getEntityResults(entityType, entityId) {
    return this.results.filter(
      result => result.entityType === entityType && result.entityId === entityId
    );
  }
}

module.exports = {
  MockCacheService,
  MockBlockchainService,
  MockActivityLoggerService,
  MockAgentService
};