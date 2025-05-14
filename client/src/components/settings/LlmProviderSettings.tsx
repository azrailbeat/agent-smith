/**
 * Agent Smith Platform - Компонент для управления настройками LLM провайдеров
 * 
 * Позволяет:
 * - Просматривать список настроенных провайдеров
 * - Добавлять новых провайдеров
 * - Редактировать существующих провайдеров
 * - Тестировать подключения провайдеров
 * - Устанавливать провайдер по умолчанию
 * 
 * @version 1.0.0
 * @since 14.05.2025
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Check, X, Trash, PlusCircle, Settings, Wrench, CloudLightning, Star } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// Типы LLM провайдеров
enum LLMProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  OPENROUTER = 'openrouter',
  VLLM = 'vllm',
  PERPLEXITY = 'perplexity',
  CUSTOM = 'custom'
}

// Интерфейс конфигурации LLM провайдера
interface LLMProviderConfig {
  type: LLMProviderType;
  name: string;
  apiKey?: string;
  apiUrl: string;
  defaultModel: string;
  availableModels: string[];
  enabled: boolean;
  isDefault?: boolean;
  requestTimeout?: number;
  contextWindow?: number;
  temperature?: number;
  maxTokens?: number;
  customHeaders?: Record<string, string>;
}

// Схема валидации для формы конфигурации провайдера
const providerFormSchema = z.object({
  type: z.enum(['openai', 'anthropic', 'openrouter', 'vllm', 'perplexity', 'custom']),
  name: z.string().min(1, 'Название обязательно'),
  apiKey: z.string().optional(),
  apiUrl: z.string().min(1, 'URL API обязателен'),
  defaultModel: z.string().min(1, 'Модель по умолчанию обязательна'),
  availableModels: z.array(z.string()).min(1, 'Должна быть хотя бы одна доступная модель'),
  enabled: z.boolean().default(true),
  requestTimeout: z.number().int().positive().optional(),
  contextWindow: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  customHeaders: z.record(z.string()).optional(),
});

const LlmProviderSettings: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<LLMProviderConfig | null>(null);
  const [testMessage, setTestMessage] = useState("Привет! Расскажи мне о многоагентных системах.");
  const [testResult, setTestResult] = useState<{success: boolean, message: string, model?: string} | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [availableModelsText, setAvailableModelsText] = useState("");
  const [customHeadersText, setCustomHeadersText] = useState("");

  // Запрос на получение списка провайдеров
  const {
    data: providers,
    isLoading: isLoadingProviders,
    error: providersError
  } = useQuery({
    queryKey: ['/api/llm-providers'],
    staleTime: 30000,
  });

  // Форма для добавления/редактирования провайдера
  const form = useForm<z.infer<typeof providerFormSchema>>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: {
      type: LLMProviderType.OPENAI,
      name: '',
      apiKey: '',
      apiUrl: '',
      defaultModel: '',
      availableModels: [],
      enabled: true,
      requestTimeout: 30000,
      contextWindow: 4096,
      temperature: 0.7,
      maxTokens: 1024
    }
  });

  // Мутация для добавления нового провайдера
  const addProviderMutation = useMutation({
    mutationFn: (provider: LLMProviderConfig) => {
      return apiRequest('POST', '/api/llm-providers', provider);
    },
    onSuccess: () => {
      toast({
        title: 'Провайдер добавлен',
        description: 'Новый LLM провайдер успешно добавлен',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/llm-providers'] });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось добавить провайдера: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Мутация для обновления существующего провайдера
  const updateProviderMutation = useMutation({
    mutationFn: (provider: LLMProviderConfig) => {
      return apiRequest('PUT', `/api/llm-providers/${provider.name}`, provider);
    },
    onSuccess: () => {
      toast({
        title: 'Провайдер обновлен',
        description: 'Настройки LLM провайдера успешно обновлены',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/llm-providers'] });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось обновить провайдера: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Мутация для удаления провайдера
  const deleteProviderMutation = useMutation({
    mutationFn: (name: string) => {
      return apiRequest('DELETE', `/api/llm-providers/${name}`);
    },
    onSuccess: () => {
      toast({
        title: 'Провайдер удален',
        description: 'LLM провайдер успешно удален',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/llm-providers'] });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось удалить провайдера: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Мутация для установки провайдера по умолчанию
  const setDefaultProviderMutation = useMutation({
    mutationFn: (name: string) => {
      return apiRequest('PUT', `/api/llm-providers/${name}/default`);
    },
    onSuccess: () => {
      toast({
        title: 'Провайдер по умолчанию',
        description: 'LLM провайдер по умолчанию успешно установлен',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/llm-providers'] });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось установить провайдера по умолчанию: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Обработчик отправки формы добавления нового провайдера
  const handleAddSubmit = (data: z.infer<typeof providerFormSchema>) => {
    // Преобразуем текстовое представление моделей в массив
    const availableModels = availableModelsText
      .split('\n')
      .map(model => model.trim())
      .filter(model => model.length > 0);

    // Преобразуем текстовое представление заголовков в объект
    let customHeaders: Record<string, string> = {};
    if (customHeadersText && customHeadersText.trim().length > 0) {
      try {
        customHeaders = JSON.parse(customHeadersText);
      } catch (e) {
        toast({
          title: 'Ошибка формата',
          description: 'Пользовательские заголовки должны быть в формате JSON',
          variant: 'destructive',
        });
        return;
      }
    }

    const provider: LLMProviderConfig = {
      ...data,
      availableModels,
      customHeaders
    };

    addProviderMutation.mutate(provider);
  };

  // Обработчик отправки формы редактирования провайдера
  const handleEditSubmit = (data: z.infer<typeof providerFormSchema>) => {
    if (!selectedProvider) return;

    // Преобразуем текстовое представление моделей в массив
    const availableModels = availableModelsText
      .split('\n')
      .map(model => model.trim())
      .filter(model => model.length > 0);

    // Преобразуем текстовое представление заголовков в объект
    let customHeaders: Record<string, string> = {};
    if (customHeadersText && customHeadersText.trim().length > 0) {
      try {
        customHeaders = JSON.parse(customHeadersText);
      } catch (e) {
        toast({
          title: 'Ошибка формата',
          description: 'Пользовательские заголовки должны быть в формате JSON',
          variant: 'destructive',
        });
        return;
      }
    }

    const provider: LLMProviderConfig = {
      ...data,
      availableModels,
      customHeaders,
      name: selectedProvider.name, // Имя не меняется при редактировании
    };

    updateProviderMutation.mutate(provider);
  };

  // Обработчик выбора провайдера для редактирования
  const handleSelectProvider = (provider: LLMProviderConfig) => {
    setSelectedProvider(provider);
    form.reset({
      type: provider.type,
      name: provider.name,
      apiKey: provider.apiKey || '',
      apiUrl: provider.apiUrl,
      defaultModel: provider.defaultModel,
      enabled: provider.enabled,
      requestTimeout: provider.requestTimeout || 30000,
      contextWindow: provider.contextWindow || 4096,
      temperature: provider.temperature || 0.7,
      maxTokens: provider.maxTokens || 1024
    });
    setAvailableModelsText(provider.availableModels.join('\n'));
    setCustomHeadersText(provider.customHeaders ? JSON.stringify(provider.customHeaders, null, 2) : '');
    setIsEditDialogOpen(true);
  };

  // Обработчик выбора провайдера для тестирования
  const handleTestProvider = (provider: LLMProviderConfig) => {
    setSelectedProvider(provider);
    setTestResult(null);
    setIsTestDialogOpen(true);
  };

  // Обработчик тестирования подключения к провайдеру
  const handleTestConnection = async () => {
    if (!selectedProvider) return;

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const testData = {
        ...selectedProvider,
        testMessage
      };

      const response = await apiRequest('POST', '/api/llm-providers/test', testData);
      const result = await response.json();
      
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: `Ошибка при тестировании: ${error.message}`
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Обработчик удаления провайдера
  const handleDeleteProvider = (name: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить провайдера "${name}"?`)) {
      deleteProviderMutation.mutate(name);
    }
  };

  // Обработчик установки провайдера по умолчанию
  const handleSetDefaultProvider = (name: string) => {
    setDefaultProviderMutation.mutate(name);
  };

  // Подготовка формы для добавления нового провайдера
  const handleAddProvider = () => {
    form.reset({
      type: LLMProviderType.OPENAI,
      name: '',
      apiKey: '',
      apiUrl: '',
      defaultModel: '',
      availableModels: [],
      enabled: true,
      requestTimeout: 30000,
      contextWindow: 4096,
      temperature: 0.7,
      maxTokens: 1024
    });
    setAvailableModelsText('');
    setCustomHeadersText('');
    setIsAddDialogOpen(true);
  };

  // Обработчик изменения типа провайдера - заполняем значения по умолчанию
  const handleProviderTypeChange = (type: LLMProviderType) => {
    switch (type) {
      case LLMProviderType.OPENAI:
        form.setValue('apiUrl', 'https://api.openai.com/v1');
        form.setValue('defaultModel', 'gpt-4o');
        setAvailableModelsText('gpt-4o\ngpt-4-turbo\ngpt-4\ngpt-3.5-turbo');
        break;
      case LLMProviderType.ANTHROPIC:
        form.setValue('apiUrl', 'https://api.anthropic.com/v1');
        form.setValue('defaultModel', 'claude-3-7-sonnet-20250219');
        setAvailableModelsText('claude-3-7-sonnet-20250219\nclaude-3-5-sonnet-20240620\nclaude-3-opus-20240229\nclaude-3-sonnet-20240229\nclaude-3-haiku-20240307');
        break;
      case LLMProviderType.OPENROUTER:
        form.setValue('apiUrl', 'https://openrouter.ai/api/v1');
        form.setValue('defaultModel', 'openai/gpt-4o');
        setAvailableModelsText('openai/gpt-4o\nopenai/gpt-4-turbo\nanthropic/claude-3-7-sonnet\nanthropic/claude-3-opus\nmistral/mistral-large-latest');
        break;
      case LLMProviderType.VLLM:
        form.setValue('apiUrl', 'http://localhost:8000/v1');
        form.setValue('defaultModel', 'mistralai/Mistral-7B-Instruct-v0.2');
        setAvailableModelsText('mistralai/Mistral-7B-Instruct-v0.2\nmeta-llama/Llama-2-13b-chat-hf');
        break;
      case LLMProviderType.PERPLEXITY:
        form.setValue('apiUrl', 'https://api.perplexity.ai');
        form.setValue('defaultModel', 'llama-3.1-sonar-small-128k-online');
        setAvailableModelsText('llama-3.1-sonar-small-128k-online\nllama-3.1-sonar-large-128k-online\nllama-3.1-sonar-huge-128k-online');
        break;
      case LLMProviderType.CUSTOM:
        form.setValue('apiUrl', '');
        form.setValue('defaultModel', '');
        setAvailableModelsText('');
        break;
    }
  };

  // Отображение индикатора загрузки при загрузке данных
  if (isLoadingProviders) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка провайдеров...</span>
      </div>
    );
  }

  // Отображение ошибки при неудачной загрузке данных
  if (providersError) {
    return (
      <div className="rounded-md bg-destructive/15 p-4 text-destructive">
        <h3 className="text-lg font-semibold">Ошибка загрузки данных</h3>
        <p>Не удалось загрузить список LLM провайдеров.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Настройки LLM провайдеров</h2>
        <Button onClick={handleAddProvider}>
          <PlusCircle className="mr-2 h-4 w-4" /> Добавить провайдера
        </Button>
      </div>
      
      <p className="text-muted-foreground">
        Настройте провайдеров языковых моделей (LLM) для использования в платформе. Вы можете подключить различные API, такие как OpenAI, Claude, OpenRouter, vLLM или Perplexity.
      </p>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {providers && providers.map((provider: LLMProviderConfig) => (
          <Card key={provider.name} className={`${provider.isDefault ? 'border-2 border-primary' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getProviderIcon(provider.type)}
                  <CardTitle>{provider.name}</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  {provider.isDefault && (
                    <Badge className="bg-primary">По умолчанию</Badge>
                  )}
                  <Badge className={provider.enabled ? 'bg-green-600' : 'bg-gray-400'}>
                    {provider.enabled ? 'Активен' : 'Отключен'}
                  </Badge>
                </div>
              </div>
              <CardDescription>
                {getProviderDescription(provider.type)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Тип:</span>
                  <span>{provider.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">API URL:</span>
                  <span className="text-sm truncate max-w-[200px]">{provider.apiUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Модель по умолчанию:</span>
                  <span className="text-sm">{provider.defaultModel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">API ключ:</span>
                  <span>{provider.hasApiKey ? '••••••••' : 'Не задан'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Доступные модели:</span>
                  <span>{provider.availableModels.length}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Действия</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Управление провайдером</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleSelectProvider(provider)}>
                    <Settings className="mr-2 h-4 w-4" /> Редактировать
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTestProvider(provider)}>
                    <Wrench className="mr-2 h-4 w-4" /> Тестировать
                  </DropdownMenuItem>
                  {!provider.isDefault && (
                    <DropdownMenuItem onClick={() => handleSetDefaultProvider(provider.name)}>
                      <Star className="mr-2 h-4 w-4" /> Сделать по умолчанию
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => handleDeleteProvider(provider.name)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash className="mr-2 h-4 w-4" /> Удалить
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Диалог добавления нового провайдера */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добавление нового LLM провайдера</DialogTitle>
            <DialogDescription>
              Заполните данные для подключения к API языковой модели.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Основные настройки</TabsTrigger>
                  <TabsTrigger value="models">Модели</TabsTrigger>
                  <TabsTrigger value="advanced">Дополнительно</TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Тип провайдера</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleProviderTypeChange(value as LLMProviderType);
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите тип провайдера" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={LLMProviderType.OPENAI}>OpenAI</SelectItem>
                            <SelectItem value={LLMProviderType.ANTHROPIC}>Anthropic (Claude)</SelectItem>
                            <SelectItem value={LLMProviderType.OPENROUTER}>OpenRouter</SelectItem>
                            <SelectItem value={LLMProviderType.VLLM}>vLLM (локальные модели)</SelectItem>
                            <SelectItem value={LLMProviderType.PERPLEXITY}>Perplexity</SelectItem>
                            <SelectItem value={LLMProviderType.CUSTOM}>Пользовательский</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Выберите тип API для языковой модели.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Название провайдера</FormLabel>
                        <FormControl>
                          <Input placeholder="Мой OpenAI провайдер" {...field} />
                        </FormControl>
                        <FormDescription>
                          Уникальное имя для идентификации провайдера в системе
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="apiUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL API</FormLabel>
                        <FormControl>
                          <Input placeholder="https://api.openai.com/v1" {...field} />
                        </FormControl>
                        <FormDescription>
                          Базовый URL для API запросов
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API ключ</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="sk-..." {...field} />
                        </FormControl>
                        <FormDescription>
                          Секретный ключ для авторизации запросов к API
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Активен</FormLabel>
                          <FormDescription>
                            Включить или отключить использование этого провайдера
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="models" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="defaultModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Модель по умолчанию</FormLabel>
                        <FormControl>
                          <Input placeholder="gpt-4" {...field} />
                        </FormControl>
                        <FormDescription>
                          Идентификатор модели, используемой по умолчанию
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-2">
                    <Label htmlFor="availableModels">Доступные модели</Label>
                    <Textarea
                      id="availableModels"
                      placeholder="gpt-4-turbo
gpt-4
gpt-3.5-turbo"
                      className="min-h-[150px]"
                      value={availableModelsText}
                      onChange={(e) => setAvailableModelsText(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Введите идентификаторы доступных моделей, по одной на строку
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="advanced" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="requestTimeout"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Таймаут запроса (мс)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="30000" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Максимальное время ожидания ответа от API
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="contextWindow"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Размер контекстного окна</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="4096" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Максимальное количество токенов в запросе + ответе
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Температура по умолчанию</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.7"
                            step="0.1"
                            min="0"
                            max="2"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Значение от 0 до 2, определяющее "креативность" модели
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="maxTokens"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Максимальное кол-во токенов</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="1024" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Максимальное количество токенов в ответе модели
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-2">
                    <Label htmlFor="customHeaders">Пользовательские заголовки (JSON)</Label>
                    <Textarea
                      id="customHeaders"
                      placeholder='{"X-Custom-Header": "value"}'
                      className="min-h-[100px] font-mono text-sm"
                      value={customHeadersText}
                      onChange={(e) => setCustomHeadersText(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Дополнительные HTTP заголовки для запросов к API в формате JSON
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsAddDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" disabled={addProviderMutation.isPending}>
                  {addProviderMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Добавить
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования провайдера */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактирование LLM провайдера</DialogTitle>
            <DialogDescription>
              Измените настройки подключения к API языковой модели.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Основные настройки</TabsTrigger>
                  <TabsTrigger value="models">Модели</TabsTrigger>
                  <TabsTrigger value="advanced">Дополнительно</TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Тип провайдера</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleProviderTypeChange(value as LLMProviderType);
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите тип провайдера" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={LLMProviderType.OPENAI}>OpenAI</SelectItem>
                            <SelectItem value={LLMProviderType.ANTHROPIC}>Anthropic (Claude)</SelectItem>
                            <SelectItem value={LLMProviderType.OPENROUTER}>OpenRouter</SelectItem>
                            <SelectItem value={LLMProviderType.VLLM}>vLLM (локальные модели)</SelectItem>
                            <SelectItem value={LLMProviderType.PERPLEXITY}>Perplexity</SelectItem>
                            <SelectItem value={LLMProviderType.CUSTOM}>Пользовательский</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Выберите тип API для языковой модели.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Название провайдера</FormLabel>
                        <FormControl>
                          <Input disabled placeholder="Мой OpenAI провайдер" {...field} />
                        </FormControl>
                        <FormDescription>
                          Название нельзя изменить после создания
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="apiUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL API</FormLabel>
                        <FormControl>
                          <Input placeholder="https://api.openai.com/v1" {...field} />
                        </FormControl>
                        <FormDescription>
                          Базовый URL для API запросов
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API ключ</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder={selectedProvider?.hasApiKey ? "••••••••" : "sk-..."} 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Оставьте пустым, чтобы сохранить текущий ключ
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Активен</FormLabel>
                          <FormDescription>
                            Включить или отключить использование этого провайдера
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="models" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="defaultModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Модель по умолчанию</FormLabel>
                        <FormControl>
                          <Input placeholder="gpt-4" {...field} />
                        </FormControl>
                        <FormDescription>
                          Идентификатор модели, используемой по умолчанию
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-2">
                    <Label htmlFor="availableModels">Доступные модели</Label>
                    <Textarea
                      id="availableModels"
                      placeholder="gpt-4-turbo
gpt-4
gpt-3.5-turbo"
                      className="min-h-[150px]"
                      value={availableModelsText}
                      onChange={(e) => setAvailableModelsText(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Введите идентификаторы доступных моделей, по одной на строку
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="advanced" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="requestTimeout"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Таймаут запроса (мс)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="30000" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Максимальное время ожидания ответа от API
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="contextWindow"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Размер контекстного окна</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="4096" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Максимальное количество токенов в запросе + ответе
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Температура по умолчанию</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.7"
                            step="0.1"
                            min="0"
                            max="2"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Значение от 0 до 2, определяющее "креативность" модели
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="maxTokens"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Максимальное кол-во токенов</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="1024" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Максимальное количество токенов в ответе модели
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-2">
                    <Label htmlFor="customHeaders">Пользовательские заголовки (JSON)</Label>
                    <Textarea
                      id="customHeaders"
                      placeholder='{"X-Custom-Header": "value"}'
                      className="min-h-[100px] font-mono text-sm"
                      value={customHeadersText}
                      onChange={(e) => setCustomHeadersText(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Дополнительные HTTP заголовки для запросов к API в формате JSON
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsEditDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" disabled={updateProviderMutation.isPending}>
                  {updateProviderMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Сохранить
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Диалог тестирования провайдера */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Тестирование LLM провайдера</DialogTitle>
            <DialogDescription>
              Проверьте подключение к API языковой модели.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedProvider && (
              <div className="flex items-center space-x-2 pb-2">
                {getProviderIcon(selectedProvider.type)}
                <span className="font-semibold">{selectedProvider.name}</span>
                <span className="text-sm text-muted-foreground">({selectedProvider.type})</span>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="testMessage">Тестовое сообщение</Label>
              <Textarea
                id="testMessage"
                placeholder="Привет! Как дела?"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />
            </div>
            
            {testResult && (
              <div className={`p-4 rounded-md ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-start">
                  {testResult.success ? (
                    <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  ) : (
                    <X className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                  )}
                  <div>
                    <h4 className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {testResult.success ? 'Успешное подключение' : 'Ошибка подключения'}
                    </h4>
                    <p className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                      {testResult.message}
                    </p>
                    {testResult.success && testResult.model && (
                      <p className="text-sm text-green-700 mt-1">
                        Используемая модель: <span className="font-mono">{testResult.model}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
              Закрыть
            </Button>
            <Button 
              onClick={handleTestConnection} 
              disabled={isTestingConnection || !testMessage.trim()}
            >
              {isTestingConnection && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Протестировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function getProviderIcon(type: LLMProviderType) {
  switch (type) {
    case LLMProviderType.OPENAI:
      return <CloudLightning className="h-5 w-5 text-green-600" />;
    case LLMProviderType.ANTHROPIC:
      return <CloudLightning className="h-5 w-5 text-purple-600" />;
    case LLMProviderType.OPENROUTER:
      return <CloudLightning className="h-5 w-5 text-blue-600" />;
    case LLMProviderType.VLLM:
      return <CloudLightning className="h-5 w-5 text-orange-600" />;
    case LLMProviderType.PERPLEXITY:
      return <CloudLightning className="h-5 w-5 text-cyan-600" />;
    case LLMProviderType.CUSTOM:
      return <CloudLightning className="h-5 w-5 text-gray-600" />;
    default:
      return <CloudLightning className="h-5 w-5" />;
  }
}

function getProviderDescription(type: LLMProviderType) {
  switch (type) {
    case LLMProviderType.OPENAI:
      return 'Платформа ИИ с моделями GPT';
    case LLMProviderType.ANTHROPIC:
      return 'Модели Claude от Anthropic';
    case LLMProviderType.OPENROUTER:
      return 'Единый API для доступа к различным LLM';
    case LLMProviderType.VLLM:
      return 'Самостоятельно размещенные модели с vLLM';
    case LLMProviderType.PERPLEXITY:
      return 'ИИ с поиском от Perplexity';
    case LLMProviderType.CUSTOM:
      return 'Пользовательский LLM провайдер';
    default:
      return 'Провайдер языковой модели';
  }
}

export default LlmProviderSettings;