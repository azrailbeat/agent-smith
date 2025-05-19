import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useSystemSettings, type SystemSettings } from '@/hooks/use-system-settings';

// Интерфейс контекста настроек системы
interface SystemSettingsContextType {
  settings: SystemSettings;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<SystemSettings>, options?: any) => void;
}

// Создание контекста
const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

// Провайдер контекста
export function SystemSettingsProvider({ children }: { children: ReactNode }) {
  const { 
    settings, 
    isLoading, 
    updateSettings,
  } = useSystemSettings();

  return (
    <SystemSettingsContext.Provider
      value={{
        settings,
        isLoading,
        updateSettings,
      }}
    >
      {children}
    </SystemSettingsContext.Provider>
  );
}

// Хук для использования контекста
export function useGlobalSystemSettings() {
  const context = useContext(SystemSettingsContext);
  
  if (context === undefined) {
    throw new Error('useGlobalSystemSettings must be used within a SystemSettingsProvider');
  }
  
  return context;
}

// Вспомогательные функции для работы с настройками
export function getOpenAISettings() {
  const { settings } = useGlobalSystemSettings();
  return settings.integrations.openai;
}

export function getBlockchainSettings() {
  const { settings } = useGlobalSystemSettings();
  return settings.security.blockchain || { 
    enabled: false, 
    nodeUrl: '', 
    auditContractAddress: '', 
    recordCitizenRequests: false, 
    recordDocuments: false, 
    recordMeetings: false 
  };
}

export function getEOtinishSettings() {
  const { settings } = useGlobalSystemSettings();
  return settings.integrations.eOtinish || { 
    enabled: false, 
    apiEndpoint: '', 
    authToken: '', 
    syncInterval: '30', 
    autoProcess: false 
  };
}

export function getLanguageSettings() {
  const { settings } = useGlobalSystemSettings();
  return {
    defaultLanguage: settings.general.defaultLanguage,
    supportedLanguages: settings.general.supportedLanguages || ['ru', 'kk', 'en']
  };
}

export function getSecuritySettings() {
  const { settings } = useGlobalSystemSettings();
  return settings.security;
}

export function getVectorStoreSettings() {
  const { settings } = useGlobalSystemSettings();
  return {
    type: settings.general.vectorStore || 'qdrant',
    fileStorage: settings.general.fileStorage || 'local'
  };
}

export function getLoggingSettings() {
  const { settings } = useGlobalSystemSettings();
  return {
    enableActivityLogging: settings.general.enableActivityLogging,
    enableBlockchainIntegration: settings.general.enableBlockchainIntegration,
    auditSettings: settings.security.audit || { retentionPeriod: '1year', enableExport: true }
  };
}