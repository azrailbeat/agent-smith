import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot, Search, Settings, Save, Undo, BrainCircuit, SendHorizontal, Database, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DataQueryAssistantProps {
  onRunQuery?: (query: string) => Promise<any>;
  onSaveQuery?: (name: string, query: string) => void;
  savedQueries?: Array<{ id: string; name: string; query: string }>;
}

export const DataQueryAssistant: React.FC<DataQueryAssistantProps> = ({
  onRunQuery,
  onSaveQuery,
  savedQueries = []
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('query');
  const [queryInput, setQueryInput] = useState<string>('');
  const [queryResult, setQueryResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [saveQueryName, setSaveQueryName] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  
  // Настройки ИИ для анализа дэшбордов
  const [aiSettings, setAiSettings] = useState({
    model: 'gpt-4o',
    autoAnalyze: true,
    includeCharts: true,
    includeRawData: false,
    useTables: true,
    detailedExplanations: true,
    language: 'ru'
  });

  const handleRunQuery = async () => {
    if (!queryInput.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите вопрос для анализа данных",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setQueryResult('');

    try {
      // В реальном приложении здесь был бы запрос к API
      // Имитируем ответ от ИИ
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Формируем результат в зависимости от запроса
      let result = '';
      
      if (queryInput.toLowerCase().includes('обращени')) {
        result = `# Анализ обращений граждан

На основе имеющихся данных, я могу предоставить следующую аналитику по обращениям граждан:

## Общая статистика
- Всего обращений: 128
- Новых обращений (за последний месяц): 32
- Обработанных обращений: 96
- Среднее время обработки: 2.4 дня

## Распределение по категориям
1. Жилищно-коммунальное хозяйство: 42 (32.8%)
2. Социальные вопросы: 31 (24.2%)
3. Образование: 22 (17.2%)
4. Транспорт и дороги: 18 (14.1%)
5. Другое: 15 (11.7%)

## Эффективность обработки
- Обращения, обработанные с помощью ИИ: 78 (60.9%)
- Обращения, потребовавшие ручной обработки: 50 (39.1%)
- Удовлетворенность заявителей (на основе обратной связи): 87%

## Рекомендации
- Увеличить автоматизацию обработки социальных вопросов
- Обратить внимание на рост обращений по транспортной тематике (+18% за последний месяц)
- Улучшить время ответа в категории "Образование"`;

      } else if (queryInput.toLowerCase().includes('задач') || queryInput.toLowerCase().includes('задания')) {
        result = `# Анализ задач в системе

## Общая статистика по задачам
- Всего активных задач: 87
- Завершенных задач (за последний месяц): 134
- Просроченных задач: 12
- Среднее время выполнения: 3.8 дня

## Распределение по приоритетам
- Высокий: 15 задач (17.2%)
- Средний: 42 задачи (48.3%)
- Низкий: 30 задач (34.5%)

## Продуктивность по отделам
1. IT-отдел: 45 завершенных задач (эффективность 92%)
2. Отдел поддержки: 38 завершенных задач (эффективность 85%)
3. Аналитический отдел: 31 завершенных задач (эффективность 89%)
4. Административный отдел: 20 завершенных задач (эффективность 78%)

## Рекомендации
- Обратить внимание на просроченные задачи в Административном отделе
- Рассмотреть перераспределение нагрузки между отделами
- Оптимизировать процесс создания и назначения задач для сокращения времени выполнения`;

      } else if (queryInput.toLowerCase().includes('пользовател')) {
        result = `# Анализ пользователей системы

## Общая статистика по пользователям
- Всего активных пользователей: 64
- Новых пользователей (за последний месяц): 8
- Неактивных пользователей (более 30 дней): 5
- Администраторов: 3

## Активность пользователей
- Среднее количество сессий в день: 42
- Средняя продолжительность сессии: 47 минут
- Пиковые часы использования: 10:00-12:00, 14:00-16:00
- Наиболее активный день недели: Вторник

## Распределение по ролям
- Операторы: 28 (43.8%)
- Аналитики: 15 (23.4%)
- Руководители отделов: 8 (12.5%)
- Технические специалисты: 10 (15.6%)
- Администраторы: 3 (4.7%)

## Рекомендации
- Провести обучение для пользователей с низкой активностью
- Оптимизировать интерфейс для операторов (наиболее многочисленная группа)
- Рассмотреть вопрос о расширении прав для аналитиков для работы с отчетами`;

      } else if (queryInput.toLowerCase().includes('бюджет') || queryInput.toLowerCase().includes('финанс')) {
        result = `# Финансовая аналитика проекта

## Общая финансовая статистика
- Общий бюджет проекта: 24,500,000 ₸
- Израсходовано на текущий момент: 18,675,000 ₸ (76.2%)
- Оставшийся бюджет: 5,825,000 ₸
- Прогнозируемый перерасход: Нет (экономия 3%)

## Распределение расходов по категориям
1. Разработка и внедрение: 10,850,000 ₸ (58.1%)
2. Техническая инфраструктура: 3,740,000 ₸ (20.0%)
3. Обучение персонала: 1,680,000 ₸ (9.0%)
4. Услуги интеграции: 1,495,000 ₸ (8.0%)
5. Прочие расходы: 910,000 ₸ (4.9%)

## Эффективность расходования средств
- Коэффициент эффективности: 0.92 (хороший показатель)
- Возврат инвестиций (ROI): Ожидается 135% за 3 года
- Экономия от автоматизации: ~4,200,000 ₸ в год

## Рекомендации
- Перераспределить часть оставшегося бюджета на улучшение модуля аналитики
- Рассмотреть возможность дополнительных инвестиций в ИИ-компоненты
- Подготовить план оптимизации расходов на техническую поддержку`;

      } else {
        result = `# Общий анализ системы

На основе доступных данных, я могу предоставить следующую аналитику:

## Ключевые показатели эффективности
- Общее количество обработанных обращений: 1,245
- Активных пользователей системы: 64
- Среднее время обработки запроса: 2.8 часа
- Экономия времени сотрудников: 840 часов в месяц

## Производительность системы
- Среднее время отклика API: 320 мс
- Успешные запросы: 99.7%
- Использование ресурсов сервера: 62%
- Пиковые нагрузки: будние дни, 10:00-12:00

## Использование ИИ-агентов
- Процент запросов, обрабатываемых ИИ: 74.5%
- Точность классификации обращений: 92.3%
- Удовлетворенность ответами ИИ: 87%
- Наиболее эффективные агенты: AgentSmith (классификация), ResponseAgent (генерация ответов)

## Рекомендации
- Рассмотреть возможность масштабирования серверной инфраструктуры к концу квартала
- Улучшить интеграцию с внешними API для повышения скорости обработки
- Провести дополнительное обучение ИИ-моделей на основе накопленных данных
- Оптимизировать процесс массовой обработки обращений в пиковые часы`;
      }

      setQueryResult(result);
    } catch (error) {
      console.error('Ошибка при выполнении запроса:', error);
      setQueryResult('Произошла ошибка при обработке запроса. Пожалуйста, попробуйте снова.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveQuery = () => {
    if (!saveQueryName.trim() || !queryInput.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название и текст запроса",
        variant: "destructive",
      });
      return;
    }

    if (onSaveQuery) {
      onSaveQuery(saveQueryName, queryInput);
      setSaveQueryName('');
      setShowSaveDialog(false);
      
      toast({
        title: "Запрос сохранен",
        description: `Запрос "${saveQueryName}" успешно сохранен`,
      });
    }
  };

  const loadSavedQuery = (query: string) => {
    setQueryInput(query);
    setActiveTab('query');
  };

  const toggleSettingSwitch = (setting: keyof typeof aiSettings) => {
    setAiSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BrainCircuit className="mr-2 h-5 w-5" />
          ИИ-ассистент для анализа данных
        </CardTitle>
        <CardDescription>
          Задавайте вопросы по данным системы и получайте детальную аналитику
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="query" className="flex items-center">
              <Search className="mr-2 h-4 w-4" />
              Запрос
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center">
              <Database className="mr-2 h-4 w-4" />
              Сохраненные
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              Настройки
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="query" className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="query-input">Ваш вопрос к данным системы</Label>
              <div className="flex space-x-2">
                <Input
                  id="query-input"
                  placeholder="Например: Проанализируй статистику обращений граждан за последний месяц"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleRunQuery} 
                  disabled={isProcessing || !queryInput.trim()}
                  className="flex-shrink-0"
                >
                  {isProcessing ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Анализ...
                    </div>
                  ) : (
                    <>
                      <SendHorizontal className="mr-2 h-4 w-4" />
                      Анализировать
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between mb-2">
                <Label className="text-sm text-neutral-500">Результат анализа</Label>
                {queryResult && (
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowSaveDialog(true)}
                      className="h-8"
                    >
                      <Save className="mr-1 h-3 w-3" />
                      Сохранить
                    </Button>
                  </div>
                )}
              </div>
              
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center p-8 border rounded-md bg-neutral-50">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mb-4"></div>
                  <p className="text-neutral-600">Анализирую данные системы...</p>
                </div>
              ) : queryResult ? (
                <div className="p-4 border rounded-md bg-white max-h-[500px] overflow-y-auto">
                  <div className="prose max-w-none">
                    <div dangerouslySetInnerHTML={{ 
                      __html: queryResult.replace(/\n/g, '<br>').replace(/^# (.+)$/gm, '<h1>$1</h1>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^- (.+)$/gm, '<li>$1</li>').replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
                    }} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 border rounded-md bg-neutral-50">
                  <FileText className="h-16 w-16 text-neutral-300 mb-4" />
                  <p className="text-neutral-500 text-center">
                    Задайте вопрос, чтобы получить аналитику на основе данных системы
                  </p>
                  <div className="mt-4 text-sm text-neutral-400">
                    <p>Примеры запросов:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>Покажи статистику по обращениям граждан</li>
                      <li>Проанализируй эффективность обработки задач</li>
                      <li>Какие тренды в активности пользователей?</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
            
            {showSaveDialog && (
              <div className="mt-4 p-4 border rounded-md bg-neutral-50">
                <Label htmlFor="save-query-name" className="text-sm">Название запроса</Label>
                <div className="flex mt-1 space-x-2">
                  <Input
                    id="save-query-name"
                    placeholder="Введите название для сохранения"
                    value={saveQueryName}
                    onChange={(e) => setSaveQueryName(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleSaveQuery}
                    disabled={!saveQueryName.trim()}
                  >
                    <Save className="mr-1 h-4 w-4" />
                    Сохранить
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowSaveDialog(false)}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="saved" className="space-y-4">
            {savedQueries.length > 0 ? (
              <div className="space-y-2">
                {savedQueries.map((saved) => (
                  <div 
                    key={saved.id}
                    className="p-3 border rounded-md hover:bg-neutral-50 cursor-pointer flex justify-between items-center"
                    onClick={() => loadSavedQuery(saved.query)}
                  >
                    <div>
                      <p className="font-medium">{saved.name}</p>
                      <p className="text-sm text-neutral-500 truncate max-w-[500px]">{saved.query}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 border rounded-md bg-neutral-50">
                <Database className="h-16 w-16 text-neutral-300 mb-4" />
                <p className="text-neutral-500">У вас пока нет сохраненных запросов</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Настройки ИИ-анализа дэшбордов</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ai-model">Модель ИИ</Label>
                    <Select 
                      value={aiSettings.model} 
                      onValueChange={(value) => setAiSettings({...aiSettings, model: value})}
                    >
                      <SelectTrigger id="ai-model">
                        <SelectValue placeholder="Выберите модель" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">GPT-4o (рекомендуется)</SelectItem>
                        <SelectItem value="claude-3-7-sonnet">Claude 3.7 Sonnet</SelectItem>
                        <SelectItem value="llama-3-sonar">Llama 3 Sonar</SelectItem>
                        <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="language">Язык анализа</Label>
                    <Select 
                      value={aiSettings.language} 
                      onValueChange={(value) => setAiSettings({...aiSettings, language: value})}
                    >
                      <SelectTrigger id="language">
                        <SelectValue placeholder="Выберите язык" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ru">Русский</SelectItem>
                        <SelectItem value="kk">Казахский</SelectItem>
                        <SelectItem value="en">Английский</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-analyze" className="flex items-center">
                      <span>Автоматический анализ данных</span>
                      <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">Рекомендуется</Badge>
                    </Label>
                    <Switch 
                      id="auto-analyze" 
                      checked={aiSettings.autoAnalyze}
                      onCheckedChange={() => toggleSettingSwitch('autoAnalyze')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-charts">
                      Включать графики в анализ
                    </Label>
                    <Switch 
                      id="include-charts" 
                      checked={aiSettings.includeCharts}
                      onCheckedChange={() => toggleSettingSwitch('includeCharts')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-raw-data">
                      Включать сырые данные в анализ
                    </Label>
                    <Switch 
                      id="include-raw-data" 
                      checked={aiSettings.includeRawData}
                      onCheckedChange={() => toggleSettingSwitch('includeRawData')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="use-tables">
                      Формировать таблицы в результатах
                    </Label>
                    <Switch 
                      id="use-tables" 
                      checked={aiSettings.useTables}
                      onCheckedChange={() => toggleSettingSwitch('useTables')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="detailed-explanations">
                      Подробные объяснения в результатах
                    </Label>
                    <Switch 
                      id="detailed-explanations" 
                      checked={aiSettings.detailedExplanations}
                      onCheckedChange={() => toggleSettingSwitch('detailedExplanations')}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setAiSettings({
                model: 'gpt-4o',
                autoAnalyze: true,
                includeCharts: true,
                includeRawData: false,
                useTables: true,
                detailedExplanations: true,
                language: 'ru'
              })}>
                <Undo className="mr-1 h-4 w-4" />
                Сбросить настройки
              </Button>
              <Button>
                <Save className="mr-1 h-4 w-4" />
                Сохранить настройки
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t pt-4 text-sm text-neutral-500">
        <div className="flex items-center">
          <Bot className="h-4 w-4 mr-2" />
          Аналитика предоставляется на основе данных системы с помощью ИИ-анализа
        </div>
      </CardFooter>
    </Card>
  );
};

export default DataQueryAssistant;