import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  summarizeDocument, 
  analyzeTranscription, 
  processUserMessage, 
  detectLanguage, 
  translateText,
  testOpenAIConnection
} from "./services/openai";
import { 
  recordToBlockchain, 
  getTransactionStatus,
  getEntityTransactions, 
  BlockchainRecordType
} from "./blockchain";
import { 
  logActivity, 
  getRecentActivities, 
  getEntityActivities, 
  getUserActivities 
} from "./activity-logger";
import { registerSystemRoutes } from "./system-api";
import { registerDatabaseRoutes } from "./database-api";
import { registerPlankaRoutes } from "./planka-api";
import { registerLLMMonitoringRoutes } from "./monitoring/llm-monitoring";
import { initializeSettings } from "./services/system-settings";
import { getTaskRules, saveTaskRule, getTaskRuleById, deleteTaskRule, processRequestByOrgStructure } from "./services/org-structure";
import { agentService, AgentTaskType, AgentEntityType } from "./services/agent-service";
import { databaseConnector, DatabaseProvider } from "./services/database-connector";
import { z } from "zod";
import { 
  insertTaskSchema, 
  insertDocumentSchema, 
  insertMessageSchema, 
  insertActivitySchema, 
  insertBlockchainRecordSchema,
  insertIntegrationSchema,
  insertAgentSchema,
  insertCitizenRequestSchema
} from "@shared/schema";
import { ALLOWED_AGENT_TYPES } from "@shared/constants";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      // Documents
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Инициализация настроек системы
  initializeSettings();
  
  // Регистрация системных маршрутов
  registerSystemRoutes(app);
  
  // Регистрация маршрутов мониторинга LLM
  const llmMonitoringRouter = express.Router();
  registerLLMMonitoringRoutes(llmMonitoringRouter);
  app.use(llmMonitoringRouter);
  
  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // User routes
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const user = await storage.getUserByUsername(username);
    
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // In a real app, we would use proper sessions or JWT
    // For this MVP, we'll just return the user info
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  });

  // Task routes
  app.get('/api/tasks', async (req, res) => {
    const tasks = await storage.getTasks();
    res.json(tasks);
  });
  
  app.get('/api/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    const task = await storage.getTask(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  });
  
  app.post('/api/tasks', async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      
      // Create activity record
      await storage.createActivity({
        userId: taskData.createdBy,
        actionType: 'task_created',
        description: `Created task "${task.title}"`,
        relatedId: task.id,
        relatedType: 'task'
      });
      
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.patch('/api/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    try {
      const updateData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(id, updateData);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Document routes
  app.get('/api/documents', async (req, res) => {
    const documents = await storage.getDocuments();
    res.json(documents);
  });
  
  app.get('/api/documents/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
    const document = await storage.getDocument(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(document);
  });
  
  app.get('/api/tasks/:taskId/documents', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    const documents = await storage.getDocumentsByTask(taskId);
    res.json(documents);
  });
  
  app.post('/api/documents', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    try {
      const documentData = insertDocumentSchema.parse({
        ...req.body,
        fileUrl: `/uploads/${req.file.filename}`,
        taskId: req.body.taskId ? parseInt(req.body.taskId) : null,
        uploadedBy: parseInt(req.body.uploadedBy),
        fileType: req.file.mimetype
      });
      
      const document = await storage.createDocument(documentData);
      
      // Create activity record
      await storage.createActivity({
        userId: document.uploadedBy,
        actionType: 'document_uploaded',
        description: `Uploaded document "${document.title}"`,
        relatedId: document.id,
        relatedType: 'document'
      });
      
      res.json(document);
    } catch (error) {
      // Remove uploaded file if there's an error
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(400).json({ error: error.message });
    }
  });
  
  // Document processing route
  app.post('/api/documents/:id/process', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
    const document = await storage.getDocument(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    try {
      // In a real app, we would extract text from the document
      // For this MVP, we'll use the provided text content
      const { text, userId } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Document text is required' });
      }
      
      // Detect language
      const language = await detectLanguage(text);
      
      // Generate summary
      const summary = await summarizeDocument(text, language as any);
      
      // Update document with summary
      const updatedDocument = await storage.updateDocument(id, {
        summary,
        processed: true
      });
      
      // Create blockchain record
      const blockchainData = {
        type: 'document_processed',
        title: document.title,
        content: summary,
        metadata: {
          documentId: document.id,
          taskId: document.taskId
        }
      };
      
      const blockchainResult = await recordToBlockchain(blockchainData);
      
      // Create blockchain record
      const blockchainRecord = await storage.createBlockchainRecord({
        recordType: 'document_summary',
        title: document.title,
        taskId: document.taskId,
        documentId: document.id,
        transactionHash: blockchainResult.transactionHash,
        status: blockchainResult.status,
        metadata: {
          summary
        }
      });
      
      // Create activity
      await storage.createActivity({
        userId: userId || 1,
        actionType: 'document_processed',
        description: `Processed document "${document.title}"`,
        relatedId: document.id,
        relatedType: 'document',
        blockchainHash: blockchainResult.transactionHash
      });
      
      res.json({
        document: updatedDocument,
        summary,
        blockchain: {
          transactionHash: blockchainResult.transactionHash,
          status: blockchainResult.status
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Transcription processing route
  app.post('/api/transcriptions/analyze', async (req, res) => {
    try {
      const { transcription, userId, taskId } = req.body;
      
      if (!transcription) {
        return res.status(400).json({ error: 'Transcription text is required' });
      }
      
      // Analyze transcription
      const analysis = await analyzeTranscription(transcription);
      
      // Create blockchain record for the analysis
      const blockchainData = {
        type: 'transcription_analyzed',
        title: 'Transcription Analysis',
        content: analysis.summary,
        metadata: {
          keyPoints: analysis.keyPoints,
          decisions: analysis.decisions,
          actionItems: analysis.actionItems,
          taskId
        }
      };
      
      const blockchainResult = await recordToBlockchain(blockchainData);
      
      // Create blockchain record
      const blockchainRecord = await storage.createBlockchainRecord({
        recordType: 'transcription_analysis',
        title: 'Transcription Analysis',
        taskId: taskId ? parseInt(taskId) : null,
        transactionHash: blockchainResult.transactionHash,
        status: blockchainResult.status,
        metadata: {
          analysis
        }
      });
      
      // Create activity
      await storage.createActivity({
        userId: userId || 1,
        actionType: 'transcription_analyzed',
        description: 'Analyzed meeting transcription',
        relatedId: taskId ? parseInt(taskId) : null,
        relatedType: 'task',
        blockchainHash: blockchainResult.transactionHash
      });
      
      res.json({
        analysis,
        blockchain: {
          transactionHash: blockchainResult.transactionHash,
          status: blockchainResult.status
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Chat message routes
  app.get('/api/tasks/:taskId/messages', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    const messages = await storage.getMessagesByTask(taskId);
    res.json(messages);
  });
  
  app.post('/api/messages', async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      
      // If this is a user message, generate AI response
      if (messageData.role === 'user') {
        // Get chat history
        const chatHistory = await storage.getMessagesByTask(messageData.taskId);
        const formattedHistory = chatHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        // Process with OpenAI
        const aiResponse = await processUserMessage(
          messageData.content,
          formattedHistory
        );
        
        // Create AI response message
        const aiMessage = await storage.createMessage({
          role: 'assistant',
          content: aiResponse,
          taskId: messageData.taskId
        });
        
        return res.json({
          userMessage: message,
          aiResponse: aiMessage
        });
      }
      
      res.json(message);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Blockchain routes
  app.get('/api/blockchain/records', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const records = await storage.getRecentBlockchainRecords(limit);
      
      // Логируем активность просмотра записей блокчейн
      await logActivity({
        action: 'view_list',
        entityType: 'blockchain_record',
        userId: req.session?.userId,
        details: `Просмотр списка записей блокчейн (последние ${limit})`
      });
      
      res.json(records);
    } catch (error) {
      console.error('Error getting blockchain records:', error);
      res.status(500).json({ error: 'Failed to get blockchain records' });
    }
  });
  
  // Получение записей блокчейна для конкретной сущности
  app.get('/api/blockchain/records/entity/:type/:id', async (req, res) => {
    try {
      const entityType = req.params.type;
      const entityId = parseInt(req.params.id);
      
      if (isNaN(entityId)) {
        return res.status(400).json({ error: 'Invalid entity ID' });
      }
      
      // Получаем записи, используя новые поля entityType и entityId
      const allRecords = await storage.getBlockchainRecords();
      const entityRecords = allRecords.filter(record => 
        record.entityType === entityType && record.entityId === entityId
      );
      
      // Логируем активность
      await logActivity({
        action: 'view_entity_records',
        entityType: entityType,
        entityId: entityId,
        userId: req.session?.userId,
        details: `Просмотр записей блокчейн для ${entityType} #${entityId}`
      });
      
      res.json(entityRecords);
    } catch (error) {
      console.error('Error getting entity blockchain records:', error);
      res.status(500).json({ error: 'Failed to get entity blockchain records' });
    }
  });
  
  app.post('/api/blockchain/verify', async (req, res) => {
    const { transactionHash } = req.body;
    
    if (!transactionHash) {
      return res.status(400).json({ error: 'Transaction hash is required' });
    }
    
    try {
      const verificationResult = await verifyBlockchainRecord(transactionHash);
      
      // Логируем активность проверки
      await logActivity({
        action: 'blockchain_verify',
        entityType: 'transaction',
        userId: req.session?.userId,
        details: `Проверка транзакции блокчейн: ${transactionHash}`,
        metadata: {
          transactionHash,
          verified: verificationResult.verified
        }
      });
      
      res.json(verificationResult);
    } catch (error) {
      console.error('Error verifying blockchain record:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/blockchain/transaction/:hash', async (req, res) => {
    try {
      const transactionHash = req.params.hash;
      
      if (!transactionHash) {
        return res.status(400).json({ error: 'Transaction hash is required' });
      }
      
      // Получаем детали транзакции из Moralis API
      const transactionDetails = await getTransactionDetails(transactionHash);
      
      // Логируем активность
      await logActivity({
        action: 'blockchain_transaction_view',
        entityType: 'transaction',
        userId: req.session?.userId,
        details: `Просмотр деталей транзакции: ${transactionHash}`
      });
      
      res.json(transactionDetails);
    } catch (error) {
      console.error('Error getting transaction details:', error);
      res.status(500).json({ error: 'Failed to get transaction details' });
    }
  });
  
  app.post('/api/blockchain/record', async (req, res) => {
    try {
      const { type, title, content, metadata, userId, taskId, documentId, entityType, entityId } = req.body;
      
      if (!type || !title || !content) {
        return res.status(400).json({ error: 'Type, title and content are required' });
      }
      
      // Record to blockchain
      const blockchainData = {
        type,
        title,
        content,
        metadata
      };
      
      const blockchainResult = await recordToBlockchain(blockchainData);
      
      // Create blockchain record with updated schema
      const blockchainRecord = await storage.createBlockchainRecord({
        recordType: type,
        title,
        taskId: taskId ? parseInt(taskId) : null,
        documentId: documentId ? parseInt(documentId) : null,
        // Новые поля для универсальности
        entityType: entityType || type,
        entityId: entityId ? parseInt(entityId) : null,
        transactionHash: blockchainResult.transactionHash,
        status: blockchainResult.status,
        metadata: {
          content,
          ...metadata
        }
      });
      
      // Логируем активность с использованием нового логера
      await logActivity({
        action: 'blockchain_record_created',
        entityType: entityType || type,
        entityId: entityId ? parseInt(entityId) : blockchainRecord.id,
        userId: userId ? parseInt(userId) : req.session?.userId,
        details: `Создана запись в блокчейне: "${title}"`,
        metadata: {
          transactionHash: blockchainResult.transactionHash,
          status: blockchainResult.status,
          recordId: blockchainRecord.id
        }
      });
      
      res.json({
        record: blockchainRecord,
        blockchain: blockchainResult
      });
    } catch (error) {
      console.error('Error creating blockchain record:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Activity routes
  app.get('/api/activities', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getRecentActivities(limit);
      
      // Логируем просмотр активности (метаданные о просмотре)
      await logActivity({
        action: 'view_activities',
        entityType: 'activity',
        userId: req.session?.userId,
        details: `Просмотр журнала активности (${limit} записей)`
      });
      
      res.json(activities);
    } catch (error) {
      console.error('Error getting activities:', error);
      res.status(500).json({ error: 'Failed to get activities' });
    }
  });
  
  // API для получения активности конкретной сущности
  app.get('/api/activities/entity/:type/:id', async (req, res) => {
    try {
      const entityType = req.params.type;
      const entityId = parseInt(req.params.id);
      
      if (isNaN(entityId)) {
        return res.status(400).json({ error: 'Invalid entity ID' });
      }
      
      // Получаем активности через функцию из лoггера
      const activities = await getEntityActivities(entityType, entityId);
      
      // Логируем просмотр активности для конкретной сущности
      await logActivity({
        action: 'view_entity_activities',
        entityType: entityType,
        entityId: entityId,
        userId: req.session?.userId,
        details: `Просмотр истории активности для ${entityType} #${entityId}`
      });
      
      res.json(activities);
    } catch (error) {
      console.error('Error getting entity activities:', error);
      res.status(500).json({ error: 'Failed to get entity activities' });
    }
  });
  
  // API для получения активности пользователя
  app.get('/api/activities/user/:id', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      
      // Получаем активности пользователя
      const activities = await getUserActivities(userId);
      
      // Логируем просмотр активности пользователя
      await logActivity({
        action: 'view_user_activities',
        entityType: 'user',
        entityId: userId,
        userId: req.session?.userId,
        details: `Просмотр активности пользователя #${userId}`
      });
      
      res.json(activities);
    } catch (error) {
      console.error('Error getting user activities:', error);
      res.status(500).json({ error: 'Failed to get user activities' });
    }
  });

  // System status routes
  app.get('/api/system/status', async (req, res) => {
    const statuses = await storage.getSystemStatuses();
    res.json(statuses);
  });
  
  // API Connection Test endpoint
  app.post('/api/integrations/test', async (req, res) => {
    try {
      const { type, apiKey } = req.body;
      
      if (!type) {
        return res.status(400).json({ error: 'Integration type is required' });
      }
      
      let success = false;
      let message = '';
      
      // Test based on integration type
      switch (type) {
        case 'openai':
          success = await testOpenAIConnection(apiKey);
          message = success ? 'OpenAI API connection successful' : 'OpenAI API connection failed';
          break;
        case 'moralis':
          success = await testMoralisConnection(apiKey);
          message = success ? 'Moralis API connection successful' : 'Moralis API connection failed';
          break;
        default:
          return res.status(400).json({ error: 'Unsupported integration type' });
      }
      
      // Log the test activity
      await logActivity({
        action: 'integration_test',
        entityType: 'integration',
        details: `Tested ${type} integration connection`,
        metadata: { success, type }
      });
      
      return res.json({ success, message });
    } catch (error) {
      console.error('Error testing integration:', error);
      return res.status(500).json({ error: 'Failed to test integration connection' });
    }
  });

  app.post('/api/system/status', async (req, res) => {
    const { serviceName, status, details } = req.body;
    
    if (!serviceName || status === undefined) {
      return res.status(400).json({ error: 'Service name and status are required' });
    }
    
    try {
      const updatedStatus = await storage.updateSystemStatus(serviceName, {
        serviceName,
        status,
        details
      });
      
      res.json(updatedStatus);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Translation route
  app.post('/api/translate', async (req, res) => {
    const { text, from, to } = req.body;
    
    if (!text || !from || !to) {
      return res.status(400).json({ error: 'Text, source and target languages are required' });
    }
    
    try {
      const translatedText = await translateText(text, from, to);
      res.json({ translatedText });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Integration routes
  app.get('/api/integrations', async (req, res) => {
    try {
      const integrations = await storage.getIntegrations();
      res.json(integrations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/integrations/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid integration ID' });
    }
    
    try {
      const integration = await storage.getIntegration(id);
      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }
      
      res.json(integration);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/integrations/type/:type', async (req, res) => {
    const { type } = req.params;
    
    try {
      const integrations = await storage.getIntegrationsByType(type);
      res.json(integrations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/integrations', async (req, res) => {
    try {
      const integrationData = insertIntegrationSchema.parse(req.body);
      const integration = await storage.createIntegration(integrationData);
      
      // Create activity record
      await storage.createActivity({
        userId: req.body.userId || 1,
        actionType: 'integration_created',
        description: `Created integration "${integration.name}"`,
        relatedId: integration.id,
        relatedType: 'integration'
      });
      
      res.json(integration);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch('/api/integrations/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid integration ID' });
    }
    
    try {
      const updateData = insertIntegrationSchema.partial().parse(req.body);
      const integration = await storage.updateIntegration(id, updateData);
      
      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }
      
      // Create activity record
      await storage.createActivity({
        userId: req.body.userId || 1,
        actionType: 'integration_updated',
        description: `Updated integration "${integration.name}"`,
        relatedId: integration.id,
        relatedType: 'integration'
      });
      
      res.json(integration);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/integrations/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid integration ID' });
    }
    
    try {
      const integration = await storage.getIntegration(id);
      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }
      
      const deleted = await storage.deleteIntegration(id);
      
      // Create activity record
      await storage.createActivity({
        userId: req.body.userId || 1,
        actionType: 'integration_deleted',
        description: `Deleted integration "${integration.name}"`,
        relatedType: 'integration'
      });
      
      res.json({ success: deleted });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Agent routes
  app.get('/api/agents', async (req, res) => {
    try {
      const allAgents = await storage.getAgents();
      // Фильтруем только разрешенные типы агентов
      const filteredAgents = allAgents.filter(agent => ALLOWED_AGENT_TYPES.includes(agent.type));
      res.json(filteredAgents);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/agents/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid agent ID' });
    }
    
    try {
      const agent = await storage.getAgent(id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      res.json(agent);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/agents/type/:type', async (req, res) => {
    const { type } = req.params;
    
    // Проверяем, является ли тип разрешенным
    if (!ALLOWED_AGENT_TYPES.includes(type)) {
      return res.status(404).json({ error: 'Тип агента не найден или не разрешен' });
    }
    
    try {
      const agents = await storage.getAgentsByType(type);
      res.json(agents);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/agents', async (req, res) => {
    try {
      const agentData = insertAgentSchema.parse(req.body);
      const agent = await storage.createAgent(agentData);
      
      // Create activity record
      await storage.createActivity({
        userId: req.body.userId || 1,
        actionType: 'agent_created',
        description: `Created agent "${agent.name}"`,
        relatedId: agent.id,
        relatedType: 'agent'
      });
      
      res.json(agent);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch('/api/agents/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid agent ID' });
    }
    
    try {
      const updateData = insertAgentSchema.partial().parse(req.body);
      const agent = await storage.updateAgent(id, updateData);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      // Create activity record
      await storage.createActivity({
        userId: req.body.userId || 1,
        actionType: 'agent_updated',
        description: `Updated agent "${agent.name}"`,
        relatedId: agent.id,
        relatedType: 'agent'
      });
      
      res.json(agent);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/agents/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid agent ID' });
    }
    
    try {
      const agent = await storage.getAgent(id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      const deleted = await storage.deleteAgent(id);
      
      // Create activity record
      await storage.createActivity({
        userId: req.body.userId || 1,
        actionType: 'agent_deleted',
        description: `Deleted agent "${agent.name}"`,
        relatedType: 'agent'
      });
      
      res.json({ success: deleted });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Citizen Request routes
  app.get('/api/citizen-requests', async (req, res) => {
    try {
      const requests = await storage.getCitizenRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/citizen-requests/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }
    
    try {
      const request = await storage.getCitizenRequest(id);
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }
      
      res.json(request);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/citizen-requests', async (req, res) => {
    try {
      const requestData = insertCitizenRequestSchema.parse(req.body);
      const request = await storage.createCitizenRequest(requestData);
      
      // Create activity record
      await storage.createActivity({
        actionType: 'citizen_request_created',
        description: `Обращение от ${request.fullName}`,
        relatedId: request.id,
        relatedType: 'citizen_request'
      });
      
      // Auto-process with AI if enabled
      const agentEnabled = await storage.getAgentsByType("citizen_requests")
        .then(agents => agents.length > 0 ? agents[0].isActive : false);
      
      if (agentEnabled) {
        // Process with AI asynchronously
        storage.processCitizenRequestWithAI(request.id);
      }
      
      res.json(request);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch('/api/citizen-requests/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }
    
    try {
      const updateData = insertCitizenRequestSchema.partial().parse(req.body);
      const request = await storage.updateCitizenRequest(id, updateData);
      
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }
      
      // Create activity for status changes
      if (updateData.status) {
        await storage.createActivity({
          actionType: 'citizen_request_status_changed',
          description: `Статус обращения изменен на "${updateData.status}"`,
          relatedId: request.id,
          relatedType: 'citizen_request'
        });
      }
      
      res.json(request);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Organization structure and task rules API
  app.get('/api/task-rules', async (req, res) => {
    try {
      const rules = await getTaskRules();
      res.json(rules);
    } catch (error) {
      console.error('Error fetching task rules:', error);
      res.status(500).json({ error: 'Failed to fetch task rules', details: error.message });
    }
  });
  
  app.get('/api/task-rules/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid rule ID' });
      }
      
      const rule = await getTaskRuleById(id);
      if (!rule) {
        return res.status(404).json({ error: 'Rule not found' });
      }
      
      res.json(rule);
    } catch (error) {
      console.error('Error fetching task rule:', error);
      res.status(500).json({ error: 'Failed to fetch task rule', details: error.message });
    }
  });
  
  app.post('/api/task-rules', async (req, res) => {
    try {
      const rule = req.body;
      const savedRule = await saveTaskRule(rule);
      res.status(201).json(savedRule);
    } catch (error) {
      console.error('Error creating task rule:', error);
      res.status(500).json({ error: 'Failed to create task rule', details: error.message });
    }
  });
  
  app.patch('/api/task-rules/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid rule ID' });
      }
      
      const rule = { ...req.body, id };
      const savedRule = await saveTaskRule(rule);
      res.json(savedRule);
    } catch (error) {
      console.error('Error updating task rule:', error);
      res.status(500).json({ error: 'Failed to update task rule', details: error.message });
    }
  });
  
  app.delete('/api/task-rules/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid rule ID' });
      }
      
      const result = await deleteTaskRule(id);
      if (result) {
        res.status(204).end();
      } else {
        res.status(404).json({ error: 'Rule not found' });
      }
    } catch (error) {
      console.error('Error deleting task rule:', error);
      res.status(500).json({ error: 'Failed to delete task rule', details: error.message });
    }
  });
  
  // Process citizen request by organization structure
  app.post('/api/citizen-requests/:id/process-by-org-structure', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid request ID' });
      }
      
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Request text is required' });
      }
      
      const result = await processRequestByOrgStructure(id, text);
      res.json(result);
    } catch (error) {
      console.error('Error processing request by org structure:', error);
      res.status(500).json({ error: 'Failed to process request by org structure', details: error.message });
    }
  });

  // Process citizen request with AI
  app.post('/api/citizen-requests/:id/process', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }
    
    try {
      // Используем импортированные модули
      
      // Получаем обращение гражданина
      const request = await storage.getCitizenRequest(id);
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }
      
      // Проверяем инициализацию сервиса агентов
      if (!agentService.initialized) {
        await agentService.initialize();
      }
      
      // Формируем содержимое для обработки
      const content = `Тема: ${request.subject || request.title || ''}
      
      Описание:
      ${request.description || request.content || ''}
      
      Контактная информация:
      ФИО: ${request.fullName}
      Контакты: ${request.contactInfo}`;
      
      // Обрабатываем запрос с использованием организационной структуры
      const fullText = `${request.subject || ''} ${request.description || ''}`;
      const orgStructureResult = await processRequestByOrgStructure(id, fullText);
      
      // Обновляем обращение, если оно было успешно обработано по организационной структуре
      if (orgStructureResult.processed) {
        await storage.updateCitizenRequest(id, {
          assignedTo: orgStructureResult.rule?.positionId || null,
          departmentId: orgStructureResult.rule?.departmentId || null,
          status: 'assigned',
          // Добавляем информацию о правиле распределения
          metadata: {
            ...request.metadata,
            orgStructureRule: orgStructureResult.rule?.id,
            orgStructureRuleName: orgStructureResult.rule?.name,
            autoAssigned: true
          }
        });
        
        // Логируем активность назначения по организационной структуре
        await logActivity({
          action: 'auto_assign',
          entityType: 'citizen_request',
          entityId: id,
          details: `Обращение автоматически назначено согласно правилу "${orgStructureResult.rule?.name}"`,
          metadata: {
            ruleId: orgStructureResult.rule?.id,
            departmentId: orgStructureResult.rule?.departmentId,
            positionId: orgStructureResult.rule?.positionId
          }
        });
      }
      
      // Обрабатываем запрос с помощью AI-агента - сначала классификация
      const classificationResult = await agentService.processRequest({
        taskType: AgentTaskType.CLASSIFICATION,
        entityType: AgentEntityType.CITIZEN_REQUEST,
        entityId: request.id,
        content,
        userId: req.session?.userId || request.assignedTo || 1
      });
      
      // Затем генерация ответа с учетом результата классификации
      const responseResult = await agentService.processRequest({
        taskType: AgentTaskType.RESPONSE_GENERATION,
        entityType: AgentEntityType.CITIZEN_REQUEST,
        entityId: request.id,
        content,
        metadata: {
          classification: classificationResult.classification
        },
        userId: req.session?.userId || request.assignedTo || 1
      });
      
      // Обновляем обращение в хранилище с результатами обработки
      const updatedRequest = await storage.updateCitizenRequest(id, {
        aiProcessed: true,
        aiClassification: classificationResult.classification,
        aiSuggestion: responseResult.output,
        summary: classificationResult.output
      });
      
      // Create activity record
      await storage.createActivity({
        userId: req.session?.userId || 1,
        actionType: 'ai_process',
        description: `Запрос гражданина обработан AI-агентом`,
        relatedId: request.id,
        relatedType: 'citizen_request',
        metadata: {
          classification: classificationResult.classification,
          transactionHash: responseResult.transactionHash
        }
      });
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error processing citizen request with AI:", error);
      res.status(500).json({ error: error.message || "Ошибка обработки запроса" });
    }
  });

  // Documentolog integration route
  app.post('/api/documents/documentolog', async (req, res) => {
    try {
      const { docId, taskId, userId } = req.body;
      
      if (!docId) {
        return res.status(400).json({ error: 'Documentolog document ID is required' });
      }
      
      // В реальной реализации здесь будет запрос к API documentolog.com
      // Для MVP имитируем получение данных
      const documentData = {
        title: `Документ Documentolog #${docId}`,
        fileType: 'application/pdf', 
        taskId: taskId ? parseInt(taskId) : null,
        fileUrl: `https://documentolog.com/api/documents/${docId}`,
        uploadedBy: userId ? parseInt(userId) : 1,
        processed: false
      };
      
      const document = await storage.createDocument(documentData);
      
      // Create activity record
      await storage.createActivity({
        userId: document.uploadedBy,
        actionType: 'document_imported',
        description: `Импортирован документ "${document.title}" из Documentolog`,
        relatedId: document.id,
        relatedType: 'document'
      });
      
      res.json({
        success: true,
        document,
        message: 'Document imported successfully from Documentolog'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Тестовые эндпоинты для интеграций
  app.get('/api/integrations/test', async (req, res) => {
    const type = req.query.type as string;
    const apiKey = req.query.apiKey as string;
    
    if (!type) {
      return res.status(400).json({ error: 'Integration type is required' });
    }
    
    try {
      if (type === 'moralis' || type === 'blockchain') {
        // Тестируем Moralis API
        const isConnected = await testMoralisConnection(apiKey);
        
        return res.json({
          success: isConnected,
          message: isConnected 
            ? 'Successfully connected to Moralis API' 
            : 'Failed to connect to Moralis API'
        });
      } else if (type === 'openai') {
        // Тестируем OpenAI API
        const isConnected = await testOpenAIConnection(apiKey);
        
        return res.json({
          success: isConnected,
          message: isConnected 
            ? 'Successfully connected to OpenAI API' 
            : 'Failed to connect to OpenAI API'
        });
      } else {
        return res.status(400).json({ 
          error: 'Unsupported integration type',
          message: `Integration type '${type}' is not supported for testing`
        });
      }
    } catch (error) {
      console.error(`Error testing ${type} integration:`, error);
      return res.status(500).json({ 
        error: 'Integration test failed',
        message: error.message 
      });
    }
  });
  
  // Обработка протоколов встреч через AI-агентов
  app.post('/api/protocols/:id/process', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid protocol ID' });
    }
    
    try {
      // Используем импортированные модули
      
      // Получаем протокол из базы
      const protocol = await storage.getProtocol(id);
      if (!protocol) {
        return res.status(404).json({ error: 'Protocol not found' });
      }
      
      // Проверяем инициализацию сервиса агентов
      if (!agentService.initialized) {
        await agentService.initialize();
      }
      
      // Формируем содержимое для обработки
      const content = `Протокол совещания: ${protocol.title}
      
      Дата: ${new Date(protocol.date).toLocaleDateString('ru-RU')}
      Участники: ${protocol.participants}
      
      Содержание:
      ${protocol.content}`;
      
      // Анализируем протокол совещания
      const analysisResult = await agentService.processRequest({
        taskType: AgentTaskType.DOCUMENT_ANALYSIS,
        entityType: AgentEntityType.PROTOCOL,
        entityId: protocol.id,
        content,
        userId: req.session?.userId || protocol.createdBy || 1
      });
      
      // Создаем краткое содержание
      const summaryResult = await agentService.processRequest({
        taskType: AgentTaskType.SUMMARIZATION,
        entityType: AgentEntityType.PROTOCOL,
        entityId: protocol.id,
        content,
        userId: req.session?.userId || protocol.createdBy || 1
      });
      
      // Обновляем протокол в базе данных
      const updatedProtocol = await storage.updateProtocol(id, {
        aiProcessed: true,
        summary: summaryResult.summary,
        analysis: JSON.stringify(analysisResult.analysis || {}),
        tasks: [], // Здесь можно добавить извлеченные задачи
        decisions: [] // И решения
      });
      
      // Создаем запись активности
      await storage.createActivity({
        userId: req.session?.userId || protocol.createdBy || 1,
        actionType: 'ai_process',
        description: `Протокол "${protocol.title}" обработан AI-агентом`,
        relatedId: protocol.id,
        relatedType: 'protocol',
        metadata: {
          transactionHash: analysisResult.transactionHash || summaryResult.transactionHash
        }
      });
      
      res.json({
        success: true,
        protocol: updatedProtocol,
        summary: summaryResult.summary,
        analysis: analysisResult.analysis,
        transactionHash: analysisResult.transactionHash || summaryResult.transactionHash
      });
    } catch (error) {
      console.error("Error processing protocol with AI:", error);
      res.status(500).json({ 
        error: 'Protocol processing failed',
        message: error.message || "Ошибка при обработке протокола"
      });
    }
  });
  
  // Тестовая запись в блокчейн через Moralis API
  app.post('/api/blockchain/test-record', async (req, res) => {
    try {
      // Получаем API ключ из запроса или из окружения
      const { apiKey, testData } = req.body;
      
      // Генерируем тестовые данные, если не предоставлены
      const data = testData || {
        type: BlockchainRecordType.SYSTEM_EVENT,
        title: 'Test Blockchain Record',
        content: `Test record created at ${new Date().toISOString()}`,
        metadata: {
          isTest: true,
          timestamp: Date.now(),
          source: 'API Test'
        }
      };
      
      console.log('Attempting to create test blockchain record:', data);
      
      // Записываем данные в блокчейн
      const blockchainResult = await recordToBlockchain(data);
      
      // Создаем запись в локальном хранилище
      const blockchainRecord = await storage.createBlockchainRecord({
        recordType: data.type,
        title: data.title,
        entityType: 'test',
        transactionHash: blockchainResult.transactionHash,
        status: blockchainResult.status,
        metadata: {
          content: data.content,
          ...data.metadata
        }
      });
      
      // Логируем активность
      await logActivity({
        action: 'blockchain_test_record',
        entityType: 'test',
        entityId: blockchainRecord.id,
        userId: req.session?.userId || 1,
        details: 'Created test blockchain record',
        metadata: {
          transactionHash: blockchainResult.transactionHash,
          status: blockchainResult.status
        }
      });
      
      res.json({
        success: true,
        message: 'Test record successfully created in blockchain',
        record: blockchainRecord,
        blockchain: blockchainResult
      });
    } catch (error) {
      console.error('Error creating test blockchain record:', error);
      res.status(500).json({ 
        error: 'Failed to create test record',
        message: error.message 
      });
    }
  });

  // Обработка документов через AI-агенты
  app.post('/api/documents/:id/process', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
    try {
      // Используем импортированный сервис агентов
      
      // Получаем документ из базы
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Проверяем инициализацию сервиса агентов
      if (!agentService.initialized) {
        await agentService.initialize();
      }
      
      // Формируем содержимое для обработки - в реальной системе здесь будет
      // извлечение текста из файла, загрузка содержимого и т.д.
      const content = `Документ: ${document.title}
      
      Тип файла: ${document.fileType}
      Описание: ${document.description || 'Нет описания'}
      
      Содержание:
      ${document.content || 'Содержимое документа не доступно в текстовом виде'}`;
      
      // Анализируем документ
      const analysisResult = await agentService.processRequest({
        taskType: AgentTaskType.DOCUMENT_ANALYSIS,
        entityType: AgentEntityType.DOCUMENT,
        entityId: document.id,
        content,
        userId: req.session?.userId || document.uploadedBy || 1
      });
      
      // Обновляем документ в базе данных
      const updatedDocument = await storage.updateDocument(id, {
        processed: true,
        analysis: JSON.stringify(analysisResult.analysis || {}),
        summary: analysisResult.summary || ''
      });
      
      // Создаем запись активности
      await storage.createActivity({
        userId: req.session?.userId || document.uploadedBy || 1,
        actionType: 'ai_process',
        description: `Документ "${document.title}" обработан AI-агентом`,
        relatedId: document.id,
        relatedType: 'document',
        metadata: {
          transactionHash: analysisResult.transactionHash
        }
      });
      
      // Запись в блокчейн для ведения аудита
      const blockchainData = {
        type: BlockchainRecordType.DOCUMENT,
        title: `Document Analysis: ${document.title}`,
        content: JSON.stringify({
          documentId: document.id,
          documentTitle: document.title,
          analysis: analysisResult.analysis,
          summary: analysisResult.summary
        }),
        metadata: {
          timestamp: new Date().toISOString(),
          userId: req.session?.userId || document.uploadedBy || 1,
          source: 'document_analysis'
        }
      };
      
      const blockchainResult = await recordToBlockchain(blockchainData);
      
      res.json({
        success: true,
        document: updatedDocument,
        analysis: analysisResult.analysis,
        transactionHash: analysisResult.transactionHash || blockchainResult.transactionHash
      });
    } catch (error) {
      console.error("Error processing document with AI:", error);
      res.status(500).json({ 
        error: 'Document processing failed',
        message: error.message || "Ошибка при обработке документа"
      });
    }
  });
  
  // Обработка задач через AI-агенты
  app.post('/api/tasks/:id/process', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    try {
      // Используем импортированный сервис агентов
      
      // Получаем задачу из базы данных
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      // Проверяем инициализацию сервиса агентов
      if (!agentService.initialized) {
        await agentService.initialize();
      }
      
      // Формируем содержимое для обработки
      const content = `Задача: ${task.title}
      
      Описание: ${task.description || 'Нет описания'}
      Приоритет: ${task.priority || 'Средний'}
      Статус: ${task.status}
      Срок выполнения: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('ru-RU') : 'Не указан'}
      Исполнитель: ${task.assignedTo || 'Не назначен'}
      
      Дополнительная информация:
      ${task.additionalInfo || 'Нет дополнительной информации'}`;
      
      // Анализируем задачу
      const analysisResult = await agentService.processRequest({
        taskType: AgentTaskType.DOCUMENT_ANALYSIS,
        entityType: AgentEntityType.TASK,
        entityId: task.id,
        content,
        userId: req.session?.userId || task.createdBy || 1
      });
      
      // Создаем рекомендации
      const recommendationsResult = await agentService.processRequest({
        taskType: AgentTaskType.RESPONSE_GENERATION,
        entityType: AgentEntityType.TASK,
        entityId: task.id,
        content,
        metadata: {
          analysis: analysisResult.analysis
        },
        userId: req.session?.userId || task.createdBy || 1
      });
      
      // Обновляем задачу в базе данных
      const updatedTask = await storage.updateTask(id, {
        aiProcessed: true,
        aiSuggestion: recommendationsResult.output,
        lastAiProcessing: new Date()
      });
      
      // Создаем запись активности
      await storage.createActivity({
        userId: req.session?.userId || task.createdBy || 1,
        actionType: 'ai_process',
        description: `Задача "${task.title}" обработана AI-агентом`,
        relatedId: task.id,
        relatedType: 'task',
        metadata: {
          transactionHash: recommendationsResult.transactionHash
        }
      });
      
      res.json({
        success: true,
        task: updatedTask,
        recommendations: recommendationsResult.output,
        analysis: analysisResult.analysis,
        transactionHash: recommendationsResult.transactionHash
      });
    } catch (error) {
      console.error("Error processing task with AI:", error);
      res.status(500).json({ 
        error: 'Task processing failed',
        message: error.message || "Ошибка при обработке задачи"
      });
    }
  });
  
  // Обработка предложений DAO через AI-агенты и запись в блокчейн
  app.post('/api/dao/proposals/:id/process', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid proposal ID' });
    }
    
    try {
      // Используем импортированный сервис агентов
      
      // Получаем предложение DAO из базы данных
      const proposal = await storage.getDAOProposal(id);
      if (!proposal) {
        return res.status(404).json({ error: 'DAO proposal not found' });
      }
      
      // Проверяем инициализацию сервиса агентов
      if (!agentService.initialized) {
        await agentService.initialize();
      }
      
      // Формируем содержимое для обработки
      const content = `Предложение DAO: ${proposal.title}
      
      Описание: ${proposal.description}
      Автор: ${proposal.authorName}
      Дата создания: ${new Date(proposal.createdAt).toLocaleDateString('ru-RU')}
      Категория: ${proposal.category}
      Статус: ${proposal.status}
      
      Содержание предложения:
      ${proposal.content}`;
      
      // Анализируем предложение DAO
      const analysisResult = await agentService.processRequest({
        taskType: AgentTaskType.DOCUMENT_ANALYSIS,
        entityType: AgentEntityType.DAO_PROPOSAL,
        entityId: proposal.id,
        content,
        userId: req.session?.userId || proposal.authorId || 1
      });
      
      // Валидируем предложение на соответствие требованиям
      const validationResult = await agentService.processRequest({
        taskType: AgentTaskType.VALIDATION,
        entityType: AgentEntityType.DAO_PROPOSAL,
        entityId: proposal.id,
        content,
        metadata: {
          analysis: analysisResult.analysis
        },
        userId: req.session?.userId || proposal.authorId || 1
      });
      
      // Запись в блокчейн всех деталей предложения и результатов анализа
      const blockchainData = {
        type: BlockchainRecordType.SYSTEM_EVENT,
        title: `DAO Proposal: ${proposal.title}`,
        content: JSON.stringify({
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          proposalDescription: proposal.description,
          author: proposal.authorName,
          createdAt: proposal.createdAt,
          analysis: analysisResult.analysis,
          validation: validationResult.output
        }),
        metadata: {
          timestamp: new Date().toISOString(),
          userId: req.session?.userId || proposal.authorId || 1,
          source: 'dao_proposal_validation'
        }
      };
      
      const blockchainResult = await recordToBlockchain(blockchainData);
      
      // Обновляем предложение DAO в базе данных
      const updatedProposal = await storage.updateDAOProposal(id, {
        validated: true,
        aiAnalysis: JSON.stringify(analysisResult.analysis || {}),
        validationResult: validationResult.output,
        blockchainHash: blockchainResult.transactionHash
      });
      
      // Создаем запись активности
      await storage.createActivity({
        userId: req.session?.userId || proposal.authorId || 1,
        actionType: 'blockchain_record',
        description: `Предложение DAO "${proposal.title}" валидировано и записано в блокчейн`,
        relatedId: proposal.id,
        relatedType: 'dao_proposal',
        metadata: {
          transactionHash: blockchainResult.transactionHash
        }
      });
      
      res.json({
        success: true,
        proposal: updatedProposal,
        analysis: analysisResult.analysis,
        validation: validationResult.output,
        blockchain: {
          transactionHash: blockchainResult.transactionHash,
          status: blockchainResult.status
        }
      });
    } catch (error) {
      console.error("Error processing DAO proposal with AI:", error);
      res.status(500).json({ 
        error: 'DAO proposal processing failed',
        message: error.message || "Ошибка при обработке предложения DAO"
      });
    }
  });
  
  // Общий эндпоинт для обработки контента через AI-агенты
  app.post('/api/ai/process', async (req, res) => {
    const { 
      taskType, 
      entityType, 
      entityId, 
      content, 
      metadata, 
      urgent, 
      language 
    } = req.body;
    
    if (!taskType || !entityType || !content) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Required fields missing: taskType, entityType, and content are required' 
      });
    }
    
    try {
      // Загружаем сервис AI-агентов
      // Используем импортированный сервис агентов
      
      // Проверяем инициализацию сервиса агентов
      if (!agentService.initialized) {
        await agentService.initialize();
      }
      
      // Проверяем корректность типа задачи
      if (!Object.values(AgentTaskType).includes(taskType)) {
        return res.status(400).json({ 
          error: 'Invalid Task Type',
          message: `Task type "${taskType}" is not supported`,
          supportedTypes: Object.values(AgentTaskType)
        });
      }
      
      // Проверяем корректность типа сущности
      if (!Object.values(AgentEntityType).includes(entityType)) {
        return res.status(400).json({ 
          error: 'Invalid Entity Type',
          message: `Entity type "${entityType}" is not supported`,
          supportedTypes: Object.values(AgentEntityType)
        });
      }
      
      // Формируем запрос к AI-агенту
      const agentInput = {
        taskType,
        entityType,
        entityId: entityId ? parseInt(entityId) : undefined,
        content,
        metadata,
        userId: req.session?.userId || 1,
        urgent: !!urgent,
        language
      };
      
      // Обрабатываем запрос через AI-агента
      const result = await agentService.processRequest(agentInput);
      
      // Создаем запись активности
      await storage.createActivity({
        userId: req.session?.userId || 1,
        actionType: 'ai_process',
        description: `AI-обработка контента типа ${entityType}`,
        relatedId: entityId ? parseInt(entityId) : 0,
        relatedType: entityType,
        metadata: {
          taskType,
          transactionHash: result.transactionHash
        }
      });
      
      res.json({
        success: result.success,
        output: result.output,
        classification: result.classification,
        summary: result.summary,
        analysis: result.analysis,
        metadata: result.metadata,
        transactionHash: result.transactionHash,
        error: result.error
      });
    } catch (error) {
      console.error("Error processing content with AI:", error);
      res.status(500).json({ 
        error: 'AI processing failed',
        message: error.message || "Ошибка при обработке контента"
      });
    }
  });
  
  // Тестовый эндпоинт для блокчейн-валидации
  app.post('/api/blockchain/validate', async (req, res) => {
    const { content, hash } = req.body;
    
    if (!content && !hash) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Either content or hash must be provided' 
      });
    }
    
    try {
      // Загружаем сервис AI-агентов
      // Используем импортированный сервис агентов
      
      // Проверяем инициализацию сервиса агентов
      if (!agentService.initialized) {
        await agentService.initialize();
      }
      
      // Формируем содержимое для валидации
      const validationContent = hash 
        ? `Транзакция блокчейн с хэшем: ${hash}`
        : content;
      
      // Валидируем через AI-агента
      const validationResult = await agentService.processRequest({
        taskType: AgentTaskType.VALIDATION,
        entityType: AgentEntityType.BLOCKCHAIN_RECORD,
        content: validationContent,
        metadata: { hash },
        userId: req.session?.userId || 1
      });
      
      res.json({
        success: validationResult.success,
        result: validationResult.output,
        transactionHash: validationResult.transactionHash,
        metadata: validationResult.metadata,
        error: validationResult.error
      });
    } catch (error) {
      console.error("Error validating blockchain record:", error);
      res.status(500).json({ 
        error: 'Blockchain validation failed',
        message: error.message || "Ошибка при валидации блокчейн-записи"
      });
    }
  });
  
  // Регистрация API маршрутов для базы данных (импорт/экспорт, переключение между провайдерами)
  registerDatabaseRoutes(app);
  
  // Регистрация API маршрутов для интеграции с Planka
  registerPlankaRoutes(app);
  
  // API маршруты для статуса подключения к базе данных
  app.get('/api/database/status', async (req, res) => {
    try {
      const currentProvider = databaseConnector.getCurrentProvider();
      const status = {
        provider: currentProvider,
        isConnected: true,
        lastChecked: new Date()
      };
      
      res.json(status);
    } catch (error) {
      console.error('Error getting database status:', error);
      res.status(500).json({ 
        error: 'Failed to get database status',
        isConnected: false 
      });
    }
  });
  
  // API маршрут для переключения провайдера базы данных
  app.post('/api/database/switch-provider', async (req, res) => {
    try {
      const { provider, config } = req.body;
      
      if (!provider || !Object.values(DatabaseProvider).includes(provider)) {
        return res.status(400).json({ error: 'Invalid database provider' });
      }
      
      const result = await databaseConnector.switchProvider(provider, config);
      
      if (result) {
        // Логируем успешное переключение
        await logActivity({
          action: 'database_provider_switched',
          entityType: 'database',
          userId: req.query.userId,
          details: `Переключение на провайдер базы данных: ${provider}`,
          metadata: { provider }
        });
        
        res.json({ success: true, provider });
      } else {
        res.status(500).json({ 
          error: 'Failed to switch database provider',
          success: false 
        });
      }
    } catch (error) {
      console.error('Error switching database provider:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to switch database provider',
        success: false 
      });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
