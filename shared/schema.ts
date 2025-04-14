import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

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
  role: text("role").default("user"),
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
  role: true,
});

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

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // accounting, project_management, product_management, notification, etc.
  description: text("description"),
  modelId: integer("model_id").references(() => integrations.id),
  isActive: boolean("is_active").default(true),
  systemPrompt: text("system_prompt"),
  config: jsonb("config"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAgentSchema = createInsertSchema(agents).pick({
  name: true,
  type: true, 
  description: true,
  modelId: true,
  isActive: true,
  systemPrompt: true,
  config: true,
});

// Relations for integrations and agents
export const integrationsRelations = relations(integrations, ({ many }) => ({
  agents: many(agents),
}));

export const agentsRelations = relations(agents, ({ one }) => ({
  model: one(integrations, {
    fields: [agents.modelId],
    references: [integrations.id],
  }),
}));

export type SystemStatusItem = typeof systemStatus.$inferSelect;
export type InsertSystemStatusItem = z.infer<typeof insertSystemStatusSchema>;

export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

// Citizen Requests schema
export const citizenRequests = pgTable("citizen_requests", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  contactInfo: text("contact_info").notNull(),
  requestType: text("request_type").notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("new"),
  priority: text("priority").default("medium"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  assignedTo: integer("assigned_to"),
  aiProcessed: boolean("ai_processed").default(false),
  aiClassification: text("ai_classification"),
  aiSuggestion: text("ai_suggestion"),
  responseText: text("response_text"),
  closedAt: timestamp("closed_at"),
  completedAt: timestamp("completed_at"),
  blockchainHash: text("blockchain_hash"), // Хэш записи в блокчейне
  attachments: text("attachments").array(),
  citizenInfo: jsonb("citizen_info"), // Доп. информация о гражданине
  summary: text("summary"), // Краткое содержание обращения (AI)
});

export const insertCitizenRequestSchema = createInsertSchema(citizenRequests).pick({
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
});

export const citizenRequestsRelations = relations(citizenRequests, ({ one }) => ({
  assignedUser: one(users, {
    fields: [citizenRequests.assignedTo],
    references: [users.id],
  }),
}));

export type CitizenRequest = typeof citizenRequests.$inferSelect;
export type InsertCitizenRequest = z.infer<typeof insertCitizenRequestSchema>;
