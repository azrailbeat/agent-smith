import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

/**
 * Страница для встраивания формы обращений через iframe
 * Принимает параметр config в URL для настройки виджета
 */
const EmbedForm: React.FC = () => {
  const [location] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [widgetConfig, setWidgetConfig] = useState<any>(null);
  
  useEffect(() => {
    try {
      // Получаем параметр config из URL
      const urlParams = new URLSearchParams(window.location.search);
      const configParam = urlParams.get('config');
      
      if (!configParam) {
        setError('Отсутствует параметр конфигурации');
        setLoading(false);
        return;
      }
      
      // Декодируем конфигурацию из base64
      const decodedConfig = atob(configParam);
      const config = JSON.parse(decodeURIComponent(decodedConfig));
      
      setWidgetConfig(config);
      
      // Инициализируем виджет после монтирования компонента
      const containerId = 'agent-smith-embed-form';
      
      // Ждем загрузки скрипта виджета
      const interval = setInterval(() => {
        if (window.AgentSmithWidget) {
          clearInterval(interval);
          window.AgentSmithWidget.init(containerId, configParam);
          setLoading(false);
        }
      }, 100);
      
      // Очистка интервала при размонтировании
      return () => clearInterval(interval);
    } catch (err) {
      console.error('Ошибка при инициализации формы:', err);
      setError('Ошибка при инициализации формы');
      setLoading(false);
    }
  }, [location]);
  
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      {loading ? (
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-1/3" />
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      ) : (
        <div id="agent-smith-embed-form" className="w-full max-w-md"></div>
      )}
    </div>
  );
};

export default EmbedForm;

// Добавляем интерфейс для window, чтобы TypeScript не жаловался на AgentSmithWidget
declare global {
  interface Window {
    AgentSmithWidget: any;
  }
}