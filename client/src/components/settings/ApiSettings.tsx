import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  const [showApiKey, setShowApiKey] = useState(false);
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
      const response = await fetch('/api/system/integration-settings?type=api', {
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
      const response = await fetch('/api/system/integration-settings', {
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
      const response = await fetch('/api/system/generate-api-key', {
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
      toast({
        title: "Скопировано",
        description: "API ключ скопирован в буфер обмена",
      });
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">API для внешних обращений</h3>
        <Button 
          variant="outline" 
          size="sm" 
          className="ml-auto" 
          onClick={generateNewApiKey}
        >
          Сгенерировать новый ключ
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Настройки API для получения обращений от граждан через внешние системы
      </p>
      
      <div className="flex items-center space-x-2 mb-6">
        <Switch 
          id="api-enabled" 
          checked={settings.enabled}
          onCheckedChange={handleEnabledChange}
        />
        <Label htmlFor="api-enabled">Включить внешний API</Label>
      </div>
      
      <div className="space-y-6">
        <div className="space-y-4 border rounded-lg p-4 bg-card">
          <h4 className="text-sm font-medium">Доступ к API</h4>
          
          <div className="space-y-2">
            <Label htmlFor="auth-type">Тип авторизации</Label>
            <Select defaultValue="api_key" disabled>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите тип авторизации" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="api_key">API ключ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="api-key">API Ключ</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input 
                  id="api-key" 
                  type={showApiKey ? "text" : "password"} 
                  value={settings.settings.apiKey || '••••••••••••••••••••••••••••••'}
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
            <p className="text-xs text-muted-foreground">
              API ключ используется для авторизации запросов от внешних систем
            </p>
          </div>
        </div>
        
        <div className="space-y-4 border rounded-lg p-4 bg-card">
          <h4 className="text-sm font-medium">Обработка обращений</h4>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="auto-process" 
              checked={settings.settings.autoProcess}
              onCheckedChange={handleAutoProcessChange}
            />
            <Label htmlFor="auto-process">Автоматически обрабатывать обращения</Label>
          </div>
          
          <div className="space-y-2 mt-4">
            <Label htmlFor="default-agent">AI Агент по умолчанию</Label>
            <Select 
              value={settings.settings.selectedAgent?.toString() || ''} 
              onValueChange={handleAgentChange}
              disabled={!settings.settings.autoProcess}
            >
              <SelectTrigger className="w-full">
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
        </div>
        
        <div className="space-y-4 border rounded-lg p-4 bg-card">
          <h4 className="text-sm font-medium">Пример использования API</h4>
          
          <div className="bg-gray-900 rounded-md p-4 text-white">
            <pre className="text-xs overflow-x-auto whitespace-pre">
              <code className="text-green-400">POST /api/external/citizen-requests</code>
              {`
curl -X POST https://agent-smith.replit.app/api/external/citizen-requests \\
-H "Content-Type: application/json" \\
-H "X-API-Key: ${showApiKey ? settings.settings.apiKey || 'your_api_key_here' : 'your_api_key_here'}" \\
-d '{
  "fullName": "Иван Петров",
  "contactInfo": "ivan@example.com",
  "subject": "Запрос на получение справки",
  "description": "Прошу предоставить справку о составе семьи",
  "requestType": "Справка",
  "priority": "medium",
  "externalId": "REQ-1234",
  "sourceSystem": "portal"
}'`}
            </pre>
          </div>
          <p className="text-xs text-muted-foreground">
            Используйте этот эндпоинт для отправки обращений граждан из внешних систем
          </p>
        </div>
      </div>
      
      <div className="flex justify-end mt-6">
        <Button variant="outline" className="mr-2">
          Отмена
        </Button>
        <Button onClick={saveSettings} disabled={saveSettingsMutation.isPending}>
          {saveSettingsMutation.isPending ? "Сохранение..." : "Сохранить изменения"}
        </Button>
      </div>
    </div>
  );
}