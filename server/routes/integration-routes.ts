/**
 * API маршруты для внешних интеграций
 * Обеспечивают функциональность для работы виджетов и API клиентов
 */

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { logActivity, ActivityType } from '../activity-logger';
import { recordToBlockchain, BlockchainRecordType } from '../blockchain';

const router = express.Router();

// Middleware для проверки API ключа
const validateApiKey = async (req: Request, res: Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({ 
      success: false, 
      error: 'API ключ не предоставлен. Укажите заголовок X-API-Key.' 
    });
  }
  
  try {
    // TODO: В будущем заменить на проверку в базе данных
    // Сейчас для тестирования принимаем любой ключ
    if (apiKey.length < 8) {
      return res.status(401).json({ 
        success: false, 
        error: 'Недействительный API ключ' 
      });
    }
    
    // Добавляем API ключ к объекту запроса
    (req as any).apiKey = apiKey;
    next();
  } catch (error) {
    console.error('Ошибка при проверке API ключа:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Ошибка при проверке API ключа' 
    });
  }
};

// Маршрут для проверки валидности API ключа
router.get('/validate-key', validateApiKey, (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    valid: true 
  });
});

// Получение настроек виджета по API ключу
router.get('/widget-config', async (req: Request, res: Response) => {
  const apiKey = req.query.key as string;
  
  if (!apiKey) {
    return res.status(400).json({ 
      success: false, 
      error: 'Не указан параметр key' 
    });
  }
  
  try {
    // TODO: В будущем заменить на получение настроек из базы данных
    // Для демонстрации возвращаем стандартные настройки
    const config = {
      type: 'widget',
      enabled: true,
      settings: {
        title: 'Форма обращения',
        subtitle: 'Пожалуйста, заполните форму обращения',
        primaryColor: '#1c64f2',
        theme: 'light',
        formFields: [
          { id: 1, type: 'text', label: 'ФИО', required: true },
          { id: 2, type: 'email', label: 'Email', required: true },
          { id: 3, type: 'select', label: 'Тип обращения', required: true, options: ['Вопрос', 'Обращение', 'Жалоба', 'Предложение'] },
          { id: 4, type: 'textarea', label: 'Текст обращения', required: true }
        ]
      }
    };
    
    res.json(config);
  } catch (error) {
    console.error('Ошибка при получении настроек виджета:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при получении настроек виджета' 
    });
  }
});

// Получение списка доступных статусов
router.get('/statuses', validateApiKey, (req: Request, res: Response) => {
  const statuses = [
    { id: 'new', name: 'Новое', color: '#3b82f6' },
    { id: 'in_progress', name: 'В работе', color: '#f59e0b' },
    { id: 'completed', name: 'Выполнено', color: '#10b981' },
    { id: 'rejected', name: 'Отклонено', color: '#ef4444' },
    { id: 'on_hold', name: 'Отложено', color: '#8b5cf6' }
  ];
  
  res.json({ 
    success: true, 
    statuses 
  });
});

// Создание нового обращения гражданина через внешний API
router.post('/citizen-requests', validateApiKey, async (req: Request, res: Response) => {
  try {
    const { fullName, contactInfo, requestType, description, subject, externalId, sourceSystem, sourceUrl, priority } = req.body;
    
    // Валидация обязательных полей
    if (!fullName || !contactInfo || !requestType || !description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Отсутствуют обязательные поля. Необходимы: fullName, contactInfo, requestType, description.' 
      });
    }
    
    // Создание обращения
    const requestData = {
      fullName,
      contactInfo,
      requestType,
      description,
      subject: subject || requestType,
      status: 'new',
      priority: priority || 'medium',
      externalId: externalId || `ext-${uuidv4()}`,
      source: sourceSystem || 'external-api',
      sourceUrl: sourceUrl || '',
      createdAt: new Date()
    };
    
    // Получаем API ключ для записи в журнал
    const apiKey = (req as any).apiKey;
    
    // Сохраняем обращение в базе данных
    const request = await storage.createCitizenRequest(requestData);
    
    // Записываем активность
    await logActivity({
      action: 'create_citizen_request',
      entityType: 'citizen_request',
      entityId: request.id,
      details: `Создано обращение через внешний API: ${requestType}`,
      metadata: {
        apiKey,
        source: sourceSystem || 'external-api',
        externalId
      }
    });
    
    // Записываем в блокчейн
    try {
      const blockchainHash = await recordToBlockchain({
        entityId: request.id,
        entityType: BlockchainRecordType.CITIZEN_REQUEST,
        action: 'create',
        metadata: {
          requestType,
          source: sourceSystem || 'external-api',
          externalId
        }
      });
      
      // Обновляем запись с хешем блокчейна
      if (blockchainHash) {
        await storage.updateCitizenRequest(request.id, {
          blockchainHash
        });
      }
    } catch (blockchainError) {
      console.error('Ошибка при записи в блокчейн:', blockchainError);
    }
    
    // Возвращаем успешный ответ
    res.status(201).json({
      success: true,
      id: request.id,
      externalId: request.externalId,
      status: request.status,
      message: 'Обращение успешно создано'
    });
    
  } catch (error) {
    console.error('Ошибка при создании обращения:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при создании обращения' 
    });
  }
});

// Получение информации об обращении по ID
router.get('/citizen-requests/:id', validateApiKey, async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    
    if (isNaN(requestId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Недопустимый ID обращения' 
      });
    }
    
    // Получаем обращение из базы данных
    const request = await storage.getCitizenRequest(requestId);
    
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        error: 'Обращение не найдено' 
      });
    }
    
    // Получаем API ключ для проверки доступа
    const apiKey = (req as any).apiKey;
    
    // TODO: В будущем добавить проверку, что API ключ имеет доступ к этому обращению
    
    // Возвращаем данные обращения
    res.json({
      id: request.id,
      fullName: request.fullName,
      contactInfo: request.contactInfo,
      requestType: request.requestType,
      subject: request.subject,
      status: request.status,
      priority: request.priority,
      externalId: request.externalId,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      blockchainHash: request.blockchainHash
    });
    
  } catch (error) {
    console.error('Ошибка при получении обращения:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при получении обращения' 
    });
  }
});

// Получение списка обращений
router.get('/citizen-requests', validateApiKey, async (req: Request, res: Response) => {
  try {
    // Параметры запроса
    const status = req.query.status as string;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    
    // Получаем API ключ для фильтрации обращений
    const apiKey = (req as any).apiKey;
    
    // TODO: В будущем фильтровать обращения по API ключу
    
    // Получаем список обращений
    const requests = await storage.getAllCitizenRequests();
    
    // Фильтруем по статусу, если указан
    let filteredRequests = requests;
    if (status) {
      filteredRequests = requests.filter(req => req.status === status);
    }
    
    // Применяем пагинацию
    const paginatedRequests = filteredRequests.slice(offset, offset + limit);
    
    // Преобразуем в формат для ответа
    const requestsData = paginatedRequests.map(request => ({
      id: request.id,
      fullName: request.fullName,
      requestType: request.requestType,
      subject: request.subject,
      status: request.status,
      priority: request.priority,
      externalId: request.externalId,
      createdAt: request.createdAt
    }));
    
    // Возвращаем данные
    res.json({
      success: true,
      total: filteredRequests.length,
      offset,
      limit,
      requests: requestsData
    });
    
  } catch (error) {
    console.error('Ошибка при получении списка обращений:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при получении списка обращений' 
    });
  }
});

// Добавление комментария к обращению
router.post('/citizen-requests/:id/comments', validateApiKey, async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    const { comment, source } = req.body;
    
    if (isNaN(requestId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Недопустимый ID обращения' 
      });
    }
    
    if (!comment) {
      return res.status(400).json({ 
        success: false, 
        error: 'Отсутствует текст комментария' 
      });
    }
    
    // Проверяем существование обращения
    const request = await storage.getCitizenRequest(requestId);
    
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        error: 'Обращение не найдено' 
      });
    }
    
    // Получаем API ключ для записи в журнал
    const apiKey = (req as any).apiKey;
    
    // TODO: В будущем добавить проверку, что API ключ имеет доступ к этому обращению
    
    // Создаем комментарий
    const commentData = {
      requestId,
      text: comment,
      source: source || 'external-api',
      createdAt: new Date()
    };
    
    // TODO: Добавить сохранение комментария в базу данных
    
    // Записываем активность
    await logActivity({
      action: 'add_comment',
      entityType: 'citizen_request',
      entityId: requestId,
      details: `Добавлен комментарий через внешний API`,
      metadata: {
        apiKey,
        source: source || 'external-api',
        commentText: comment.substring(0, 100) + (comment.length > 100 ? '...' : '')
      }
    });
    
    // Возвращаем успешный ответ
    res.json({
      success: true,
      message: 'Комментарий успешно добавлен',
      commentId: uuidv4() // В будущем заменить на реальный ID комментария
    });
    
  } catch (error) {
    console.error('Ошибка при добавлении комментария:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при добавлении комментария' 
    });
  }
});

// Генерация HTML формы обращения для встраивания
router.get('/form-template', (req: Request, res: Response) => {
  try {
    const theme = (req.query.theme as string) || 'light';
    const color = (req.query.color as string) || '#1c64f2';
    const title = (req.query.title as string) || 'Форма обращения';
    const subtitle = (req.query.subtitle as string) || 'Пожалуйста, заполните форму обращения';
    const apiKey = req.query.api_key as string;
    
    // Базовый URL для iframe
    const baseUrl = 'https://agent-smith.replit.app/embed.html';
    
    // Формируем URL с параметрами
    const iframeUrl = `${baseUrl}?theme=${encodeURIComponent(theme)}&color=${encodeURIComponent(color)}&title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(subtitle)}&api_key=${encodeURIComponent(apiKey || '')}`;
    
    // Генерируем HTML для встраивания
    const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Форма обращений | Agent Smith</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      line-height: 1.5;
      margin: 0;
      padding: 16px;
    }
    .citizen-form-container {
      max-width: 600px;
      margin: 0 auto;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .citizen-form-iframe {
      width: 100%;
      height: 600px;
      border: none;
      display: block;
    }
  </style>
</head>
<body>
  <div class="citizen-form-container">
    <iframe src="${iframeUrl}" class="citizen-form-iframe" title="Форма обращений граждан"></iframe>
  </div>
  
  <script>
    // Обработчик сообщений от iframe
    window.addEventListener('message', function(event) {
      // Проверяем, что сообщение от нашего iframe и оно успешное
      if (event.data && event.data.type === 'agent-smith-form-submitted' && event.data.success) {
        console.log('Форма успешно отправлена. ID обращения:', event.data.requestId);
      }
    });
  </script>
</body>
</html>
    `.trim();
    
    // Отправляем HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
    
  } catch (error) {
    console.error('Ошибка при генерации HTML формы:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при генерации HTML формы' 
    });
  }
});

export default router;