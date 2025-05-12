/**
 * Сервис интеграции с корпоративной почтой
 * Обеспечивает получение и отправку электронных писем
 */

import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import { logActivity, ActivityType } from '../activity-logger';

// Интерфейс для авторизационных данных почты
export interface EmailCredentials {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
}

// Интерфейс для электронного письма
export interface EmailMessage {
  id?: string;
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer;
    path?: string;
    contentType?: string;
  }>;
  date?: Date;
  headers?: any;
}

/**
 * Класс для работы с корпоративной почтой
 */
export class EmailService {
  private credentials: EmailCredentials | null = null;
  private transporter: any = null;
  private imapClient: any = null;
  private _isConnected: boolean = false;

  /**
   * Получить статус подключения
   */
  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Проверка и установка учетных данных
   * @param credentials Учетные данные для подключения
   */
  async setCredentials(credentials: EmailCredentials): Promise<boolean> {
    try {
      // Создаем временный транспорт для проверки подключения
      const testTransporter = nodemailer.createTransport({
        host: credentials.host,
        port: credentials.port,
        secure: credentials.secure,
        auth: {
          user: credentials.user,
          pass: credentials.password
        }
      });

      // Проверяем подключение
      await testTransporter.verify();

      // Если все хорошо, сохраняем учетные данные
      this.credentials = credentials;
      this.transporter = testTransporter;
      this._isConnected = true;

      // Логируем активность
      await logActivity({
        action: 'email_integration_connected',
        entityType: 'integration',
        details: `Подключение к корпоративной почте ${credentials.user} установлено`
      });

      return true;
    } catch (error) {
      console.error('Ошибка подключения к почте:', error);
      this._isConnected = false;
      return false;
    }
  }

  /**
   * Отключение от почтового сервера
   */
  async disconnect(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }

    if (this.imapClient) {
      this.imapClient.close();
      this.imapClient = null;
    }

    this._isConnected = false;
    await logActivity({
      action: 'email_integration_disconnected',
      entityType: 'integration',
      details: 'Отключение от корпоративной почты'
    });
  }

  /**
   * Отправка электронного письма
   * @param message Сообщение для отправки
   */
  async sendEmail(message: EmailMessage): Promise<boolean> {
    if (!this.transporter || !this._isConnected) {
      throw new Error('Нет подключения к почтовому серверу');
    }

    try {
      const result = await this.transporter.sendMail({
        from: message.from || this.credentials?.user,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments
      });

      await logActivity({
        action: 'email_sent',
        entityType: 'email',
        details: `Отправлено письмо: "${message.subject}" на адрес ${Array.isArray(message.to) ? message.to.join(', ') : message.to}`
      });

      return true;
    } catch (error) {
      console.error('Ошибка отправки письма:', error);
      return false;
    }
  }

  /**
   * Получение списка писем из почтового ящика
   * В демонстрационной версии возвращаем тестовые данные
   * @param folder Папка для проверки (inbox, sent, etc.)
   * @param limit Максимальное количество писем
   */
  async getEmails(folder: string = 'INBOX', limit: number = 10): Promise<EmailMessage[]> {
    if (!this._isConnected) {
      throw new Error('Нет подключения к почтовому серверу');
    }

    // В реальной реализации здесь был бы код для получения писем через IMAP
    // В демо-версии возвращаем тестовые данные
    const demoEmails: EmailMessage[] = [
      {
        id: 'email1',
        from: 'system@agentsmith.kz',
        to: this.credentials?.user || 'user@example.com',
        subject: 'Ваши учетные данные для доступа к системе Agent Smith',
        text: 'Уважаемый пользователь, ваши учетные данные для входа в систему: логин: admin, пароль: ********. Пожалуйста, смените пароль при первом входе.',
        html: '<p>Уважаемый пользователь,</p><p>Ваши учетные данные для входа в систему:</p><ul><li><strong>Логин:</strong> admin</li><li><strong>Пароль:</strong> ********</li></ul><p>Пожалуйста, смените пароль при первом входе.</p>',
        date: new Date(Date.now() - 3600000) // 1 час назад
      },
      {
        id: 'email2',
        from: 'notifications@agentsmith.kz',
        to: this.credentials?.user || 'user@example.com',
        subject: 'Новое обращение в системе',
        text: 'В системе зарегистрировано новое обращение #1234. Пожалуйста, проверьте его в личном кабинете.',
        date: new Date(Date.now() - 7200000) // 2 часа назад
      },
      {
        id: 'email3',
        from: 'support@agentsmith.kz',
        to: this.credentials?.user || 'user@example.com',
        subject: 'Уведомление о техническом обслуживании',
        text: 'Уважаемый пользователь, сообщаем, что 15.05.2025 с 02:00 до 04:00 будут проводиться технические работы. В это время система может быть недоступна.',
        date: new Date(Date.now() - 86400000) // 1 день назад
      }
    ];

    await logActivity({
      action: 'emails_fetched',
      entityType: 'integration',
      details: `Получено ${demoEmails.length} писем из папки ${folder}`
    });

    return demoEmails;
  }

  /**
   * Отправка тестового электронного письма
   * @param recipient Получатель тестового письма
   */
  async sendTestEmail(recipient: string): Promise<boolean> {
    const testMessage: EmailMessage = {
      from: this.credentials?.user || 'noreply@agentsmith.kz',
      to: recipient,
      subject: 'Тестовое письмо от Agent Smith',
      text: 'Это тестовое письмо для проверки работы интеграции с корпоративной почтой.',
      html: '<p>Это тестовое письмо для проверки работы интеграции с корпоративной почтой.</p><p>Если вы видите это сообщение, значит настройка выполнена правильно.</p>'
    };

    return await this.sendEmail(testMessage);
  }
}

// Создаем и экспортируем экземпляр сервиса
export const emailService = new EmailService();