import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  Download,
  ExternalLink,
  Check,
  ArrowRight,
  Code,
  Globe,
  Share2,
  LayoutTemplate,
  FileCode,
  Cpu
} from "lucide-react";

// Компонент настроек API для внешних обращений
const ApiSettingsTab = () => {
  const { toast } = useToast();
  const [apiSettings, setApiSettings] = useState({
    enabled: false,
    apiKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    autoProcess: false,
    selectedAgent: '',
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [agents, setAgents] = useState([
    { id: '1', name: 'Автоматический обработчик' },
    { id: '2', name: 'Классификатор запросов' },
    { id: '3', name: 'Генератор ответов' }
  ]);

  useEffect(() => {
    // Здесь будет загрузка настроек с сервера
    try {
      // apiRequest('GET', '/api/settings/api-integration')
      //   .then(data => setApiSettings(data));
    } catch (error) {
      console.error('Ошибка при загрузке настроек API:', error);
    }
  }, []);

  const generateNewApiKey = () => {
    // Имитация генерации нового ключа
    const newKey = Array(32).fill(0).map(() => Math.random().toString(36).charAt(2)).join('');
    setApiSettings({...apiSettings, apiKey: newKey});
    toast({
      title: "Создан новый API ключ",
      description: "Новый ключ сгенерирован успешно. Старые ключи больше не действительны.",
    });
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiSettings.apiKey);
    toast({
      title: "Скопировано",
      description: "API ключ скопирован в буфер обмена.",
    });
  };

  const handleSaveSettings = () => {
    // Сохранение настроек на сервере
    // apiRequest('POST', '/api/settings/api-integration', apiSettings)
    toast({
      title: "Настройки сохранены",
      description: "Настройки API успешно обновлены.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch 
            checked={apiSettings.enabled} 
            onCheckedChange={(value) => setApiSettings({...apiSettings, enabled: value})}
          />
          <Label>Включить внешний API</Label>
        </div>
        <Button variant="outline" size="sm" onClick={handleSaveSettings}>
          Сохранить настройки
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-2">Тип авторизации</h3>
          <Select value="api_key" disabled>
            <SelectTrigger>
              <SelectValue placeholder="Выберите тип авторизации" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="api_key">API Ключ</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="mb-2 block">API Ключ</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input 
                type={showApiKey ? "text" : "password"} 
                value={apiSettings.apiKey} 
                readOnly 
                className="pr-10"
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1/2 transform -translate-y-1/2" 
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button variant="outline" size="icon" onClick={copyApiKey}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={generateNewApiKey}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            API ключ используется для аутентификации запросов от внешних систем
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Обработка обращений</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              checked={apiSettings.autoProcess} 
              onCheckedChange={(value) => setApiSettings({...apiSettings, autoProcess: value})}
            />
            <Label>Автоматически обрабатывать обращения</Label>
          </div>
          <div className="mt-4">
            <Label>Выберите агента</Label>
            <Select 
              value={apiSettings.selectedAgent}
              onValueChange={(value) => setApiSettings({...apiSettings, selectedAgent: value})}
              disabled={!apiSettings.autoProcess}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите агента" />
              </SelectTrigger>
              <SelectContent>
                {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Агент, который будет использоваться для автоматической обработки входящих обращений
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-medium mb-2">Пример использования API</h3>
        <Card>
          <CardContent className="p-4">
            <pre className="text-xs bg-slate-950 text-slate-50 p-4 rounded-md overflow-x-auto">
              {`POST /api/external/citizen-requests
  
{
  "name": "Иван Петров",
  "contact": "+7 (700) 123-45-67",
  "content": "Запрос на подключение услуги",
  "category": "Коммунальные услуги",
  "priority": "medium"
}
`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Компонент настроек виджета для внешних сайтов
const WidgetSettingsTab = () => {
  const { toast } = useToast();
  const [widgetSettings, setWidgetSettings] = useState({
    title: 'Форма обращения',
    formFields: [
      { id: 1, type: 'text', label: 'ФИО', required: true },
      { id: 2, type: 'email', label: 'Email', required: true }
    ],
    primaryColor: '#1c64f2',
    theme: 'light',
  });

  const generateWidgetCode = () => {
    const code = `<script src="https://agent-smith.replit.app/widget.js" id="gov-agent-smith-widget" data-color="${widgetSettings.primaryColor}"></script>`;
    return code;
  };

  const copyWidgetCode = () => {
    navigator.clipboard.writeText(generateWidgetCode());
    toast({
      title: "Скопировано",
      description: "Код виджета скопирован в буфер обмена.",
    });
  };

  const handleSaveSettings = () => {
    // Сохранение настроек на сервере
    // apiRequest('POST', '/api/settings/widget', widgetSettings)
    toast({
      title: "Настройки сохранены",
      description: "Настройки виджета успешно обновлены.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Настройки виджета</h3>
        <Button variant="outline" size="sm" onClick={handleSaveSettings}>
          Сохранить настройки
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label>Заголовок</Label>
            <Input 
              value={widgetSettings.title} 
              onChange={(e) => setWidgetSettings({...widgetSettings, title: e.target.value})}
            />
          </div>
          
          <div>
            <Label>Основной цвет</Label>
            <div className="flex gap-2">
              <Input 
                type="color" 
                value={widgetSettings.primaryColor} 
                onChange={(e) => setWidgetSettings({...widgetSettings, primaryColor: e.target.value})}
                className="w-12 h-9 p-1"
              />
              <Input 
                type="text" 
                value={widgetSettings.primaryColor} 
                onChange={(e) => setWidgetSettings({...widgetSettings, primaryColor: e.target.value})}
              />
            </div>
          </div>
          
          <div>
            <Label>Тема оформления</Label>
            <div className="flex gap-2 mt-2">
              <div 
                className={`flex items-center justify-center rounded-md p-2 border cursor-pointer ${widgetSettings.theme === 'light' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setWidgetSettings({...widgetSettings, theme: 'light'})}
              >
                <span className="bg-white text-black rounded-full p-3 text-xs">Светлая</span>
              </div>
              <div 
                className={`flex items-center justify-center rounded-md p-2 border cursor-pointer ${widgetSettings.theme === 'dark' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setWidgetSettings({...widgetSettings, theme: 'dark'})}
              >
                <span className="bg-slate-900 text-white rounded-full p-3 text-xs">Темная</span>
              </div>
            </div>
          </div>
          
          <div>
            <Label>Поля формы</Label>
            <div className="space-y-2 mt-2">
              {widgetSettings.formFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2 p-2 border rounded-md">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{field.label}</p>
                    <p className="text-xs text-muted-foreground">{field.type}</p>
                  </div>
                  <div className="flex items-center">
                    <Switch 
                      checked={field.required} 
                      onCheckedChange={(value) => {
                        const newFields = [...widgetSettings.formFields];
                        newFields[index].required = value;
                        setWidgetSettings({...widgetSettings, formFields: newFields});
                      }}
                    />
                    <Label className="ml-2 text-xs">Обязательное</Label>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full text-xs" size="sm">
                Добавить поле
              </Button>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="border rounded-md p-4 bg-gray-50">
            <h4 className="text-sm font-medium mb-2">Предпросмотр виджета</h4>
            <div className="bg-white border rounded-md p-4 shadow-sm">
              <div className="border-b pb-2 mb-4">
                <h3 className="text-sm font-medium" style={{color: widgetSettings.primaryColor}}>{widgetSettings.title}</h3>
              </div>
              <div className="space-y-3">
                {widgetSettings.formFields.map(field => (
                  <div key={field.id} className="space-y-1">
                    <Label className="text-xs">{field.label}{field.required && <span className="text-red-500">*</span>}</Label>
                    <Input type={field.type} placeholder={`Введите ${field.label.toLowerCase()}`} className="h-8 text-xs" />
                  </div>
                ))}
                <Button className="w-full mt-2 text-xs" size="sm" style={{backgroundColor: widgetSettings.primaryColor}}>
                  Отправить
                </Button>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2">Код для вставки</h4>
            <div className="relative">
              <Textarea value={generateWidgetCode()} readOnly className="font-mono text-xs h-20" />
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-2 top-2" 
                onClick={copyWidgetCode}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Вставьте этот код на ваш сайт, чтобы добавить виджет формы обращений
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Компонент настроек интеграции с bolt.new
const BoltIntegrationTab = () => {
  const { toast } = useToast();
  const [boltSettings, setBoltSettings] = useState({
    template: 'landing-page',
    integrationMethod: 'javascript-widget',
    previewUrl: 'https://bolt.new/template/xyz123',
    generatedTemplate: false,
  });

  const handleGenerateTemplate = () => {
    // Имитация создания шаблона
    setBoltSettings({...boltSettings, generatedTemplate: true});
    toast({
      title: "Шаблон создан",
      description: "Шаблон для bolt.new успешно создан.",
    });
  };

  const copyIntegrationCode = () => {
    let code = '';
    switch (boltSettings.integrationMethod) {
      case 'javascript-widget':
        code = `<script src="https://agent-smith.replit.app/bolt-widget.js"></script>`;
        break;
      case 'iframe':
        code = `<iframe src="https://agent-smith.replit.app/embed" width="100%" height="500" frameborder="0"></iframe>`;
        break;
      case 'api':
        code = `// Пример API запроса\nfetch('https://agent-smith.replit.app/api/external/citizen-requests', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ ... })\n})`;
        break;
    }
    navigator.clipboard.writeText(code);
    toast({
      title: "Скопировано",
      description: "Код интеграции скопирован в буфер обмена.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Интеграция с bolt.new</h3>
        <a href="https://bolt.new" target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="gap-1">
            <ExternalLink className="h-3.5 w-3.5" />
            Перейти на bolt.new
          </Button>
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Создание шаблона для bolt.new</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Создайте готовый шаблон сайта с формой обращений на bolt.new
            </p>
            
            <div className="space-y-3">
              <div>
                <Label>Выберите шаблон сайта</Label>
                <Select 
                  value={boltSettings.template}
                  onValueChange={(value) => setBoltSettings({...boltSettings, template: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите шаблон" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landing-page">Лендинг-страница</SelectItem>
                    <SelectItem value="simple-website">Простой веб-сайт с формой обращения</SelectItem>
                    <SelectItem value="government-portal">Правительственный портал</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Метод интеграции</Label>
                <Select 
                  value={boltSettings.integrationMethod}
                  onValueChange={(value) => setBoltSettings({...boltSettings, integrationMethod: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите метод" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="javascript-widget">JavaScript виджет</SelectItem>
                    <SelectItem value="iframe">iFrame встраивание</SelectItem>
                    <SelectItem value="api">Прямое API подключение</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button className="mt-4 w-full" onClick={handleGenerateTemplate}>
              {boltSettings.generatedTemplate ? "Обновить шаблон" : "Сгенерировать шаблон"}
            </Button>
          </div>

          {boltSettings.generatedTemplate && (
            <div className="mt-4">
              <Label>Код интеграции</Label>
              <div className="relative mt-1">
                <Textarea 
                  readOnly 
                  className="font-mono text-xs h-32"
                  value={
                    boltSettings.integrationMethod === 'javascript-widget' 
                      ? `<script src="https://agent-smith.replit.app/bolt-widget.js"></script>`
                      : boltSettings.integrationMethod === 'iframe'
                      ? `<iframe src="https://agent-smith.replit.app/embed" width="100%" height="500" frameborder="0"></iframe>`
                      : `// Пример API запроса\nfetch('https://agent-smith.replit.app/api/external/citizen-requests', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ ... })\n})`
                  }
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-2 top-2" 
                  onClick={copyIntegrationCode}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Используйте этот код для интеграции формы обращений на вашем сайте bolt.new
              </p>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          {boltSettings.generatedTemplate ? (
            <div className="border rounded-md overflow-hidden">
              <div className="bg-slate-800 text-white p-2 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Предпросмотр шаблона</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="bg-white h-72 p-3 flex flex-col items-center justify-center border-t">
                <div className="w-full max-w-xs space-y-4">
                  <div className="h-6 w-24 bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="h-4 w-full bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="h-4 w-full bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-primary rounded-md animate-pulse"></div>
                    <div className="h-8 flex-1 bg-gray-200 rounded-md animate-pulse"></div>
                  </div>
                  <div className="h-24 w-full bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="h-10 w-full bg-primary rounded-md animate-pulse"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 border rounded-md bg-gray-50">
              <LayoutTemplate className="h-16 w-16 text-gray-300 mb-4" />
              <h4 className="text-lg font-medium mb-2">Создайте шаблон</h4>
              <p className="text-sm text-center text-muted-foreground mb-4">
                Выберите параметры и сгенерируйте шаблон для bolt.new с интегрированной формой обращений
              </p>
            </div>
          )}
          
          {boltSettings.generatedTemplate && (
            <div className="flex items-center justify-center">
              <Button variant="outline" size="sm" className="gap-1">
                <ArrowRight className="h-3.5 w-3.5" />
                Открыть сайт на bolt.new
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Главный компонент настроек интеграции
interface IntegrationSettingsProps {
  defaultTab?: string;
}

const IntegrationSettings: React.FC<IntegrationSettingsProps> = ({ defaultTab = "api" }) => {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid grid-cols-3 max-w-md mb-4">
        <TabsTrigger value="api" className="text-xs flex items-center gap-1">
          <Cpu className="h-3.5 w-3.5" />
          <span>API для обращений</span>
        </TabsTrigger>
        <TabsTrigger value="widget" className="text-xs flex items-center gap-1">
          <Code className="h-3.5 w-3.5" />
          <span>Виджет для сайта</span>
        </TabsTrigger>
        <TabsTrigger value="bolt" className="text-xs flex items-center gap-1">
          <FileCode className="h-3.5 w-3.5" />
          <span>Интеграция bolt.new</span>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="api" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>API для внешних обращений</CardTitle>
            <CardDescription>
              Настройки API для получения обращений от граждан через внешние системы
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApiSettingsTab />
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="widget" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Виджет для сайта</CardTitle>
            <CardDescription>
              Настройте виджет формы обращений для внедрения на ваш сайт
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WidgetSettingsTab />
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="bolt" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Интеграция с bolt.new</CardTitle>
            <CardDescription>
              Создайте готовый шаблон сайта с интегрированной формой обращений
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BoltIntegrationTab />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default IntegrationSettings;