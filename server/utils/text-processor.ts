/**
 * Утилиты для обработки текста
 * 
 * Набор функций для обработки текста, включая работу с кириллицей,
 * нормализацию текста и определение языка.
 */

/**
 * Определить предполагаемый язык текста на основе символов
 * @param text Входной текст
 * @returns Код языка (ru, kk, en) или null, если не удалось определить
 */
export function detectLanguageByChars(text: string): string | null {
  if (!text || typeof text !== 'string') {
    return null;
  }
  
  // Очищаем текст от пробелов и специальных символов
  const cleanText = text.replace(/[^a-zA-Zа-яА-ЯәіңғүұқөһӘІҢҒҮҰҚӨҺ]/g, '');
  
  if (cleanText.length === 0) {
    return null;
  }
  
  // Подсчитываем символы для каждого языка
  let cyrillicCount = 0;
  let latinCount = 0;
  let kazakhSpecificCount = 0;
  
  for (const char of cleanText) {
    // Кириллица (русский и казахский)
    if (/[а-яА-Я]/.test(char)) {
      cyrillicCount++;
    }
    // Латиница (английский)
    else if (/[a-zA-Z]/.test(char)) {
      latinCount++;
    }
    // Специфические символы казахского языка
    else if (/[әіңғүұқөһӘІҢҒҮҰҚӨҺ]/.test(char)) {
      kazakhSpecificCount++;
      cyrillicCount++; // Также считаем как кириллические
    }
  }
  
  const total = cleanText.length;
  const cyrillicRatio = cyrillicCount / total;
  const latinRatio = latinCount / total;
  const kazakhRatio = kazakhSpecificCount / total;
  
  // Определяем язык на основе преобладающих символов
  if (cyrillicRatio >= 0.5) {
    // Если есть специфические символы казахского языка
    if (kazakhRatio > 0.05) {
      return 'kk';
    }
    return 'ru';
  } else if (latinRatio >= 0.5) {
    return 'en';
  }
  
  return null;
}

/**
 * Нормализовать кириллический текст, исправляя возможные проблемы с кодировкой
 * @param text Входной текст
 * @returns Нормализованный текст
 */
export function normalizeCyrillicText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // Заменяем некорректные символы UTF-8
  const normalizedText = text
    .replace(/[\uFFFD\uD800-\uDFFF]/g, '') // Удаляем некорректные символы
    .replace(/[^\x00-\x7F\u0400-\u04FF\u0500-\u052F\u2DE0-\u2DFF\uA640-\uA69F]/g, ''); // Оставляем только ASCII и кириллицу
  
  return normalizedText;
}

/**
 * Проверить валидность UTF-8 текста
 * @param text Входной текст
 * @returns true, если текст является валидным UTF-8, иначе false
 */
export function isValidUtf8(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  // Проверяем на наличие некорректных символов UTF-8
  return !text.includes('\uFFFD') && 
         !/[\uD800-\uDFFF]/.test(text) &&
         !/\uFFFE|\uFFFF/g.test(text);
}

/**
 * Преобразовать первую букву строки в верхний регистр
 * @param text Входной текст
 * @returns Текст с заглавной первой буквой
 */
export function capitalizeFirstLetter(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Сократить текст до указанной длины, добавляя многоточие
 * @param text Входной текст
 * @param maxLength Максимальная длина текста
 * @returns Сокращенный текст
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  if (text.length <= maxLength) {
    return text;
  }
  
  // Находим последний пробел перед maxLength
  const lastSpace = text.lastIndexOf(' ', maxLength);
  
  if (lastSpace > 0) {
    return text.substring(0, lastSpace) + '...';
  }
  
  return text.substring(0, maxLength) + '...';
}

/**
 * Удалить HTML-теги из текста
 * @param html Входной HTML-текст
 * @returns Текст без HTML-тегов
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Проверить содержит ли текст кириллические символы
 * @param text Входной текст
 * @returns true, если текст содержит кириллицу, иначе false
 */
export function containsCyrillic(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  return /[а-яА-ЯәіңғүұқөһӘІҢҒҮҰҚӨҺ]/.test(text);
}

/**
 * Нормализовать JSON-строку, исправляя возможные проблемы с кодировкой
 * @param jsonString Входная JSON-строка
 * @returns Нормализованная JSON-строка
 */
export function normalizeJsonString(jsonString: string): string {
  if (!jsonString || typeof jsonString !== 'string') {
    return '{}';
  }
  
  try {
    // Парсим JSON и снова сериализуем его, чтобы исправить возможные проблемы
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed);
  } catch (error) {
    console.error('Ошибка при нормализации JSON-строки:', error);
    
    // Пытаемся исправить некоторые распространенные проблемы
    const fixedString = jsonString
      .replace(/[\uFFFD\uD800-\uDFFF]/g, '') // Удаляем некорректные символы
      .replace(/\\"/g, '"') // Исправляем экранированные кавычки
      .replace(/"{/g, '{').replace(/}"/g, '}') // Исправляем экранированные фигурные скобки
      .replace(/"\[/g, '[').replace(/\]"/g, ']'); // Исправляем экранированные квадратные скобки
    
    try {
      JSON.parse(fixedString);
      return fixedString;
    } catch (error) {
      console.error('Не удалось восстановить JSON-строку:', error);
      return '{}';
    }
  }
}