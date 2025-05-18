// Common types used across the application

export interface User {
  id: number | string;
  username: string;
  fullName: string;
  firstName?: string;
  email?: string;
  profileImageUrl?: string;
  avatarUrl?: string;
  department?: string;
  role?: string;
  roles?: string[];
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "ready_for_review" | "completed" | "requires_attention";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: Date;
  assignedTo?: number;
  createdBy?: number;
  createdAt: Date;
  updatedAt: Date;
  documentCount: number;
  aiProgress: number;
}

export interface Document {
  id: number;
  taskId?: number;
  title: string;
  fileType: string;
  fileUrl?: string;
  processed: boolean;
  summary?: string;
  createdAt: Date;
  uploadedBy?: number;
}

export interface BlockchainRecord {
  id: number;
  recordType: string;
  title: string;
  taskId?: number;
  documentId?: number;
  transactionHash: string;
  status: "pending" | "confirmed" | "failed";
  metadata?: any;
  createdAt: Date;
  confirmedAt?: Date;
  entityType?: string;
  entityId?: number;
}

export interface Message {
  id: number;
  userId?: number;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  taskId?: number;
}

export interface Activity {
  id: number;
  userId?: number;
  actionType: string;
  description: string;
  relatedId?: number;
  relatedType?: string;
  timestamp: Date;
  blockchainHash?: string;
  entityType?: string;
  entityId?: number;
  action?: string; 
  metadata?: any;
}

export interface SystemStatus {
  id: number;
  serviceName: string;
  status: number;
  lastUpdated: Date;
  details?: string;
}

// UI-specific types
export interface FormattedTask extends Task {
  dueDateFormatted: string;
  statusBadge: {
    color: string;
    text: string;
  };
  priorityBadge: {
    color: string;
    text: string;
  };
}

export interface StatCard {
  title: string;
  value: string | number;
  change?: {
    value: string;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
}

export interface FormattedActivity extends Activity {
  timeAgo: string;
  user?: User;
  icon?: React.ReactNode;
  color?: string;
}

export interface FormattedBlockchainRecord extends BlockchainRecord {
  timeAgo: string;
  statusBadge: {
    color: string;
    text: string;
  };
  shortHash: string;
}
