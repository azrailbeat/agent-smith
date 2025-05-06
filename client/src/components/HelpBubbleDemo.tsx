import React, { useState } from 'react';
import { HelpBubble } from './ui/help-bubble';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InfoIcon, MessageSquareIcon, AlertCircleIcon, CheckCircleIcon } from 'lucide-react';

/**
 * Демонстрационный компонент для контекстных подсказок с персонажами
 */
const HelpBubbleDemo = () => {
  const [helpCount, setHelpCount] = useState(0);
  const [selectedCharacter, setSelectedCharacter] = useState('agent-smith');
  const [selectedSize, setSelectedSize] = useState('md');
  const [processing, setProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>({
    processed: 0,
    failed: 0,
    details: []
  });

  // Имитация обработки запросов
  const handleProcessRequests = () => {
    setProcessing(true);
    setShowResults(false);
    
    // Имитируем задержку обработки
    setTimeout(() => {
      // Генерируем случайные результаты обработки
      const processed = Math.floor(Math.random() * 5) + 3;
      const failed = Math.floor(Math.random() * 2);
      
      const details = [];
      for (let i = 1; i <= processed; i++) {
        details.push({
          id: i,
          success: true,
          message: `Запрос №${i} успешно обработан`,
          classification: ['Обращение', 'Жалоба', 'Запрос информации', 'Предложение'][Math.floor(Math.random() * 4)]
        });
      }
      
      for (let i = 1; i <= failed; i++) {
        details.push({
          id: processed + i,
          success: false,
          message: `Ошибка при обработке запроса №${processed + i}`,
          error: ['Недостаточно данных', 'Некорректный формат', 'Превышен лимит времени'][Math.floor(Math.random() * 3)]
        });
      }
      
      setResults({
        processed,
        failed,
        details
      });
      
      setProcessing(false);
      setShowResults(true);
      setHelpCount(prev => prev + 1); // Увеличиваем счетчик запросов помощи
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Демонстрация персонажей-помощников</CardTitle>
            <HelpBubble 
              title="О демонстрации"
              content={
                <div>
                  Этот компонент показывает, как работают контекстные подсказки с милыми персонажами. 
                  Вы можете выбрать разных персонажей, размеры и позиции подсказок.
                </div>
              }
              character="default"
              position="left"
            />
          </div>
          <CardDescription>
            Выберите персонажа и стиль отображения контекстных подсказок
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="w-[200px]">
              <label className="text-sm font-medium mb-1 block">Персонаж</label>
              <Select value={selectedCharacter} onValueChange={setSelectedCharacter}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите персонажа" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent-smith">Agent Smith</SelectItem>
                  <SelectItem value="blockchain-buddy">Blockchain Buddy</SelectItem>
                  <SelectItem value="document-helper">Document Helper</SelectItem>
                  <SelectItem value="meeting-assistant">Meeting Assistant</SelectItem>
                  <SelectItem value="default">Default Helper</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-[200px]">
              <label className="text-sm font-medium mb-1 block">Размер</label>
              <Select value={selectedSize} onValueChange={setSelectedSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите размер" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Маленький</SelectItem>
                  <SelectItem value="md">Средний</SelectItem>
                  <SelectItem value="lg">Большой</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Обработка запросов</CardTitle>
                  <HelpBubble 
                    title="Автоматическая обработка"
                    content={
                      <div>
                        Здесь вы можете запустить автоматическую обработку всех запросов с помощью AI-агента. 
                        Процесс включает в себя классификацию, обобщение и генерацию ответов.
                      </div>
                    }
                    character={selectedCharacter as any}
                    size={selectedSize as any}
                    position="top"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Запустите процесс AI-обработки обращений граждан
                </p>
                <div className="flex items-center gap-2">
                  <Button onClick={handleProcessRequests} disabled={processing}>
                    {processing ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                        Обработка...
                      </>
                    ) : 'Запустить обработку'}
                  </Button>
                  <div className="ml-auto flex items-center text-xs text-muted-foreground">
                    <InfoIcon className="h-3 w-3 mr-1" />
                    Запрошено подсказок: {helpCount}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Анализ документов</CardTitle>
                  <HelpBubble 
                    title="Работа с документами"
                    content={
                      <div>
                        Функция анализа документов позволяет автоматически извлекать ключевую информацию из загруженных файлов.
                        Поддерживаются форматы PDF, DOCX, и текстовые документы.
                      </div>
                    }
                    character="document-helper"
                    size={selectedSize as any}
                    position="bottom"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Загрузите документы для извлечения информации
                </p>
                <Button variant="outline">Выбрать файлы</Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      
      {showResults && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Результаты обработки</CardTitle>
              <HelpBubble 
                title="О результатах"
                content={
                  <div>
                    Здесь отображаются результаты автоматической обработки. 
                    Зеленым цветом отмечены успешно обработанные запросы, 
                    красным - запросы с ошибками обработки.
                  </div>
                }
                character={selectedCharacter as any}
                size={selectedSize as any}
                position="left"
              />
            </div>
            <CardDescription>
              Обработано запросов: {results.processed + results.failed}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-medium">Успешно</div>
                  <div className="text-2xl font-bold">{results.processed}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-2">
                  <AlertCircleIcon className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="text-sm font-medium">Ошибки</div>
                  <div className="text-2xl font-bold">{results.failed}</div>
                </div>
              </div>
            </div>
            
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">Все ({results.details.length})</TabsTrigger>
                <TabsTrigger value="success">Успешные ({results.processed})</TabsTrigger>
                <TabsTrigger value="errors">Ошибки ({results.failed})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="space-y-3">
                {results.details.map((detail: any) => (
                  <div 
                    key={detail.id} 
                    className={`p-3 rounded-md ${detail.success ? 'bg-green-50' : 'bg-red-50'}`}
                  >
                    <div className="flex items-start">
                      {detail.success ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircleIcon className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-sm">{detail.message}</div>
                        {detail.success ? (
                          <div className="text-xs text-muted-foreground mt-1">
                            Классификация: {detail.classification}
                          </div>
                        ) : (
                          <div className="text-xs text-red-600 mt-1">
                            Ошибка: {detail.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="success" className="space-y-3">
                {results.details.filter((d: any) => d.success).map((detail: any) => (
                  <div key={detail.id} className="p-3 rounded-md bg-green-50">
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{detail.message}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Классификация: {detail.classification}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="errors" className="space-y-3">
                {results.details.filter((d: any) => !d.success).map((detail: any) => (
                  <div key={detail.id} className="p-3 rounded-md bg-red-50">
                    <div className="flex items-start">
                      <AlertCircleIcon className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{detail.message}</div>
                        <div className="text-xs text-red-600 mt-1">
                          Ошибка: {detail.error}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between text-sm border-t pt-4">
            <div className="flex items-center text-muted-foreground">
              <MessageSquareIcon className="h-4 w-4 mr-1" /> 
              Последнее обновление: {new Date().toLocaleTimeString()}
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={() => setShowResults(false)}>
                Скрыть результаты
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default HelpBubbleDemo;