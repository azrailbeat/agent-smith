/**
 * API маршруты для управления базами знаний и документами
 */
import express, { Request, Response } from 'express';
import { KnowledgeService, KnowledgeBaseCreateParams } from './knowledge-service';
import { VectorStorageType } from './vector-service';

// Создаем экземпляр сервиса для работы с базами знаний
const knowledgeService = new KnowledgeService({
  type: 'openai',
  modelName: 'text-embedding-ada-002',
  apiKey: process.env.OPENAI_API_KEY
});

// Регистрируем маршруты для работы с базами знаний
export function registerKnowledgeRoutes(router: express.Router): void {
  /**
   * Получить список всех баз знаний
   */
  router.get('/knowledge-bases', async (req: Request, res: Response) => {
    try {
      const knowledgeBases = await knowledgeService.getAllKnowledgeBases();
      res.json(knowledgeBases);
    } catch (error: any) {
      console.error('Error fetching knowledge bases:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Получить конкретную базу знаний по ID
   */
  router.get('/knowledge-bases/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const knowledgeBase = await knowledgeService.getKnowledgeBase(id);
      
      if (!knowledgeBase) {
        return res.status(404).json({ error: 'Knowledge base not found' });
      }
      
      res.json(knowledgeBase);
    } catch (error: any) {
      console.error('Error fetching knowledge base:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Создать новую базу знаний
   */
  router.post('/knowledge-bases', async (req: Request, res: Response) => {
    try {
      const params: KnowledgeBaseCreateParams = {
        name: req.body.name,
        description: req.body.description,
        agentId: req.body.agentId ? parseInt(req.body.agentId) : undefined,
        vectorStorageType: req.body.vectorStorageType as VectorStorageType,
        vectorStorageUrl: req.body.vectorStorageUrl,
        vectorStorageApiKey: req.body.vectorStorageApiKey,
        collectionName: req.body.collectionName
      };
      
      const knowledgeBase = await knowledgeService.createKnowledgeBase(params);
      res.status(201).json(knowledgeBase);
    } catch (error: any) {
      console.error('Error creating knowledge base:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Обновить существующую базу знаний
   */
  router.patch('/knowledge-bases/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = {
        name: req.body.name,
        description: req.body.description,
        agentId: req.body.agentId !== undefined ? (req.body.agentId ? parseInt(req.body.agentId) : null) : undefined,
        vectorStorageUrl: req.body.vectorStorageUrl,
        vectorStorageApiKey: req.body.vectorStorageApiKey
      };
      
      const knowledgeBase = await knowledgeService.updateKnowledgeBase(id, updates);
      res.json(knowledgeBase);
    } catch (error: any) {
      console.error('Error updating knowledge base:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Удалить базу знаний
   */
  router.delete('/knowledge-bases/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await knowledgeService.deleteKnowledgeBase(id);
      
      if (success) {
        res.status(204).send();
      } else {
        res.status(500).json({ error: 'Failed to delete knowledge base' });
      }
    } catch (error: any) {
      console.error('Error deleting knowledge base:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Получить документы из базы знаний
   */
  router.get('/knowledge-documents', async (req: Request, res: Response) => {
    try {
      const knowledgeBaseId = req.query.knowledgeBaseId ? parseInt(req.query.knowledgeBaseId as string) : undefined;
      
      if (!knowledgeBaseId) {
        return res.status(400).json({ error: 'Knowledge base ID is required' });
      }
      
      const documents = await knowledgeService.getDocuments(knowledgeBaseId);
      res.json(documents);
    } catch (error: any) {
      console.error('Error fetching knowledge documents:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Получить конкретный документ по ID
   */
  router.get('/knowledge-documents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const document = await knowledgeService.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      res.json(document);
    } catch (error: any) {
      console.error('Error fetching knowledge document:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Добавить новый документ в базу знаний
   */
  router.post('/knowledge-documents', async (req: Request, res: Response) => {
    try {
      const { knowledgeBaseId, title, content, metadata } = req.body;
      
      if (!knowledgeBaseId || !content) {
        return res.status(400).json({ error: 'Knowledge base ID and content are required' });
      }
      
      const result = await knowledgeService.addDocuments(parseInt(knowledgeBaseId), [{
        content,
        metadata: { ...metadata, title }
      }]);
      
      const document = await knowledgeService.getDocument(parseInt(result[0]));
      res.status(201).json(document);
    } catch (error: any) {
      console.error('Error creating knowledge document:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Удалить документ из базы знаний
   */
  router.delete('/knowledge-documents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const document = await knowledgeService.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      const success = await knowledgeService.deleteDocumentById(id);
      
      if (success) {
        res.status(204).send();
      } else {
        res.status(500).json({ error: 'Failed to delete document' });
      }
    } catch (error: any) {
      console.error('Error deleting knowledge document:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Выполнить семантический поиск по базе знаний
   */
  router.post('/knowledge-search', async (req: Request, res: Response) => {
    try {
      const { knowledgeBaseId, query, limit } = req.body;
      
      if (!knowledgeBaseId || !query) {
        return res.status(400).json({ error: 'Knowledge base ID and query are required' });
      }
      
      const results = await knowledgeService.search(parseInt(knowledgeBaseId), query, limit || 5);
      res.json(results);
    } catch (error: any) {
      console.error('Error performing knowledge search:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Получить статистику базы знаний
   */
  router.get('/knowledge-bases/:id/stats', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const stats = await knowledgeService.getKnowledgeBaseStats(id);
      res.json(stats);
    } catch (error: any) {
      console.error('Error fetching knowledge base stats:', error);
      res.status(500).json({ error: error.message });
    }
  });
}