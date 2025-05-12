import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Code, Copy, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ApiSettingsProps {
  refreshTab?: () => void;
}

interface ApiSettings {
  type: string;
  enabled: boolean;
  settings: {
    apiKey: string;
    autoProcess: boolean;
    selectedAgent: number | null;
  };
}

interface Agent {
  id: number;
  name: string;
  type: string;
}

export function ApiSettings({ refreshTab }: ApiSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<ApiSettings>({
    type: 'api',
    enabled: false,
    settings: {
      apiKey: '',
      autoProcess: false,
      selectedAgent: null
    }
  });

  // Получение списка агентов
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
    enabled: true
  });

  // Получение настроек API
  const { data: apiSettings, isLoading: isLoadingSettings } = useQuery<ApiSettings>({
    queryKey: ['/api/system/integration-settings', 'api'],
    queryFn: async () => {
      const response = await apiRequest('/api/system/integration-settings?type=api', {
        method: 'GET'
      });
      return response.json();
    },
    enabled: true
  });

  // Обновление локального состояния при загрузке настроек с сервера
  useEffect(() => {
    if (apiSettings) {
      setSettings(apiSettings);
    }
  }, [apiSettings]);

  // Мутация для сохранения настроек API
  const saveSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: ApiSettings) => {
      const response = await apiRequest('/api/system/integration-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedSettings)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Настройки сохранены",
        description: "Настройки API успешно обновлены",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/system/integration-settings', 'api'] });
      if (refreshTab) refreshTab();
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки API",
        variant: "destructive",
      });
    }
  });

  // Мутация для генерации нового API ключа
  const generateApiKeyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/system/generate-api-key', {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: (data) => {
      setSettings(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          apiKey: data.apiKey
        }
      }));
      toast({
        title: "API ключ сгенерирован",
        description: "Новый API ключ успешно создан. Не забудьте сохранить настройки.",
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сгенерировать новый API ключ",
        variant: "destructive",
      });
    }
  });

  // Обработчик изменения состояния включения API
  const handleEnabledChange = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, enabled }));
  };

  // Обработчик изменения автоматической обработки
  const handleAutoProcessChange = (autoProcess: boolean) => {
    setSettings(prev => ({ 
      ...prev, 
      settings: { 
        ...prev.settings, 
        autoProcess 
      } 
    }));
  };

  // Обработчик изменения выбранного агента
  const handleAgentChange = (value: string) => {
    const agentId = parseInt(value);
    setSettings(prev => ({ 
      ...prev, 
      settings: { 
        ...prev.settings, 
        selectedAgent: agentId 
      } 
    }));
  };

  // Функция сохранения настроек
  const saveSettings = () => {
    saveSettingsMutation.mutate(settings);
  };

  // Функция копирования API ключа
  const copyApiKey = () => {
    if (settings.settings.apiKey) {
      navigator.clipboard.writeText(settings.settings.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Функция генерации нового API ключа
  const generateNewApiKey = () => {
    generateApiKeyMutation.mutate();
  };

  if (isLoadingSettings) {
    return <div>Загрузка настроек...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">API для внешних обращений</h3>
        <div className="flex items-center space-x-2">
          <Switch 
            id="api-enabled" 
            checked={settings.enabled}
            onCheckedChange={handleEnabledChange}
          />
          <Label htmlFor="api-enabled">Включить внешний API</Label>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Настройки API для получения обращений от граждан через внешние системы
      </p>
      
      <Card>
        <CardHeader>
          <CardTitle>Доступ к API</CardTitle>
          <CardDescription>
            Настройки авторизации для доступа к API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auth-type">Тип авторизации</Label>
            <Select defaultValue="api_key" disabled>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип авторизации" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="api_key">API ключ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="api-key">API Ключ</Label>
            <div className="flex">
              <Input 
                id="api-key" 
                type="password" 
                value={settings.settings.apiKey || ''}
                readOnly
                className="flex-1"
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="ml-2" 
                onClick={copyApiKey}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              API ключ используется для авторизации запросов от внешних систем
            </p>
          </div>
          
          <Button onClick={generateNewApiKey}>
            Сгенерировать новый ключ
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Обработка обращений</CardTitle>
          <CardDescription>
            Настройки автоматической обработки входящих обращений через API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch 
              id="auto-process" 
              checked={settings.settings.autoProcess}
              onCheckedChange={handleAutoProcessChange}
            />
            <Label htmlFor="auto-process">Автоматически обрабатывать обращения</Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="default-agent">AI Агент по умолчанию</Label>
            <Select 
              value={settings.settings.selectedAgent?.toString() || ''} 
              onValueChange={handleAgentChange}
              disabled={!settings.settings.autoProcess}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите агента" />
              </SelectTrigger>
              <SelectContent>
                {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id.toString()}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Агент, который будет использоваться для автоматической обработки входящих обращений
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Пример использования API</CardTitle>
          <CardDescription>
            Пример запроса для отправки обращения через API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-md p-4 relative">
            <pre className="text-xs text-muted-foreground overflow-auto">
              <code className="text-green-600">POST /api/external/citizen-requests</code>
              {`
curl -X POST https://agent-smith.gov.kz/api/external/citizen-requests \\
-H "Content-Type: application/json" \\
-H "X-API-Key: ${settings.settings.apiKey || 'your_api_key_here'}" \\
-d '{
  "fullName": "Иван Петров",
  "contactInfo": "ivan@example.com",
  "subject": "Запрос на получение справки",
  "description": "Прошу предоставить справку о составе семьи",
  "requestType": "Справка",
  "priority": "medium",
  "externalId": "REQ-12345",
  "sourceSystem": "portal"
}'`}
            </pre>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2"
              onClick={() => {
                navigator.clipboard.writeText(`curl -X POST https://agent-smith.gov.kz/api/external/citizen-requests \\
-H "Content-Type: application/json" \\
-H "X-API-Key: ${settings.settings.apiKey || 'your_api_key_here'}" \\
-d '{
  "fullName": "Иван Петров",
  "contactInfo": "ivan@example.com",
  "subject": "Запрос на получение справки",
  "description": "Прошу предоставить справку о составе семьи",
  "requestType": "Справка",
  "priority": "medium",
  "externalId": "REQ-12345",
  "sourceSystem": "portal"
}'`);
                toast({
                  title: "Скопировано",
                  description: "Пример запроса скопирован в буфер обмена",
                  variant: "default",
                });
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saveSettingsMutation.isPending}>
          {saveSettingsMutation.isPending ? "Сохранение..." : "Сохранить настройки"}
        </Button>
      </div>
    </div>
  );
}