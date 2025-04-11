import { db } from "./db";
import { 
  users, tasks, documents, blockchainRecords, 
  messages, activities, systemStatus 
} from "@shared/schema";
import { eq, desc, sql } from 'drizzle-orm';
import { IStorage } from "./storage";
import { 
  User, InsertUser, 
  Task, InsertTask, 
  Document, InsertDocument,
  BlockchainRecord, InsertBlockchainRecord,
  Message, InsertMessage,
  Activity, InsertActivity,
  SystemStatusItem, InsertSystemStatusItem
} from "@shared/schema";

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Task operations
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksByUser(userId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(
      sql`${tasks.assignedTo} = ${userId} OR ${tasks.createdBy} = ${userId}`
    );
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values({
      ...insertTask,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return task;
  }

  async updateTask(id: number, updateData: Partial<InsertTask>): Promise<Task | undefined> {
    const [updatedTask] = await db.update(tasks)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  // Document operations
  async getDocuments(): Promise<Document[]> {
    return await db.select().from(documents);
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async getDocumentsByTask(taskId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.taskId, taskId));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values({
      ...insertDocument,
      createdAt: new Date()
    }).returning();
    
    // Update document count in task if needed
    if (document.taskId) {
      const [task] = await db.select().from(tasks).where(eq(tasks.id, document.taskId));
      if (task) {
        await db.update(tasks)
          .set({ 
            documentCount: (task.documentCount || 0) + 1,
            updatedAt: new Date()
          })
          .where(eq(tasks.id, document.taskId));
      }
    }
    
    return document;
  }

  async updateDocument(id: number, updateData: Partial<InsertDocument>): Promise<Document | undefined> {
    const [updatedDocument] = await db.update(documents)
      .set(updateData)
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument;
  }

  // Blockchain record operations
  async getBlockchainRecords(): Promise<BlockchainRecord[]> {
    return await db.select().from(blockchainRecords);
  }

  async getBlockchainRecord(id: number): Promise<BlockchainRecord | undefined> {
    const [record] = await db.select().from(blockchainRecords).where(eq(blockchainRecords.id, id));
    return record;
  }

  async getRecentBlockchainRecords(limit: number): Promise<BlockchainRecord[]> {
    return await db.select().from(blockchainRecords)
      .orderBy(desc(blockchainRecords.createdAt))
      .limit(limit);
  }

  async createBlockchainRecord(insertRecord: InsertBlockchainRecord): Promise<BlockchainRecord> {
    const [record] = await db.insert(blockchainRecords).values({
      ...insertRecord,
      createdAt: new Date()
    }).returning();
    return record;
  }

  async updateBlockchainRecord(id: number, updateData: Partial<InsertBlockchainRecord>): Promise<BlockchainRecord | undefined> {
    const confirmedAt = updateData.status === "confirmed" ? new Date() : undefined;
    
    const [updatedRecord] = await db.update(blockchainRecords)
      .set({
        ...updateData,
        confirmedAt: confirmedAt
      })
      .where(eq(blockchainRecords.id, id))
      .returning();
    return updatedRecord;
  }

  // Message operations
  async getMessages(): Promise<Message[]> {
    return await db.select().from(messages);
  }

  async getMessagesByTask(taskId: number): Promise<Message[]> {
    return await db.select().from(messages)
      .where(eq(messages.taskId, taskId))
      .orderBy(messages.timestamp);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values({
      ...insertMessage,
      timestamp: new Date()
    }).returning();
    return message;
  }

  // Activity operations
  async getActivities(): Promise<Activity[]> {
    return await db.select().from(activities);
  }

  async getRecentActivities(limit: number): Promise<Activity[]> {
    return await db.select().from(activities)
      .orderBy(desc(activities.timestamp))
      .limit(limit);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values({
      ...insertActivity,
      timestamp: new Date()
    }).returning();
    return activity;
  }

  // System status operations
  async getSystemStatuses(): Promise<SystemStatusItem[]> {
    return await db.select().from(systemStatus);
  }

  async updateSystemStatus(serviceName: string, statusData: InsertSystemStatusItem): Promise<SystemStatusItem | undefined> {
    // Check if the status already exists
    const [existingStatus] = await db.select().from(systemStatus)
      .where(eq(systemStatus.serviceName, serviceName));
    
    if (existingStatus) {
      // Update existing status
      const [updatedStatus] = await db.update(systemStatus)
        .set({
          ...statusData,
          lastUpdated: new Date()
        })
        .where(eq(systemStatus.serviceName, serviceName))
        .returning();
      return updatedStatus;
    } else {
      // Create new status
      const [newStatus] = await db.insert(systemStatus).values({
        ...statusData,
        lastUpdated: new Date()
      }).returning();
      return newStatus;
    }
  }
  
  // Initialize default data
  async initializeDefaultData() {
    // Check if we have any users
    const userCount = await db.select({ count: sql<number>`count(*)` })
      .from(users);
      
    // If no users, create default admin
    if (userCount[0].count === 0) {
      await this.createUser({
        username: "admin",
        password: "admin123", // В реальном приложении пароль должен быть хэширован
        fullName: "Айнур Бекова",
        role: "admin",
        department: "Департамент цифровизации"
      });
    }
    
    // Create default system statuses
    const defaultStatuses: InsertSystemStatusItem[] = [
      { serviceName: "Agent Smith Core", status: 100, details: "Система работает нормально" },
      { serviceName: "GovChain", status: 100, details: "Система работает нормально" },
      { serviceName: "Document Processing", status: 98, details: "Система работает нормально" },
      { serviceName: "AI Translation", status: 100, details: "Система работает нормально" },
      { serviceName: "PKI Service", status: 95, details: "Возможны задержки при проверке подписей" }
    ];

    for (const status of defaultStatuses) {
      // Check if this status already exists
      const [existingStatus] = await db.select().from(systemStatus)
        .where(eq(systemStatus.serviceName, status.serviceName));
      
      if (!existingStatus) {
        await this.updateSystemStatus(status.serviceName, status);
      }
    }
  }
}