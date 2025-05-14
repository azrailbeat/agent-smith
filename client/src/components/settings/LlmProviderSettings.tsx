import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

// Icons
import {
  Check,
  ChevronRight,
  FileText,
  PlusCircle,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  Zap
} from 'lucide-react';

// Типы LLM провайдеров
enum LLMProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  OPENROUTER = 'openrouter',
  VLLM = 'vllm',
  PERPLEXITY = 'perplexity',
  CUSTOM = 'custom'
}

// Интерфейс для конфигурации провайдера
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

// Схема валидации формы
const providerFormSchema = z.object({
  type: z.nativeEnum(LLMProviderType),
  name: z.string().min(1, "Название провайдера обязательно"),
  apiKey: z.string().optional(),
  apiUrl: z.string().url("Некорректный URL"),
  defaultModel: z.string().min(1, "Модель по умолчанию обязательна"),
  enabled: z.boolean(),
  isDefault: z.boolean().optional(),
  requestTimeout: z.number().positive().optional(),
  contextWindow: z.number().positive().optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().positive().optional(),
  availableModels: z.array(z.string()),
  customHeaders: z.record(z.string()).optional()
});

const LlmProviderSettings: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<LLMProviderConfig | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [newModel, setNewModel] = useState("");
  
  // Получение списка провайдеров
  const { data: providers = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/llm-providers'],
    staleTime: 1000 * 60 * 5, // 5 минут
  });
  
  // Получение информации о текущем провайдере по умолчанию
  const { data: defaultProvider } = useQuery({
    queryKey: ['/api/llm-providers/default'],
    staleTime: 1000 * 60 * 5, // 5 минут
  });
  
  // Мутация для добавления провайдера
  const addProviderMutation = useMutation({
    mutationFn: (provider: LLMProviderConfig) => {
      return apiRequest("POST", `/api/llm-providers`, provider);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/llm-providers'] });
      toast({
        title: "Провайдер добавлен",
        description: "Новый провайдер LLM успешно добавлен",
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: `Не удалось добавить провайдер: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Мутация для обновления провайдера
  const updateProviderMutation = useMutation({
    mutationFn: (provider: LLMProviderConfig) => {
      return apiRequest("PUT", `/api/llm-providers/${provider.name}`, provider);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/llm-providers'] });
      toast({
        title: "Провайдер обновлен",
        description: "Настройки провайдера LLM успешно обновлены",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: `Не удалось обновить провайдер: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Мутация для удаления провайдера
  const deleteProviderMutation = useMutation({
    mutationFn: (name: string) => {
      return apiRequest("DELETE", `/api/llm-providers/${name}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/llm-providers'] });
      toast({
        title: "Провайдер удален",
        description: "Провайдер LLM успешно удален",
      });
      setSelectedProvider(null);
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: `Не удалось удалить провайдер: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Мутация для установки провайдера по умолчанию
  const setDefaultProviderMutation = useMutation({
    mutationFn: (name: string) => {
      return apiRequest("PUT", `/api/llm-providers/${name}/default`);
    },
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ['/api/llm-providers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/llm-providers/default'] });
      toast({
        title: "Провайдер по умолчанию",
        description: `Провайдер ${name} установлен как основной`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: `Не удалось установить провайдер по умолчанию: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Мутация для проверки настроек провайдера
  const testProviderMutation = useMutation({
    mutationFn: (provider: LLMProviderConfig) => {
      return apiRequest("POST", `/api/llm-providers/test`, provider);
    },
    onSuccess: (data) => {
      toast({
        title: "Соединение успешно",
        description: `Подключение к провайдеру проверено успешно. Модель: ${data.model}`,
      });
      setIsTestingConnection(false);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка соединения",
        description: `Не удалось подключиться к провайдеру: ${error.message}`,
        variant: "destructive",
      });
      setIsTestingConnection(false);
    },
  });
  
  // Форма для добавления/редактирования провайдера
  const form = useForm<z.infer<typeof providerFormSchema>>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: {
      type: LLMProviderType.OPENAI,
      name: "",
      apiUrl: "",
      defaultModel: "",
      enabled: true,
      availableModels: [],
      requestTimeout: 60000,
      contextWindow: 16000,
      temperature: 0.7,
      maxTokens: 2048
    }
  });
  
  // Обработчик отправки формы
  const onSubmit = (values: z.infer<typeof providerFormSchema>) => {
    if (selectedProvider) {
      // Обновляем существующего провайдера
      updateProviderMutation.mutate(values as LLMProviderConfig);
    } else {
      // Добавляем нового провайдера
      addProviderMutation.mutate(values as LLMProviderConfig);
    }
  };
  
  // Обработчик выбора провайдера
  const handleSelectProvider = (provider: LLMProviderConfig) => {
    setSelectedProvider(provider);
    form.reset({
      ...provider,
      requestTimeout: provider.requestTimeout || 60000,
      contextWindow: provider.contextWindow || 16000,
      temperature: provider.temperature || 0.7,
      maxTokens: provider.maxTokens || 2048
    });
  };
  
  // Обработчик добавления нового провайдера
  const handleAddProvider = () => {
    setSelectedProvider(null);
    form.reset({
      type: LLMProviderType.OPENAI,
      name: "",
      apiUrl: "",
      defaultModel: "",
      enabled: true,
      availableModels: [],
      requestTimeout: 60000,
      contextWindow: 16000,
      temperature: 0.7,
      maxTokens: 2048
    });
    setIsAddDialogOpen(true);
  };
  
  // Обработчик тестирования соединения
  const handleTestConnection = () => {
    const values = form.getValues();
    setIsTestingConnection(true);
    testProviderMutation.mutate(values as LLMProviderConfig);
  };
  
  // Обработчик установки провайдера по умолчанию
  const handleSetDefault = (name: string) => {
    setDefaultProviderMutation.mutate(name);
  };
  
  // Обработчик добавления модели в список
  const handleAddModel = () => {
    if (!newModel) return;
    
    const currentModels = form.getValues("availableModels") || [];
    if (!currentModels.includes(newModel)) {
      form.setValue("availableModels", [...currentModels, newModel]);
      
      // Если это первая модель, устанавливаем ее как модель по умолчанию
      if (currentModels.length === 0) {
        form.setValue("defaultModel", newModel);
      }
      
      setNewModel("");
    }
  };
  
  // Обработчик удаления модели из списка
  const handleRemoveModel = (model: string) => {
    const currentModels = form.getValues("availableModels") || [];
    const updatedModels = currentModels.filter(m => m !== model);
    form.setValue("availableModels", updatedModels);
    
    // Если удаляемая модель была моделью по умолчанию, сбрасываем дефолтную модель
    if (form.getValues("defaultModel") === model && updatedModels.length > 0) {
      form.setValue("defaultModel", updatedModels[0]);
    }
  };
  
  // Обработчик изменения типа провайдера
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'type') {
        const type = value.type as LLMProviderType;
        
        // Устанавливаем URL по умолчанию в зависимости от типа
        switch (type) {
          case LLMProviderType.OPENAI:
            form.setValue("apiUrl", "https://api.openai.com/v1/chat/completions");
            break;
          case LLMProviderType.ANTHROPIC:
            form.setValue("apiUrl", "https://api.anthropic.com/v1/messages");
            break;
          case LLMProviderType.OPENROUTER:
            form.setValue("apiUrl", "https://openrouter.ai/api/v1/chat/completions");
            break;
          case LLMProviderType.VLLM:
            form.setValue("apiUrl", "http://localhost:8000/v1/chat/completions");
            break;
          case LLMProviderType.PERPLEXITY:
            form.setValue("apiUrl", "https://api.perplexity.ai/chat/completions");
            break;
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);
  
  // Отображаем соответствующий интерфейс в зависимости от выбранного провайдера
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Настройка провайдеров LLM</h2>
        <Button onClick={handleAddProvider}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Добавить провайдера
        </Button>
      </div>
      
      <Tabs defaultValue="providers" className="w-full">
        <TabsList>
          <TabsTrigger value="providers">Провайдеры</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>
        
        <TabsContent value="providers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isLoading ? (
              <p>Загрузка провайдеров...</p>
            ) : providers.length === 0 ? (
              <div className="col-span-3 text-center p-8 border rounded-lg">
                <p className="text-lg text-gray-600 mb-4">Нет настроенных провайдеров LLM</p>
                <Button onClick={handleAddProvider}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Добавить первого провайдера
                </Button>
              </div>
            ) : (
              providers.map((provider: LLMProviderConfig) => (
                <Card 
                  key={provider.name} 
                  className={`cursor-pointer hover:border-blue-300 transition-colors ${
                    selectedProvider?.name === provider.name ? 'border-blue-500' : ''
                  }`}
                  onClick={() => handleSelectProvider(provider)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg flex items-center">
                        {getProviderIcon(provider.type)}
                        <span className="ml-2">{provider.name}</span>
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        {provider.isDefault && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            По умолчанию
                          </Badge>
                        )}
                        <Badge variant={provider.enabled ? "default" : "outline"}>
                          {provider.enabled ? "Включен" : "Отключен"}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>
                      {getProviderDescription(provider.type)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">URL API:</span>
                        <span className="text-gray-700 truncate max-w-[180px]">{provider.apiUrl}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Модель:</span>
                        <span className="text-gray-700">{provider.defaultModel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Кол-во моделей:</span>
                        <span className="text-gray-700">{provider.availableModels.length}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-blue-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectProvider(provider);
                      }}
                    >
                      Настроить <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="settings">
          {selectedProvider ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-medium flex items-center">
                  {getProviderIcon(selectedProvider.type)}
                  <span className="ml-2">Настройка провайдера: {selectedProvider.name}</span>
                </h3>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить
                  </Button>
                  
                  {!selectedProvider.isDefault && selectedProvider.enabled && (
                    <Button 
                      variant="outline"
                      onClick={() => handleSetDefault(selectedProvider.name)}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Сделать основным
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                  >
                    {isTestingConnection ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Проверка...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Проверить соединение
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Основные настройки</CardTitle>
                        <CardDescription>
                          Настройте основные параметры подключения к провайдеру LLM
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Тип провайдера</FormLabel>
                              <FormControl>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                  disabled={!!selectedProvider} // Нельзя менять тип существующего провайдера
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите тип провайдера" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={LLMProviderType.OPENAI}>OpenAI</SelectItem>
                                    <SelectItem value={LLMProviderType.ANTHROPIC}>Anthropic</SelectItem>
                                    <SelectItem value={LLMProviderType.OPENROUTER}>OpenRouter</SelectItem>
                                    <SelectItem value={LLMProviderType.VLLM}>vLLM (локальная модель)</SelectItem>
                                    <SelectItem value={LLMProviderType.PERPLEXITY}>Perplexity</SelectItem>
                                    <SelectItem value={LLMProviderType.CUSTOM}>Пользовательский API</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormDescription>
                                Тип провайдера определяет формат API и доступные модели
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
                              <FormLabel>Название</FormLabel>
                              <FormControl>
                                <Input placeholder="Например: OpenAI Main" {...field} 
                                  disabled={!!selectedProvider} // Нельзя менять имя существующего провайдера
                                />
                              </FormControl>
                              <FormDescription>
                                Уникальное название для идентификации провайдера
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
                                <Input placeholder="https://api.example.com/v1/chat/completions" {...field} />
                              </FormControl>
                              <FormDescription>
                                URL эндпоинта API для отправки запросов
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
                                  placeholder="sk-..." 
                                  {...field} 
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormDescription>
                                Ключ API для аутентификации
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
                                  Включить или отключить использование провайдера
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
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Настройки моделей</CardTitle>
                        <CardDescription>
                          Управление доступными моделями и их параметрами
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="defaultModel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Модель по умолчанию</FormLabel>
                                <FormControl>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Выберите модель по умолчанию" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {form.getValues('availableModels')?.map((model) => (
                                        <SelectItem key={model} value={model}>
                                          {model}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormDescription>
                                  Модель, которая будет использоваться, если не указана конкретная модель
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div>
                            <Label>Доступные модели</Label>
                            <div className="flex items-center mt-2 space-x-2">
                              <Input 
                                placeholder="Название модели..."
                                value={newModel}
                                onChange={(e) => setNewModel(e.target.value)}
                                className="flex-1"
                              />
                              <Button 
                                type="button" 
                                onClick={handleAddModel}
                                variant="outline"
                              >
                                Добавить
                              </Button>
                            </div>
                            
                            <ScrollArea className="h-[200px] mt-2 border rounded-md">
                              <div className="p-4 space-y-2">
                                {form.getValues('availableModels')?.length === 0 ? (
                                  <p className="text-sm text-gray-500 text-center">
                                    Нет доступных моделей. Добавьте хотя бы одну.
                                  </p>
                                ) : (
                                  form.getValues('availableModels')?.map((model) => (
                                    <div key={model} className="flex items-center justify-between py-1">
                                      <div className="flex items-center">
                                        {model === form.getValues('defaultModel') && (
                                          <Badge variant="outline" className="mr-2 bg-blue-50 text-blue-600 border-blue-200">
                                            По умолчанию
                                          </Badge>
                                        )}
                                        <span className="text-sm">{model}</span>
                                      </div>
                                      <div className="flex space-x-2">
                                        <Button 
                                          type="button" 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-8 w-8 p-0 text-blue-600"
                                          onClick={() => form.setValue('defaultModel', model)}
                                          disabled={model === form.getValues('defaultModel')}
                                        >
                                          <Check className="h-4 w-4" />
                                          <span className="sr-only">Сделать моделью по умолчанию</span>
                                        </Button>
                                        <Button 
                                          type="button" 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-8 w-8 p-0 text-red-600"
                                          onClick={() => handleRemoveModel(model)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span className="sr-only">Удалить модель</span>
                                        </Button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </ScrollArea>
                          </div>
                          
                          <Separator />
                          
                          <FormField
                            control={form.control}
                            name="temperature"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Температура по умолчанию</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    max="1" 
                                    step="0.1" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Определяет случайность ответов (от 0 до 1)
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
                                    min="1" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Максимальное количество токенов, которые может вернуть API
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Расширенные настройки</CardTitle>
                      <CardDescription>
                        Дополнительные параметры для тонкой настройки работы провайдера
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="requestTimeout"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Таймаут запроса (мс)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1000" 
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
                                  min="1000" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormDescription>
                                Максимальный размер контекста в токенах
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* Пользовательские заголовки */}
                      {form.getValues('type') === LLMProviderType.CUSTOM && (
                        <div>
                          <Label>Пользовательские заголовки</Label>
                          <p className="text-sm text-gray-500 mb-2">
                            Дополнительные HTTP заголовки для запросов к API
                          </p>
                          
                          {/* TODO: Добавить управление пользовательскими заголовками */}
                          <div className="border p-4 rounded-md text-center text-gray-500 text-sm">
                            Добавление пользовательских заголовков пока не поддерживается через UI.
                            Используйте API для настройки.
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2">
                      <Button variant="outline" type="button" onClick={() => handleSelectProvider(selectedProvider)}>
                        Отменить изменения
                      </Button>
                      <Button type="submit" disabled={updateProviderMutation.isPending}>
                        {updateProviderMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Сохранение...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Сохранить
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
              
              {/* Диалог подтверждения удаления */}
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить провайдера LLM?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Вы действительно хотите удалить провайдера "{selectedProvider.name}"?
                      Это действие нельзя отменить.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => deleteProviderMutation.mutate(selectedProvider.name)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {deleteProviderMutation.isPending ? "Удаление..." : "Удалить"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="text-center p-8 border rounded-lg">
              <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-lg text-gray-600 mb-4">Выберите провайдера LLM для настройки</p>
              <p className="text-sm text-gray-500 mb-4">
                Или добавьте нового провайдера, чтобы настроить его
              </p>
              <Button onClick={handleAddProvider}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Добавить провайдера
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Диалог добавления нового провайдера */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Добавление нового провайдера LLM</DialogTitle>
            <DialogDescription>
              Настройте параметры для подключения к новому провайдеру языковых моделей.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип провайдера</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип провайдера" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={LLMProviderType.OPENAI}>OpenAI</SelectItem>
                            <SelectItem value={LLMProviderType.ANTHROPIC}>Anthropic</SelectItem>
                            <SelectItem value={LLMProviderType.OPENROUTER}>OpenRouter</SelectItem>
                            <SelectItem value={LLMProviderType.VLLM}>vLLM (локальная модель)</SelectItem>
                            <SelectItem value={LLMProviderType.PERPLEXITY}>Perplexity</SelectItem>
                            <SelectItem value={LLMProviderType.CUSTOM}>Пользовательский API</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название</FormLabel>
                      <FormControl>
                        <Input placeholder="Например: OpenAI Main" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="apiUrl"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>URL API</FormLabel>
                      <FormControl>
                        <Input placeholder="https://api.example.com/v1/chat/completions" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>API ключ</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="sk-..." 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div>
                <Label>Доступные модели</Label>
                <div className="flex items-center mt-2 space-x-2">
                  <Input 
                    placeholder="Название модели..."
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddModel}
                    variant="outline"
                  >
                    Добавить
                  </Button>
                </div>
                
                <div className="h-[100px] mt-2 border rounded-md overflow-auto p-2">
                  {form.getValues('availableModels')?.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center p-4">
                      Нет доступных моделей. Добавьте хотя бы одну.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {form.getValues('availableModels')?.map((model) => (
                        <div key={model} className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded">
                          <span className="text-sm">{model}</span>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            className="h-6 w-6 p-0 text-red-600"
                            onClick={() => handleRemoveModel(model)}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="sr-only">Удалить модель</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Активировать провайдера
                      </FormLabel>
                      <FormDescription>
                        Провайдер будет доступен для использования в системе
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" disabled={addProviderMutation.isPending}>
                  {addProviderMutation.isPending ? "Добавление..." : "Добавить провайдера"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Функция для получения иконки в зависимости от типа провайдера
function getProviderIcon(type: LLMProviderType) {
  switch (type) {
    case LLMProviderType.OPENAI:
      return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.5093-2.6067-1.4998z" fill="currentColor" />
      </svg>;
    case LLMProviderType.ANTHROPIC:
      return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.6935 2H7.30647C4.36647 2 2 4.36647 2 7.30647V16.6935C2 19.6335 4.36647 22 7.30647 22H16.6935C19.6335 22 22 19.6335 22 16.6935V7.30647C22 4.36647 19.6335 2 16.6935 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 9L12 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 9L12 13L16 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>;
    case LLMProviderType.OPENROUTER:
      return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 16.5V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 14L7 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 14L17 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 12H19C19.5523 12 20 12.4477 20 13V14.5C20 16.433 18.433 18 16.5 18H14C13.4477 18 13 17.5523 13 17V13C13 12.4477 13.4477 12 14 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 12H5C4.44772 12 4 12.4477 4 13V14.5C4 16.433 5.567 18 7.5 18H10C10.5523 18 11 17.5523 11 17V13C11 12.4477 10.5523 12 10 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14.5 12V7.5C14.5 6.67157 13.8284 6 13 6H11C10.1716 6 9.5 6.67157 9.5 7.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>;
    case LLMProviderType.VLLM:
      return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 6.5C14 4.567 15.567 3 17.5 3C19.433 3 21 4.567 21 6.5C21 8.433 19.433 10 17.5 10C15.567 10 14 8.433 14 6.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 17.5C3 15.567 4.567 14 6.5 14C8.433 14 10 15.567 10 17.5C10 19.433 8.433 21 6.5 21C4.567 21 3 19.433 3 17.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 17.5C14 15.567 15.567 14 17.5 14C19.433 14 21 15.567 21 17.5C21 19.433 19.433 21 17.5 21C15.567 21 14 19.433 14 17.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>;
    case LLMProviderType.PERPLEXITY:
      return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.9 6C18.9 8.2091 16.1091 10 12.6 10C9.09086 10 6.3 8.2091 6.3 6C6.3 3.79086 9.09086 2 12.6 2C16.1091 2 18.9 3.79086 18.9 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.9 12C18.9 14.2091 16.1091 16 12.6 16C9.09086 16 6.3 14.2091 6.3 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.9 18C18.9 20.2091 16.1091 22 12.6 22C9.09086 22 6.3 20.2091 6.3 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>;
    case LLMProviderType.CUSTOM:
      return <Settings className="h-5 w-5" />;
  }
}

// Функция для получения описания в зависимости от типа провайдера
function getProviderDescription(type: LLMProviderType) {
  switch (type) {
    case LLMProviderType.OPENAI:
      return "OpenAI API - доступ к моделям GPT";
    case LLMProviderType.ANTHROPIC:
      return "Anthropic API - доступ к моделям Claude";
    case LLMProviderType.OPENROUTER:
      return "OpenRouter - единый доступ к множеству моделей";
    case LLMProviderType.VLLM:
      return "vLLM - локальный инференс для LLM";
    case LLMProviderType.PERPLEXITY:
      return "Perplexity API - доступ к моделям с возможностью поиска";
    case LLMProviderType.CUSTOM:
      return "Пользовательский API с OpenAI-совместимым форматом";
  }
}

export default LlmProviderSettings;