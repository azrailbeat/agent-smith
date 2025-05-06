/**
 * Прямые API тесты без использования импорта Express приложения
 */

import fetch from 'node-fetch';

// URL API
const API_URL = 'http://localhost:5000';

// Функция для выполнения HTTP запроса
async function fetchAPI(endpoint: string, method: string = 'GET', body: any = null): Promise<any> {
  try {
    const options: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Ошибка при выполнении запроса к ${endpoint}:`, error);
    throw error;
  }
}

// Тестирование API агентов
describe('Тесты API агентов', () => {
  // Тестовые данные
  let testAgentId: number;
  
  // Получение списка агентов
  test('Получение списка агентов', async () => {
    const agents = await fetchAPI('/api/agents');
    
    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBeGreaterThan(0);
    
    // Сохраняем ID первого агента для использования в других тестах
    if (agents.length > 0) {
      testAgentId = agents[0].id;
    }
  });
  
  // Получение информации о конкретном агенте
  test('Получение информации о конкретном агенте', async () => {
    // Пропускаем тест, если не удалось получить ID агента
    if (!testAgentId) {
      console.warn('Пропуск теста: не удалось получить ID агента');
      return;
    }
    
    const agent = await fetchAPI(`/api/agents/${testAgentId}`);
    
    expect(agent).toBeDefined();
    expect(agent.id).toBe(testAgentId);
    expect(agent.name).toBeDefined();
    expect(agent.type).toBeDefined();
  });
});

// Тестирование API обращений граждан
describe('Тесты API обращений граждан', () => {
  // Получение списка обращений
  test('Получение списка обращений', async () => {
    const requests = await fetchAPI('/api/citizen-requests');
    
    expect(Array.isArray(requests)).toBe(true);
  });
  
  // Создание нового обращения
  test('Создание нового обращения', async () => {
    const testRequest = {
      fullName: 'Тестовый Пользователь',
      contactInfo: 'test@example.com',
      requestType: 'general',
      subject: 'Тестовый запрос для API теста',
      description: 'Это тестовый запрос, созданный автоматически для проверки API.',
      status: 'new',
      priority: 'medium'
    };
    
    const createdRequest = await fetchAPI('/api/citizen-requests', 'POST', testRequest);
    
    expect(createdRequest).toBeDefined();
    expect(createdRequest.id).toBeDefined();
    expect(createdRequest.fullName).toBe(testRequest.fullName);
    expect(createdRequest.subject).toBe(testRequest.subject);
    
    // Очистка - удаление созданного запроса
    if (createdRequest && createdRequest.id) {
      await fetchAPI(`/api/citizen-requests/${createdRequest.id}`, 'DELETE');
    }
  });
});

// Тестирование API активностей
describe('Тесты API активностей', () => {
  // Получение списка активностей
  test('Получение списка активностей', async () => {
    const activities = await fetchAPI('/api/activities');
    
    expect(Array.isArray(activities)).toBe(true);
  });
});

// Тестирование API блокчейн-записей
describe('Тесты API блокчейн-записей', () => {
  // Получение списка блокчейн-записей
  test('Получение списка блокчейн-записей', async () => {
    const records = await fetchAPI('/api/blockchain/records');
    
    expect(Array.isArray(records)).toBe(true);
  });
});

// Тестирование API системных настроек
describe('Тесты API системных настроек', () => {
  // Получение статуса системы
  test('Получение статуса системы', async () => {
    const status = await fetchAPI('/api/system/status');
    
    // Проверяем, что статус возвращается в каком-либо виде (объект или массив)
    expect(status).toBeDefined();
  });
});