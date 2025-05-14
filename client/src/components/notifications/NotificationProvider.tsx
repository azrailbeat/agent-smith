import React, { createContext, useContext, useState, useEffect } from 'react';
import { Notification, NotificationType, NotificationPriority } from './shared-types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: React.ReactNode;
  maxNotifications?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  maxNotifications = 100 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Загрузка уведомлений из локального хранилища при инициализации
  useEffect(() => {
    const storedNotifications = localStorage.getItem('notifications');
    if (storedNotifications) {
      try {
        const parsedNotifications = JSON.parse(storedNotifications);
        // Преобразуем строковые даты обратно в объекты Date
        const notificationsWithDates = parsedNotifications.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(notificationsWithDates);
      } catch (error) {
        console.error('Ошибка при загрузке уведомлений:', error);
      }
    }
  }, []);
  
  // Сохранение уведомлений в локальное хранилище при изменении
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
  }, [notifications]);
  
  // Вычисляем количество непрочитанных уведомлений
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Добавление нового уведомления
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const id = Math.random().toString(36).substring(2, 11);
    
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      read: false,
    };
    
    setNotifications(prev => {
      // Ограничение максимального количества уведомлений
      const updatedNotifications = [newNotification, ...prev];
      return updatedNotifications.slice(0, maxNotifications);
    });
    
    // Показываем уведомление в браузере, если поддерживается API
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
      });
    }
  };
  
  // Удаление уведомления
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  // Отметка уведомления как прочитанного
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };
  
  // Отметка всех уведомлений как прочитанных
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };
  
  // Очистка всех уведомлений
  const clearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('notifications');
  };
  
  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        unreadCount,
        addNotification, 
        removeNotification, 
        markAsRead, 
        markAllAsRead,
        clearNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Хук для использования контекста уведомлений
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  
  return context;
};

export default NotificationProvider;