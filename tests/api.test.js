const request = require('supertest');
const express = require('express');
const app = require('../server/app');
const { db } = require('../server/db');

describe('API Tests', () => {
  // Подготовка перед всеми тестами
  beforeAll(async () => {
    console.log('API tests starting...');
  });

  // Очистка после всех тестов
  afterAll(async () => {
    console.log('API tests completed');
    await db.end();
  });

  describe('Citizen Requests API', () => {
    let createdRequestId;

    test('should create a new citizen request', async () => {
      const testRequest = {
        fullName: 'API Test User',
        contactInfo: 'api.test@example.com',
        requestType: 'API Test',
        subject: 'API Test Request',
        description: 'This is a test request created via API',
        priority: 'medium',
        status: 'new'
      };

      const response = await request(app)
        .post('/api/citizen-requests')
        .send(testRequest)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      createdRequestId = response.body.id;
      expect(response.body.fullName).toBe(testRequest.fullName);
    });

    test('should get all citizen requests', async () => {
      const response = await request(app)
        .get('/api/citizen-requests')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should get a specific citizen request', async () => {
      const response = await request(app)
        .get(`/api/citizen-requests/${createdRequestId}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(createdRequestId);
    });

    test('should update a citizen request', async () => {
      const updateData = {
        subject: 'Updated API Test Request',
        priority: 'high'
      };

      const response = await request(app)
        .patch(`/api/citizen-requests/${createdRequestId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.subject).toBe(updateData.subject);
      expect(response.body.priority).toBe(updateData.priority);
    });

    test('should process a citizen request with an agent', async () => {
      const processData = {
        agentId: 202, // Используем существующий ID агента
        actionType: 'classification'
      };

      const response = await request(app)
        .post(`/api/citizen-requests/${createdRequestId}/process`)
        .send(processData)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
    });

    test('should delete a citizen request', async () => {
      const response = await request(app)
        .delete(`/api/citizen-requests/${createdRequestId}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
    });
  });

  describe('Agents API', () => {
    let createdAgentId;

    test('should create a new agent', async () => {
      const testAgent = {
        name: 'API Test Agent',
        type: 'api_test',
        description: 'Agent created for API testing',
        modelId: 1,
        isActive: true,
        systemPrompt: 'You are an API test agent.',
        config: {
          maxTokens: 1000,
          temperature: 0.5,
          capabilities: ['testing']
        }
      };

      const response = await request(app)
        .post('/api/agents')
        .send(testAgent)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      createdAgentId = response.body.id;
      expect(response.body.name).toBe(testAgent.name);
    });

    test('should get all agents', async () => {
      const response = await request(app)
        .get('/api/agents')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should get a specific agent', async () => {
      const response = await request(app)
        .get(`/api/agents/${createdAgentId}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(createdAgentId);
    });

    test('should update an agent', async () => {
      const updateData = {
        description: 'Updated API test agent description',
        isActive: false
      };

      const response = await request(app)
        .patch(`/api/agents/${createdAgentId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.isActive).toBe(updateData.isActive);
    });

    test('should delete an agent', async () => {
      const response = await request(app)
        .delete(`/api/agents/${createdAgentId}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
    });
  });

  describe('Blockchain API', () => {
    test('should get blockchain records', async () => {
      const response = await request(app)
        .get('/api/blockchain/records')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should get blockchain records for a specific entity', async () => {
      // Используем ID существующего обращения
      const requestId = 24;
      
      const response = await request(app)
        .get(`/api/blockchain/records/entity/citizen_request/${requestId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Activities API', () => {
    test('should get recent activities', async () => {
      const response = await request(app)
        .get('/api/activities')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should get activities for a specific entity', async () => {
      // Используем ID существующего обращения
      const requestId = 24;
      
      const response = await request(app)
        .get(`/api/activities/entity/citizen_request/${requestId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('System API', () => {
    test('should get system status', async () => {
      const response = await request(app)
        .get('/api/system/status')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    test('should get system settings', async () => {
      const response = await request(app)
        .get('/api/system/settings')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Text Processing API', () => {
    test('should normalize text', async () => {
      const testData = {
        text: '   Много   пробелов    в тексте   '
      };

      const response = await request(app)
        .post('/api/utils/normalize-text')
        .send(testData)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.text).toBe('Много пробелов в тексте');
    });

    test('should detect language', async () => {
      const testData = {
        text: 'Это тестовый текст на русском языке.'
      };

      const response = await request(app)
        .post('/api/utils/detect-language')
        .send(testData)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.language).toBe('ru');
      expect(response.body.confidence).toBeGreaterThan(0);
    });
  });
});