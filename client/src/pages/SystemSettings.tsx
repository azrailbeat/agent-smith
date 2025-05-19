import React, { useState } from 'react';
import { Shield, Cog, Link2, RefreshCw, Check, X, Users as UsersIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useIntegrationStatus } from '@/hooks/use-integration-status';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import Breadcrumbs from '@/components/Breadcrumbs';
import Users from './Users';
import { useSystemSettings, type SystemSettings } from '@/hooks/use-system-settings';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings';

// Компонент настроек безопасности
const SecuritySettings = () => {
  const { 
    settings, 
    isLoading, 
    updateSettings 
  } = useSystemSettings();
  
  const { toast } = useToast();
  
  if (isLoading) {
    return <div className="flex justify-center p-8">Загрузка настроек безопасности...</div>;
  }
  
  // Функция для обновления настроек безопасности
  const handleUpdateSecurity = (field: string, value: any) => {
    const securitySettings = { ...settings.security };
    
    // Обновляем определенное поле в настройках безопасности
    switch (field) {
      case 'enableLocalAuth':
        securitySettings.enableLocalAuth = value;
        break;
      case 'enableLdapAuth':
        securitySettings.enableLdapAuth = value;
        break;
      case 'enableTwoFactor':
        securitySettings.enableTwoFactor = value;
        break;
      case 'enableReplitAuth':
        securitySettings.enableReplitAuth = value;
        break;
      case 'sessionTimeout':
        securitySettings.sessionTimeout = parseInt(value);
        break;
      case 'twoFactorMethod':
        securitySettings.twoFactorMethod = value;
        break;
      // Обновление вложенных полей
      case 'ldapServerUrl':
        if (!securitySettings.ldapSettings) securitySettings.ldapSettings = { serverUrl: '', baseDn: '', bindDn: '', bindCredentials: '' };
        securitySettings.ldapSettings.serverUrl = value;
        break;
      case 'ldapBaseDn':
        if (!securitySettings.ldapSettings) securitySettings.ldapSettings = { serverUrl: '', baseDn: '', bindDn: '', bindCredentials: '' };
        securitySettings.ldapSettings.baseDn = value;
        break;
      case 'ldapBindDn':
        if (!securitySettings.ldapSettings) securitySettings.ldapSettings = { serverUrl: '', baseDn: '', bindDn: '', bindCredentials: '' };
        securitySettings.ldapSettings.bindDn = value;
        break;
      case 'ldapBindCredentials':
        if (!securitySettings.ldapSettings) securitySettings.ldapSettings = { serverUrl: '', baseDn: '', bindDn: '', bindCredentials: '' };
        securitySettings.ldapSettings.bindCredentials = value;
        break;
      // Настройки паролей
      case 'minLength':
        securitySettings.passwordRequirements.minLength = parseInt(value);
        break;
      case 'requireUppercase':
        securitySettings.passwordRequirements.requireUppercase = value;
        break;
      case 'requireLowercase':
        securitySettings.passwordRequirements.requireLowercase = value;
        break;
      case 'requireNumbers':
        securitySettings.passwordRequirements.requireNumbers = value;
        break;
      case 'requireSpecialChars':
        securitySettings.passwordRequirements.requireSpecialChars = value;
        break;
      // Настройки шифрования
      case 'encryptionAlgorithm':
        if (!securitySettings.encryption) securitySettings.encryption = { algorithm: '', keyRotationInterval: '', enableAtRest: false, enableInTransit: false };
        securitySettings.encryption.algorithm = value;
        break;
      case 'keyRotationInterval':
        if (!securitySettings.encryption) securitySettings.encryption = { algorithm: '', keyRotationInterval: '', enableAtRest: false, enableInTransit: false };
        securitySettings.encryption.keyRotationInterval = value;
        break;
      case 'enableAtRest':
        if (!securitySettings.encryption) securitySettings.encryption = { algorithm: '', keyRotationInterval: '', enableAtRest: false, enableInTransit: false };
        securitySettings.encryption.enableAtRest = value;
        break;
      case 'enableInTransit':
        if (!securitySettings.encryption) securitySettings.encryption = { algorithm: '', keyRotationInterval: '', enableAtRest: false, enableInTransit: false };
        securitySettings.encryption.enableInTransit = value;
        break;
      // Настройки аудита
      case 'retentionPeriod':
        if (!securitySettings.audit) securitySettings.audit = { retentionPeriod: '', enableExport: false };
        securitySettings.audit.retentionPeriod = value;
        break;
      case 'enableExport':
        if (!securitySettings.audit) securitySettings.audit = { retentionPeriod: '', enableExport: false };
        securitySettings.audit.enableExport = value;
        break;
      // Настройки блокчейна
      case 'blockchainEnabled':
        if (!securitySettings.blockchain) securitySettings.blockchain = { enabled: false, nodeUrl: '', auditContractAddress: '', recordCitizenRequests: false, recordDocuments: false, recordMeetings: false };
        securitySettings.blockchain.enabled = value;
        break;
      case 'nodeUrl':
        if (!securitySettings.blockchain) securitySettings.blockchain = { enabled: false, nodeUrl: '', auditContractAddress: '', recordCitizenRequests: false, recordDocuments: false, recordMeetings: false };
        securitySettings.blockchain.nodeUrl = value;
        break;
      case 'auditContractAddress':
        if (!securitySettings.blockchain) securitySettings.blockchain = { enabled: false, nodeUrl: '', auditContractAddress: '', recordCitizenRequests: false, recordDocuments: false, recordMeetings: false };
        securitySettings.blockchain.auditContractAddress = value;
        break;
      case 'recordCitizenRequests':
        if (!securitySettings.blockchain) securitySettings.blockchain = { enabled: false, nodeUrl: '', auditContractAddress: '', recordCitizenRequests: false, recordDocuments: false, recordMeetings: false };
        securitySettings.blockchain.recordCitizenRequests = value;
        break;
      case 'recordDocuments':
        if (!securitySettings.blockchain) securitySettings.blockchain = { enabled: false, nodeUrl: '', auditContractAddress: '', recordCitizenRequests: false, recordDocuments: false, recordMeetings: false };
        securitySettings.blockchain.recordDocuments = value;
        break;
      case 'recordMeetings':
        if (!securitySettings.blockchain) securitySettings.blockchain = { enabled: false, nodeUrl: '', auditContractAddress: '', recordCitizenRequests: false, recordDocuments: false, recordMeetings: false };
        securitySettings.blockchain.recordMeetings = value;
        break;
      default:
        break;
    }
    
    // Отправляем обновленные настройки на сервер
    updateSettings({ security: securitySettings });
    
    toast({
      title: 'Настройки безопасности обновлены',
      description: 'Изменения были успешно сохранены',
    });
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Аутентификация и авторизация</CardTitle>
          <CardDescription>
            Настройте методы аутентификации и параметры безопасности
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableLocalAuth">Локальная аутентификация</Label>
                <Switch 
                  id="enableLocalAuth"
                  checked={settings.security.enableLocalAuth}
                  onCheckedChange={(value) => handleUpdateSecurity('enableLocalAuth', value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Разрешить пользователям входить с логином и паролем
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableLdapAuth">LDAP аутентификация</Label>
                <Switch 
                  id="enableLdapAuth"
                  checked={settings.security.enableLdapAuth}
                  onCheckedChange={(value) => handleUpdateSecurity('enableLdapAuth', value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Разрешить пользователям входить через LDAP
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableTwoFactor">Двухфакторная аутентификация</Label>
                <Switch 
                  id="enableTwoFactor"
                  checked={settings.security.enableTwoFactor}
                  onCheckedChange={(value) => handleUpdateSecurity('enableTwoFactor', value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Требовать второй фактор аутентификации
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableReplitAuth">Replit аутентификация</Label>
                <Switch 
                  id="enableReplitAuth"
                  checked={settings.security.enableReplitAuth}
                  onCheckedChange={(value) => handleUpdateSecurity('enableReplitAuth', value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Разрешить пользователям входить через Replit
              </p>
            </div>
          </div>
          
          <div className="space-y-2 pt-4">
            <Label htmlFor="sessionTimeout">Время жизни сессии (минуты)</Label>
            <Input
              id="sessionTimeout"
              type="number"
              value={settings.security.sessionTimeout}
              onChange={(e) => handleUpdateSecurity('sessionTimeout', e.target.value)}
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              Время бездействия пользователя до автоматического выхода
            </p>
          </div>
          
          {settings.security.enableTwoFactor && (
            <div className="space-y-2 pt-4">
              <Label htmlFor="twoFactorMethod">Метод двухфакторной аутентификации</Label>
              <Select 
                value={settings.security.twoFactorMethod} 
                onValueChange={(value) => handleUpdateSecurity('twoFactorMethod', value)}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Выберите метод" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="app">Authenticator App</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Метод получения кода подтверждения
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {settings.security.enableLdapAuth && (
        <Card>
          <CardHeader>
            <CardTitle>Настройки LDAP</CardTitle>
            <CardDescription>
              Настройте параметры подключения к LDAP серверу
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ldapServerUrl">URL сервера</Label>
              <Input
                id="ldapServerUrl"
                value={settings.security.ldapSettings?.serverUrl || ''}
                onChange={(e) => handleUpdateSecurity('ldapServerUrl', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ldapBaseDn">Base DN</Label>
              <Input
                id="ldapBaseDn"
                value={settings.security.ldapSettings?.baseDn || ''}
                onChange={(e) => handleUpdateSecurity('ldapBaseDn', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ldapBindDn">Bind DN</Label>
              <Input
                id="ldapBindDn"
                value={settings.security.ldapSettings?.bindDn || ''}
                onChange={(e) => handleUpdateSecurity('ldapBindDn', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ldapBindCredentials">Bind Credentials</Label>
              <Input
                id="ldapBindCredentials"
                type="password"
                value={settings.security.ldapSettings?.bindCredentials || ''}
                onChange={(e) => handleUpdateSecurity('ldapBindCredentials', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Требования к паролям</CardTitle>
          <CardDescription>
            Настройте требования к безопасности паролей
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="minLength">Минимальная длина</Label>
            <Input
              id="minLength"
              type="number"
              className="max-w-xs"
              value={settings.security.passwordRequirements.minLength}
              onChange={(e) => handleUpdateSecurity('minLength', e.target.value)}
            />
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="requireUppercase">Заглавные буквы</Label>
                <Switch 
                  id="requireUppercase"
                  checked={settings.security.passwordRequirements.requireUppercase}
                  onCheckedChange={(value) => handleUpdateSecurity('requireUppercase', value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Требовать минимум одну заглавную букву
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="requireLowercase">Строчные буквы</Label>
                <Switch 
                  id="requireLowercase"
                  checked={settings.security.passwordRequirements.requireLowercase}
                  onCheckedChange={(value) => handleUpdateSecurity('requireLowercase', value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Требовать минимум одну строчную букву
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="requireNumbers">Цифры</Label>
                <Switch 
                  id="requireNumbers"
                  checked={settings.security.passwordRequirements.requireNumbers}
                  onCheckedChange={(value) => handleUpdateSecurity('requireNumbers', value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Требовать минимум одну цифру
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="requireSpecialChars">Специальные символы</Label>
                <Switch 
                  id="requireSpecialChars"
                  checked={settings.security.passwordRequirements.requireSpecialChars}
                  onCheckedChange={(value) => handleUpdateSecurity('requireSpecialChars', value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Требовать минимум один специальный символ
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Шифрование данных</CardTitle>
          <CardDescription>
            Настройте параметры шифрования данных в системе
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="encryptionAlgorithm">Алгоритм шифрования</Label>
            <Select 
              value={settings.security.encryption?.algorithm || "AES-256"} 
              onValueChange={(value) => handleUpdateSecurity('encryptionAlgorithm', value)}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Выберите алгоритм" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AES-256">AES-256</SelectItem>
                <SelectItem value="AES-128">AES-128</SelectItem>
                <SelectItem value="ChaCha20">ChaCha20</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="keyRotationInterval">Период ротации ключей</Label>
            <Select 
              value={settings.security.encryption?.keyRotationInterval || "90days"} 
              onValueChange={(value) => handleUpdateSecurity('keyRotationInterval', value)}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Выберите период" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">30 дней</SelectItem>
                <SelectItem value="60days">60 дней</SelectItem>
                <SelectItem value="90days">90 дней</SelectItem>
                <SelectItem value="180days">180 дней</SelectItem>
                <SelectItem value="365days">1 год</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableAtRest">Шифрование в покое</Label>
                <Switch 
                  id="enableAtRest"
                  checked={settings.security.encryption?.enableAtRest || false}
                  onCheckedChange={(value) => handleUpdateSecurity('enableAtRest', value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Шифрование данных в базе данных и файловом хранилище
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableInTransit">Шифрование в транзите</Label>
                <Switch 
                  id="enableInTransit"
                  checked={settings.security.encryption?.enableInTransit || false}
                  onCheckedChange={(value) => handleUpdateSecurity('enableInTransit', value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Шифрование данных при передаче между компонентами системы
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Настройки аудита</CardTitle>
          <CardDescription>
            Настройте параметры аудита и хранения журналов
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="retentionPeriod">Период хранения журналов</Label>
            <Select 
              value={settings.security.audit?.retentionPeriod || "1year"} 
              onValueChange={(value) => handleUpdateSecurity('retentionPeriod', value)}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Выберите период" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">30 дней</SelectItem>
                <SelectItem value="90days">90 дней</SelectItem>
                <SelectItem value="180days">180 дней</SelectItem>
                <SelectItem value="1year">1 год</SelectItem>
                <SelectItem value="3years">3 года</SelectItem>
                <SelectItem value="7years">7 лет</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="enableExport">Экспорт журналов аудита</Label>
              <Switch 
                id="enableExport"
                checked={settings.security.audit?.enableExport || false}
                onCheckedChange={(value) => handleUpdateSecurity('enableExport', value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Разрешить экспорт журналов аудита в CSV/JSON формат
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Интеграция с блокчейном</CardTitle>
          <CardDescription>
            Настройте параметры записи активностей в блокчейн
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="blockchainEnabled">Включить запись в блокчейн</Label>
              <Switch 
                id="blockchainEnabled"
                checked={settings.security.blockchain?.enabled || false}
                onCheckedChange={(value) => handleUpdateSecurity('blockchainEnabled', value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Активировать запись критичных активностей в блокчейн
            </p>
          </div>
          
          {settings.security.blockchain?.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="nodeUrl">URL узла блокчейна</Label>
                <Input
                  id="nodeUrl"
                  value={settings.security.blockchain?.nodeUrl || ''}
                  onChange={(e) => handleUpdateSecurity('nodeUrl', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  URL-адрес узла Hyperledger Besu
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="auditContractAddress">Адрес смарт-контракта аудита</Label>
                <Input
                  id="auditContractAddress"
                  value={settings.security.blockchain?.auditContractAddress || ''}
                  onChange={(e) => handleUpdateSecurity('auditContractAddress', e.target.value)}
                />
              </div>
              
              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="recordCitizenRequests">Обращения граждан</Label>
                    <Switch 
                      id="recordCitizenRequests"
                      checked={settings.security.blockchain?.recordCitizenRequests || false}
                      onCheckedChange={(value) => handleUpdateSecurity('recordCitizenRequests', value)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Запись обращений граждан в блокчейн
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="recordDocuments">Документы</Label>
                    <Switch 
                      id="recordDocuments"
                      checked={settings.security.blockchain?.recordDocuments || false}
                      onCheckedChange={(value) => handleUpdateSecurity('recordDocuments', value)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Запись хешей документов в блокчейн
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="recordMeetings">Протоколы встреч</Label>
                    <Switch 
                      id="recordMeetings"
                      checked={settings.security.blockchain?.recordMeetings || false}
                      onCheckedChange={(value) => handleUpdateSecurity('recordMeetings', value)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Запись протоколов встреч в блокчейн
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Компонент общих настроек системы
const GeneralSettings = () => {
  const { 
    settings, 
    isLoading, 
    updateSettings 
  } = useSystemSettings();
  
  const { toast } = useToast();
  
  if (isLoading) {
    return <div className="flex justify-center p-8">Загрузка общих настроек...</div>;
  }
  
  // Функция для обновления общих настроек
  const handleUpdateGeneral = (field: string, value: any) => {
    const generalSettings = { ...settings.general };
    
    // Обновляем определенное поле в общих настройках
    switch (field) {
      case 'systemName':
        generalSettings.systemName = value;
        break;
      case 'defaultLanguage':
        generalSettings.defaultLanguage = value;
        break;
      case 'enableActivityLogging':
        generalSettings.enableActivityLogging = value;
        break;
      case 'enableBlockchainIntegration':
        generalSettings.enableBlockchainIntegration = value;
        break;
      case 'vectorStore':
        generalSettings.vectorStore = value;
        break;
      case 'fileStorage':
        generalSettings.fileStorage = value;
        break;
      case 'enableBackups':
        generalSettings.enableBackups = value;
        break;
      case 'apiBaseUrl':
        generalSettings.apiBaseUrl = value;
        break;
      case 'apiEnabled':
        generalSettings.apiEnabled = value;
        break;
      case 'collectUsageMetrics':
        if (!generalSettings.analytics) generalSettings.analytics = { collectUsageMetrics: false, reportInterval: 'daily' };
        generalSettings.analytics.collectUsageMetrics = value;
        break;
      case 'reportInterval':
        if (!generalSettings.analytics) generalSettings.analytics = { collectUsageMetrics: false, reportInterval: 'daily' };
        generalSettings.analytics.reportInterval = value;
        break;
      default:
        break;
    }
    
    // Отправляем обновленные настройки на сервер
    updateSettings({ general: generalSettings });
    
    toast({
      title: 'Общие настройки обновлены',
      description: 'Изменения были успешно сохранены',
    });
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Основные настройки</CardTitle>
          <CardDescription>
            Основные параметры конфигурации системы
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="systemName">Название системы</Label>
            <Input
              id="systemName"
              value={settings.general.systemName}
              onChange={(e) => handleUpdateGeneral('systemName', e.target.value)}
              className="max-w-md"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="defaultLanguage">Язык по умолчанию</Label>
            <Select 
              value={settings.general.defaultLanguage} 
              onValueChange={(value) => handleUpdateGeneral('defaultLanguage', value)}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Выберите язык" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">Русский</SelectItem>
                <SelectItem value="kk">Казахский</SelectItem>
                <SelectItem value="en">Английский</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableActivityLogging">Журналирование активности</Label>
                <Switch 
                  id="enableActivityLogging"
                  checked={settings.general.enableActivityLogging}
                  onCheckedChange={(value) => handleUpdateGeneral('enableActivityLogging', value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Запись всех действий пользователей в журнал активности
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableBlockchainIntegration">Интеграция с блокчейном</Label>
                <Switch 
                  id="enableBlockchainIntegration"
                  checked={settings.general.enableBlockchainIntegration}
                  onCheckedChange={(value) => handleUpdateGeneral('enableBlockchainIntegration', value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Активировать интеграцию с блокчейном для обеспечения неизменности данных
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Настройки хранения</CardTitle>
          <CardDescription>
            Параметры хранения данных и векторные индексы
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vectorStore">Векторное хранилище</Label>
            <Select 
              value={settings.general.vectorStore || 'qdrant'} 
              onValueChange={(value) => handleUpdateGeneral('vectorStore', value)}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Выберите хранилище" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qdrant">Qdrant</SelectItem>
                <SelectItem value="milvus">Milvus</SelectItem>
                <SelectItem value="pgvector">PG Vector</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Хранилище для векторных эмбеддингов документов и знаний
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fileStorage">Хранилище файлов</Label>
            <Select 
              value={settings.general.fileStorage || 'local'} 
              onValueChange={(value) => handleUpdateGeneral('fileStorage', value)}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Выберите хранилище" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Локальное хранилище</SelectItem>
                <SelectItem value="s3">S3-совместимое хранилище</SelectItem>
                <SelectItem value="supabase">Supabase Storage</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Хранилище для загружаемых файлов и документов
            </p>
          </div>
          
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="enableBackups">Резервное копирование</Label>
              <Switch 
                id="enableBackups"
                checked={settings.general.enableBackups || false}
                onCheckedChange={(value) => handleUpdateGeneral('enableBackups', value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Автоматическое создание резервных копий данных
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>API и интеграции</CardTitle>
          <CardDescription>
            Настройки API и внешних интеграций
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiBaseUrl">Базовый URL API</Label>
            <Input
              id="apiBaseUrl"
              value={settings.general.apiBaseUrl || ''}
              onChange={(e) => handleUpdateGeneral('apiBaseUrl', e.target.value)}
              className="max-w-md"
            />
            <p className="text-sm text-muted-foreground">
              Базовый URL для внешнего API
            </p>
          </div>
          
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="apiEnabled">Внешний API</Label>
              <Switch 
                id="apiEnabled"
                checked={settings.general.apiEnabled || false}
                onCheckedChange={(value) => handleUpdateGeneral('apiEnabled', value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Активировать внешний API для интеграции с другими системами
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Аналитика</CardTitle>
          <CardDescription>
            Настройки сбора и анализа данных
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="collectUsageMetrics">Сбор метрик использования</Label>
              <Switch 
                id="collectUsageMetrics"
                checked={settings.general.analytics?.collectUsageMetrics || false}
                onCheckedChange={(value) => handleUpdateGeneral('collectUsageMetrics', value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Собирать анонимные данные об использовании системы
            </p>
          </div>
          
          {settings.general.analytics?.collectUsageMetrics && (
            <div className="space-y-2">
              <Label htmlFor="reportInterval">Интервал отчетности</Label>
              <Select 
                value={settings.general.analytics?.reportInterval || 'daily'} 
                onValueChange={(value) => handleUpdateGeneral('reportInterval', value)}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Выберите интервал" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Ежечасно</SelectItem>
                  <SelectItem value="daily">Ежедневно</SelectItem>
                  <SelectItem value="weekly">Еженедельно</SelectItem>
                  <SelectItem value="monthly">Ежемесячно</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Частота генерации отчетов об использовании системы
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Основной компонент настроек системы
const SystemSettings = () => {
  return (
    <>
      <div className="mb-4">
        <Breadcrumbs 
          items={[
            { title: 'Главная', href: '/' },
            { title: 'Настройки системы', href: '/system-settings' }
          ]} 
        />
        <h1 className="text-2xl font-semibold mt-2">Настройки системы</h1>
      </div>
      
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Cog size={16} />
            <span>Общие</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link2 size={16} />
            <span>Интеграции</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield size={16} />
            <span>Безопасность</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UsersIcon size={16} />
            <span>Пользователи</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <GeneralSettings />
        </TabsContent>
        
        <TabsContent value="integrations" className="space-y-4">
          <IntegrationsSettings />
        </TabsContent>
        
        <TabsContent value="security" className="space-y-4">
          <SecuritySettings />
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <Users />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default SystemSettings;