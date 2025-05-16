import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

// Интерфейс для статуса интеграций API
export interface IntegrationStatus {
  openai: boolean;
  anthropic: boolean;
  yandexGpt: boolean;
  yandexSpeech: boolean;
  eOtinish: boolean;
  egov: boolean;
  hyperledger: boolean;
  supabase: boolean;
}

export function useIntegrationStatus() {
  const { toast } = useToast();
  
  // Состояние для отслеживания статуса API интеграций
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    openai: false,
    anthropic: false,
    yandexGpt: false,
    yandexSpeech: false,
    eOtinish: false,
    egov: false,
    hyperledger: false,
    supabase: false
  });
  
  const [isChecking, setIsChecking] = useState(false);
  
  // Функция для проверки статуса интеграций
  const checkIntegrationStatus = async (showToast = true) => {
    if (isChecking) return;
    setIsChecking(true);
    
    try {
      if (showToast) {
        toast({
          title: 'Проверка интеграций',
          description: 'Проверяем подключение к внешним API...'
        });
      }
      
      const response = await fetch('/api/system/check-integrations');
      if (response.ok) {
        const data = await response.json();
        setIntegrationStatus(data);
        
        if (showToast) {
          toast({
            title: 'Статус интеграций обновлен',
            description: 'Проверка подключений завершена'
          });
        }
      } else {
        if (showToast) {
          toast({
            title: 'Ошибка проверки',
            description: 'Не удалось получить статус интеграций',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Ошибка при проверке интеграций:', error);
      if (showToast) {
        toast({
          title: 'Ошибка проверки',
          description: 'Произошла ошибка при выполнении запроса',
          variant: 'destructive'
        });
      }
    } finally {
      setIsChecking(false);
    }
  };
  
  // Проверить статус интеграций при монтировании компонента
  useEffect(() => {
    checkIntegrationStatus(false);
  }, []);
  
  return {
    integrationStatus,
    checkIntegrationStatus,
    isChecking
  };
}