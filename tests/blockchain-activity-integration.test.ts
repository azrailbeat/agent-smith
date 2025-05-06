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

// Тест интеграции между блокчейном и системой логирования активностей
describe('Blockchain and Activity Logger Integration Tests', () => {
  let app: Express;
  let testRequestId: number;
  
  beforeAll(async () => {
    app = await importApp();
    
    // Создаем тестовый запрос гражданина
    const newRequest = {
      fullName: 'Блокчейн Тест',
      contactInfo: 'blockchain@example.com',
      subject: 'Тестовый запрос для проверки блокчейн интеграции',
      description: 'Проверка создания записей в блокчейне при обработке обращения.',
      status: 'new',
      priority: 'high',
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
  
  describe('Blockchain Records Creation and Activity Logging', () => {
    it('should create a blockchain record when a request is processed', async () => {
      // Проверяем количество записей в блокчейне до начала теста
      const initialBlockchainResponse = await request(app).get('/api/blockchain/records');
      const initialBlockchainCount = initialBlockchainResponse.body.length;
      
      // Проверяем количество записей активности до начала теста
      const initialActivitiesResponse = await request(app).get('/api/activities');
      const initialActivitiesCount = initialActivitiesResponse.body.length;
      
      // Записываем запрос в блокчейн напрямую
      const blockchainResponse = await request(app)
        .post('/api/blockchain/record')
        .send({
          entityId: testRequestId,
          entityType: 'citizen_request',
          action: 'create',
          metadata: {
            priority: 'high',
            subject: 'Тестовый запрос для проверки блокчейн интеграции'
          }
        });
      
      expect(blockchainResponse.status).toBe(200);
      expect(blockchainResponse.body).toHaveProperty('transactionHash');
      expect(blockchainResponse.body).toHaveProperty('success', true);
      
      // Проверяем, что запись блокчейна создана
      const updatedBlockchainResponse = await request(app).get('/api/blockchain/records');
      expect(updatedBlockchainResponse.body.length).toBeGreaterThan(initialBlockchainCount);
      
      // Находим запись, относящуюся к нашему тесту
      const ourRecord = updatedBlockchainResponse.body.find(
        (record: any) => record.entityId === testRequestId && record.entityType === 'citizen_request'
      );
      
      expect(ourRecord).toBeDefined();
      expect(ourRecord).toHaveProperty('transactionHash');
      
      // Проверяем, что запись активности также создана
      const updatedActivitiesResponse = await request(app).get('/api/activities');
      expect(updatedActivitiesResponse.body.length).toBeGreaterThan(initialActivitiesCount);
      
      // Находим запись активности, относящуюся к блокчейну
      const blockchainActivity = updatedActivitiesResponse.body.find(
        (activity: any) => 
          activity.actionType === 'blockchain_record' && 
          activity.relatedId === testRequestId &&
          activity.relatedType === 'citizen_request'
      );
      
      expect(blockchainActivity).toBeDefined();
    });
    
    it('should link blockchain records to activities', async () => {
      // Получаем все активности, связанные с тестовым запросом
      const activitiesResponse = await request(app).get(`/api/activities?relatedId=${testRequestId}&relatedType=citizen_request`);
      expect(activitiesResponse.status).toBe(200);
      
      // Находим активность, связанную с блокчейном
      const blockchainActivity = activitiesResponse.body.find(
        (activity: any) => activity.actionType === 'blockchain_record'
      );
      
      if (blockchainActivity) {
        // Проверяем, что данная активность содержит ссылку на хэш транзакции
        expect(blockchainActivity).toHaveProperty('metadata');
        expect(blockchainActivity.metadata).toHaveProperty('transactionHash');
        
        // Получаем запись блокчейна по хэшу транзакции
        const blockchainResponse = await request(app).get(`/api/blockchain/transaction/${blockchainActivity.metadata.transactionHash}`);
        expect(blockchainResponse.status).toBe(200);
        expect(blockchainResponse.body).toHaveProperty('transactionHash', blockchainActivity.metadata.transactionHash);
      }
    });
  });
});