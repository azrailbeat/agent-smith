import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Notification, getNotificationIcon, getNotificationColor } from './NotificationCenter';
import { cn } from '@/lib/utils';

interface ContextualNotificationProps {
  notification: Notification;
  onClose: () => void;
  duration?: number; // Продолжительность отображения в миллисекундах
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ContextualNotification({ 
  notification, 
  onClose, 
  duration = 5000,
  position = 'top-right'
}: ContextualNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  // Автоматическое скрытие уведомления через указанное время
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration]);
  
  // Обработка закрытия и анимации выхода
  const handleClose = () => {
    setIsVisible(false);
    // Небольшая задержка для завершения анимации
    setTimeout(onClose, 300);
  };
  
  // Класс позиционирования
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };
  
  const iconClass = getNotificationColor(notification.priority);
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`fixed z-50 max-w-md ${positionClasses[position]}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border shadow-lg overflow-hidden bg-white">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5",
                  iconClass
                )}>
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0 pr-6">
                  <h4 className="text-sm font-semibold text-slate-900">
                    {notification.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    {notification.message}
                  </p>
                  
                  {notification.actionUrl && (
                    <div className="mt-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={() => {
                          window.location.href = notification.actionUrl!;
                          handleClose();
                        }}
                      >
                        Перейти
                      </Button>
                    </div>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 absolute top-3 right-3"
                  onClick={handleClose}
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="sr-only">Закрыть</span>
                </Button>
              </div>
            </div>
            
            {/* Индикатор прогресса для автозакрытия */}
            <div className="h-1 bg-slate-100 w-full">
              <motion.div
                className="h-full bg-blue-500"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
              />
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ContextualNotificationsContainerProps {
  notifications: Notification[];
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxNotifications?: number;
  duration?: number;
}

export function ContextualNotificationsContainer({
  notifications,
  onClose,
  position = 'top-right',
  maxNotifications = 3,
  duration = 5000
}: ContextualNotificationsContainerProps) {
  // Отображаем только последние уведомления, ограниченные maxNotifications
  const visibleNotifications = notifications
    .filter(n => !n.read)
    .slice(0, maxNotifications);
  
  return (
    <>
      {visibleNotifications.map(notification => (
        <ContextualNotification
          key={notification.id}
          notification={notification}
          onClose={() => onClose(notification.id)}
          position={position}
          duration={duration}
        />
      ))}
    </>
  );
}

export default ContextualNotificationsContainer;