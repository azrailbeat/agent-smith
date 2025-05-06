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

describe('Activity History and Audit Trail Tests', () => {
  let app: Express;
  let testRequestId: number;
  
  beforeAll(async () => {
    app = await importApp();
    
    // Создаем тестовое обращение для отслеживания активности
    const newRequest = {
      fullName: 'Тест Аудита',
      contactInfo: 'audit.test@example.com',
      subject: 'Тестовый запрос для проверки системы аудита',
      description: 'Содержание запроса для проверки ведения истории действий и связей между сущностями.',
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
  
  describe('Activity Logging for CRUD Operations', () => {
    it('should log activity for request creation', async () => {
      // Получаем активности, связанные с созданием запроса
      const activitiesResponse = await request(app).get(`/api/activities?relatedId=${testRequestId}&relatedType=citizen_request`);
      
      expect(activitiesResponse.status).toBe(200);
      expect(Array.isArray(activitiesResponse.body)).toBe(true);
      
      // Ищем активность создания
      const createActivity = activitiesResponse.body.find(
        (activity: any) => activity.actionType === 'entity_create'
      );
      
      expect(createActivity).toBeDefined();
      expect(createActivity).toHaveProperty('relatedId', testRequestId);
      expect(createActivity).toHaveProperty('relatedType', 'citizen_request');
    });
    
    it('should log activity when request is updated', async () => {
      // Обновляем тестовый запрос
      const updateResponse = await request(app)
        .patch(`/api/citizen-requests/${testRequestId}`)
        .send({
          status: 'in_progress',
          priority: 'high',
          description: 'Обновленное описание запроса для проверки логирования обновлений'
        });
      
      expect(updateResponse.status).toBe(200);
      
      // Проверяем, что активность обновления была записана
      const activitiesResponse = await request(app).get(`/api/activities?relatedId=${testRequestId}&relatedType=citizen_request`);
      
      const updateActivities = activitiesResponse.body.filter(
        (activity: any) => activity.actionType === 'entity_update'
      );
      
      expect(updateActivities.length).toBeGreaterThan(0);
      
      // Проверяем содержимое активности
      const latestUpdateActivity = updateActivities.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      
      expect(latestUpdateActivity).toHaveProperty('metadata');
      expect(latestUpdateActivity.metadata).toHaveProperty('changes');
    });
  });
  
  describe('Activity Logging for AI Processing', () => {
    it('should log activities for AI processing', async () => {
      // Получаем активного агента
      const agentsResponse = await request(app).get('/api/agents');
      const agents = agentsResponse.body;
      const citizenRequestAgents = agents.filter(
        (agent: any) => agent.type === 'citizen_requests' && agent.isActive
      );
      
      if (citizenRequestAgents.length === 0) {
        throw new Error('No active citizen request agents found for testing');
      }
      
      const agentId = citizenRequestAgents[0].id;
      
      // Обрабатываем запрос с помощью агента
      const processResponse = await request(app)
        .post(`/api/citizen-requests/${testRequestId}/process-with-agent`)
        .send({
          agentId,
          actionType: 'classification'
        });
      
      expect(processResponse.status).toBe(200);
      
      // Проверяем, что активность обработки ИИ была записана
      const activitiesResponse = await request(app).get(`/api/activities?relatedId=${testRequestId}&relatedType=citizen_request`);
      
      const aiActivities = activitiesResponse.body.filter(
        (activity: any) => activity.actionType === 'ai_process'
      );
      
      expect(aiActivities.length).toBeGreaterThan(0);
      
      // Проверяем последнюю активность
      const latestAiActivity = aiActivities.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      
      expect(latestAiActivity).toHaveProperty('description');
      expect(latestAiActivity.description).toMatch(/агент|выполнил|обработку|классификацию/i);
    });
  });
  
  describe('Blockchain Integration with Activity Logging', () => {
    it('should record blockchain hashes for important activities', async () => {
      // Записываем важное действие в блокчейн
      const blockchainResponse = await request(app)
        .post('/api/blockchain/record')
        .send({
          entityId: testRequestId,
          entityType: 'citizen_request',
          action: 'status_change',
          metadata: {
            oldStatus: 'in_progress',
            newStatus: 'completed',
            reason: 'Для тестирования интеграции блокчейн и истории активности'
          }
        });
      
      expect(blockchainResponse.status).toBe(200);
      expect(blockchainResponse.body).toHaveProperty('transactionHash');
      
      // Получаем записи блокчейна для запроса
      const blockchainRecordsResponse = await request(app).get(`/api/blockchain/records?entityId=${testRequestId}&entityType=citizen_request`);
      
      expect(blockchainRecordsResponse.status).toBe(200);
      expect(Array.isArray(blockchainRecordsResponse.body)).toBe(true);
      expect(blockchainRecordsResponse.body.length).toBeGreaterThan(0);
      
      // Обновляем статус запроса
      await request(app)
        .patch(`/api/citizen-requests/${testRequestId}`)
        .send({
          status: 'completed',
          completedAt: new Date().toISOString()
        });
      
      // Проверяем, что активность изменения статуса содержит ссылку на блокчейн
      const activitiesResponse = await request(app).get(`/api/activities?relatedId=${testRequestId}&relatedType=citizen_request&actionType=blockchain_record`);
      
      expect(activitiesResponse.status).toBe(200);
      expect(Array.isArray(activitiesResponse.body)).toBe(true);
      
      if (activitiesResponse.body.length > 0) {
        const blockchainActivity = activitiesResponse.body[0];
        expect(blockchainActivity).toHaveProperty('metadata');
        expect(blockchainActivity.metadata).toHaveProperty('transactionHash');
      }
    });
  });
  
  describe('Activity History Comprehensive Tests', () => {
    it('should provide a complete audit trail of a request lifecycle', async () => {
      // Получаем полную историю запроса
      const activitiesResponse = await request(app).get(`/api/activities?relatedId=${testRequestId}&relatedType=citizen_request`);
      
      expect(activitiesResponse.status).toBe(200);
      expect(Array.isArray(activitiesResponse.body)).toBe(true);
      
      const activities = activitiesResponse.body;
      
      // Сортируем активности по времени
      const sortedActivities = [...activities].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      // Проверяем, что есть основные этапы жизненного цикла запроса
      // 1. Создание
      const hasCreation = sortedActivities.some(activity => 
        activity.actionType === 'entity_create'
      );
      expect(hasCreation).toBe(true);
      
      // 2. Обновления (изменения статуса, приоритета и т.д.)
      const hasUpdates = sortedActivities.some(activity => 
        activity.actionType === 'entity_update'
      );
      expect(hasUpdates).toBe(true);
      
      // 3. Обработка ИИ
      const hasAiProcessing = sortedActivities.some(activity => 
        activity.actionType === 'ai_process'
      );
      expect(hasAiProcessing).toBe(true);
      
      // 4. Запись в блокчейн
      const hasBlockchainRecord = sortedActivities.some(activity => 
        activity.actionType === 'blockchain_record'
      );
      expect(hasBlockchainRecord).toBe(true);
      
      // Проверяем, что на основе активностей можно восстановить полную историю запроса
      const requestResponse = await request(app).get(`/api/citizen-requests/${testRequestId}`);
      expect(requestResponse.status).toBe(200);
      
      // Финальный статус должен соответствовать последней активности изменения статуса
      const statusActivities = sortedActivities.filter(activity => 
        activity.actionType === 'entity_update' && 
        activity.metadata && 
        activity.metadata.changes && 
        activity.metadata.changes.status
      );
      
      if (statusActivities.length > 0) {
        const latestStatusActivity = statusActivities[statusActivities.length - 1];
        expect(requestResponse.body.status).toBe(latestStatusActivity.metadata.changes.status.new);
      }
    });
  });
});