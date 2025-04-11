import type { Express, Request, Response } from "express";
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
  translateText 
} from "./services/openai";
import { recordToBlockchain, verifyBlockchainRecord } from "./services/blockchain";
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
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const records = await storage.getRecentBlockchainRecords(limit);
    res.json(records);
  });
  
  app.post('/api/blockchain/verify', async (req, res) => {
    const { transactionHash } = req.body;
    
    if (!transactionHash) {
      return res.status(400).json({ error: 'Transaction hash is required' });
    }
    
    try {
      const verificationResult = await verifyBlockchainRecord(transactionHash);
      res.json(verificationResult);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/blockchain/record', async (req, res) => {
    try {
      const { type, title, content, metadata, userId, taskId, documentId } = req.body;
      
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
      
      // Create blockchain record
      const blockchainRecord = await storage.createBlockchainRecord({
        recordType: type,
        title,
        taskId: taskId ? parseInt(taskId) : null,
        documentId: documentId ? parseInt(documentId) : null,
        transactionHash: blockchainResult.transactionHash,
        status: blockchainResult.status,
        metadata: {
          content,
          ...metadata
        }
      });
      
      // Create activity
      if (userId) {
        await storage.createActivity({
          userId: parseInt(userId),
          actionType: 'blockchain_record_created',
          description: `Created blockchain record "${title}"`,
          relatedId: blockchainRecord.id,
          relatedType: 'blockchain_record',
          blockchainHash: blockchainResult.transactionHash
        });
      }
      
      res.json({
        record: blockchainRecord,
        blockchain: blockchainResult
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Activity routes
  app.get('/api/activities', async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const activities = await storage.getRecentActivities(limit);
    res.json(activities);
  });

  // System status routes
  app.get('/api/system/status', async (req, res) => {
    const statuses = await storage.getSystemStatuses();
    res.json(statuses);
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
      const agents = await storage.getAgents();
      res.json(agents);
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

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
