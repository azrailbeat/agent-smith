import React, { useEffect, useRef } from 'react';
import { useNotifications } from './NotificationProvider';

interface NotificationSoundProps {
  soundUrl?: string;
  volume?: number;
}

const NotificationSound: React.FC<NotificationSoundProps> = ({ 
  soundUrl = '/notification-sound.mp3',  // Путь к звуковому файлу уведомления
  volume = 0.5  // Громкость звука (от 0 до 1)
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { notifications } = useNotifications();
  const previousCountRef = useRef(notifications.length);

  useEffect(() => {
    // Создаем аудио-элемент при первом рендере
    audioRef.current = new Audio(soundUrl);
    audioRef.current.volume = volume;

    // Очистка при размонтировании
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [soundUrl, volume]);

  useEffect(() => {
    // Проверяем, появились ли новые уведомления
    if (notifications.length > previousCountRef.current) {
      // Проигрываем звук только для новых непрочитанных уведомлений
      const newNotifications = notifications.slice(0, notifications.length - previousCountRef.current);
      if (newNotifications.some(n => !n.read) && audioRef.current) {
        // Перематываем на начало и проигрываем звук
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => {
          // Обработка ошибок воспроизведения
          console.warn('Ошибка воспроизведения звука уведомления:', err);
        });
      }
    }
    
    // Обновляем счетчик уведомлений
    previousCountRef.current = notifications.length;
  }, [notifications]);

  // Этот компонент не рендерит никакой UI
  return null;
};

export default NotificationSound;