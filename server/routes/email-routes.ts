/**
 * API маршруты для работы с электронной почтой
 */

import express from 'express';
import { emailService, testEmailService } from '../integrations/email-service';
import { logActivity } from '../activity-logger';

export function registerEmailRoutes(app: express.Express): void {
  /**
   * Проверка статуса сервиса электронной почты
   */
  app.get('/api/email/status', async (req, res) => {
    try {
      const isReady = emailService.isReady();
      
      if (isReady) {
        const connectionTest = await emailService.verifyConnection();
        
        res.json({
          status: 'success',
          ready: true,
          connection: connectionTest ? 'ok' : 'error',
          provider: process.env.SENDGRID_API_KEY ? 'sendgrid' : 'smtp'
        });
      } else {
        res.json({
          status: 'warning',
          ready: false,
          message: 'Email сервис не настроен. Проверьте переменные окружения SENDGRID_API_KEY или настройки SMTP.'
        });
      }
    } catch (error) {
      console.error('Ошибка проверки статуса email:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  });

  /**
   * Отправка регистрационного Email
   */
  app.post('/api/email/send-registration', async (req, res) => {
    try {
      const { to, username, password, loginUrl } = req.body;
      
      if (!to || !username || !password || !loginUrl) {
        return res.status(400).json({
          status: 'error',
          message: 'Не указаны обязательные параметры (to, username, password, loginUrl)'
        });
      }
      
      const result = await emailService.sendRegistrationEmail(
        to,
        username,
        password,
        loginUrl
      );
      
      if (result.success) {
        await logActivity({
          action: 'REGISTRATION_EMAIL_SENT',
          entityType: 'user',
          details: `Отправлено регистрационное письмо пользователю ${username}`,
          metadata: {
            email: to,
            username,
            messageId: result.messageId
          }
        });
        
        res.json({
          status: 'success',
          messageId: result.messageId
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: result.error
        });
      }
    } catch (error) {
      console.error('Ошибка отправки регистрационного письма:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  });

  /**
   * Отправка уведомления о задаче
   */
  app.post('/api/email/send-task-notification', async (req, res) => {
    try {
      const { to, taskData } = req.body;
      
      if (!to || !taskData || !taskData.id || !taskData.title) {
        return res.status(400).json({
          status: 'error',
          message: 'Не указаны обязательные параметры (to, taskData)'
        });
      }
      
      const result = await emailService.sendTaskAssignmentEmail(to, taskData);
      
      if (result.success) {
        await logActivity({
          action: 'TASK_NOTIFICATION_SENT',
          entityType: 'task',
          entityId: taskData.id,
          details: `Отправлено уведомление о задаче "${taskData.title}"`,
          metadata: {
            email: to,
            taskId: taskData.id,
            messageId: result.messageId
          }
        });
        
        res.json({
          status: 'success',
          messageId: result.messageId
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: result.error
        });
      }
    } catch (error) {
      console.error('Ошибка отправки уведомления о задаче:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  });

  /**
   * Отправка уведомления о новом запросе
   */
  app.post('/api/email/send-request-notification', async (req, res) => {
    try {
      const { to, requestData } = req.body;
      
      if (!to || !requestData || !requestData.id || !requestData.subject) {
        return res.status(400).json({
          status: 'error',
          message: 'Не указаны обязательные параметры (to, requestData)'
        });
      }
      
      const result = await emailService.sendCitizenRequestNotification(to, requestData);
      
      if (result.success) {
        await logActivity({
          action: 'REQUEST_NOTIFICATION_SENT',
          entityType: 'citizen_request',
          entityId: requestData.id,
          details: `Отправлено уведомление о запросе "${requestData.subject}"`,
          metadata: {
            email: to,
            requestId: requestData.id,
            messageId: result.messageId
          }
        });
        
        res.json({
          status: 'success',
          messageId: result.messageId
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: result.error
        });
      }
    } catch (error) {
      console.error('Ошибка отправки уведомления о запросе:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  });

  /**
   * Отправка ответа гражданину
   */
  app.post('/api/email/send-citizen-report', async (req, res) => {
    try {
      const { to, reportData } = req.body;
      
      if (!to || !reportData || !reportData.requestId || !reportData.subject) {
        return res.status(400).json({
          status: 'error',
          message: 'Не указаны обязательные параметры (to, reportData)'
        });
      }
      
      const result = await emailService.sendCitizenReportEmail(to, reportData);
      
      if (result.success) {
        await logActivity({
          action: 'CITIZEN_REPORT_SENT',
          entityType: 'citizen_request',
          entityId: reportData.requestId,
          details: `Отправлен ответ на запрос "${reportData.subject}"`,
          metadata: {
            email: to,
            requestId: reportData.requestId,
            messageId: result.messageId
          }
        });
        
        res.json({
          status: 'success',
          messageId: result.messageId
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: result.error
        });
      }
    } catch (error) {
      console.error('Ошибка отправки ответа гражданину:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  });

  /**
   * Тестирование почтового сервиса
   */
  app.post('/api/email/test', async (req, res) => {
    try {
      const testResult = await testEmailService();
      
      if (testResult) {
        res.json({
          status: 'success',
          message: 'Email сервис успешно подключен и готов к работе'
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: 'Не удалось подключиться к Email сервису'
        });
      }
    } catch (error) {
      console.error('Ошибка тестирования email сервиса:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  });

  /**
   * Отправка тестового письма
   */
  app.post('/api/email/send-test', async (req, res) => {
    try {
      const { to } = req.body;
      
      if (!to) {
        return res.status(400).json({
          status: 'error',
          message: 'Не указан обязательный параметр (to)'
        });
      }
      
      const result = await emailService.sendEmail({
        to,
        subject: 'Тестовое письмо от Agent Smith',
        text: 'Это тестовое письмо, отправленное системой Agent Smith для проверки работоспособности Email сервиса.',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4A56E2; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
            .content { padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
            .footer { margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Тестовое письмо от Agent Smith</h2>
            </div>
            <div class="content">
              <p>Это тестовое письмо, отправленное системой Agent Smith для проверки работоспособности Email сервиса.</p>
              <p>Если вы получили это письмо, значит Email сервис настроен корректно!</p>
              <div class="footer">
                <p>С уважением,<br>Система Agent Smith</p>
              </div>
            </div>
          </div>
        </body>
        </html>
        `
      });
      
      if (result.success) {
        await logActivity({
          action: 'TEST_EMAIL_SENT',
          entityType: 'system',
          details: 'Отправлено тестовое письмо',
          metadata: {
            email: to,
            messageId: result.messageId
          }
        });
        
        res.json({
          status: 'success',
          messageId: result.messageId
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: result.error
        });
      }
    } catch (error) {
      console.error('Ошибка отправки тестового письма:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  });
}