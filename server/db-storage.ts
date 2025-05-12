import { db } from "./db";
import { 
  users, tasks, documents, blockchainRecords, 
  messages, activities, systemStatus, integrations,
  agents, agentResults, citizenRequests, departments, positions,
  ministries, agentTypes, plankaLinks, organizationalRules,
  agentKnowledgeBases, knowledgeDocuments
} from "@shared/schema";
import { eq, desc, sql, and, isNull, not } from 'drizzle-orm';
import { IStorage } from "./storage";
import { 
  User, InsertUser, 
  Task, InsertTask, 
  Document, InsertDocument,
  BlockchainRecord, InsertBlockchainRecord,
  Message, InsertMessage,
  Activity, InsertActivity,
  SystemStatusItem, InsertSystemStatusItem,
  Integration, InsertIntegration,
  Agent, InsertAgent,
  CitizenRequest, InsertCitizenRequest,
  Ministry, InsertMinistry,
  AgentType, InsertAgentType,
  PlankaLink, InsertPlankaLink,
  InsertAgentResult,
  AgentKnowledgeBase, InsertAgentKnowledgeBase,
  KnowledgeDocument, InsertKnowledgeDocument
} from "@shared/schema";

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
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
  
  // Integration operations
  async getIntegrations(): Promise<Integration[]> {
    return await db.select().from(integrations);
  }

  async getIntegration(id: number): Promise<Integration | undefined> {
    const [integration] = await db.select().from(integrations).where(eq(integrations.id, id));
    return integration;
  }

  async getIntegrationsByType(type: string): Promise<Integration[]> {
    return await db.select().from(integrations).where(eq(integrations.type, type));
  }

  async getIntegrationByName(name: string): Promise<Integration | undefined> {
    const [integration] = await db.select().from(integrations).where(eq(integrations.name, name));
    return integration;
  }

  async createIntegration(insertIntegration: InsertIntegration): Promise<Integration> {
    const [integration] = await db.insert(integrations).values({
      ...insertIntegration,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return integration;
  }

  async updateIntegration(id: number, updateData: Partial<InsertIntegration>): Promise<Integration | undefined> {
    const [updatedIntegration] = await db.update(integrations)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(integrations.id, id))
      .returning();
    return updatedIntegration;
  }

  async deleteIntegration(id: number): Promise<boolean> {
    try {
      await db.delete(integrations).where(eq(integrations.id, id));
      return true;
    } catch (error) {
      console.error("Failed to delete integration:", error);
      return false;
    }
  }

  // Agent operations
  async getAgents(): Promise<Agent[]> {
    return await db.select().from(agents);
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent;
  }

  async getAgentsByType(type: string): Promise<Agent[]> {
    return await db.select().from(agents).where(eq(agents.type, type));
  }

  async getAgentByName(name: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.name, name));
    return agent;
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const [agent] = await db.insert(agents).values({
      ...insertAgent,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return agent;
  }

  async updateAgent(id: number, updateData: Partial<InsertAgent>): Promise<Agent | undefined> {
    const [updatedAgent] = await db.update(agents)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(agents.id, id))
      .returning();
    return updatedAgent;
  }

  async deleteAgent(id: number): Promise<boolean> {
    try {
      await db.delete(agents).where(eq(agents.id, id));
      return true;
    } catch (error) {
      console.error("Failed to delete agent:", error);
      return false;
    }
  }

  // Citizen Request operations
  async getCitizenRequests(): Promise<CitizenRequest[]> {
    return await db.select().from(citizenRequests);
  }

  async getCitizenRequest(id: number): Promise<CitizenRequest | undefined> {
    const [request] = await db.select().from(citizenRequests).where(eq(citizenRequests.id, id));
    return request;
  }

  async createCitizenRequest(insertRequest: InsertCitizenRequest): Promise<CitizenRequest> {
    const [request] = await db.insert(citizenRequests).values({
      ...insertRequest,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return request;
  }

  async updateCitizenRequest(id: number, updateData: Partial<InsertCitizenRequest>): Promise<CitizenRequest | undefined> {
    // If status is completed or closed, add the appropriate timestamp
    let additionalData: any = {};
    
    if (updateData.status === "completed" && !updateData.completedAt) {
      additionalData.completedAt = new Date();
    } else if (updateData.status === "closed" && !updateData.closedAt) {
      additionalData.closedAt = new Date();
    }
    
    const [updatedRequest] = await db.update(citizenRequests)
      .set({
        ...updateData,
        ...additionalData,
        updatedAt: new Date()
      })
      .where(eq(citizenRequests.id, id))
      .returning();
    return updatedRequest;
  }

  async deleteCitizenRequest(id: number): Promise<boolean> {
    try {
      // Сначала удаляем связанные записи результатов работы агентов
      await db.delete(agentResults)
        .where(and(
          eq(agentResults.entityType, 'citizen_request'),
          eq(agentResults.entityId, id)
        ));
      
      // Теперь удаляем само обращение
      const result = await db.delete(citizenRequests)
        .where(eq(citizenRequests.id, id))
        .returning();
        
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting citizen request:', error);
      return false;
    }
  }

  async processCitizenRequestWithAI(id: number): Promise<CitizenRequest | undefined> {
    // This is just a placeholder - actual AI processing would be implemented in the agent service
    // Here we just mark the request as processed
    const request = await this.updateCitizenRequest(id, {
      aiProcessed: true,
      aiClassification: "Автоматически обработано",
      aiSuggestion: "Предлагаем рассмотреть запрос в установленном порядке"
    });
    
    return request;
  }

  // Department operations
  async getDepartments(): Promise<any[]> {
    return await db.select().from(departments);
  }

  async getDepartment(id: number): Promise<any | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }

  async getDepartmentByName(name: string): Promise<any | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.name, name));
    return department;
  }

  async createDepartment(department: any): Promise<any> {
    const [newDepartment] = await db.insert(departments).values({
      ...department,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return newDepartment;
  }

  async updateDepartment(id: number, updateData: any): Promise<any | undefined> {
    const [updatedDepartment] = await db.update(departments)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(departments.id, id))
      .returning();
    return updatedDepartment;
  }

  // Position operations
  async getPositions(): Promise<any[]> {
    return await db.select().from(positions);
  }

  async getPosition(id: number): Promise<any | undefined> {
    const [position] = await db.select().from(positions).where(eq(positions.id, id));
    return position;
  }

  async getPositionByName(name: string): Promise<any | undefined> {
    const [position] = await db.select().from(positions).where(eq(positions.name, name));
    return position;
  }

  async createPosition(position: any): Promise<any> {
    const [newPosition] = await db.insert(positions).values({
      ...position,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return newPosition;
  }

  async updatePosition(id: number, updateData: any): Promise<any | undefined> {
    const [updatedPosition] = await db.update(positions)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(positions.id, id))
      .returning();
    return updatedPosition;
  }

  // Task Rule operations (Organizational Rules)
  async getTaskRules(): Promise<OrganizationalRule[]> {
    return await db.select().from(organizationalRules);
  }

  async getTaskRule(id: number): Promise<OrganizationalRule | undefined> {
    const [rule] = await db.select().from(organizationalRules).where(eq(organizationalRules.id, id));
    return rule;
  }

  async getTaskRuleByName(name: string): Promise<OrganizationalRule | undefined> {
    const [rule] = await db.select().from(organizationalRules).where(eq(organizationalRules.name, name));
    return rule;
  }

  async createTaskRule(rule: Partial<OrganizationalRule>): Promise<OrganizationalRule> {
    const [newRule] = await db.insert(organizationalRules).values({
      ...rule,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    // Log the activity
    await this.createActivity({
      actionType: 'rule_created',
      description: `Создано правило распределения "${newRule.name}"`,
      entityType: 'organizational_rule',
      entityId: newRule.id,
      action: 'create'
    });
    
    return newRule;
  }

  async updateTaskRule(id: number, updateData: Partial<OrganizationalRule>): Promise<OrganizationalRule | undefined> {
    const [updatedRule] = await db.update(organizationalRules)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(organizationalRules.id, id))
      .returning();
    
    if (updatedRule) {
      // Log the activity
      await this.createActivity({
        actionType: 'rule_updated',
        description: `Обновлено правило распределения "${updatedRule.name}"`,
        entityType: 'organizational_rule',
        entityId: updatedRule.id,
        action: 'update'
      });
    }
    
    return updatedRule;
  }

  async deleteTaskRule(id: number): Promise<boolean> {
    // First get the rule to log its information
    const [rule] = await db.select().from(organizationalRules).where(eq(organizationalRules.id, id));
    
    try {
      const result = await db.delete(organizationalRules).where(eq(organizationalRules.id, id));
      
      if (result.rowCount > 0 && rule) {
        // Log the activity
        await this.createActivity({
          actionType: 'rule_deleted',
          description: `Удалено правило распределения "${rule.name}"`,
          entityType: 'organizational_rule',
          entityId: id,
          action: 'delete'
        });
      }
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting organizational rule:', error);
      return false;
    }
  }

  // System Settings operations
  async getSystemSettings(): Promise<any[]> {
    // Placeholder - we should create a system_settings table
    return [];
  }

  async getSystemSetting(key: string): Promise<any | undefined> {
    // Placeholder
    return undefined;
  }

  async updateSystemSetting(key: string, value: any): Promise<any | undefined> {
    // Placeholder
    return { key, value };
  }

  // Planka Link operations
  async getPlankaLinks(): Promise<any[]> {
    return await db.select().from(plankaLinks);
  }

  async getPlankaLink(id: number): Promise<any | undefined> {
    const [link] = await db.select().from(plankaLinks).where(eq(plankaLinks.id, id));
    return link;
  }

  async getPlankaLinkByEntity(entityType: string, entityId: number): Promise<any[]> {
    return await db.select().from(plankaLinks)
      .where(and(
        eq(plankaLinks.entityType, entityType),
        eq(plankaLinks.entityId, entityId)
      ));
  }

  async createPlankaLink(link: any): Promise<any> {
    const [newLink] = await db.insert(plankaLinks).values({
      ...link,
      createdAt: new Date()
    }).returning();
    return newLink;
  }

  async updatePlankaLink(id: number, updateData: any): Promise<any | undefined> {
    const [updatedLink] = await db.update(plankaLinks)
      .set({
        ...updateData,
        lastSyncedAt: new Date()
      })
      .where(eq(plankaLinks.id, id))
      .returning();
    return updatedLink;
  }

  async deletePlankaLink(id: number): Promise<boolean> {
    try {
      await db.delete(plankaLinks).where(eq(plankaLinks.id, id));
      return true;
    } catch (error) {
      console.error("Failed to delete planka link:", error);
      return false;
    }
  }
  
  // Agent Result operations
  async createAgentResult(insertResult: InsertAgentResult): Promise<any> {
    const [result] = await db.insert(agentResults).values({
      ...insertResult,
      createdAt: new Date()
    }).returning();
    return result;
  }
  
  async getAgentResultsByEntity(entityType: string, entityId: number): Promise<any[]> {
    try {
      const results = await db
        .select()
        .from(agentResults)
        .where(and(
          eq(agentResults.entityType, entityType),
          eq(agentResults.entityId, entityId)
        ))
        .orderBy(desc(agentResults.createdAt));
      return results;
    } catch (error) {
      console.error("Error getting agent results by entity from database:", error);
      return [];
    }
  }
  
  async getAllAgentResults(): Promise<any[]> {
    try {
      const results = await db
        .select()
        .from(agentResults);
      return results;
    } catch (error) {
      console.error("Error getting all agent results from database:", error);
      return [];
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
  
  // Meeting Protocol operations - временная реализация до создания таблицы в БД
  async getMeetings(): Promise<any[]> {
    // Временное решение без использования БД
    return [
      {
        id: 1,
        title: "Обсуждение разработки платформы Agent Smith",
        description: "Еженедельное совещание по статусу разработки платформы Agent Smith",
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        location: "Большой конференц-зал",
        organizer: "Министерство цифрового развития",
        participants: ["Азамат Батыркожа", "Ержан Сулейманов", "Арман Сатбаев", "Анара Нургалиева"],
        status: "completed",
        duration: 120,
        hasProtocol: true,
        protocolContent: "Обсуждались вопросы разработки системы Agent Smith, сроки и ресурсы",
        decisions: ["Ускорить разработку модуля ИИ", "Провести тестирование безопасности", "Подготовить презентацию для министра"],
        tasks: [
          { task: "Разработка модуля ИИ", assignee: "Арман Сатбаев", dueDate: "2025-05-15" },
          { task: "Тестирование безопасности", assignee: "Анара Нургалиева", dueDate: "2025-05-20" }
        ],
        keyPoints: ["Обсуждены сроки запуска", "Выделены дополнительные ресурсы", "Обсуждены риски проекта"]
      },
      {
        id: 2,
        title: "Стратегия цифровизации на 2025-2030",
        description: "Обсуждение стратегических планов цифровизации государственных услуг",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        location: "Зал коллегии, 3 этаж",
        organizer: "Министерство цифрового развития",
        participants: ["Марат Жумагалиев", "Ержан Сулейманов", "Сакен Искаков", "Айгуль Сагинтаева"],
        status: "completed",
        duration: 180,
        hasProtocol: true,
        protocolContent: "Протокол совещания по формированию стратегии цифровизации...",
        decisions: ["Сформировать рабочие группы", "Провести исследование международного опыта", "Разработать KPI"],
        tasks: [],
        keyPoints: ["Определение приоритетных направлений", "Бюджетирование проектов", "Интеграция с международными платформами"]
      },
      {
        id: 3,
        title: "Запуск платформы Agent Smith",
        description: "Подготовка к запуску платформы Agent Smith в опытную эксплуатацию",
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        location: "Онлайн (Zoom)",
        organizer: "Комитет по цифровизации",
        participants: ["Азамат Батыркожа", "Ержан Сулейманов", "Арман Сатбаев", "Анара Нургалиева"],
        status: "scheduled",
        duration: 90,
        hasProtocol: false,
        protocolContent: "",
        decisions: [],
        tasks: [],
        keyPoints: []
      }
    ];
  }

  async getMeeting(id: number): Promise<any | undefined> {
    const meetings = await this.getMeetings();
    return meetings.find(m => m.id === id);
  }

  async createMeeting(meeting: any): Promise<any> {
    // Временная реализация
    return {
      id: Date.now(),
      ...meeting,
      createdAt: new Date(),
      status: meeting.status || "scheduled",
      hasProtocol: false
    };
  }

  async updateMeeting(id: number, meetingData: any): Promise<any | undefined> {
    const meeting = await this.getMeeting(id);
    if (!meeting) return undefined;
    
    return {
      ...meeting,
      ...meetingData,
      updatedAt: new Date()
    };
  }

  async deleteMeeting(id: number): Promise<boolean> {
    // Временное решение
    return true;
  }

  // Knowledge bases for agents
  async getAgentKnowledgeBase(id: number): Promise<AgentKnowledgeBase | undefined> {
    const query = `
      SELECT * FROM agent_knowledge_bases
      WHERE id = $1
    `;
    const result = await this.query(query, [id]);
    return result.rows[0] as AgentKnowledgeBase | undefined;
  }

  async getAgentKnowledgeBases(agentId: number): Promise<AgentKnowledgeBase[]> {
    const query = `
      SELECT * FROM agent_knowledge_bases
      WHERE agent_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.query(query, [agentId]);
    return result.rows as AgentKnowledgeBase[];
  }

  async getAllAgentKnowledgeBases(): Promise<AgentKnowledgeBase[]> {
    const query = `
      SELECT * FROM agent_knowledge_bases
      ORDER BY created_at DESC
    `;
    const result = await this.query(query, []);
    return result.rows as AgentKnowledgeBase[];
  }

  async createAgentKnowledgeBase(knowledgeBase: InsertAgentKnowledgeBase): Promise<AgentKnowledgeBase> {
    const { 
      name, 
      description, 
      agentId, 
      vectorStorageType, 
      vectorStorageUrl, 
      vectorStorageApiKey, 
      collectionName 
    } = knowledgeBase;
    
    const query = `
      INSERT INTO agent_knowledge_bases
        (name, description, agent_id, vector_storage_type, vector_storage_url, vector_storage_api_key, collection_name, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const result = await this.query(query, [
      name,
      description || null,
      agentId || null,
      vectorStorageType,
      vectorStorageUrl || null,
      vectorStorageApiKey || null,
      collectionName || null
    ]);
    
    return result.rows[0] as AgentKnowledgeBase;
  }

  async updateAgentKnowledgeBase(id: number, data: Partial<InsertAgentKnowledgeBase>): Promise<AgentKnowledgeBase | undefined> {
    const knowledgeBase = await this.getAgentKnowledgeBase(id);
    if (!knowledgeBase) return undefined;
    
    const {
      name,
      description,
      agentId,
      vectorStorageType,
      vectorStorageUrl,
      vectorStorageApiKey,
      collectionName
    } = data;
    
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }
    
    if (agentId !== undefined) {
      updateFields.push(`agent_id = $${paramIndex}`);
      values.push(agentId);
      paramIndex++;
    }
    
    if (vectorStorageType !== undefined) {
      updateFields.push(`vector_storage_type = $${paramIndex}`);
      values.push(vectorStorageType);
      paramIndex++;
    }
    
    if (vectorStorageUrl !== undefined) {
      updateFields.push(`vector_storage_url = $${paramIndex}`);
      values.push(vectorStorageUrl);
      paramIndex++;
    }
    
    if (vectorStorageApiKey !== undefined) {
      updateFields.push(`vector_storage_api_key = $${paramIndex}`);
      values.push(vectorStorageApiKey);
      paramIndex++;
    }
    
    if (collectionName !== undefined) {
      updateFields.push(`collection_name = $${paramIndex}`);
      values.push(collectionName);
      paramIndex++;
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (updateFields.length === 0) {
      return knowledgeBase;
    }
    
    const query = `
      UPDATE agent_knowledge_bases
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    values.push(id);
    
    const result = await this.query(query, values);
    return result.rows[0] as AgentKnowledgeBase;
  }

  async deleteAgentKnowledgeBase(id: number): Promise<boolean> {
    // Сначала удаляем связанные документы
    const deleteDocsQuery = `
      DELETE FROM knowledge_documents
      WHERE knowledge_base_id = $1
    `;
    await this.query(deleteDocsQuery, [id]);
    
    // Затем удаляем саму базу знаний
    const query = `
      DELETE FROM agent_knowledge_bases
      WHERE id = $1
    `;
    const result = await this.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Knowledge documents
  async getKnowledgeDocument(id: number): Promise<KnowledgeDocument | undefined> {
    const query = `
      SELECT * FROM knowledge_documents
      WHERE id = $1
    `;
    const result = await this.query(query, [id]);
    return result.rows[0] as KnowledgeDocument | undefined;
  }

  async getKnowledgeDocuments(knowledgeBaseId: number): Promise<KnowledgeDocument[]> {
    const query = `
      SELECT * FROM knowledge_documents
      WHERE knowledge_base_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.query(query, [knowledgeBaseId]);
    return result.rows as KnowledgeDocument[];
  }

  async createKnowledgeDocument(document: InsertKnowledgeDocument): Promise<KnowledgeDocument> {
    const {
      knowledgeBaseId,
      title,
      content,
      vectorId,
      metadata
    } = document;
    
    const query = `
      INSERT INTO knowledge_documents
        (knowledge_base_id, title, content, vector_id, metadata, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const result = await this.query(query, [
      knowledgeBaseId,
      title,
      content,
      vectorId || null,
      metadata || {}
    ]);
    
    return result.rows[0] as KnowledgeDocument;
  }

  async updateKnowledgeDocument(id: number, data: Partial<InsertKnowledgeDocument>): Promise<KnowledgeDocument | undefined> {
    const document = await this.getKnowledgeDocument(id);
    if (!document) return undefined;
    
    const {
      title,
      content,
      vectorId,
      metadata
    } = data;
    
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    
    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      values.push(title);
      paramIndex++;
    }
    
    if (content !== undefined) {
      updateFields.push(`content = $${paramIndex}`);
      values.push(content);
      paramIndex++;
    }
    
    if (vectorId !== undefined) {
      updateFields.push(`vector_id = $${paramIndex}`);
      values.push(vectorId);
      paramIndex++;
    }
    
    if (metadata !== undefined) {
      updateFields.push(`metadata = $${paramIndex}`);
      values.push(metadata);
      paramIndex++;
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (updateFields.length === 0) {
      return document;
    }
    
    const query = `
      UPDATE knowledge_documents
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    values.push(id);
    
    const result = await this.query(query, values);
    return result.rows[0] as KnowledgeDocument;
  }

  async deleteKnowledgeDocument(id: number): Promise<boolean> {
    const query = `
      DELETE FROM knowledge_documents
      WHERE id = $1
    `;
    const result = await this.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }
}