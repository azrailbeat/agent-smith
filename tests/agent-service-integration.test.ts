import request from 'supertest';
import { Express } from 'express';
import { Server } from 'http';

// Получаем приложение Express без запуска сервера
const importApp = async () => {
  const originalListen = Server.prototype.listen;
  // @ts-ignore
  Server.prototype.listen = function() {
    Server.prototype.listen = originalListen;
    return this;
  };
  
  const { app } = await import('../server/routes');
  Server.prototype.listen = originalListen;
  return app;
};

describe('AI Agent Service Integration Tests', () => {
  let app: Express;
  let testAgentId: number;
  let testRequestId: number;
  
  beforeAll(async () => {
    app = await importApp();
    
    // Создаем тестовый запрос для проверки интеграции с агентом
    const newRequest = {
      fullName: 'Агент Тест',
      contactInfo: 'agent.test@example.com',
      subject: 'Тестовый запрос для проверки работы агентов',
      description: 'Подробное описание проблемы для тестирования различных функций агентов.',
      status: 'new',
      priority: 'high',
      aiProcessed: false
    };
    
    const createResponse = await request(app)
      .post('/api/citizen-requests')
      .send(newRequest);
    
    expect(createResponse.status).toBe(201);
    testRequestId = createResponse.body.id;
    
    // Получаем список агентов и выбираем первый активный для тестов
    const agentsResponse = await request(app).get('/api/agents');
    const agents = agentsResponse.body;
    const activeAgents = agents.filter((agent: any) => agent.isActive);
    
    if (activeAgents.length === 0) {
      throw new Error('No active agents found for testing');
    }
    
    testAgentId = activeAgents[0].id;
  });
  
  afterAll(async () => {
    // Удаляем тестовый запрос, если он был создан
    if (testRequestId) {
      await request(app).delete(`/api/citizen-requests/${testRequestId}`);
    }
  });
  
  describe('Agent Service Core Functions', () => {
    it('should have the necessary agent services available', async () => {
      const response = await request(app).get('/api/system/services');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('services');
      expect(Array.isArray(response.body.services)).toBe(true);
      
      // Проверяем, что в списке есть сервис агентов
      const agentService = response.body.services.find(
        (service: any) => service.name === 'agent-service' || service.name === 'agentService'
      );
      
      expect(agentService).toBeDefined();
      expect(agentService).toHaveProperty('status', 'active');
    });
    
    it('should correctly integrate agents with the system settings', async () => {
      // Получаем системные настройки
      const settingsResponse = await request(app).get('/api/system/settings');
      
      expect(settingsResponse.status).toBe(200);
      expect(settingsResponse.body).toHaveProperty('settings');
      
      // Проверяем, что настройки содержат конфигурацию агентов
      const agentSettings = settingsResponse.body.settings.find(
        (setting: any) => setting.key === 'agent_default_settings' ||
                         setting.key === 'ai_providers' ||
                         setting.key === 'ai_enabled'
      );
      
      expect(agentSettings).toBeDefined();
    });
  });
  
  describe('Agent Capabilities and Actions', () => {
    const testActions = ['classification', 'response_generation', 'summarization'];
    
    testActions.forEach(actionType => {
      it(`should process a request with "${actionType}" action type`, async () => {
        // Проверяем обработку запроса с указанным типом действия
        const response = await request(app)
          .post(`/api/citizen-requests/${testRequestId}/process-with-agent`)
          .send({
            agentId: testAgentId,
            actionType
          });
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        
        // Проверяем ожидаемые поля результата в зависимости от типа действия
        switch (actionType) {
          case 'classification':
            expect(response.body).toHaveProperty('classification');
            expect(response.body).toHaveProperty('confidence');
            break;
          case 'response_generation':
            expect(response.body).toHaveProperty('responseText');
            break;
          case 'summarization':
            expect(response.body).toHaveProperty('summary');
            break;
        }
        
        // Проверяем, что для запроса создан результат работы агента
        const resultsResponse = await request(app).get(`/api/agent-results?entityId=${testRequestId}&entityType=citizen_request&actionType=${actionType}`);
        
        expect(resultsResponse.status).toBe(200);
        expect(Array.isArray(resultsResponse.body)).toBe(true);
        expect(resultsResponse.body.length).toBeGreaterThan(0);
      });
    });
    
    it('should perform full processing with all actions combined', async () => {
      // Полная обработка запроса со всеми действиями
      const response = await request(app)
        .post(`/api/citizen-requests/${testRequestId}/process-with-agent`)
        .send({
          agentId: testAgentId,
          actionType: 'full'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('aiClassification');
      expect(response.body).toHaveProperty('aiSuggestion');
      expect(response.body).toHaveProperty('aiProcessed', true);
      
      // Проверяем, что запрос обновлен в базе данных
      const requestResponse = await request(app).get(`/api/citizen-requests/${testRequestId}`);
      
      expect(requestResponse.status).toBe(200);
      expect(requestResponse.body).toHaveProperty('aiProcessed', true);
      expect(requestResponse.body).toHaveProperty('aiClassification');
      expect(requestResponse.body).toHaveProperty('aiSuggestion');
      expect(requestResponse.body).toHaveProperty('status', 'in_progress');
    });
  });
  
  describe('Agent Results and Activity Integration', () => {
    it('should create agent results and activity records for processed requests', async () => {
      // Получаем результаты работы агента
      const resultsResponse = await request(app).get(`/api/agent-results?entityId=${testRequestId}&entityType=citizen_request`);
      
      expect(resultsResponse.status).toBe(200);
      expect(Array.isArray(resultsResponse.body)).toBe(true);
      expect(resultsResponse.body.length).toBeGreaterThan(0);
      
      if (resultsResponse.body.length > 0) {
        const result = resultsResponse.body[0];
        expect(result).toHaveProperty('agentId');
        expect(result).toHaveProperty('entityId', testRequestId);
        expect(result).toHaveProperty('entityType', 'citizen_request');
        expect(result).toHaveProperty('actionType');
        expect(result).toHaveProperty('result');
        expect(result).toHaveProperty('createdAt');
      }
      
      // Получаем записи активности, связанные с обработкой
      const activitiesResponse = await request(app).get(`/api/activities?relatedId=${testRequestId}&relatedType=citizen_request`);
      
      expect(activitiesResponse.status).toBe(200);
      expect(Array.isArray(activitiesResponse.body)).toBe(true);
      
      // Ищем активности, связанные с обработкой агентом
      const aiProcessActivities = activitiesResponse.body.filter(
        (activity: any) => activity.actionType === 'ai_process'
      );
      
      expect(aiProcessActivities.length).toBeGreaterThan(0);
    });
  });
  
  describe('Agent Configuration and Management', () => {
    it('should correctly handle agent configuration changes', async () => {
      // Получаем текущую конфигурацию агента
      const agentResponse = await request(app).get(`/api/agents/${testAgentId}`);
      
      expect(agentResponse.status).toBe(200);
      expect(agentResponse.body).toHaveProperty('id', testAgentId);
      expect(agentResponse.body).toHaveProperty('systemPrompt');
      expect(agentResponse.body).toHaveProperty('config');
      
      const originalConfig = agentResponse.body.config;
      
      // Обновляем конфигурацию агента
      const newConfig = {
        ...originalConfig,
        testParameter: 'test_value',
        temperature: originalConfig.temperature ? originalConfig.temperature + 0.1 : 0.7
      };
      
      const updateResponse = await request(app)
        .patch(`/api/agents/${testAgentId}`)
        .send({
          config: newConfig
        });
      
      expect(updateResponse.status).toBe(200);
      
      // Проверяем, что конфигурация обновлена
      const updatedAgentResponse = await request(app).get(`/api/agents/${testAgentId}`);
      
      expect(updatedAgentResponse.status).toBe(200);
      expect(updatedAgentResponse.body.config).toHaveProperty('testParameter', 'test_value');
      
      // Восстанавливаем исходную конфигурацию
      await request(app)
        .patch(`/api/agents/${testAgentId}`)
        .send({
          config: originalConfig
        });
    });
  });
});