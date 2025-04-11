import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  avatarUrl: text("avatar_url"),
  department: text("department"),
  role: text("role").default("user"),
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

export type SystemStatusItem = typeof systemStatus.$inferSelect;
export type InsertSystemStatusItem = z.infer<typeof insertSystemStatusSchema>;
