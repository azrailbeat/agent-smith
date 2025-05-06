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

/**
 * Тест 1: Цикл жизни обращения гражданина
 * - Создание обращения
 * - Автоматическая классификация ИИ
 * - Назначение специалисту
 * - Обработка и ответ
 * - Фиксация в блокчейне и журнале активности
 */
async function testCitizenRequestLifecycle() {
  log.header('ТЕСТ 1: ПОЛНЫЙ ЦИКЛ ЖИЗНИ ОБРАЩЕНИЯ ГРАЖДАНИНА');
  const results = [];
  
  // 1. Создание обращения
  log.subheader('Шаг 1: Создание обращения гражданина');
  
  const testRequest = {
    fullName: 'Гражданин Тестовый',
    contactInfo: 'citizen@test.kz',
    requestType: 'complaint',
    subject: 'Жалоба на качество воды в районе',
    description: 'Уважаемые представители государственных органов,\n\nОбращаюсь к вам с жалобой на качество воды в нашем районе. В течение последних двух недель вода имеет неприятный запах и мутный цвет. Коммунальные службы никак не реагируют на наши звонки.\n\nПрошу разобраться в данной ситуации и принять необходимые меры.\n\nС уважением,\nГражданин Тестовый',
    priority: 'high'
  };
  
  const createResponse = await fetchAPI('/api/citizen-requests', 'POST', testRequest);
  
  results.push(assert(
    createResponse.status === 201 || createResponse.status === 200,
    'Обращение успешно создано',
    `Ошибка при создании обращения: код ${createResponse.status}`
  ));
  
  if (!createResponse.data || !createResponse.data.id) {
    log.error('Невозможно продолжить тестирование без ID обращения');
    return {
      passed: false,
      total: results.length,
      passedCount: results.filter(Boolean).length
    };
  }
  
  const requestId = createResponse.data.id;
  log.info(`Создано обращение с ID: ${requestId}`);
  
  // 2. Автоматическая обработка ИИ
  log.subheader('Шаг 2: Автоматическая обработка ИИ-агентом');
  
  const processResponse = await fetchAPI(`/api/citizen-requests/${requestId}/process`, 'POST');
  
  results.push(assert(
    processResponse.status === 200,
    'Запрос на обработку ИИ отправлен успешно',
    `Ошибка при отправке запроса на обработку: код ${processResponse.status}`
  ));
  
  // Проверяем результат обработки
  const updatedRequestResponse = await fetchAPI(`/api/citizen-requests/${requestId}`);
  const updatedRequest = updatedRequestResponse.data;
  
  results.push(assert(
    updatedRequest.aiProcessed === true,
    'Обращение отмечено как обработанное ИИ',
    'Обращение не отмечено как обработанное ИИ'
  ));
  
  results.push(assert(
    updatedRequest.aiClassification,
    `ИИ успешно классифицировал обращение как "${updatedRequest.aiClassification}"`,
    'ИИ не присвоил классификацию обращению'
  ));
  
  // 3. Получение списка пользователей для назначения
  log.subheader('Шаг 3: Назначение обращения специалисту');
  
  const usersResponse = await fetchAPI('/api/users');
  let assignedUser = null;
  
  if (usersResponse.data && Array.isArray(usersResponse.data) && usersResponse.data.length > 0) {
    assignedUser = usersResponse.data[0];
    const assignResponse = await fetchAPI(`/api/citizen-requests/${requestId}`, 'PATCH', {
      assignedTo: assignedUser.id
    });
    
    results.push(assert(
      assignResponse.status === 200,
      `Обращение успешно назначено пользователю ${assignedUser.fullName || assignedUser.username}`,
      `Ошибка при назначении обращения: код ${assignResponse.status}`
    ));
    
    // Проверяем, что назначение сохранилось
    const assignedRequestResponse = await fetchAPI(`/api/citizen-requests/${requestId}`);
    const assignedRequest = assignedRequestResponse.data;
    
    results.push(assert(
      assignedRequest.assignedTo === assignedUser.id,
      'Назначение сохранено в системе',
      'Назначение не сохранено в системе'
    ));
  } else {
    log.warning('Нет доступных пользователей для назначения, создаем тестового пользователя');
    
    // Сначала получаем список отделов
    const departmentsResponse = await fetchAPI('/api/departments');
    
    if (departmentsResponse.data && Array.isArray(departmentsResponse.data) && departmentsResponse.data.length > 0) {
      const departmentId = departmentsResponse.data[0].id;
      
      // Создаем тестового пользователя
      const testUser = {
        username: `lifecycle_test_${Date.now()}`,
        password: 'testpassword',
        fullName: 'Специалист по Воде',
        email: `water_specialist_${Date.now()}@test.kz`,
        role: 'specialist',
        departmentId
      };
      
      const createUserResponse = await fetchAPI('/api/users', 'POST', testUser);
      
      if (createUserResponse.status === 201 || createUserResponse.status === 200) {
        assignedUser = createUserResponse.data;
        log.success(`Создан тестовый пользователь с ID: ${assignedUser.id}`);
        
        // Назначаем обращение новому пользователю
        const assignResponse = await fetchAPI(`/api/citizen-requests/${requestId}`, 'PATCH', {
          assignedTo: assignedUser.id
        });
        
        results.push(assert(
          assignResponse.status === 200,
          `Обращение успешно назначено созданному пользователю ${assignedUser.fullName}`,
          `Ошибка при назначении обращения: код ${assignResponse.status}`
        ));
      } else {
        log.error('Не удалось создать тестового пользователя');
        log.warning('Тест назначения обращения пропущен');
      }
    } else {
      log.error('Нет доступных отделов для создания пользователя');
      log.warning('Тест назначения обращения пропущен');
    }
  }
  
  // 4. Формирование ответа на обращение
  log.subheader('Шаг 4: Формирование ответа на обращение');
  
  const responseText = 'Уважаемый Гражданин Тестовый,\n\nБлагодарим Вас за обращение. По результатам рассмотрения Вашей жалобы сообщаем, что специалисты коммунальной службы направлены для проверки качества воды в указанном районе. Отбор проб будет произведен в течение 24 часов, результаты анализа будут готовы через 3 рабочих дня.\n\nДополнительно сообщаем, что для оперативного реагирования на подобные ситуации рекомендуем обращаться на круглосуточную горячую линию коммунальных служб по телефону 123-456-789.\n\nС уважением,\nОтдел по работе с обращениями граждан';
  
  const responseUpdate = await fetchAPI(`/api/citizen-requests/${requestId}`, 'PATCH', {
    responseText,
    status: 'completed'
  });
  
  results.push(assert(
    responseUpdate.status === 200,
    'Ответ на обращение успешно сохранен',
    `Ошибка при сохранении ответа: код ${responseUpdate.status}`
  ));
  
  results.push(assert(
    responseUpdate.data && responseUpdate.data.status === 'completed',
    'Статус обращения изменен на "completed"',
    'Статус обращения не изменен на "completed"'
  ));
  
  // 5. Проверка записей активности
  log.subheader('Шаг 5: Проверка записей активности');
  
  // Делаем небольшую паузу, чтобы система успела зарегистрировать активность
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const activitiesResponse = await fetchAPI(`/api/activities?relatedId=${requestId}&relatedType=citizen_request`);
  
  results.push(assert(
    activitiesResponse.status === 200 && 
    activitiesResponse.data && 
    Array.isArray(activitiesResponse.data) && 
    activitiesResponse.data.length > 0,
    `Найдено ${activitiesResponse.data.length} записей активности для обращения`,
    'Не найдены записи активности для обращения'
  ));
  
  if (activitiesResponse.data && Array.isArray(activitiesResponse.data)) {
    // Проверяем наличие ключевых активностей
    const hasCreatedActivity = activitiesResponse.data.some(a => 
      a.actionType === 'citizen_request_created' || a.actionType === 'entity_create'
    );
    
    const hasAiProcessActivity = activitiesResponse.data.some(a => 
      a.actionType === 'ai_process' || a.description?.includes('агент')
    );
    
    const hasStatusChangeActivity = activitiesResponse.data.some(a => 
      a.actionType === 'citizen_request_status_changed' || a.description?.includes('статус')
    );
    
    results.push(assert(
      hasCreatedActivity,
      'Найдена запись о создании обращения',
      'Не найдена запись о создании обращения'
    ));
    
    results.push(assert(
      hasAiProcessActivity,
      'Найдена запись об обработке ИИ',
      'Не найдена запись об обработке ИИ'
    ));
    
    results.push(assert(
      hasStatusChangeActivity,
      'Найдена запись об изменении статуса',
      'Не найдена запись об изменении статуса'
    ));
  }
  
  // 6. Проверка записей в блокчейне (если доступны)
  log.subheader('Шаг 6: Проверка записей в блокчейне');
  
  const blockchainResponse = await fetchAPI(`/api/blockchain/records?entityId=${requestId}&entityType=citizen_request`);
  
  if (blockchainResponse.status === 200 && blockchainResponse.data && Array.isArray(blockchainResponse.data)) {
    results.push(assert(
      blockchainResponse.data.length > 0,
      `Найдено ${blockchainResponse.data.length} записей в блокчейне для обращения`,
      'Не найдены записи в блокчейне для обращения'
    ));
  } else {
    log.warning('Блокчейн-записи недоступны или имеют неверный формат, тест пропущен');
  }
  
  // Очистка (опционально)
  if (process.env.KEEP_TEST_DATA !== 'true') {
    log.info('Очистка тестовых данных...');
    
    // Удаляем обращение
    await fetchAPI(`/api/citizen-requests/${requestId}`, 'DELETE');
    
    // Удаляем созданного пользователя, если он был создан в рамках теста
    if (assignedUser && assignedUser.username && assignedUser.username.startsWith('lifecycle_test_')) {
      await fetchAPI(`/api/users/${assignedUser.id}`, 'DELETE');
    }
  }
  
  // Результаты
  const passedCount = results.filter(Boolean).length;
  log.subheader(`Результаты теста жизненного цикла обращения: ${passedCount}/${results.length}`);
  
  return {
    passed: passedCount === results.length,
    total: results.length,
    passedCount
  };
}

/**
 * Тест 2: Проверка правил автоматического назначения обращений
 * - Создание обращения с разными типами
 * - Проверка корректности автоматического назначения по правилам
 * - Проверка перехода обращения между статусами
 */
async function testAutomaticAssignmentRules() {
  log.header('ТЕСТ 2: ПРОВЕРКА ПРАВИЛ АВТОМАТИЧЕСКОГО НАЗНАЧЕНИЯ ОБРАЩЕНИЙ');
  log.info('Это тест проверяет работу правил автоматического назначения обращений отделам');
  
  const results = [];
  
  // 1. Проверка наличия отделов в системе
  log.subheader('Шаг 1: Проверка наличия отделов в системе');
  
  const departmentsResponse = await fetchAPI('/api/departments');
  
  results.push(assert(
    departmentsResponse.status === 200 && 
    departmentsResponse.data && 
    Array.isArray(departmentsResponse.data) && 
    departmentsResponse.data.length > 0,
    `Найдено ${departmentsResponse.data.length} отделов в системе`,
    'Не найдены отделы в системе'
  ));
  
  if (!departmentsResponse.data || !Array.isArray(departmentsResponse.data) || departmentsResponse.data.length === 0) {
    log.error('Невозможно продолжить тестирование правил назначения без отделов');
    return {
      passed: false,
      total: results.length,
      passedCount: results.filter(Boolean).length
    };
  }
  
  // 2. Создаем обращения разных типов для проверки правил
  log.subheader('Шаг 2: Создание тестовых обращений разных типов');
  
  const testRequests = [
    {
      type: 'legal',
      data: {
        fullName: 'Тестовый Юридический',
        contactInfo: 'legal@test.kz',
        requestType: 'consultation',
        subject: 'Консультация по земельному вопросу',
        description: 'Прошу разъяснить порядок оформления земельного участка в частную собственность. Какие документы необходимы и куда обращаться?',
        priority: 'medium'
      }
    },
    {
      type: 'technical',
      data: {
        fullName: 'Тестовый Технический',
        contactInfo: 'tech@test.kz',
        requestType: 'complaint',
        subject: 'Неисправность светофора',
        description: 'На перекрестке улиц Абая и Достык не работает светофор, что создает аварийную ситуацию. Прошу срочно устранить неисправность.',
        priority: 'high'
      }
    },
    {
      type: 'financial',
      data: {
        fullName: 'Тестовый Финансовый',
        contactInfo: 'finance@test.kz',
        requestType: 'application',
        subject: 'Заявление на получение субсидии',
        description: 'Прошу рассмотреть возможность предоставления субсидии для развития малого бизнеса. Все необходимые документы готов предоставить по запросу.',
        priority: 'medium'
      }
    }
  ];
  
  const createdRequests = [];
  
  for (const testRequest of testRequests) {
    const createResponse = await fetchAPI('/api/citizen-requests', 'POST', testRequest.data);
    
    if (createResponse.status === 201 || createResponse.status === 200) {
      log.success(`Создано обращение типа "${testRequest.type}" с ID: ${createResponse.data.id}`);
      createdRequests.push({
        id: createResponse.data.id,
        type: testRequest.type,
        initialStatus: createResponse.data.status
      });
    } else {
      log.error(`Ошибка при создании обращения типа "${testRequest.type}": код ${createResponse.status}`);
    }
  }
  
  results.push(assert(
    createdRequests.length === testRequests.length,
    'Все тестовые обращения успешно созданы',
    `Создано только ${createdRequests.length} из ${testRequests.length} тестовых обращений`
  ));
  
  if (createdRequests.length === 0) {
    log.error('Невозможно продолжить тестирование без созданных обращений');
    return {
      passed: false,
      total: results.length,
      passedCount: results.filter(Boolean).length
    };
  }
  
  // 3. Обработка обращений ИИ-агентом
  log.subheader('Шаг 3: Обработка обращений ИИ-агентом');
  
  for (const request of createdRequests) {
    const processResponse = await fetchAPI(`/api/citizen-requests/${request.id}/process`, 'POST');
    
    if (processResponse.status === 200) {
      log.success(`Обращение ID: ${request.id} отправлено на обработку ИИ-агентом`);
    } else {
      log.error(`Ошибка при обработке обращения ID: ${request.id}: код ${processResponse.status}`);
    }
    
    // Делаем небольшую паузу, чтобы система успела обработать запрос
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // 4. Проверка результатов автоматической обработки
  log.subheader('Шаг 4: Проверка результатов автоматической обработки');
  
  for (const request of createdRequests) {
    const updatedResponse = await fetchAPI(`/api/citizen-requests/${request.id}`);
    
    if (updatedResponse.status === 200) {
      const updated = updatedResponse.data;
      
      results.push(assert(
        updated.aiProcessed === true,
        `Обращение ID: ${request.id} обработано ИИ`,
        `Обращение ID: ${request.id} не обработано ИИ`
      ));
      
      results.push(assert(
        updated.aiClassification,
        `Обращение ID: ${request.id} классифицировано как "${updated.aiClassification}"`,
        `Обращение ID: ${request.id} не получило классификацию`
      ));
      
      if (updated.status !== request.initialStatus) {
        log.success(`Статус обращения ID: ${request.id} изменен с "${request.initialStatus}" на "${updated.status}"`);
      } else {
        log.info(`Статус обращения ID: ${request.id} остался "${updated.status}"`);
      }
    } else {
      log.error(`Ошибка при получении обновленного обращения ID: ${request.id}: код ${updatedResponse.status}`);
    }
  }
  
  // 5. Проверка активностей для обработанных обращений
  log.subheader('Шаг 5: Проверка активностей для обработанных обращений');
  
  for (const request of createdRequests) {
    const activitiesResponse = await fetchAPI(`/api/activities?relatedId=${request.id}&relatedType=citizen_request`);
    
    if (activitiesResponse.status === 200 && Array.isArray(activitiesResponse.data)) {
      const activities = activitiesResponse.data;
      
      // Получение последних 3 активностей для лучшей отладки
      const recentActivities = activities.slice(0, 3).map(a => 
        `${new Date(a.timestamp).toLocaleTimeString()}: ${a.actionType || a.action || 'unknown'} - ${a.description || 'no description'}`
      ).join('\n  ');
      
      log.info(`Последние активности для обращения ID: ${request.id}:\n  ${recentActivities}`);
      
      results.push(assert(
        activities.length > 0,
        `Для обращения ID: ${request.id} найдено ${activities.length} записей активности`,
        `Для обращения ID: ${request.id} не найдены записи активности`
      ));
      
      const hasAiProcessActivity = activities.some(a => 
        a.actionType === 'ai_process' || 
        (a.description && a.description.toLowerCase().includes('агент'))
      );
      
      results.push(assert(
        hasAiProcessActivity,
        `Для обращения ID: ${request.id} найдена запись об обработке ИИ`,
        `Для обращения ID: ${request.id} не найдена запись об обработке ИИ`
      ));
    } else {
      log.error(`Ошибка при получении активностей для обращения ID: ${request.id}: код ${activitiesResponse.status}`);
    }
  }
  
  // Очистка (опционально)
  if (process.env.KEEP_TEST_DATA !== 'true') {
    log.info('Очистка тестовых данных...');
    
    for (const request of createdRequests) {
      await fetchAPI(`/api/citizen-requests/${request.id}`, 'DELETE');
    }
  }
  
  // Результаты
  const passedCount = results.filter(Boolean).length;
  log.subheader(`Результаты теста автоматического назначения: ${passedCount}/${results.length}`);
  
  return {
    passed: passedCount === results.length,
    total: results.length,
    passedCount
  };
}

/**
 * Тест 3: Проверка работы Kanban-доски для обращений
 * - Создание нескольких обращений
 * - Перемещение обращений между статусами
 * - Проверка корректного отображения в канбан-доске
 */
async function testKanbanBoardFunctionality() {
  log.header('ТЕСТ 3: ПРОВЕРКА РАБОТЫ KANBAN-ДОСКИ ДЛЯ ОБРАЩЕНИЙ');
  log.info('Этот тест проверяет функциональность канбан-доски для управления обращениями');
  
  const results = [];
  
  // 1. Проверка получения текущей структуры канбан-доски
  log.subheader('Шаг 1: Получение структуры канбан-доски');
  
  const kanbanResponse = await fetchAPI('/api/citizen-requests/kanban');
  
  results.push(assert(
    kanbanResponse.status === 200,
    'Получена структура канбан-доски',
    `Ошибка при получении структуры канбан-доски: код ${kanbanResponse.status}`
  ));
  
  if (!kanbanResponse.data || !kanbanResponse.data.columns) {
    log.error('Структура канбан-доски не содержит колонок');
    return {
      passed: false,
      total: results.length,
      passedCount: results.filter(Boolean).length
    };
  }
  
  const kanbanColumns = kanbanResponse.data.columns;
  const columnIds = Object.keys(kanbanColumns);
  
  log.info(`Доступные колонки канбан-доски: ${columnIds.map(id => kanbanColumns[id].title).join(', ')}`);
  
  // 2. Создание тестовых обращений для канбан-доски
  log.subheader('Шаг 2: Создание тестовых обращений для канбан-доски');
  
  const testRequests = [
    {
      name: 'Канбан-тест 1',
      data: {
        fullName: 'Канбан Тест Один',
        contactInfo: 'kanban1@test.kz',
        requestType: 'information',
        subject: 'Тестовое обращение для канбан-доски 1',
        description: 'Это первое тестовое обращение для проверки функциональности канбан-доски.',
        priority: 'low',
        status: 'new'
      }
    },
    {
      name: 'Канбан-тест 2',
      data: {
        fullName: 'Канбан Тест Два',
        contactInfo: 'kanban2@test.kz',
        requestType: 'application',
        subject: 'Тестовое обращение для канбан-доски 2',
        description: 'Это второе тестовое обращение для проверки функциональности канбан-доски.',
        priority: 'medium',
        status: 'new'
      }
    },
    {
      name: 'Канбан-тест 3',
      data: {
        fullName: 'Канбан Тест Три',
        contactInfo: 'kanban3@test.kz',
        requestType: 'complaint',
        subject: 'Тестовое обращение для канбан-доски 3',
        description: 'Это третье тестовое обращение для проверки функциональности канбан-доски.',
        priority: 'high',
        status: 'new'
      }
    }
  ];
  
  const createdRequests = [];
  
  for (const testRequest of testRequests) {
    const createResponse = await fetchAPI('/api/citizen-requests', 'POST', testRequest.data);
    
    if (createResponse.status === 201 || createResponse.status === 200) {
      log.success(`Создано обращение "${testRequest.name}" с ID: ${createResponse.data.id}`);
      createdRequests.push({
        id: createResponse.data.id,
        name: testRequest.name,
        initialStatus: createResponse.data.status
      });
    } else {
      log.error(`Ошибка при создании обращения "${testRequest.name}": код ${createResponse.status}`);
    }
  }
  
  results.push(assert(
    createdRequests.length === testRequests.length,
    'Все тестовые обращения для канбан-доски успешно созданы',
    `Создано только ${createdRequests.length} из ${testRequests.length} тестовых обращений`
  ));
  
  // 3. Проверка обновления канбан-доски после создания обращений
  log.subheader('Шаг 3: Проверка обновления канбан-доски');
  
  // Небольшая пауза, чтобы система обновила канбан
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const updatedKanbanResponse = await fetchAPI('/api/citizen-requests/kanban');
  
  if (updatedKanbanResponse.status === 200 && updatedKanbanResponse.data && updatedKanbanResponse.data.columns) {
    const newColumns = updatedKanbanResponse.data.columns;
    
    // Проверяем, что новые обращения появились в соответствующей колонке "new"
    const newColumnId = Object.keys(newColumns).find(id => 
      newColumns[id].title.toLowerCase() === 'new' || 
      newColumns[id].title.toLowerCase() === 'новые'
    );
    
    if (newColumnId) {
      const newRequests = newColumns[newColumnId].requestIds || [];
      
      for (const request of createdRequests) {
        results.push(assert(
          newRequests.includes(request.id),
          `Обращение "${request.name}" (ID: ${request.id}) отображается в колонке "new" канбан-доски`,
          `Обращение "${request.name}" (ID: ${request.id}) отсутствует в колонке "new" канбан-доски`
        ));
      }
    } else {
      log.warning('Не найдена колонка "new" в канбан-доске');
    }
  } else {
    log.error('Не удалось получить обновленную структуру канбан-доски');
  }
  
  // 4. Перемещение обращений между колонками
  log.subheader('Шаг 4: Перемещение обращений между колонками');
  
  // Находим колонку "in_progress"
  const inProgressColumnId = Object.keys(kanbanColumns).find(id => 
    kanbanColumns[id].title.toLowerCase() === 'in_progress' || 
    kanbanColumns[id].title.toLowerCase() === 'в работе'
  );
  
  if (inProgressColumnId && createdRequests.length > 0) {
    // Перемещаем первое обращение в "in_progress"
    const request = createdRequests[0];
    
    const updateResponse = await fetchAPI(`/api/citizen-requests/${request.id}`, 'PATCH', {
      status: 'in_progress'
    });
    
    results.push(assert(
      updateResponse.status === 200,
      `Обращение "${request.name}" (ID: ${request.id}) перемещено в статус "in_progress"`,
      `Ошибка при перемещении обращения: код ${updateResponse.status}`
    ));
    
    // Проверяем, что обращение переместилось в канбан-доске
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const kanbanAfterMoveResponse = await fetchAPI('/api/citizen-requests/kanban');
    
    if (kanbanAfterMoveResponse.status === 200 && kanbanAfterMoveResponse.data && kanbanAfterMoveResponse.data.columns) {
      const columnsAfterMove = kanbanAfterMoveResponse.data.columns;
      const inProgressRequests = columnsAfterMove[inProgressColumnId]?.requestIds || [];
      
      results.push(assert(
        inProgressRequests.includes(request.id),
        `Обращение "${request.name}" (ID: ${request.id}) отображается в колонке "in_progress" канбан-доски`,
        `Обращение "${request.name}" (ID: ${request.id}) отсутствует в колонке "in_progress" канбан-доски`
      ));
    } else {
      log.error('Не удалось получить структуру канбан-доски после перемещения');
    }
  } else {
    log.warning('Не найдена колонка "in_progress" в канбан-доске или нет созданных обращений');
  }
  
  // 5. Перемещение обращения в "completed"
  log.subheader('Шаг 5: Завершение обращения');
  
  const completedColumnId = Object.keys(kanbanColumns).find(id => 
    kanbanColumns[id].title.toLowerCase() === 'completed' || 
    kanbanColumns[id].title.toLowerCase() === 'завершенные' ||
    kanbanColumns[id].title.toLowerCase() === 'завершено'
  );
  
  if (completedColumnId && createdRequests.length > 1) {
    // Завершаем второе обращение
    const request = createdRequests[1];
    
    const updateResponse = await fetchAPI(`/api/citizen-requests/${request.id}`, 'PATCH', {
      status: 'completed',
      responseText: 'Тестовый ответ для завершения обращения в канбан-доске.'
    });
    
    results.push(assert(
      updateResponse.status === 200,
      `Обращение "${request.name}" (ID: ${request.id}) перемещено в статус "completed"`,
      `Ошибка при завершении обращения: код ${updateResponse.status}`
    ));
    
    // Проверяем, что обращение переместилось в канбан-доске
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const kanbanAfterCompleteResponse = await fetchAPI('/api/citizen-requests/kanban');
    
    if (kanbanAfterCompleteResponse.status === 200 && kanbanAfterCompleteResponse.data && kanbanAfterCompleteResponse.data.columns) {
      const columnsAfterComplete = kanbanAfterCompleteResponse.data.columns;
      const completedRequests = columnsAfterComplete[completedColumnId]?.requestIds || [];
      
      results.push(assert(
        completedRequests.includes(request.id),
        `Обращение "${request.name}" (ID: ${request.id}) отображается в колонке "completed" канбан-доски`,
        `Обращение "${request.name}" (ID: ${request.id}) отсутствует в колонке "completed" канбан-доски`
      ));
    } else {
      log.error('Не удалось получить структуру канбан-доски после завершения');
    }
  } else {
    log.warning('Не найдена колонка "completed" в канбан-доске или недостаточно созданных обращений');
  }
  
  // Очистка (опционально)
  if (process.env.KEEP_TEST_DATA !== 'true') {
    log.info('Очистка тестовых данных...');
    
    for (const request of createdRequests) {
      await fetchAPI(`/api/citizen-requests/${request.id}`, 'DELETE');
    }
  }
  
  // Результаты
  const passedCount = results.filter(Boolean).length;
  log.subheader(`Результаты теста функциональности канбан-доски: ${passedCount}/${results.length}`);
  
  return {
    passed: passedCount === results.length,
    total: results.length,
    passedCount
  };
}

// ========== ОСНОВНАЯ ФУНКЦИЯ ЗАПУСКА ТЕСТОВ ==========

async function runAgentSmithTests() {
  log.header('ТЕСТИРОВАНИЕ КЛЮЧЕВЫХ БИЗНЕС-ПРОЦЕССОВ СИСТЕМЫ AGENT SMITH');
  log.info('Начало тестирования специфичных процессов системы...');
  
  // Проверка доступности системы
  try {
    const healthResponse = await fetch(`${API_URL}/api/system/status`);
    if (healthResponse.status !== 200) {
      log.error(`API недоступен. Код ответа: ${healthResponse.status}`);
      return;
    }
    log.success('API системы доступен');
  } catch (error) {
    log.error(`Не удалось подключиться к API: ${error.message}`);
    log.warning('Убедитесь, что сервер запущен на http://localhost:5000');
    return;
  }
  
  // Выполняем все тесты
  const tests = [
    { name: 'Цикл жизни обращения гражданина', fn: testCitizenRequestLifecycle },
    { name: 'Правила автоматического назначения', fn: testAutomaticAssignmentRules },
    { name: 'Функциональность канбан-доски', fn: testKanbanBoardFunctionality }
  ];
  
  const results = [];
  
  for (const test of tests) {
    log.info(`Запуск теста: ${test.name}`);
    try {
      const result = await test.fn();
      results.push({
        name: test.name,
        result
      });
    } catch (error) {
      log.error(`Ошибка при выполнении теста "${test.name}": ${error.message}`);
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
  
  // Выводим итоговые результаты
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
    log.info('Ключевые бизнес-процессы системы Agent Smith работают корректно');
  } else {
    log.warning(`${totalTests - passedTests} тестов не пройдены`);
    log.info('Необходимо исправить выявленные проблемы в бизнес-процессах');
  }
}

// Запускаем тесты
runAgentSmithTests().catch(error => {
  log.error(`Критическая ошибка при выполнении тестов: ${error.message}`);
});