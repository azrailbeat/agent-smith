/**
 * Agent Smith JavaScript API клиент
 * Версия: 1.0.0
 * 
 * Библиотека для взаимодействия с API Agent Smith для интеграции обращений граждан
 * в ваши веб-приложения и сайты.
 */
class AgentSmithClient {
  /**
   * Создает новый экземпляр клиента API Agent Smith
   * @param {string} apiKey - API ключ для авторизации запросов
   * @param {Object} options - Дополнительные настройки
   * @param {string} options.baseUrl - Базовый URL API (по умолчанию: https://agent-smith.replit.app)
   */
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || 'https://agent-smith.replit.app';
  }

  /**
   * Создает новое обращение гражданина
   * @param {Object} requestData - Данные обращения
   * @param {string} requestData.fullName - ФИО заявителя
   * @param {string} requestData.contactInfo - Контактная информация (Email или телефон)
   * @param {string} requestData.requestType - Тип обращения
   * @param {string} requestData.description - Текст обращения
   * @param {string} [requestData.subject] - Тема обращения
   * @param {string} [requestData.priority] - Приоритет (high, medium, low)
   * @param {Object} [requestData.additionalData] - Любые дополнительные данные
   * @returns {Promise<Object>} - Результат запроса с ID созданного обращения
   */
  async createRequest(requestData) {
    if (!requestData.fullName || !requestData.contactInfo || !requestData.requestType || !requestData.description) {
      throw new Error('Необходимые поля отсутствуют: fullName, contactInfo, requestType и description обязательны');
    }

    // Добавляем метаданные
    const sourceSystem = 'js-api-client';
    const sourceUrl = typeof window !== 'undefined' ? window.location.href : 'node-environment';
    
    const data = {
      ...requestData,
      sourceSystem,
      sourceUrl,
      externalId: `JS-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };

    return this._sendRequest('/api/external/citizen-requests', 'POST', data);
  }

  /**
   * Получает информацию об обращении по ID
   * @param {string} requestId - ID обращения
   * @returns {Promise<Object>} - Детальная информация об обращении
   */
  async getRequest(requestId) {
    return this._sendRequest(`/api/external/citizen-requests/${requestId}`, 'GET');
  }

  /**
   * Получает статус обращения по ID
   * @param {string} requestId - ID обращения
   * @returns {Promise<string>} - Статус обращения
   */
  async getRequestStatus(requestId) {
    const response = await this.getRequest(requestId);
    return response.status;
  }

  /**
   * Добавляет комментарий к обращению
   * @param {string} requestId - ID обращения
   * @param {string} comment - Текст комментария
   * @returns {Promise<Object>} - Результат операции
   */
  async addComment(requestId, comment) {
    return this._sendRequest(`/api/external/citizen-requests/${requestId}/comments`, 'POST', {
      comment,
      source: 'js-api-client'
    });
  }

  /**
   * Получает список обращений с возможностью фильтрации
   * @param {Object} [options] - Параметры запроса
   * @param {string} [options.status] - Фильтр по статусу
   * @param {number} [options.limit=10] - Максимальное количество результатов
   * @param {number} [options.offset=0] - Смещение для пагинации
   * @returns {Promise<Object>} - Список обращений
   */
  async getRequestsList(options = {}) {
    const limit = options.limit || 10;
    const offset = options.offset || 0;
    
    let url = `/api/external/citizen-requests?limit=${limit}&offset=${offset}`;
    
    if (options.status) {
      url += `&status=${options.status}`;
    }
    
    return this._sendRequest(url, 'GET');
  }

  /**
   * Проверяет валидность API ключа
   * @returns {Promise<boolean>} - true если ключ валидный
   */
  async validateApiKey() {
    try {
      const response = await this._sendRequest('/api/external/validate-key', 'GET');
      return response.valid === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Получает информацию о доступных статусах обращений
   * @returns {Promise<Array>} - Массив статусов
   */
  async getStatusesList() {
    return this._sendRequest('/api/external/statuses', 'GET');
  }

  /**
   * Получает шаблон HTML формы обращения гражданина
   * @param {Object} [options] - Параметры формы
   * @param {string} [options.theme='light'] - Тема оформления (light/dark)
   * @param {string} [options.color='#1c64f2'] - Основной цвет
   * @param {string} [options.title='Форма обращения'] - Заголовок формы
   * @param {string} [options.subtitle] - Подзаголовок формы
   * @returns {Promise<string>} - HTML код формы
   */
  async getFormTemplate(options = {}) {
    const params = new URLSearchParams({
      theme: options.theme || 'light',
      color: options.color || '#1c64f2',
      title: options.title || 'Форма обращения',
      subtitle: options.subtitle || ''
    }).toString();
    
    return this._sendRequest(`/api/external/form-template?${params}`, 'GET', null, 'text');
  }

  /**
   * Отправляет запрос к API
   * @private
   * @param {string} endpoint - Конечная точка API
   * @param {string} method - HTTP метод
   * @param {Object} [data] - Данные для отправки
   * @param {string} [responseType='json'] - Тип ожидаемого ответа
   * @returns {Promise<any>} - Результат запроса
   */
  async _sendRequest(endpoint, method, data = null, responseType = 'json') {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey
    };
    
    const options = {
      method,
      headers,
      mode: 'cors',
      cache: 'no-cache'
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API ошибка (${response.status}): ${errorText}`);
      }
      
      if (responseType === 'text') {
        return response.text();
      }
      
      return response.json();
    } catch (error) {
      console.error('Ошибка при запросе к API Agent Smith:', error);
      throw error;
    }
  }
}

/**
 * Пример использования API клиента:
 * 
 * // Создание экземпляра клиента
 * const client = new AgentSmithClient('ваш_api_ключ');
 * 
 * // Создание нового обращения
 * client.createRequest({
 *   fullName: 'Иванов Иван Иванович',
 *   contactInfo: 'ivanov@example.com',
 *   requestType: 'Запрос информации',
 *   description: 'Прошу предоставить справку о составе семьи',
 *   priority: 'medium'
 * })
 * .then(response => {
 *   console.log('Обращение создано:', response);
 *   
 *   // Получение статуса обращения
 *   return client.getRequestStatus(response.id);
 * })
 * .then(status => {
 *   console.log('Статус обращения:', status);
 * })
 * .catch(error => {
 *   console.error('Ошибка:', error);
 * });
 */

// Экспорт для использования в Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AgentSmithClient };
}