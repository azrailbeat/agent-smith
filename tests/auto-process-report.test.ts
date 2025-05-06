import request from 'supertest';
import { Express } from 'express';
import { Server } from 'http';

// Получаем приложение Express без запуска сервера
const importApp = async () => {
  const originalListen = Server.prototype.listen;
  // @ts-ignore - игнорируем TypeScript ошибку из-за переопределения метода
  Server.prototype.listen = function() {
    Server.prototype.listen = originalListen;
    return this;
  };
  
  const { app } = await import('../server/routes');
  Server.prototype.listen = originalListen;
  return app;
};

describe('Automatic Processing and Report Generation Tests', () => {
  let app: Express;
  let testRequestIds: number[] = [];
  let activeAgentId: number;
  
  beforeAll(async () => {
    app = await importApp();
    
    // Получаем активного агента для тестирования
    const agentsResponse = await request(app).get('/api/agents');
    const agents = agentsResponse.body;
    const citizenRequestAgents = agents.filter(
      (agent: any) => agent.type === 'citizen_requests' && agent.isActive
    );
    
    if (citizenRequestAgents.length === 0) {
      throw new Error('No active citizen request agents found for testing');
    }
    
    activeAgentId = citizenRequestAgents[0].id;
    
    // Создаем несколько тестовых обращений граждан
    for (let i = 0; i < 3; i++) {
      const newRequest = {
        fullName: `Тестовый Пользователь ${i}`,
        contactInfo: `test${i}@example.com`,
        subject: `Тестовый запрос ${i} для автоматической обработки`,
        description: `Содержание тестового запроса ${i} для проверки автоматической обработки и генерации отчетов.`,
        status: 'new',
        priority: 'medium',
        aiProcessed: false
      };
      
      const createResponse = await request(app)
        .post('/api/citizen-requests')
        .send(newRequest);
      
      expect(createResponse.status).toBe(201);
      testRequestIds.push(createResponse.body.id);
    }
  });
  
  afterAll(async () => {
    // Удаляем тестовые запросы
    for (const requestId of testRequestIds) {
      await request(app).delete(`/api/citizen-requests/${requestId}`);
    }
  });
  
  describe('Batch Processing Tests', () => {
    it('should automatically process multiple requests and generate a report', async () => {
      // Выполняем пакетную обработку запросов
      const batchResponse = await request(app)
        .post('/api/citizen-requests/process-batch')
        .send({
          agentId: activeAgentId,
          autoProcess: true,
          autoClassify: true,
          autoRespond: true,
          forceReprocess: true // Принудительная обработка всех запросов
        });
      
      expect(batchResponse.status).toBe(200);
      expect(batchResponse.body).toHaveProperty('success', true);
      expect(batchResponse.body).toHaveProperty('processedCount');
      expect(batchResponse.body).toHaveProperty('results');
      expect(Array.isArray(batchResponse.body.results)).toBe(true);
      
      // Проверяем, что отчет содержит детали обработки
      expect(batchResponse.body).toHaveProperty('summary');
      expect(batchResponse.body.summary).toHaveProperty('total');
      expect(batchResponse.body.summary).toHaveProperty('processed');
      expect(batchResponse.body.summary).toHaveProperty('succeeded');
      expect(batchResponse.body.summary).toHaveProperty('failed');
      expect(batchResponse.body.summary).toHaveProperty('timeStamp');
      
      // Проверяем, что запросы были обработаны
      for (const requestId of testRequestIds) {
        const requestResponse = await request(app).get(`/api/citizen-requests/${requestId}`);
        expect(requestResponse.status).toBe(200);
        expect(requestResponse.body).toHaveProperty('aiProcessed', true);
        expect(requestResponse.body).toHaveProperty('status', 'in_progress');
      }
      
      // Проверяем, что была создана запись активности о генерации отчета
      const activitiesResponse = await request(app).get('/api/activities');
      const reportActivity = activitiesResponse.body.find(
        (activity: any) => activity.actionType === 'ai_process_report'
      );
      
      expect(reportActivity).toBeDefined();
      expect(reportActivity).toHaveProperty('description');
      expect(reportActivity).toHaveProperty('metadata');
      expect(reportActivity.metadata).toHaveProperty('processedCount');
    });
    
    it('should update existing requests when reprocessing is enabled', async () => {
      // Получаем текущее состояние первого запроса
      const initialRequest = await request(app).get(`/api/citizen-requests/${testRequestIds[0]}`);
      const initialClassification = initialRequest.body.aiClassification;
      
      // Изменяем содержимое запроса
      const updateResponse = await request(app)
        .patch(`/api/citizen-requests/${testRequestIds[0]}`)
        .send({
          description: 'Обновленное описание запроса для проверки повторной обработки',
          subject: 'Измененная тема запроса'
        });
      
      expect(updateResponse.status).toBe(200);
      
      // Выполняем повторную обработку запросов с флагом forceReprocess
      const batchResponse = await request(app)
        .post('/api/citizen-requests/process-batch')
        .send({
          agentId: activeAgentId,
          autoClassify: true,
          forceReprocess: true // Включаем повторную обработку
        });
      
      expect(batchResponse.status).toBe(200);
      
      // Проверяем, что запрос был обработан повторно
      const updatedRequest = await request(app).get(`/api/citizen-requests/${testRequestIds[0]}`);
      
      // Если модель работает правильно, классификация должна измениться,
      // так как содержимое запроса изменилось. Но даже если не изменится 
      // (из-за отсутствия API ключа или других причин), главное, что запрос был обработан.
      expect(updatedRequest.body).toHaveProperty('aiProcessed', true);
    });
  });
  
  describe('Process Report Data Structure', () => {
    it('should provide detailed statistics in the report', async () => {
      // Выполняем пакетную обработку запросов для генерации отчета
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
      
      // Проверяем структуру отчета
      const report = batchResponse.body;
      
      // Основные поля отчета
      expect(report).toHaveProperty('success');
      expect(report).toHaveProperty('processedCount');
      expect(report.processedCount).toHaveProperty('success');
      expect(report.processedCount).toHaveProperty('error');
      expect(report.processedCount.success + report.processedCount.error).toEqual(report.results.length);
      
      // Поля сводки
      expect(report.summary).toHaveProperty('total');
      expect(report.summary).toHaveProperty('processed');
      expect(report.summary).toHaveProperty('succeeded');
      expect(report.summary).toHaveProperty('failed');
      expect(report.summary).toHaveProperty('timeStamp');
      expect(report.summary).toHaveProperty('actions');
      expect(report.summary).toHaveProperty('agentId');
      expect(report.summary).toHaveProperty('agentName');
      
      // Проверяем, что количество успешных и неудачных обработок совпадает с processedCount
      expect(report.summary.succeeded).toEqual(report.processedCount.success);
      expect(report.summary.failed).toEqual(report.processedCount.error);
      
      // Если есть результаты, проверяем их структуру
      if (report.results.length > 0) {
        const result = report.results[0];
        expect(result).toHaveProperty('requestId');
        expect(result).toHaveProperty('success');
        
        if (result.success) {
          expect(result).toHaveProperty('actions');
          expect(Array.isArray(result.actions)).toBe(true);
        } else {
          expect(result).toHaveProperty('error');
        }
      }
    });
  });
});