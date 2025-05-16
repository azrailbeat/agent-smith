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
import { registerKnowledgeRoutes } from "./vector-storage/knowledge-api";
import { registerPerplexityRoutes } from "./routes/perplexity-api";
import { saveApiSettings, getApiSettings } from "./controllers/perplexity-controller";
import { registerMeetingRoutes } from "./meeting-api";
import { registerAudioRoutes } from "./audio-api";
import agentRoutes from "./routes/agent-routes";
import llmAnalyticsRoutes from "./routes/llm-analytics-routes";
import userRoutes from "./routes/user-routes";
import llmProvidersRoutes from "./routes/llm-providers.routes";
import jobDescriptionsRoutes from "./routes/job-descriptions.routes";
import citizenRequestsRouter from "./routes/citizen-requests.routes";
import {
  getTaskRules,
  getTaskRuleById,
  saveTaskRule,
  deleteTaskRule,
  getDepartments,
  getDepartmentById,
  saveDepartment,
  getPositions,
  getPositionById,
  savePosition,
  processRequestByOrgStructure,
  createDefaultOrgStructure
} from "./services/org-structure";
import { 
  AgentKnowledgeBase, 
  InsertAgentKnowledgeBase,
  KnowledgeDocument,
  InsertKnowledgeDocument 
} from "@shared/schema";
import { SystemSettings } from "./services/system-settings";
import { agentService } from "./services/agent-service";
import { databaseConnector, DatabaseProvider } from "./services/database-connector";
import { z } from "zod";
import crypto from "crypto";
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
  // Настройка аутентификации Replit
  await setupAuth(app);
  
  // Регистрируем дополнительные маршруты
  registerSystemRoutes(app);
  registerDatabaseRoutes(app);
  registerPlankaRoutes(app);
  // LLM мониторинг настраивается через llmAnalyticsRoutes
  registerMeetingRoutes(app);
  registerAudioRoutes(app);
  registerKnowledgeRoutes(app);
  registerPerplexityRoutes(app);
  
  // Регистрируем маршруты для управления агентами
  app.use('/api/agents', agentRoutes);
  
  // Регистрируем маршруты для ИИ-аналитики LLM
  app.use('/api/llm-analytics', llmAnalyticsRoutes);
  
  // Регистрируем маршруты для управления пользователями
  app.use('/api', userRoutes);
  
  // Регистрируем маршруты для управления LLM провайдерами
  app.use('/api/llm-providers', llmProvidersRoutes);
  
  // Регистрируем маршруты для обращений граждан
  app.use('/api/citizen-requests', citizenRequestsRouter);
  
  // CORS middleware для API маршрутов, используемых внешними виджетами и bolt.new
  app.use(['/widget.js', '/api/citizen-requests', '/api/citizen-requests/import-from-file', '/api/bolt-templates', '/api/widget-integration', '/api/bolt', '/api/transcribe', '/api/process-text', '/api/process-audio'], (req, res, next) => {
    // Разрешить запросы с bolt.new и всех его поддоменов
    const origin = req.headers.origin;
    if (origin && (origin.includes('bolt.new') || origin.includes('localhost'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Предварительные запросы OPTIONS
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });
  
  // Инициализация настроек системы
  SystemSettings.initialize();
  
  // Регистрация API маршрутов должна происходить до обработки статических файлов
  
  // Регистрация системных маршрутов
  registerSystemRoutes(app);
  
  // Добавляем маршруты для протоколов заседаний напрямую
  app.get('/api/meetings', async (req, res) => {
    try {
      const meetings = await storage.getMeetings();
      
      // Логируем активность просмотра протоколов
      await logActivity({
        action: 'view_list',
        entityType: 'meeting',
        details: 'Просмотр списка протоколов заседаний'
      });
      
      res.json(meetings);
    } catch (error: any) {
      console.error('Error getting meetings:', error);
      res.status(500).json({ error: 'Failed to get meetings', details: error.message });
    }
  });
  
  // Получение протокола заседания по ID
  app.get('/api/meetings/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid meeting ID' });
      }
      
      const meeting = await storage.getMeeting(id);
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      
      res.json(meeting);
    } catch (error: any) {
      console.error(`Error getting meeting by ID:`, error);
      res.status(500).json({ error: 'Failed to get meeting', details: error.message });
    }
  });
  
  // Создание нового протокола заседания
  app.post('/api/meetings', async (req, res) => {
    try {
      const meetingData = req.body;
      
      if (!meetingData.title) {
        return res.status(400).json({ error: 'Meeting title is required' });
      }
      
      const meeting = await storage.createMeeting(meetingData);
      res.status(201).json(meeting);
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      res.status(500).json({ error: 'Failed to create meeting', details: error.message });
    }
  });
  
  // Регистрация маршрутов мониторинга LLM
  // Маршруты LLM мониторинга настраиваются через llmAnalyticsRoutes
  
  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Традиционный маршрут авторизации (оставлен для обратной совместимости)
  // Основная авторизация теперь происходит через Replit Auth
  app.post('/api/auth/login-legacy', async (req, res) => {
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

  // User API routes
  app.get('/api/users', async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users', details: error.message });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const userData = req.body;
      // Базовая валидация
      if (!userData.username) {
        return res.status(400).json({ error: 'Username is required' });
      }

      // Проверка существования пользователя с таким именем
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: 'User with this username already exists' });
      }

      // Создаем пользователя
      const newUser = await storage.createUser(userData);
      res.status(201).json(newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user', details: error.message });
    }
  });

  app.patch('/api/users/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      // Проверяем существование пользователя
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Обновляем данные пользователя
      const updatedUser = await storage.updateUser(id, req.body);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user', details: error.message });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      // Проверяем существование пользователя
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Удаляем пользователя
      await storage.deleteUser(id);
      res.json({ success: true, message: 'User successfully deleted' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user', details: error.message });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user', details: error.message });
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
  
  // Удаление обращения с записью в блокчейн
  app.delete('/api/citizen-requests/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }
    
    try {
      // Получаем информацию о запросе перед удалением
      const request = await storage.getCitizenRequest(id);
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }
      
      // Записываем удаление в блокчейн
      const userId = req.session?.userId || 1;
      const transactionHash = await recordToBlockchain({
        entityId: id,
        entityType: 'citizen_request',
        action: 'deletion',
        userId,
        metadata: {
          requestInfo: {
            subject: request.subject,
            fullName: request.fullName,
            status: request.status,
            createdAt: request.createdAt
          },
          deletedAt: new Date(),
          deletedBy: userId
        }
      });
      
      // Создаем запись активности
      await storage.createActivity({
        userId,
        actionType: 'citizen_request_deleted',
        description: `Удалено обращение "${request.subject}" от ${request.fullName}`,
        relatedId: id,
        relatedType: 'citizen_request',
        blockchainHash: transactionHash
      });
      
      // Удаляем обращение
      const deleted = await storage.deleteCitizenRequest(id);
      
      res.json({ 
        success: deleted,
        blockchainHash: transactionHash,
        message: 'Запись о удалении сохранена в блокчейне',
        deletedAt: new Date()
      });
    } catch (error) {
      console.error('Error deleting citizen request:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Получение результатов работы агентов по обращению (по ID обращения)
  app.get('/api/citizen-requests/:id/agent-results', async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const results = await storage.getAgentResultsByEntity('citizen_request', requestId);
      res.json(results);
    } catch (error) {
      console.error('Error fetching agent results:', error);
      res.status(500).json({ error: 'Failed to fetch agent results' });
    }
  });
  
  // Получение результатов работы агентов по типу и ID сущности (общий эндпоинт)
  app.get('/api/agent-results', async (req, res) => {
    try {
      const { entityId, entityType } = req.query;
      
      if (!entityId || !entityType) {
        return res.status(400).json({ error: 'Entity ID and entity type are required' });
      }
      
      const id = parseInt(entityId as string);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid entity ID' });
      }
      
      const results = await storage.getAgentResultsByEntity(entityType as string, id);
      res.json(results);
    } catch (error) {
      console.error('Error fetching agent results:', error);
      res.status(500).json({ error: 'Failed to fetch agent results' });
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
        const activityDescription = `Статус обращения изменен на "${updateData.status}"`;
        
        // Сохраняем действие в активностях
        const activity = await storage.createActivity({
          actionType: 'citizen_request_status_changed',
          description: activityDescription,
          relatedId: request.id,
          relatedType: 'citizen_request'
        });
        
        // Записываем действие в блокчейн
        try {
          const blockchainData = {
            entityId: request.id,
            entityType: 'citizen_request',
            action: `status_change_to_${updateData.status}`,
            metadata: {
              oldStatus: request.status,
              newStatus: updateData.status,
              activityId: activity.id
            }
          };
          
          const transactionHash = await recordToBlockchain(blockchainData);
          
          // Обновляем активность с хешем блокчейна
          await storage.updateActivity(activity.id, {
            blockchainHash: transactionHash
          });
          
          // Добавляем хеш блокчейна в ответ
          request.blockchainHash = transactionHash;
        } catch (blockchainError) {
          console.error("Error recording to blockchain:", blockchainError);
          // Продолжаем выполнение - ошибка в блокчейне не должна останавливать основную функциональность
        }
      }
      
      res.json(request);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/citizen-requests/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }
    
    try {
      const result = await storage.deleteCitizenRequest(id);
      if (result) {
        res.status(200).json({ success: true, message: 'Citizen request deleted successfully' });
      } else {
        res.status(404).json({ error: 'Citizen request not found' });
      }
    } catch (error) {
      console.error('Error deleting citizen request:', error);
      res.status(500).json({ error: 'Failed to delete citizen request', message: error.message });
    }
  });
  
  // Добавление активности для обращения (для отслеживания перемещений карточек)
  app.post('/api/citizen-requests/:id/activities', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }
    
    try {
      const { actionType, description, relatedId, relatedType } = req.body;
      
      if (!actionType || !description) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Создаем новую активность
      const activity = await storage.createActivity({
        actionType,
        description,
        relatedId: relatedId || id,
        relatedType: relatedType || 'citizen_request'
      });
      
      // Пытаемся записать действие в блокчейн, если это перемещение карточки или другое значимое действие
      if (actionType === 'status_change' || actionType === 'ai_process' || actionType === 'manual_update') {
        try {
          // Получаем обращение для записи в блокчейн
          const request = await storage.getCitizenRequest(id);
          
          // Формируем данные для записи в блокчейн
          const blockchainData = {
            entityId: id,
            entityType: 'citizen_request',
            action: actionType,
            userId: req.body.userId || null,
            metadata: {
              activityId: activity.id,
              description,
              timestamp: new Date().toISOString()
            }
          };
          
          // Записываем в блокчейн
          const transactionHash = await recordToBlockchain(blockchainData);
          
          // Обновляем активность с хешем блокчейна
          await storage.updateActivity(activity.id, {
            blockchainHash: transactionHash
          });
          
          // Возвращаем результат с хешем блокчейна
          return res.status(201).json({
            success: true,
            activity,
            blockchainHash: transactionHash
          });
        } catch (blockchainError) {
          console.error("Ошибка при записи в блокчейн:", blockchainError);
          // Продолжаем выполнение - ошибка в блокчейне не должна останавливать основную функциональность
        }
      }
      
      // Возвращаем результат без записи в блокчейн
      res.status(201).json({ success: true, activity });
    } catch (error) {
      console.error('Ошибка при создании активности:', error);
      res.status(500).json({ error: 'Не удалось создать активность', message: error.message });
    }
  });
  
  // Маршрут для прямой записи в блокчейн (используется для записи перемещений карточек)
  app.post('/api/citizen-requests/:id/blockchain', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }
    
    try {
      const { action, entityType, entityId, metadata, userId } = req.body;
      
      if (!action || !entityType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Подготавливаем данные для блокчейна
      const blockchainData = {
        entityId: entityId || id,
        entityType,
        action,
        userId: userId || null,
        metadata: metadata || {}
      };
      
      // Записываем в блокчейн
      const transactionHash = await recordToBlockchain(blockchainData);
      
      // Возвращаем результат с хешем блокчейна
      res.status(201).json({
        success: true,
        blockchainHash: transactionHash
      });
    } catch (error) {
      console.error('Ошибка при записи в блокчейн:', error);
      res.status(500).json({ error: 'Не удалось записать в блокчейн', message: error.message });
    }
  });

  // Organization structure and task rules API
  // Task Rules routes
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
  
  // Department routes
  app.get('/api/departments', async (req, res) => {
    try {
      const departments = await getDepartments();
      res.json(departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.status(500).json({ error: 'Failed to fetch departments', details: error.message });
    }
  });
  
  // Создание структуры по умолчанию
  app.post('/api/org-structure/default', async (req, res) => {
    try {
      const result = await createDefaultOrgStructure();
      res.json(result);
    } catch (error) {
      console.error('Error creating default organizational structure:', error);
      res.status(500).json({ 
        error: 'Failed to create default organizational structure', 
        details: error.message 
      });
    }
  });
  
  app.get('/api/departments/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid department ID' });
      }
      
      const department = await getDepartmentById(id);
      if (!department) {
        return res.status(404).json({ error: 'Department not found' });
      }
      
      res.json(department);
    } catch (error) {
      console.error('Error fetching department:', error);
      res.status(500).json({ error: 'Failed to fetch department', details: error.message });
    }
  });
  
  app.post('/api/departments', async (req, res) => {
    try {
      const department = req.body;
      const savedDepartment = await saveDepartment(department);
      res.status(201).json(savedDepartment);
    } catch (error) {
      console.error('Error creating department:', error);
      res.status(500).json({ error: 'Failed to create department', details: error.message });
    }
  });
  
  app.patch('/api/departments/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid department ID' });
      }
      
      const department = { ...req.body, id };
      const savedDepartment = await saveDepartment(department);
      res.json(savedDepartment);
    } catch (error) {
      console.error('Error updating department:', error);
      res.status(500).json({ error: 'Failed to update department', details: error.message });
    }
  });
  
  // Position routes
  app.get('/api/positions', async (req, res) => {
    try {
      const positions = await getPositions();
      res.json(positions);
    } catch (error) {
      console.error('Error fetching positions:', error);
      res.status(500).json({ error: 'Failed to fetch positions', details: error.message });
    }
  });
  
  app.get('/api/positions/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid position ID' });
      }
      
      const position = await getPositionById(id);
      if (!position) {
        return res.status(404).json({ error: 'Position not found' });
      }
      
      res.json(position);
    } catch (error) {
      console.error('Error fetching position:', error);
      res.status(500).json({ error: 'Failed to fetch position', details: error.message });
    }
  });
  
  app.post('/api/positions', async (req, res) => {
    try {
      const position = req.body;
      const savedPosition = await savePosition(position);
      res.status(201).json(savedPosition);
    } catch (error) {
      console.error('Error creating position:', error);
      res.status(500).json({ error: 'Failed to create position', details: error.message });
    }
  });
  
  app.patch('/api/positions/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid position ID' });
      }
      
      const position = { ...req.body, id };
      const savedPosition = await savePosition(position);
      res.json(savedPosition);
    } catch (error) {
      console.error('Error updating position:', error);
      res.status(500).json({ error: 'Failed to update position', details: error.message });
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

  // Обработка обращения конкретным агентом
  app.post('/api/citizen-requests/:id/process-with-agent', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid request ID" });
      }

      // Получаем обращение
      const request = await storage.getCitizenRequest(id);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Получаем параметры запроса
      const { agentId, action, actionType, text, requestType, options = {} } = req.body;
      
      if (!agentId) {
        return res.status(400).json({ error: "Agent ID is required" });
      }

      // Поддерживаем оба параметра: 'action' и 'actionType' для обратной совместимости
      const selectedAction = action || actionType;
      if (!selectedAction) {
        return res.status(400).json({ error: "Action parameter is required (either 'action' or 'actionType')" });
      }
      
      // Выводим полученные параметры для отладки
      console.log("Processing request with parameters:", { 
        requestId: id,
        agentId, 
        action, 
        actionType,
        selectedAction
      });

      // Получаем агента
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      if (!agent.isActive) {
        return res.status(400).json({ 
          error: "Agent is inactive", 
          message: "This agent is currently disabled. Enable it in AI Agents settings." 
        });
      }

      // Формируем текст для обработки
      const processText = text || request.description || '';
      const processType = requestType || request.requestType || 'general';
      
      // Обрабатываем в зависимости от типа действия
      if (selectedAction === "classify") {
        // Классификация обращения
        const result = await classifyRequest(processText, agent, processType);
        
        // Обновляем данные в базе, если указан флаг autoUpdate
        if (options.autoUpdate) {
          await storage.updateCitizenRequest(id, {
            aiProcessed: true,
            aiClassification: result.classification,
            status: "in_progress"
          });
        }

        // Создаем запись о результате работы агента
        await storage.createAgentResult({
          agentId,
          entityType: "citizen_request",
          entityId: id,
          actionType: "classification",
          result: JSON.stringify(result),
          createdAt: new Date()
        });
        
        // Создаем запись активности
        await storage.createActivity({
          actionType: "ai_process",
          description: `Агент ${agent.name} классифицировал обращение №${id}`,
          relatedId: id,
          relatedType: "citizen_request"
        });
        
        return res.json({
          success: true,
          classification: result.classification,
          confidence: result.confidence,
          aiClassification: result.classification,
          aiProcessed: true
        });
        
      } else if (selectedAction === "respond") {
        // Генерация ответа на обращение
        const result = await generateResponse(processText, agent, options.classification || processType);
        
        // Обновляем данные в базе, если указан флаг autoUpdate
        if (options.autoUpdate || options.autoRespond) {
          await storage.updateCitizenRequest(id, {
            responseText: result.response,
            aiSuggestion: result.response,
            status: "in_progress"
          });
        }

        // Создаем запись о результате работы агента
        await storage.createAgentResult({
          agentId,
          entityType: "citizen_request",
          entityId: id,
          actionType: "response",
          result: JSON.stringify(result),
          createdAt: new Date()
        });
        
        // Создаем запись активности
        await storage.createActivity({
          actionType: "ai_process",
          description: `Агент ${agent.name} сгенерировал ответ на обращение №${id}`,
          relatedId: id,
          relatedType: "citizen_request"
        });
        
        return res.json({
          success: true,
          responseText: result.response,
          suggestions: result.suggestions || [],
          aiSuggestion: result.response
        });
        
      } else if (selectedAction === "summarize") {
        // Генерация краткого резюме обращения
        const result = await summarizeRequest(processText, agent);
        
        // Обновляем данные в базе, если указан флаг autoUpdate
        if (options.autoUpdate) {
          await storage.updateCitizenRequest(id, {
            summary: result.summary
          });
        }

        // Создаем запись о результате работы агента
        await storage.createAgentResult({
          agentId,
          entityType: "citizen_request",
          entityId: id,
          actionType: "summarization",
          result: JSON.stringify(result),
          createdAt: new Date()
        });
        
        return res.json({
          success: true,
          summary: result.summary,
          keyPoints: result.keyPoints || []
        });
      } else if (selectedAction === "blockchain" || selectedAction === "record") {
        // Запись обращения в блокчейн
        // Проверяем, что у обращения есть необходимые данные
        if (!request.summary && !request.aiSuggestion) {
          return res.status(400).json({
            error: "Missing data for blockchain record",
            message: "Обращение должно иметь резюме или ответ для записи в блокчейн"
          });
        }
        
        try {
          // Формируем данные для блокчейна
          const blockchainData = {
            entityId: request.id,
            entityType: "citizen_request",
            action: "record",
            userId: options.userId || null,
            metadata: {
              fullName: request.fullName,
              requestType: request.requestType,
              summary: request.summary,
              suggestion: request.aiSuggestion,
              classification: request.aiClassification
            }
          };
          
          // Записываем в блокчейн
          const transactionHash = await recordToBlockchain(blockchainData);
          
          // Обновляем обращение
          await storage.updateCitizenRequest(id, {
            blockchainHash: transactionHash,
          });
          
          // Создаем запись о результате работы агента
          await storage.createAgentResult({
            agentId,
            entityType: "citizen_request",
            entityId: id,
            actionType: "blockchain_record",
            result: JSON.stringify({
              transactionHash,
              recordedAt: new Date(),
              metadata: blockchainData.metadata
            }),
            createdAt: new Date()
          });
          
          // Создаем запись активности
          await storage.createActivity({
            actionType: "blockchain_record",
            description: `Агент ${agent.name} сохранил обращение №${id} в блокчейне`,
            relatedId: id,
            relatedType: "citizen_request",
            blockchainHash: transactionHash
          });
          
          return res.json({
            success: true,
            blockchainHash: transactionHash,
            recordedAt: new Date()
          });
        } catch (blockchainError) {
          console.error('Error recording to blockchain:', blockchainError);
          return res.status(500).json({
            error: "Blockchain recording failed",
            message: blockchainError.message || "Ошибка при записи в блокчейн"
          });
        }
      } else if (selectedAction === "full") {
        // Полная обработка - выполняем все три действия последовательно
        
        // 1. Классификация
        const classifyResult = await classifyRequest(processText, agent, processType);
        
        // 2. Генерация ответа с учетом классификации
        const responseResult = await generateResponse(processText, agent, classifyResult.classification);
        
        // 3. Генерация резюме
        const summaryResult = await summarizeRequest(processText, agent);
        
        // Обновляем данные в базе
        await storage.updateCitizenRequest(id, {
          aiProcessed: true,
          aiClassification: classifyResult.classification,
          aiSuggestion: responseResult.response,
          summary: summaryResult.summary,
          status: "in_progress"
        });
        
        // Создаем записи о результатах
        await storage.createAgentResult({
          agentId,
          entityType: "citizen_request",
          entityId: id,
          actionType: "classification",
          result: JSON.stringify(classifyResult),
          createdAt: new Date()
        });
        
        await storage.createAgentResult({
          agentId,
          entityType: "citizen_request",
          entityId: id,
          actionType: "response",
          result: JSON.stringify(responseResult),
          createdAt: new Date()
        });
        
        await storage.createAgentResult({
          agentId,
          entityType: "citizen_request",
          entityId: id,
          actionType: "summarization",
          result: JSON.stringify(summaryResult),
          createdAt: new Date()
        });
        
        // Создаем запись активности
        await storage.createActivity({
          actionType: "ai_process",
          description: `Агент ${agent.name} выполнил полную обработку обращения №${id}`,
          relatedId: id,
          relatedType: "citizen_request"
        });
        
        return res.json({
          success: true,
          classification: classifyResult.classification,
          confidence: classifyResult.confidence,
          responseText: responseResult.response,
          summary: summaryResult.summary,
          keyPoints: summaryResult.keyPoints || [],
          aiClassification: classifyResult.classification,
          aiSuggestion: responseResult.response,
          aiProcessed: true
        });
      } else {
        return res.status(400).json({ 
          error: "Invalid action type", 
          message: `Action type '${actionType}' is not supported` 
        });
      }
    } catch (error) {
      console.error('Error processing with agent:', error);
      return res.status(500).json({ 
        error: "Processing failed", 
        message: error.message || "Ошибка обработки обращения" 
      });
    }
  });
  
  // Дополнительные функции обработки обращений
  async function classifyRequest(text: string, agent: any, requestType: string) {
    // Здесь можно добавить код для работы с AI API или локальными моделями
    
    // Для MVP используем упрощенную логику
    const categories = [
      'housing', 'utilities', 'social', 'healthcare', 'education', 'roads',  
      'public_transport', 'safety', 'environmental', 'business', 'land', 'permits',
      'taxation', 'legal', 'agriculture'
    ];
    
    // Проверяем ключевые слова для каждой категории
    const keywords: Record<string, string[]> = {
      'housing': ['жилье', 'дом', 'квартира', 'проживание', 'жилищный'],
      'utilities': ['коммунальн', 'водоснабжение', 'отопление', 'электричество', 'ЖКХ'],
      'social': ['социальн', 'пособие', 'пенсия', 'материальная помощь', 'льготы'],
      'healthcare': ['медицин', 'здравоохранение', 'больница', 'поликлиника', 'врач'],
      'education': ['образование', 'школа', 'детский сад', 'университет', 'обучение'],
      'roads': ['дорог', 'мост', 'асфальт', 'яма', 'транспортн'],
      'public_transport': ['общественный транспорт', 'автобус', 'маршрут', 'остановка'],
      'safety': ['безопасность', 'полиция', 'правопорядок', 'преступность', 'угроза'],
      'environmental': ['экология', 'окружающая среда', 'загрязнение', 'мусор', 'отходы'],
      'business': ['бизнес', 'предпринимательство', 'торговля', 'лицензия', 'предприятие'],
      'land': ['земля', 'участок', 'кадастр', 'границы', 'земельный'],
      'permits': ['разрешение', 'лицензия', 'согласование', 'разрешительн'],
      'taxation': ['налог', 'налогов', 'налогообложение', 'вычет', 'ИИН'],
      'legal': ['юридическ', 'правовой', 'закон', 'суд', 'документ'],
      'agriculture': ['сельское хозяйство', 'аграрн', 'фермер', 'субсидия', 'урожай']
    };
    
    // Посчитаем вхождения ключевых слов для каждой категории
    const lowerText = text.toLowerCase();
    const scores: Record<string, number> = {};
    
    categories.forEach(category => {
      const categoryKeywords = keywords[category] || [];
      let score = 0;
      
      categoryKeywords.forEach(keyword => {
        if (lowerText.includes(keyword.toLowerCase())) {
          score += 1;
        }
      });
      
      scores[category] = score;
    });
    
    // Находим категорию с наибольшим совпадением
    let bestCategory = requestType;
    let maxScore = 0;
    
    Object.entries(scores).forEach(([category, score]) => {
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    });
    
    // Если нет совпадений, вернуть исходный тип
    if (maxScore === 0) {
      bestCategory = requestType;
    }
    
    return {
      classification: bestCategory,
      confidence: maxScore > 0 ? Math.min(0.3 + (maxScore * 0.1), 0.95) : 0.5,
      scores
    };
  }
  
  async function generateResponse(text: string, agent: any, category: string) {
    // Шаблонные ответы для MVP
    const responses: Record<string, string> = {
      'housing': 'Ваше обращение по жилищному вопросу зарегистрировано. Для решения вашего вопроса будет привлечен специалист из Жилищного департамента. Срок рассмотрения вашего обращения составляет 7 рабочих дней.',
      'utilities': 'Ваше обращение по вопросу коммунальных услуг зарегистрировано. Для оперативного решения вашего вопроса будет привлечен специалист из Департамента ЖКХ. В случае аварийной ситуации, требующей немедленного реагирования, пожалуйста, свяжитесь с аварийной службой по номеру 109.',
      'social': 'Ваше обращение по вопросу социальной поддержки зарегистрировано. Для детального рассмотрения вашего вопроса будет привлечен специалист из Департамента социальной защиты. Пожалуйста, убедитесь, что у вас готовы все необходимые документы, подтверждающие ваше право на социальную поддержку.',
      'default': 'Ваше обращение успешно зарегистрировано в системе. В ближайшее время компетентный специалист рассмотрит ваше обращение и свяжется с вами по указанным контактным данным. Ваше обращение будет рассмотрено в срок, установленный законодательством Республики Казахстан.'
    };
    
    // Выбираем подходящий ответ или используем стандартный
    const response = responses[category] || responses['default'];
    
    return {
      response,
      suggestions: [
        'Уточнить дополнительные детали',
        'Запросить консультацию специалиста',
        'Предоставить дополнительные документы'
      ]
    };
  }
  
  async function summarizeRequest(text: string, agent: any) {
    // Для MVP делаем простое резюме
    const summary = text.length > 100 ? 
      `${text.substring(0, 100).trim()}...` : 
      text;
    
    const keyPoints = [
      'Требуется рассмотрение специалистом',
      'Необходимо уточнить детали'
    ];
    
    return { summary, keyPoints };
  }
  
  // Batch process citizen requests with AI
  app.post('/api/citizen-requests/process-batch', async (req, res) => {
    const { agentId, autoProcess, autoClassify, autoRespond } = req.body;
    
    // Проверяем, передан ли ID агента
    // Если нет - используем первого активного агента для обработки обращений
    let resolvedAgentId = agentId;
    if (!resolvedAgentId) {
      const agents = await storage.getAgentsByType("citizen_requests");
      const activeAgents = agents.filter(a => a.isActive);
      if (activeAgents.length > 0) {
        resolvedAgentId = activeAgents[0].id;
      } else {
        return res.status(400).json({ error: 'No active agents found for citizen requests' });
      }
    }
    
    try {
      // Получаем агента
      const agent = await storage.getAgent(resolvedAgentId);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      // Получаем все необработанные запросы
      const allRequests = await storage.getCitizenRequests();
      
      // Определяем фильтр в зависимости от параметров запроса
      let unprocessedRequests;
      // Если флаг forceReprocess установлен, обрабатываем все запросы в статусе 'new', 'Новый' или 'inProgress'
      // независимо от того, были ли они обработаны ранее
      if (req.body.forceReprocess) {
        unprocessedRequests = allRequests.filter(req => 
          (req.status === 'new' || req.status === 'Новый' || req.status === 'inProgress')
        );
        console.log(`Force reprocessing ${unprocessedRequests.length} requests regardless of aiProcessed status`);
      } else {
        // Иначе фильтруем только необработанные
        unprocessedRequests = allRequests.filter(req => 
          (req.status === 'new' || req.status === 'Новый' || req.status === 'inProgress') 
          && req.aiProcessed !== true
        );
        console.log(`Found ${unprocessedRequests.length} unprocessed requests from ${allRequests.length} total requests`);
      }
      
      if (unprocessedRequests.length === 0) {
        return res.status(400).json({ error: 'No unprocessed requests found. Use forceReprocess=true to reprocess already processed requests.' });
      }
      
      // Определяем ID запросов для обработки
      const requestIds = unprocessedRequests.map(req => req.id);
      
      // Массив с типами действий для обработки
      const actions = [];
      if (autoClassify) actions.push('classification');
      if (autoProcess) actions.push('summarization');
      if (autoRespond) actions.push('response_generation');
      
      if (actions.length === 0) {
        actions.push('classification'); // По умолчанию добавляем классификацию
      }
      const results = [];
      const processedCount = { success: 0, error: 0 };
      
      // Инициализируем сервис агентов, если необходимо
      try {
        await agentService.initialize();
      } catch (initError) {
        console.error("Failed to initialize agent service:", initError);
      }

      // Обрабатываем каждый запрос выбранным агентом
      for (const requestId of requestIds) {
        const request = await storage.getCitizenRequest(requestId);
        if (!request) {
          results.push({ requestId, success: false, error: 'Request not found' });
          processedCount.error++;
          continue;
        }
        
        // Формируем содержимое для обработки
        const content = `Тема: ${request.subject || ''}

Описание:
${request.description || ''}

Контактная информация:
ФИО: ${request.fullName}
Контакты: ${request.contactInfo}`;
        
        // Определяем новый статус для запроса в зависимости от типа обращения и действий
        let newRequestStatus = 'in_progress';
        
        // Полная обработка и назначение по орг структуре если autoProcess и autoRespond
        if (autoProcess && autoRespond) {
          // Попытка автоматической обработки и назначения
          try {
            const fullText = `${request.subject || ''} ${request.description || ''}`;
            const orgStructureResult = await processRequestByOrgStructure(request.id, fullText);
            
            if (orgStructureResult.processed) {
              newRequestStatus = 'assigned';
              
              // Логируем активность назначения по организационной структуре
              await logActivity({
                action: 'auto_assign',
                entityType: 'citizen_request',
                entityId: request.id,
                details: `Обращение автоматически назначено согласно правилу "${orgStructureResult.rule?.name}"`,
                metadata: {
                  ruleId: orgStructureResult.rule?.id,
                  departmentId: orgStructureResult.rule?.departmentId,
                  positionId: orgStructureResult.rule?.positionId
                }
              });
              
              // Если обработка завершена, статус - "Выполнено"
              if (autoRespond) {
                newRequestStatus = 'completed';
              }
            }
          } catch (orgStructureError) {
            console.error(`Error processing request ${request.id} by org structure:`, orgStructureError);
          }
        }
        
        let updateData: any = { status: newRequestStatus };
        
        // Выполняем выбранные действия
        const actionResults = [];
        let success = true;
        
        // Выполняем все выбранные действия
        for (const actionType of actions) {
          try {
            const result = await agentService.processRequest({
              taskType: actionType as any,
              entityType: 'citizen_request' as any,
              entityId: requestId,
              content,
              userId: 1
            });
            
            // Добавляем результаты в данные для обновления обращения
            if (actionType === 'classification' && result.classification) {
              updateData.aiClassification = result.classification;
            } else if (actionType === 'response_generation' && result.output) {
              updateData.aiSuggestion = result.output;
            } else if (actionType === 'summarization' && result.output) {
              updateData.summary = result.output;
            }
            
            actionResults.push({ type: actionType, success: true, result });
          } catch (actionError: any) {
            console.error(`Error in ${actionType} for request ${requestId}:`, actionError);
            actionResults.push({ type: actionType, success: false, error: actionError.message || 'Processing failed' });
            success = false;
          }
        }
        
        // Обновляем запрос в базе данных
        try {
          // Устанавливаем флаг aiProcessed
          updateData.aiProcessed = true;
          
          // Добавляем данные о назначении, если есть
          if (autoProcess && autoRespond) {
            try {
              const fullText = `${request.subject || ''} ${request.description || ''}`;
              const orgStructureResult = await processRequestByOrgStructure(requestId, fullText);
              
              if (orgStructureResult.processed && orgStructureResult.rule) {
                updateData.assignedTo = orgStructureResult.rule.positionId || null;
                updateData.departmentId = orgStructureResult.rule.departmentId || null;
                updateData.metadata = {
                  ...(request.metadata || {}),
                  orgStructureRule: orgStructureResult.rule.id,
                  orgStructureRuleName: orgStructureResult.rule.name,
                  autoAssigned: true
                };
              }
            } catch (orgError) {
              console.error(`Error assigning request ${requestId} by org structure:`, orgError);
            }
          }
          
          // Обновляем запрос в хранилище
          await storage.updateCitizenRequest(requestId, updateData);
          
          // Создаем запись активности
          await storage.createActivity({
            actionType: "ai_process",
            description: `Автоматическая обработка обращения №${requestId}`,
            relatedId: requestId,
            relatedType: "citizen_request"
          });
          
          results.push({ 
            requestId, 
            success: true, 
            actionResults, 
            newStatus: updateData.status
          });
          processedCount.success++;
        } catch (updateError: any) {
          console.error(`Error updating request ${requestId}:`, updateError);
          results.push({ 
            requestId, 
            success: false, 
            error: updateError.message || "Failed to update request with results"
          });
          processedCount.error++;
        }
      }
      
      // Генерируем детальный отчет о процессе обработки для возврата клиенту
      const report = {
        success: true,
        processedCount,
        results,
        summary: {
          total: allRequests.length,
          processed: results.length,
          succeeded: processedCount.success,
          failed: processedCount.error,
          timeStamp: new Date().toISOString(),
          actions: actions.join(', '),
          agentId: resolvedAgentId,
          agentName: agent?.name || 'Unknown'
        }
      };
      
      // Логируем активность создания отчета
      await storage.createActivity({
        actionType: "ai_process_report",
        description: `Создан отчет по пакетной обработке ${results.length} обращений`,
        metadata: {
          processedCount,
          succeededCount: processedCount.success,
          failedCount: processedCount.error
        }
      });
      
      return res.json(report);
    } catch (error) {
      console.error('Error during batch processing:', error);
      return res.status(500).json({ error: 'Internal server error during batch processing' });
    }
  });
  
  // Process citizen request with specific agent
  app.post('/api/citizen-requests/:id/process-with-agent', async (req, res) => {
    const id = parseInt(req.params.id);
    const { agentId, action } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }
    
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }
    
    if (!action) {
      return res.status(400).json({ error: 'Action type is required' });
    }
    
    try {
      // Получаем обращение гражданина
      const request = await storage.getCitizenRequest(id);
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }
      
      // Получаем агента
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      // Формируем содержимое для обработки
      const content = `Тема: ${request.subject || ''}

Описание:
${request.description || ''}

Контактная информация:
ФИО: ${request.fullName}
Контакты: ${request.contactInfo}`;
      
      // Обновляем статус на in_progress
      await storage.updateCitizenRequest(id, {
        status: 'in_progress',
        assignedTo: agentId
      });
      
      // Создаем запись активности о назначении
      const assignActivity = await storage.createActivity({
        actionType: "auto_assign",
        description: `Обращение №${id} назначено агенту ${agent.name} для ${action === 'auto' ? 'автоматической' : 'полной'} обработки`,
        relatedId: id,
        relatedType: "citizen_request",
        metadata: {
          agentId,
          agentName: agent.name,
          agentType: agent.type,
          actionType: action
        }
      });
      
      // Запись в блокчейн о назначении обращения агенту
      const assignTransactionHash = await recordToBlockchain({
        entityId: id,
        entityType: 'citizen_request',
        action: 'assign_to_agent',
        metadata: {
          agentId,
          agentName: agent.name,
          activityId: assignActivity.id,
          actionType: action
        }
      });
      
      // Обновляем активность с хешем блокчейна
      await storage.updateActivity(assignActivity.id, {
        blockchainHash: assignTransactionHash
      });
      
      // Массив для хранения всех результатов для отчета
      const processingResults = [];
      
      // Обрабатываем запрос с помощью выбранного агента - классификация
      console.log(`Начинаем классификацию обращения #${id}`);
      const classificationResult = await agentService.processRequest({
        taskType: 'classification' as any,
        entityType: 'citizen_request' as any,
        entityId: id,
        content,
        userId: agentId
      });
      
      processingResults.push({
        type: 'classification',
        result: classificationResult,
        timestamp: new Date().toISOString()
      });
      
      // Запись в блокчейн о результате классификации
      const classificationTransactionHash = await recordToBlockchain({
        entityId: id,
        entityType: 'citizen_request',
        action: 'classification_processed',
        metadata: {
          classification: classificationResult.classification,
          agentId,
          timestamp: new Date().toISOString()
        }
      });
      
      // Затем генерация ответа с учетом результата классификации
      console.log(`Начинаем генерацию ответа для обращения #${id}`);
      const responseResult = await agentService.processRequest({
        taskType: 'response_generation' as any,
        entityType: 'citizen_request' as any,
        entityId: id,
        content,
        metadata: {
          classification: classificationResult.classification || 'general'
        },
        userId: agentId
      });
      
      processingResults.push({
        type: 'response_generation',
        result: responseResult,
        timestamp: new Date().toISOString()
      });
      
      // Запись в блокчейн о результате генерации ответа
      const responseTransactionHash = await recordToBlockchain({
        entityId: id,
        entityType: 'citizen_request',
        action: 'response_generated',
        metadata: {
          agentId,
          timestamp: new Date().toISOString()
        }
      });
      
      // Генерируем резюме обращения
      console.log(`Начинаем создание резюме для обращения #${id}`);
      const summaryResult = await agentService.processRequest({
        taskType: 'summarization' as any,
        entityType: 'citizen_request' as any,
        entityId: id,
        content,
        userId: agentId
      });
      
      processingResults.push({
        type: 'summarization',
        result: summaryResult,
        timestamp: new Date().toISOString()
      });
      
      // Запись в блокчейн о результате резюмирования
      const summaryTransactionHash = await recordToBlockchain({
        entityId: id,
        entityType: 'citizen_request',
        action: 'summary_created',
        metadata: {
          agentId,
          timestamp: new Date().toISOString()
        }
      });
      
      // Обновляем обращение с результатами и перемещаем карточку в соответствующую колонку
      let newStatus = request.status;
      
      // Если это автоматическая обработка, перемещаем карточку в соответствующую колонку
      if (action === 'auto') {
        newStatus = 'waiting'; // Перемещаем в колонку "Ожидание"
      } else if (action === 'full') {
        newStatus = 'in_progress'; // Оставляем в колонке "В работе"
      }
      
      const updatedRequest = await storage.updateCitizenRequest(id, {
        aiProcessed: true,
        aiClassification: classificationResult.classification || 'general',
        aiSuggestion: responseResult.output || 'Рекомендуется обработка специалистом',
        summary: summaryResult.output || 'Требуется дополнительная информация',
        blockchainHash: classificationTransactionHash, // используем основной хеш для отображения
        status: newStatus // Обновляем статус для перемещения карточки
      });
      
      // Создаем подробный отчет о результатах обработки
      const processingReport = {
        requestId: id,
        requestTitle: request.subject || '',
        completedAt: new Date().toISOString(),
        processingDuration: 'Выполнено за ' + (processingResults.length * 2) + ' сек.',
        results: processingResults,
        blockchainTransactions: [
          { action: 'assign_to_agent', hash: assignTransactionHash },
          { action: 'classification_processed', hash: classificationTransactionHash },
          { action: 'response_generated', hash: responseTransactionHash },
          { action: 'summary_created', hash: summaryTransactionHash }
        ],
        summary: {
          classification: classificationResult.classification || 'general',
          suggestedResponse: responseResult.output || 'Рекомендуется обработка специалистом',
          briefSummary: summaryResult.output || 'Требуется дополнительная информация'
        }
      };
      
      // Сохраняем отчет в результатах агента
      await storage.createAgentResult({
        agentId,
        entityType: "citizen_request",
        entityId: id,
        actionType: "full_processing_report",
        result: JSON.stringify(processingReport),
        createdAt: new Date()
      });
      
      // Создаем запись активности о завершении обработки
      const completionActivity = await storage.createActivity({
        actionType: "ai_process_complete",
        description: `Завершена комплексная обработка обращения №${id} агентом ${agent.name}`,
        relatedId: id,
        relatedType: "citizen_request",
        metadata: {
          processingReport,
          blockchainTransactions: processingReport.blockchainTransactions
        }
      });
      
      // Финальная запись в блокчейн о завершении всей обработки
      const finalTransactionHash = await recordToBlockchain({
        entityId: id,
        entityType: 'citizen_request',
        action: 'full_processing_completed',
        metadata: {
          agentId,
          processingReport: {
            requestId: id,
            completedAt: processingReport.completedAt,
            classification: processingReport.summary.classification,
            activityId: completionActivity.id
          }
        }
      });
      
      // Обновляем активность с хешем блокчейна
      await storage.updateActivity(completionActivity.id, {
        blockchainHash: finalTransactionHash
      });
      
      // Добавляем отчет к ответу
      updatedRequest.processingReport = processingReport;
      
      // Возвращаем обновленное обращение с отчетом
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error processing request with agent:", error);
      res.status(500).json({ error: 'Failed to process request with agent', details: error.message });
    }
  });
  
  // Process citizen request with AI
  app.post('/api/citizen-requests/:id/process', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }
    
    try {
      // Получаем обращение гражданина
      const request = await storage.getCitizenRequest(id);
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }
      
      // Инициализируем сервис агентов
      try {
        await agentService.initialize();
      } catch (initError) {
        console.error("Failed to initialize agent service:", initError);
      }
      
      // Формируем содержимое для обработки
      const content = `Тема: ${request.subject || ''}
      
      Описание:
      ${request.description || ''}
      
      Контактная информация:
      ФИО: ${request.fullName}
      Контакты: ${request.contactInfo}`;
      
      // Обрабатываем запрос с использованием организационной структуры
      const fullText = `${request.subject || ''} ${request.description || ''}`;
      
      // Обновляем статус и добавляем базовое резюме, чтобы не блокировать процесс
      let updatedRequest = await storage.updateCitizenRequest(id, {
        status: 'in_progress',
        aiProcessed: true,
        summary: "Обращение гражданина обрабатывается. Ожидайте ответа от компетентных органов."
      });
      
      try {
        const orgStructureResult = await processRequestByOrgStructure(id, fullText);
        
        // Обновляем обращение, если оно было успешно обработано по организационной структуре
        if (orgStructureResult.processed) {
          updatedRequest = await storage.updateCitizenRequest(id, {
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
      } catch (orgError) {
        console.error("Ошибка при организационной обработке:", orgError);
      }
      
      try {
        // Обрабатываем запрос с помощью AI-агента - сначала классификация
        const classificationResult = await agentService.processRequest({
          taskType: 'classification',
          entityType: 'citizen_request',
          entityId: request.id,
          content,
          userId: request.assignedTo || 1
        });
        
        // Затем генерация ответа с учетом результата классификации
        const responseResult = await agentService.processRequest({
          taskType: 'response_generation',
          entityType: 'citizen_request',
          entityId: request.id,
          content,
          metadata: {
            classification: classificationResult.classification || 'general'
          },
          userId: request.assignedTo || 1
        });
        
        // Обновляем обращение в хранилище с результатами обработки
        updatedRequest = await storage.updateCitizenRequest(id, {
          aiProcessed: true,
          aiClassification: classificationResult.classification || 'general',
          aiSuggestion: responseResult.output || 'Рекомендуется обработка специалистом',
          summary: classificationResult.output || 'Требуется дополнительная информация'
        });
        
        // Create activity record
        try {
          await storage.createActivity({
            userId: request.assignedTo || 1,
            actionType: 'ai_process',
            description: `Запрос гражданина обработан AI-агентом`,
            relatedId: request.id,
            relatedType: 'citizen_request',
            metadata: {
              classification: classificationResult.classification,
              transactionHash: responseResult.transactionHash
            }
          });
          
          // Записываем результаты работы агента в таблицу agent_results
          await storage.createAgentResult({
            agentId: classificationResult.agentId || 202, // Используем AgentSmith или резервный ID
            entityType: 'citizen_request',
            entityId: request.id,
            actionType: 'classification', // Важно: используем actionType, соответствующий типу задачи
            result: {
              classification: classificationResult.classification || 'general',
              confidence: 0.8,
              output: classificationResult.output
            }
          });
          
          // Записываем результат генерации ответа
          await storage.createAgentResult({
            agentId: responseResult.agentId || 202,
            entityType: 'citizen_request',
            entityId: request.id,
            actionType: 'response_generation', // Важно: используем actionType, соответствующий типу задачи
            result: {
              response: responseResult.output,
              transactionHash: responseResult.transactionHash
            }
          });
        } catch (activityError) {
          console.error("Ошибка при записи активности или результатов:", activityError);
        }
      } catch (aiError) {
        console.error("Ошибка классификации обращения:", aiError);
      }
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error processing citizen request with AI:", error);
      res.status(500).json({ error: error.message || "Ошибка обработки запроса" });
    }
  });

  // Documentolog integration route
  // API для приема обращений извне
  // Create test citizen requests for demo purposes
  app.post('/api/v1/citizen-requests/generate-test', async (req, res) => {
    try {
      const { count = 10 } = req.body;
      const results = [];
      
      // Test data for generating random requests
      const names = [
        'Нурсултан Бердыбаев',
        'Дамир Сатпаев',
        'Касым-Жомарт Токаев',
        'Айгуль Нургалиева',
        'Мадина Халыкова',
        'Аслан Джумагулов',
        'Бауыржан Баибек',
        'Гульнара Сагинтаева',
        'Акмарал Турганбаев',
        'Максат Бекес',
        'Дарига Назарбаева',
        'Жансая Токтарова'
      ];
      
      const contacts = [
        'example1@mail.kz',
        'example2@gmail.com',
        'example3@yandex.kz',
        '+7 (701) 123-45-67',
        '+7 (702) 987-65-43',
        '+7 (705) 555-33-22',
        '+7 (777) 111-22-33',
        'contact@mail.ru',
        'user_mail@inbox.ru',
        'profile@domain.com',
        '+7 (747) 456-78-90',
        '+7 (708) 987-56-34'
      ];
      
      const subjects = [
        'Запрос на получение справки о регистрации',
        'Жалоба на качество работы коммунальных служб',
        'Заявление на оформление государственной субсидии',
        'Просьба о ремонте дороги в микрорайоне',
        'Запрос на получение информации о социальных программах',
        'Заявление о нарушении градостроительных норм',
        'Обращение по вопросу трудоустройства',
        'Запрос на получение выписки из домовой книги',
        'Жалоба на работу общественного транспорта',
        'Заявление на получение адресной помощи',
        'Просьба об установке детской площадки',
        'Запрос на разъяснение по налоговым льготам'
      ];
      
      const descriptions = [
        'Прошу выдать мне справку о регистрации по месту жительства для предоставления в банк. Ранее обращался в ЦОН, но получил отказ из-за отсутствия каких-то документов.',
        'В нашем доме по ул. Абая, 45 уже третий день отсутствует горячая вода. Звонки в аварийную службу игнорируются. Прошу принять меры!',
        'Прошу рассмотреть мою заявку на получение субсидии для малоимущих семей. Я одинокая мать с двумя детьми, работаю на неполную ставку. Все необходимые документы прилагаю.',
        'На перекрестке улиц Жибек Жолы и Туран уже более месяца большая яма, которая создает аварийные ситуации. Прошу срочно провести ремонт.',
        'Хотел бы узнать подробнее о программе поддержки молодых специалистов. Какие документы необходимы для участия в программе и каковы условия?',
        'Рядом с нашим домом по адресу Манаса 37 ведется незаконное строительство высотного здания, которое закрывает доступ света в наши квартиры. Прошу провести проверку.',
        'Я окончил университет по специальности "Информационные технологии" и ищу возможности трудоустройства в государственных организациях. Какие программы существуют для молодых специалистов?',
        'Прошу выдать мне выписку из домовой книги для оформления наследства. Мой адрес: г. Астана, ул. Ауэзова, дом 15, кв. 47.',
        'Автобус №7, следующий по маршруту Достык-Аэропорт, систематически не соблюдает график движения. Интервал между автобусами достигает 40 минут, что недопустимо в часы пик.',
        'Я мать-одиночка с ребенком-инвалидом. Прошу предоставить информацию о возможности получения адресной социальной помощи и льгот на оплату коммунальных услуг.',
        'В нашем дворе нет детской площадки, хотя в доме проживает более 50 детей. Просим рассмотреть возможность установки детской площадки по адресу Мкр. Саяхат, дом 17.',
        'Прошу разъяснить, какие налоговые льготы положены пенсионерам старше 70 лет и какие документы необходимо предоставить для их получения.'
      ];
      
      const requestTypes = [
        'general', 'housing', 'social', 'transportation', 'document', 'utilities'
      ];
      
      const priorities = ['low', 'medium', 'high', 'urgent'];
      
      // Create test requests
      for (let i = 0; i < count; i++) {
        // Generate random indices
        const nameIndex = Math.floor(Math.random() * names.length);
        const contactIndex = Math.floor(Math.random() * contacts.length);
        const subjectIndex = Math.floor(Math.random() * subjects.length);
        const descriptionIndex = Math.floor(Math.random() * descriptions.length);
        const typeIndex = Math.floor(Math.random() * requestTypes.length);
        const priorityIndex = Math.floor(Math.random() * priorities.length);
        
        // Create request
        const request = await storage.createCitizenRequest({
          fullName: names[nameIndex],
          contactInfo: contacts[contactIndex],
          subject: subjects[subjectIndex],
          description: descriptions[descriptionIndex],
          requestType: requestTypes[typeIndex],
          status: 'new',
          priority: priorities[priorityIndex],
          createdAt: new Date(),
          citizenInfo: {
            name: names[nameIndex],
            contact: contacts[contactIndex]
          }
        });
        
        results.push(request);
      }
      
      res.json({
        success: true,
        message: `Successfully created ${results.length} test citizen requests`,
        count: results.length
      });
    } catch (error) {
      console.error('Error generating test requests:', error);
      res.status(500).json({ error: 'Failed to generate test requests' });
    }
  });
  
  app.post('/api/external/citizen-requests', async (req, res) => {
    try {
      const { fullName, contactInfo, subject, description, requestType, priority, citizenInfo, sourceSystem, externalId } = req.body;
      
      // Базовая валидация
      if (!fullName || !description) {
        return res.status(400).json({ 
          error: 'Missing required fields', 
          message: 'Fields fullName and description are required' 
        });
      }
      
      // Создаем обращение
      const newRequest = await storage.createCitizenRequest({
        fullName,
        contactInfo: contactInfo || "",
        subject: subject || 'Новое обращение',
        description,
        requestType: requestType || 'general',
        priority: priority || 'medium',
        status: 'new',
        source: sourceSystem || 'external_api',
        createdAt: new Date(),
        citizenInfo: citizenInfo || {}
      });
      
      // Логируем активность
      await storage.createActivity({
        actionType: 'citizen_request_created',
        description: `Создано новое внешнее обращение: ${newRequest.subject}`,
        relatedId: newRequest.id,
        relatedType: 'citizen_request'
      });
      
      // Автоматическая обработка, если включена
      let processingResult = { autoProcessing: false };
      
      const agentEnabled = await storage.getAgentsByType("citizen_requests")
        .then(agents => agents.length > 0 ? agents[0].isActive : false);
      
      if (agentEnabled) {
        try {
          // Запускаем обработку в фоновом режиме
          // Не блокируем ответ
          process.nextTick(async () => {
            try {
              // Вызываем маршрут обработки
              await fetch(`http://localhost:${process.env.PORT || 5000}/api/citizen-requests/${newRequest.id}/process`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                }
              });
            } catch (e) {
              console.error('Background processing error:', e);
            }
          });
          
          processingResult = { autoProcessing: true, status: 'in_progress' };
        } catch (procError) {
          console.error('Error initiating auto-processing:', procError);
          processingResult = { autoProcessing: false, error: procError.message };
        }
      } else {
        processingResult = { autoProcessing: false, reason: 'AI processing disabled' };
      }
      
      // Возвращаем результат
      res.status(201).json({
        success: true,
        request: newRequest,
        processing: processingResult,
        message: 'Citizen request created successfully'
      });
    } catch (error) {
      console.error('Error creating external citizen request:', error);
      res.status(500).json({ error: error.message || 'Failed to create citizen request' });
    }
  });

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
  
  // API для шаблонов bolt.new
  app.get('/api/bolt-templates', async (req, res) => {
    try {
      // Получаем список доступных шаблонов для bolt.new
      const templates = [
        {
          id: 'landing-page',
          name: 'Лендинг с формой обращения',
          description: 'Одностраничный сайт с встроенной формой обращения граждан Agent Smith',
          tech: 'html-css-js',
          difficulty: 'easy',
          thumbnail: '/assets/templates/landing-template.png',
          category: 'government'
        },
        {
          id: 'react-spa',
          name: 'React SPA с виджетом',
          description: 'React одностраничное приложение с встроенным виджетом Agent Smith',
          tech: 'react',
          difficulty: 'medium',
          thumbnail: '/assets/templates/react-template.png',
          category: 'business'
        },
        {
          id: 'vue-business',
          name: 'Vue бизнес-сайт',
          description: 'Многостраничный сайт на Vue с интегрированной формой обращений',
          tech: 'vue',
          difficulty: 'medium',
          thumbnail: '/assets/templates/vue-template.png',
          category: 'business'
        },
        {
          id: 'next-public-portal',
          name: 'Next.js портал',
          description: 'Next.js портал государственного учреждения с формой обращений',
          tech: 'next',
          difficulty: 'advanced',
          thumbnail: '/assets/templates/next-template.png',
          category: 'government'
        }
      ];
      
      return res.json({
        success: true,
        templates
      });
    } catch (error) {
      console.error('Ошибка при получении шаблонов bolt.new:', error);
      return res.status(500).json({
        success: false,
        message: 'Ошибка при получении шаблонов'
      });
    }
  });
  
  // Получение конкретного шаблона по ID
  app.get('/api/bolt-templates/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // В реальном приложении здесь был бы запрос к базе данных
      // Для демонстрации возвращаем тестовые данные
      
      const templateData = {
        id,
        name: id === 'landing-page' ? 'Лендинг с формой обращения' : 'Шаблон',
        files: {
          'index.html': getTemplateContent(id, 'index.html'),
          'style.css': getTemplateContent(id, 'style.css'),
          'script.js': getTemplateContent(id, 'script.js')
        },
        widgetConfig: {
          containerId: 'agent-smith-form',
          title: 'Обращение граждан',
          subtitle: 'Отправьте ваше обращение через форму',
          primaryColor: '#1e40af',
          theme: 'light',
          fields: [
            {
              id: 'name',
              type: 'text',
              label: 'ФИО',
              placeholder: 'Введите ваше полное имя',
              required: true
            },
            {
              id: 'email',
              type: 'email',
              label: 'Email',
              placeholder: 'Введите ваш email',
              required: true
            },
            {
              id: 'subject',
              type: 'text',
              label: 'Тема обращения',
              placeholder: 'Введите тему обращения',
              required: true
            },
            {
              id: 'message',
              type: 'textarea',
              label: 'Текст обращения',
              placeholder: 'Подробно опишите ваше обращение',
              required: true
            }
          ]
        }
      };
      
      return res.json({
        success: true,
        template: templateData
      });
    } catch (error) {
      console.error('Ошибка при получении шаблона bolt.new:', error);
      return res.status(500).json({
        success: false,
        message: 'Ошибка при получении шаблона'
      });
    }
  });
  
  // API для интеграции виджета
  app.post('/api/widget-integration', async (req, res) => {
    try {
      const { integrationMethod, websiteUrl, widgetConfig } = req.body;
      
      if (!integrationMethod || !widgetConfig) {
        return res.status(400).json({
          success: false,
          message: 'Отсутствуют обязательные параметры'
        });
      }
      
      // Генерируем код для выбранного метода интеграции
      let integrationCode = '';
      const encodedConfig = Buffer.from(encodeURIComponent(JSON.stringify(widgetConfig))).toString('base64');
      const widgetId = 'agent-smith-widget-' + Date.now();
      
      switch (integrationMethod) {
        case 'js':
          // JavaScript виджет
          integrationCode = `
<!-- Agent Smith Widget -->
<div id="${widgetId}"></div>
<script src="https://agent-smith.replit.app/widget.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    AgentSmithWidget.init('${widgetId}', '${encodedConfig}');
  });
</script>`;
          break;
          
        case 'iframe':
          // iFrame интеграция
          const iframeUrl = `https://agent-smith.replit.app/embed/form?config=${encodedConfig}`;
          integrationCode = `
<!-- Agent Smith Widget (iframe) -->
<iframe 
  src="${iframeUrl}" 
  width="100%" 
  height="600px" 
  style="border: none; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);" 
  title="Agent Smith Form">
</iframe>`;
          break;
          
        case 'api':
          // API интеграция
          integrationCode = `
// Agent Smith API Integration
// Отправка обращения через API

const submitForm = async (formData) => {
  try {
    const response = await fetch('https://agent-smith.replit.app/api/citizen-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: formData.fullName,
        contactInfo: formData.contactInfo,
        subject: formData.subject,
        description: formData.description,
        requestType: formData.requestType || 'Обращение через API'
      })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error submitting form:', error);
    throw error;
  }
};

// Пример использования:
// submitForm({
//   fullName: 'Иванов Иван Иванович',
//   contactInfo: 'ivanov@example.com',
//   subject: 'Тема обращения',
//   description: 'Текст обращения...'
// }).then(result => console.log(result));`;
          break;
          
        case 'bolt':
          // Специальный код для bolt.new
          integrationCode = `
<!-- Agent Smith Widget для bolt.new -->
<div id="${widgetId}" class="bolt-theme"></div>
<script src="https://agent-smith.replit.app/widget.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    AgentSmithWidget.init('${widgetId}', '${encodedConfig}', {
      mode: 'widget'
    });
  });
</script>`;
          break;
          
        default:
          return res.status(400).json({
            success: false,
            message: 'Неизвестный метод интеграции'
          });
      }
      
      return res.json({
        success: true,
        integrationCode,
        widgetId,
        encodedConfig
      });
    } catch (error) {
      console.error('Ошибка при генерации кода интеграции:', error);
      return res.status(500).json({
        success: false,
        message: 'Ошибка при генерации кода интеграции'
      });
    }
  });
  
  /**
   * Получает содержимое файла шаблона для bolt.new
   */
  function getTemplateContent(templateId, filename) {
    // В реальном приложении здесь был бы запрос к файловой системе или базе данных
    
    if (templateId === 'landing-page') {
      if (filename === 'index.html') {
        return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Государственный портал</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <div class="container">
      <div class="logo">
        <img src="https://agent-smith.replit.app/assets/logo.png" alt="Логотип">
        <h1>Гос<span>Портал</span></h1>
      </div>
      <nav>
        <ul>
          <li><a href="#services">Услуги</a></li>
          <li><a href="#about">О нас</a></li>
          <li><a href="#contact">Контакты</a></li>
        </ul>
      </nav>
    </div>
  </header>
  
  <section class="hero">
    <div class="container">
      <h2>Быстрое и удобное взаимодействие с государственными органами</h2>
      <p>Отправьте ваше обращение онлайн и получите ответ в кратчайшие сроки</p>
      <a href="#form" class="btn primary">Отправить обращение</a>
    </div>
  </section>
  
  <section id="services" class="services">
    <div class="container">
      <h2>Наши услуги</h2>
      <div class="services-grid">
        <div class="service-card">
          <div class="icon">📄</div>
          <h3>Обращения граждан</h3>
          <p>Быстрая обработка обращений с использованием ИИ</p>
        </div>
        <div class="service-card">
          <div class="icon">📋</div>
          <h3>Справки и документы</h3>
          <p>Получение справок и выписок в электронном виде</p>
        </div>
        <div class="service-card">
          <div class="icon">📊</div>
          <h3>Отчетность</h3>
          <p>Сдача отчетности в электронном виде</p>
        </div>
      </div>
    </div>
  </section>
  
  <section id="form" class="form-section">
    <div class="container">
      <h2>Форма обращения</h2>
      <div id="agent-smith-form"></div>
    </div>
  </section>
  
  <section id="about" class="about">
    <div class="container">
      <h2>О нас</h2>
      <p>Мы работаем для того, чтобы сделать взаимодействие с государственными органами простым и удобным. Наша цель - обеспечить качественное обслуживание граждан с использованием современных технологий.</p>
    </div>
  </section>
  
  <section id="contact" class="contact">
    <div class="container">
      <h2>Контакты</h2>
      <div class="contact-info">
        <div>
          <h3>Адрес</h3>
          <p>г. Москва, ул. Примерная, д. 123</p>
        </div>
        <div>
          <h3>Телефон</h3>
          <p>+7 (123) 456-78-90</p>
        </div>
        <div>
          <h3>Email</h3>
          <p>info@gosportal.example</p>
        </div>
      </div>
    </div>
  </section>
  
  <footer>
    <div class="container">
      <p>&copy; 2025 ГосПортал. Все права защищены.</p>
    </div>
  </footer>

  <script src="https://agent-smith.replit.app/widget.js"></script>
  <script src="script.js"></script>
</body>
</html>`;
      } else if (filename === 'style.css') {
        return `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: #333;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

header {
  background-color: #fff;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
}

.logo {
  display: flex;
  align-items: center;
}

.logo img {
  width: 40px;
  margin-right: 10px;
}

.logo h1 {
  font-size: 24px;
  font-weight: 700;
}

.logo span {
  color: #1e40af;
}

nav ul {
  display: flex;
  list-style: none;
}

nav ul li {
  margin-left: 20px;
}

nav ul li a {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  transition: color 0.3s;
}

nav ul li a:hover {
  color: #1e40af;
}

.hero {
  background: linear-gradient(135deg, #1e40af, #3b82f6);
  color: white;
  padding: 80px 0;
  text-align: center;
}

.hero h2 {
  font-size: 36px;
  margin-bottom: 20px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.hero p {
  font-size: 18px;
  margin-bottom: 30px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.btn {
  display: inline-block;
  padding: 12px 24px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s;
}

.btn.primary {
  background-color: white;
  color: #1e40af;
}

.btn.primary:hover {
  background-color: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

section {
  padding: 80px 0;
}

section h2 {
  text-align: center;
  margin-bottom: 40px;
  font-size: 32px;
  color: #1e40af;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}

.service-card {
  background-color: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  text-align: center;
  transition: transform 0.3s, box-shadow 0.3s;
}

.service-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}

.service-card .icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.service-card h3 {
  margin-bottom: 15px;
  color: #1e40af;
}

.form-section {
  background-color: #f8fafc;
}

.contact-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
}

.contact-info h3 {
  color: #1e40af;
  margin-bottom: 10px;
}

footer {
  background-color: #1e40af;
  color: white;
  padding: 20px 0;
  text-align: center;
}

@media (max-width: 768px) {
  header .container {
    flex-direction: column;
  }
  
  nav ul {
    margin-top: 15px;
  }
  
  .hero h2 {
    font-size: 28px;
  }
  
  section {
    padding: 60px 0;
  }
}`;
      } else if (filename === 'script.js') {
        return `// Скрипт для демо-сайта с виджетом Agent Smith

document.addEventListener('DOMContentLoaded', function() {
  // Инициализация виджета Agent Smith
  const widgetConfig = {
    title: "Отправить обращение",
    subtitle: "Заполните форму и получите ответ в кратчайшие сроки",
    theme: "light",
    primaryColor: "#1e40af",
    buttonText: "Отправить",
    successMessage: "Ваше обращение отправлено!",
    fields: [
      {
        id: "name",
        type: "text",
        label: "ФИО",
        placeholder: "Введите ваше полное имя",
        required: true
      },
      {
        id: "email",
        type: "email",
        label: "Email",
        placeholder: "Введите ваш email для связи",
        required: true
      },
      {
        id: "tel",
        type: "tel",
        label: "Телефон",
        placeholder: "Введите ваш телефон",
        required: false
      },
      {
        id: "requestType",
        type: "select",
        label: "Тип обращения",
        placeholder: "Выберите тип обращения",
        required: true,
        options: [
          "Жалоба",
          "Предложение",
          "Запрос информации",
          "Благодарность",
          "Иное"
        ]
      },
      {
        id: "subject",
        type: "text",
        label: "Тема обращения",
        placeholder: "Кратко опишите тему обращения",
        required: true
      },
      {
        id: "message",
        type: "textarea",
        label: "Текст обращения",
        placeholder: "Подробно опишите ваше обращение",
        required: true
      },
      {
        id: "agreement",
        type: "checkbox",
        label: "Согласие на обработку персональных данных",
        placeholder: "Я согласен на обработку моих персональных данных",
        required: true
      }
    ]
  };
  
  // Кодируем настройки в base64
  const encodedConfig = btoa(encodeURIComponent(JSON.stringify(widgetConfig)));
  
  // Инициализируем виджет
  if (typeof AgentSmithWidget !== 'undefined') {
    AgentSmithWidget.init('agent-smith-form', encodedConfig);
  }
  
  // Плавная прокрутка для навигации
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 80,
          behavior: 'smooth'
        });
      }
    });
  });
});`;
      }
    }
    
    // Для других шаблонов можно добавить похожую логику
    
    return `// Шаблон для ${templateId} - ${filename} будет доступен позже`;
  }
  
  // API маршруты для интеграции с bolt.new
  
  // Получение доступных шаблонов для bolt.new
  app.get('/api/bolt/templates', (req, res) => {
    try {
      const templates = [
        {
          id: 'landing',
          name: 'Лендинг страница',
          description: 'Простая целевая страница с формой обращения',
          imageUrl: '/templates/landing-preview.png',
          category: 'business'
        },
        {
          id: 'business',
          name: 'Бизнес сайт',
          description: 'Многостраничный бизнес сайт с формой контакта',
          imageUrl: '/templates/business-preview.png',
          category: 'business'
        },
        {
          id: 'government',
          name: 'Гос. учреждение',
          description: 'Шаблон сайта для государственных учреждений',
          imageUrl: '/templates/gov-preview.png',
          category: 'government'
        },
        {
          id: 'portfolio',
          name: 'Портфолио',
          description: 'Персональный сайт-портфолио с контактной формой',
          imageUrl: '/templates/portfolio-preview.png',
          category: 'personal'
        },
        {
          id: 'ecommerce',
          name: 'Интернет-магазин',
          description: 'Шаблон интернет-магазина с формой обратной связи',
          imageUrl: '/templates/ecommerce-preview.png',
          category: 'business'
        }
      ];
      
      res.json({ success: true, templates });
    } catch (error) {
      console.error('Ошибка при получении шаблонов bolt.new:', error);
      res.status(500).json({ success: false, message: 'Ошибка при получении шаблонов' });
    }
  });
  
  // Получение конкретного шаблона по ID для bolt.new
  app.get('/api/bolt/templates/:id', (req, res) => {
    try {
      const { id } = req.params;
      
      // Найдем шаблон по ID
      const template = {
        id,
        name: id === 'landing' ? 'Лендинг страница' :
              id === 'business' ? 'Бизнес сайт' :
              id === 'government' ? 'Гос. учреждение' :
              id === 'portfolio' ? 'Портфолио' :
              id === 'ecommerce' ? 'Интернет-магазин' : 'Неизвестный шаблон',
        description: 'Шаблон сайта с интегрированной формой обращений Agent Smith',
        files: {
          'index.html': getTemplateContent(id, 'index.html'),
          'style.css': getTemplateContent(id, 'style.css'),
          'script.js': getTemplateContent(id, 'script.js')
        },
        integrationOptions: {
          widget: {
            code: `<!-- Agent Smith Widget -->
<div id="agent-smith-widget"></div>
<script src="https://agent-smith.replit.app/widget.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (window.AgentSmithWidget) {
      AgentSmithWidget.init('agent-smith-widget', 'BASE64_CONFIG_HERE');
    }
  });
</script>`
          },
          iframe: {
            code: `<!-- Agent Smith Embedded Form -->
<iframe 
  src="https://agent-smith.replit.app/embed?config=BASE64_CONFIG_HERE" 
  style="width: 100%; height: 600px; border: none; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);"
  title="Agent Smith Form"
  loading="lazy"
></iframe>`
          },
          api: {
            code: `// Agent Smith API Integration
// Замените YOUR_API_KEY на ваш API ключ

// Отправка обращения через API
async function submitRequestToAgentSmith(requestData) {
  try {
    const response = await fetch('https://agent-smith.replit.app/api/citizen-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'YOUR_API_KEY',
        'Origin': window.location.origin
      },
      body: JSON.stringify(requestData)
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Ошибка при отправке обращения:', error);
    throw error;
  }
}`
          }
        }
      };
      
      res.json({ success: true, template });
    } catch (error) {
      console.error('Ошибка при получении шаблона bolt.new:', error);
      res.status(500).json({ success: false, message: 'Ошибка при получении шаблона' });
    }
  });
  
  // Генерация конфигурации для bolt.new
  app.post('/api/bolt/generate-config', (req, res) => {
    try {
      const { templateId, integrationMethod, widgetConfig } = req.body;
      
      if (!templateId || !integrationMethod || !widgetConfig) {
        return res.status(400).json({ 
          success: false, 
          message: 'Не указаны обязательные параметры' 
        });
      }
      
      // Создаем конфигурацию для bolt.new
      const boltConfig = {
        name: `Agent Smith - ${templateId}`,
        description: `Шаблон сайта с интеграцией формы обращений Agent Smith. Метод интеграции: ${
          integrationMethod === 'widget' ? 'JavaScript виджет' : 
          integrationMethod === 'iframe' ? 'Встроенный iframe' : 'API'
        }`,
        template: templateId,
        integrationMethod,
        agentSmithConfig: widgetConfig,
        // Добавить ключи для bolt.new
        boltVersion: "1.0.0",
        stack: templateId === 'landing' ? 'html' : 'react',
        dependencies: templateId === 'landing' ? [] : ['react', 'react-dom']
      };
      
      res.json({ 
        success: true, 
        config: boltConfig,
        base64Config: Buffer.from(JSON.stringify(boltConfig)).toString('base64')
      });
    } catch (error) {
      console.error('Ошибка при генерации конфигурации bolt.new:', error);
      res.status(500).json({ success: false, message: 'Ошибка при генерации конфигурации' });
    }
  });

  // API для работы с базами знаний агентов
  app.get('/api/knowledge-bases', async (req, res) => {
    try {
      const agentId = req.query.agentId ? parseInt(req.query.agentId as string) : undefined;
      
      let knowledgeBases;
      if (agentId) {
        knowledgeBases = await storage.getAgentKnowledgeBases(agentId);
      } else {
        knowledgeBases = await storage.getAllAgentKnowledgeBases();
      }
      
      res.json(knowledgeBases);
    } catch (error) {
      console.error('Error fetching knowledge bases:', error);
      res.status(500).json({ error: 'Failed to fetch knowledge bases: ' + error.message });
    }
  });

  app.get('/api/knowledge-bases/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const knowledgeBase = await storage.getAgentKnowledgeBase(id);
      
      if (!knowledgeBase) {
        return res.status(404).json({ error: 'Knowledge base not found' });
      }
      
      res.json(knowledgeBase);
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
      res.status(500).json({ error: 'Failed to fetch knowledge base: ' + error.message });
    }
  });

  app.post('/api/knowledge-bases', async (req, res) => {
    try {
      const knowledgeBaseData = req.body;
      const knowledgeBase = await storage.createAgentKnowledgeBase(knowledgeBaseData);
      
      res.status(201).json(knowledgeBase);
    } catch (error) {
      console.error('Error creating knowledge base:', error);
      res.status(500).json({ error: 'Failed to create knowledge base: ' + error.message });
    }
  });

  app.put('/api/knowledge-bases/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const knowledgeBaseData = req.body;
      
      const updatedKnowledgeBase = await storage.updateAgentKnowledgeBase(id, knowledgeBaseData);
      
      if (!updatedKnowledgeBase) {
        return res.status(404).json({ error: 'Knowledge base not found' });
      }
      
      res.json(updatedKnowledgeBase);
    } catch (error) {
      console.error('Error updating knowledge base:', error);
      res.status(500).json({ error: 'Failed to update knowledge base: ' + error.message });
    }
  });

  app.delete('/api/knowledge-bases/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAgentKnowledgeBase(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Knowledge base not found or already deleted' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting knowledge base:', error);
      res.status(500).json({ error: 'Failed to delete knowledge base: ' + error.message });
    }
  });

  // API для работы с документами баз знаний
  app.get('/api/knowledge-documents', async (req, res) => {
    try {
      const knowledgeBaseId = req.query.knowledgeBaseId ? parseInt(req.query.knowledgeBaseId as string) : undefined;
      
      if (!knowledgeBaseId) {
        return res.status(400).json({ error: 'Knowledge base ID is required' });
      }
      
      const documents = await storage.getKnowledgeDocuments(knowledgeBaseId);
      res.json(documents);
    } catch (error) {
      console.error('Error fetching knowledge documents:', error);
      res.status(500).json({ error: 'Failed to fetch knowledge documents: ' + error.message });
    }
  });

  app.get('/api/knowledge-documents/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getKnowledgeDocument(id);
      
      if (!document) {
        return res.status(404).json({ error: 'Knowledge document not found' });
      }
      
      res.json(document);
    } catch (error) {
      console.error('Error fetching knowledge document:', error);
      res.status(500).json({ error: 'Failed to fetch knowledge document: ' + error.message });
    }
  });

  app.post('/api/knowledge-documents', async (req, res) => {
    try {
      const documentData = req.body;
      const document = await storage.createKnowledgeDocument(documentData);
      
      res.status(201).json(document);
    } catch (error) {
      console.error('Error creating knowledge document:', error);
      res.status(500).json({ error: 'Failed to create knowledge document: ' + error.message });
    }
  });

  app.put('/api/knowledge-documents/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const documentData = req.body;
      
      const updatedDocument = await storage.updateKnowledgeDocument(id, documentData);
      
      if (!updatedDocument) {
        return res.status(404).json({ error: 'Knowledge document not found' });
      }
      
      res.json(updatedDocument);
    } catch (error) {
      console.error('Error updating knowledge document:', error);
      res.status(500).json({ error: 'Failed to update knowledge document: ' + error.message });
    }
  });

  app.delete('/api/knowledge-documents/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteKnowledgeDocument(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Knowledge document not found or already deleted' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting knowledge document:', error);
      res.status(500).json({ error: 'Failed to delete knowledge document: ' + error.message });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
