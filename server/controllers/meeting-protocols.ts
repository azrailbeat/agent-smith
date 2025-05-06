/**
 * Контроллер для модуля протоколов заседаний
 */
import { Request, Response } from 'express';
import { storage } from '../storage';
import { logActivity } from '../activity-logger';
import { recordToBlockchain, BlockchainRecordType } from '../blockchain';

/**
 * Получение списка протоколов заседаний
 */
export async function getMeetings(req: Request, res: Response) {
  try {
    const meetings = await storage.getMeetings();
    
    // Логируем активность
    await logActivity({
      action: 'view_list',
      entityType: 'meeting',
      userId: req.session?.userId,
      details: 'Просмотр списка протоколов заседаний'
    });
    
    // Возвращаем JSON ответ
    res.json(meetings);
  } catch (error) {
    console.error('Error getting meetings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get meetings list' 
    });
  }
}

/**
 * Получение протокола заседания по ID
 */
export async function getMeetingById(req: Request, res: Response) {
  try {
    const meetingId = parseInt(req.params.id);
    
    if (isNaN(meetingId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid meeting ID' 
      });
    }
    
    const meeting = await storage.getMeeting(meetingId);
    
    if (!meeting) {
      return res.status(404).json({ 
        success: false, 
        error: 'Meeting not found' 
      });
    }
    
    // Логируем активность
    await logActivity({
      action: 'view_item',
      entityType: 'meeting',
      entityId: meetingId,
      userId: req.session?.userId,
      details: `Просмотр протокола заседания #${meetingId}`
    });
    
    // Возвращаем JSON ответ
    res.json(meeting);
  } catch (error) {
    console.error(`Error getting meeting ${req.params.id}:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get meeting protocol' 
    });
  }
}

/**
 * Создание нового протокола заседания
 */
export async function createMeeting(req: Request, res: Response) {
  try {
    const meetingData = req.body;
    
    // Валидация данных (в реальном приложении здесь может быть Zod)
    if (!meetingData.title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Meeting title is required' 
      });
    }
    
    // Создаем протокол
    const meeting = await storage.createMeeting(meetingData);
    
    // Логируем активность
    await logActivity({
      action: 'create',
      entityType: 'meeting',
      entityId: meeting.id,
      userId: req.session?.userId,
      details: `Создание протокола заседания "${meeting.title}"`
    });
    
    // Возвращаем JSON ответ
    res.status(201).json({
      success: true,
      meeting
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create meeting protocol' 
    });
  }
}

/**
 * Обновление протокола заседания
 */
export async function updateMeeting(req: Request, res: Response) {
  try {
    const meetingId = parseInt(req.params.id);
    
    if (isNaN(meetingId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid meeting ID' 
      });
    }
    
    const updateData = req.body;
    
    // Проверяем существование протокола
    const existingMeeting = await storage.getMeeting(meetingId);
    
    if (!existingMeeting) {
      return res.status(404).json({ 
        success: false, 
        error: 'Meeting not found' 
      });
    }
    
    // Обновляем протокол
    const meeting = await storage.updateMeeting(meetingId, updateData);
    
    // Логируем активность
    await logActivity({
      action: 'update',
      entityType: 'meeting',
      entityId: meetingId,
      userId: req.session?.userId,
      details: `Обновление протокола заседания #${meetingId}`
    });
    
    // Возвращаем JSON ответ
    res.json({
      success: true,
      meeting
    });
  } catch (error) {
    console.error(`Error updating meeting ${req.params.id}:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update meeting protocol' 
    });
  }
}

/**
 * Создание или обновление протокола заседания
 */
export async function generateProtocol(req: Request, res: Response) {
  try {
    const meetingId = parseInt(req.params.id);
    
    if (isNaN(meetingId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid meeting ID' 
      });
    }
    
    const meeting = await storage.getMeeting(meetingId);
    
    if (!meeting) {
      return res.status(404).json({ 
        success: false, 
        error: 'Meeting not found' 
      });
    }
    
    // В реальном приложении здесь была бы логика генерации протокола с помощью AI
    // Для демонстрации просто устанавливаем флаг hasProtocol
    const updatedMeeting = await storage.updateMeeting(meetingId, {
      hasProtocol: true,
      protocolContent: meeting.protocolContent || 'Протокол сгенерирован автоматически'
    });
    
    // Логируем активность
    await logActivity({
      action: 'generate_protocol',
      entityType: 'meeting',
      entityId: meetingId,
      userId: req.session?.userId,
      details: `Генерация протокола заседания #${meetingId}`
    });
    
    // Возвращаем JSON ответ
    res.json({
      success: true,
      meeting: updatedMeeting
    });
  } catch (error) {
    console.error(`Error generating protocol for meeting ${req.params.id}:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate meeting protocol' 
    });
  }
}

/**
 * Сохранение протокола в блокчейне
 */
export async function saveToBlockchain(req: Request, res: Response) {
  try {
    const meetingId = parseInt(req.params.id);
    
    if (isNaN(meetingId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid meeting ID' 
      });
    }
    
    const meeting = await storage.getMeeting(meetingId);
    
    if (!meeting) {
      return res.status(404).json({ 
        success: false, 
        error: 'Meeting not found' 
      });
    }
    
    if (!meeting.hasProtocol) {
      return res.status(400).json({ 
        success: false, 
        error: 'Meeting does not have a protocol to save to blockchain' 
      });
    }
    
    // Записываем в блокчейн
    const blockchainData = {
      entityId: meetingId,
      entityType: 'meeting_protocol',
      action: 'save_protocol',
      userId: req.session?.userId,
      metadata: {
        title: meeting.title,
        date: meeting.date,
        participants: meeting.participants
      }
    };
    
    const transactionHash = await recordToBlockchain(blockchainData);
    
    // Обновляем запись о встрече
    const updatedMeeting = await storage.updateMeeting(meetingId, {
      blockchainHash: transactionHash
    });
    
    // Создаем запись о транзакции в блокчейне
    await storage.createBlockchainRecord({
      recordType: BlockchainRecordType.DOCUMENT,
      title: `meeting_protocol #${meetingId}: saved_to_blockchain`,
      entityType: 'meeting_protocol',
      entityId: meetingId,
      transactionHash,
      status: 'confirmed',
      metadata: {
        title: meeting.title,
        action: 'save_protocol'
      }
    });
    
    // Логируем активность
    await logActivity({
      action: 'blockchain_record',
      entityType: 'meeting_protocol',
      entityId: meetingId,
      userId: req.session?.userId,
      details: `Протокол заседания #${meetingId} сохранен в блокчейне`,
      metadata: {
        transactionHash
      }
    });
    
    // Возвращаем JSON ответ
    res.json({
      success: true,
      meeting: updatedMeeting,
      blockchain: {
        transactionHash
      }
    });
  } catch (error) {
    console.error(`Error saving protocol to blockchain for meeting ${req.params.id}:`, error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save protocol to blockchain' 
    });
  }
}