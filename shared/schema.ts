import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Роли пользователей в системе
export enum UserRole {
  OPERATOR = "operator",
  MANAGER = "manager",
  ADMIN = "admin"
}

// Разрешения для пользователей
export interface Permission {
  name: string;
  description: string;
  key: string;
}

// Карта разрешений по ролям
export const RolePermissions: Record<UserRole, string[]> = {
  [UserRole.OPERATOR]: [
    "citizen_requests.view",
    "citizen_requests.reply",
    "tasks.view",
    "tasks.create",
    "documents.view",
    "documents.upload",
  ],
  [UserRole.MANAGER]: [
    // Все разрешения оператора
    "citizen_requests.view",
    "citizen_requests.reply",
    "citizen_requests.assign",
    "citizen_requests.approve",
    "tasks.view",
    "tasks.create",
    "tasks.assign",
    "documents.view",
    "documents.upload",
    "reports.view",
    "departments.view",
    "users.view",
  ],
  [UserRole.ADMIN]: [
    // Все разрешения включая административные
    "citizen_requests.view",
    "citizen_requests.reply",
    "citizen_requests.assign",
    "citizen_requests.approve",
    "citizen_requests.delete",
    "tasks.view",
    "tasks.create",
    "tasks.assign",
    "tasks.delete",
    "documents.view",
    "documents.upload",
    "documents.delete",
    "reports.view",
    "reports.create",
    "departments.view",
    "departments.manage",
    "users.view",
    "users.manage",
    "settings.view",
    "settings.manage",
    "system.manage",
    "agents.view",
    "agents.manage",
  ]
};

// Department schema
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  parentId: integer("parent_id").references(() => departments.id),
  headId: integer("head_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDepartmentSchema = createInsertSchema(departments).pick({
  name: true,
  description: true,
  parentId: true,
  headId: true,
});

// Position schema
export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  departmentId: integer("department_id").references(() => departments.id).notNull(),
  level: integer("level").default(0), // Организационный уровень (0 - руководитель, 1 - зам и т.д.)
  canApprove: boolean("can_approve").default(false),
  canAssign: boolean("can_assign").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPositionSchema = createInsertSchema(positions).pick({
  name: true,
  departmentId: true,
  level: true,
  canApprove: true,
  canAssign: true,
});

// Users schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  avatarUrl: text("avatar_url"),
  department: text("department"),
  departmentId: integer("department_id").references(() => departments.id),
  positionId: integer("position_id").references(() => positions.id),
  role: text("role").default("operator"),
  email: text("email"),
  phone: text("phone"),
  isActive: boolean("is_active").default(true),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  avatarUrl: true,
  department: true,
  departmentId: true,
  positionId: true, 
  role: true,
  email: true,
  phone: true,
  isActive: true,
});

// Валидация роли
export const userRoleSchema = z.enum([
  UserRole.OPERATOR, 
  UserRole.MANAGER, 
  UserRole.ADMIN
]);

// Tasks schema
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").default("medium"),
  dueDate: timestamp("due_date"),
  assignedTo: integer("assigned_to"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  documentCount: integer("document_count").default(0),
  aiProgress: integer("ai_progress").default(0),
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
  assignedTo: true,
  createdBy: true,
  documentCount: true,
  aiProgress: true,
});

// Documents schema
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id"),
  title: text("title").notNull(),
  fileType: text("file_type").notNull(),
  fileUrl: text("file_url"),
  processed: boolean("processed").default(false),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow(),
  uploadedBy: integer("uploaded_by"),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  taskId: true,
  title: true,
  fileType: true,
  fileUrl: true,
  processed: true,
  summary: true,
  uploadedBy: true,
});

// Blockchain records schema
export const blockchainRecords = pgTable("blockchain_records", {
  id: serial("id").primaryKey(),
  recordType: text("record_type").notNull(),
  title: text("title").notNull(),
  taskId: integer("task_id"),
  documentId: integer("document_id"),
  entityType: text("entity_type"), // Тип сущности (для универсальных запросов)
  entityId: integer("entity_id"), // ID сущности (для универсальных запросов)
  transactionHash: text("transaction_hash").notNull(),
  status: text("status").default("pending"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
});

export const insertBlockchainRecordSchema = createInsertSchema(blockchainRecords).pick({
  recordType: true,
  title: true,
  taskId: true,
  documentId: true,
  entityType: true,
  entityId: true,
  transactionHash: true,
  status: true,
  metadata: true,
});

// Messages schema
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  role: text("role").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  taskId: integer("task_id"),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  userId: true,
  role: true,
  content: true,
  taskId: true,
});

// Comments schema (для комментариев операторов к обращениям)
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id").notNull(),
  entityType: text("entity_type").notNull().default("citizen_request"),
  authorId: integer("author_id"),
  authorName: text("author_name"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isInternal: boolean("is_internal").default(false), // Внутренний комментарий или видимый заявителю
  attachments: text("attachments").array(),
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  entityId: true,
  entityType: true,
  authorId: true,
  authorName: true,
  content: true,
  isInternal: true,
  attachments: true,
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

// Activities schema
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  actionType: text("action_type").notNull(),
  description: text("description").notNull(),
  relatedId: integer("related_id"),
  relatedType: text("related_type"),
  // Для совместимости с нашим логером
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  metadata: jsonb("metadata"),
  action: text("action"),
  timestamp: timestamp("timestamp").defaultNow(),
  blockchainHash: text("blockchain_hash"),
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  userId: true,
  actionType: true,
  description: true,
  relatedId: true,
  relatedType: true,
  blockchainHash: true,
  entityType: true,
  entityId: true,
  metadata: true,
  action: true,
});

// System status schema
export const systemStatus = pgTable("system_status", {
  id: serial("id").primaryKey(),
  serviceName: text("service_name").notNull().unique(),
  status: integer("status").notNull().default(100),
  lastUpdated: timestamp("last_updated").defaultNow(),
  details: text("details"),
});

export const insertSystemStatusSchema = createInsertSchema(systemStatus).pick({
  serviceName: true,
  status: true,
  details: true,
});

// Relations definitions
export const usersRelations = relations(users, ({ many }) => ({
  createdTasks: many(tasks, { relationName: "user_created_tasks" }),
  assignedTasks: many(tasks, { relationName: "user_assigned_tasks" }),
  uploadedDocuments: many(documents),
  messages: many(messages),
  activities: many(activities),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  assignedTo: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
    relationName: "user_assigned_tasks",
  }),
  createdBy: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
    relationName: "user_created_tasks",
  }),
  documents: many(documents),
  blockchainRecords: many(blockchainRecords),
  messages: many(messages),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  task: one(tasks, {
    fields: [documents.taskId],
    references: [tasks.id],
  }),
  uploadedBy: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  blockchainRecords: many(blockchainRecords),
}));

export const blockchainRecordsRelations = relations(blockchainRecords, ({ one }) => ({
  task: one(tasks, {
    fields: [blockchainRecords.taskId],
    references: [tasks.id],
  }),
  document: one(documents, {
    fields: [blockchainRecords.documentId],
    references: [documents.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [messages.taskId],
    references: [tasks.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type BlockchainRecord = typeof blockchainRecords.$inferSelect;
export type InsertBlockchainRecord = z.infer<typeof insertBlockchainRecordSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

// Модели для интеграций и агентов
export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // openproject, planka, telegram, openai, swarm, vllm, ollama
  apiUrl: text("api_url").notNull(),
  apiKey: text("api_key"),
  isActive: boolean("is_active").default(true),
  config: jsonb("config"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIntegrationSchema = createInsertSchema(integrations).pick({
  name: true,
  type: true,
  apiUrl: true,
  apiKey: true,
  isActive: true,
  config: true,
});

export const ministries = pgTable("ministries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  description: text("description"),
  icon: text("icon"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMinistrySchema = createInsertSchema(ministries).pick({
  name: true,
  shortName: true,
  description: true,
  icon: true,
});

export const agentTypes = pgTable("agent_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // citizen_requests, document_processing, analytics, etc.
  description: text("description"),
  icon: text("icon"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAgentTypeSchema = createInsertSchema(agentTypes).pick({
  name: true,
  category: true,
  description: true,
  icon: true,
});

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // accounting, project_management, product_management, notification, etc.
  description: text("description"),
  ministryId: integer("ministry_id").references(() => ministries.id),
  typeId: integer("type_id").references(() => agentTypes.id),
  modelId: integer("model_id").references(() => integrations.id),
  isActive: boolean("is_active").default(true),
  systemPrompt: text("system_prompt"),
  config: jsonb("config"),
  stats: jsonb("stats"), // Статистика использования: количество обращений, экономия времени и т.д.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAgentSchema = createInsertSchema(agents).pick({
  name: true,
  type: true, 
  description: true,
  ministryId: true,
  typeId: true,
  modelId: true,
  isActive: true,
  systemPrompt: true,
  config: true,
  stats: true,
});

// Результаты работы агентов
export const agentResults = pgTable("agent_results", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => agents.id).notNull(),
  entityType: text("entity_type").notNull(),  // citizen_request, document, task
  entityId: integer("entity_id").notNull(),
  actionType: text("action_type").notNull(),   // classification, response, summarization, etc.
  result: jsonb("result").notNull(),
  feedback: text("feedback"),              // positive, negative
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAgentResultSchema = createInsertSchema(agentResults).pick({
  agentId: true,
  entityType: true,
  entityId: true,
  actionType: true,
  result: true,
  feedback: true,
});

export type AgentResult = typeof agentResults.$inferSelect;
export type InsertAgentResult = z.infer<typeof insertAgentResultSchema>;

// База знаний агентов (для RAG)
export const agentKnowledgeBases = pgTable("agent_knowledge_bases", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  agentId: integer("agent_id").references(() => agents.id),
  vectorStorageType: text("vector_storage_type").notNull(), // qdrant, milvus
  vectorStorageUrl: text("vector_storage_url"),
  vectorStorageApiKey: text("vector_storage_api_key"),
  collectionName: text("collection_name").notNull(),
  documentCount: integer("document_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAgentKnowledgeBaseSchema = createInsertSchema(agentKnowledgeBases).pick({
  name: true,
  description: true,
  agentId: true,
  vectorStorageType: true,
  vectorStorageUrl: true,
  vectorStorageApiKey: true,
  collectionName: true,
  documentCount: true,
});

export type AgentKnowledgeBase = typeof agentKnowledgeBases.$inferSelect;
export type InsertAgentKnowledgeBase = z.infer<typeof insertAgentKnowledgeBaseSchema>;

// Документы в базе знаний
export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: serial("id").primaryKey(),
  knowledgeBaseId: integer("knowledge_base_id").references(() => agentKnowledgeBases.id).notNull(),
  externalId: varchar("external_id", { length: 255 }), // ID в векторном хранилище
  title: text("title"),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKnowledgeDocumentSchema = createInsertSchema(knowledgeDocuments).pick({
  knowledgeBaseId: true,
  externalId: true,
  title: true,
  content: true,
  metadata: true,
});

export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type InsertKnowledgeDocument = z.infer<typeof insertKnowledgeDocumentSchema>;

// Схема правил распределения (организационная структура)
export const organizationalRules = pgTable("organizational_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // разработка, поддержка, ИИ, документы, коммунальные_запросы
  isActive: boolean("is_active").default(true),
  sourceType: text("source_type").notNull(), // citizen_request, document, task
  keywordsList: text("keywords_list").array(), // Ключевые слова для сопоставления
  departmentId: integer("department_id").references(() => departments.id),
  assignToAgentId: integer("assign_to_agent_id").references(() => agents.id),
  assignToPositionId: integer("assign_to_position_id").references(() => positions.id),
  config: jsonb("config"), // Дополнительные настройки правила
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrganizationalRuleSchema = createInsertSchema(organizationalRules).pick({
  name: true,
  description: true,
  type: true,
  isActive: true,
  sourceType: true,
  keywordsList: true,
  departmentId: true,
  assignToAgentId: true,
  assignToPositionId: true,
  config: true,
});

// Relations for ministries, agent types, integrations and agents
export const ministriesRelations = relations(ministries, ({ many }) => ({
  agents: many(agents),
}));

export const agentTypesRelations = relations(agentTypes, ({ many }) => ({
  agents: many(agents),
}));

export const integrationsRelations = relations(integrations, ({ many }) => ({
  agents: many(agents),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  parent: one(departments, {
    fields: [departments.parentId],
    references: [departments.id],
  }),
  positions: many(positions),
  rules: many(organizationalRules),
}));

export const positionsRelations = relations(positions, ({ one, many }) => ({
  department: one(departments, {
    fields: [positions.departmentId],
    references: [departments.id],
  }),
}));

export const organizationalRulesRelations = relations(organizationalRules, ({ one }) => ({
  department: one(departments, {
    fields: [organizationalRules.departmentId],
    references: [departments.id],
  }),
  agent: one(agents, {
    fields: [organizationalRules.assignToAgentId],
    references: [agents.id],
  }),
  position: one(positions, {
    fields: [organizationalRules.assignToPositionId],
    references: [positions.id],
  }),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  model: one(integrations, {
    fields: [agents.modelId],
    references: [integrations.id],
  }),
  ministry: one(ministries, {
    fields: [agents.ministryId],
    references: [ministries.id],
  }),
  agentType: one(agentTypes, {
    fields: [agents.typeId],
    references: [agentTypes.id],
  }),
  rules: many(organizationalRules, { relationName: "agent_rules" }),
}));

export type SystemStatusItem = typeof systemStatus.$inferSelect;
export type InsertSystemStatusItem = z.infer<typeof insertSystemStatusSchema>;

export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;

export type Ministry = typeof ministries.$inferSelect;
export type InsertMinistry = z.infer<typeof insertMinistrySchema>;

export type AgentType = typeof agentTypes.$inferSelect;
export type InsertAgentType = z.infer<typeof insertAgentTypeSchema>;

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

export type OrganizationalRule = typeof organizationalRules.$inferSelect;
export type InsertOrganizationalRule = z.infer<typeof insertOrganizationalRuleSchema>;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type Position = typeof positions.$inferSelect;
export type InsertPosition = z.infer<typeof insertPositionSchema>;

// Raw Requests из eOtinish (сырые данные)
export const rawRequests = pgTable("raw_requests", {
  id: serial("id").primaryKey(),
  sourceId: text("source_id").unique(), // Внешний ID из eOtinish
  payload: jsonb("payload").notNull(), // Полный JSON из API
  ingestedAt: timestamp("ingested_at").defaultNow(),
  processed: boolean("processed").default(false), // Обработано ли в task_cards
  error: text("error"), // Ошибка при обработке
});

export const insertRawRequestSchema = createInsertSchema(rawRequests).pick({
  sourceId: true,
  payload: true,
});

export type RawRequest = typeof rawRequests.$inferSelect;
export type InsertRawRequest = z.infer<typeof insertRawRequestSchema>;

// Task Cards - карточки запросов для канбана
export const taskCards = pgTable("task_cards", {
  id: serial("id").primaryKey(),
  rawRequestId: integer("raw_request_id").references(() => rawRequests.id),
  status: text("status").notNull().default("new"), // new, in_progress, awaiting_confirmation, done
  assignedTo: integer("assigned_to"), // User ID
  departmentId: integer("department_id").references(() => departments.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Основная информация о запросе
  title: text("title").notNull(), // Тема запроса 
  fullName: text("full_name").notNull(), // ФИО заявителя
  contactInfo: text("contact_info").notNull(), // Контактная информация
  requestType: text("request_type").notNull(), // Тип обращения
  description: text("description").notNull(), // Текст обращения
  priority: text("priority").default("medium"), // Приоритет
  
  // Поля для AI обработки
  aiProcessed: boolean("ai_processed").default(false),
  aiClassification: text("ai_classification"), // Результат классификации
  aiSuggestion: text("ai_suggestion"), // Предложения от AI
  responseText: text("response_text"), // Сгенерированный ответ
  
  // Поля для отслеживания статуса
  startedAt: timestamp("started_at"), // Когда взято в работу
  completedAt: timestamp("completed_at"), // Когда выполнено
  confirmedAt: timestamp("confirmed_at"), // Когда подтверждено
  deadline: timestamp("deadline"), // Крайний срок
  overdue: boolean("overdue").default(false), // Просрочено
  
  // Блокчейн и история
  blockchainHash: text("blockchain_hash"), // Хэш записи в блокчейне
  
  // Вложения и метаданные
  attachments: text("attachments").array(),
  metadata: jsonb("metadata"), // Доп. информация
  summary: text("summary"), // Краткое содержание (AI)
});

export const insertTaskCardSchema = createInsertSchema(taskCards)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    aiProcessed: true,
    startedAt: true,
    completedAt: true,
    confirmedAt: true,
  });

export type TaskCard = typeof taskCards.$inferSelect;
export type InsertTaskCard = z.infer<typeof insertTaskCardSchema>;

// Для обратной совместимости оставляем таблицу citizen_requests
// Citizen Requests schema
export const citizenRequests = pgTable("citizen_requests", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  contactInfo: text("contact_info").notNull(),
  requestType: text("request_type").notNull(), // reg_type из eOtinish
  subject: text("subject").notNull(),
  description: text("description").notNull(), // text из eOtinish
  status: text("status").notNull().default("new"), // status из eOtinish
  priority: text("priority").default("medium"),
  createdAt: timestamp("created_at").defaultNow(), // соответствует reg_date из eOtinish
  updatedAt: timestamp("updated_at").defaultNow(),
  assignedTo: integer("assigned_to"),
  
  // Поля для AI обработки
  aiProcessed: boolean("ai_processed").default(false),
  aiClassification: text("ai_classification"),
  aiSuggestion: text("ai_suggestion"),
  responseText: text("response_text"),
  
  // Поля для отслеживания статуса
  closedAt: timestamp("closed_at"),
  completedAt: timestamp("completed_at"),
  deadline: timestamp("deadline"), // deadline из eOtinish
  overdue: boolean("overdue").default(false), // overdue из eOtinish
  decision: text("decision"), // decision из eOtinish
  blockchainHash: text("blockchain_hash"), // Хэш записи в блокчейне
  
  // Вложения
  attachments: text("attachments").array(),
  
  // eOtinish-специфические поля
  externalId: text("external_id"), // obr_id из eOtinish
  externalSource: text("external_source").default("internal"), // SOURCE из eOtinish
  externalRegNum: text("external_reg_num"), // reg_num из eOtinish
  region: text("region"), // region из eOtinish
  district: text("district"), // rayon из eOtinish
  locality: text("locality"), // nas_punkt из eOtinish
  category: text("category"), // category из eOtinish
  subcategory: text("subcategory"), // subcategory из eOtinish
  responsibleOrg: text("responsible_org"), // org_name из eOtinish
  externalLoadDate: timestamp("external_load_date"), // SDU_LOAD_DATE из eOtinish
  
  // Дополнительная информация в JSON формате
  citizenInfo: jsonb("citizen_info"), // Доп. информация о гражданине
  summary: text("summary"), // Краткое содержание обращения (AI)
});

// История изменений статусов карточек
export const taskCardHistory = pgTable("task_card_history", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id").references(() => taskCards.id).notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status").notNull(),
  userId: integer("user_id"),
  timestamp: timestamp("timestamp").defaultNow(),
  comment: text("comment"),
  metadata: jsonb("metadata"),
  blockchainHash: text("blockchain_hash"),
});

export const insertTaskCardHistorySchema = createInsertSchema(taskCardHistory).pick({
  cardId: true,
  previousStatus: true,
  newStatus: true,
  userId: true,
  comment: true,
  metadata: true,
  blockchainHash: true,
});

export type TaskCardHistory = typeof taskCardHistory.$inferSelect;
export type InsertTaskCardHistory = z.infer<typeof insertTaskCardHistorySchema>;

// Добавляем отношения для новых таблиц
export const rawRequestsRelations = relations(rawRequests, ({ many }) => ({
  taskCards: many(taskCards),
}));

export const taskCardsRelations = relations(taskCards, ({ one, many }) => ({
  rawRequest: one(rawRequests, {
    fields: [taskCards.rawRequestId],
    references: [rawRequests.id],
  }),
  assignedUser: one(users, {
    fields: [taskCards.assignedTo],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [taskCards.departmentId],
    references: [departments.id],
  }),
  history: many(taskCardHistory),
}));

export const taskCardHistoryRelations = relations(taskCardHistory, ({ one }) => ({
  taskCard: one(taskCards, {
    fields: [taskCardHistory.cardId],
    references: [taskCards.id],
  }),
  user: one(users, {
    fields: [taskCardHistory.userId],
    references: [users.id],
  }),
}));

export const insertCitizenRequestSchema = createInsertSchema(citizenRequests)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    aiProcessed: true,
    closedAt: true,
    completedAt: true,
    externalLoadDate: true
  })
  .pick({
    fullName: true,
    contactInfo: true,
    requestType: true,
    subject: true,
    description: true,
    status: true,
    priority: true,
    assignedTo: true,
    attachments: true,
    citizenInfo: true,
    blockchainHash: true,
    summary: true,
    externalId: true,
    externalSource: true,
    externalRegNum: true,
    region: true,
    district: true,
    locality: true,
    category: true,
    subcategory: true,
    responsibleOrg: true,
    deadline: true,
    overdue: true,
    decision: true,
  });

export const citizenRequestsRelations = relations(citizenRequests, ({ one }) => ({
  assignedUser: one(users, {
    fields: [citizenRequests.assignedTo],
    references: [users.id],
  }),
}));

export type CitizenRequest = typeof citizenRequests.$inferSelect;
export type InsertCitizenRequest = z.infer<typeof insertCitizenRequestSchema>;

// Schema для связей с Planka
export const plankaLinks = pgTable("planka_links", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // citizen_request, task, document
  entityId: integer("entity_id").notNull(),
  cardId: text("card_id").notNull(), // ID карточки в Planka
  boardId: text("board_id").notNull(), // ID доски в Planka
  listId: text("list_id").notNull(), // ID списка в Planka
  projectId: text("project_id").notNull(), // ID проекта в Planka
  createdBy: integer("created_by"), // Пользователь, создавший связь
  createdAt: timestamp("created_at").defaultNow(),
  lastSyncedAt: timestamp("last_synced_at"),
});

export const insertPlankaLinkSchema = createInsertSchema(plankaLinks).pick({
  entityType: true,
  entityId: true,
  cardId: true,
  boardId: true,
  listId: true,
  projectId: true,
  createdBy: true,
  lastSyncedAt: true,
});

export const plankaLinksRelations = relations(plankaLinks, ({ one }) => ({
  createdUser: one(users, {
    fields: [plankaLinks.createdBy],
    references: [users.id],
  }),
}));

export type PlankaLink = typeof plankaLinks.$inferSelect;
export type InsertPlankaLink = z.infer<typeof insertPlankaLinkSchema>;
