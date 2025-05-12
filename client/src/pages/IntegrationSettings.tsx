import { useState } from 'react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { ApiSettings } from '@/components/settings/ApiSettings';
import { WidgetSettings } from '@/components/settings/WidgetSettings';
import { Code, Globe, Webhook } from 'lucide-react';

export default function IntegrationSettings() {
  const [activeTab, setActiveTab] = useState('api');
  
  return (
    <div className="container mx-auto py-6">
      <h2 className="text-3xl font-bold mb-6">Настройки</h2>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="external" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span>Внешние интеграции</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            <span>API для обращений</span>
          </TabsTrigger>
          <TabsTrigger value="widget" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span>Виджет для сайта</span>
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span>Мониторинг LLM</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="external">
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Внешние интеграции</h3>
            <p className="text-muted-foreground">
              Настройка интеграций с внешними системами и сервисами
            </p>
            
            {/* Здесь будет содержимое для внешних интеграций */}
          </div>
        </TabsContent>
        
        <TabsContent value="api">
          <ApiSettings refreshTab={() => setActiveTab('api')} />
        </TabsContent>
        
        <TabsContent value="widget">
          <WidgetSettings refreshTab={() => setActiveTab('widget')} />
        </TabsContent>
        
        <TabsContent value="monitoring">
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Мониторинг LLM</h3>
            <p className="text-muted-foreground">
              Настройка мониторинга использования языковых моделей
            </p>
            
            {/* Здесь будет содержимое для мониторинга */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}