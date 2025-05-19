import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Типизация настроек системы
export interface SystemSettings {
  general: {
    systemName: string;
    defaultLanguage: string;
    enableActivityLogging: boolean;
    enableBlockchainIntegration: boolean;
    supportedLanguages?: string[];
    vectorStore?: string;
    fileStorage?: string;
    enableBackups?: boolean;
    analytics?: {
      collectUsageMetrics: boolean;
      reportInterval: string;
    };
    apiBaseUrl?: string;
    apiEnabled?: boolean;
  };
  security: {
    enableLocalAuth: boolean;
    enableLdapAuth: boolean;
    enableTwoFactor: boolean;
    enableReplitAuth?: boolean;
    passwordRequirements: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
    sessionTimeout: number;
    ldapSettings?: {
      serverUrl: string;
      baseDn: string;
      bindDn: string;
      bindCredentials: string;
    };
    twoFactorMethod?: string;
    rbacIntegrateWithOrgStructure?: boolean;
    encryption?: {
      algorithm: string;
      keyRotationInterval: string;
      enableAtRest: boolean;
      enableInTransit: boolean;
    };
    audit?: {
      retentionPeriod: string;
      enableExport: boolean;
    };
    blockchain?: {
      enabled: boolean;
      nodeUrl: string;
      auditContractAddress: string;
      recordCitizenRequests: boolean;
      recordDocuments: boolean;
      recordMeetings: boolean;
    };
  };
  integrations: {
    openai: {
      enabled: boolean;
      apiKey: string;
      defaultModel: string;
      baseUrl?: string;
      testMode?: boolean;
      temperature?: number;
    };
    anthropic: {
      enabled: boolean;
      apiKey: string;
      defaultModel: string;
      temperature?: number;
    };
    yandexGpt?: {
      enabled: boolean;
      apiKey: string;
      defaultModel: string;
    };
    yandexSpeech: {
      enabled: boolean;
      apiKey: string;
      defaultVoice?: string;
      enableSTT?: boolean;
      enableTTS?: boolean;
    };
    eOtinish?: {
      enabled: boolean;
      apiEndpoint: string;
      authToken: string;
      syncInterval?: string;
      autoProcess?: boolean;
    };
    egov?: {
      enabled: boolean;
      apiEndpoint: string;
      certificate?: string;
    };
    hyperledger?: {
      enabled: boolean;
      nodeUrl: string;
      privateKey: string;
      contractAddress?: string;
      network?: string;
      storeMeetings?: boolean;
      storeRequests?: boolean;
      storeVoting?: boolean;
    };
    supabase?: {
      enabled: boolean;
      url: string;
      apiKey: string;
    };
    moralis?: {
      enabled: boolean;
      apiKey: string;
      networkType: string;
    };
    yandexTranslate?: {
      enabled: boolean;
      apiKey: string;
      folderID: string;
    };
  };
}

// Создаем примерные настройки системы для использования в случае ошибки API
const defaultSettings: SystemSettings = {
  general: {
    systemName: "Agent Smith",
    defaultLanguage: "ru",
    enableActivityLogging: true,
    enableBlockchainIntegration: true,
    supportedLanguages: ["ru", "kk", "en"],
    vectorStore: "qdrant",
    fileStorage: "local",
    enableBackups: true,
    analytics: {
      collectUsageMetrics: true,
      reportInterval: "daily"
    },
    apiBaseUrl: "https://api.agentsmith.gov.kz",
    apiEnabled: true
  },
  security: {
    enableLocalAuth: true,
    enableLdapAuth: false,
    enableTwoFactor: false,
    enableReplitAuth: true,
    passwordRequirements: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false
    },
    sessionTimeout: 30,
    ldapSettings: {
      serverUrl: "",
      baseDn: "",
      bindDn: "",
      bindCredentials: ""
    },
    twoFactorMethod: "sms",
    rbacIntegrateWithOrgStructure: true,
    encryption: {
      algorithm: "AES-256",
      keyRotationInterval: "90days",
      enableAtRest: true,
      enableInTransit: true
    },
    audit: {
      retentionPeriod: "1year",
      enableExport: true
    },
    blockchain: {
      enabled: true,
      nodeUrl: "https://besu.agent-smith.gov.kz:8545",
      auditContractAddress: "0x7cf7b7834a45bcc60425c33c8a2d52b86ff1830f",
      recordCitizenRequests: true,
      recordDocuments: true,
      recordMeetings: true
    }
  },
  integrations: {
    openai: {
      enabled: true,
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || "sk-placeholder",
      defaultModel: "gpt-4o",
      baseUrl: "https://api.openai.com/v1",
      testMode: false,
      temperature: 0.7
    },
    anthropic: {
      enabled: false,
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || "",
      defaultModel: "claude-3-opus-20240229",
      temperature: 0.7
    },
    yandexGpt: {
      enabled: false,
      apiKey: "",
      defaultModel: "yandexgpt"
    },
    yandexSpeech: {
      enabled: true,
      apiKey: "yandex-speech-api-key",
      defaultVoice: "alena",
      enableSTT: true,
      enableTTS: true
    },
    eOtinish: {
      enabled: true,
      apiEndpoint: "https://api.eotinish.kz",
      authToken: "token",
      syncInterval: "30",
      autoProcess: true
    },
    egov: {
      enabled: true,
      apiEndpoint: "https://api.egov.kz/services",
      certificate: "certificate-content-here"
    },
    hyperledger: {
      enabled: true,
      nodeUrl: "https://besu.agent-smith.gov.kz:8545",
      privateKey: "private-key-here",
      contractAddress: "0x7cf7b7834a45bcc60425c33c8a2d52b86ff1830f",
      network: "testnet",
      storeMeetings: true,
      storeRequests: true,
      storeVoting: true
    },
    moralis: {
      enabled: true,
      apiKey: import.meta.env.VITE_MORALIS_API_KEY || "api-key-placeholder",
      networkType: "testnet"
    },
    yandexTranslate: {
      enabled: true,
      apiKey: "yandex-translate-api-key",
      folderID: "yandex-folder-id"
    }
  }
};

// Хук для работы с системными настройками
export function useSystemSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Запрос настроек из API
  const { 
    data: settings, 
    isLoading, 
    isError,
    error
  } = useQuery<SystemSettings>({
    queryKey: ['/api/system/settings'],
    retry: 1
  });
  
  // Мутация для обновления настроек
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<SystemSettings>) => {
      return apiRequest('PATCH', '/api/system/settings', newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system/settings'] });
      toast({
        title: 'Настройки обновлены',
        description: 'Изменения были успешно сохранены',
      });
    },
    onError: (error) => {
      console.error('Ошибка обновления настроек:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить настройки',
        variant: 'destructive',
      });
    },
  });
  
  // Если API вернул ошибку или данные не загрузились, используем демо-данные
  const finalSettings = settings || defaultSettings;
  
  // Проверка соединения с OpenAI
  const checkOpenAIConnection = async () => {
    try {
      const response = await apiRequest('GET', '/api/system/check-integrations');
      return response;
    } catch (error) {
      console.error('Ошибка проверки соединения с интеграциями:', error);
      return {
        openai: false,
        anthropic: false,
        yandexGpt: false,
        yandexSpeech: false,
        eOtinish: false,
        hyperledger: false,
        supabase: false
      };
    }
  };
  
  return {
    settings: finalSettings,
    isLoading,
    isError,
    error,
    updateSettings: updateSettingsMutation.mutate,
    isEditMode,
    setIsEditMode,
    checkOpenAIConnection
  };
}