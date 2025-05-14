/**
 * Общие типы для всего приложения Agent Smith
 */

export interface Activity {
  id: number;
  userId?: number;
  userName?: string;
  actionType: string;
  description: string;
  relatedId?: number;
  relatedType?: string;
  blockchainHash?: string;
  entityType?: string;
  entityId?: number;
  metadata?: any;
  action?: string;
  timestamp?: Date;
  createdAt: Date;
}

export interface CitizenRequest {
  id: number;
  fullName: string;
  contactInfo: string;
  requestType: string;
  subject: string;
  description: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | string;
  createdAt: Date;
  updatedAt?: Date;
  assignedTo?: number | null;
  deadline?: Date | null;
  aiProcessed?: boolean;
  aiResult?: any;
  aiSuggestion?: string;
  aiClassification?: string;
  responseText?: string;
  content?: string;
  blockchainHash?: string;
  // Дополнительные поля, используемые в разных компонентах
  title?: string;
  closedAt?: Date;
  completedAt?: Date;
  attachments?: string[];
  category?: string;
  source?: string;
  summary?: string;
  citizenInfo?: {
    name?: string;
    contact?: string;
    address?: string;
    iin?: string;
  };
  activities?: Activity[];
}

export interface Agent {
  id: number;
  name: string;
  type: string;
  description?: string;
  isActive?: boolean;
}

export interface Department {
  id: number;
  name: string;
  parentId?: number;
  code?: string;
  level?: number;
}

export interface Position {
  id: number;
  name: string;
  departmentId: number;
  level?: number;
  description?: string;
}

export interface OrganizationUser {
  id: number;
  name: string;
  email: string;
  positionId?: number;
  position?: Position;
  departmentId?: number;
  department?: Department;
}