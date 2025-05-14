/**
 * Централизованные типы для системы уведомлений
 */

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

// Типы для контекстуальных уведомлений
export interface ContextualNotificationProps {
  notification: Notification;
  onClose: () => void;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export interface ContextualNotificationsContainerProps {
  notifications: Notification[];
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxNotifications?: number;
  duration?: number;
}