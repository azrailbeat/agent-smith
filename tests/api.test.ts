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

describe('API Basic Tests', () => {
  let app: Express;
  
  beforeAll(async () => {
    app = await importApp();
  });
  
  describe('API Status Tests', () => {
    it('GET /api/system/status should return system status', async () => {
      const response = await request(app).get('/api/system/status');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
    });
  });
  
  describe('Agent API Tests', () => {
    it('GET /api/agents should return list of agents', async () => {
      const response = await request(app).get('/api/agents');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Если есть агенты, проверяем их структуру
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('name');
        expect(response.body[0]).toHaveProperty('type');
      }
    });
  });
  
  describe('Citizen Requests API Tests', () => {
    it('GET /api/citizen-requests should return list of requests', async () => {
      const response = await request(app).get('/api/citizen-requests');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Если есть запросы, проверяем их структуру
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('fullName');
        expect(response.body[0]).toHaveProperty('status');
      }
    });
  });
  
  describe('Activity Logger Tests', () => {
    it('GET /api/activities should return list of activities', async () => {
      const response = await request(app).get('/api/activities');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Если есть активности, проверяем их структуру
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('actionType');
        expect(response.body[0]).toHaveProperty('createdAt');
      }
    });
  });
  
  describe('Blockchain Records Tests', () => {
    it('GET /api/blockchain/records should return list of blockchain records', async () => {
      const response = await request(app).get('/api/blockchain/records');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Если есть записи блокчейна, проверяем их структуру
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('recordType');
        expect(response.body[0]).toHaveProperty('transactionHash');
      }
    });
  });
});