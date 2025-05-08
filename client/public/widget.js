/**
 * Agent Smith Виджет для обращений граждан
 * Виджет для встраивания формы обращений на внешние сайты
 */

(function() {
  // Основной объект виджета
  window.AgentSmithWidget = {
    /**
     * Инициализация виджета
     * @param {string} containerId - ID контейнера для виджета или сам элемент
     * @param {string} configBase64 - Конфигурация виджета в формате base64
     */
    init: function(containerId, configBase64) {
      try {
        // Получаем настройки из base64 с поддержкой Unicode
        const decodedConfig = atob(configBase64);
        const config = JSON.parse(decodeURIComponent(escape(decodedConfig)));
        
        // Находим контейнер
        const container = typeof containerId === 'string' 
          ? document.getElementById(containerId) 
          : containerId;
          
        if (!container) {
          console.error('AgentSmithWidget: Контейнер не найден', containerId);
          return;
        }
        
        // Рендерим виджет
        this.renderWidget(container, config);
      } catch (err) {
        console.error('AgentSmithWidget: Ошибка инициализации', err);
      }
    },
    
    /**
     * Рендеринг виджета
     * @param {HTMLElement} container - Контейнер для виджета
     * @param {Object} config - Настройки виджета
     */
    renderWidget: function(container, config) {
      // Создаем стили
      const isDark = config.theme === 'dark';
      const styles = this.createStyles(config.primaryColor, isDark);
      
      // Создаем разметку
      let html = `
        <div class="asw-container ${isDark ? 'asw-dark' : 'asw-light'}">
          <div class="asw-header">
            <h3 class="asw-title">${this.escapeHtml(config.title)}</h3>
            <p class="asw-subtitle">${this.escapeHtml(config.subtitle || '')}</p>
          </div>
          <div class="asw-content">
            <form class="asw-form" id="asw-form">
      `;
      
      // Добавляем поля
      if (config.fields && Array.isArray(config.fields)) {
        config.fields.forEach(field => {
          html += this.renderField(field);
        });
      }
      
      // Добавляем кнопку отправки
      html += `
              <div class="asw-form-group">
                <button type="submit" class="asw-button asw-primary-button">
                  ${this.escapeHtml(config.buttonText || 'Отправить')}
                </button>
              </div>
            </form>
          </div>
        </div>
      `;
      
      // Вставляем стили и разметку в контейнер
      container.innerHTML = `
        <style>${styles}</style>
        ${html}
      `;
      
      // Добавляем обработчик отправки формы
      const form = container.querySelector('#asw-form');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleSubmit(form, container, config);
        });
      }
    },
    
    /**
     * Рендеринг поля формы
     * @param {Object} field - Настройки поля
     * @returns {string} HTML разметка поля
     */
    renderField: function(field) {
      if (!field || !field.type || !field.id) return '';
      
      const required = field.required ? 'required' : '';
      const label = this.escapeHtml(field.label || '');
      const placeholder = this.escapeHtml(field.placeholder || '');
      const fieldId = `asw-field-${field.id}`;
      let fieldHtml = '';
      
      // Общая обертка поля
      fieldHtml += `<div class="asw-form-group">`;
      
      // Метка поля
      fieldHtml += `<label for="${fieldId}" class="asw-label">
        ${label}${field.required ? ' <span class="asw-required">*</span>' : ''}
      </label>`;
      
      // Рендеринг в зависимости от типа поля
      switch (field.type) {
        case 'text':
        case 'email':
        case 'tel':
        case 'number':
        case 'date':
          fieldHtml += `<input 
            type="${field.type}" 
            id="${fieldId}" 
            name="${fieldId}" 
            class="asw-input" 
            placeholder="${placeholder}" 
            ${required}
          />`;
          break;
          
        case 'textarea':
          fieldHtml += `<textarea 
            id="${fieldId}" 
            name="${fieldId}" 
            class="asw-textarea" 
            placeholder="${placeholder}" 
            rows="4" 
            ${required}
          ></textarea>`;
          break;
          
        case 'select':
          fieldHtml += `<select 
            id="${fieldId}" 
            name="${fieldId}" 
            class="asw-select" 
            ${required}
          >
            <option value="">${placeholder || 'Выберите...'}</option>`;
            
          // Добавляем опции, если они есть
          if (field.options && Array.isArray(field.options)) {
            field.options.forEach(option => {
              const optionValue = this.escapeHtml(option);
              fieldHtml += `<option value="${optionValue}">${optionValue}</option>`;
            });
          }
          
          fieldHtml += `</select>`;
          break;
          
        case 'checkbox':
          fieldHtml += `<div class="asw-checkbox-group">
            <input 
              type="checkbox" 
              id="${fieldId}" 
              name="${fieldId}" 
              class="asw-checkbox" 
              ${required}
            />
            <label for="${fieldId}" class="asw-checkbox-label">
              ${placeholder || label}
            </label>
          </div>`;
          break;
      }
      
      fieldHtml += `</div>`;
      return fieldHtml;
    },
    
    /**
     * Обработка отправки формы
     * @param {HTMLFormElement} form - Форма
     * @param {HTMLElement} container - Контейнер виджета
     * @param {Object} config - Настройки виджета
     */
    handleSubmit: function(form, container, config) {
      // Собираем данные формы
      const formData = new FormData(form);
      const data = {};
      
      for (let [key, value] of formData.entries()) {
        data[key] = value;
      }
      
      // Показываем состояние загрузки
      form.classList.add('asw-loading');
      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = 'Отправка...';
      }
      
      // Имитируем отправку данных
      setTimeout(() => {
        form.classList.remove('asw-loading');
        
        // Показываем сообщение об успехе
        container.innerHTML = `
          <style>${this.createStyles(config.primaryColor, config.theme === 'dark')}</style>
          <div class="asw-container ${config.theme === 'dark' ? 'asw-dark' : 'asw-light'}">
            <div class="asw-success">
              <div class="asw-success-icon">✓</div>
              <h3 class="asw-success-title">${this.escapeHtml(config.successMessage || 'Сообщение отправлено!')}</h3>
              <p class="asw-success-text">Благодарим за обращение. Мы свяжемся с вами в ближайшее время.</p>
            </div>
          </div>
        `;
        
        // В реальной реализации здесь был бы запрос к API
        console.log('AgentSmithWidget: Данные формы', data);
      }, 1500);
    },
    
    /**
     * Создание стилей для виджета
     * @param {string} primaryColor - Основной цвет
     * @param {boolean} isDark - Темная тема
     * @returns {string} CSS стили
     */
    createStyles: function(primaryColor, isDark) {
      const bgColor = isDark ? '#1a1a1a' : '#ffffff';
      const textColor = isDark ? '#f5f5f5' : '#333333';
      const borderColor = isDark ? '#444444' : '#e1e1e1';
      
      return `
        .asw-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          max-width: 100%;
          border-radius: 8px;
          overflow: hidden;
          background-color: ${bgColor};
          color: ${textColor};
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .asw-header {
          background-color: ${primaryColor};
          color: white;
          padding: 16px 20px;
        }
        
        .asw-title {
          margin: 0 0 5px 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .asw-subtitle {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
        }
        
        .asw-content {
          padding: 20px;
        }
        
        .asw-form-group {
          margin-bottom: 16px;
        }
        
        .asw-label {
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
          font-weight: 500;
        }
        
        .asw-required {
          color: #e53935;
        }
        
        .asw-input,
        .asw-textarea,
        .asw-select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 4px;
          border: 1px solid ${borderColor};
          background-color: ${isDark ? '#2a2a2a' : '#ffffff'};
          color: ${textColor};
          font-size: 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .asw-input:focus,
        .asw-textarea:focus,
        .asw-select:focus {
          outline: none;
          border-color: ${primaryColor};
          box-shadow: 0 0 0 2px ${primaryColor}33;
        }
        
        .asw-checkbox-group {
          display: flex;
          align-items: flex-start;
        }
        
        .asw-checkbox {
          margin-right: 8px;
          margin-top: 3px;
        }
        
        .asw-checkbox-label {
          font-size: 14px;
        }
        
        .asw-button {
          cursor: pointer;
          padding: 10px 16px;
          border-radius: 4px;
          font-weight: 500;
          font-size: 14px;
          transition: opacity 0.2s;
        }
        
        .asw-button:hover {
          opacity: 0.9;
        }
        
        .asw-primary-button {
          background-color: ${primaryColor};
          color: white;
          border: none;
        }
        
        .asw-loading .asw-primary-button {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .asw-success {
          text-align: center;
          padding: 40px 20px;
        }
        
        .asw-success-icon {
          font-size: 32px;
          width: 60px;
          height: 60px;
          line-height: 60px;
          border-radius: 50%;
          background-color: ${primaryColor};
          color: white;
          margin: 0 auto 20px;
        }
        
        .asw-success-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 10px 0;
        }
        
        .asw-success-text {
          font-size: 14px;
          opacity: 0.8;
          margin: 0;
        }
      `;
    },
    
    /**
     * Экранирование HTML
     * @param {string} text - Текст для экранирования
     * @returns {string} Экранированный текст
     */
    escapeHtml: function(text) {
      if (!text) return '';
      
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      
      return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
  };
})();