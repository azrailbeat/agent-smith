/**
 * API-маршруты для работы с должностными инструкциями
 */

import express, { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { logActivity, ActivityType } from '../activity-logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Настраиваем хранилище для загрузки файлов
const uploadDir = path.join(process.cwd(), 'uploads', 'job-descriptions');

// Создаем директорию, если она не существует
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage2 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage2 });

// Создаем роутер
export const jobDescriptionsRouter = Router();

/**
 * Получение списка всех должностных инструкций
 */
jobDescriptionsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const jobDescriptions = await storage.getJobDescriptions();
    res.json(jobDescriptions);
  } catch (error) {
    console.error('Ошибка при получении должностных инструкций:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении должностных инструкций' });
  }
});

/**
 * Получение должностной инструкции по ID
 */
jobDescriptionsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const jobDescription = await storage.getJobDescription(id);
    
    if (!jobDescription) {
      return res.status(404).json({ error: 'Должностная инструкция не найдена' });
    }
    
    res.json(jobDescription);
  } catch (error) {
    console.error(`Ошибка при получении должностной инструкции с ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Ошибка сервера при получении должностной инструкции' });
  }
});

/**
 * Получение должностных инструкций по ID отдела
 */
jobDescriptionsRouter.get('/department/:id', async (req: Request, res: Response) => {
  try {
    const departmentId = parseInt(req.params.id);
    const jobDescriptions = await storage.getJobDescriptionsByDepartment(departmentId);
    res.json(jobDescriptions);
  } catch (error) {
    console.error(`Ошибка при получении должностных инструкций отдела с ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Ошибка сервера при получении должностных инструкций отдела' });
  }
});

/**
 * Получение должностных инструкций по ID должности
 */
jobDescriptionsRouter.get('/position/:id', async (req: Request, res: Response) => {
  try {
    const positionId = parseInt(req.params.id);
    const jobDescriptions = await storage.getJobDescriptionsByPosition(positionId);
    res.json(jobDescriptions);
  } catch (error) {
    console.error(`Ошибка при получении должностных инструкций должности с ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Ошибка сервера при получении должностных инструкций должности' });
  }
});

/**
 * Создание новой должностной инструкции
 */
jobDescriptionsRouter.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { title, content, departmentId, positionId } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Необходимо указать название и содержание должностной инструкции' });
    }
    
    // Сохраняем путь к файлу, если он был загружен
    let fileUrl = null;
    if (req.file) {
      fileUrl = `/uploads/job-descriptions/${req.file.filename}`;
    }
    
    // Создаем должностную инструкцию
    const jobDescription = await storage.createJobDescription({
      title,
      content,
      departmentId: parseInt(departmentId),
      positionId: parseInt(positionId),
      fileUrl
    });
    
    // Логируем действие
    await logActivity({
      action: ActivityType.ENTITY_CREATE,
      details: `Создана должностная инструкция: ${title}`
    });
    
    res.status(201).json(jobDescription);
  } catch (error) {
    console.error('Ошибка при создании должностной инструкции:', error);
    res.status(500).json({ error: 'Ошибка сервера при создании должностной инструкции' });
  }
});

/**
 * Обновление должностной инструкции
 */
jobDescriptionsRouter.put('/:id', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { title, content, departmentId, positionId } = req.body;
    
    // Проверяем существование инструкции
    const existingJobDescription = await storage.getJobDescription(id);
    if (!existingJobDescription) {
      return res.status(404).json({ error: 'Должностная инструкция не найдена' });
    }
    
    // Определяем, был ли загружен новый файл
    let fileUrl = existingJobDescription.fileUrl;
    if (req.file) {
      // Если есть старый файл, удаляем его
      if (existingJobDescription.fileUrl) {
        const oldFilePath = path.join(process.cwd(), existingJobDescription.fileUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      // Сохраняем путь к новому файлу
      fileUrl = `/uploads/job-descriptions/${req.file.filename}`;
    }
    
    // Обновляем должностную инструкцию
    const updatedJobDescription = await storage.updateJobDescription(id, {
      title: title || existingJobDescription.title,
      content: content || existingJobDescription.content,
      departmentId: departmentId ? parseInt(departmentId) : existingJobDescription.departmentId,
      positionId: positionId ? parseInt(positionId) : existingJobDescription.positionId,
      fileUrl
    });
    
    // Логируем действие
    await logActivity({
      action: ActivityType.ENTITY_UPDATE,
      details: `Обновлена должностная инструкция: ${title || existingJobDescription.title}`
    });
    
    res.json(updatedJobDescription);
  } catch (error) {
    console.error(`Ошибка при обновлении должностной инструкции с ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Ошибка сервера при обновлении должностной инструкции' });
  }
});

/**
 * Удаление должностной инструкции
 */
jobDescriptionsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Проверяем существование инструкции
    const existingJobDescription = await storage.getJobDescription(id);
    if (!existingJobDescription) {
      return res.status(404).json({ error: 'Должностная инструкция не найдена' });
    }
    
    // Удаляем файл, если он существует
    if (existingJobDescription.fileUrl) {
      const filePath = path.join(process.cwd(), existingJobDescription.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Удаляем должностную инструкцию из БД
    const result = await storage.deleteJobDescription(id);
    
    // Логируем действие
    await logActivity({
      action: ActivityType.ENTITY_DELETE,
      details: `Удалена должностная инструкция: ${existingJobDescription.title}`
    });
    
    res.json({ success: result });
  } catch (error) {
    console.error(`Ошибка при удалении должностной инструкции с ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Ошибка сервера при удалении должностной инструкции' });
  }
});

export default jobDescriptionsRouter;