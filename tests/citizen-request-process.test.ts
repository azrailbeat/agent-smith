import request from 'supertest';
import { Express } from 'express';
import { Server } from 'http';

// Получаем приложение Express, но предотвращаем запуск сервера
const importApp = async () => {
  // Храним оригинальный метод listen
  const originalListen = Server.prototype.listen;
  // Переопределяем метод listen, чтобы он не запускал сервер на порту
  // @ts-ignore - игнорируем TypeScript ошибку из-за переопределения метода
  Server.prototype.listen = function() {
    // Восстанавливаем оригинальный метод
    Server.prototype.listen = originalListen;
    // Возвращаем this для цепочки вызовов
    return this;
  };
  
  // Импортируем app для тестирования
  const { app } = await import('../server/routes');
  
  // Восстанавливаем оригинальный метод listen
  Server.prototype.listen = originalListen;
  
  return app;
};

describe('Citizen Request Processing Integration Tests', () => {
  let app: Express;
  let testRequestId: number;
  let activeAgentId: number;
  
  beforeAll(async () => {
    app = await importApp();
    
    // Получаем список активных агентов для тестов
    const agentsResponse = await request(app).get('/api/agents');
    const agents = agentsResponse.body;
    const citizenRequestAgents = agents.filter(
      (agent: any) => agent.type === 'citizen_requests' && agent.isActive
    );
    
    if (citizenRequestAgents.length === 0) {
      throw new Error('No active citizen request agents found for testing');
    }
    
    activeAgentId = citizenRequestAgents[0].id;
    
    // Создаем тестовый запрос гражданина
    const newRequest = {
      fullName: 'Тестовый Пользователь',
      contactInfo: 'test@example.com',
      subject: 'Тестовый запрос для интеграционного тестирования',
      description: 'Это тестовый запрос, созданный автоматически для проверки процесса обработки.',
      status: 'new',
      priority: 'medium',
      aiProcessed: false
    };
    
    const createResponse = await request(app)
      .post('/api/citizen-requests')
      .send(newRequest);
    
    expect(createResponse.status).toBe(201);
    testRequestId = createResponse.body.id;
  });
  
  afterAll(async () => {
    // Удаляем тестовый запрос, если он был создан
    if (testRequestId) {
      await request(app).delete(`/api/citizen-requests/${testRequestId}`);
    }
  });
  
  describe('Request Processing Workflow', () => {
    it('should process a request with an agent and update all related entities', async () => {
      // Шаг 1: Убедиться, что запрос существует и не обработан
      const initialRequest = await request(app).get(`/api/citizen-requests/${testRequestId}`);
      expect(initialRequest.status).toBe(200);
      expect(initialRequest.body.aiProcessed).toBe(false);
      
      // Шаг 2: Обработать запрос с агентом
      const processResponse = await request(app)
        .post(`/api/citizen-requests/${testRequestId}/process-with-agent`)
        .send({
          agentId: activeAgentId,
          actionType: 'full'
        });
      
      expect(processResponse.status).toBe(200);
      expect(processResponse.body.success).toBe(true);
      expect(processResponse.body).toHaveProperty('aiClassification');
      expect(processResponse.body).toHaveProperty('aiSuggestion');
      
      // Шаг 3: Проверить, что запрос обновлен в базе
      const updatedRequest = await request(app).get(`/api/citizen-requests/${testRequestId}`);
      expect(updatedRequest.status).toBe(200);
      expect(updatedRequest.body.aiProcessed).toBe(true);
      expect(updatedRequest.body.status).toBe('in_progress');
      expect(updatedRequest.body).toHaveProperty('aiClassification');
      
      // Шаг 4: Проверить, что созданы записи активности
      const activities = await request(app).get(`/api/activities?relatedId=${testRequestId}&relatedType=citizen_request`);
      expect(activities.status).toBe(200);
      expect(Array.isArray(activities.body)).toBe(true);
      expect(activities.body.length).toBeGreaterThan(0);
      
      // Шаг 5: Проверить, что созданы результаты работы агента
      const agentResults = await request(app).get(`/api/agent-results?entityId=${testRequestId}&entityType=citizen_request`);
      expect(agentResults.status).toBe(200);
      expect(Array.isArray(agentResults.body)).toBe(true);
      expect(agentResults.body.length).toBeGreaterThan(0);
    });
    
    it('should process a batch of requests and generate a report', async () => {
      // Создаем еще один тестовый запрос
      const newRequest = {
        fullName: 'Тестовый Пользователь 2',
        contactInfo: 'test2@example.com',
        subject: 'Еще один тестовый запрос',
        description: 'Второй тестовый запрос для проверки пакетной обработки.',
        status: 'new',
        priority: 'medium',
        aiProcessed: false
      };
      
      const createResponse = await request(app)
        .post('/api/citizen-requests')
        .send(newRequest);
      
      const secondRequestId = createResponse.body.id;
      
      // Запускаем пакетную обработку
      const batchResponse = await request(app)
        .post('/api/citizen-requests/process-batch')
        .send({
          agentId: activeAgentId,
          autoProcess: true,
          autoClassify: true,
          autoRespond: true,
          forceReprocess: true
        });
      
      expect(batchResponse.status).toBe(200);
      expect(batchResponse.body).toHaveProperty('success', true);
      expect(batchResponse.body).toHaveProperty('processedCount');
      expect(batchResponse.body).toHaveProperty('results');
      expect(batchResponse.body).toHaveProperty('summary');
      
      // Проверяем, что отчет содержит данные о процессе
      expect(batchResponse.body.summary).toHaveProperty('total');
      expect(batchResponse.body.summary).toHaveProperty('processed');
      expect(batchResponse.body.summary).toHaveProperty('succeeded');
      expect(batchResponse.body.summary).toHaveProperty('failed');
      expect(batchResponse.body.summary).toHaveProperty('timeStamp');
      
      // Удаляем второй тестовый запрос
      if (secondRequestId) {
        await request(app).delete(`/api/citizen-requests/${secondRequestId}`);
      }
    });
  });
});