import fetch from 'node-fetch';
import chalk from 'chalk';

// URL приложения
const API_URL = 'http://localhost:5000';

// Функция для логирования с цветом
const log = {
  info: (msg) => console.log(chalk.blue(msg)),
  success: (msg) => console.log(chalk.green(`✓ ${msg}`)),
  error: (msg) => console.log(chalk.red(`✗ ${msg}`)),
  warning: (msg) => console.log(chalk.yellow(msg)),
  header: (msg) => console.log(chalk.bold.magenta(`\n=== ${msg} ===`)),
};

// Функция для проверки условия
function assert(condition, message) {
  if (!condition) {
    log.error(message);
    return false;
  }
  log.success(message);
  return true;
}

// Функция для выполнения HTTP запроса
async function fetchAPI(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, options);
    return {
      status: response.status,
      data: await response.json(),
    };
  } catch (error) {
    log.error(`Ошибка при выполнении запроса к ${endpoint}: ${error.message}`);
    return { status: 500, error: error.message };
  }
}

// Функция для создания тестового запроса
async function createTestRequest() {
  log.info('Создание тестового запроса гражданина...');
  
  const testRequest = {
    fullName: 'Тестовый Пользователь',
    contactInfo: 'test@example.com',
    requestType: 'general',
    subject: 'Тестовый запрос для интеграционного тестирования',
    description: 'Это тестовый запрос, созданный автоматически для проверки связей между компонентами.',
    status: 'new',
    priority: 'medium'
  };
  
  const response = await fetchAPI('/api/citizen-requests', 'POST', testRequest);
  
  if (response.status !== 201 && response.status !== 200) {
    log.error(`Не удалось создать тестовый запрос: ${JSON.stringify(response.data)}`);
    return null;
  }
  
  // Проверяем, что в ответе есть id, даже если код ответа 200
  if (!response.data || !response.data.id) {
    log.error('Ответ не содержит ID созданного запроса');
    return null;
  }
  
  log.success(`Тестовый запрос создан с ID: ${response.data.id}`);
  return response.data;
}

// Функция для получения активного агента
async function getActiveAgent() {
  log.info('Получение активного агента...');
  
  const response = await fetchAPI('/api/agents');
  
  if (response.status !== 200) {
    log.error('Не удалось получить список агентов');
    return null;
  }
  
  const agents = response.data;
  const citizenRequestAgents = agents.filter(
    agent => agent.type === 'citizen_requests' && agent.isActive
  );
  
  if (citizenRequestAgents.length === 0) {
    log.error('Нет активных агентов для обработки обращений граждан');
    return null;
  }
  
  log.success(`Найден активный агент: ${citizenRequestAgents[0].name} (ID: ${citizenRequestAgents[0].id})`);
  return citizenRequestAgents[0];
}

// Функция для обработки запроса агентом
async function processRequestWithAgent(requestId, agentId) {
  log.info(`Обработка запроса ${requestId} агентом ${agentId}...`);
  
  const response = await fetchAPI(`/api/citizen-requests/${requestId}/process-with-agent`, 'POST', {
    agentId,
    actionType: 'full'
  });
  
  if (response.status !== 200) {
    log.error(`Ошибка при обработке запроса: ${JSON.stringify(response.data)}`);
    return false;
  }
  
  log.success('Запрос успешно обработан агентом');
  return response.data;
}

// Функция для получения активностей, связанных с запросом
async function getRequestActivities(requestId) {
  log.info(`Получение активностей для запроса ${requestId}...`);
  
  const response = await fetchAPI(`/api/activities?relatedId=${requestId}&relatedType=citizen_request`);
  
  if (response.status !== 200) {
    log.error('Не удалось получить активности');
    return [];
  }
  
  log.success(`Получено ${response.data.length} записей активности`);
  return response.data;
}

// Функция для получения записей блокчейна, связанных с запросом
async function getRequestBlockchainRecords(requestId) {
  log.info(`Получение записей блокчейна для запроса ${requestId}...`);
  
  const response = await fetchAPI(`/api/blockchain/records?entityId=${requestId}&entityType=citizen_request`);
  
  if (response.status !== 200) {
    log.error('Не удалось получить записи блокчейна');
    return [];
  }
  
  log.success(`Получено ${response.data.length} записей блокчейна`);
  return response.data;
}

// Функция для проверки результатов работы агента
async function getAgentResults(requestId) {
  log.info(`Получение результатов работы агента для запроса ${requestId}...`);
  
  const response = await fetchAPI(`/api/agent-results?entityId=${requestId}&entityType=citizen_request`);
  
  if (response.status !== 200) {
    log.error('Не удалось получить результаты работы агента');
    return [];
  }
  
  log.success(`Получено ${response.data.length} результатов работы агента`);
  return response.data;
}

// Функция для очистки тестовых данных
async function cleanupTestData(requestId) {
  log.info(`Удаление тестового запроса ${requestId}...`);
  
  const response = await fetchAPI(`/api/citizen-requests/${requestId}`, 'DELETE');
  
  if (response.status !== 200) {
    log.error('Не удалось удалить тестовый запрос');
    return false;
  }
  
  log.success('Тестовый запрос успешно удален');
  return true;
}

// Основная функция тестирования
async function runIntegrationTests() {
  log.header('ЗАПУСК ИНТЕГРАЦИОННЫХ ТЕСТОВ');
  
  // 1. Создаем тестовый запрос
  const testRequest = await createTestRequest();
  if (!testRequest) {
    log.error('Невозможно продолжить тестирование без тестового запроса');
    return;
  }
  
  // 2. Получаем активного агента
  const agent = await getActiveAgent();
  if (!agent) {
    log.error('Невозможно продолжить тестирование без активного агента');
    await cleanupTestData(testRequest.id);
    return;
  }
  
  // 3. Обрабатываем запрос агентом
  const processResult = await processRequestWithAgent(testRequest.id, agent.id);
  if (!processResult) {
    log.error('Невозможно продолжить тестирование из-за ошибки обработки');
    await cleanupTestData(testRequest.id);
    return;
  }
  
  // 4. Получаем обновленный запрос
  const updatedRequestResponse = await fetchAPI(`/api/citizen-requests/${testRequest.id}`);
  const updatedRequest = updatedRequestResponse.data;
  
  // 5. Получаем записи активности
  const activities = await getRequestActivities(testRequest.id);
  
  // 6. Получаем записи блокчейна
  const blockchainRecords = await getRequestBlockchainRecords(testRequest.id);
  
  // 7. Получаем результаты работы агента
  const agentResults = await getAgentResults(testRequest.id);
  
  // Проверка результатов
  log.header('ПРОВЕРКА СВЯЗЕЙ МЕЖДУ КОМПОНЕНТАМИ');
  
  // Проверяем обновление запроса
  const requestUpdated = assert(
    updatedRequest.aiProcessed === true,
    'Запрос был обработан ИИ (флаг aiProcessed = true)'
  );
  
  assert(
    updatedRequest.status === 'in_progress',
    'Статус запроса изменен на "in_progress"'
  );
  
  // Проверяем наличие активностей
  const hasAiProcessActivity = assert(
    activities.some(activity => activity.actionType === 'ai_process'),
    'Создана запись активности с типом "ai_process"'
  );
  
  // Проверяем наличие результатов работы агента
  const hasAgentResults = assert(
    agentResults.length > 0,
    'Созданы записи результатов работы агента'
  );
  
  if (agentResults.length > 0) {
    assert(
      agentResults.some(result => result.agentId === agent.id),
      'Результаты работы агента связаны с правильным агентом'
    );
    
    assert(
      agentResults.some(result => result.entityId === testRequest.id),
      'Результаты работы агента связаны с правильным запросом'
    );
  }
  
  // Итоги тестирования
  log.header('РЕЗУЛЬТАТЫ ИНТЕГРАЦИОННОГО ТЕСТИРОВАНИЯ');
  
  const results = [
    requestUpdated,
    hasAiProcessActivity,
    hasAgentResults
  ];
  
  const passedCount = results.filter(r => r).length;
  log.info(`Пройдено ${passedCount} из ${results.length} проверок`);
  
  if (passedCount === results.length) {
    log.success('ИНТЕГРАЦИОННОЕ ТЕСТИРОВАНИЕ УСПЕШНО ЗАВЕРШЕНО!');
    log.info('Все компоненты системы правильно взаимодействуют между собой.');
  } else {
    log.warning(`${results.length - passedCount} проверок не пройдены.`);
    log.info('Требуется исправление ошибок в интеграции между компонентами системы.');
  }
  
  // Очистка тестовых данных
  await cleanupTestData(testRequest.id);
}

// Запускаем тесты
runIntegrationTests().catch(error => {
  log.error(`Ошибка при выполнении интеграционных тестов: ${error.message}`);
});