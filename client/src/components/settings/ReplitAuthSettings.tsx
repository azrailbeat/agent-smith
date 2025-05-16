import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ReplitAuthSettingsProps {
  settings: {
    enabled: boolean;
    primaryAuthMethod: boolean;
    autoCreateUsers: boolean;
    defaultRoles: string[];
  };
  onSettingsChange: (newSettings: any) => void;
}

export default function ReplitAuthSettings({ 
  settings, 
  onSettingsChange 
}: ReplitAuthSettingsProps) {
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSwitchChange = (field: string) => (checked: boolean) => {
    const updatedSettings = { ...localSettings, [field]: checked };
    setLocalSettings(updatedSettings);
    onSettingsChange(updatedSettings);

    toast({
      title: "Настройки Replit Auth обновлены",
      description: `${field === 'enabled' 
        ? `Аутентификация Replit ${checked ? 'включена' : 'отключена'}`
        : field === 'primaryAuthMethod'
        ? `Replit Auth ${checked ? 'установлена' : 'не установлена'} как основной метод входа в систему`
        : `Автоматическое создание пользователей ${checked ? 'включено' : 'отключено'}`
      }`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Replit Auth</CardTitle>
        <CardDescription>
          Настройки аутентификации через Replit. Позволяет пользователям входить
          в систему с использованием аккаунта Replit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="enable-replit-auth" className="font-medium">
              Включить Replit Auth
            </Label>
            <p className="text-sm text-muted-foreground">
              Разрешить пользователям входить через Replit
            </p>
          </div>
          <Switch
            id="enable-replit-auth"
            checked={localSettings.enabled}
            onCheckedChange={handleSwitchChange('enabled')}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="primary-auth-method" className="font-medium">
              Использовать как основной метод аутентификации
            </Label>
            <p className="text-sm text-muted-foreground">
              Установить Replit Auth как предпочтительный метод входа в систему
            </p>
          </div>
          <Switch
            id="primary-auth-method"
            checked={localSettings.primaryAuthMethod}
            disabled={!localSettings.enabled}
            onCheckedChange={handleSwitchChange('primaryAuthMethod')}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="auto-create-users" className="font-medium">
              Автоматически создавать пользователей
            </Label>
            <p className="text-sm text-muted-foreground">
              Создавать новых пользователей при первом входе через Replit
            </p>
          </div>
          <Switch
            id="auto-create-users"
            checked={localSettings.autoCreateUsers}
            disabled={!localSettings.enabled}
            onCheckedChange={handleSwitchChange('autoCreateUsers')}
          />
        </div>

        <div className="pt-4">
          <Button 
            variant="outline" 
            className="w-full"
            disabled={!localSettings.enabled}
            onClick={() => {
              window.open('/api/login', '_blank');
              toast({
                title: "Тестирование аутентификации",
                description: "Открываем страницу входа через Replit в новой вкладке",
              });
            }}
          >
            Тестировать аутентификацию Replit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}