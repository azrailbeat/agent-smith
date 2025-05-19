import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useSystemSettings } from '@/hooks/use-system-settings';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Mail, Users, Cog, Database, Code2, FileText } from 'lucide-react';

const IntegrationSettings = () => {
  const { settings, isLoading, updateSettings } = useSystemSettings();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('2h6EdTNLGA8KFzhYGnIVLjMyRBrf83t9');
  const [externalApiEnabled, setExternalApiEnabled] = useState(true);
  const [automaticProcessing, setAutomaticProcessing] = useState(true);
  const [defaultAgent, setDefaultAgent] = useState('Обработка обращений граждан');
  
  const generateNewApiKey = () => {
    // In a real app, this would call an API to generate a secure key
    const randomKey = Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    setApiKey(randomKey);
    toast({
      title: 'Новый ключ сгенерирован',
      description: 'Ключ API был успешно обновлен',
    });
  };

  const handleSaveChanges = () => {
    // In a real app, this would save all your integration settings to the backend
    toast({
      title: 'Настройки сохранены',
      description: 'Изменения были успешно применены',
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>;
  }

  return (
    <div className="container mx-auto p-6">
      <Breadcrumbs 
        items={[
          { title: 'Главная', href: '/' },
          { title: 'Настройки', href: '/system-settings' },
          { title: 'Настройки интеграций', href: '/integration-settings' }
        ]} 
      />
      
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        <Cog className="w-6 h-6 mr-2" />
        Настройки интеграций
      </h1>
      
      <Tabs defaultValue="api" className="w-full">
        <TabsList className="grid grid-cols-5 mb-8 bg-muted/20">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>Настройки Email</span>
          </TabsTrigger>
          <TabsTrigger value="active-directory" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Active Directory</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            <span>API для обращений</span>
          </TabsTrigger>
          <TabsTrigger value="widget" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>Виджет для сайта</span>
          </TabsTrigger>
          <TabsTrigger value="html-form" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>HTML форма</span>
          </TabsTrigger>
        </TabsList>
        
        {/* API для обращений */}
        <TabsContent value="api" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">API для внешних обращений</h2>
            <p className="text-muted-foreground mb-6">
              Настройки API для получения обращений от граждан через внешние системы
            </p>
            
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch 
                  id="external-api" 
                  checked={externalApiEnabled}
                  onCheckedChange={setExternalApiEnabled}
                />
                <Label htmlFor="external-api">Включить внешний API</Label>
              </div>
              <Button 
                variant="outline" 
                onClick={generateNewApiKey}
                className="bg-white"
              >
                Сгенерировать новый ключ
              </Button>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Доступ к API</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Тип авторизации</Label>
                  <Select defaultValue="api-key">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите тип авторизации" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="api-key">API ключ</SelectItem>
                      <SelectItem value="jwt">JWT токен</SelectItem>
                      <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>API Ключ</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={apiKey} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button variant="ghost" size="icon" onClick={() => {
                      navigator.clipboard.writeText(apiKey);
                      toast({
                        title: 'Скопировано!',
                        description: 'API ключ скопирован в буфер обмена',
                      });
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c0-1.1.9-2 2-2h2"/><path d="M4 12c0-1.1.9-2 2-2h2"/><path d="M4 8c0-1.1.9-2 2-2h2"/></svg>
                    </Button>
                    <Button variant="ghost" size="icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 12a9 9 0 0 0 15 6.7L21 16"/><path d="M21 16v6h-6"/></svg>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">API ключ используется для авторизации запросов от внешних систем</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Обработка обращений</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-6">
                  <Switch 
                    id="auto-process" 
                    checked={automaticProcessing}
                    onCheckedChange={setAutomaticProcessing}
                  />
                  <Label htmlFor="auto-process">Автоматически обрабатывать обращения</Label>
                </div>
                
                <div className="space-y-2">
                  <Label>AI Агент по умолчанию</Label>
                  <Select defaultValue="citizen-request">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите агента" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="citizen-request">Обработка обращений граждан</SelectItem>
                      <SelectItem value="document-review">Анализ документов</SelectItem>
                      <SelectItem value="task-assignment">Распределение задач</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Агент, который будет использоваться для автоматической обработки входящих обращений</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Пример использования API</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-[#0A0E14] text-[#B3B1AD] p-4 rounded-md text-xs overflow-x-auto">
{`POST /api/external/citizen-requests
curl -X POST https://agent-smith.replit.app/api/external/citizen-requests \\
-H "Content-Type: application/json" \\
-H "X-API-Key: ${apiKey}" \\
-d '{
  "fullName": "Иван Петров",
  "contactInfo": "ivan@example.com",
  "subject": "Справка о составе семьи",
  "description": "Прошу предоставить справку о составе семьи",
  "requestType": "Справка",
  "priority": "medium",
  "externalId": "REQ-1234",
  "sourceSystem": "portal"
}'`}
                </pre>
                <p className="text-xs text-muted-foreground mt-4">Используйте этот эндпоинт для отправки обращений граждан из внешних систем</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Виджет для сайта */}
        <TabsContent value="widget" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Настройки виджета</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Заголовок</Label>
                    <Input defaultValue="Отправить обращение" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Форма обращения</Label>
                    <Input defaultValue="Стандартная форма" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Подзаголовок</Label>
                    <Input defaultValue="Заполните форму, чтобы отправить обращение" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Показывать описание формы обращения</Label>
                    <Input defaultValue="Введите необходимую информацию для обработки вашего обращения" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Тема оформления</Label>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <input type="radio" id="theme-light" name="theme" defaultChecked />
                        <Label htmlFor="theme-light">Светлая</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="radio" id="theme-dark" name="theme" />
                        <Label htmlFor="theme-dark">Темная</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Основной цвет</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" defaultValue="#143DE6" className="w-16 h-8" />
                      <Input value="#143DE6" className="w-28" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Поля формы</CardTitle>
                  <CardDescription>Настройте поля, которые будут отображаться в форме обращения</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center gap-4 border-b pb-4">
                    <div className="flex gap-2">
                      <input type="checkbox" id="field-name" defaultChecked />
                      <div>
                        <Label htmlFor="field-name">Тип поля</Label>
                        <p className="text-xs text-muted-foreground">Текстовое поле</p>
                      </div>
                    </div>
                    <div>
                      <Label>Заголовок</Label>
                      <p className="text-xs">ФИО</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1-8.313-12.454Z"/><path d="m17 4 3 3"/><path d="m14 7 3-3"/></svg>
                      </Button>
                      <Button variant="ghost" size="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4"/><path d="M7 16H4v3"/><path d="M21 8 17 4"/><path d="M17 8h3V5"/><path d="M19 21v-3a2 2 0 0 0-2-2h-3"/><path d="M5 3v3a2 2 0 0 0 2 2h3"/><path d="M3 9v2"/><path d="M21 15v2"/></svg>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center gap-4 border-b pb-4">
                    <div className="flex gap-2">
                      <input type="checkbox" id="field-email" defaultChecked />
                      <div>
                        <Label htmlFor="field-email">Тип поля</Label>
                        <p className="text-xs text-muted-foreground">Текстовое поле</p>
                      </div>
                    </div>
                    <div>
                      <Label>Заголовок</Label>
                      <p className="text-xs">Введите ваше полное имя</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1-8.313-12.454Z"/><path d="m17 4 3 3"/><path d="m14 7 3-3"/></svg>
                      </Button>
                      <Button variant="ghost" size="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4"/><path d="M7 16H4v3"/><path d="M21 8 17 4"/><path d="M17 8h3V5"/><path d="M19 21v-3a2 2 0 0 0-2-2h-3"/><path d="M5 3v3a2 2 0 0 0 2 2h3"/><path d="M3 9v2"/><path d="M21 15v2"/></svg>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Button variant="outline">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                      Добавить поле
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4"/><path d="M7 16H4v3"/><path d="m21 8-4-4"/><path d="M17 8h3V5"/></svg>
                      </Button>
                      <Button variant="ghost" size="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 8 4-4"/><path d="M7 8H4V5"/><path d="m21 16-4 4"/><path d="M17 16h3v3"/></svg>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Предпросмотр виджета</CardTitle>
                <CardDescription>Так виджет будет выглядеть на вашем сайте</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md p-4 bg-blue-50">
                  {/* Demo widget preview */}
                  <div className="bg-blue-600 text-white p-4 rounded-t-md">
                    <h3 className="font-medium">Создать обращение</h3>
                    <p className="text-sm opacity-90">Пожалуйста, заполните форму обращения</p>
                  </div>
                  <div className="bg-white p-4 rounded-b-md shadow-sm space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">ФИО *</label>
                      <input 
                        type="text" 
                        placeholder="Введите ваше полное имя"
                        className="w-full border rounded p-2 text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email *</label>
                      <input 
                        type="email" 
                        placeholder="Введите ваш email"
                        className="w-full border rounded p-2 text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Тип обращения *</label>
                      <select className="w-full border rounded p-2 text-sm">
                        <option>Выберите...</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Текст обращения *</label>
                      <textarea 
                        placeholder="Опишите ваше обращение"
                        className="w-full border rounded p-2 text-sm h-20" 
                      ></textarea>
                    </div>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm w-full">
                      Отправить
                    </button>
                  </div>
                </div>
                
                <div className="mt-8">
                  <h3 className="text-base font-medium mb-4">Код для встраивания</h3>
                  <pre className="bg-[#0A0E14] text-[#B3B1AD] p-4 rounded-md text-xs overflow-x-auto">
{`<div id="agent-smith-widget"></div>
<script 
  src="https://agent-smith.gov.kz/widget.js" 
  data-target="agent-smith-widget"
  data-token="jHnS23kM1Gjn2Lsd9Kfd6J32hgF2sXaw3Hjs21Dfgh3"
  data-theme="light">
</script>`}
                  </pre>
                  <p className="text-xs text-muted-foreground mt-2">
                    Скопируйте этот код и вставьте его на ваш сайт в место, где должен отображаться виджет
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Email настройки */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Настройки Email</CardTitle>
              <CardDescription>
                Настройте параметры отправки электронных писем и уведомлений
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-base font-medium">SMTP Настройки</h3>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-server">SMTP Сервер</Label>
                    <Input id="smtp-server" placeholder="smtp.example.com" defaultValue="smtp.gmail.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">SMTP Порт</Label>
                    <Input id="smtp-port" placeholder="587" defaultValue="587" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-user">Пользователь</Label>
                    <Input id="smtp-user" placeholder="user@example.com" defaultValue="notifications@agentsmith.gov.kz" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-password">Пароль</Label>
                    <Input id="smtp-password" type="password" placeholder="••••••••" defaultValue="password123" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="smtp-ssl" defaultChecked />
                    <Label htmlFor="smtp-ssl">Использовать SSL/TLS</Label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-base font-medium">Настройки отправителя</h3>
                  <div className="space-y-2">
                    <Label htmlFor="from-name">Имя отправителя</Label>
                    <Input id="from-name" placeholder="Agent Smith" defaultValue="Agent Smith" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="from-email">Email отправителя</Label>
                    <Input id="from-email" placeholder="noreply@example.com" defaultValue="noreply@agentsmith.gov.kz" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reply-to">Reply-To Email</Label>
                    <Input id="reply-to" placeholder="support@example.com" defaultValue="support@agentsmith.gov.kz" />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-base font-medium">Шаблоны уведомлений</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm">Уведомление о новом обращении</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-2">
                        <Label htmlFor="new-request-subject">Тема письма</Label>
                        <Input id="new-request-subject" defaultValue="Новое обращение #{{request_id}}" />
                      </div>
                      <div className="mt-2">
                        <Button variant="outline" size="sm">Редактировать шаблон</Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm">Уведомление о статусе обращения</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-2">
                        <Label htmlFor="status-update-subject">Тема письма</Label>
                        <Input id="status-update-subject" defaultValue="Обновление статуса обращения #{{request_id}}" />
                      </div>
                      <div className="mt-2">
                        <Button variant="outline" size="sm">Редактировать шаблон</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline">Проверить соединение</Button>
                <Button>Сохранить настройки</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Active Directory */}
        <TabsContent value="active-directory">
          <Card>
            <CardHeader>
              <CardTitle>Настройки Active Directory</CardTitle>
              <CardDescription>
                Настройте параметры подключения к Active Directory для аутентификации и синхронизации пользователей
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch id="ad-enabled" />
                  <Label htmlFor="ad-enabled">Включить интеграцию с Active Directory</Label>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-base font-medium">Параметры подключения</h3>
                    <div className="space-y-2">
                      <Label htmlFor="ad-server">Сервер Active Directory</Label>
                      <Input id="ad-server" placeholder="dc.example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ad-port">Порт</Label>
                      <Input id="ad-port" placeholder="389" defaultValue="389" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ad-base-dn">Базовый DN</Label>
                      <Input id="ad-base-dn" placeholder="DC=example,DC=com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ad-username">Имя пользователя</Label>
                      <Input id="ad-username" placeholder="administrator@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ad-password">Пароль</Label>
                      <Input id="ad-password" type="password" placeholder="••••••••" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="ad-ssl" />
                      <Label htmlFor="ad-ssl">Использовать SSL/TLS</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-base font-medium">Параметры синхронизации</h3>
                    <div className="space-y-2">
                      <Label htmlFor="ad-user-filter">Фильтр пользователей</Label>
                      <Input id="ad-user-filter" placeholder="(&(objectCategory=person)(objectClass=user))" defaultValue="(&(objectCategory=person)(objectClass=user))" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ad-group-filter">Фильтр групп</Label>
                      <Input id="ad-group-filter" placeholder="(objectClass=group)" defaultValue="(objectClass=group)" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ad-sync-interval">Интервал синхронизации (минуты)</Label>
                      <Input id="ad-sync-interval" type="number" defaultValue="60" />
                    </div>
                    <div className="space-y-2">
                      <Label>Атрибуты для синхронизации</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="attr-username" defaultChecked />
                          <Label htmlFor="attr-username">username</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="attr-email" defaultChecked />
                          <Label htmlFor="attr-email">email</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="attr-first-name" defaultChecked />
                          <Label htmlFor="attr-first-name">firstName</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="attr-last-name" defaultChecked />
                          <Label htmlFor="attr-last-name">lastName</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="attr-phone" />
                          <Label htmlFor="attr-phone">phone</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="attr-department" defaultChecked />
                          <Label htmlFor="attr-department">department</Label>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="ad-auto-create" defaultChecked />
                      <Label htmlFor="ad-auto-create">Автоматически создавать пользователей</Label>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-base font-medium">Соответствие групп и ролей</h3>
                <p className="text-sm text-muted-foreground">
                  Настройте соответствие между группами Active Directory и ролями в системе Agent Smith
                </p>
                
                <div className="border rounded-md">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left">Группа AD</th>
                        <th className="px-4 py-2 text-left">Роль в системе</th>
                        <th className="px-4 py-2 text-left">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="px-4 py-2">Domain Admins</td>
                        <td className="px-4 py-2">Администратор</td>
                        <td className="px-4 py-2">
                          <Button variant="ghost" size="icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                          </Button>
                          <Button variant="ghost" size="icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </Button>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-2">Department Managers</td>
                        <td className="px-4 py-2">Руководитель</td>
                        <td className="px-4 py-2">
                          <Button variant="ghost" size="icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                          </Button>
                          <Button variant="ghost" size="icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </Button>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2">Citizens Support</td>
                        <td className="px-4 py-2">Оператор</td>
                        <td className="px-4 py-2">
                          <Button variant="ghost" size="icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                          </Button>
                          <Button variant="ghost" size="icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <Button variant="outline">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  Добавить соответствие
                </Button>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline">Проверить соединение</Button>
                <div className="space-x-2">
                  <Button variant="outline">Синхронизировать сейчас</Button>
                  <Button>Сохранить настройки</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* HTML форма */}
        <TabsContent value="html-form">
          <Card>
            <CardHeader>
              <CardTitle>Настройка HTML формы</CardTitle>
              <CardDescription>
                Создайте HTML форму для размещения на вашем сайте для приема обращений граждан
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-base font-medium">Параметры формы</h3>
                  <div className="space-y-2">
                    <Label htmlFor="form-title">Заголовок формы</Label>
                    <Input id="form-title" defaultValue="Форма обращения граждан" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="form-description">Описание формы</Label>
                    <textarea 
                      id="form-description"
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                      rows={3}
                      defaultValue="Заполните форму, чтобы отправить обращение. Мы рассмотрим его в кратчайшие сроки."
                    ></textarea>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="form-submit-text">Текст кнопки отправки</Label>
                    <Input id="form-submit-text" defaultValue="Отправить обращение" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="form-success-message">Сообщение об успешной отправке</Label>
                    <Input id="form-success-message" defaultValue="Ваше обращение успешно отправлено. Мы свяжемся с вами в ближайшее время." />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="form-error-message">Сообщение об ошибке</Label>
                    <Input id="form-error-message" defaultValue="При отправке обращения произошла ошибка. Пожалуйста, попробуйте еще раз или свяжитесь с нами по телефону." />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="form-redirect-url">URL для перенаправления после отправки</Label>
                    <Input id="form-redirect-url" placeholder="https://example.com/thank-you" />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch id="form-captcha" defaultChecked />
                    <Label htmlFor="form-captcha">Включить CAPTCHA</Label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-base font-medium">Поля формы</h3>
                  <div className="border rounded-md">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-2 text-left">Поле</th>
                          <th className="px-4 py-2 text-left">Тип</th>
                          <th className="px-4 py-2 text-left">Обязательное</th>
                          <th className="px-4 py-2 text-left">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="px-4 py-2">ФИО</td>
                          <td className="px-4 py-2">text</td>
                          <td className="px-4 py-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M20 6 9 17l-5-5"/></svg>
                          </td>
                          <td className="px-4 py-2">
                            <Button variant="ghost" size="icon">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            </Button>
                            <Button variant="ghost" size="icon">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </Button>
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="px-4 py-2">Email</td>
                          <td className="px-4 py-2">email</td>
                          <td className="px-4 py-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M20 6 9 17l-5-5"/></svg>
                          </td>
                          <td className="px-4 py-2">
                            <Button variant="ghost" size="icon">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            </Button>
                            <Button variant="ghost" size="icon">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </Button>
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="px-4 py-2">Тип обращения</td>
                          <td className="px-4 py-2">select</td>
                          <td className="px-4 py-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M20 6 9 17l-5-5"/></svg>
                          </td>
                          <td className="px-4 py-2">
                            <Button variant="ghost" size="icon">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            </Button>
                            <Button variant="ghost" size="icon">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </Button>
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="px-4 py-2">Текст обращения</td>
                          <td className="px-4 py-2">textarea</td>
                          <td className="px-4 py-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M20 6 9 17l-5-5"/></svg>
                          </td>
                          <td className="px-4 py-2">
                            <Button variant="ghost" size="icon">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            </Button>
                            <Button variant="ghost" size="icon">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </Button>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Файл</td>
                          <td className="px-4 py-2">file</td>
                          <td className="px-4 py-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                          </td>
                          <td className="px-4 py-2">
                            <Button variant="ghost" size="icon">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            </Button>
                            <Button variant="ghost" size="icon">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <Button variant="outline">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    Добавить поле
                  </Button>
                  
                  <h3 className="text-base font-medium mt-6">Код для встраивания</h3>
                  <pre className="bg-[#0A0E14] text-[#B3B1AD] p-4 rounded-md text-xs overflow-x-auto">
{`<form action="https://agent-smith.gov.kz/api/submit-form" method="POST">
  <div>
    <label for="fullName">ФИО *</label>
    <input type="text" id="fullName" name="fullName" required />
  </div>
  <div>
    <label for="email">Email *</label>
    <input type="email" id="email" name="email" required />
  </div>
  <div>
    <label for="requestType">Тип обращения *</label>
    <select id="requestType" name="requestType" required>
      <option value="">Выберите тип обращения</option>
      <option value="question">Вопрос</option>
      <option value="complaint">Жалоба</option>
      <option value="suggestion">Предложение</option>
      <option value="appeal">Заявление</option>
    </select>
  </div>
  <div>
    <label for="requestText">Текст обращения *</label>
    <textarea id="requestText" name="requestText" rows="5" required></textarea>
  </div>
  <div>
    <label for="attachment">Прикрепить файл</label>
    <input type="file" id="attachment" name="attachment" />
  </div>
  <button type="submit">Отправить обращение</button>
</form>`}
                  </pre>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button>Сохранить настройки</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => {}}>Отмена</Button>
        <Button onClick={handleSaveChanges}>Сохранить изменения</Button>
      </div>
    </div>
  );
};

export default IntegrationSettings;