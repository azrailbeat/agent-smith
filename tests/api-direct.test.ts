/**
 * Прямые API тесты без использования импорта Express приложения
 */
import request from 'supertest';

// URL приложения - мы запрашиваем API напрямую
const API_URL = 'http://localhost:5000';

describe('Direct API Tests', () => {
  describe('API Status Checks', () => {
    it('GET /api/system/status should return system status', async () => {
      const response = await request(API_URL).get('/api/system/status');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
    });
  });
  
  describe('Agent API Tests', () => {
    it('GET /api/agents should return list of agents', async () => {
      const response = await request(API_URL).get('/api/agents');
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
      const response = await request(API_URL).get('/api/citizen-requests');
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
      const response = await request(API_URL).get('/api/activities');
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
});