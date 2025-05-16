import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { Info, Check, RefreshCw } from 'lucide-react';

interface ReplitAuthSettingsProps {
  settings: any;
}

export default function ReplitAuthSettings({ settings }: ReplitAuthSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Мутация для обновления настроек Replit Auth
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: any) => {
      return apiRequest('PATCH', '/api/system/settings', newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system/settings'] });
      toast({
        title: 'Настройки аутентификации обновлены',
        description: 'Изменения были успешно сохранены',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить настройки аутентификации',
        variant: 'destructive',
      });
    },
  });

  // Проверка статуса интеграции с Replit
  const checkReplitAuthMutation = useMutation({
    mutationFn: () => {
      return apiRequest('GET', '/api/system/check-replit-auth');
    },
    onSuccess: (data: any) => {
      toast({
        title: data.success 
          ? 'Успешно подключено к Replit Auth' 
          : 'Ошибка подключения к Replit Auth',
        description: data.message,
        variant: data.success ? 'default' : 'destructive',
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось проверить подключение к Replit Auth',
        variant: 'destructive',
      });
    },
  });

  // Функция обновления настроек авторизации
  const updateReplitAuthSettings = (enabled: boolean) => {
    const security = settings.security || {};
    
    updateSettingsMutation.mutate({
      security: {
        ...security,
        enableReplitAuth: enabled,
      }
    });
  };

  // Получение значения из вложенной структуры с проверкой существования
  const isReplitAuthEnabled = settings?.security?.enableReplitAuth || false;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Аутентификация через Replit</CardTitle>
          <Badge variant={isReplitAuthEnabled ? 'default' : 'outline'}>
            {isReplitAuthEnabled ? 'Активно' : 'Не активно'}
          </Badge>
        </div>
        <CardDescription>
          Интеграция аутентификации через Replit для единого входа пользователей
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="font-medium">Авторизация через Replit</div>
            <div className="text-sm text-muted-foreground">
              Позволяет пользователям входить в систему с помощью аккаунта Replit
            </div>
          </div>
          <Switch
            checked={isReplitAuthEnabled}
            onCheckedChange={updateReplitAuthSettings}
          />
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => checkReplitAuthMutation.mutate()}
            disabled={checkReplitAuthMutation.isPending}
          >
            {checkReplitAuthMutation.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Проверить соединение
          </Button>
        </div>
        
        <div className="bg-muted p-3 rounded-md flex items-start mt-3">
          <Info className="h-5 w-5 text-muted-foreground mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p>Для работы аутентификации Replit требуется наличие следующих переменных окружения:</p>
            <ul className="list-disc pl-4 mt-1">
              <li>REPLIT_DOMAINS - доменное имя вашего проекта Replit</li>
              <li>REPL_ID - идентификатор вашего проекта Replit</li>
              <li>SESSION_SECRET - секретный ключ для подписи сессий</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}