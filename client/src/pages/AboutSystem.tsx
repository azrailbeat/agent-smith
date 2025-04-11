import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  CloudLightning, 
  Database, 
  FileBox, 
  FileCheck, 
  Languages, 
  MessageSquare, 
  Shield, 
  Users, 
  BarChart2,
  FileText,
  LucideIcon
} from "lucide-react";

interface FeatureProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const Feature = ({ icon: Icon, title, description }: FeatureProps) => (
  <div className="flex items-start space-x-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mt-1 shrink-0 rounded-full bg-emerald-100 p-2">
      <Icon className="h-5 w-5 text-emerald-600" />
    </div>
    <div>
      <h3 className="font-medium text-slate-800">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </div>
  </div>
);

interface APISectionProps {
  title: string;
  description: string;
  endpoint: string;
  parameters: { name: string; type: string; description: string }[];
}

const APISection = ({ title, description, endpoint, parameters }: APISectionProps) => (
  <div className="mb-6">
    <h3 className="text-lg font-medium text-slate-800">{title}</h3>
    <p className="mt-1 text-slate-600">{description}</p>
    
    <div className="mt-3 rounded-md bg-slate-50 p-3 font-mono text-sm">
      <div className="text-emerald-600">Endpoint: <span className="text-slate-800">{endpoint}</span></div>
    </div>
    
    {parameters.length > 0 && (
      <div className="mt-3">
        <p className="font-medium text-slate-700">Параметры:</p>
        <ul className="mt-2 space-y-2">
          {parameters.map((param, index) => (
            <li key={index} className="grid grid-cols-12 gap-2 border-b border-slate-100 pb-2">
              <span className="col-span-3 font-mono text-sm text-slate-800">{param.name}</span>
              <span className="col-span-2 text-xs font-medium text-slate-500">{param.type}</span>
              <span className="col-span-7 text-sm text-slate-600">{param.description}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

const AboutSystem = () => {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">О системе Agent Smith</h1>
        <p className="mt-2 text-xl text-slate-600">
          Интеллектуальная платформа для государственных служб
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="features">Функциональность</TabsTrigger>
          <TabsTrigger value="apis">API и интеграции</TabsTrigger>
          <TabsTrigger value="tech">Технологии</TabsTrigger>
        </TabsList>

        {/* Обзор системы */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Что такое Agent Smith?</CardTitle>
                  <CardDescription>
                    Комплексное ИИ-решение для государственного сектора
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>
                    Agent Smith - это интегрированная платформа искусственного интеллекта, специально разработанная для оптимизации и автоматизации процессов государственного управления. 
                    Система сочетает передовые технологии ИИ с блокчейн-инфраструктурой для обеспечения надежности, прозрачности и безопасности.
                  </p>
                  <p>
                    Платформа разработана для стандартизации и упрощения ключевых процессов, связанных с обработкой документов, переводом, протоколированием и анализом данных.
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Ключевые преимущества</CardTitle>
                  <CardDescription>
                    Почему Agent Smith эффективен для госструктур
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <div className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <span>Сокращение бюрократических процедур на 60-80%</span>
                    </li>
                    <li className="flex items-center">
                      <div className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <span>Блокчейн-подтверждение подлинности всех решений</span>
                    </li>
                    <li className="flex items-center">
                      <div className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <span>Многоязычная поддержка с мгновенным переводом</span>
                    </li>
                    <li className="flex items-center">
                      <div className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <span>Интуитивно понятный интерфейс для всех уровней пользователей</span>
                    </li>
                    <li className="flex items-center">
                      <div className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <span>Высокая степень защиты данных и соответствие нормативам</span>
                    </li>
                    <li className="flex items-center">
                      <div className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <span>Адаптация к рабочим процессам организации</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Функциональность системы */}
        <TabsContent value="features">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Feature 
              icon={FileBox} 
              title="Обработка обращений граждан" 
              description="Автоматизированная система для приёма, классификации и маршрутизации обращений граждан с возможностью автоматической генерации ответов." 
            />
            <Feature 
              icon={FileText} 
              title="Управление протоколами встреч" 
              description="Инструмент для составления, редактирования и отслеживания протоколов встреч, с функцией автоматической генерации и отслеживания задач." 
            />
            <Feature 
              icon={Shield} 
              title="Блокчейн-верификация" 
              description="Все ключевые решения и документы сохраняются в блокчейне, обеспечивая их неизменность и возможность проверки подлинности." 
            />
            <Feature 
              icon={Languages} 
              title="Мультиязычность и перевод" 
              description="Моментальный перевод текстов и документов с поддержкой казахского, русского и английского языков, включая распознавание речи." 
            />
            <Feature 
              icon={MessageSquare} 
              title="ИИ-ассистенты на каждой странице" 
              description="Интеллектуальные помощники, обученные на нормативной базе, помогают с формированием документов и принятием решений." 
            />
            <Feature 
              icon={BarChart2} 
              title="Аналитика и отчётность" 
              description="Система визуализации данных для анализа эффективности работы, выявления узких мест и прогнозирования потребностей." 
            />
            <Feature 
              icon={Users} 
              title="Институциональная память" 
              description="Сохранение и структурирование знаний организации с учетом текучести кадров в госсекторе." 
            />
            <Feature 
              icon={Database} 
              title="Хранение документов" 
              description="Централизованное и категоризированное хранилище документов с функциями поиска и контроля доступа." 
            />
            <Feature 
              icon={CloudLightning} 
              title="API-интеграции" 
              description="Гибкая система интеграции с внешними сервисами и базами данных для обмена информацией." 
            />
          </div>
        </TabsContent>

        {/* API и интеграции */}
        <TabsContent value="apis">
          <Card>
            <CardHeader>
              <CardTitle>Доступные API и точки интеграции</CardTitle>
              <CardDescription>
                Agent Smith предоставляет набор API для интеграции с другими системами
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Блокчейн API</AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <APISection 
                      title="Запись данных в блокчейн" 
                      description="Позволяет записывать хеши документов и решений в систему блокчейн для дальнейшей верификации" 
                      endpoint="/api/blockchain/record"
                      parameters={[
                        { name: "type", type: "string", description: "Тип записи (document, decision, protocol)" },
                        { name: "title", type: "string", description: "Название или идентификатор записи" },
                        { name: "content", type: "string", description: "Хеш содержимого для записи" },
                        { name: "metadata", type: "object", description: "Дополнительные метаданные (опционально)" }
                      ]}
                    />
                    
                    <APISection 
                      title="Верификация записи в блокчейне" 
                      description="Проверка существования и подлинности записи по её хешу" 
                      endpoint="/api/blockchain/verify"
                      parameters={[
                        { name: "transactionHash", type: "string", description: "Хеш транзакции блокчейна для проверки" }
                      ]}
                    />
                    
                    <APISection 
                      title="Получение последних записей" 
                      description="Получение списка последних записей в блокчейне" 
                      endpoint="/api/blockchain/records"
                      parameters={[
                        { name: "limit", type: "number", description: "Количество записей (опционально, по умолчанию 10)" },
                        { name: "type", type: "string", description: "Фильтр по типу записи (опционально)" }
                      ]}
                    />
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-2">
                  <AccordionTrigger>API обработки документов</AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <APISection 
                      title="Загрузка документа" 
                      description="Загрузка и автоматическая обработка документа" 
                      endpoint="/api/documents/upload"
                      parameters={[
                        { name: "file", type: "File", description: "Файл документа" },
                        { name: "title", type: "string", description: "Название документа" },
                        { name: "taskId", type: "number", description: "ID связанной задачи (опционально)" }
                      ]}
                    />
                    
                    <APISection 
                      title="Извлечение данных из документа" 
                      description="Извлечение структурированной информации из документа с помощью ИИ" 
                      endpoint="/api/documents/extract"
                      parameters={[
                        { name: "documentId", type: "number", description: "ID документа" },
                        { name: "fields", type: "string[]", description: "Список полей для извлечения (опционально)" }
                      ]}
                    />
                    
                    <APISection 
                      title="Генерация документа" 
                      description="Автоматическая генерация документа на основе шаблона и данных" 
                      endpoint="/api/documents/generate"
                      parameters={[
                        { name: "templateId", type: "number", description: "ID шаблона документа" },
                        { name: "data", type: "object", description: "Данные для заполнения шаблона" }
                      ]}
                    />
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-3">
                  <AccordionTrigger>API перевода и транскрипции</AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <APISection 
                      title="Перевод текста" 
                      description="Перевод текста между поддерживаемыми языками" 
                      endpoint="/api/translate/text"
                      parameters={[
                        { name: "text", type: "string", description: "Текст для перевода" },
                        { name: "sourceLanguage", type: "string", description: "Исходный язык (kk, ru, en или auto)" },
                        { name: "targetLanguage", type: "string", description: "Целевой язык (kk, ru, en)" }
                      ]}
                    />
                    
                    <APISection 
                      title="Перевод документа" 
                      description="Перевод содержимого документа" 
                      endpoint="/api/translate/document"
                      parameters={[
                        { name: "documentId", type: "number", description: "ID документа" },
                        { name: "targetLanguage", type: "string", description: "Целевой язык перевода" }
                      ]}
                    />
                    
                    <APISection 
                      title="Транскрипция аудио" 
                      description="Преобразование аудио в текст с распознаванием языка" 
                      endpoint="/api/speech/transcribe"
                      parameters={[
                        { name: "audioFile", type: "File", description: "Аудиофайл для транскрипции" },
                        { name: "language", type: "string", description: "Язык аудио (опционально, автоопределение)" }
                      ]}
                    />
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-4">
                  <AccordionTrigger>API управления ИИ-агентами</AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <APISection 
                      title="Список доступных агентов" 
                      description="Получение списка настроенных ИИ-агентов" 
                      endpoint="/api/agents"
                      parameters={[
                        { name: "type", type: "string", description: "Фильтр по типу агента (опционально)" },
                        { name: "isActive", type: "boolean", description: "Фильтр по активности (опционально)" }
                      ]}
                    />
                    
                    <APISection 
                      title="Взаимодействие с агентом" 
                      description="Отправка запроса и получение ответа от конкретного агента" 
                      endpoint="/api/agents/:id/query"
                      parameters={[
                        { name: "query", type: "string", description: "Запрос к агенту" },
                        { name: "context", type: "object", description: "Контекст запроса (опционально)" }
                      ]}
                    />
                    
                    <APISection 
                      title="Управление агентами" 
                      description="Создание, обновление и настройка ИИ-агентов" 
                      endpoint="/api/agents"
                      parameters={[
                        { name: "name", type: "string", description: "Имя агента" },
                        { name: "type", type: "string", description: "Тип агента" },
                        { name: "description", type: "string", description: "Описание агента" },
                        { name: "modelId", type: "number", description: "ID модели ИИ" },
                        { name: "systemPrompt", type: "string", description: "Системный промпт" },
                        { name: "config", type: "object", description: "Дополнительная конфигурация" }
                      ]}
                    />
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-5">
                  <AccordionTrigger>API внешних интеграций</AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <APISection 
                      title="Список интеграций" 
                      description="Получение списка настроенных внешних интеграций" 
                      endpoint="/api/integrations"
                      parameters={[
                        { name: "type", type: "string", description: "Фильтр по типу интеграции (опционально)" }
                      ]}
                    />
                    
                    <APISection 
                      title="Создание интеграции" 
                      description="Настройка новой интеграции с внешней системой" 
                      endpoint="/api/integrations"
                      parameters={[
                        { name: "name", type: "string", description: "Название интеграции" },
                        { name: "type", type: "string", description: "Тип интеграции (OpenProject, Planka, Telegram, etc)" },
                        { name: "apiUrl", type: "string", description: "URL API внешней системы" },
                        { name: "apiKey", type: "string", description: "Ключ API для авторизации" },
                        { name: "config", type: "object", description: "Дополнительная конфигурация" }
                      ]}
                    />
                    
                    <APISection 
                      title="Отправка данных во внешнюю систему" 
                      description="Отправка данных через настроенную интеграцию" 
                      endpoint="/api/integrations/:id/send"
                      parameters={[
                        { name: "data", type: "object", description: "Данные для отправки" },
                        { name: "endpoint", type: "string", description: "Конечная точка внешнего API (опционально)" }
                      ]}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Технологии */}
        <TabsContent value="tech">
          <Card>
            <CardHeader>
              <CardTitle>Технологический стек</CardTitle>
              <CardDescription>
                Agent Smith использует современные технологии для обеспечения надежности и производительности
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-lg font-medium text-slate-800 mb-2">Фронтенд</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <div className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <div>
                        <span className="font-medium">React + TypeScript</span>
                        <p className="text-sm text-slate-600">Современный веб-интерфейс с типизацией</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <div>
                        <span className="font-medium">Shadcn UI + Tailwind CSS</span>
                        <p className="text-sm text-slate-600">Доступные и адаптивные компоненты интерфейса</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <div>
                        <span className="font-medium">TanStack Query</span>
                        <p className="text-sm text-slate-600">Эффективное управление состоянием данных</p>
                      </div>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-slate-800 mb-2">Бэкенд</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <div className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <div>
                        <span className="font-medium">Node.js + Express</span>
                        <p className="text-sm text-slate-600">Высокопроизводительный серверный стек</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <div>
                        <span className="font-medium">PostgreSQL + Drizzle ORM</span>
                        <p className="text-sm text-slate-600">Надежное хранение и доступ к данным</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <div>
                        <span className="font-medium">WebSocket</span>
                        <p className="text-sm text-slate-600">Двусторонняя связь в реальном времени</p>
                      </div>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-slate-800 mb-2">ИИ и обработка данных</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <div className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <div>
                        <span className="font-medium">OpenAI GPT-4o</span>
                        <p className="text-sm text-slate-600">Современная языковая модель для обработки текста</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <div>
                        <span className="font-medium">Yandex Speech Kit</span>
                        <p className="text-sm text-slate-600">Распознавание казахской и русской речи</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <div>
                        <span className="font-medium">Whisper</span>
                        <p className="text-sm text-slate-600">Распознавание речи на множестве языков</p>
                      </div>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-slate-800 mb-2">Безопасность и инфраструктура</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <div className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <div>
                        <span className="font-medium">Hyperledger Besu</span>
                        <p className="text-sm text-slate-600">Распределенный реестр для безопасного хранения</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <div>
                        <span className="font-medium">PKI (Public Key Infrastructure)</span>
                        <p className="text-sm text-slate-600">Цифровые подписи и шифрование</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <div>
                        <span className="font-medium">Docker + Kubernetes</span>
                        <p className="text-sm text-slate-600">Масштабируемое и отказоустойчивое развертывание</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AboutSystem;