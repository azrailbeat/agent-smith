import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Типизация статуса интеграций
export interface IntegrationStatus {
  openai?: boolean;
  anthropic?: boolean;
  yandexGpt?: boolean;
  yandexSpeech?: boolean;
  eOtinish?: boolean;
  hyperledger?: boolean;
  supabase?: boolean;
  moralis?: boolean;
  yandexTranslate?: boolean;
}

// Хук для отслеживания статуса интеграций
export function useIntegrationStatus() {
  const { toast } = useToast();
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({});
  const [isChecking, setIsChecking] = useState(false);
  
  // Проверка статуса интеграций
  const checkIntegrationStatus = async () => {
    setIsChecking(true);
    
    try {
      // Запрос к API для проверки статуса интеграций
      const response = await apiRequest('GET', '/api/system/check-integrations');
      const data = await response.json();
      
      setIntegrationStatus(data);
    } catch (error) {
      console.error('Ошибка проверки статуса интеграций:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось проверить статус интеграций',
        variant: 'destructive',
      });
      
      // В случае ошибки, устанавливаем все статусы в false
      setIntegrationStatus({
        openai: false,
        anthropic: false,
        yandexGpt: false,
        yandexSpeech: false,
        eOtinish: false,
        hyperledger: false,
        supabase: false,
        moralis: false,
        yandexTranslate: false
      });
    } finally {
      setIsChecking(false);
    }
  };
  
  return {
    integrationStatus,
    checkIntegrationStatus,
    isChecking
  };
}