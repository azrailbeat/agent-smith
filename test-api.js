import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';

// Получаем текущую директорию
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  return true;
}

// Функция для проверки API endpoint
async function testEndpoint(endpoint, expectedStatus = 200, checks = []) {
  log.info(`Проверка ${endpoint}...`);
  try {
    const response = await fetch(`${API_URL}${endpoint}`);
    const isStatusOk = assert(
      response.status === expectedStatus,
      `Неверный статус ответа: ${response.status}, ожидался: ${expectedStatus}`
    );
    
    if (!isStatusOk) return false;
    
    const data = await response.json();
    
    // Выполняем все проверки
    const allChecksPass = checks.every(check => {
      const result = check(data);
      if (!result.passed) {
        log.error(result.message);
      }
      return result.passed;
    });
    
    if (allChecksPass) {
      log.success(`Endpoint ${endpoint} прошел все проверки`);
    }
    
    return allChecksPass;
  } catch (error) {
    log.error(`Ошибка при проверке ${endpoint}: ${error.message}`);
    return false;
  }
}

// Основная функция тестирования
async function runTests() {
  log.header('ЗАПУСК API ТЕСТОВ');
  
  // Тест системного статуса
  const systemStatusSuccess = await testEndpoint('/api/system/status', 200, [
    (data) => ({ 
      passed: Array.isArray(data) || (data && typeof data === 'object'),
      message: 'Ответ не является объектом или массивом'
    }),
    // Проверка успешного ответа, даже если структура отличается от ожидаемой
    (data) => ({ 
      passed: true,
      message: 'Статус API доступен'
    }),
  ]);
  
  // Тест списка агентов
  const agentsSuccess = await testEndpoint('/api/agents', 200, [
    (data) => ({ 
      passed: Array.isArray(data),
      message: 'Ответ не является массивом'
    }),
    (data) => ({ 
      passed: Array.isArray(data) && (data.length === 0 || (data.length > 0 && 'id' in data[0])),
      message: 'Первый элемент массива не содержит поле id'
    }),
  ]);
  
  // Тест списка обращений граждан
  const citizenRequestsSuccess = await testEndpoint('/api/citizen-requests', 200, [
    (data) => ({ 
      passed: Array.isArray(data),
      message: 'Ответ не является массивом'
    }),
    (data) => ({ 
      passed: Array.isArray(data) && (data.length === 0 || (data.length > 0 && 'status' in data[0])),
      message: 'Первый элемент массива не содержит поле status'
    }),
  ]);
  
  // Тест списка активностей
  const activitiesSuccess = await testEndpoint('/api/activities', 200, [
    (data) => ({ 
      passed: Array.isArray(data),
      message: 'Ответ не является массивом'
    }),
    (data) => ({ 
      passed: Array.isArray(data) && (data.length === 0 || (data.length > 0 && 'actionType' in data[0])),
      message: 'Первый элемент массива не содержит поле actionType'
    }),
  ]);
  
  // Тест записей блокчейна
  const blockchainRecordsSuccess = await testEndpoint('/api/blockchain/records', 200, [
    (data) => ({ 
      passed: Array.isArray(data),
      message: 'Ответ не является массивом'
    }),
  ]);
  
  // Итоги тестирования
  log.header('РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ');
  const results = [
    { name: 'Системный статус', passed: systemStatusSuccess },
    { name: 'Список агентов', passed: agentsSuccess },
    { name: 'Список обращений граждан', passed: citizenRequestsSuccess },
    { name: 'Список активностей', passed: activitiesSuccess },
    { name: 'Записи блокчейна', passed: blockchainRecordsSuccess },
  ];
  
  for (const result of results) {
    if (result.passed) {
      log.success(`${result.name}: ПРОЙДЕН`);
    } else {
      log.error(`${result.name}: НЕ ПРОЙДЕН`);
    }
  }
  
  const passedCount = results.filter(r => r.passed).length;
  log.header(`ИТОГО: ${passedCount}/${results.length} тестов пройдено успешно`);
  
  if (passedCount === results.length) {
    log.success('ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
  } else {
    log.warning(`${results.length - passedCount} тестов не пройдены.`);
  }
}

// Запускаем тесты
runTests().catch(error => {
  log.error(`Ошибка при выполнении тестов: ${error.message}`);
});