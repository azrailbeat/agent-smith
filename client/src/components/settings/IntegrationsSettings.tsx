import React, { useState } from 'react';
import { RefreshCw, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useIntegrationStatus } from '@/hooks/use-integration-status';
import { useSystemSettings, type SystemSettings } from '@/hooks/use-system-settings';

// Компонент настроек интеграций
export const IntegrationsSettings = () => {
  const { toast } = useToast();
  
  // Используем хук для отслеживания статуса интеграций
  const { integrationStatus, checkIntegrationStatus, isChecking: isCheckingStatus } = useIntegrationStatus();
  
  // Используем общий хук для системных настроек
  const { 
    settings, 
    isLoading, 
    updateSettings 
  } = useSystemSettings();
  
  // Функция для обновления настроек интеграций
  const handleUpdateIntegration = (section: string, field: string, value: any) => {
    const integrationSettings = { ...settings.integrations };
    
    // Обновляем определенное поле в настройках интеграций
    switch (section) {
      case 'openai':
        integrationSettings.openai = {
          ...integrationSettings.openai,
          [field]: value
        };
        break;
      case 'anthropic':
        integrationSettings.anthropic = {
          ...integrationSettings.anthropic,
          [field]: value
        };
        break;
      case 'yandexGpt':
        if (!integrationSettings.yandexGpt) {
          integrationSettings.yandexGpt = { enabled: false, apiKey: '', defaultModel: 'yandexgpt' };
        }
        integrationSettings.yandexGpt = {
          ...integrationSettings.yandexGpt,
          [field]: value
        };
        break;
      case 'yandexSpeech':
        integrationSettings.yandexSpeech = {
          ...integrationSettings.yandexSpeech,
          [field]: value
        };
        break;
      case 'eOtinish':
        if (!integrationSettings.eOtinish) {
          integrationSettings.eOtinish = { enabled: false, apiEndpoint: '', authToken: '', syncInterval: '30', autoProcess: false };
        }
        integrationSettings.eOtinish = {
          ...integrationSettings.eOtinish,
          [field]: value
        };
        break;
      case 'egov':
        if (!integrationSettings.egov) {
          integrationSettings.egov = { enabled: false, apiEndpoint: '', certificate: '' };
        }
        integrationSettings.egov = {
          ...integrationSettings.egov,
          [field]: value
        };
        break;
      case 'hyperledger':
        if (!integrationSettings.hyperledger) {
          integrationSettings.hyperledger = { enabled: false, nodeUrl: '', privateKey: '', contractAddress: '', network: 'testnet', storeMeetings: false, storeRequests: false, storeVoting: false };
        }
        integrationSettings.hyperledger = {
          ...integrationSettings.hyperledger,
          [field]: value
        };
        break;
      case 'moralis':
        integrationSettings.moralis = {
          ...integrationSettings.moralis,
          [field]: value
        };
        break;
      case 'yandexTranslate':
        if (!integrationSettings.yandexTranslate) {
          integrationSettings.yandexTranslate = { enabled: false, apiKey: '', folderID: '' };
        }
        integrationSettings.yandexTranslate = {
          ...integrationSettings.yandexTranslate,
          [field]: value
        };
        break;
      case 'supabase':
        if (!integrationSettings.supabase) {
          integrationSettings.supabase = { enabled: false, url: '', apiKey: '' };
        }
        integrationSettings.supabase = {
          ...integrationSettings.supabase,
          [field]: value
        };
        break;
      default:
        break;
    }
    
    // Отправляем обновленные настройки на сервер
    updateSettings({ integrations: integrationSettings });
    
    toast({
      title: 'Настройки интеграций обновлены',
      description: 'Изменения были успешно сохранены',
    });
    
    // Проверяем статус интеграции после обновления настроек
    if (field === 'enabled' || field === 'apiKey' || field === 'authToken' || field === 'url') {
      setTimeout(() => {
        checkIntegrationStatus();
      }, 1000);
    }
  };
  
  if (isLoading) {
    return <div className="flex justify-center p-8">Загрузка настроек интеграций...</div>;
  }
  
  return (
    <Tabs defaultValue="api" className="space-y-6">
      <TabsList className="grid w-full max-w-2xl grid-cols-5">
        <TabsTrigger value="api">API</TabsTrigger>
        <TabsTrigger value="widget">Виджеты</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
        <TabsTrigger value="ad">Active Directory</TabsTrigger>
        <TabsTrigger value="form">HTML форма</TabsTrigger>
      </TabsList>
      
      <TabsContent value="api" className="space-y-6">
        {/* Интеграция с OpenAI */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span>OpenAI API</span>
                {integrationStatus?.openai && (
                  <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-2.5 py-0.5 text-green-700">
                    <Check className="mr-1 h-3 w-3" />
                    <span className="text-xs">Подключено</span>
                  </span>
                )}
                {integrationStatus?.openai === false && (
                  <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-2.5 py-0.5 text-red-700">
                    <X className="mr-1 h-3 w-3" />
                    <span className="text-xs">Не подключено</span>
                  </span>
                )}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => checkIntegrationStatus()}
                disabled={isCheckingStatus}
              >
                {isCheckingStatus ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Проверка
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Проверить соединение
                  </>
                )}
              </Button>
            </div>
            <CardDescription>
              Настройте интеграцию с OpenAI API для генеративных AI возможностей
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="openai-enabled">Включить интеграцию</Label>
                <Switch 
                  id="openai-enabled"
                  checked={settings.integrations.openai.enabled}
                  onCheckedChange={(value) => handleUpdateIntegration('openai', 'enabled', value)}
                />
              </div>
            </div>
            
            {settings.integrations.openai.enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="openai-api-key">API ключ</Label>
                  <Input
                    id="openai-api-key"
                    type="password"
                    value={settings.integrations.openai.apiKey}
                    onChange={(e) => handleUpdateIntegration('openai', 'apiKey', e.target.value)}
                    placeholder="sk-..."
                  />
                  <p className="text-sm text-muted-foreground">
                    API ключ для доступа к OpenAI API
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="openai-model">Модель по умолчанию</Label>
                  <Select 
                    value={settings.integrations.openai.defaultModel} 
                    onValueChange={(value) => handleUpdateIntegration('openai', 'defaultModel', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите модель" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Модель OpenAI, используемая по умолчанию
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="openai-base-url">Базовый URL (опционально)</Label>
                  <Input
                    id="openai-base-url"
                    value={settings.integrations.openai.baseUrl || ''}
                    onChange={(e) => handleUpdateIntegration('openai', 'baseUrl', e.target.value)}
                    placeholder="https://api.openai.com/v1"
                  />
                  <p className="text-sm text-muted-foreground">
                    Базовый URL для API (используйте для прокси или альтернативных эндпоинтов)
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="openai-test-mode">Тестовый режим</Label>
                    <Switch 
                      id="openai-test-mode"
                      checked={settings.integrations.openai.testMode || false}
                      onCheckedChange={(value) => handleUpdateIntegration('openai', 'testMode', value)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Использовать тестовый режим без реальных запросов к API
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Интеграция с Moralis */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span>Moralis API</span>
                {integrationStatus?.moralis && (
                  <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-2.5 py-0.5 text-green-700">
                    <Check className="mr-1 h-3 w-3" />
                    <span className="text-xs">Подключено</span>
                  </span>
                )}
                {integrationStatus?.moralis === false && (
                  <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-2.5 py-0.5 text-red-700">
                    <X className="mr-1 h-3 w-3" />
                    <span className="text-xs">Не подключено</span>
                  </span>
                )}
              </CardTitle>
            </div>
            <CardDescription>
              Настройте интеграцию с Moralis API для Web3 функциональности
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="moralis-enabled">Включить интеграцию</Label>
                <Switch 
                  id="moralis-enabled"
                  checked={settings.integrations.moralis?.enabled || false}
                  onCheckedChange={(value) => handleUpdateIntegration('moralis', 'enabled', value)}
                />
              </div>
            </div>
            
            {settings.integrations.moralis?.enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="moralis-api-key">API ключ</Label>
                  <Input
                    id="moralis-api-key"
                    type="password"
                    value={settings.integrations.moralis?.apiKey || ''}
                    onChange={(e) => handleUpdateIntegration('moralis', 'apiKey', e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    API ключ для доступа к Moralis API
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="moralis-network">Тип сети</Label>
                  <Select 
                    value={settings.integrations.moralis?.networkType || 'testnet'} 
                    onValueChange={(value) => handleUpdateIntegration('moralis', 'networkType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип сети" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mainnet">Mainnet</SelectItem>
                      <SelectItem value="testnet">Testnet</SelectItem>
                      <SelectItem value="devnet">Devnet</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Тип блокчейн-сети для взаимодействия
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Интеграция с eOtinish */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span>eOtinish API</span>
                {integrationStatus?.eOtinish && (
                  <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-2.5 py-0.5 text-green-700">
                    <Check className="mr-1 h-3 w-3" />
                    <span className="text-xs">Подключено</span>
                  </span>
                )}
                {integrationStatus?.eOtinish === false && (
                  <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-2.5 py-0.5 text-red-700">
                    <X className="mr-1 h-3 w-3" />
                    <span className="text-xs">Не подключено</span>
                  </span>
                )}
              </CardTitle>
            </div>
            <CardDescription>
              Настройте интеграцию с системой электронных обращений граждан eOtinish.kz
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="eotinish-enabled">Включить интеграцию</Label>
                <Switch 
                  id="eotinish-enabled"
                  checked={settings.integrations.eOtinish?.enabled || false}
                  onCheckedChange={(value) => handleUpdateIntegration('eOtinish', 'enabled', value)}
                />
              </div>
            </div>
            
            {settings.integrations.eOtinish?.enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="eotinish-endpoint">API Endpoint</Label>
                  <Input
                    id="eotinish-endpoint"
                    value={settings.integrations.eOtinish?.apiEndpoint || ''}
                    onChange={(e) => handleUpdateIntegration('eOtinish', 'apiEndpoint', e.target.value)}
                    placeholder="https://api.eotinish.kz"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="eotinish-token">Auth Token</Label>
                  <Input
                    id="eotinish-token"
                    type="password"
                    value={settings.integrations.eOtinish?.authToken || ''}
                    onChange={(e) => handleUpdateIntegration('eOtinish', 'authToken', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="eotinish-interval">Интервал синхронизации (минуты)</Label>
                  <Input
                    id="eotinish-interval"
                    type="number"
                    value={settings.integrations.eOtinish?.syncInterval || '30'}
                    onChange={(e) => handleUpdateIntegration('eOtinish', 'syncInterval', e.target.value)}
                    className="max-w-xs"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="eotinish-auto">Автоматическая обработка</Label>
                    <Switch 
                      id="eotinish-auto"
                      checked={settings.integrations.eOtinish?.autoProcess || false}
                      onCheckedChange={(value) => handleUpdateIntegration('eOtinish', 'autoProcess', value)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Автоматически обрабатывать новые обращения из eOtinish
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="widget" className="space-y-6">
        {/* Настройки виджетов */}
        <Card>
          <CardHeader>
            <CardTitle>Настройки виджетов</CardTitle>
            <CardDescription>
              Настройте параметры интеграции виджетов на внешних сайтах
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="widget-enabled">Разрешить встраивание</Label>
              <div className="flex items-center space-x-2">
                <Switch id="widget-enabled" />
                <span>Разрешить встраивание виджетов на внешние сайты</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="allowed-domains">Разрешенные домены</Label>
              <Input
                id="allowed-domains"
                placeholder="example.com, *.gov.kz"
              />
              <p className="text-sm text-muted-foreground">
                Список доменов, на которых разрешено встраивание (разделенные запятыми)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="widget-code">Код для встраивания</Label>
              <div className="relative">
                <pre className="bg-secondary text-secondary-foreground rounded-md p-4 overflow-x-auto text-sm">
                  {`<script src="https://embed.agentsmith.gov.kz/widget.js" data-key="YOUR_WIDGET_KEY"></script>`}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    navigator.clipboard.writeText(`<script src="https://embed.agentsmith.gov.kz/widget.js" data-key="YOUR_WIDGET_KEY"></script>`);
                    toast({
                      title: 'Скопировано',
                      description: 'Код для встраивания скопирован в буфер обмена'
                    });
                  }}
                >
                  Копировать
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="email" className="space-y-6">
        {/* Настройки Email */}
        <Card>
          <CardHeader>
            <CardTitle>Настройки Email</CardTitle>
            <CardDescription>
              Настройте параметры отправки электронной почты
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP Хост</Label>
              <Input
                id="smtp-host"
                placeholder="smtp.example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="smtp-port">SMTP Порт</Label>
              <Input
                id="smtp-port"
                type="number"
                placeholder="587"
                className="max-w-xs"
              />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp-user">Имя пользователя</Label>
                <Input
                  id="smtp-user"
                  placeholder="user@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="smtp-pass">Пароль</Label>
                <Input
                  id="smtp-pass"
                  type="password"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="smtp-from">Email отправителя</Label>
              <Input
                id="smtp-from"
                placeholder="noreply@agentsmith.gov.kz"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch id="smtp-secure" />
                <Label htmlFor="smtp-secure">Использовать TLS/SSL</Label>
              </div>
            </div>
            
            <Button className="mt-2">Проверить соединение</Button>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="ad" className="space-y-6">
        {/* Настройки Active Directory */}
        <Card>
          <CardHeader>
            <CardTitle>Настройки Active Directory</CardTitle>
            <CardDescription>
              Настройте интеграцию с Active Directory/LDAP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ldap-enabled">Включить LDAP аутентификацию</Label>
              <div className="flex items-center space-x-2">
                <Switch id="ldap-enabled" />
                <span>Разрешить аутентификацию через LDAP</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ldap-url">URL сервера LDAP</Label>
              <Input
                id="ldap-url"
                placeholder="ldap://ad.example.com:389"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bind-dn">Bind DN</Label>
              <Input
                id="bind-dn"
                placeholder="cn=reader,dc=example,dc=com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bind-credentials">Bind Credentials</Label>
              <Input
                id="bind-credentials"
                type="password"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="search-base">Search Base</Label>
              <Input
                id="search-base"
                placeholder="dc=example,dc=com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="search-filter">Search Filter</Label>
              <Input
                id="search-filter"
                placeholder="(sAMAccountName={{username}})"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch id="ldap-sync" />
                <Label htmlFor="ldap-sync">Синхронизировать пользователей и группы</Label>
              </div>
            </div>
            
            <Button className="mt-2">Проверить соединение</Button>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="form" className="space-y-6">
        {/* Настройки HTML формы */}
        <Card>
          <CardHeader>
            <CardTitle>Настройки HTML формы</CardTitle>
            <CardDescription>
              Настройте параметры внешней HTML формы обращений граждан
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="form-enabled">Включить внешнюю форму</Label>
              <div className="flex items-center space-x-2">
                <Switch id="form-enabled" />
                <span>Разрешить отправку обращений через HTML форму</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="form-endpoint">Endpoint API формы</Label>
              <Input
                id="form-endpoint"
                value="/api/public/citizen-request"
                readOnly
              />
              <p className="text-sm text-muted-foreground">
                Эндпоинт для отправки данных формы
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="recaptcha-key">Ключ reCAPTCHA</Label>
              <Input
                id="recaptcha-key"
                placeholder="6LcXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              />
              <p className="text-sm text-muted-foreground">
                Ключ Google reCAPTCHA v2 для защиты от спама
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="allowed-origins">Разрешенные источники</Label>
              <Input
                id="allowed-origins"
                placeholder="example.com, *.gov.kz"
              />
              <p className="text-sm text-muted-foreground">
                Список доменов, с которых разрешена отправка формы (разделенные запятыми)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notification-email">Email для уведомлений</Label>
              <Input
                id="notification-email"
                placeholder="requests@agentsmith.gov.kz"
              />
              <p className="text-sm text-muted-foreground">
                Email для получения уведомлений о новых обращениях
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="form-html">Пример HTML кода формы</Label>
              <div className="relative">
                <pre className="bg-secondary text-secondary-foreground rounded-md p-4 overflow-x-auto text-sm">
                  {`<form action="https://api.agentsmith.gov.kz/api/public/citizen-request" method="POST">
  <input type="text" name="name" placeholder="Имя" required>
  <input type="email" name="email" placeholder="Email" required>
  <textarea name="message" placeholder="Сообщение" required></textarea>
  <div class="g-recaptcha" data-sitekey="YOUR_RECAPTCHA_KEY"></div>
  <button type="submit">Отправить</button>
</form>
<script src="https://www.google.com/recaptcha/api.js" async defer></script>`}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    navigator.clipboard.writeText(`<form action="https://api.agentsmith.gov.kz/api/public/citizen-request" method="POST">
  <input type="text" name="name" placeholder="Имя" required>
  <input type="email" name="email" placeholder="Email" required>
  <textarea name="message" placeholder="Сообщение" required></textarea>
  <div class="g-recaptcha" data-sitekey="YOUR_RECAPTCHA_KEY"></div>
  <button type="submit">Отправить</button>
</form>
<script src="https://www.google.com/recaptcha/api.js" async defer></script>`);
                    toast({
                      title: 'Скопировано',
                      description: 'HTML код формы скопирован в буфер обмена'
                    });
                  }}
                >
                  Копировать
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default IntegrationsSettings;