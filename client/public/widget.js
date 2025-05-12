/**
 * Agent Smith Widget
 * Виджет для интеграции формы обращений Agent Smith на внешние сайты
 * Версия: 1.0.0
 */

(function() {
  // Параметры виджета
  const scriptTag = document.getElementById('agent-smith-widget');
  const apiKey = scriptTag ? scriptTag.getAttribute('data-key') : '';
  const baseColor = scriptTag ? scriptTag.getAttribute('data-color') || '#1c64f2' : '#1c64f2';
  
  // URL для API запросов
  const API_URL = 'https://agent-smith.replit.app';
  
  // Начальное состояние виджета
  let widgetConfig = {
    title: 'Форма обращения',
    subtitle: 'Пожалуйста, заполните форму обращения',
    primaryColor: baseColor,
    theme: 'light',
    formFields: [
      { id: 1, type: 'text', label: 'ФИО', required: true },
      { id: 2, type: 'email', label: 'Email', required: true },
      { id: 3, type: 'select', label: 'Тип обращения', required: true, options: ['Вопрос', 'Обращение', 'Жалоба', 'Предложение'] },
      { id: 4, type: 'textarea', label: 'Текст обращения', required: true }
    ]
  };
  
  // Загрузка конфигурации с сервера
  function loadWidgetConfig() {
    fetch(`${API_URL}/api/external/widget-config?key=${apiKey}`)
      .then(response => response.json())
      .then(data => {
        if (data && data.settings) {
          widgetConfig = {...widgetConfig, ...data.settings};
          renderButton();
        }
      })
      .catch(error => {
        console.error('Ошибка загрузки конфигурации виджета:', error);
      });
  }
  
  // Создание кнопки виджета
  function renderButton() {
    const button = document.createElement('button');
    button.id = 'agent-smith-widget-button';
    button.innerHTML = 'Обращение граждан';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.padding = '12px 20px';
    button.style.borderRadius = '30px';
    button.style.backgroundColor = widgetConfig.primaryColor;
    button.style.color = '#ffffff';
    button.style.border = 'none';
    button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    button.style.cursor = 'pointer';
    button.style.fontFamily = 'system-ui, sans-serif';
    button.style.fontWeight = '500';
    button.style.fontSize = '14px';
    button.style.zIndex = '9999';
    
    // Анимация при наведении
    button.onmouseover = function() {
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.15)';
      this.style.transition = 'all 0.2s ease';
    };
    
    button.onmouseout = function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      this.style.transition = 'all 0.2s ease';
    };
    
    // Открытие модального окна при клике
    button.onclick = openWidgetModal;
    
    document.body.appendChild(button);
  }
  
  // Открытие модального окна с формой
  function openWidgetModal() {
    // Создаем затемняющий фон
    const overlay = document.createElement('div');
    overlay.id = 'agent-smith-widget-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.id = 'agent-smith-widget-modal';
    modal.style.backgroundColor = widgetConfig.theme === 'light' ? '#ffffff' : '#1f2937';
    modal.style.color = widgetConfig.theme === 'light' ? '#000000' : '#ffffff';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
    modal.style.width = '90%';
    modal.style.maxWidth = '500px';
    modal.style.maxHeight = '90vh';
    modal.style.overflow = 'auto';
    modal.style.position = 'relative';
    
    // Генерируем HTML для модального окна
    modal.innerHTML = `
      <div style="padding: 1rem; background-color: ${widgetConfig.primaryColor}; color: white; border-radius: 8px 8px 0 0;">
        <h3 style="margin: 0; font-weight: 600; font-size: 1.25rem;">${widgetConfig.title}</h3>
        <p style="margin-top: 0.5rem; margin-bottom: 0; font-size: 0.875rem;">${widgetConfig.subtitle || 'Пожалуйста, заполните форму обращения'}</p>
      </div>
      <button id="agent-smith-widget-close" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: white; font-size: 18px; cursor: pointer;">&times;</button>
      <div style="padding: 1.5rem;">
        <form id="agent-smith-widget-form">
          ${generateFormFields()}
          <button type="submit" style="width: 100%; padding: 0.625rem; margin-top: 1rem; font-weight: 500; color: white; background-color: ${widgetConfig.primaryColor}; border: none; border-radius: 0.25rem; cursor: pointer;">
            Отправить
          </button>
        </form>
      </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Обработчик закрытия модального окна
    document.getElementById('agent-smith-widget-close').onclick = function() {
      document.body.removeChild(overlay);
    };
    
    // Обработчик клика на фон (закрытие модального окна)
    overlay.onclick = function(event) {
      if (event.target === overlay) {
        document.body.removeChild(overlay);
      }
    };
    
    // Обработчик отправки формы
    document.getElementById('agent-smith-widget-form').onsubmit = function(event) {
      event.preventDefault();
      submitWidgetForm();
    };
  }
  
  // Генерация HTML для полей формы
  function generateFormFields() {
    let fieldsHTML = '';
    
    widgetConfig.formFields.forEach(field => {
      const requiredAttr = field.required ? 'required' : '';
      const requiredStar = field.required ? ' <span style="color: #e11d48;">*</span>' : '';
      
      switch (field.type) {
        case 'text':
        case 'email':
        case 'tel':
          fieldsHTML += `
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500;">${field.label}${requiredStar}</label>
              <input type="${field.type}" name="${field.id}" style="width: 100%; padding: 0.625rem; border: 1px solid ${widgetConfig.theme === 'light' ? '#d1d5db' : '#4b5563'}; border-radius: 0.375rem; background-color: ${widgetConfig.theme === 'light' ? 'white' : '#374151'}; color: ${widgetConfig.theme === 'light' ? 'black' : 'white'};" ${requiredAttr}>
            </div>
          `;
          break;
        case 'textarea':
          fieldsHTML += `
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500;">${field.label}${requiredStar}</label>
              <textarea name="${field.id}" rows="4" style="width: 100%; padding: 0.625rem; border: 1px solid ${widgetConfig.theme === 'light' ? '#d1d5db' : '#4b5563'}; border-radius: 0.375rem; background-color: ${widgetConfig.theme === 'light' ? 'white' : '#374151'}; color: ${widgetConfig.theme === 'light' ? 'black' : 'white'};" ${requiredAttr}></textarea>
            </div>
          `;
          break;
        case 'select':
          let options = '';
          if (field.options && Array.isArray(field.options)) {
            options = field.options.map(option => `<option value="${option}">${option}</option>`).join('');
          } else {
            options = '<option value="">Выберите...</option><option value="option1">Вариант 1</option><option value="option2">Вариант 2</option>';
          }
          
          fieldsHTML += `
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500;">${field.label}${requiredStar}</label>
              <select name="${field.id}" style="width: 100%; padding: 0.625rem; border: 1px solid ${widgetConfig.theme === 'light' ? '#d1d5db' : '#4b5563'}; border-radius: 0.375rem; background-color: ${widgetConfig.theme === 'light' ? 'white' : '#374151'}; color: ${widgetConfig.theme === 'light' ? 'black' : 'white'};" ${requiredAttr}>
                <option value="">Выберите...</option>
                ${options}
              </select>
            </div>
          `;
          break;
      }
    });
    
    return fieldsHTML;
  }
  
  // Отправка формы на сервер
  function submitWidgetForm() {
    const form = document.getElementById('agent-smith-widget-form');
    const formData = new FormData(form);
    const data = {};
    
    // Преобразуем данные формы в объект
    for(let pair of formData.entries()) {
      const field = widgetConfig.formFields.find(f => f.id.toString() === pair[0]);
      if (field) {
        data[field.label] = pair[1];
      }
    }
    
    // Добавляем служебную информацию
    data.source = window.location.hostname;
    data.apiKey = apiKey;
    
    // Отправка запроса на сервер
    fetch(`${API_URL}/api/external/citizen-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        showSuccessMessage();
      } else {
        showErrorMessage(result.error || 'Произошла ошибка при отправке обращения');
      }
    })
    .catch(error => {
      console.error('Ошибка отправки формы:', error);
      showErrorMessage('Не удалось отправить обращение. Пожалуйста, попробуйте позже.');
    });
  }
  
  // Показать сообщение об успешной отправке
  function showSuccessMessage() {
    const overlay = document.getElementById('agent-smith-widget-overlay');
    const modal = document.getElementById('agent-smith-widget-modal');
    
    if (modal) {
      modal.innerHTML = `
        <div style="padding: 1rem; background-color: ${widgetConfig.primaryColor}; color: white; border-radius: 8px 8px 0 0;">
          <h3 style="margin: 0; font-weight: 600; font-size: 1.25rem;">Обращение отправлено</h3>
        </div>
        <button id="agent-smith-widget-close" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: white; font-size: 18px; cursor: pointer;">&times;</button>
        <div style="padding: 1.5rem; text-align: center;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">✓</div>
          <h4 style="margin-top: 0; font-size: 1.25rem;">Спасибо за ваше обращение!</h4>
          <p style="margin-bottom: 1.5rem;">Ваше обращение успешно отправлено и будет обработано в ближайшее время.</p>
          <button id="agent-smith-widget-close-btn" style="padding: 0.625rem 1.25rem; font-weight: 500; color: white; background-color: ${widgetConfig.primaryColor}; border: none; border-radius: 0.25rem; cursor: pointer;">
            Закрыть
          </button>
        </div>
      `;
      
      document.getElementById('agent-smith-widget-close').onclick = function() {
        document.body.removeChild(overlay);
      };
      
      document.getElementById('agent-smith-widget-close-btn').onclick = function() {
        document.body.removeChild(overlay);
      };
    }
  }
  
  // Показать сообщение об ошибке
  function showErrorMessage(message) {
    const form = document.getElementById('agent-smith-widget-form');
    
    // Удалить предыдущее сообщение об ошибке, если оно есть
    const existingError = document.getElementById('agent-smith-widget-error');
    if (existingError) {
      existingError.parentNode.removeChild(existingError);
    }
    
    // Создать новое сообщение об ошибке
    const errorDiv = document.createElement('div');
    errorDiv.id = 'agent-smith-widget-error';
    errorDiv.style.backgroundColor = '#fee2e2';
    errorDiv.style.color = '#b91c1c';
    errorDiv.style.padding = '0.75rem';
    errorDiv.style.borderRadius = '0.375rem';
    errorDiv.style.marginBottom = '1rem';
    errorDiv.innerText = message;
    
    // Вставить сообщение в начало формы
    form.insertBefore(errorDiv, form.firstChild);
  }
  
  // Инициализация виджета
  function init() {
    loadWidgetConfig();
  }
  
  // Запуск инициализации после загрузки страницы
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();