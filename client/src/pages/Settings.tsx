import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Settings as SettingsIcon, 
  Mail, 
  Users, 
  Database, 
  Globe, 
  BarChart4, 
  Shield, 
  Key
} from 'lucide-react';
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings';
import { useLocation } from 'wouter';

export default function Settings() {
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState('general');
  
  // Обработка tab параметра из URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['general', 'integrations', 'security'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location]);

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold flex items-center">
          <SettingsIcon className="mr-4 h-8 w-8" />
          Настройки системы
        </h1>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 rounded-full bg-muted/50">
          <TabsTrigger value="general" className="rounded-full">Общие</TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-full">Интеграции</TabsTrigger>
          <TabsTrigger value="security" className="rounded-full">Безопасность</TabsTrigger>
        </TabsList>

        {/* Вкладка общих настроек */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Общие настройки системы</CardTitle>
              <CardDescription>
                Основные параметры системы Agent Smith
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Плейсхолдеры для настроек */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Globe className="mr-2 h-5 w-5" />
                      Языковые настройки
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Языки системы и интерфейса: русский, казахский, английский
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Database className="mr-2 h-5 w-5" />
                      Хранилище данных
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      БД PostgreSQL, векторное хранилище Milvus/Qdrant, хранилище файлов
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart4 className="mr-2 h-5 w-5" />
                      Аналитика
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Настройки аналитических инструментов и отчетности
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Key className="mr-2 h-5 w-5" />
                      API ключи
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Управление API ключами для внешних интеграций
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Информация о системе */}
              
              <Card>
                <CardHeader>
                  <CardTitle>Информация о системе</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">Версия:</span>
                      <span>1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Последнее обновление:</span>
                      <span>14 мая 2025</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Среда выполнения:</span>
                      <span>Node.js v20.x</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">База данных:</span>
                      <span>PostgreSQL 16</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Блокчейн:</span>
                      <span>Hyperledger Besu</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Векторное хранилище:</span>
                      <span>Qdrant/Milvus</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">LLM провайдеры:</span>
                      <span>OpenAI, Anthropic, OpenRouter, vLLM, Perplexity, Custom</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>



        {/* Вкладка интеграций */}
        <TabsContent value="integrations">
          <IntegrationsSettings />
        </TabsContent>



        {/* Вкладка безопасности */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Настройки безопасности
              </CardTitle>
              <CardDescription>
                Параметры безопасности системы Agent Smith
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Плейсхолдеры для настроек безопасности */}
                <Card>
                  <CardHeader>
                    <CardTitle>Аутентификация</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Локальная аутентификация, LDAP/Active Directory, двухфакторная аутентификация
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="border-2 border-blue-100 shadow-md">
                  <CardHeader className="bg-blue-50/50">
                    <CardTitle className="flex items-center">
                      <Shield className="mr-2 h-5 w-5 text-blue-600" />
                      Управление доступом (RBAC)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex flex-col gap-4">
                      <p className="text-sm text-muted-foreground">
                        Управление ролями, правами доступа и разграничение полномочий пользователей в системе.
                        Интеграция с организационной структурой.
                      </p>
                      <ul className="text-sm text-slate-600 space-y-1 pl-6 list-disc">
                        <li>Управление ролями и разрешениями</li>
                        <li>Разграничение доступа к функциям</li>
                        <li>Назначение ролей пользователям</li>
                      </ul>
                      <div className="flex justify-end">
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => window.location.href = "/rbac"}>
                          Управление RBAC
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Шифрование</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Настройки шифрования данных и коммуникаций
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Аудит</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Настройки аудита и журналирования действий
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Блокчейн</CardTitle>
                  <CardDescription>
                    Настройки блокчейна для обеспечения неизменности записей
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Система использует Hyperledger Besu для хранения криптографически защищенных записей.
                    Записи в блокчейне обеспечивают неизменность и подлинность данных.
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}