import { SystemSettings } from '@/hooks/use-system-settings';

// Класс для работы с системными настройками
class SystemService {
  // Применить системные настройки к глобальным параметрам приложения
  applySettings(settings: SystemSettings): void {
    // Применение языковых настроек
    this.applyLanguageSettings(settings);
    
    // Применение настроек аналитики
    this.applyAnalyticsSettings(settings);
    
    // Применение настроек темы
    this.applyThemeSettings(settings);
    
    // Применение настроек безопасности
    this.applySecuritySettings(settings);
    
    // Сохранение настроек в localStorage для сохранения состояния
    localStorage.setItem('system-settings-timestamp', Date.now().toString());
  }
  
  // Применить языковые настройки
  private applyLanguageSettings(settings: SystemSettings): void {
    const defaultLanguage = settings.general.defaultLanguage || 'ru';
    document.documentElement.lang = defaultLanguage;
    
    // Можно добавить код для инициализации библиотеки интернационализации
    // например i18next, если она используется в приложении
  }
  
  // Применить настройки аналитики
  private applyAnalyticsSettings(settings: SystemSettings): void {
    const { analytics } = settings.general;
    
    if (analytics && analytics.collectUsageMetrics) {
      // Можно добавить инициализацию аналитики, если она используется
      // Например, Google Analytics или иная система
      console.info('Analytics enabled with reporting interval:', analytics.reportInterval);
    } else {
      // Отключение аналитики
      console.info('Analytics disabled');
    }
  }
  
  // Применить настройки темы
  private applyThemeSettings(settings: SystemSettings): void {
    // Например, установка классов для темы или других стилистических настроек
    const systemName = settings.general.systemName || 'Agent Smith';
    document.title = systemName;
  }
  
  // Применить настройки безопасности
  private applySecuritySettings(settings: SystemSettings): void {
    // Устанавливаем время автоматического выхода из системы
    const sessionTimeout = settings.security.sessionTimeout || 30; // минуты
    
    // Устанавливаем таймер для проверки активности сессии
    // Это можно реализовать через отдельную функцию отслеживания активности
    console.info('Session timeout set to', sessionTimeout, 'minutes');
  }
  
  // Получить настройки OpenAI
  getOpenAIConfig(settings: SystemSettings): { apiKey: string; defaultModel: string; baseUrl?: string } {
    return {
      apiKey: settings.integrations.openai.apiKey,
      defaultModel: settings.integrations.openai.defaultModel,
      baseUrl: settings.integrations.openai.baseUrl
    };
  }
  
  // Получить настройки блокчейна
  getBlockchainConfig(settings: SystemSettings): any {
    const blockchain = settings.security.blockchain;
    if (!blockchain) {
      return { enabled: false };
    }
    
    return {
      enabled: blockchain.enabled,
      nodeUrl: blockchain.nodeUrl,
      contractAddress: blockchain.auditContractAddress,
      recordSettings: {
        recordCitizenRequests: blockchain.recordCitizenRequests,
        recordDocuments: blockchain.recordDocuments,
        recordMeetings: blockchain.recordMeetings
      }
    };
  }
  
  // Получить настройки векторного хранилища
  getVectorStoreConfig(settings: SystemSettings): string {
    return settings.general.vectorStore || 'qdrant';
  }
  
  // Получить настройки интеграции с внешними системами
  getIntegrationStatus(settings: SystemSettings): Record<string, boolean> {
    return {
      openai: settings.integrations.openai.enabled,
      anthropic: settings.integrations.anthropic.enabled,
      yandexSpeech: settings.integrations.yandexSpeech.enabled,
      eOtinish: settings.integrations.eOtinish?.enabled || false,
      hyperledger: settings.integrations.hyperledger?.enabled || false,
      moralis: settings.integrations.moralis?.enabled || false
    };
  }
}

// Создание единственного экземпляра сервиса (singleton)
export const systemService = new SystemService();