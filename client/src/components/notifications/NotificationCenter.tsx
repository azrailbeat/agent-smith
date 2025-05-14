import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Settings, 
  Check, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  MessageSquare,
  Clock,
  FileText,
  UserCheck,
  Database 
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationType {
  TASK = 'task',
  MEETING = 'meeting',
  DOCUMENT = 'document',
  CITIZEN_REQUEST = 'citizen_request',
  SYSTEM = 'system',
  BLOCKCHAIN = 'blockchain',
  MESSAGE = 'message',
  AI_AGENT = 'ai_agent'
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: NotificationPriority;
  type: NotificationType;
  entityId?: string;
  entityType?: string;
  actionUrl?: string;
  sender?: {
    id: number;
    name: string;
    avatarUrl?: string;
  };
  metadata?: Record<string, any>;
}

export function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case NotificationType.TASK:
      return <FileText className="h-4 w-4" />;
    case NotificationType.MEETING:
      return <Clock className="h-4 w-4" />;
    case NotificationType.DOCUMENT:
      return <FileText className="h-4 w-4" />;
    case NotificationType.CITIZEN_REQUEST:
      return <MessageSquare className="h-4 w-4" />;
    case NotificationType.SYSTEM:
      return <AlertCircle className="h-4 w-4" />;
    case NotificationType.BLOCKCHAIN:
      return <Database className="h-4 w-4" />;
    case NotificationType.MESSAGE:
      return <MessageSquare className="h-4 w-4" />;
    case NotificationType.AI_AGENT:
      return <UserCheck className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
}

export function getNotificationColor(priority: NotificationPriority) {
  switch (priority) {
    case NotificationPriority.LOW:
      return "bg-slate-100 text-slate-700";
    case NotificationPriority.MEDIUM:
      return "bg-blue-100 text-blue-700";
    case NotificationPriority.HIGH:
      return "bg-orange-100 text-orange-700";
    case NotificationPriority.URGENT:
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function NotificationItem({ notification, onMarkAsRead }: { 
  notification: Notification,
  onMarkAsRead: (id: string) => void
}) {
  const iconClass = getNotificationColor(notification.priority);
  
  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg transition-colors",
      notification.read ? "bg-white" : "bg-slate-50"
    )}>
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        iconClass
      )}>
        {getNotificationIcon(notification.type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h4 className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
            {notification.title}
          </h4>
          <span className="text-xs text-slate-500 ml-1 whitespace-nowrap">
            {new Date(notification.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
        </div>
        
        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
          {notification.message}
        </p>
        
        {notification.sender && (
          <div className="flex items-center mt-2">
            <Avatar className="h-5 w-5 mr-1">
              <AvatarImage src={notification.sender.avatarUrl} alt={notification.sender.name} />
              <AvatarFallback className="text-[10px]">
                {notification.sender.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-slate-500">{notification.sender.name}</span>
          </div>
        )}
        
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs h-5 px-1.5">
              {notification.type.replace('_', ' ')}
            </Badge>
            
            {!notification.read && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs h-5 px-1.5">
                Новое
              </Badge>
            )}
          </div>
          
          {!notification.read && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 rounded-full"
              onClick={() => onMarkAsRead(notification.id)}
            >
              <Check className="h-3.5 w-3.5" />
              <span className="sr-only">Отметить как прочитанное</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationsList({ notifications, onMarkAsRead }: {
  notifications: Notification[],
  onMarkAsRead: (id: string) => void
}) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-500">
        <Bell className="h-8 w-8 stroke-1 mb-2" />
        <p className="text-sm">Нет новых уведомлений</p>
      </div>
    );
  }
  
  return (
    <ScrollArea className="max-h-[400px]">
      <div className="space-y-2 p-1">
        {notifications.map((notification) => (
          <NotificationItem 
            key={notification.id} 
            notification={notification} 
            onMarkAsRead={onMarkAsRead}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const queryClient = useQueryClient();
  
  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    // Временное решение для демонстрации - в реальном приложении будет запрос к API
    queryFn: async () => {
      // Имитация задержки API
      await new Promise(resolve => setTimeout(resolve, 500));
      return demoNotifications;
    },
  });
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const filteredNotifications = {
    all: notifications,
    unread: notifications.filter(n => !n.read),
    tasks: notifications.filter(n => n.type === NotificationType.TASK),
    requests: notifications.filter(n => n.type === NotificationType.CITIZEN_REQUEST),
    system: notifications.filter(n => n.type === NotificationType.SYSTEM),
  };
  
  const markAsRead = (id: string) => {
    // Обновляем локальное состояние
    const updatedNotifications = notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    
    // Обновляем кэш
    queryClient.setQueryData(['/api/notifications'], updatedNotifications);
    
    // В реальном приложении здесь был бы вызов API для обновления на сервере
    // apiRequest(`/api/notifications/${id}/read`, { method: 'POST' });
  };
  
  const markAllAsRead = () => {
    // Обновляем локальное состояние
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    
    // Обновляем кэш
    queryClient.setQueryData(['/api/notifications'], updatedNotifications);
    
    // В реальном приложении здесь был бы вызов API для обновления на сервере
    // apiRequest('/api/notifications/read-all', { method: 'POST' });
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label="Уведомления"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="end"
        alignOffset={-60}
        className="w-[380px] p-0"
        sideOffset={5}
      >
        <div className="flex items-center justify-between p-4 pb-2">
          <div>
            <h3 className="font-medium">Уведомления</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {unreadCount > 0 ? `У вас ${unreadCount} непрочитанных уведомлений` : 'Все уведомления прочитаны'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={markAllAsRead}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Отметить все
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
              <span className="sr-only">Настройки уведомлений</span>
            </Button>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all" className="text-xs">
                Все
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">
                Новые {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs">
                Задачи
              </TabsTrigger>
              <TabsTrigger value="requests" className="text-xs">
                Запросы
              </TabsTrigger>
              <TabsTrigger value="system" className="text-xs">
                Система
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="py-2">
            <TabsContent value="all" className="m-0">
              <NotificationsList 
                notifications={filteredNotifications.all} 
                onMarkAsRead={markAsRead}
              />
            </TabsContent>
            <TabsContent value="unread" className="m-0">
              <NotificationsList 
                notifications={filteredNotifications.unread} 
                onMarkAsRead={markAsRead}
              />
            </TabsContent>
            <TabsContent value="tasks" className="m-0">
              <NotificationsList 
                notifications={filteredNotifications.tasks} 
                onMarkAsRead={markAsRead}
              />
            </TabsContent>
            <TabsContent value="requests" className="m-0">
              <NotificationsList 
                notifications={filteredNotifications.requests} 
                onMarkAsRead={markAsRead}
              />
            </TabsContent>
            <TabsContent value="system" className="m-0">
              <NotificationsList 
                notifications={filteredNotifications.system} 
                onMarkAsRead={markAsRead}
              />
            </TabsContent>
          </div>
        </Tabs>
        
        <div className="border-t p-3 text-center">
          <Button variant="link" className="text-xs h-auto p-0">
            Настроить уведомления
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Демо-данные для локальной разработки и тестирования
const demoNotifications: Notification[] = [
  {
    id: '1',
    title: 'Новая задача назначена',
    message: 'Вам назначена новая задача "Обработка запроса #1234 от гражданина"',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 минут назад
    read: false,
    priority: NotificationPriority.MEDIUM,
    type: NotificationType.TASK,
    entityId: '1234',
    entityType: 'task',
    actionUrl: '/tasks/1234',
    sender: {
      id: 1,
      name: 'Руслан Асанов',
      avatarUrl: '',
    }
  },
  {
    id: '2',
    title: 'Запрос требует внимания',
    message: 'Запрос #5678 от гражданина требует срочного рассмотрения. Срок исполнения: сегодня.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 минут назад
    read: false,
    priority: NotificationPriority.URGENT,
    type: NotificationType.CITIZEN_REQUEST,
    entityId: '5678',
    entityType: 'citizen_request',
    actionUrl: '/citizen-requests',
    sender: {
      id: 2,
      name: 'Система',
      avatarUrl: '',
    }
  },
  {
    id: '3',
    title: 'Новая запись в блокчейне',
    message: 'Зарегистрирована новая транзакция в блокчейне. ID: 0x1234abcd...',
    timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 час назад
    read: true,
    priority: NotificationPriority.LOW,
    type: NotificationType.BLOCKCHAIN,
    entityId: '0x1234abcd',
    entityType: 'blockchain_record',
    actionUrl: '/analytics?tab=blockchain',
  },
  {
    id: '4',
    title: 'Приглашение на совещание',
    message: 'Вы приглашены на совещание "Еженедельное планирование". Завтра в 10:00.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 часа назад
    read: false,
    priority: NotificationPriority.MEDIUM,
    type: NotificationType.MEETING,
    entityId: '8765',
    entityType: 'meeting',
    actionUrl: '/meetings',
    sender: {
      id: 3,
      name: 'Арман Китапбаев',
      avatarUrl: '',
    }
  },
  {
    id: '5',
    title: 'Обновление системы',
    message: 'Система будет недоступна сегодня с 23:00 до 00:00 в связи с плановым обновлением.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 часа назад
    read: true,
    priority: NotificationPriority.HIGH,
    type: NotificationType.SYSTEM,
    sender: {
      id: 4,
      name: 'Администратор',
      avatarUrl: '',
    }
  },
  {
    id: '6',
    title: 'AI-агент завершил обработку',
    message: 'Агент "Обработка запросов граждан" завершил анализ документа #4321.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 часов назад
    read: true,
    priority: NotificationPriority.LOW,
    type: NotificationType.AI_AGENT,
    entityId: '4321',
    entityType: 'document',
    actionUrl: '/documents/4321',
  },
  {
    id: '7',
    title: 'Новое сообщение',
    message: 'У вас новое сообщение от Айнур Бековой: "Пожалуйста, проверьте обновленный документ"',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 часов назад
    read: true,
    priority: NotificationPriority.MEDIUM,
    type: NotificationType.MESSAGE,
    sender: {
      id: 5,
      name: 'Айнур Бекова',
      avatarUrl: '',
    }
  },
  {
    id: '8',
    title: 'Срок задачи истекает',
    message: 'Срок выполнения задачи "Подготовка отчета" истекает завтра.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 часов назад
    read: false,
    priority: NotificationPriority.HIGH,
    type: NotificationType.TASK,
    entityId: '9876',
    entityType: 'task',
    actionUrl: '/tasks/9876',
  }
];

export default NotificationCenter;