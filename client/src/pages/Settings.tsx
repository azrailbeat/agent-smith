import React, { useState } from "react";
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
import { AlertCircle, Check, Trash2, Pencil, Plus, Unlock, Lock, Database, Cloud, Server, Disc, Layers, MessageSquare, FileText, Mic } from "lucide-react";
import { Integration, Agent } from "@shared/schema";

// Integration form for add/edit
interface IntegrationFormProps {
  integration?: Integration;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const IntegrationForm = ({ integration, onSubmit, onCancel }: IntegrationFormProps) => {
  const [formData, setFormData] = useState({
    name: integration?.name || "",
    type: integration?.type || "",
    apiUrl: integration?.apiUrl || "",
    apiKey: integration?.apiKey || "",
    isActive: integration?.isActive || true,
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
        <Label htmlFor="apiKey">API ключ</Label>
        <Input 
          id="apiKey" 
          name="apiKey" 
          type="password"
          value={formData.apiKey} 
          onChange={handleChange} 
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
  const [formData, setFormData] = useState({
    name: agent?.name || "",
    type: agent?.type || "",
    description: agent?.description || "",
    modelId: agent?.modelId || "",
    systemPrompt: agent?.systemPrompt || "",
    isActive: agent?.isActive || true,
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
                          
                          <div className="mt-4 pt-4 border-t">
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
      </Tabs>
    </div>
  );
};

export default Settings;