import { useState } from 'react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertCircle, 
  CheckCircle2, 
  Mail, 
  Users, 
  Database, 
  AlertTriangle, 
  Globe, 
  Code,
  Webhook,
  FileCode
} from 'lucide-react';
import { ApiSettings } from '@/components/settings/ApiSettings';
import { WidgetSettings } from '@/components/settings/WidgetSettings';
import { HtmlFormSettings } from '@/components/settings/HtmlFormSettings';

export function IntegrationsSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('email');
  const [testInProgress, setTestInProgress] = useState(false);

  // Функция для обработки тестирования подключения Email
  const testEmailConnection = async () => {
    setTestInProgress(true);
    // Имитация API запроса
    setTimeout(() => {
      setTestInProgress(false);
      toast({
        title: "Тестирование завершено",
        description: "Настройки почты корректны. Соединение установлено.",
        variant: "default",
      });
    }, 1500);
  };

  // Функция для обработки тестирования подключения Active Directory
  const testADConnection = async () => {
    setTestInProgress(true);
    // Имитация API запроса
    setTimeout(() => {
      setTestInProgress(false);
      toast({
        title: "Тестирование завершено",
        description: "Настройки Active Directory корректны. Работа в демо-режиме.",
        variant: "default",
      });
    }, 1500);
  };

  // Функции для сохранения различных настроек
  const saveSendGridSettings = () => {
    toast({
      title: "Настройки сохранены",
      description: "Настройки SendGrid успешно сохранены",
      variant: "default",
    });
  };

  const saveSMTPSettings = () => {
    toast({
      title: "Настройки сохранены",
      description: "Настройки SMTP успешно сохранены",
      variant: "default",
    });
  };
  
  const saveADSettings = () => {
    toast({
      title: "Настройки сохранены",
      description: "Настройки Active Directory успешно сохранены",
      variant: "default",
    });
  };

  return (
    <div className="py-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Database className="h-5 w-5" /> 
          Общие настройки интеграций
        </h2>
        <p className="text-muted-foreground">Настройте внешние интеграции системы Agent Smith</p>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">API ключи</CardTitle>
          <CardDescription>Управление API ключами для внешних интеграций</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="api-url">Базовый URL API</Label>
                <Input id="api-url" value="https://api.agentsmith.gov.kz" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="api-token">Основной API ключ</Label>
                <Input id="api-token" value="2h6EdTNLGA8KFzhYGnIVLjMyRBrf83t9" type="password" className="mt-1 font-mono" />
              </div>
              <div className="flex items-end">
                <Button variant="outline" size="sm">Сгенерировать новый ключ</Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch id="enable-api" defaultChecked />
              <Label htmlFor="enable-api">Включить доступ к API для внешних систем</Label>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 mb-6 bg-muted/50">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>Настройки Email</span>
          </TabsTrigger>
          <TabsTrigger value="activedirectory" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Active Directory</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            <span>API для обращений</span>
          </TabsTrigger>
          <TabsTrigger value="widget" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span>Виджет для сайта</span>
          </TabsTrigger>
          <TabsTrigger value="htmlform" className="flex items-center gap-2">
            <FileCode className="h-4 w-4" />
            <span>HTML форма</span>
          </TabsTrigger>
        </TabsList>

        {/* Содержимое таба Email */}
        <TabsContent value="email" className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Информация</AlertTitle>
            <AlertDescription>
              Для отправки электронных писем необходимо настроить либо SendGrid API, либо SMTP сервер.
            </AlertDescription>
          </Alert>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>SendGrid API</CardTitle>
              <CardDescription>
                Настройка SendGrid API для отправки писем через их сервис
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sendgrid_api_key">API Ключ SendGrid</Label>
                <Input id="sendgrid_api_key" type="password" placeholder="Введите API ключ SendGrid" />
                <p className="text-sm text-muted-foreground">
                  API ключ можно получить в панели управления SendGrid
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="default_from">Email отправителя по умолчанию</Label>
                <Input 
                  id="default_from" 
                  placeholder="no-reply@agentsmith.gov.kz"
                  defaultValue="Agent Smith <no-reply@agentsmith.gov.kz>"
                />
              </div>
              
              <Button onClick={saveSendGridSettings} className="mt-4">Сохранить настройки</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Настройки SMTP</CardTitle>
              <CardDescription>
                Настройка собственного SMTP сервера для отправки писем
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">SMTP сервер</Label>
                  <Input id="smtp_host" placeholder="smtp.example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">Порт</Label>
                  <Input id="smtp_port" placeholder="587" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_user">Имя пользователя</Label>
                  <Input id="smtp_user" placeholder="user@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_pass">Пароль</Label>
                  <Input id="smtp_pass" type="password" placeholder="Пароль" />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="smtp_secure" />
                <Label htmlFor="smtp_secure">Использовать SSL/TLS</Label>
              </div>
              
              <Button onClick={saveSMTPSettings} className="mt-4">Сохранить настройки</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Тестирование подключения</CardTitle>
              <CardDescription>
                Проверка настроек электронной почты
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test_email">Email для тестирования</Label>
                <Input id="test_email" placeholder="your@email.com" />
              </div>
              
              <Button onClick={testEmailConnection} disabled={testInProgress}>
                {testInProgress ? "Тестирование..." : "Отправить тестовое письмо"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Содержимое таба Active Directory */}
        <TabsContent value="activedirectory" className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Демо-режим</AlertTitle>
            <AlertDescription>
              Система работает в демо-режиме с тестовыми данными. Для подключения к реальному Active Directory заполните настройки ниже.
            </AlertDescription>
          </Alert>
          
          <Card>
            <CardHeader>
              <CardTitle>Настройки Active Directory</CardTitle>
              <CardDescription>
                Настройка подключения к корпоративному Active Directory
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ad_url">LDAP URL</Label>
                  <Input id="ad_url" placeholder="ldap://ad.example.com:389" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ad_domain">Домен</Label>
                  <Input id="ad_domain" placeholder="example.com" defaultValue="iac.gov.kz" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ad_base_dn">Base DN</Label>
                <Input id="ad_base_dn" placeholder="DC=example,DC=com" defaultValue="DC=iac,DC=gov,DC=kz" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ad_username">Имя пользователя</Label>
                  <Input id="ad_username" placeholder="admin@example.com" defaultValue="ad.admin@iac.gov.kz" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ad_password">Пароль</Label>
                  <Input id="ad_password" type="password" placeholder="Пароль" defaultValue="••••••••••••" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ad_search_filter">Фильтр поиска</Label>
                  <Input id="ad_search_filter" placeholder="(&(objectClass=user)(sAMAccountName=*))" defaultValue="(&(objectClass=user)(sAMAccountName=*))" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ad_sync_interval">Интервал синхронизации (мин)</Label>
                  <Input id="ad_sync_interval" placeholder="60" defaultValue="30" type="number" min="5" max="1440" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ad_group_filter">Группы для импорта</Label>
                  <Input id="ad_group_filter" placeholder="Agent Smith Users" defaultValue="Agent Smith Users, Citizen Request Operators" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ad_user_attr">Атрибуты пользователя</Label>
                  <Input id="ad_user_attr" placeholder="sAMAccountName,mail,displayName" defaultValue="sAMAccountName,mail,displayName,department,title,telephoneNumber" />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="ad_use_tls" defaultChecked />
                <Label htmlFor="ad_use_tls">Использовать TLS</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="ad_auto_sync" defaultChecked />
                <Label htmlFor="ad_auto_sync">Автоматическая синхронизация</Label>
              </div>
              
              <Button onClick={saveADSettings} className="mt-4">Сохранить настройки</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Тестирование подключения</CardTitle>
              <CardDescription>
                Проверка подключения к Active Directory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={testADConnection} disabled={testInProgress}>
                {testInProgress ? "Тестирование..." : "Проверить подключение"}
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Тестовые учетные записи</CardTitle>
              <CardDescription>
                Демо-пользователи доступные в тестовом режиме
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 font-semibold">
                  <div>Логин</div>
                  <div>Полное имя</div>
                  <div>Отдел</div>
                  <div>Статус</div>
                </div>
                <Separator />
                <div className="grid grid-cols-4 gap-4">
                  <div>jdoe</div>
                  <div>John Doe</div>
                  <div>IT Department</div>
                  <div className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-1" /> Активен</div>
                </div>
                <Separator />
                <div className="grid grid-cols-4 gap-4">
                  <div>asmith</div>
                  <div>Alice Smith</div>
                  <div>Finance</div>
                  <div className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-1" /> Активен</div>
                </div>
                <Separator />
                <div className="grid grid-cols-4 gap-4">
                  <div>bjohnson</div>
                  <div>Bob Johnson</div>
                  <div>HR</div>
                  <div className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-1" /> Активен</div>
                </div>
                <Separator />
                <p className="text-sm text-muted-foreground mt-4">
                  Для всех тестовых пользователей используется пароль: <code>password</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Содержимое таба API для обращений */}
        <TabsContent value="api">
          <ApiSettings refreshTab={() => setActiveTab('api')} />
        </TabsContent>
        
        {/* Содержимое таба Виджет для сайта */}
        <TabsContent value="widget">
          <WidgetSettings refreshTab={() => setActiveTab('widget')} />
        </TabsContent>

        {/* Содержимое таба HTML форма */}
        <TabsContent value="htmlform">
          <HtmlFormSettings refreshTab={() => setActiveTab('htmlform')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}