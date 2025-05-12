import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, BarChart4, Activity, BrainCircuit } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function MonitoringSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('llm');
  const [apiKeysSet, setApiKeysSet] = useState(false);
  
  const saveSettings = () => {
    // Имитация сохранения настроек
    setApiKeysSet(true);
    toast({
      title: "Настройки сохранены",
      description: "Настройки мониторинга успешно сохранены",
      variant: "default",
    });
  };

  return (
    <div className="container mx-auto py-6">
      <h2 className="text-3xl font-bold mb-6">Настройки мониторинга</h2>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="llm" className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4" />
            <span>LLM Мониторинг</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span>Производительность</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart4 className="h-4 w-4" />
            <span>Аналитика</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="llm" className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Важно</AlertTitle>
            <AlertDescription>
              Для полноценного мониторинга LLM необходимо настроить OpenAI API ключ. В демо-режиме используются синтетические данные.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Настройки OpenAI</CardTitle>
              <CardDescription>
                Настройка ключа API для мониторинга и анализа LLM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai_api_key">OpenAI API ключ</Label>
                <Input 
                  id="openai_api_key" 
                  type="password" 
                  placeholder="sk-..." 
                />
                <p className="text-sm text-muted-foreground">
                  API ключ необходим для анализа производительности моделей
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="default_model">Модель по умолчанию</Label>
                <Select defaultValue="gpt-4o">
                  <SelectTrigger id="default_model">
                    <SelectValue placeholder="Выберите модель" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="enable_cost_tracking" defaultChecked />
                <Label htmlFor="enable_cost_tracking">Отслеживать расходы</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="enable_anomaly_detection" defaultChecked />
                <Label htmlFor="enable_anomaly_detection">Обнаружение аномалий</Label>
              </div>
              
              <Button onClick={saveSettings} className="mt-4">Сохранить настройки</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Настройки оповещений</CardTitle>
              <CardDescription>
                Настройка уведомлений о событиях мониторинга LLM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="alert_high_cost" />
                <Label htmlFor="alert_high_cost">Оповещения о превышении стоимости</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cost_threshold">Порог стоимости ($)</Label>
                <Input 
                  id="cost_threshold" 
                  placeholder="100"
                  defaultValue="100"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="alert_performance" />
                <Label htmlFor="alert_performance">Оповещения о проблемах производительности</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="alert_errors" defaultChecked />
                <Label htmlFor="alert_errors">Оповещения об ошибках</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notification_email">Email для оповещений</Label>
                <Input 
                  id="notification_email" 
                  placeholder="admin@example.com"
                />
              </div>
              
              <Button onClick={saveSettings} className="mt-4">Сохранить настройки оповещений</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Настройки производительности системы</CardTitle>
              <CardDescription>
                Мониторинг серверной инфраструктуры и производительности приложения
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="monitor_server" defaultChecked />
                <Label htmlFor="monitor_server">Мониторинг сервера</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="monitor_database" defaultChecked />
                <Label htmlFor="monitor_database">Мониторинг базы данных</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="monitor_api" defaultChecked />
                <Label htmlFor="monitor_api">Мониторинг API</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sampling_interval">Интервал сбора данных (сек)</Label>
                <Input 
                  id="sampling_interval" 
                  placeholder="60"
                  defaultValue="60"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="retention_period">Период хранения данных (дни)</Label>
                <Input 
                  id="retention_period" 
                  placeholder="30"
                  defaultValue="30"
                />
              </div>
              
              <Button onClick={saveSettings} className="mt-4">Сохранить настройки</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Логирование и отладка</CardTitle>
              <CardDescription>
                Настройки системы логирования и отладки
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="log_level">Уровень логирования</Label>
                <Select defaultValue="info">
                  <SelectTrigger id="log_level">
                    <SelectValue placeholder="Выберите уровень" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="error">Только ошибки</SelectItem>
                    <SelectItem value="warn">Предупреждения и ошибки</SelectItem>
                    <SelectItem value="info">Информационный</SelectItem>
                    <SelectItem value="debug">Отладка</SelectItem>
                    <SelectItem value="trace">Трассировка</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="console_logging" defaultChecked />
                <Label htmlFor="console_logging">Вывод в консоль</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="file_logging" defaultChecked />
                <Label htmlFor="file_logging">Запись в файл</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="log_file">Путь к файлу логов</Label>
                <Input 
                  id="log_file" 
                  placeholder="/var/log/agent-smith/app.log"
                  defaultValue="logs/app.log"
                />
              </div>
              
              <Button onClick={saveSettings} className="mt-4">Сохранить настройки логов</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Настройки аналитики</CardTitle>
              <CardDescription>
                Настройка системы аналитики и отчетности
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="enable_analytics" defaultChecked />
                <Label htmlFor="enable_analytics">Включить аналитику</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ga_measurement_id">Google Analytics Measurement ID</Label>
                <Input 
                  id="ga_measurement_id" 
                  placeholder="G-XXXXXXXXXX"
                />
                <p className="text-sm text-muted-foreground">
                  Оставьте пустым, если не используете Google Analytics
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="report_schedule">Расписание отчетов</Label>
                <Select defaultValue="weekly">
                  <SelectTrigger id="report_schedule">
                    <SelectValue placeholder="Выберите периодичность" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Ежедневно</SelectItem>
                    <SelectItem value="weekly">Еженедельно</SelectItem>
                    <SelectItem value="monthly">Ежемесячно</SelectItem>
                    <SelectItem value="quarterly">Ежеквартально</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="report_recipients">Получатели отчетов (email)</Label>
                <Input 
                  id="report_recipients" 
                  placeholder="admin@example.com, manager@example.com"
                />
              </div>
              
              <Button onClick={saveSettings} className="mt-4">Сохранить настройки аналитики</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>AI-аналитика</CardTitle>
              <CardDescription>
                Настройка искусственного интеллекта для анализа данных
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="enable_ai_analytics" defaultChecked />
                <Label htmlFor="enable_ai_analytics">Включить AI-аналитику</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ai_model">Модель для аналитики</Label>
                <Select defaultValue="gpt-4o">
                  <SelectTrigger id="ai_model">
                    <SelectValue placeholder="Выберите модель" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                    <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="automatic_insights" defaultChecked />
                <Label htmlFor="automatic_insights">Автоматические инсайты</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="proactive_suggestions" />
                <Label htmlFor="proactive_suggestions">Проактивные предложения</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="analysis_frequency">Частота анализа</Label>
                <Select defaultValue="daily">
                  <SelectTrigger id="analysis_frequency">
                    <SelectValue placeholder="Выберите частоту" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">В реальном времени</SelectItem>
                    <SelectItem value="hourly">Ежечасно</SelectItem>
                    <SelectItem value="daily">Ежедневно</SelectItem>
                    <SelectItem value="weekly">Еженедельно</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={saveSettings} className="mt-4">Сохранить настройки AI</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}