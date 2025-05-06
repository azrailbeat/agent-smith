/**
 * Компонент TestHarness для запуска тестов обработки обращений граждан
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, AlertTriangle, Play, Terminal } from 'lucide-react';
import { runTests } from '../tests/test-runner';

/**
 * Компонент для запуска и отображения результатов тестов обработки обращений граждан
 * @returns {JSX.Element}
 */
const TestHarness = () => {
  const [selectedTest, setSelectedTest] = useState('all');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  
  /**
   * Обработчик запуска тестов
   */
  const handleRunTests = async () => {
    setIsRunning(true);
    setResults(null);
    setError(null);
    
    try {
      // Создаем перехватчик вывода в консоль для сбора результатов
      const origConsoleLog = console.log;
      const origConsoleError = console.error;
      const origConsoleWarn = console.warn;
      
      // Коллекции для хранения логов
      const logs = [];
      const errors = [];
      const warnings = [];
      
      // Перехватываем лог-сообщения
      console.log = (...args) => {
        logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
        origConsoleLog(...args);
      };
      
      console.error = (...args) => {
        errors.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
        origConsoleError(...args);
      };
      
      console.warn = (...args) => {
        warnings.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
        origConsoleWarn(...args);
      };
      
      // Запускаем тесты
      await runTests(selectedTest);
      
      // Восстанавливаем оригинальные методы консоли
      console.log = origConsoleLog;
      console.error = origConsoleError;
      console.warn = origConsoleWarn;
      
      // Сохраняем результаты
      setResults({
        logs,
        errors,
        warnings,
        status: errors.length > 0 ? 'failed' : 'success'
      });
      
    } catch (err) {
      console.error('Error running tests:', err);
      setError(err.message || 'Неизвестная ошибка при выполнении тестов');
    } finally {
      setIsRunning(false);
    }
  };
  
  /**
   * Отображение результатов тестов
   */
  const renderResults = () => {
    if (!results) return null;
    
    return (
      <div className="mt-4 space-y-4">
        {results.status === 'success' && results.errors.length === 0 ? (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle>Тесты успешно выполнены</AlertTitle>
            <AlertDescription>
              Все тесты завершились успешно без критических ошибок.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertTitle>Обнаружены ошибки</AlertTitle>
            <AlertDescription>
              Найдено {results.errors.length} ошибок и {results.warnings.length} предупреждений при выполнении тестов.
            </AlertDescription>
          </Alert>
        )}
        
        {results.warnings.length > 0 && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertTitle>Предупреждения</AlertTitle>
            <AlertDescription>
              <div className="mt-2 max-h-[150px] overflow-y-auto bg-amber-50/50 p-2 rounded text-sm font-mono">
                {results.warnings.map((warn, i) => (
                  <div key={i} className="py-1 border-b border-amber-100">{warn}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Лог тестирования
            </CardTitle>
            <CardDescription>
              {results.logs.length} сообщений, {results.errors.length} ошибок, {results.warnings.length} предупреждений
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-950 text-gray-100 p-4 rounded-md max-h-[400px] overflow-y-auto font-mono text-sm">
              {results.logs.map((log, i) => (
                <div key={i} className="py-0.5">{log}</div>
              ))}
              
              {results.errors.map((err, i) => (
                <div key={`err-${i}`} className="py-0.5 text-red-400">ERROR: {err}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  /**
   * Отображение ошибки выполнения
   */
  const renderError = () => {
    if (!error) return null;
    
    return (
      <Alert className="mt-4 bg-red-50 border-red-200">
        <AlertCircle className="h-4 w-4 text-red-500" />
        <AlertTitle>Ошибка выполнения тестов</AlertTitle>
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Тестирование обработки обращений</CardTitle>
        <CardDescription>
          Запуск тестов для проверки функциональности обработки обращений граждан
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="w-64">
            <Select value={selectedTest} onValueChange={setSelectedTest} disabled={isRunning}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип тестов" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все тесты</SelectItem>
                <SelectItem value="validation">Валидация данных</SelectItem>
                <SelectItem value="processing">Обработка обращений</SelectItem>
                <SelectItem value="batch">Массовая обработка</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={handleRunTests} disabled={isRunning}>
            {isRunning ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                Выполнение тестов...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Запустить тесты
              </>
            )}
          </Button>
        </div>
        
        {renderResults()}
        {renderError()}
      </CardContent>
      
      <CardFooter className="flex justify-between text-xs text-gray-500">
        <div>Тесты запускаются в браузере и используют реальное API</div>
        <div>
          {results && results.status === 'success' ? (
            <span className="text-green-600 flex items-center">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Все тесты прошли успешно
            </span>
          ) : results && results.status === 'failed' ? (
            <span className="text-red-600 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              Есть проблемы с тестами
            </span>
          ) : null}
        </div>
      </CardFooter>
    </Card>
  );
};

export default TestHarness;