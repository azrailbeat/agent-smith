import { 
  User, InsertUser, 
  Task, InsertTask, 
  Document, InsertDocument,
  BlockchainRecord, InsertBlockchainRecord,
  Message, InsertMessage,
  Activity, InsertActivity,
  SystemStatusItem, InsertSystemStatusItem,
  Integration, InsertIntegration,
  Agent, InsertAgent
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Task operations
  getTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  getTasksByUser(userId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  
  // Document operations
  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByTask(taskId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined>;
  
  // Blockchain record operations
  getBlockchainRecords(): Promise<BlockchainRecord[]>;
  getBlockchainRecord(id: number): Promise<BlockchainRecord | undefined>;
  getRecentBlockchainRecords(limit: number): Promise<BlockchainRecord[]>;
  createBlockchainRecord(record: InsertBlockchainRecord): Promise<BlockchainRecord>;
  updateBlockchainRecord(id: number, record: Partial<InsertBlockchainRecord>): Promise<BlockchainRecord | undefined>;
  
  // Message operations
  getMessages(): Promise<Message[]>;
  getMessagesByTask(taskId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Activity operations
  getActivities(): Promise<Activity[]>;
  getRecentActivities(limit: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // System status operations
  getSystemStatuses(): Promise<SystemStatusItem[]>;
  updateSystemStatus(serviceName: string, status: InsertSystemStatusItem): Promise<SystemStatusItem | undefined>;
  
  // Integration operations
  getIntegrations(): Promise<Integration[]>;
  getIntegration(id: number): Promise<Integration | undefined>;
  getIntegrationsByType(type: string): Promise<Integration[]>;
  createIntegration(integration: InsertIntegration): Promise<Integration>;
  updateIntegration(id: number, integration: Partial<InsertIntegration>): Promise<Integration | undefined>;
  deleteIntegration(id: number): Promise<boolean>;
  
  // Agent operations
  getAgents(): Promise<Agent[]>;
  getAgent(id: number): Promise<Agent | undefined>;
  getAgentsByType(type: string): Promise<Agent[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined>;
  deleteAgent(id: number): Promise<boolean>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private documents: Map<number, Document>;
  private blockchainRecords: Map<number, BlockchainRecord>;
  private messages: Map<number, Message>;
  private activities: Map<number, Activity>;
  private systemStatuses: Map<string, SystemStatusItem>;
  private integrations: Map<number, Integration>;
  private agents: Map<number, Agent>;
  
  private userIdCounter: number;
  private taskIdCounter: number;
  private documentIdCounter: number;
  private blockchainRecordIdCounter: number;
  private messageIdCounter: number;
  private activityIdCounter: number;
  private systemStatusIdCounter: number;
  private integrationIdCounter: number;
  private agentIdCounter: number;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.documents = new Map();
    this.blockchainRecords = new Map();
    this.messages = new Map();
    this.activities = new Map();
    this.systemStatuses = new Map();
    this.integrations = new Map();
    this.agents = new Map();
    
    this.userIdCounter = 1;
    this.taskIdCounter = 1;
    this.documentIdCounter = 1;
    this.blockchainRecordIdCounter = 1;
    this.messageIdCounter = 1;
    this.activityIdCounter = 1;
    this.systemStatusIdCounter = 1;
    this.integrationIdCounter = 1;
    this.agentIdCounter = 1;
    
    // Initialize with some default data
    this.initializeDefaultData();
  }

  // Initialize with default data
  private initializeDefaultData() {
    // Create default user
    const defaultUser: InsertUser = {
      username: "admin",
      password: "admin123",
      fullName: "Айнур Бекова",
      department: "Департамент цифровизации",
      role: "admin"
    };
    this.createUser(defaultUser);
    
    // Initialize system statuses
    const statuses: InsertSystemStatusItem[] = [
      { serviceName: "Agent Smith Core", status: 100, details: "Система работает нормально" },
      { serviceName: "Blockchain Node", status: 100, details: "Система работает нормально" },
      { serviceName: "Speech-to-Text", status: 92, details: "Некоторые задержки при обработке длинных записей" },
      { serviceName: "Document Processing", status: 98, details: "Система работает нормально" }
    ];
    
    statuses.forEach(status => {
      this.updateSystemStatus(status.serviceName, status);
    });

    // Initialize default integrations
    const defaultIntegrations: InsertIntegration[] = [
      {
        name: "OpenAI GPT-4o",
        type: "openai",
        apiUrl: "https://api.openai.com/v1",
        apiKey: process.env.OPENAI_API_KEY || "",
        isActive: true,
        config: {}
      },
      {
        name: "Yandex Speech Kit",
        type: "speech",
        apiUrl: "https://stt.api.cloud.yandex.net/speech/v1/stt:recognize",
        apiKey: "",
        isActive: true,
        config: { 
          languageCodes: ["ru-RU", "kk-KZ", "en-US"] 
        }
      },
      {
        name: "Внутренний Planka",
        type: "planka",
        apiUrl: "https://planka.gov.kz/api",
        apiKey: "",
        isActive: false,
        config: {}
      },
      {
        name: "OpenProject",
        type: "openproject",
        apiUrl: "https://openproject.gov.kz/api/v3",
        apiKey: "",
        isActive: false,
        config: {}
      }
    ];
    
    defaultIntegrations.forEach(integration => {
      this.createIntegration(integration);
    });
    
    // Initialize default agents
    const defaultIntegrationId = 1; // Предполагаем, что OpenAI интеграция будет иметь ID 1
    
    const defaultAgents: InsertAgent[] = [
      {
        name: "Помощник по запросам граждан",
        type: "citizen_requests",
        description: "Обрабатывает и категоризирует запросы от граждан, помогает составить ответы",
        modelId: defaultIntegrationId,
        isActive: true,
        systemPrompt: "Вы - специалист по работе с обращениями граждан. Ваша задача - помочь государственным служащим эффективно обрабатывать запросы граждан, категоризировать их и помогать составлять профессиональные и информативные ответы.",
        config: {
          temperature: 0.2,
          maxTokens: 2048
        }
      },
      {
        name: "Протоколы собраний",
        type: "meeting_protocols",
        description: "Анализирует записи и протоколы совещаний, выделяет ключевую информацию",
        modelId: defaultIntegrationId,
        isActive: true,
        systemPrompt: "Вы - эксперт по анализу записей совещаний и создания протоколов. Ваша задача - выделять ключевую информацию из записей совещаний, формировать списки задач и решений, а также создавать краткие и информативные протоколы.",
        config: {
          temperature: 0.1,
          maxTokens: 4096
        }
      },
      {
        name: "Переводчик",
        type: "translator",
        description: "Переводит документы между казахским, русским и английским языками",
        modelId: defaultIntegrationId,
        isActive: true,
        systemPrompt: "Вы - профессиональный переводчик с глубоким знанием казахского, русского и английского языков, а также юридической и государственной терминологии. Ваша задача - обеспечивать точный и контекстуально правильный перевод официальных документов между этими языками.",
        config: {
          temperature: 0.3,
          maxTokens: 8192
        }
      }
    ];
    
    defaultAgents.forEach(agent => {
      this.createAgent(agent);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Task methods
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByUser(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.assignedTo === userId || task.createdBy === userId
    );
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.taskIdCounter++;
    const task: Task = { 
      ...insertTask, 
      id, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, updateData: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask: Task = {
      ...task,
      ...updateData,
      updatedAt: new Date()
    };
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  // Document methods
  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentsByTask(taskId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (document) => document.taskId === taskId
    );
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentIdCounter++;
    const document: Document = { 
      ...insertDocument, 
      id, 
      createdAt: new Date() 
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: number, updateData: Partial<InsertDocument>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updatedDocument: Document = {
      ...document,
      ...updateData
    };
    
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  // Blockchain record methods
  async getBlockchainRecords(): Promise<BlockchainRecord[]> {
    return Array.from(this.blockchainRecords.values());
  }

  async getBlockchainRecord(id: number): Promise<BlockchainRecord | undefined> {
    return this.blockchainRecords.get(id);
  }

  async getRecentBlockchainRecords(limit: number): Promise<BlockchainRecord[]> {
    return Array.from(this.blockchainRecords.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createBlockchainRecord(insertRecord: InsertBlockchainRecord): Promise<BlockchainRecord> {
    const id = this.blockchainRecordIdCounter++;
    const record: BlockchainRecord = {
      ...insertRecord,
      id,
      createdAt: new Date(),
      confirmedAt: insertRecord.status === "confirmed" ? new Date() : null
    };
    this.blockchainRecords.set(id, record);
    return record;
  }

  async updateBlockchainRecord(id: number, updateData: Partial<InsertBlockchainRecord>): Promise<BlockchainRecord | undefined> {
    const record = this.blockchainRecords.get(id);
    if (!record) return undefined;
    
    const updatedRecord: BlockchainRecord = {
      ...record,
      ...updateData,
      confirmedAt: updateData.status === "confirmed" ? new Date() : record.confirmedAt
    };
    
    this.blockchainRecords.set(id, updatedRecord);
    return updatedRecord;
  }

  // Message methods
  async getMessages(): Promise<Message[]> {
    return Array.from(this.messages.values());
  }

  async getMessagesByTask(taskId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.taskId === taskId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date()
    };
    this.messages.set(id, message);
    return message;
  }

  // Activity methods
  async getActivities(): Promise<Activity[]> {
    return Array.from(this.activities.values());
  }

  async getRecentActivities(limit: number): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.activityIdCounter++;
    const activity: Activity = {
      ...insertActivity,
      id,
      timestamp: new Date()
    };
    this.activities.set(id, activity);
    return activity;
  }

  // System status methods
  async getSystemStatuses(): Promise<SystemStatusItem[]> {
    return Array.from(this.systemStatuses.values());
  }

  async updateSystemStatus(serviceName: string, statusData: InsertSystemStatusItem): Promise<SystemStatusItem | undefined> {
    const existingStatus = Array.from(this.systemStatuses.values()).find(
      status => status.serviceName === serviceName
    );
    
    if (existingStatus) {
      const updatedStatus: SystemStatusItem = {
        ...existingStatus,
        status: statusData.status,
        details: statusData.details,
        lastUpdated: new Date()
      };
      this.systemStatuses.set(serviceName, updatedStatus);
      return updatedStatus;
    } else {
      const id = this.systemStatusIdCounter++;
      const newStatus: SystemStatusItem = {
        ...statusData,
        id,
        lastUpdated: new Date()
      };
      this.systemStatuses.set(serviceName, newStatus);
      return newStatus;
    }
  }

  // Integration methods
  async getIntegrations(): Promise<Integration[]> {
    return Array.from(this.integrations.values());
  }

  async getIntegration(id: number): Promise<Integration | undefined> {
    return this.integrations.get(id);
  }

  async getIntegrationsByType(type: string): Promise<Integration[]> {
    return Array.from(this.integrations.values()).filter(
      integration => integration.type === type
    );
  }

  async createIntegration(insertIntegration: InsertIntegration): Promise<Integration> {
    const id = this.integrationIdCounter++;
    const integration: Integration = {
      ...insertIntegration,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.integrations.set(id, integration);
    return integration;
  }

  async updateIntegration(id: number, updateData: Partial<InsertIntegration>): Promise<Integration | undefined> {
    const integration = this.integrations.get(id);
    if (!integration) return undefined;
    
    const updatedIntegration: Integration = {
      ...integration,
      ...updateData,
      updatedAt: new Date()
    };
    
    this.integrations.set(id, updatedIntegration);
    return updatedIntegration;
  }

  async deleteIntegration(id: number): Promise<boolean> {
    return this.integrations.delete(id);
  }

  // Agent methods
  async getAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async getAgentsByType(type: string): Promise<Agent[]> {
    return Array.from(this.agents.values()).filter(
      agent => agent.type === type
    );
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const id = this.agentIdCounter++;
    const agent: Agent = {
      ...insertAgent,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.agents.set(id, agent);
    return agent;
  }

  async updateAgent(id: number, updateData: Partial<InsertAgent>): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    
    const updatedAgent: Agent = {
      ...agent,
      ...updateData,
      updatedAt: new Date()
    };
    
    this.agents.set(id, updatedAgent);
    return updatedAgent;
  }

  async deleteAgent(id: number): Promise<boolean> {
    return this.agents.delete(id);
  }
}

// Export storage instance
export const storage = new MemStorage();
