/**
 * Тесты для утилит и middleware
 */

describe('Text Processor Utils', () => {
  // Имитация функции нормализации текста
  const normalizeText = (text) => {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ');
  };
  
  // Имитация функции определения языка
  const detectLanguage = (text) => {
    if (!text) return { language: 'unknown', confidence: 0 };
    
    // Простая проверка на наличие кириллицы
    const hasCyrillic = /[а-яА-ЯёЁ]/.test(text);
    
    // Проверка на казахские буквы
    const hasKazakh = /[әғқңөұүһі]/.test(text);
    
    if (hasKazakh) {
      return { language: 'kk', confidence: 0.9 };
    } else if (hasCyrillic) {
      return { language: 'ru', confidence: 0.8 };
    } else {
      return { language: 'en', confidence: 0.7 };
    }
  };
  
  // Имитация функции транслитерации
  const transliterate = (text, direction = 'cyr2lat') => {
    if (!text) return '';
    
    const cyrToLat = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
      'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
      'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
      'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
      'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch',
      'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
      'э': 'e', 'ю': 'yu', 'я': 'ya'
    };
    
    const latToCyr = {};
    Object.entries(cyrToLat).forEach(([cyr, lat]) => {
      if (lat) latToCyr[lat] = cyr;
    });
    
    if (direction === 'cyr2lat') {
      return text.toLowerCase().split('').map(char => 
        cyrToLat[char] || char
      ).join('');
    } else {
      // Это упрощенная версия, для настоящей транслитерации нужна более сложная логика
      return text.toLowerCase().split('').map(char => 
        latToCyr[char] || char
      ).join('');
    }
  };
  
  test('normalizeText should remove extra whitespace', () => {
    expect(normalizeText('  Hello   World  ')).toBe('Hello World');
    expect(normalizeText('Привет    Мир   ')).toBe('Привет Мир');
    expect(normalizeText('  Multiple   spaces    between   words  ')).toBe('Multiple spaces between words');
  });
  
  test('normalizeText should handle empty and null input', () => {
    expect(normalizeText('')).toBe('');
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
  });
  
  test('detectLanguage should identify Russian text', () => {
    const result = detectLanguage('Пример текста на русском языке');
    expect(result.language).toBe('ru');
    expect(result.confidence).toBeGreaterThan(0);
  });
  
  test('detectLanguage should identify Kazakh text', () => {
    const result = detectLanguage('Қазақ тіліндегі мәтін үлгісі');
    expect(result.language).toBe('kk');
    expect(result.confidence).toBeGreaterThan(0);
  });
  
  test('detectLanguage should identify English text', () => {
    const result = detectLanguage('This is an example of English text');
    expect(result.language).toBe('en');
    expect(result.confidence).toBeGreaterThan(0);
  });
  
  test('transliterate should convert Cyrillic to Latin', () => {
    expect(transliterate('привет')).toBe('privet');
    expect(transliterate('Пример')).toBe('primer');
    expect(transliterate('Россия')).toBe('rossiya');
  });
  
  test('transliterate should handle mixed text', () => {
    expect(transliterate('Привет, world!')).toBe('privet, world!');
    expect(transliterate('Hello, мир!')).toBe('hello, mir!');
  });
});

describe('Error Handler Middleware', () => {
  // Имитация функции обработчика ошибок
  const errorHandler = (err, req, res, next) => {
    // Определяем статус ошибки
    const status = err.statusCode || 500;
    
    // Форматируем сообщение об ошибке
    const errorResponse = {
      error: {
        message: err.message || 'Internal Server Error',
        code: err.code || 'ERROR',
        status
      }
    };
    
    // В тестовой среде добавляем стек ошибки
    if (process.env.NODE_ENV === 'test') {
      errorResponse.error.stack = err.stack;
    }
    
    // Логируем ошибку (в тестах просто возвращаем ее)
    return {
      status,
      body: errorResponse
    };
  };
  
  test('errorHandler should handle known errors with status code', () => {
    const knownError = new Error('Not Found');
    knownError.statusCode = 404;
    knownError.code = 'NOT_FOUND';
    
    const result = errorHandler(knownError, {}, {}, () => {});
    
    expect(result.status).toBe(404);
    expect(result.body.error.message).toBe('Not Found');
    expect(result.body.error.code).toBe('NOT_FOUND');
  });
  
  test('errorHandler should use default values for generic errors', () => {
    const genericError = new Error('Something went wrong');
    
    const result = errorHandler(genericError, {}, {}, () => {});
    
    expect(result.status).toBe(500);
    expect(result.body.error.message).toBe('Something went wrong');
    expect(result.body.error.code).toBe('ERROR');
  });
  
  test('errorHandler should include stack trace in test environment', () => {
    process.env.NODE_ENV = 'test';
    
    const error = new Error('Test Error');
    const result = errorHandler(error, {}, {}, () => {});
    
    expect(result.body.error.stack).toBeDefined();
  });
});

describe('Cache Middleware', () => {
  // Имитация кэш-мидлвера
  const cacheMiddleware = (duration) => {
    const cache = new Map();
    
    return (req, key, next) => {
      // Ключ кэша - URL или переданный ключ
      const cacheKey = key || req.url;
      
      // Проверяем наличие данных в кэше
      if (cache.has(cacheKey)) {
        const cachedItem = cache.get(cacheKey);
        
        // Проверяем валидность кэша
        if (cachedItem.expires > Date.now()) {
          return cachedItem.data;
        }
        
        // Если кэш устарел, удаляем его
        cache.delete(cacheKey);
      }
      
      // Если данных в кэше нет или они устарели, вызываем следующий обработчик
      const result = next();
      
      // Сохраняем результат в кэш
      cache.set(cacheKey, {
        data: result,
        expires: Date.now() + (duration * 1000)
      });
      
      return result;
    };
  };
  
  test('cacheMiddleware should cache responses', () => {
    const middleware = cacheMiddleware(60); // 60 секунд
    let counter = 0;
    
    const req = { url: '/test' };
    const getData = () => {
      counter++;
      return { data: 'test', counter };
    };
    
    // Первый вызов - данных в кэше нет
    const result1 = middleware(req, null, getData);
    expect(result1.counter).toBe(1);
    
    // Второй вызов - данные берутся из кэша
    const result2 = middleware(req, null, getData);
    expect(result2.counter).toBe(1); // счетчик не увеличился
    
    // Третий вызов с другим ключом - данных в кэше нет
    const result3 = middleware(req, 'other_key', getData);
    expect(result3.counter).toBe(2);
  });
  
  test('cacheMiddleware should respect TTL', async () => {
    const middleware = cacheMiddleware(1); // 1 секунда
    let counter = 0;
    
    const req = { url: '/test-ttl' };
    const getData = () => {
      counter++;
      return { data: 'test-ttl', counter };
    };
    
    // Первый вызов
    const result1 = middleware(req, null, getData);
    expect(result1.counter).toBe(1);
    
    // Подождем, пока кэш устареет
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Второй вызов после истечения TTL - данные генерируются заново
    const result2 = middleware(req, null, getData);
    expect(result2.counter).toBe(2);
  });
});