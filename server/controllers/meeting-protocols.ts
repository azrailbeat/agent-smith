/**
 * Контроллер для модуля протоколов заседаний
 */
import { Request, Response } from 'express';
import { storage } from '../storage';
import { recordToBlockchain } from '../blockchain';
import { logActivity } from '../activity-logger';
import { agentService } from '../services/agent-service';

/**
 * Получение списка протоколов заседаний
 */
export async function getMeetings(req: Request, res: Response) {
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
}

/**
 * Получение протокола заседания по ID
 */
export async function getMeetingById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid meeting ID' });
    }
    
    const meeting = await storage.getMeeting(id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Логируем активность просмотра протокола
    await logActivity({
      action: 'view',
      entityType: 'meeting',
      entityId: meeting.id,
      details: `Просмотр протокола заседания "${meeting.title}"`
    });
    
    res.json(meeting);
  } catch (error: any) {
    console.error(`Error getting meeting by ID:`, error);
    res.status(500).json({ error: 'Failed to get meeting', details: error.message });
  }
}

/**
 * Создание нового протокола заседания
 */
export async function createMeeting(req: Request, res: Response) {
  try {
    const meetingData = req.body;
    
    if (!meetingData.title) {
      return res.status(400).json({ error: 'Meeting title is required' });
    }
    
    const meeting = await storage.createMeeting(meetingData);
    
    // Логируем активность создания протокола
    await logActivity({
      action: 'create',
      entityType: 'meeting',
      entityId: meeting.id,
      details: `Создан протокол заседания "${meeting.title}"`
    });
    
    res.status(201).json(meeting);
  } catch (error: any) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: 'Failed to create meeting', details: error.message });
  }
}

/**
 * Обновление протокола заседания
 */
export async function updateMeeting(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid meeting ID' });
    }
    
    const meetingData = req.body;
    
    const updatedMeeting = await storage.updateMeeting(id, meetingData);
    if (!updatedMeeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Логируем активность обновления протокола
    await logActivity({
      action: 'update',
      entityType: 'meeting',
      entityId: updatedMeeting.id,
      details: `Обновлен протокол заседания "${updatedMeeting.title}"`
    });
    
    res.json(updatedMeeting);
  } catch (error: any) {
    console.error('Error updating meeting:', error);
    res.status(500).json({ error: 'Failed to update meeting', details: error.message });
  }
}

/**
 * Создание или обновление протокола заседания
 */
export async function generateProtocol(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid meeting ID' });
    }
    
    const meeting = await storage.getMeeting(id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    const { transcription } = req.body;
    if (!transcription) {
      return res.status(400).json({ error: 'Transcription is required' });
    }
    
    // Найдем агента для работы с протоколами
    const agent = await agentService.getAgentByType('meeting_protocols');
    if (!agent) {
      return res.status(400).json({ error: 'Protocol agent not configured' });
    }
    
    // Анализируем транскрипцию с помощью агента
    const analysis = await agentService.processRequest({
      agent: agent,
      requestType: 'analyze',
      content: transcription,
      metadata: { 
        meetingId: meeting.id,
        meetingTitle: meeting.title
      }
    });
    
    // Обновляем протокол с результатами анализа
    const updatedMeeting = await storage.updateMeeting(id, {
      hasProtocol: true,
      protocolContent: analysis.summary,
      decisions: analysis.decisions,
      tasks: analysis.actionItems,
      keyPoints: analysis.keyPoints,
      status: 'completed',
      updatedAt: new Date()
    });
    
    // Логируем активность генерации протокола
    await logActivity({
      action: 'generate',
      entityType: 'meeting',
      entityId: meeting.id,
      details: `Сгенерирован протокол заседания "${meeting.title}"`
    });
    
    // Создаем результат работы агента
    await storage.createAgentResult({
      agentId: agent.id,
      agentName: agent.name,
      agentType: agent.type,
      entityType: 'meeting',
      entityId: meeting.id,
      actionType: 'protocol_generation',
      result: JSON.stringify(analysis),
      createdAt: new Date()
    });
    
    res.json({
      meeting: updatedMeeting,
      analysis: analysis
    });
  } catch (error: any) {
    console.error('Error generating protocol:', error);
    res.status(500).json({ error: 'Failed to generate protocol', details: error.message });
  }
}

/**
 * Сохранение протокола в блокчейне
 */
export async function saveToBlockchain(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid meeting ID' });
    }
    
    const meeting = await storage.getMeeting(id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    if (!meeting.hasProtocol) {
      return res.status(400).json({ error: 'Meeting has no protocol to save' });
    }
    
    // Создаем запись в блокчейне
    const blockchainData = {
      entityId: meeting.id,
      entityType: 'meeting',
      action: 'protocol_saved',
      type: 'meeting_protocol',
      title: meeting.title,
      content: meeting.protocolContent || '',
      metadata: {
        decisions: meeting.decisions || [],
        keyPoints: meeting.keyPoints || [],
        actionItems: meeting.tasks || [],
        date: meeting.date,
        location: meeting.location,
        participants: meeting.participants
      }
    };
    
    const blockchainResult = await recordToBlockchain(blockchainData);
    
    // Создаем запись о блокчейне
    const blockchainRecord = await storage.createBlockchainRecord({
      recordType: 'meeting_protocol',
      title: meeting.title,
      transactionHash: blockchainResult.transactionHash,
      status: blockchainResult.status,
      metadata: {
        meetingId: meeting.id,
        decisions: meeting.decisions,
        keyPoints: meeting.keyPoints,
        actionItems: meeting.tasks
      }
    });
    
    // Обновляем встречу с хешем блокчейна
    const updatedMeeting = await storage.updateMeeting(id, {
      blockchainHash: blockchainResult.transactionHash,
      blockchainStatus: blockchainResult.status,
      updatedAt: new Date()
    });
    
    // Логируем активность сохранения в блокчейне
    await logActivity({
      action: 'blockchain_record',
      entityType: 'meeting',
      entityId: meeting.id,
      blockchainHash: blockchainResult.transactionHash,
      details: `Протокол заседания "${meeting.title}" сохранен в блокчейне`
    });
    
    res.json({
      meeting: updatedMeeting,
      blockchain: {
        transactionHash: blockchainResult.transactionHash,
        status: blockchainResult.status
      }
    });
  } catch (error: any) {
    console.error('Error saving meeting to blockchain:', error);
    res.status(500).json({ error: 'Failed to save meeting to blockchain', details: error.message });
  }
}