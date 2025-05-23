/**
 * API-маршруты для работы с обращениями граждан и их обработки с использованием
 * организационной структуры и ИИ-агентов
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { insertCitizenRequestSchema } from '@shared/schema';
import { logActivity, ActivityType } from '../activity-logger';
import { recordToBlockchain, BlockchainRecordType } from '../blockchain';
import { processNewCitizenRequest, generateResponseForRequest, synchronizeRequestsFromEOtinish } from '../services/citizen-request-processor';
import { processRequestByOrgStructure } from '../services/org-structure';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { parse as csvParse } from 'csv-parse/sync';
import xlsx from 'xlsx';

// Создаем директорию для загрузки файлов, если она не существует
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Создана директория для загрузки файлов: ${uploadsDir}`);
}

// Настройка multer для загрузки файлов
const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB макс. размер файла (увеличено с 10MB)
  },
  fileFilter: (req, file, cb) => {
    console.log(`Получен файл: ${file.originalname}, тип: ${file.mimetype}`);
    // Проверка типа файла (только CSV или Excel)
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      // Дополнительные MIME-типы для поддержки разных браузеров
      file.mimetype === 'application/csv' ||
      file.mimetype === 'text/comma-separated-values' ||
      file.mimetype === 'application/excel' ||
      file.mimetype === 'application/x-csv' ||
      // Поддержка файлов с нестандартными MIME-типами по расширению
      file.originalname.toLowerCase().endsWith('.csv') ||
      file.originalname.toLowerCase().endsWith('.xls') ||
      file.originalname.toLowerCase().endsWith('.xlsx')
    ) {
      cb(null, true);
    } else {
      console.log(`Отклонен файл с неверным типом: ${file.mimetype}`);
      cb(new Error(`Поддерживаются только файлы CSV и Excel. Получен: ${file.mimetype}`));
    }
  }
});

const router = express.Router();

// Увеличиваем лимит размера тела запроса для этих маршрутов
router.use(express.json({ limit: '50mb' }));
router.use(express.urlencoded({ extended: true, limit: '50mb' }));

/**
 * Получение списка всех обращений граждан
 * GET /api/citizen-requests
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Основные параметры запроса
    const status = req.query.status as string | undefined;
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string || 'desc';
    const limit = parseInt(req.query.limit as string || '100');
    const offset = parseInt(req.query.offset as string || '0');
    
    // Дополнительные параметры фильтрации
    const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;
    const assignedTo = req.query.assignedTo ? parseInt(req.query.assignedTo as string) : undefined;
    const priority = req.query.priority as string | undefined;
    const search = req.query.search as string | undefined;
    
    // Параметры временного диапазона
    const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : undefined;
    const toDate = req.query.toDate ? new Date(req.query.toDate as string) : undefined;
    
    // Получаем список обращений с учетом фильтров
    const citizenRequests = await storage.getCitizenRequests({
      status,
      departmentId,
      assignedTo,
      priority,
      search,
      fromDate,
      toDate,
      sortBy,
      sortOrder,
      limit,
      offset
    });
    
    // Получаем общее количество обращений для пагинации
    const totalCount = await storage.countCitizenRequests({
      status,
      departmentId,
      assignedTo,
      priority,
      search,
      fromDate,
      toDate
    });
    
    // Если нет реальных обращений, используем тестовые данные
    if (totalCount === 0) {
      const { testCitizenRequests } = await import('../data/test-citizen-requests');
      
      // Фильтрация тестовых данных согласно запросу
      let filteredRequests = [...testCitizenRequests];
      
      // Применяем фильтры
      if (status) {
        filteredRequests = filteredRequests.filter(req => req.status === status);
      }
      
      if (departmentId) {
        filteredRequests = filteredRequests.filter(req => req.departmentId === departmentId);
      }
      
      if (assignedTo) {
        filteredRequests = filteredRequests.filter(req => req.assignedTo === assignedTo);
      }
      
      if (priority) {
        filteredRequests = filteredRequests.filter(req => req.priority === priority);
      }
      
      if (search) {
        const searchLower = search.toLowerCase();
        filteredRequests = filteredRequests.filter(req => 
          req.fullName.toLowerCase().includes(searchLower) ||
          req.subject.toLowerCase().includes(searchLower) ||
          req.description.toLowerCase().includes(searchLower)
        );
      }
      
      // Сортировка
      filteredRequests.sort((a, b) => {
        const aValue = a[sortBy as keyof typeof a];
        const bValue = b[sortBy as keyof typeof b];
        
        if (aValue instanceof Date && bValue instanceof Date) {
          return sortOrder === 'asc' 
            ? aValue.getTime() - bValue.getTime() 
            : bValue.getTime() - aValue.getTime();
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        return 0;
      });
      
      // Пагинация
      const paginatedRequests = filteredRequests.slice(offset, offset + limit);
      
      console.log(`Возвращаем тестовые данные обращений (всего: ${filteredRequests.length}, отображаемых: ${paginatedRequests.length})`);
      
      return res.json({
        data: paginatedRequests,
        pagination: {
          total: filteredRequests.length,
          limit,
          offset,
          hasMore: offset + paginatedRequests.length < filteredRequests.length
        }
      });
    }
    
    res.json({
      data: citizenRequests,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + citizenRequests.length < totalCount
      }
    });
  } catch (error) {
    console.error('Ошибка при получении списка обращений:', error);
    res.status(500).json({ error: 'Ошибка при получении списка обращений' });
  }
});

/**
 * Получение обращения по ID
 * GET /api/citizen-requests/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const citizenRequest = await storage.getCitizenRequest(id);
    
    if (!citizenRequest) {
      return res.status(404).json({ error: 'Обращение не найдено' });
    }
    
    // Логируем просмотр обращения
    await logActivity({
      action: 'view_request',
      entityType: 'citizen_request',
      entityId: id,
      userId: req.user?.id,
      details: `Просмотр обращения №${id}`
    });
    
    res.json(citizenRequest);
  } catch (error) {
    console.error('Ошибка при получении обращения:', error);
    res.status(500).json({ error: 'Ошибка при получении обращения' });
  }
});

/**
 * Создание нового обращения
 * POST /api/citizen-requests
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Валидация данных запроса
    const validatedData = insertCitizenRequestSchema.parse(req.body);
    
    // Создаем новое обращение
    const citizenRequest = await storage.createCitizenRequest({
      ...validatedData,
      status: 'new'
    });
    
    // Логируем создание нового обращения
    await logActivity({
      action: 'create_request',
      entityType: 'citizen_request',
      entityId: citizenRequest.id,
      userId: req.user?.id,
      details: `Создано новое обращение №${citizenRequest.id}`
    });
    
    // Запускаем обработку нового обращения в фоновом режиме
    processNewCitizenRequest(citizenRequest.id).catch(error => {
      console.error(`Ошибка при обработке обращения №${citizenRequest.id}:`, error);
    });
    
    res.status(201).json(citizenRequest);
  } catch (error) {
    console.error('Ошибка при создании обращения:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Неверный формат данных', details: error.errors });
    }
    
    res.status(500).json({ error: 'Ошибка при создании обращения' });
  }
});

/**
 * Обновление обращения
 * PATCH /api/citizen-requests/:id
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const citizenRequest = await storage.getCitizenRequest(id);
    
    if (!citizenRequest) {
      return res.status(404).json({ error: 'Обращение не найдено' });
    }
    
    // Валидация данных запроса (разрешаем частичное обновление)
    const updateSchema = insertCitizenRequestSchema.partial();
    const validatedData = updateSchema.parse(req.body);
    
    // Проверяем наличие изменения статуса
    const statusChanged = validatedData.status && validatedData.status !== citizenRequest.status;
    const oldStatus = citizenRequest.status;
    
    // Обновляем обращение
    const updatedRequest = await storage.updateCitizenRequest(id, validatedData);
    
    // Логируем обновление обращения
    await logActivity({
      action: 'update_request',
      entityType: 'citizen_request',
      entityId: id,
      userId: req.user?.id,
      details: `Обновлено обращение №${id}`
    });
    
    // Если изменился статус, также логируем это отдельно
    if (statusChanged) {
      await logActivity({
        action: 'change_status',
        entityType: 'citizen_request',
        entityId: id,
        userId: req.user?.id,
        details: `Изменен статус обращения №${id} с "${oldStatus}" на "${validatedData.status}"`
      });
      
      // Записываем изменение статуса в блокчейн
      try {
        const blockchainHash = await recordToBlockchain({
          entityId: id,
          entityType: BlockchainRecordType.CITIZEN_REQUEST,
          action: 'status_change',
          userId: req.user?.id,
          metadata: {
            oldStatus,
            newStatus: validatedData.status,
            timestamp: new Date().toISOString()
          }
        });
        
        // Обновляем хеш блокчейна в обращении
        await storage.updateCitizenRequest(id, { blockchainHash });
      } catch (blockchainError) {
        console.error('Ошибка при записи в блокчейн:', blockchainError);
      }
    }
    
    res.json(updatedRequest);
  } catch (error) {
    console.error('Ошибка при обновлении обращения:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Неверный формат данных', details: error.errors });
    }
    
    res.status(500).json({ error: 'Ошибка при обновлении обращения' });
  }
});

/**
 * Удаление обращения
 * DELETE /api/citizen-requests/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const citizenRequest = await storage.getCitizenRequest(id);
    
    if (!citizenRequest) {
      return res.status(404).json({ error: 'Обращение не найдено' });
    }
    
    // Удаляем обращение
    await storage.deleteCitizenRequest(id);
    
    // Логируем удаление обращения
    await logActivity({
      action: 'delete_request',
      entityType: 'citizen_request',
      entityId: id,
      userId: req.user?.id,
      details: `Удалено обращение №${id}`
    });
    
    res.status(204).end();
  } catch (error) {
    console.error('Ошибка при удалении обращения:', error);
    res.status(500).json({ error: 'Ошибка при удалении обращения' });
  }
});

/**
 * Автоматическая обработка обращения с помощью ИИ-агентов
 * POST /api/citizen-requests/:id/process
 */
router.post('/:id/process', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const citizenRequest = await storage.getCitizenRequest(id);
    
    if (!citizenRequest) {
      return res.status(404).json({ error: 'Обращение не найдено' });
    }
    
    // Запускаем обработку обращения
    const processedRequest = await processNewCitizenRequest(id);
    
    res.json({
      success: true,
      message: 'Обращение успешно обработано',
      request: processedRequest
    });
  } catch (error) {
    console.error('Ошибка при обработке обращения:', error);
    res.status(500).json({ error: 'Ошибка при обработке обращения' });
  }
});

/**
 * Генерация ответа на обращение с помощью ИИ
 * POST /api/citizen-requests/:id/generate-response
 */
router.post('/:id/generate-response', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const citizenRequest = await storage.getCitizenRequest(id);
    
    if (!citizenRequest) {
      return res.status(404).json({ error: 'Обращение не найдено' });
    }
    
    // Генерируем ответ на обращение
    const updatedRequest = await generateResponseForRequest(id);
    
    res.json({
      success: true,
      message: 'Ответ на обращение успешно сгенерирован',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Ошибка при генерации ответа:', error);
    res.status(500).json({ error: 'Ошибка при генерации ответа' });
  }
});

/**
 * Обработка обращения в соответствии с организационной структурой
 * POST /api/citizen-requests/:id/assign-by-org
 */
router.post('/:id/assign-by-org', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const citizenRequest = await storage.getCitizenRequest(id);
    
    if (!citizenRequest) {
      return res.status(404).json({ error: 'Обращение не найдено' });
    }
    
    // Обрабатываем обращение в соответствии с орг. структурой
    const processedRequest = await processRequestByOrgStructure(citizenRequest);
    
    res.json({
      success: true,
      message: 'Обращение успешно обработано и назначено в соответствии с организационной структурой',
      request: processedRequest
    });
  } catch (error) {
    console.error('Ошибка при обработке обращения:', error);
    res.status(500).json({ error: 'Ошибка при обработке обращения' });
  }
});

/**
 * Синхронизация обращений из eOtinish
 * POST /api/citizen-requests/sync-from-eotinish
 */
router.post('/sync-from-eotinish', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string || '50');
    
    // Запускаем синхронизацию из citizen-request-processor
    const result = await synchronizeRequestsFromEOtinish(limit);
    
    res.json(result);
  } catch (error) {
    console.error('Ошибка при синхронизации с eOtinish:', error);
    res.status(500).json({ error: 'Ошибка при синхронизации с eOtinish' });
  }
});

/**
 * Получение активности по обращению
 * GET /api/citizen-requests/:id/activities
 */
router.get('/:id/activities', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const activities = await storage.getActivitiesByEntity('citizen_request', id);
    
    res.json(activities);
  } catch (error) {
    console.error('Ошибка при получении активности:', error);
    res.status(500).json({ error: 'Ошибка при получении активности' });
  }
});

/**
 * Получение результатов обработки обращения ИИ-агентами
 * GET /api/citizen-requests/:id/agent-results
 */
router.get('/:id/agent-results', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const agentResults = await storage.getAgentResultsByEntity('citizen_request', id);
    
    res.json(agentResults);
  } catch (error) {
    console.error('Ошибка при получении результатов агентов:', error);
    res.status(500).json({ error: 'Ошибка при получении результатов агентов' });
  }
});

/**
 * Получение списка комментариев к обращению
 * GET /api/citizen-requests/:id/comments
 */
router.get('/:id/comments', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const comments = await storage.getCommentsByEntity('citizen_request', id);
    
    res.json(comments);
  } catch (error) {
    console.error('Ошибка при получении комментариев:', error);
    res.status(500).json({ error: 'Ошибка при получении комментариев' });
  }
});

/**
 * Добавление комментария к обращению
 * POST /api/citizen-requests/:id/comments
 */
router.post('/:id/comments', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const citizenRequest = await storage.getCitizenRequest(id);
    
    if (!citizenRequest) {
      return res.status(404).json({ error: 'Обращение не найдено' });
    }
    
    // Создаем комментарий
    const comment = await storage.createComment({
      entityId: id,
      entityType: 'citizen_request',
      authorId: req.user?.id,
      authorName: req.user?.fullName || 'Система',
      content: req.body.content,
      isInternal: req.body.isInternal || false,
      attachments: req.body.attachments || []
    });
    
    // Логируем добавление комментария
    await logActivity({
      action: 'add_comment',
      entityType: 'citizen_request',
      entityId: id,
      userId: req.user?.id,
      details: `Добавлен комментарий к обращению №${id}`
    });
    
    res.status(201).json(comment);
  } catch (error) {
    console.error('Ошибка при добавлении комментария:', error);
    res.status(500).json({ error: 'Ошибка при добавлении комментария' });
  }
});

/**
 * Импорт обращений граждан из файла (CSV/Excel)
 * POST /api/citizen-requests/import-from-file
 */
router.post('/import-from-file', upload.single('file'), async (req: Request, res: Response) => {
  // Устанавливаем большее время для обработки запроса
  req.setTimeout(300000); // 5 минут таймаута для сервера
  console.log('============== Импорт обращений граждан из файла ==============');
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.get('Content-Type'));
  console.log('Body:', Object.keys(req.body || {}));
  
  // Обработка ошибок multer (например, если файл слишком большой)
  const fileError = (req as any).fileValidationError || (req as any).multerError;
  if (fileError) {
    console.error('Ошибка валидации файла:', fileError);
    return res.status(400).json({ 
      error: fileError instanceof Error 
        ? fileError.message 
        : 'Ошибка валидации файла' 
    });
  }
  
  try {
    console.log('Получен запрос на импорт файла');
    
    if (!req.file) {
      console.error('Файл отсутствует в запросе');
      return res.status(400).json({ error: 'Файл не был загружен' });
    }

    console.log('Файл получен:', req.file.originalname);
    console.log('Сведения о файле:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
    
    const filePath = req.file.path;
    const originalFilename = req.file.originalname;
    let records: any[] = [];

    // Обработка в зависимости от типа файла
    try {
      const mimeType = req.file.mimetype.toLowerCase();
      const fileExt = originalFilename.toLowerCase().split('.').pop() || '';
      console.log('MIME тип файла:', mimeType);
      console.log('Расширение файла:', fileExt);
      
      // Проверяем MIME типы и расширения для CSV
      if (fileExt === 'csv' || 
          mimeType === 'text/csv' || 
          mimeType === 'application/csv') {
        // Обработка CSV
        console.log('Обрабатываем CSV файл');
        const content = fs.readFileSync(filePath, 'utf8');
        records = csvParse(content, {
          columns: true,
          skip_empty_lines: true
        });
      } else if (
        // Проверяем различные расширения и MIME типы для Excel
        fileExt === 'xlsx' || 
        fileExt === 'xls' || 
        mimeType === 'application/vnd.ms-excel' || 
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'application/excel' ||
        mimeType === 'application/x-excel' ||
        // Нестандартные MIME типы, которые могут отправляться некоторыми системами
        mimeType === 'application/msexcel' ||
        mimeType === 'application/x-msexcel' ||
        mimeType === 'application/octet-stream'
      ) {
        // Обработка Excel (xls, xlsx)
        console.log('Обрабатываем Excel файл', originalFilename, 'размер:', req.file.size, 'байт', 'MIME тип:', mimeType);
        
        // Максимально упрощаем опции для экономии памяти при больших файлах
        // Используем минимальный набор необходимых опций
        const workbook = xlsx.readFile(filePath, {
          cellDates: true,    // Только это действительно нужно - правильно обрабатывать даты
          raw: true,          // Получаем необработанные значения
          sheetRows: 0,       // Без ограничений по строкам
          sheets: 0           // Загружаем только первый лист для экономии памяти
        });
        
        // Выбираем первый лист
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('Excel файл не содержит листов');
        }
        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) {
          throw new Error('Не удалось получить доступ к листу Excel');
        }
        
        // Минимизируем опции для экономии памяти
        // Получаем данные листа напрямую
        const rawData = xlsx.utils.sheet_to_json(worksheet, {
          header: 1,        // Первая строка как заголовок
          raw: true,        // Получаем необработанные значения
          blankrows: false  // Пропускаем пустые строки - это важно для больших файлов
        });
        
        // Убеждаемся, что у нас есть строки
        if (rawData.length < 2) {
          throw new Error('Excel файл не содержит данных или заголовков');
        }
        
        // Первая строка - заголовки
        const headers = rawData[0];
        
        // Преобразуем строки в объекты с заголовками
        records = [];
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          const record: Record<string, any> = {};
          
          // Собираем объект с полями
          for (let j = 0; j < headers.length; j++) {
            if (headers[j]) { // Пропускаем пустые заголовки
              record[headers[j]] = row[j] || '';
            }
          }
          
          // Добавляем запись только если у нее есть непустые поля
          if (Object.keys(record).length > 0) {
            records.push(record);
          }
        }
        
        console.log(`Обработано ${records.length} записей из Excel файла`);
      } else {
        throw new Error(`Неподдерживаемый формат файла: ${originalFilename}`);
      }
      
      console.log(`Обнаружено ${records.length} записей`);
    } catch (fileError: any) {
      console.error('Ошибка при чтении или обработке файла:', fileError);
      
      // Удаляем загруженный файл в случае ошибки
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error('Ошибка при удалении временного файла:', unlinkError);
      }
      
      return res.status(400).json({ error: `Ошибка при обработке файла: ${fileError.message}` });
    }

    // Маппинг и валидация данных
    const importMapping = req.body.mapping || {
      // Дефолтный маппинг, предполагая что столбцы в файле могут соответствовать полям обращений
      fullName: ['fullName', 'name', 'fio', 'ФИО', 'полное_имя'],
      contactInfo: ['contactInfo', 'contact', 'email', 'phone', 'телефон', 'контакт'],
      requestType: ['requestType', 'type', 'тип'],
      subject: ['subject', 'title', 'тема', 'заголовок'],
      description: ['description', 'content', 'text', 'описание', 'текст'],
      status: ['status', 'статус'],
      priority: ['priority', 'приоритет'],
      category: ['category', 'категория'],
      subcategory: ['subcategory', 'подкатегория'],
      region: ['region', 'регион'],
      district: ['district', 'rayon', 'район'],
      locality: ['locality', 'city', 'nas_punkt', 'город', 'населенный_пункт'],
      responsibleOrg: ['responsibleOrg', 'org', 'organization', 'организация'],
      externalId: ['externalId', 'id', 'external_id', 'внешний_идентификатор'],
      externalSource: ['externalSource', 'source', 'источник'],
      externalRegNum: ['externalRegNum', 'regNum', 'reg_num', 'номер'],
      deadline: ['deadline', 'due_date', 'dueDate', 'срок_исполнения', 'срок']
    };

    // Определение функции для получения значения поля с учетом маппинга
    const getFieldValue = (record: any, fieldMapping: string[]) => {
      for (const field of fieldMapping) {
        if (record[field] !== undefined) {
          return record[field];
        }
      }
      return null;
    };

    // Преобразование записей в обращения
    const citizenRequests = [];
    for (const record of records) {
      // Создаем объект обращения на основе маппинга
      const citizenRequest: any = {
        fullName: getFieldValue(record, importMapping.fullName) || 'Не указано',
        contactInfo: getFieldValue(record, importMapping.contactInfo) || 'Не указано',
        requestType: getFieldValue(record, importMapping.requestType) || 'Обращение',
        subject: getFieldValue(record, importMapping.subject) || 'Без темы',
        description: getFieldValue(record, importMapping.description) || '',
        status: getFieldValue(record, importMapping.status) || 'new',
        priority: getFieldValue(record, importMapping.priority) || 'medium',
        category: getFieldValue(record, importMapping.category) || null,
        subcategory: getFieldValue(record, importMapping.subcategory) || null,
        region: getFieldValue(record, importMapping.region) || null,
        district: getFieldValue(record, importMapping.district) || null, 
        locality: getFieldValue(record, importMapping.locality) || null,
        responsibleOrg: getFieldValue(record, importMapping.responsibleOrg) || null,
        externalId: getFieldValue(record, importMapping.externalId) || null,
        externalSource: getFieldValue(record, importMapping.externalSource) || 'import',
        externalRegNum: getFieldValue(record, importMapping.externalRegNum) || null,
        deadline: getFieldValue(record, importMapping.deadline) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // По умолчанию срок - 30 дней
      };

      // Добавляем данные гражданина, если доступны
      if (citizenRequest.fullName || citizenRequest.contactInfo || citizenRequest.region) {
        citizenRequest.citizenInfo = {
          name: citizenRequest.fullName,
          contact: citizenRequest.contactInfo,
          region: citizenRequest.region,
          district: citizenRequest.district,
          locality: citizenRequest.locality
        };
      }

      // Добавляем в список
      citizenRequests.push(citizenRequest);
    }

    // Сохраняем обращения в базу данных
    let createdRequests = [];
    let errors = [];
    
    // Периодически очищаем память при обработке больших файлов
    if (typeof process.gc === 'function') {
      try {
        // Принудительный вызов сборщика мусора если возможно
        process.gc();
        console.log("Выполнена принудительная сборка мусора");
      } catch (gcError) {
        console.log("Не удалось вызвать сборщик мусора:", gcError);
      }
    }

    for (const request of citizenRequests) {
      try {
        // Проверка, нет ли уже такого обращения (если есть внешний ID)
        if (request.externalId) {
          const existingRequest = await storage.getCitizenRequestByExternalId(request.externalId, request.externalSource);
          if (existingRequest) {
            // Обновляем существующее обращение
            const updatedRequest = await storage.updateCitizenRequest(existingRequest.id, request);
            createdRequests.push({
              id: updatedRequest.id,
              subject: updatedRequest.subject,
              status: 'updated'
            });
            continue;
          }
        }

        // Создаем новое обращение
        const newRequest = await storage.createCitizenRequest(request);
        createdRequests.push({
          id: newRequest.id,
          subject: newRequest.subject,
          status: 'created'
        });

        // Запускаем процесс обработки нового обращения, если это новое
        processNewCitizenRequest(newRequest.id).catch(error => {
          console.error(`Ошибка при обработке импортированного обращения №${newRequest.id}:`, error);
        });
      } catch (error) {
        console.error(`Ошибка при импорте обращения:`, error);
        errors.push({
          data: request,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка'
        });
      }
    }

    // Удаляем загруженный файл в конце обработки
    try {
      fs.unlinkSync(filePath);
      console.log('Временный файл удален');
    } catch (unlinkError) {
      console.error('Ошибка при удалении временного файла:', unlinkError);
    }

    // Логируем импорт обращений
    await logActivity({
      action: ActivityType.SYSTEM_EVENT,
      entityType: 'import',
      details: `Импортировано ${createdRequests.length} обращений из файла`,
      metadata: {
        filename: originalFilename,
        total: records.length,
        imported: createdRequests.length,
        errors: errors.length
      }
    });

    res.json({
      success: true,
      total: records.length,
      imported: createdRequests.length,
      errors: errors.length,
      requests: createdRequests,
      errorDetails: errors
    });
  } catch (error) {
    console.error('Ошибка при импорте обращений из файла:', error);
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка при импорте обращений',
    });
  }
});

export default router;