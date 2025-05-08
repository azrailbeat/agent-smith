import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Check, Trash2, Pencil, Plus, Unlock, Lock, Database, Cloud, Server, Disc, Layers, MessageSquare, FileText, Mic, Copy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Integration, Agent } from "@shared/schema";
import { SecretField } from "@/components/ui/secret-field";
import { LLMMonitoring } from "@/components/monitoring/LLMMonitoring";

// Integration form for add/edit
interface IntegrationFormProps {
  integration?: Integration;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const IntegrationForm = ({ integration, onSubmit, onCancel }: IntegrationFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: integration?.name || "",
    type: integration?.type || "",
    apiUrl: integration?.apiUrl || "",
    apiKey: integration?.apiKey || "",
    isActive: integration?.isActive !== false, // Используем boolean вместо literal true
    config: integration?.config ? JSON.stringify(integration.config, null, 2) : "{}"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isActive: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let configObj = {};
    try {
      configObj = JSON.parse(formData.config);
    } catch (error) {
      alert("Ошибка в формате JSON конфигурации");
      return;
    }
    
    onSubmit({
      ...formData,
      config: configObj
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Название</Label>
          <Input 
            id="name" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            required 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Тип</Label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
            required
          >
            <option value="">Выберите тип</option>
            <option value="openai">OpenAI</option>
            <option value="speech">Распознавание речи</option>
            <option value="planka">Planka</option>
            <option value="openproject">OpenProject</option>
            <option value="telegram">Telegram</option>
            <option value="moralis">Moralis (Blockchain)</option>
            <option value="custom">Другой</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="apiUrl">URL API</Label>
        <Input 
          id="apiUrl" 
          name="apiUrl" 
          value={formData.apiUrl} 
          onChange={handleChange} 
          required 
        />
      </div>

      <div className="space-y-2">
        <SecretField
          label="API ключ"
          name="apiKey"
          value={formData.apiKey}
          onChange={(value) => setFormData(prev => ({ ...prev, apiKey: value }))}
          description="Ключ API используется для аутентификации в сервисе"
          showCopyButton={true}
          showRotateButton={true}
          onRotate={async () => {
            // В реальном приложении здесь была бы логика обновления ключа
            // Предупреждаем, что это тестовая функция
            const { toast } = useToast();
            toast({
              title: "Тестовая функция",
              description: "В рабочей версии здесь будет интеграция с HashiCorp Vault"
            });
            return "new-api-key-" + Math.random().toString(36).substring(2, 10);
          }}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={handleSwitchChange}
        />
        <Label htmlFor="isActive">Активна</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="config">Конфигурация (JSON)</Label>
        <Textarea
          id="config"
          name="config"
          value={formData.config}
          onChange={handleChange}
          rows={5}
          className="font-mono text-sm"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit">
          {integration ? "Обновить" : "Добавить"}
        </Button>
      </div>
    </form>
  );
};

// Agent form for add/edit
interface AgentFormProps {
  agent?: Agent;
  integrations: Integration[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const AgentForm = ({ agent, integrations, onSubmit, onCancel }: AgentFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: agent?.name || "",
    type: agent?.type || "",
    description: agent?.description || "",
    modelId: agent?.modelId || "",
    systemPrompt: agent?.systemPrompt || "",
    isActive: agent?.isActive !== false, // Используем boolean вместо literal true
    config: agent?.config ? JSON.stringify(agent.config, null, 2) : '{\n  "temperature": 0.7,\n  "maxTokens": 2048\n}'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isActive: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let configObj = {};
    try {
      configObj = JSON.parse(formData.config);
    } catch (error) {
      alert("Ошибка в формате JSON конфигурации");
      return;
    }
    
    onSubmit({
      ...formData,
      config: configObj,
      modelId: parseInt(formData.modelId)
    });
  };

  // Filter only active AI integrations (OpenAI)
  const aiIntegrations = integrations.filter(i => 
    i.isActive && (i.type === "openai")
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Название</Label>
          <Input 
            id="name" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            required 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Тип</Label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
            required
          >
            <option value="">Выберите тип</option>
            <option value="citizen_requests">Обработка запросов граждан</option>
            <option value="meeting_protocols">Протоколы совещаний</option>
            <option value="translator">Переводчик</option>
            <option value="summarizer">Суммаризатор документов</option>
            <option value="custom">Пользовательский</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Описание</Label>
        <Textarea 
          id="description" 
          name="description" 
          value={formData.description} 
          onChange={handleChange} 
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="modelId">Интеграция AI</Label>
        <select
          id="modelId"
          name="modelId"
          value={formData.modelId}
          onChange={handleChange}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
          required
        >
          <option value="">Выберите интеграцию AI</option>
          {aiIntegrations.map(integration => (
            <option key={integration.id} value={integration.id}>
              {integration.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="systemPrompt">Системный промпт</Label>
        <Textarea
          id="systemPrompt"
          name="systemPrompt"
          value={formData.systemPrompt}
          onChange={handleChange}
          rows={5}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={handleSwitchChange}
        />
        <Label htmlFor="isActive">Активен</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="config">Конфигурация (JSON)</Label>
        <Textarea
          id="config"
          name="config"
          value={formData.config}
          onChange={handleChange}
          rows={5}
          className="font-mono text-sm"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit">
          {agent ? "Обновить" : "Добавить"}
        </Button>
      </div>
    </form>
  );
};

// Main Settings page component
const Settings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for dialogs
  const [isIntegrationDialogOpen, setIsIntegrationDialogOpen] = useState(false);
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  const [currentIntegration, setCurrentIntegration] = useState<Integration | undefined>(undefined);
  const [currentAgent, setCurrentAgent] = useState<Agent | undefined>(undefined);

  // Fetch integrations
  const { 
    data: integrations = [], 
    isLoading: isLoadingIntegrations 
  } = useQuery({
    queryKey: ['/api/integrations'],
    queryFn: () => apiRequest('GET', '/api/integrations').then(res => res.json())
  });

  // Fetch agents
  const { 
    data: agents = [], 
    isLoading: isLoadingAgents 
  } = useQuery({
    queryKey: ['/api/agents'],
    queryFn: () => apiRequest('GET', '/api/agents').then(res => res.json())
  });

  // Integration mutations
  const createIntegrationMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest('POST', '/api/integrations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      setIsIntegrationDialogOpen(false);
      toast({
        title: "Успех",
        description: "Интеграция успешно создана",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать интеграцию",
        variant: "destructive",
      });
    }
  });

  const updateIntegrationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => 
      apiRequest('PATCH', `/api/integrations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      setIsIntegrationDialogOpen(false);
      toast({
        title: "Успех",
        description: "Интеграция успешно обновлена",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить интеграцию",
        variant: "destructive",
      });
    }
  });

  const deleteIntegrationMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('DELETE', `/api/integrations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      toast({
        title: "Успех",
        description: "Интеграция успешно удалена",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить интеграцию",
        variant: "destructive",
      });
    }
  });

  // Agent mutations
  const createAgentMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest('POST', '/api/agents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      setIsAgentDialogOpen(false);
      toast({
        title: "Успех",
        description: "Агент успешно создан",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать агента",
        variant: "destructive",
      });
    }
  });

  const updateAgentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => 
      apiRequest('PATCH', `/api/agents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      setIsAgentDialogOpen(false);
      toast({
        title: "Успех",
        description: "Агент успешно обновлен",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить агента",
        variant: "destructive",
      });
    }
  });

  const deleteAgentMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('DELETE', `/api/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      toast({
        title: "Успех",
        description: "Агент успешно удален",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить агента",
        variant: "destructive",
      });
    }
  });

  // Handlers
  const handleAddIntegration = () => {
    setCurrentIntegration(undefined);
    setIsIntegrationDialogOpen(true);
  };

  const handleEditIntegration = (integration: Integration) => {
    setCurrentIntegration(integration);
    setIsIntegrationDialogOpen(true);
  };

  const handleDeleteIntegration = (id: number) => {
    if (window.confirm("Вы уверены, что хотите удалить эту интеграцию?")) {
      deleteIntegrationMutation.mutate(id);
    }
  };

  const handleIntegrationSubmit = (data: any) => {
    if (currentIntegration) {
      updateIntegrationMutation.mutate({ id: currentIntegration.id, data });
    } else {
      createIntegrationMutation.mutate(data);
    }
  };

  const handleAddAgent = () => {
    setCurrentAgent(undefined);
    setIsAgentDialogOpen(true);
  };

  const handleEditAgent = (agent: Agent) => {
    setCurrentAgent(agent);
    setIsAgentDialogOpen(true);
  };

  const handleDeleteAgent = (id: number) => {
    if (window.confirm("Вы уверены, что хотите удалить этого агента?")) {
      deleteAgentMutation.mutate(id);
    }
  };

  const handleAgentSubmit = (data: any) => {
    if (currentAgent) {
      updateAgentMutation.mutate({ id: currentAgent.id, data });
    } else {
      createAgentMutation.mutate(data);
    }
  };

  // State for test connection results
  const [testResults, setTestResults] = useState<{
    success?: boolean;
    message?: string;
    transactionHash?: string;
  } | null>(null);

  // Test connection for integrations
  const testConnectionMutation = useMutation({
    mutationFn: async (integration: Integration) => {
      toast({
        title: "Проверка соединения...",
        description: `Тестирование соединения с ${getIntegrationType(integration.type)}`
      });
      
      // Используем GET запрос с query params вместо POST с телом
      const response = await fetch(`/api/integrations/test?type=${integration.type}&apiKey=${integration.apiKey || ''}`);
      const data = await response.json();
      
      // Сохраняем результаты теста
      setTestResults(data);
      
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: data.success ? "Успех" : "Ошибка",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      setTestResults({ success: false, message: error.message || "Неизвестная ошибка" });
      
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось протестировать соединение",
        variant: "destructive",
      });
    }
  });

  const handleTestConnection = (integration: Integration) => {
    setTestResults(null); // Сбрасываем предыдущие результаты теста
    testConnectionMutation.mutate(integration);
  };

  // Helper for displaying integration type in a user-friendly way
  const getIntegrationType = (type: string) => {
    const types: Record<string, string> = {
      openai: "OpenAI",
      speech: "Распознавание речи",
      planka: "Planka",
      openproject: "OpenProject",
      telegram: "Telegram",
      moralis: "Moralis (Blockchain)",
      custom: "Другой"
    };
    return types[type] || type;
  };
  
  // Helper for getting integration icon based on type
  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case "openai":
        return <Cloud className="h-5 w-5 text-green-500" />;
      case "speech":
        return <Mic className="h-5 w-5 text-blue-500" />;
      case "planka":
        return <Layers className="h-5 w-5 text-purple-500" />;
      case "openproject":
        return <FileText className="h-5 w-5 text-red-500" />;
      case "telegram": 
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case "moralis":
        return <Database className="h-5 w-5 text-indigo-500" />;
      case "blockchain":
        return <Database className="h-5 w-5 text-indigo-500" />;
      default:
        return <Server className="h-5 w-5 text-gray-500" />;
    }
  };

  // Helper for displaying agent type in a user-friendly way
  const getAgentType = (type: string) => {
    const types: Record<string, string> = {
      citizen_requests: "Обработка запросов граждан",
      meeting_protocols: "Протоколы совещаний",
      translator: "Переводчик",
      summarizer: "Суммаризатор документов",
      custom: "Пользовательский"
    };
    return types[type] || type;
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Настройки</h1>
      
      <Tabs defaultValue="integrations" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="integrations">Внешние интеграции</TabsTrigger>
          <TabsTrigger value="agents">AI Агенты</TabsTrigger>
          <TabsTrigger value="api">API для обращений</TabsTrigger>
          <TabsTrigger value="monitoring">Мониторинг LLM</TabsTrigger>
        </TabsList>
        
        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Внешние интеграции</h2>
            <Button onClick={handleAddIntegration}>
              <Plus className="mr-2 h-4 w-4" /> Добавить интеграцию
            </Button>
          </div>
          
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">Все интеграции</TabsTrigger>
              <TabsTrigger value="openai">OpenAI</TabsTrigger>
              <TabsTrigger value="moralis">Blockchain (Moralis)</TabsTrigger>
              <TabsTrigger value="speech">Распознавание речи</TabsTrigger>
              <TabsTrigger value="documentolog">Документолог</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <Card>
                <CardContent className="pt-6">
                  {isLoadingIntegrations ? (
                    <div className="text-center py-4">Загрузка интеграций...</div>
                  ) : integrations.length === 0 ? (
                    <div className="text-center py-4">
                      <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p>Интеграции не настроены</p>
                      <Button onClick={handleAddIntegration} variant="outline" className="mt-2">
                        <Plus className="mr-2 h-4 w-4" /> Добавить интеграцию
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Название</TableHead>
                          <TableHead>Тип</TableHead>
                          <TableHead>URL API</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead className="w-24 text-right">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {integrations.map((integration) => (
                          <TableRow key={integration.id}>
                            <TableCell>
                              <div className="flex items-center">
                                {getIntegrationIcon(integration.type)} 
                                <span className="ml-2 font-medium">{integration.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getIntegrationType(integration.type)}</TableCell>
                            <TableCell className="max-w-xs truncate">{integration.apiUrl}</TableCell>
                            <TableCell>
                              {integration.isActive ? (
                                <div className="flex items-center">
                                  <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                                  Активна
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <span className="h-2 w-2 rounded-full bg-gray-500 mr-2"></span>
                                  Отключена
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditIntegration(integration)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteIntegration(integration.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="openai">
              <Card>
                <CardHeader>
                  <CardTitle>Настройки OpenAI</CardTitle>
                  <CardDescription>
                    Настройка интеграции с OpenAI API для работы AI агентов
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integrations.filter(i => i.type === "openai").length === 0 ? (
                    <div className="text-center py-4">
                      <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p>Интеграция с OpenAI не настроена</p>
                      <Button onClick={handleAddIntegration} variant="outline" className="mt-2">
                        <Plus className="mr-2 h-4 w-4" /> Добавить интеграцию OpenAI
                      </Button>
                    </div>
                  ) : (
                    integrations.filter(i => i.type === "openai").map(integration => (
                      <div key={integration.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center">
                            <Cloud className="h-5 w-5 text-green-500 mr-2" />
                            <h3 className="text-lg font-medium">{integration.name}</h3>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={integration.isActive ? "text-green-500" : "text-gray-500"}>
                              {integration.isActive ? "Активна" : "Отключена"}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditIntegration(integration)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">URL API</Label>
                            <p className="text-sm font-medium">{integration.apiUrl}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">API Key</Label>
                            <p className="text-sm font-medium">••••••••••••••••</p>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <Label className="text-xs text-muted-foreground">Конфигурация</Label>
                          <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono whitespace-pre overflow-auto max-h-32">
                            {JSON.stringify(integration.config, null, 2)}
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t flex justify-end">
                          <Button 
                            onClick={() => handleTestConnection(integration)}
                            size="sm"
                            disabled={testConnectionMutation.isPending}
                          >
                            {testConnectionMutation.isPending ? (
                              <>Проверка...</>
                            ) : (
                              <>Проверить соединение</>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="moralis">
              <Card>
                <CardHeader>
                  <CardTitle>Настройки Blockchain (Moralis)</CardTitle>
                  <CardDescription>
                    Настройка интеграции с Moralis API для работы с блокчейн
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integrations.filter(i => i.type === "moralis" || i.type === "blockchain").length === 0 ? (
                    <div className="text-center py-4">
                      <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p>Интеграция с Moralis не настроена</p>
                      <Button onClick={handleAddIntegration} variant="outline" className="mt-2">
                        <Plus className="mr-2 h-4 w-4" /> Добавить интеграцию с Moralis
                      </Button>
                    </div>
                  ) : (
                    <>
                      {integrations.filter(i => i.type === "moralis" || i.type === "blockchain").map(integration => (
                        <div key={integration.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center">
                              <Database className="h-5 w-5 text-indigo-500 mr-2" />
                              <h3 className="text-lg font-medium">{integration.name}</h3>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={integration.isActive ? "text-green-500" : "text-gray-500"}>
                                {integration.isActive ? "Активна" : "Отключена"}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditIntegration(integration)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">URL Ноды</Label>
                              <p className="text-sm font-medium">{integration.apiUrl}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">API Key</Label>
                              <p className="text-sm font-medium">••••••••••••••••</p>
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <Label className="text-xs text-muted-foreground">Конфигурация</Label>
                            <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono whitespace-pre overflow-auto max-h-32">
                              {JSON.stringify(integration.config, null, 2)}
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t flex justify-between items-center">
                            <div>
                              <h4 className="font-medium mb-2">Настройки сохранения данных</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h5 className="text-sm font-medium mb-2">Типы данных для блокчейн</h5>
                                  <div className="space-y-2">
                                    <div className="flex items-center">
                                      <Switch 
                                        id="moralis-documents" 
                                        checked={true}
                                        disabled
                                      />
                                      <Label htmlFor="moralis-documents" className="ml-2">Документы</Label>
                                    </div>
                                    <div className="flex items-center">
                                      <Switch 
                                        id="moralis-sync" 
                                        checked={true}
                                        disabled
                                      />
                                      <Label htmlFor="moralis-sync" className="ml-2">События синхронизации</Label>
                                    </div>
                                    <div className="flex items-center">
                                      <Switch 
                                        id="moralis-access" 
                                        checked={true}
                                        disabled
                                      />
                                      <Label htmlFor="moralis-access" className="ml-2">События доступа</Label>
                                    </div>
                                    
                                    <div className="mt-4">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="w-full"
                                        onClick={async () => {
                                          try {
                                            toast({
                                              title: "Создание тестовой записи...",
                                              description: "Отправка тестовых данных в блокчейн"
                                            });
                                            
                                            const response = await apiRequest('POST', '/api/blockchain/test-record', {
                                              testData: {
                                                type: 'system_event',
                                                title: 'Тестовая запись для проверки',
                                                content: `Тестовые данные, созданные ${new Date().toLocaleString('ru')}`,
                                                metadata: {
                                                  isTest: true,
                                                  source: 'Страница настроек',
                                                  user: 'Администратор'
                                                }
                                              }
                                            });
                                            
                                            const result = await response.json();
                                            
                                            if (result.success) {
                                              toast({
                                                title: "Успех!",
                                                description: `Тестовая запись создана с хэшем: ${result.blockchain.transactionHash.substring(0, 10)}...`,
                                              });
                                              
                                              // Обновляем список записей
                                              queryClient.invalidateQueries({ queryKey: ['/api/blockchain/records'] });
                                            } else {
                                              throw new Error(result.message || 'Неизвестная ошибка');
                                            }
                                          } catch (error) {
                                            console.error('Ошибка при создании тестовой записи:', error);
                                            toast({
                                              title: "Ошибка",
                                              description: error.message || 'Не удалось создать тестовую запись',
                                              variant: "destructive"
                                            });
                                          }
                                        }}
                                      >
                                        Записать тестовые данные
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h5 className="text-sm font-medium mb-2">Данные для сохранения</h5>
                                  <div className="space-y-2">
                                    <div className="flex items-center">
                                      <Switch 
                                        id="moralis-hash" 
                                        checked={true}
                                        disabled
                                      />
                                      <Label htmlFor="moralis-hash" className="ml-2">Хеш документа</Label>
                                    </div>
                                    <div className="flex items-center">
                                      <Switch 
                                        id="moralis-metadata" 
                                        checked={true}
                                        disabled
                                      />
                                      <Label htmlFor="moralis-metadata" className="ml-2">Метаданные</Label>
                                    </div>
                                    <div className="flex items-center">
                                      <Switch 
                                        id="moralis-timestamp" 
                                        checked={true}
                                        disabled
                                      />
                                      <Label htmlFor="moralis-timestamp" className="ml-2">Временная метка</Label>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex flex-col items-end">
                                <Button 
                                  onClick={() => handleTestConnection(integration)}
                                  size="sm"
                                  disabled={testConnectionMutation.isPending}
                                >
                                  {testConnectionMutation.isPending ? (
                                    <>Проверка...</>
                                  ) : (
                                    <>Проверить соединение</>
                                  )}
                                </Button>
                                
                                {/* Результаты теста подключения */}
                                {testResults && (
                                  <div className={`mt-4 p-3 rounded-md text-sm w-full ${
                                    testResults.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                  }`}>
                                    <div className="flex items-center">
                                      {testResults.success ? (
                                        <Check className="h-4 w-4 mr-2" />
                                      ) : (
                                        <AlertCircle className="h-4 w-4 mr-2" />
                                      )}
                                      <span className="font-medium">{testResults.message}</span>
                                    </div>
                                    {testResults.transactionHash && (
                                      <div className="mt-2 text-xs">
                                        <span className="font-semibold">Transaction Hash:</span> {testResults.transactionHash}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="speech">
              <Card>
                <CardHeader>
                  <CardTitle>Настройки распознавания речи</CardTitle>
                  <CardDescription>
                    Настройка интеграции с сервисами распознавания речи
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integrations.filter(i => i.type === "speech").length === 0 ? (
                    <div className="text-center py-4">
                      <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p>Интеграция с сервисом распознавания речи не настроена</p>
                      <Button onClick={handleAddIntegration} variant="outline" className="mt-2">
                        <Plus className="mr-2 h-4 w-4" /> Добавить интеграцию
                      </Button>
                    </div>
                  ) : (
                    integrations.filter(i => i.type === "speech").map(integration => (
                      <div key={integration.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center">
                            <Mic className="h-5 w-5 text-blue-500 mr-2" />
                            <h3 className="text-lg font-medium">{integration.name}</h3>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={integration.isActive ? "text-green-500" : "text-gray-500"}>
                              {integration.isActive ? "Активна" : "Отключена"}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditIntegration(integration)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">URL API</Label>
                            <p className="text-sm font-medium">{integration.apiUrl}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">API Key</Label>
                            <p className="text-sm font-medium">••••••••••••••••</p>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <Label className="text-xs text-muted-foreground">Конфигурация</Label>
                          <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono whitespace-pre overflow-auto max-h-32">
                            {JSON.stringify(integration.config, null, 2)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="documentolog">
              <Card>
                <CardHeader>
                  <CardTitle>Настройки интеграции с Документолог</CardTitle>
                  <CardDescription>
                    Настройка параметров для работы с системой Документолог
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integrations.filter(i => i.type === "documentolog").length === 0 ? (
                    <div className="text-center py-4">
                      <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p>Интеграция с Документолог не настроена</p>
                      <Button onClick={handleAddIntegration} variant="outline" className="mt-2">
                        <Plus className="mr-2 h-4 w-4" /> Добавить интеграцию
                      </Button>
                    </div>
                  ) : (
                    integrations.filter(i => i.type === "documentolog").map(integration => (
                      <div key={integration.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-blue-500 mr-2" />
                            <h3 className="text-lg font-medium">{integration.name}</h3>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={integration.isActive ? "text-green-500" : "text-gray-500"}>
                              {integration.isActive ? "Активна" : "Отключена"}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditIntegration(integration)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">URL API</Label>
                            <p className="text-sm font-medium">{integration.apiUrl}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">API Key</Label>
                            <p className="text-sm font-medium">••••••••••••••••</p>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <Label className="text-xs text-muted-foreground">Конфигурация</Label>
                          <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono whitespace-pre overflow-auto max-h-32">
                            {JSON.stringify(integration.config, null, 2)}
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="font-medium">Авто-синхронизация</span>
                              <span className="text-xs text-muted-foreground">
                                Автоматическая синхронизация каждые 15 минут
                              </span>
                            </div>
                            <Switch checked={true} disabled />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Integration Dialog */}
          <Dialog open={isIntegrationDialogOpen} onOpenChange={setIsIntegrationDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {currentIntegration ? "Редактировать интеграцию" : "Добавить интеграцию"}
                </DialogTitle>
                <DialogDescription>
                  {currentIntegration 
                    ? "Обновите настройки интеграции с внешней системой" 
                    : "Настройте новую интеграцию с внешней системой"}
                </DialogDescription>
              </DialogHeader>
              
              <IntegrationForm
                integration={currentIntegration}
                onSubmit={handleIntegrationSubmit}
                onCancel={() => setIsIntegrationDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        {/* Agents Tab */}
        <TabsContent value="monitoring">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Мониторинг LLM и аналитика</h2>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Мониторинг производительности и использования LLM-моделей</CardTitle>
              <CardDescription>
                Данные о статусе, производительности и затратах на использование AI моделей
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LLMMonitoring />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">AI Агенты</h2>
            <Button onClick={handleAddAgent}>
              <Plus className="mr-2 h-4 w-4" /> Добавить агента
            </Button>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              {isLoadingAgents ? (
                <div className="text-center py-4">Загрузка агентов...</div>
              ) : agents.length === 0 ? (
                <div className="text-center py-4">
                  <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p>Агенты не настроены</p>
                  <Button onClick={handleAddAgent} variant="outline" className="mt-2">
                    <Plus className="mr-2 h-4 w-4" /> Добавить агента
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Описание</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="w-24 text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">{agent.name}</TableCell>
                        <TableCell>{getAgentType(agent.type)}</TableCell>
                        <TableCell className="max-w-xs truncate">{agent.description}</TableCell>
                        <TableCell>
                          {agent.isActive ? (
                            <div className="flex items-center">
                              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                              Активен
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <span className="h-2 w-2 rounded-full bg-gray-500 mr-2"></span>
                              Отключен
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditAgent(agent)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAgent(agent.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          
          {/* Agent Dialog */}
          <Dialog open={isAgentDialogOpen} onOpenChange={setIsAgentDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {currentAgent ? "Редактировать агента" : "Добавить агента"}
                </DialogTitle>
                <DialogDescription>
                  {currentAgent 
                    ? "Обновите настройки AI агента" 
                    : "Настройте нового AI агента для обработки данных"}
                </DialogDescription>
              </DialogHeader>
              
              <AgentForm
                agent={currentAgent}
                integrations={integrations}
                onSubmit={handleAgentSubmit}
                onCancel={() => setIsAgentDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        {/* API Tab */}
        <TabsContent value="api">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>API для внешних обращений</CardTitle>
              <CardDescription>
                Настройки API для получения обращений от граждан через внешние системы
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch id="api-enabled" />
                    <Label htmlFor="api-enabled">Включить внешний API</Label>
                  </div>
                  <Button variant="outline" size="sm">
                    Сгенерировать новый ключ
                  </Button>
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="text-sm font-medium mb-2">Доступ к API</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="auth-type">Тип авторизации</Label>
                      <Select defaultValue="apikey">
                        <SelectTrigger id="auth-type">
                          <SelectValue placeholder="Выберите тип авторизации" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apikey">API ключ</SelectItem>
                          <SelectItem value="jwt">JWT токен</SelectItem>
                          <SelectItem value="none">Без авторизации</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="api-key">API Ключ</Label>
                      <div className="flex mt-1">
                        <Input id="api-key" value="••••••••••••••••••••••••••••••" readOnly className="flex-1" />
                        <Button variant="outline" size="sm" className="ml-2">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        API ключ используется для авторизации запросов от внешних систем
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="text-sm font-medium mb-2">Обработка обращений</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="auto-process" />
                      <Label htmlFor="auto-process">Автоматически обрабатывать обращения</Label>
                    </div>
                    
                    <div>
                      <Label htmlFor="default-agent">AI Агент по умолчанию</Label>
                      <Select>
                        <SelectTrigger id="default-agent">
                          <SelectValue placeholder="Выберите агента" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Агент по обработке обращений</SelectItem>
                          <SelectItem value="2">Классификатор запросов</SelectItem>
                          <SelectItem value="3">Распределитель задач</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Агент, который будет использоваться для автоматической обработки входящих обращений
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="text-sm font-medium mb-2">Пример использования API</h3>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm mb-2 font-medium">POST /api/external/citizen-requests</p>
                    <pre className="text-xs overflow-auto max-h-60 bg-slate-800 text-slate-200 p-3 rounded">
{`curl -X POST https://agent-smith.gov.kz/api/external/citizen-requests \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
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
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Используйте этот эндпоинт для отправки обращений граждан из внешних систем
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button className="mr-2" variant="outline">Отмена</Button>
              <Button>Сохранить изменения</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;