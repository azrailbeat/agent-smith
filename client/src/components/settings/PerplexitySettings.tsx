/**
 * Компонент настроек Perplexity API
 */
import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { Loader2, Check, AlertCircle, Brain } from 'lucide-react';
import { PerplexityApiKeyDialog } from '@/components/dialogs/PerplexityApiKeyDialog';

// Схема формы настроек
const formSchema = z.object({
  defaultModel: z.enum([
    'llama-3.1-sonar-small-128k-online',
    'llama-3.1-sonar-large-128k-online',
    'llama-3.1-sonar-huge-128k-online'
  ]).default('llama-3.1-sonar-small-128k-online')
});

type FormData = z.infer<typeof formSchema>;

export function PerplexitySettings() {
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Запрос настроек Perplexity API
  const { 
    data: settingsData, 
    isLoading: isLoadingSettings,
    error: settingsError 
  } = useQuery({
    queryKey: ['/api/perplexity/settings'],
    queryFn: () => apiRequest('/api/perplexity/settings'),
    staleTime: 30000 // 30 секунд
  });
  
  // Запрос статуса API
  const { 
    data: statusData, 
    isLoading: isLoadingStatus
  } = useQuery({
    queryKey: ['/api/perplexity/status'],
    queryFn: () => apiRequest('/api/perplexity/status'),
    staleTime: 30000
  });
  
  // Настройка формы
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      defaultModel: 'llama-3.1-sonar-small-128k-online'
    }
  });
  
  // Мутация для обновления настроек
  const updateSettingsMutation = useMutation({
    mutationFn: (data: FormData) => {
      return apiRequest('/api/perplexity/settings', {
        method: 'POST',
        data: {
          apiKey: settingsData?.apiKey, // Передаем текущий ключ
          ...data
        }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Настройки сохранены',
        description: 'Настройки Perplexity API успешно обновлены',
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/perplexity/settings'] });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка сохранения',
        description: error instanceof Error ? error.message : 'Ошибка сохранения настроек',
        variant: 'destructive',
      });
    }
  });
  
  // Обновляем значения формы при загрузке данных
  useEffect(() => {
    if (settingsData && !isLoadingSettings) {
      form.reset({
        defaultModel: settingsData.defaultModel || 'llama-3.1-sonar-small-128k-online'
      });
    }
  }, [settingsData, isLoadingSettings, form]);
  
  // Обработчик отправки формы
  const onSubmit = (data: FormData) => {
    updateSettingsMutation.mutate(data);
  };
  
  // Состояние API ключа
  const getApiKeyStatus = () => {
    if (isLoadingStatus) return 'loading';
    if (!statusData) return 'unknown';
    return statusData.available ? 'configured' : 'not-configured';
  };
  
  const apiKeyStatus = getApiKeyStatus();
  
  // Рендерим UI статуса API ключа
  const renderApiKeyStatus = () => {
    switch (apiKeyStatus) {
      case 'loading':
        return (
          <div className="flex items-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Проверка API ключа...
          </div>
        );
      case 'configured':
        return (
          <div className="flex items-center text-green-500">
            <Check className="mr-2 h-4 w-4" />
            API ключ настроен
          </div>
        );
      case 'not-configured':
        return (
          <div className="flex items-center text-amber-500">
            <AlertCircle className="mr-2 h-4 w-4" />
            API ключ не настроен
          </div>
        );
      default:
        return (
          <div className="flex items-center text-muted-foreground">
            <AlertCircle className="mr-2 h-4 w-4" />
            Статус неизвестен
          </div>
        );
    }
  };
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center">
              <Brain className="mr-2 h-6 w-6" />
              Perplexity AI
            </CardTitle>
            <CardDescription>
              Настройка интеграции с Perplexity AI API
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-medium">API ключ</h3>
              {renderApiKeyStatus()}
            </div>
            <Button 
              onClick={() => setApiKeyDialogOpen(true)}
              variant={apiKeyStatus === 'configured' ? 'outline' : 'default'}
            >
              {apiKeyStatus === 'configured' ? 'Изменить API ключ' : 'Добавить API ключ'}
            </Button>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="defaultModel"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Модель по умолчанию</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="llama-3.1-sonar-small-128k-online" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            llama-3.1-sonar-small-128k-online (Стандартная)
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="llama-3.1-sonar-large-128k-online" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            llama-3.1-sonar-large-128k-online (Улучшенная)
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="llama-3.1-sonar-huge-128k-online" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            llama-3.1-sonar-huge-128k-online (Максимальная)
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      Выберите модель, которая будет использоваться по умолчанию для всех запросов.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                disabled={updateSettingsMutation.isPending || !statusData?.available || isLoadingSettings}
              >
                {updateSettingsMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Сохранить настройки
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-start">
          <p className="text-sm text-muted-foreground">
            Perplexity AI предоставляет доступ к высококачественным LLM моделям с улучшенными возможностями 
            поиска и обработки информации. Используя Perplexity API, вы можете генерировать ответы на основе 
            своих данных и контекста.
          </p>
          <a 
            href="https://docs.perplexity.ai/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-sm text-primary hover:underline mt-2"
          >
            Документация Perplexity API →
          </a>
        </CardFooter>
      </Card>
      
      <PerplexityApiKeyDialog 
        isOpen={apiKeyDialogOpen} 
        onClose={() => setApiKeyDialogOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/perplexity/settings'] });
          queryClient.invalidateQueries({ queryKey: ['/api/perplexity/status'] });
        }}
      />
    </>
  );
}