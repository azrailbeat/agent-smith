/**
 * API маршруты для управления ИИ-агентами
 */

import express, { Request, Response } from 'express';
import { agentManagementService, Agent, AgentType, CreateAgentData, UpdateAgentData } from '../services/agent-management';

const router = express.Router();

/**
 * Получение всех агентов
 * GET /api/agents
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const agents = agentManagementService.getAllAgents();
    res.json(agents);
  } catch (error) {
    console.error('Ошибка при получении агентов:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении агентов' });
  }
});

/**
 * Получение агента по ID
 * GET /api/agents/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID агента должен быть числом' });
    }

    const agent = agentManagementService.getAgentById(id);
    if (!agent) {
      return res.status(404).json({ error: 'Агент не найден' });
    }

    res.json(agent);
  } catch (error) {
    console.error('Ошибка при получении агента:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении агента' });
  }
});

/**
 * Получение агентов по типу
 * GET /api/agents/type/:type
 */
router.get('/type/:type', (req: Request, res: Response) => {
  try {
    const type = req.params.type;
    const agents = agentManagementService.getAgentsByType(type as AgentType);
    res.json(agents);
  } catch (error) {
    console.error('Ошибка при получении агентов по типу:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении агентов по типу' });
  }
});

/**
 * Получение активных агентов
 * GET /api/agents/active
 */
router.get('/active', (req: Request, res: Response) => {
  try {
    const agents = agentManagementService.getActiveAgents();
    res.json(agents);
  } catch (error) {
    console.error('Ошибка при получении активных агентов:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении активных агентов' });
  }
});

/**
 * Получение активных агентов по типу
 * GET /api/agents/active/:type
 */
router.get('/active/:type', (req: Request, res: Response) => {
  try {
    const type = req.params.type;
    const agents = agentManagementService.getActiveAgentsByType(type as AgentType);
    res.json(agents);
  } catch (error) {
    console.error('Ошибка при получении активных агентов по типу:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении активных агентов по типу' });
  }
});

/**
 * Создание нового агента
 * POST /api/agents
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const agentData: CreateAgentData = req.body;
    
    // Проверка обязательных полей
    if (!agentData.name || !agentData.type || !agentData.model) {
      return res.status(400).json({ error: 'Необходимо указать имя, тип и модель агента' });
    }
    
    const newAgent = agentManagementService.createAgent(agentData);
    res.status(201).json(newAgent);
  } catch (error) {
    console.error('Ошибка при создании агента:', error);
    res.status(500).json({ error: 'Ошибка сервера при создании агента' });
  }
});

/**
 * Обновление агента
 * PATCH /api/agents/:id
 */
router.patch('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID агента должен быть числом' });
    }
    
    const updateData: UpdateAgentData = req.body;
    const updatedAgent = agentManagementService.updateAgent(id, updateData);
    
    if (!updatedAgent) {
      return res.status(404).json({ error: 'Агент не найден' });
    }
    
    res.json(updatedAgent);
  } catch (error) {
    console.error('Ошибка при обновлении агента:', error);
    res.status(500).json({ error: 'Ошибка сервера при обновлении агента' });
  }
});

/**
 * Изменение статуса активности агента
 * PATCH /api/agents/:id/status
 */
router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID агента должен быть числом' });
    }
    
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'Поле isActive должно быть булевым значением' });
    }
    
    const updatedAgent = agentManagementService.setAgentStatus(id, isActive);
    
    if (!updatedAgent) {
      return res.status(404).json({ error: 'Агент не найден' });
    }
    
    res.json(updatedAgent);
  } catch (error) {
    console.error('Ошибка при изменении статуса агента:', error);
    res.status(500).json({ error: 'Ошибка сервера при изменении статуса агента' });
  }
});

/**
 * Удаление агента
 * DELETE /api/agents/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID агента должен быть числом' });
    }
    
    const success = agentManagementService.deleteAgent(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Агент не найден' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Ошибка при удалении агента:', error);
    res.status(500).json({ error: 'Ошибка сервера при удалении агента' });
  }
});

export default router;