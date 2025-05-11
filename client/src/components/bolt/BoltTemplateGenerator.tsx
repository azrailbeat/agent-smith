import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code, Copy, ExternalLink, Download, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { FormField } from '@/components/widget/FormFieldEditor';

interface BoltTemplateGeneratorProps {
  widgetConfig: {
    title: string;
    subtitle: string;
    fields: FormField[];
    primaryColor: string;
    theme: string;
  };
}

interface TemplateOption {
  id: string;
  name: string;
  description: string;
  fileType: 'html' | 'jsx' | 'tsx' | 'json';
  integrationMethod: 'widget' | 'iframe' | 'api';
}

const BoltTemplateGenerator: React.FC<BoltTemplateGeneratorProps> = ({ widgetConfig }) => {
  const [selectedTemplate, setSelectedTemplate] = useState('landing');
  const [integrationMethod, setIntegrationMethod] = useState<'widget' | 'iframe' | 'api'>('widget');
  const [codeGenerated, setCodeGenerated] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  
  const templateOptions: TemplateOption[] = [
    { 
      id: 'landing', 
      name: 'Лендинг страница', 
      description: 'Простая целевая страница с формой обращения',
      fileType: 'html',
      integrationMethod: 'widget'
    },
    { 
      id: 'business', 
      name: 'Бизнес сайт', 
      description: 'Многостраничный бизнес сайт с формой контакта',
      fileType: 'jsx',
      integrationMethod: 'iframe'
    },
    { 
      id: 'government', 
      name: 'Гос. учреждение', 
      description: 'Шаблон сайта для государственных учреждений',
      fileType: 'tsx',
      integrationMethod: 'api'
    },
    { 
      id: 'portfolio', 
      name: 'Портфолио', 
      description: 'Персональный сайт-портфолио с контактной формой',
      fileType: 'jsx',
      integrationMethod: 'widget'
    },
    { 
      id: 'ecommerce', 
      name: 'Интернет-магазин', 
      description: 'Шаблон интернет-магазина с формой обратной связи',
      fileType: 'tsx',
      integrationMethod: 'iframe'
    },
  ];
  
  const getSelectedTemplateOption = () => {
    return templateOptions.find(t => t.id === selectedTemplate) || templateOptions[0];
  };
  
  const generateConfig = () => {
    return encodeURIComponent(JSON.stringify(widgetConfig));
  };
  
  const getWidgetCode = () => {
    return `<!-- Agent Smith Widget -->
<div id="agent-smith-widget"></div>
<script src="https://agent-smith.replit.app/widget.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (window.AgentSmithWidget) {
      AgentSmithWidget.init('agent-smith-widget', '${btoa(generateConfig())}');
    }
  });
</script>`;
  };
  
  const getIframeCode = () => {
    return `<!-- Agent Smith Embedded Form -->
<iframe 
  src="https://agent-smith.replit.app/embed?config=${btoa(generateConfig())}" 
  style="width: 100%; height: 600px; border: none; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);"
  title="Agent Smith Form"
  loading="lazy"
></iframe>`;
  };
  
  const getApiCode = () => {
    return `// Agent Smith API Integration
// Замените YOUR_API_KEY на ваш API ключ

// Отправка обращения через API
async function submitRequestToAgentSmith(requestData) {
  try {
    const response = await fetch('https://agent-smith.replit.app/api/citizen-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'YOUR_API_KEY',
        'Origin': window.location.origin
      },
      body: JSON.stringify(requestData)
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Ошибка при отправке обращения:', error);
    throw error;
  }
}

// Пример использования:
/*
submitRequestToAgentSmith({
  fullName: "Иван Иванов",
  contactInfo: "ivan@example.com",
  requestType: "Консультация",
  subject: "Вопрос по услугам",
  description: "Подробное описание обращения..."
})
  .then(result => console.log('Обращение отправлено:', result))
  .catch(error => console.error('Ошибка:', error));
*/`;
  };
  
  const getBoltNewConfig = () => {
    const template = getSelectedTemplateOption();
    
    // Базовая конфигурация для bolt.new
    let boltConfig = {
      name: `Agent Smith - ${template.name}`,
      description: `Шаблон сайта с интеграцией формы обращений Agent Smith. Метод интеграции: ${
        integrationMethod === 'widget' ? 'JavaScript виджет' : 
        integrationMethod === 'iframe' ? 'Встроенный iframe' : 'API'
      }`,
      template: template.id,
      integrationMethod: integrationMethod,
      agentSmithConfig: widgetConfig,
      // Добавить ключи для bolt.new
      boltVersion: "1.0.0",
      stack: template.fileType === 'html' ? 'html' : 'react',
      dependencies: template.fileType === 'html' ? [] : ['react', 'react-dom']
    };
    
    return JSON.stringify(boltConfig, null, 2);
  };
  
  const generateBoltTemplate = () => {
    const template = getSelectedTemplateOption();
    let code = '';
    
    switch(integrationMethod) {
      case 'widget':
        code = getWidgetCode();
        break;
      case 'iframe':
        code = getIframeCode();
        break;
      case 'api':
        code = getApiCode();
        break;
    }
    
    setGeneratedCode(code);
    setCodeGenerated(true);
    setCopiedCode(false);
    
    toast({
      title: "Код сгенерирован",
      description: `Шаблон для ${template.name} успешно создан с методом интеграции: ${
        integrationMethod === 'widget' ? 'JavaScript виджет' : 
        integrationMethod === 'iframe' ? 'Встроенный iframe' : 'API интеграция'
      }`,
    });
  };
  
  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      
      toast({
        title: "Код скопирован",
        description: "Код успешно скопирован в буфер обмена",
      });
    });
  };
  
  const downloadConfig = () => {
    const boltConfig = getBoltNewConfig();
    const blob = new Blob([boltConfig], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bolt-agent-smith-${selectedTemplate}-config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Конфигурация скачана",
      description: "Файл конфигурации для bolt.new успешно скачан",
    });
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Создание шаблона для bolt.new</CardTitle>
        <CardDescription>
          Создайте готовый шаблон для быстрого развертывания сайта с формой обращений на bolt.new
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="template">Выберите шаблон сайта</Label>
              <Select defaultValue={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Выберите шаблон" />
                </SelectTrigger>
                <SelectContent>
                  {templateOptions.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                {getSelectedTemplateOption().description}
              </p>
            </div>
            
            <div>
              <Label htmlFor="integration">Метод интеграции</Label>
              <Select defaultValue={integrationMethod} onValueChange={(value: 'widget' | 'iframe' | 'api') => setIntegrationMethod(value)}>
                <SelectTrigger id="integration">
                  <SelectValue placeholder="Выберите метод интеграции" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="widget">JavaScript виджет</SelectItem>
                  <SelectItem value="iframe">Встроенный iframe</SelectItem>
                  <SelectItem value="api">API интеграция</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                {integrationMethod === 'widget' ? 
                  'JavaScript виджет встраивается на страницу с помощью скрипта' : 
                  integrationMethod === 'iframe' ? 
                  'Форма отображается во встроенном iframe без дополнительных скриптов' : 
                  'Прямая интеграция через API для отправки обращений'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={downloadConfig}
            >
              <Download className="mr-2 h-4 w-4" /> Скачать конфигурацию
            </Button>
            <Button onClick={generateBoltTemplate}>
              <Code className="mr-2 h-4 w-4" /> Сгенерировать шаблон
            </Button>
          </div>
          
          {codeGenerated && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Сгенерированный код</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={copyCode}
                  disabled={copiedCode}
                >
                  {copiedCode ? (
                    <>
                      <Check className="mr-1 h-4 w-4" /> Скопировано
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-4 w-4" /> Копировать
                    </>
                  )}
                </Button>
              </div>
              <div className="relative">
                <pre className="p-4 rounded-md bg-slate-950 text-slate-50 overflow-x-auto text-sm">
                  <code>{generatedCode}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>
            Вы можете использовать сгенерированный код для быстрого создания сайта на {' '}
            <a 
              href="https://bolt.new" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center"
            >
              bolt.new <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </p>
        </div>
      </CardFooter>
    </Card>
  );
};

export default BoltTemplateGenerator;