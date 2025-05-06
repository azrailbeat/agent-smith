/**
 * Простой тест для проверки работы Jest с ES модулями
 */

// Импортируем модуль fs/promises для теста
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Получаем путь к текущему файлу и директории
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Simple Test Suite', () => {
  it('should verify Jest is working with basic assertions', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toContain('ell');
    expect([1, 2, 3]).toHaveLength(3);
  });
  
  it('should handle async functions with Promises', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
  
  it('should be able to read files using fs/promises', async () => {
    // Читаем содержимое package.json
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    
    // Проверяем наличие ключевых полей
    expect(packageJson).toHaveProperty('name');
    expect(packageJson).toHaveProperty('version');
    expect(packageJson).toHaveProperty('type', 'module');
  });

  it('should support mocks and spies', () => {
    // Создаем мок-функцию
    const mockFn = jest.fn();
    
    // Вызываем ее несколько раз
    mockFn();
    mockFn(1, 2);
    mockFn('hello');
    
    // Проверяем количество вызовов
    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(mockFn).toHaveBeenCalledWith('hello');
  });
});