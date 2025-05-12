/**
 * Сервис для работы с корпоративной электронной почтой
 * Поддерживает отправку уведомлений, системных сообщений и работу с входящими письмами
 */

import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import { logActivity } from '../activity-logger';

// Интерфейс для данных письма
export interface EmailData {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

// Интерфейс для результата отправки письма
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Интерфейс для настроек SMTP сервера
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  tls?: {
    rejectUnauthorized: boolean;
  };
}

// Класс сервиса работы с электронной почтой
export class EmailService {
  private transporter!: nodemailer.Transporter;
  private defaultFrom: string;
  private config!: SmtpConfig;
  private isInitialized: boolean = false;

  /**
   * Конструктор сервиса электронной почты
   * @param config Конфигурация SMTP сервера или undefined для использования SendGrid
   * @param defaultFrom Email отправителя по умолчанию
   */
  constructor(config?: SmtpConfig, defaultFrom: string = 'Agent Smith <no-reply@agentsmith.gov.kz>') {
    this.defaultFrom = defaultFrom;
    
    if (config) {
      // Используем собственный SMTP сервер
      this.config = config;
      this.transporter = nodemailer.createTransport(config);
      this.isInitialized = true;
    } else if (process.env.SENDGRID_API_KEY) {
      // Используем SendGrid если есть API ключ
      this.config = {
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      };
      this.transporter = nodemailer.createTransport(this.config);
      this.isInitialized = true;
    } else {
      // Показываем предупреждение, что сервис не инициализирован
      console.warn('EmailService: SMTP не настроен и SENDGRID_API_KEY не найден. Отправка почты недоступна.');
      this.isInitialized = false;
    }
  }

  /**
   * Проверка готовности сервиса к работе
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Проверка соединения с почтовым сервером
   */
  public async verifyConnection(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }
    
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('EmailService: Ошибка проверки соединения:', error);
      return false;
    }
  }

  /**
   * Отправка электронного письма
   * @param data Данные письма
   */
  public async sendEmail(data: EmailData): Promise<EmailResult> {
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'EmailService не инициализирован'
      };
    }
    
    try {
      const mailOptions = {
        from: data.from || this.defaultFrom,
        to: Array.isArray(data.to) ? data.to.join(',') : data.to,
        subject: data.subject,
        text: data.text,
        html: data.html,
        attachments: data.attachments,
        cc: data.cc,
        bcc: data.bcc,
        replyTo: data.replyTo
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      
      // Логируем успешную отправку
      await logActivity({
        action: 'EMAIL_SENT',
        entityType: 'email',
        entityId: 0,
        details: `Письмо отправлено: ${data.subject}`,
        metadata: {
          to: data.to,
          subject: data.subject,
          messageId: info.messageId,
          timestamp: new Date().toISOString()
        }
      });
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('EmailService: Ошибка отправки письма:', error);
      
      // Логируем ошибку
      await logActivity({
        action: 'ERROR',
        entityType: 'email',
        entityId: 0,
        details: `Ошибка отправки письма: ${data.subject}`,
        metadata: {
          to: data.to,
          subject: data.subject,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка',
          timestamp: new Date().toISOString()
        }
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Отправка письма с уведомлением о регистрации
   * @param to Email получателя
   * @param username Имя пользователя
   * @param password Пароль
   * @param loginUrl URL для входа
   */
  public async sendRegistrationEmail(
    to: string,
    username: string,
    password: string,
    loginUrl: string
  ): Promise<EmailResult> {
    const subject = 'Регистрация в системе Agent Smith';
    
    const text = `
Здравствуйте!

Для вас был создан аккаунт в системе Agent Smith.

Данные для входа:
- Логин: ${username}
- Пароль: ${password}

Для входа перейдите по ссылке: ${loginUrl}

После входа рекомендуется сменить пароль.

С уважением,
Команда Agent Smith
`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4A56E2; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
    .content { padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
    .credentials { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .button { display: inline-block; background-color: #4A56E2; color: white; padding: 10px 20px; 
              border-radius: 5px; text-decoration: none; margin-top: 15px; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Agent Smith - Система государственного управления</h2>
    </div>
    <div class="content">
      <p>Здравствуйте!</p>
      
      <p>Для вас был создан аккаунт в системе Agent Smith.</p>
      
      <div class="credentials">
        <p><strong>Данные для входа:</strong></p>
        <p>Логин: <strong>${username}</strong></p>
        <p>Пароль: <strong>${password}</strong></p>
      </div>
      
      <p>Для входа нажмите на кнопку ниже:</p>
      
      <a href="${loginUrl}" class="button">Войти в систему</a>
      
      <p>После входа рекомендуется сменить пароль.</p>
      
      <div class="footer">
        <p>С уважением,<br>Команда Agent Smith</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
    
    return await this.sendEmail({
      to,
      subject,
      text,
      html
    });
  }

  /**
   * Отправка уведомления о назначенной задаче
   * @param to Email получателя
   * @param taskData Данные задачи
   */
  public async sendTaskAssignmentEmail(
    to: string,
    taskData: {
      id: number;
      title: string;
      description: string;
      dueDate?: Date;
      priority: string;
      assignedBy: string;
      taskUrl: string;
    }
  ): Promise<EmailResult> {
    const subject = `Новая задача: ${taskData.title}`;
    
    const formattedDueDate = taskData.dueDate 
      ? new Date(taskData.dueDate).toLocaleDateString('ru-RU', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        })
      : 'Срок не указан';
    
    const text = `
Здравствуйте!

Вам назначена новая задача в системе Agent Smith.

Детали задачи:
- Название: ${taskData.title}
- Описание: ${taskData.description}
- Приоритет: ${taskData.priority}
- Срок выполнения: ${formattedDueDate}
- Назначил: ${taskData.assignedBy}

Для просмотра задачи перейдите по ссылке: ${taskData.taskUrl}

С уважением,
Команда Agent Smith
`;
    
    const priorityColor = taskData.priority === 'Высокий' ? '#dc3545' : 
                          taskData.priority === 'Средний' ? '#ffc107' : '#28a745';
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4A56E2; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
    .content { padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
    .task-details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .priority { display: inline-block; padding: 3px 8px; border-radius: 3px; color: white; font-size: 12px; }
    .button { display: inline-block; background-color: #4A56E2; color: white; padding: 10px 20px; 
              border-radius: 5px; text-decoration: none; margin-top: 15px; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Новая задача в системе Agent Smith</h2>
    </div>
    <div class="content">
      <p>Здравствуйте!</p>
      
      <p>Вам назначена новая задача в системе Agent Smith.</p>
      
      <div class="task-details">
        <h3>${taskData.title}</h3>
        <p>${taskData.description}</p>
        <p>
          <strong>Приоритет:</strong> 
          <span class="priority" style="background-color: ${priorityColor};">${taskData.priority}</span>
        </p>
        <p><strong>Срок выполнения:</strong> ${formattedDueDate}</p>
        <p><strong>Назначил:</strong> ${taskData.assignedBy}</p>
      </div>
      
      <a href="${taskData.taskUrl}" class="button">Перейти к задаче</a>
      
      <div class="footer">
        <p>С уважением,<br>Команда Agent Smith</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
    
    return await this.sendEmail({
      to,
      subject,
      text,
      html
    });
  }

  /**
   * Отправка уведомления о поступившем запросе от гражданина
   * @param to Email получателя
   * @param requestData Данные запроса
   */
  public async sendCitizenRequestNotification(
    to: string,
    requestData: {
      id: number;
      subject: string;
      description: string;
      citizenName: string;
      requestType: string;
      status: string;
      requestUrl: string;
    }
  ): Promise<EmailResult> {
    const subject = `Новый запрос: ${requestData.subject}`;
    
    const text = `
Здравствуйте!

В системе зарегистрирован новый запрос от гражданина.

Детали запроса:
- Тема: ${requestData.subject}
- Описание: ${requestData.description}
- Тип запроса: ${requestData.requestType}
- От: ${requestData.citizenName}
- Статус: ${requestData.status}

Для обработки запроса перейдите по ссылке: ${requestData.requestUrl}

С уважением,
Команда Agent Smith
`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4A56E2; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
    .content { padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
    .request-details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .status { display: inline-block; padding: 3px 8px; border-radius: 3px; 
              background-color: #17a2b8; color: white; font-size: 12px; }
    .button { display: inline-block; background-color: #4A56E2; color: white; padding: 10px 20px; 
              border-radius: 5px; text-decoration: none; margin-top: 15px; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Новый запрос в системе Agent Smith</h2>
    </div>
    <div class="content">
      <p>Здравствуйте!</p>
      
      <p>В системе зарегистрирован новый запрос от гражданина.</p>
      
      <div class="request-details">
        <h3>${requestData.subject}</h3>
        <p>${requestData.description}</p>
        <p><strong>Тип запроса:</strong> ${requestData.requestType}</p>
        <p><strong>От:</strong> ${requestData.citizenName}</p>
        <p>
          <strong>Статус:</strong> 
          <span class="status">${requestData.status}</span>
        </p>
      </div>
      
      <a href="${requestData.requestUrl}" class="button">Перейти к запросу</a>
      
      <div class="footer">
        <p>С уважением,<br>Команда Agent Smith</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
    
    return await this.sendEmail({
      to,
      subject,
      text,
      html
    });
  }

  /**
   * Отправка отчета о результатах обработки запроса гражданину
   * @param to Email получателя
   * @param reportData Данные отчета
   */
  public async sendCitizenReportEmail(
    to: string,
    reportData: {
      requestId: number;
      subject: string;
      responseText: string;
      status: string;
      contactInfo?: string;
      portalUrl?: string;
    }
  ): Promise<EmailResult> {
    const subject = `Ответ на ваш запрос: ${reportData.subject}`;
    
    const text = `
Здравствуйте!

Ваш запрос №${reportData.requestId} "${reportData.subject}" обработан.

Ответ:
${reportData.responseText}

Статус запроса: ${reportData.status}

${reportData.contactInfo ? `Контактная информация: ${reportData.contactInfo}` : ''}

${reportData.portalUrl ? `Для получения дополнительной информации, посетите портал: ${reportData.portalUrl}` : ''}

С уважением,
Государственная система Agent Smith
`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4A56E2; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
    .content { padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
    .response { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .status { display: inline-block; padding: 3px 8px; border-radius: 3px; 
              background-color: #28a745; color: white; font-size: 12px; }
    .button { display: inline-block; background-color: #4A56E2; color: white; padding: 10px 20px; 
              border-radius: 5px; text-decoration: none; margin-top: 15px; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Ответ на ваш запрос</h2>
    </div>
    <div class="content">
      <p>Здравствуйте!</p>
      
      <p>Ваш запрос №${reportData.requestId} "<strong>${reportData.subject}</strong>" обработан.</p>
      
      <div class="response">
        <h3>Ответ:</h3>
        <p>${reportData.responseText.replace(/\n/g, '<br>')}</p>
        <p>
          <strong>Статус запроса:</strong> 
          <span class="status">${reportData.status}</span>
        </p>
        ${reportData.contactInfo ? `<p><strong>Контактная информация:</strong> ${reportData.contactInfo}</p>` : ''}
      </div>
      
      ${reportData.portalUrl ? `<a href="${reportData.portalUrl}" class="button">Перейти на портал</a>` : ''}
      
      <div class="footer">
        <p>С уважением,<br>Государственная система Agent Smith</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
    
    return await this.sendEmail({
      to,
      subject,
      text,
      html
    });
  }
}

// Экспортируем сервис по умолчанию с настройками из окружения
let smtpConfig: SmtpConfig | undefined = undefined;

// Если определены все необходимые переменные окружения, создаем конфигурацию SMTP
if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
  smtpConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false'
    }
  };
}

// Создаем и экспортируем экземпляр EmailService
export const emailService = new EmailService(
  smtpConfig,
  process.env.EMAIL_FROM || 'Agent Smith <no-reply@agentsmith.gov.kz>'
);

/**
 * Проверка работоспособности сервиса электронной почты
 */
export async function testEmailService(): Promise<boolean> {
  if (!emailService.isReady()) {
    console.warn('EmailService: Сервис не инициализирован. Тест невозможен.');
    return false;
  }
  
  const connectionStatus = await emailService.verifyConnection();
  if (!connectionStatus) {
    console.error('EmailService: Тест соединения не пройден.');
    return false;
  }
  
  console.log('EmailService: Соединение успешно установлено.');
  return true;
}