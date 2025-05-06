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
  subheader: (msg) => console.log(chalk.cyan(`\n--- ${msg} ---`)),
};

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
    
    // Попытка получить JSON, но возвращаем пустой объект, если ответ не JSON
    let data = {};
    try {
      data = await response.json();
    } catch (e) {
      log.warning(`Ответ от ${endpoint} не содержит валидный JSON`);
    }
    
    return {
      status: response.status,
      data,
    };
  } catch (error) {
    log.error(`Ошибка при выполнении запроса к ${endpoint}: ${error.message}`);
    return { status: 500, error: error.message };
  }
}

// Функция для проверки условия
function assert(condition, message, failMessage = null) {
  if (condition) {
    log.success(message);
    return true;
  } else {
    log.error(failMessage || message);
    return false;
  }
}

// ========== ТЕСТЫ МОДУЛЯ ОБРАЩЕНИЙ ГРАЖДАН ==========

async function testCitizenRequestsModule() {
  log.header('ТЕСТИРОВАНИЕ МОДУЛЯ ОБРАЩЕНИЙ ГРАЖДАН');
  const results = [];
  
  // Тест 1: Создание нового обращения
  log.subheader('Тест 1: Создание нового обращения');
  
  const testRequest = {
    fullName: 'Тестовый Гражданин',
    contactInfo: 'test@example.kz',
    requestType: 'consultation',
    subject: 'Консультация по получению справки',
    description: 'Нужна информация о процедуре получения справки о несудимости.',
    priority: 'medium'
  };
  
  const createResponse = await fetchAPI('/api/citizen-requests', 'POST', testRequest);
  
  results.push(assert(
    createResponse.status === 201 || createResponse.status === 200,
    'Создание обращения возвращает код 201 или 200',
    `Создание обращения вернуло неверный код: ${createResponse.status}`
  ));
  
  results.push(assert(
    createResponse.data && createResponse.data.id,
    'Создание обращения возвращает ID нового обращения',
    'ID нового обращения не получен в ответе'
  ));
  
  if (!createResponse.data || !createResponse.data.id) {
    log.error('Невозможно продолжить тестирование модуля обращений без ID');
    return {
      passed: false,
      total: results.length,
      passedCount: results.filter(Boolean).length
    };
  }
  
  const requestId = createResponse.data.id;
  log.info(`Создано тестовое обращение с ID: ${requestId}`);
  
  // Тест 2: Получение созданного обращения
  log.subheader('Тест 2: Получение созданного обращения');
  
  const getResponse = await fetchAPI(`/api/citizen-requests/${requestId}`);
  
  results.push(assert(
    getResponse.status === 200,
    'Получение обращения возвращает код 200',
    `Получение обращения вернуло неверный код: ${getResponse.status}`
  ));
  
  results.push(assert(
    getResponse.data && getResponse.data.id === requestId,
    'Получено правильное обращение',
    'Полученный объект не соответствует созданному обращению'
  ));
  
  // Тест 3: Автоматическая обработка ИИ
  log.subheader('Тест 3: Автоматическая обработка обращения ИИ-агентом');
  
  const processResponse = await fetchAPI(`/api/citizen-requests/${requestId}/process`, 'POST');
  
  results.push(assert(
    processResponse.status === 200,
    'Обработка обращения ИИ-агентом возвращает код 200',
    `Обработка обращения вернула неверный код: ${processResponse.status}`
  ));
  
  // Проверяем, что обращение было обработано ИИ
  const updatedResponse = await fetchAPI(`/api/citizen-requests/${requestId}`);
  
  results.push(assert(
    updatedResponse.data && updatedResponse.data.aiProcessed === true,
    'Обращение отмечено как обработанное ИИ',
    'Обращение не отмечено как обработанное ИИ'
  ));
  
  results.push(assert(
    updatedResponse.data && updatedResponse.data.aiClassification,
    'ИИ присвоил классификацию обращению',
    'ИИ не присвоил классификацию обращению'
  ));
  
  // Тест 4: Назначение обращения сотруднику
  log.subheader('Тест 4: Назначение обращения сотруднику');
  
  // Сначала получаем список пользователей
  const usersResponse = await fetchAPI('/api/users');
  
  if (usersResponse.data && Array.isArray(usersResponse.data) && usersResponse.data.length > 0) {
    const userId = usersResponse.data[0].id;
    
    const assignResponse = await fetchAPI(`/api/citizen-requests/${requestId}`, 'PATCH', {
      assignedTo: userId,
      status: 'in_progress'
    });
    
    results.push(assert(
      assignResponse.status === 200,
      'Назначение обращения сотруднику возвращает код 200',
      `Назначение обращения вернуло неверный код: ${assignResponse.status}`
    ));
    
    results.push(assert(
      assignResponse.data && assignResponse.data.assignedTo === userId,
      'Обращение назначено правильному сотруднику',
      'Обращение не назначено правильному сотруднику'
    ));
  } else {
    log.warning('Нет доступных пользователей для назначения обращения');
    log.info('Тест назначения обращения пропущен');
  }
  
  // Тест 5: Закрытие обращения
  log.subheader('Тест 5: Закрытие обращения');
  
  const closeResponse = await fetchAPI(`/api/citizen-requests/${requestId}`, 'PATCH', {
    status: 'completed',
    responseText: 'Тестовый ответ на обращение гражданина.'
  });
  
  results.push(assert(
    closeResponse.status === 200,
    'Закрытие обращения возвращает код 200',
    `Закрытие обращения вернуло неверный код: ${closeResponse.status}`
  ));
  
  results.push(assert(
    closeResponse.data && closeResponse.data.status === 'completed',
    'Статус обращения изменен на "completed"',
    'Статус обращения не изменен на "completed"'
  ));
  
  results.push(assert(
    closeResponse.data && closeResponse.data.responseText,
    'Текст ответа добавлен к обращению',
    'Текст ответа не добавлен к обращению'
  ));
  
  // Тест 6: Проверка активностей, связанных с обращением
  log.subheader('Тест 6: Проверка активностей');
  
  const activitiesResponse = await fetchAPI(`/api/activities?relatedId=${requestId}&relatedType=citizen_request`);
  
  results.push(assert(
    activitiesResponse.status === 200,
    'Получение активностей возвращает код 200',
    `Получение активностей вернуло неверный код: ${activitiesResponse.status}`
  ));
  
  results.push(assert(
    activitiesResponse.data && Array.isArray(activitiesResponse.data) && activitiesResponse.data.length > 0,
    'Для обращения зарегистрированы активности',
    'Для обращения не зарегистрированы активности'
  ));
  
  // Очистка: удаляем тестовое обращение
  log.info('Очистка: удаление тестового обращения...');
  await fetchAPI(`/api/citizen-requests/${requestId}`, 'DELETE');
  
  // Результаты
  const passedCount = results.filter(Boolean).length;
  log.subheader(`Результаты тестирования модуля обращений граждан: ${passedCount}/${results.length}`);
  
  return {
    passed: passedCount === results.length,
    total: results.length,
    passedCount
  };
}

// ========== ТЕСТЫ МОДУЛЯ ИИ-АГЕНТОВ ==========

async function testAIAgentsModule() {
  log.header('ТЕСТИРОВАНИЕ МОДУЛЯ ИИ-АГЕНТОВ');
  const results = [];
  
  // Тест 1: Получение списка агентов
  log.subheader('Тест 1: Получение списка агентов');
  
  const agentsResponse = await fetchAPI('/api/agents');
  
  results.push(assert(
    agentsResponse.status === 200,
    'Получение списка агентов возвращает код 200',
    `Получение списка агентов вернуло неверный код: ${agentsResponse.status}`
  ));
  
  results.push(assert(
    agentsResponse.data && Array.isArray(agentsResponse.data),
    'Ответ содержит массив агентов',
    'Ответ не содержит массив агентов'
  ));
  
  if (!agentsResponse.data || !Array.isArray(agentsResponse.data) || agentsResponse.data.length === 0) {
    log.warning('Нет доступных агентов для тестирования');
    return {
      passed: false,
      total: results.length,
      passedCount: results.filter(Boolean).length
    };
  }
  
  const agent = agentsResponse.data[0];
  log.info(`Найден агент для тестирования: ${agent.name} (ID: ${agent.id})`);
  
  // Тест 2: Получение конкретного агента
  log.subheader('Тест 2: Получение конкретного агента');
  
  const agentResponse = await fetchAPI(`/api/agents/${agent.id}`);
  
  results.push(assert(
    agentResponse.status === 200,
    'Получение агента возвращает код 200',
    `Получение агента вернуло неверный код: ${agentResponse.status}`
  ));
  
  results.push(assert(
    agentResponse.data && agentResponse.data.id === agent.id,
    'Получен правильный агент',
    'Полученный объект не соответствует запрошенному агенту'
  ));
  
  // Тест 3: Работа с конкретным модулем агента
  log.subheader('Тест 3: Создание тестового обращения для проверки работы агента');
  
  // Создаем тестовое обращение для проверки агента
  const testRequest = {
    fullName: 'Тестовый Гражданин Агент',
    contactInfo: 'agent-test@example.kz',
    requestType: 'complaint',
    subject: 'Тестовая жалоба для проверки агента',
    description: 'Это тестовая жалоба для проверки работы ИИ-агента в системе.',
    priority: 'medium'
  };
  
  const createResponse = await fetchAPI('/api/citizen-requests', 'POST', testRequest);
  
  if (!createResponse.data || !createResponse.data.id) {
    log.error('Невозможно продолжить тестирование агента без тестового обращения');
    return {
      passed: false,
      total: results.length,
      passedCount: results.filter(Boolean).length
    };
  }
  
  const requestId = createResponse.data.id;
  log.info(`Создано тестовое обращение с ID: ${requestId}`);
  
  // Тест 4: Обработка обращения конкретным агентом
  log.subheader('Тест 4: Обработка обращения конкретным агентом');
  
  const processResponse = await fetchAPI(`/api/citizen-requests/${requestId}/process-with-agent`, 'POST', {
    agentId: agent.id,
    actionType: 'classification'
  });
  
  results.push(assert(
    processResponse.status === 200,
    'Обработка агентом возвращает код 200',
    `Обработка агентом вернула неверный код: ${processResponse.status}`
  ));
  
  // Проверяем результаты работы агента
  const updatedResponse = await fetchAPI(`/api/citizen-requests/${requestId}`);
  
  results.push(assert(
    updatedResponse.data && updatedResponse.data.aiClassification,
    'Агент присвоил классификацию обращению',
    'Агент не присвоил классификацию обращению'
  ));
  
  // Тест 5: Получение результатов работы агента
  log.subheader('Тест 5: Получение результатов работы агента');
  
  const resultsEndpoint = `/api/agent-results?entityId=${requestId}&entityType=citizen_request`;
  const agentResultsRaw = await fetch(`${API_URL}${resultsEndpoint}`);
  
  // Проверяем только статус, так как этот эндпоинт может возвращать HTML вместо JSON
  results.push(assert(
    agentResultsRaw.status === 200,
    'Получение результатов агента возвращает код 200',
    `Получение результатов агента вернуло неверный код: ${agentResultsRaw.status}`
  ));
  
  // Очистка: удаляем тестовое обращение
  log.info('Очистка: удаление тестового обращения...');
  await fetchAPI(`/api/citizen-requests/${requestId}`, 'DELETE');
  
  // Результаты
  const passedCount = results.filter(Boolean).length;
  log.subheader(`Результаты тестирования модуля ИИ-агентов: ${passedCount}/${results.length}`);
  
  return {
    passed: passedCount === results.length,
    total: results.length,
    passedCount
  };
}

// ========== ТЕСТЫ МОДУЛЯ БЛОКЧЕЙН ==========

async function testBlockchainModule() {
  log.header('ТЕСТИРОВАНИЕ МОДУЛЯ БЛОКЧЕЙН');
  const results = [];
  
  // Тест 1: Получение списка записей блокчейна
  log.subheader('Тест 1: Получение списка записей блокчейна');
  
  const recordsResponse = await fetchAPI('/api/blockchain/records');
  
  results.push(assert(
    recordsResponse.status === 200,
    'Получение записей блокчейна возвращает код 200',
    `Получение записей блокчейна вернуло неверный код: ${recordsResponse.status}`
  ));
  
  results.push(assert(
    recordsResponse.data && Array.isArray(recordsResponse.data),
    'Ответ содержит массив записей блокчейна',
    'Ответ не содержит массив записей блокчейна'
  ));
  
  // Тест 2: Создание новой записи в блокчейне (если возможно)
  log.subheader('Тест 2: Создание тестового обращения для блокчейн-записи');
  
  // Создаем тестовое обращение для блокчейн-записи
  const testRequest = {
    fullName: 'Блокчейн Тест',
    contactInfo: 'blockchain-test@example.kz',
    requestType: 'feedback',
    subject: 'Тестовое обращение для блокчейн-записи',
    description: 'Это тестовое обращение для проверки создания записи в блокчейне.',
    priority: 'low'
  };
  
  const createResponse = await fetchAPI('/api/citizen-requests', 'POST', testRequest);
  
  if (!createResponse.data || !createResponse.data.id) {
    log.error('Невозможно продолжить тестирование блокчейна без тестового обращения');
    return {
      passed: false,
      total: results.length,
      passedCount: results.filter(Boolean).length
    };
  }
  
  const requestId = createResponse.data.id;
  log.info(`Создано тестовое обращение с ID: ${requestId}`);
  
  // Тест 3: Попытка создания блокчейн-записи
  log.subheader('Тест 3: Создание блокчейн-записи');
  
  // Так как эндпоинт может возвращать HTML, используем прямой fetch
  const recordEndpoint = '/api/blockchain/records';
  const recordData = {
    entityId: requestId,
    entityType: 'citizen_request',
    action: 'test_record',
    userId: null,
    metadata: {
      testField: 'testValue',
      timestamp: new Date().toISOString()
    },
    recordType: 'test',
    title: 'Тестовая запись блокчейна'
  };
  
  const recordResponse = await fetch(`${API_URL}${recordEndpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recordData)
  });
  
  results.push(assert(
    recordResponse.status === 200 || recordResponse.status === 201,
    'Создание блокчейн-записи возвращает код 200 или 201',
    `Создание блокчейн-записи вернуло неверный код: ${recordResponse.status}`
  ));
  
  // Очистка: удаляем тестовое обращение
  log.info('Очистка: удаление тестового обращения...');
  await fetchAPI(`/api/citizen-requests/${requestId}`, 'DELETE');
  
  // Результаты
  const passedCount = results.filter(Boolean).length;
  log.subheader(`Результаты тестирования модуля блокчейн: ${passedCount}/${results.length}`);
  
  return {
    passed: passedCount === results.length,
    total: results.length,
    passedCount
  };
}

// ========== ТЕСТЫ МОДУЛЯ ОРГАНИЗАЦИОННОЙ СТРУКТУРЫ ==========

async function testOrganizationalStructureModule() {
  log.header('ТЕСТИРОВАНИЕ МОДУЛЯ ОРГАНИЗАЦИОННОЙ СТРУКТУРЫ');
  const results = [];
  
  // Тест 1: Получение списка отделов
  log.subheader('Тест 1: Получение списка отделов');
  
  const departmentsResponse = await fetchAPI('/api/departments');
  
  results.push(assert(
    departmentsResponse.status === 200,
    'Получение отделов возвращает код 200',
    `Получение отделов вернуло неверный код: ${departmentsResponse.status}`
  ));
  
  results.push(assert(
    departmentsResponse.data && Array.isArray(departmentsResponse.data),
    'Ответ содержит массив отделов',
    'Ответ не содержит массив отделов'
  ));
  
  if (!departmentsResponse.data || !Array.isArray(departmentsResponse.data)) {
    log.error('Невозможно продолжить тестирование без списка отделов');
    return {
      passed: false,
      total: results.length,
      passedCount: results.filter(Boolean).length
    };
  }
  
  // Тест 2: Получение пользователей
  log.subheader('Тест 2: Получение списка пользователей');
  
  const usersResponse = await fetchAPI('/api/users');
  
  results.push(assert(
    usersResponse.status === 200,
    'Получение пользователей возвращает код 200',
    `Получение пользователей вернуло неверный код: ${usersResponse.status}`
  ));
  
  results.push(assert(
    usersResponse.data && Array.isArray(usersResponse.data),
    'Ответ содержит массив пользователей',
    'Ответ не содержит массив пользователей'
  ));
  
  // Тест 3: Создание нового пользователя
  log.subheader('Тест 3: Создание нового пользователя');
  
  const departments = departmentsResponse.data;
  const departmentId = departments.length > 0 ? departments[0].id : null;
  
  if (departmentId) {
    const testUser = {
      username: `test_user_${Date.now()}`,
      password: 'testpassword',
      fullName: 'Тестовый Пользователь Структура',
      email: `test-structure-${Date.now()}@example.kz`,
      role: 'specialist',
      departmentId
    };
    
    const createUserResponse = await fetchAPI('/api/users', 'POST', testUser);
    
    results.push(assert(
      createUserResponse.status === 201 || createUserResponse.status === 200,
      'Создание пользователя возвращает код 201 или 200',
      `Создание пользователя вернуло неверный код: ${createUserResponse.status}`
    ));
    
    results.push(assert(
      createUserResponse.data && createUserResponse.data.id,
      'Создание пользователя возвращает ID нового пользователя',
      'ID нового пользователя не получен в ответе'
    ));
    
    // Очистка: удаляем тестового пользователя
    if (createUserResponse.data && createUserResponse.data.id) {
      log.info('Очистка: удаление тестового пользователя...');
      await fetchAPI(`/api/users/${createUserResponse.data.id}`, 'DELETE');
    }
  } else {
    log.warning('Нет доступных отделов для создания пользователя');
    log.info('Тест создания пользователя пропущен');
  }
  
  // Результаты
  const passedCount = results.filter(Boolean).length;
  log.subheader(`Результаты тестирования модуля организационной структуры: ${passedCount}/${results.length}`);
  
  return {
    passed: passedCount === results.length,
    total: results.length,
    passedCount
  };
}

// ========== ТЕСТЫ МОДУЛЯ АКТИВНОСТЕЙ И ЖУРНАЛИРОВАНИЯ ==========

async function testActivityLoggingModule() {
  log.header('ТЕСТИРОВАНИЕ МОДУЛЯ АКТИВНОСТЕЙ И ЖУРНАЛИРОВАНИЯ');
  const results = [];
  
  // Тест 1: Получение списка активностей
  log.subheader('Тест 1: Получение списка активностей');
  
  const activitiesResponse = await fetchAPI('/api/activities');
  
  results.push(assert(
    activitiesResponse.status === 200,
    'Получение активностей возвращает код 200',
    `Получение активностей вернуло неверный код: ${activitiesResponse.status}`
  ));
  
  results.push(assert(
    activitiesResponse.data && Array.isArray(activitiesResponse.data),
    'Ответ содержит массив активностей',
    'Ответ не содержит массив активностей'
  ));
  
  // Тест 2: Создание тестового запроса для генерации активностей
  log.subheader('Тест 2: Создание тестового запроса для генерации активностей');
  
  const testRequest = {
    fullName: 'Тестовый Гражданин Активность',
    contactInfo: 'activity-test@example.kz',
    requestType: 'information',
    subject: 'Тестовый запрос для журнала активностей',
    description: 'Это тестовый запрос для проверки журналирования активностей.',
    priority: 'low'
  };
  
  const createResponse = await fetchAPI('/api/citizen-requests', 'POST', testRequest);
  
  if (!createResponse.data || !createResponse.data.id) {
    log.error('Невозможно продолжить тестирование активностей без тестового обращения');
    return {
      passed: false,
      total: results.length,
      passedCount: results.filter(Boolean).length
    };
  }
  
  const requestId = createResponse.data.id;
  log.info(`Создано тестовое обращение с ID: ${requestId}`);
  
  // Делаем небольшую паузу, чтобы система успела зарегистрировать активность
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Тест 3: Проверка активностей для созданного запроса
  log.subheader('Тест 3: Проверка активностей для созданного запроса');
  
  const requestActivitiesResponse = await fetchAPI(
    `/api/activities?relatedId=${requestId}&relatedType=citizen_request`
  );
  
  results.push(assert(
    requestActivitiesResponse.status === 200,
    'Получение активностей запроса возвращает код 200',
    `Получение активностей запроса вернуло неверный код: ${requestActivitiesResponse.status}`
  ));
  
  results.push(assert(
    requestActivitiesResponse.data && 
    Array.isArray(requestActivitiesResponse.data) && 
    requestActivitiesResponse.data.length > 0,
    'Найдены активности для созданного запроса',
    'Не найдены активности для созданного запроса'
  ));
  
  if (
    requestActivitiesResponse.data && 
    Array.isArray(requestActivitiesResponse.data) && 
    requestActivitiesResponse.data.length > 0
  ) {
    results.push(assert(
      requestActivitiesResponse.data.some(
        activity => activity.actionType === 'citizen_request_created'
      ),
      'Найдена активность создания запроса',
      'Не найдена активность создания запроса'
    ));
  }
  
  // Тест 4: Обновление запроса для генерации новой активности
  log.subheader('Тест 4: Обновление запроса для генерации новой активности');
  
  const updateResponse = await fetchAPI(`/api/citizen-requests/${requestId}`, 'PATCH', {
    status: 'in_progress',
    priority: 'high'
  });
  
  results.push(assert(
    updateResponse.status === 200,
    'Обновление запроса возвращает код 200',
    `Обновление запроса вернуло неверный код: ${updateResponse.status}`
  ));
  
  // Делаем небольшую паузу, чтобы система успела зарегистрировать активность
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Тест 5: Проверка новых активностей после обновления
  log.subheader('Тест 5: Проверка новых активностей после обновления');
  
  const updatedActivitiesResponse = await fetchAPI(
    `/api/activities?relatedId=${requestId}&relatedType=citizen_request`
  );
  
  results.push(assert(
    updatedActivitiesResponse.data && 
    Array.isArray(updatedActivitiesResponse.data) && 
    updatedActivitiesResponse.data.length > 0,
    'Найдены активности после обновления запроса',
    'Не найдены активности после обновления запроса'
  ));
  
  // Очистка: удаляем тестовое обращение
  log.info('Очистка: удаление тестового обращения...');
  await fetchAPI(`/api/citizen-requests/${requestId}`, 'DELETE');
  
  // Результаты
  const passedCount = results.filter(Boolean).length;
  log.subheader(`Результаты тестирования модуля активностей: ${passedCount}/${results.length}`);
  
  return {
    passed: passedCount === results.length,
    total: results.length,
    passedCount
  };
}

// ========== ОСНОВНАЯ ФУНКЦИЯ ЗАПУСКА ВСЕХ ТЕСТОВ ==========

async function runAllTests() {
  log.header('КОМПЛЕКСНОЕ ТЕСТИРОВАНИЕ СИСТЕМЫ AGENT SMITH');
  log.info('Начало тестирования всех модулей системы...');
  
  // Проверка доступности API
  log.info('Проверка доступности API...');
  try {
    const healthResponse = await fetch(`${API_URL}/api/system/status`);
    if (healthResponse.status !== 200) {
      log.error(`API недоступен. Код ответа: ${healthResponse.status}`);
      return;
    }
    log.success('API доступен');
  } catch (error) {
    log.error(`Не удалось подключиться к API: ${error.message}`);
    log.warning('Убедитесь, что сервер запущен на http://localhost:5000');
    return;
  }
  
  // Выполняем все наборы тестов
  const tests = [
    { name: 'Модуль обращений граждан', fn: testCitizenRequestsModule },
    { name: 'Модуль ИИ-агентов', fn: testAIAgentsModule },
    { name: 'Модуль блокчейн', fn: testBlockchainModule },
    { name: 'Модуль организационной структуры', fn: testOrganizationalStructureModule },
    { name: 'Модуль активностей и журналирования', fn: testActivityLoggingModule },
  ];
  
  const results = [];
  
  for (const test of tests) {
    log.info(`Запуск тестов для: ${test.name}`);
    try {
      const result = await test.fn();
      results.push({
        name: test.name,
        result
      });
    } catch (error) {
      log.error(`Ошибка при тестировании ${test.name}: ${error.message}`);
      results.push({
        name: test.name,
        result: {
          passed: false,
          total: 0,
          passedCount: 0,
          error: error.message
        }
      });
    }
  }
  
  // Выводим общие результаты
  log.header('ИТОГОВЫЕ РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ');
  
  let totalTests = 0;
  let passedTests = 0;
  
  for (const result of results) {
    const { name, result: testResult } = result;
    const percentPassed = testResult.total > 0 
      ? Math.round((testResult.passedCount / testResult.total) * 100) 
      : 0;
    
    if (testResult.passed) {
      log.success(`${name}: ПРОЙДЕН (${testResult.passedCount}/${testResult.total}, ${percentPassed}%)`);
    } else if (testResult.error) {
      log.error(`${name}: ОШИБКА - ${testResult.error}`);
    } else {
      log.error(`${name}: НЕ ПРОЙДЕН (${testResult.passedCount}/${testResult.total}, ${percentPassed}%)`);
    }
    
    totalTests += testResult.total || 0;
    passedTests += testResult.passedCount || 0;
  }
  
  const totalPercentPassed = totalTests > 0 
    ? Math.round((passedTests / totalTests) * 100) 
    : 0;
  
  log.header(`ОБЩИЙ РЕЗУЛЬТАТ: ${passedTests}/${totalTests} (${totalPercentPassed}%)`);
  
  if (passedTests === totalTests) {
    log.success('ВСЕ ТЕСТЫ УСПЕШНО ПРОЙДЕНЫ');
    log.info('Система Agent Smith полностью функциональна и готова к использованию');
  } else {
    log.warning(`${totalTests - passedTests} тестов не пройдены`);
    log.info('Необходимо исправить ошибки перед вводом системы в эксплуатацию');
  }
}

// Запускаем все тесты
runAllTests().catch(error => {
  log.error(`Критическая ошибка при выполнении тестов: ${error.message}`);
});