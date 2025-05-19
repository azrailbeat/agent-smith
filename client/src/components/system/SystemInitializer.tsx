import React, { useEffect } from 'react';
import { useGlobalSystemSettings } from '@/contexts/SystemSettingsContext';
import { systemService } from '@/services/SystemService';

// Компонент для инициализации системных настроек
const SystemInitializer: React.FC = () => {
  const { settings, isLoading } = useGlobalSystemSettings();

  // При загрузке или изменении настроек, применяем их
  useEffect(() => {
    if (!isLoading && settings) {
      console.info('Applying system settings...');
      systemService.applySettings(settings);
    }
  }, [settings, isLoading]);

  // Компонент ничего не рендерит, только инициализирует настройки
  return null;
};

export default SystemInitializer;