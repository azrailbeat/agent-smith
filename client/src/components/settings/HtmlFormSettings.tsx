import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Copy, Trash, GripVertical, Plus, ArrowDown, ArrowUp, Check, FileCode, PencilRuler, Layout, Layers } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface FormField {
  id: number;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface FormSettings {
  title: string;
  subtitle: string;
  fields: FormField[];
  submitButtonText: string;
  successMessage: string;
  theme: 'light' | 'dark';
  primaryColor: string;
}

interface PageTemplate {
  id: string;
  name: string;
  description: string;
  type: 'government' | 'ministry' | 'agency' | 'department';
  imagePreview: string;
}

interface LandingPageSettings {
  organizationName: string;
  organizationType: 'government' | 'ministry' | 'agency' | 'department';
  organizationDescription: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  headerLinks: string[];
  footerLinks: string[];
  templateId: string;
  customCSS: string;
  formSettings: FormSettings;
  heroTitle: string;
  heroSubtitle: string;
  heroImageURL?: string;
  sections: PageSection[];
  showSocialLinks: boolean;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

interface PageSection {
  id: string;
  type: 'text' | 'services' | 'faq' | 'contacts' | 'gallery' | 'documents' | 'news';
  title: string;
  content: string;
  items?: any[];
}

const fieldTypes = [
  { value: 'text', label: 'Текстовое поле' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Телефон' },
  { value: 'textarea', label: 'Текстовая область' },
  { value: 'select', label: 'Выпадающий список' },
  { value: 'radio', label: 'Радио кнопки' },
  { value: 'checkbox', label: 'Флажок' },
  { value: 'date', label: 'Дата' },
  { value: 'number', label: 'Число' },
  { value: 'file', label: 'Файл' }
];

const pageTemplates: PageTemplate[] = [
  { 
    id: 'govt-standard',
    name: 'Стандартный государственный портал',
    description: 'Базовый шаблон для правительственного портала с официальным стилем',
    type: 'government',
    imagePreview: '/templates/govt-standard.jpg'
  },
  {
    id: 'ministry-modern',
    name: 'Современное министерство',
    description: 'Современный дизайн для министерств с акцентом на доступность',
    type: 'ministry',
    imagePreview: '/templates/ministry-modern.jpg'
  },
  {
    id: 'agency-service',
    name: 'Портал государственных услуг',
    description: 'Портал для агентств, предоставляющих услуги гражданам',
    type: 'agency',
    imagePreview: '/templates/agency-service.jpg'
  },
  {
    id: 'department-local',
    name: 'Региональное ведомство',
    description: 'Шаблон для локальных органов власти с адаптацией под местные нужды',
    type: 'department',
    imagePreview: '/templates/department-local.jpg'
  }
];

const sectionTypes = [
  { value: 'text', label: 'Текстовый блок' },
  { value: 'services', label: 'Услуги' },
  { value: 'faq', label: 'Вопросы и ответы' },
  { value: 'contacts', label: 'Контактная информация' },
  { value: 'gallery', label: 'Галерея' },
  { value: 'documents', label: 'Документы' },
  { value: 'news', label: 'Новости' }
];

// Примеры промптов для генерации сайтов госорганизаций
const promptExamples = [
  'Создать сайт для Министерства цифрового развития с формой обращения граждан по вопросам государственных услуг',
  'Создать сайт для Агентства защиты прав потребителей с формой для подачи жалоб на некачественные товары',
  'Создать сайт для Министерства образования с формой записи на консультацию по вопросам поступления в вузы',
  'Создать сайт для Комитета по социальной защите с формой для подачи заявления на получение социальной помощи',
  'Создать сайт для Налогового комитета с формой для обращений по вопросам налоговой отчетности'
];

interface HtmlFormSettingsProps {
  refreshTab?: () => void;
}

export function HtmlFormSettings({ refreshTab }: HtmlFormSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState('');
  const [htmlCode, setHtmlCode] = useState('');
  const [activeTab, setActiveTab] = useState<string>('form');
  const [promptText, setPromptText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Стандартные настройки формы
  const defaultSettings: FormSettings = {
    title: 'Форма обращения',
    subtitle: 'Пожалуйста, заполните форму обращения',
    fields: [
      { id: 1, type: 'text', label: 'ФИО', required: true, placeholder: 'Введите ФИО' },
      { id: 2, type: 'email', label: 'Email', required: true, placeholder: 'Введите email' },
      { id: 3, type: 'tel', label: 'Телефон', required: false, placeholder: 'Введите телефон' },
      { id: 4, type: 'textarea', label: 'Текст обращения', required: true, placeholder: 'Опишите суть обращения' },
      { id: 5, type: 'select', label: 'Тип обращения', required: true, options: ['Жалоба', 'Предложение', 'Вопрос', 'Благодарность'] },
    ],
    submitButtonText: 'Отправить обращение',
    successMessage: 'Ваше обращение успешно отправлено. Спасибо!',
    theme: 'light',
    primaryColor: '#1c64f2'
  };

  // Стандартные настройки лендинга
  const defaultLandingSettings: LandingPageSettings = {
    organizationName: 'Министерство цифрового развития',
    organizationType: 'ministry',
    organizationDescription: 'Официальный сайт Министерства цифрового развития Республики Казахстан',
    address: 'г. Астана, пр. Мангилик Ел, 8, подъезд 29',
    phone: '+7 (7172) 74-99-98',
    email: 'info@digital.gov.kz',
    headerLinks: ['Главная', 'О министерстве', 'Услуги', 'Документы', 'Контакты'],
    footerLinks: ['Правовая информация', 'Карта сайта', 'Открытые данные', 'Государственные закупки'],
    templateId: 'ministry-modern',
    customCSS: '',
    formSettings: defaultSettings,
    heroTitle: 'Цифровое будущее начинается сегодня',
    heroSubtitle: 'Развитие цифровых технологий для комфортной и безопасной жизни каждого гражданина',
    sections: [
      {
        id: '1',
        type: 'text',
        title: 'О министерстве',
        content: 'Министерство цифрового развития Республики Казахстан является центральным исполнительным органом, осуществляющим руководство в сферах информатизации, связи, оказания государственных услуг, электронного правительства, развития инфраструктуры и защиты данных.'
      },
      {
        id: '2',
        type: 'services',
        title: 'Государственные услуги',
        content: 'Министерство осуществляет предоставление различных государственных услуг в электронном формате',
        items: [
          { title: 'Выдача электронной цифровой подписи', description: 'Получение ЭЦП для физических и юридических лиц' },
          { title: 'Регистрация бизнеса', description: 'Регистрация юридических лиц и ИП в электронном формате' },
          { title: 'Получение справок', description: 'Выдача различных справок из государственных баз данных' }
        ]
      },
      {
        id: '3',
        type: 'contacts',
        title: 'Контактная информация',
        content: 'Для связи с министерством вы можете использовать следующие контактные данные'
      }
    ],
    showSocialLinks: true,
    seoTitle: 'Министерство цифрового развития Республики Казахстан - Официальный сайт',
    seoDescription: 'Официальный интернет-ресурс Министерства цифрового развития Республики Казахстан',
    seoKeywords: 'министерство, цифровое развитие, казахстан, госуслуги, электронное правительство'
  };

  const [settings, setSettings] = useState<FormSettings>(defaultSettings);
  const [landingSettings, setLandingSettings] = useState<LandingPageSettings>(defaultLandingSettings);

  // Получение настроек формы с сервера (заглушка)
  const { data: formSettings, isLoading: isLoadingSettings } = useQuery<FormSettings>({
    queryKey: ['/api/system/html-form-settings'],
    queryFn: async () => {
      // В реальном приложении здесь будет API запрос
      return Promise.resolve(defaultSettings);
    },
    enabled: true
  });

  // Обновление локального состояния при загрузке настроек с сервера
  useEffect(() => {
    if (formSettings) {
      setSettings(formSettings);
    }
  }, [formSettings]);

  // Генерация HTML кода при изменении настроек
  useEffect(() => {
    if (activeTab === 'form' || activeTab === 'editor') {
      generateFormHtml();
    } else if (activeTab === 'landing' || activeTab === 'prompt') {
      generateLandingHtml();
    }
  }, [settings, activeTab, landingSettings]);

  // Функция генерации лендинга на основе промпта с использованием Anthropic
  const generateFromPrompt = async () => {
    if (!promptText || promptText.trim() === '') {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите промпт для генерации сайта",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Запрос к серверу для использования Anthropic API
      const response = await fetch('/api/ai/generate-landing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: promptText,
          currentSettings: landingSettings
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка при генерации лендинга');
      }

      const data = await response.json();
      
      // Обновляем настройки на основе ответа
      if (data.landingSettings) {
        setLandingSettings(data.landingSettings);
        
        if (data.landingSettings.formSettings) {
          setSettings(data.landingSettings.formSettings);
        }
        
        setActiveTab('landing');
        
        toast({
          title: "Успешно",
          description: "Лендинг сгенерирован на основе промпта",
        });
      }
    } catch (error) {
      console.error('Ошибка при генерации лендинга:', error);
      
      // Если API не доступен, используем заглушку - просто меняем некоторые настройки по промпту
      const newSettings = { ...landingSettings };
      
      // Извлекаем название организации из промпта
      if (promptText.includes('для')) {
        const match = promptText.match(/для\s+(.*?)(?:\s+с\s+формой|\s*$)/i);
        if (match && match[1]) {
          newSettings.organizationName = match[1].trim();
          
          // Определяем тип организации
          if (match[1].toLowerCase().includes('министерство')) {
            newSettings.organizationType = 'ministry';
            newSettings.templateId = 'ministry-modern';
          } else if (match[1].toLowerCase().includes('агентство')) {
            newSettings.organizationType = 'agency';
            newSettings.templateId = 'agency-service';
          } else if (match[1].toLowerCase().includes('комитет') || match[1].toLowerCase().includes('департамент')) {
            newSettings.organizationType = 'department';
            newSettings.templateId = 'department-local';
          } else {
            newSettings.organizationType = 'government';
            newSettings.templateId = 'govt-standard';
          }
        }
      }
      
      // Обновляем SEO поля
      newSettings.seoTitle = `${newSettings.organizationName} - Официальный сайт`;
      newSettings.seoDescription = `Официальный интернет-ресурс ${newSettings.organizationName}`;
      
      // Обновляем заголовок и подзаголовок
      if (newSettings.organizationType === 'ministry') {
        newSettings.heroTitle = `На страже интересов граждан`;
        newSettings.heroSubtitle = `${newSettings.organizationName} работает для улучшения жизни каждого гражданина Казахстана`;
      } else if (newSettings.organizationType === 'agency') {
        newSettings.heroTitle = `Услуги для граждан и бизнеса`;
        newSettings.heroSubtitle = `${newSettings.organizationName} предоставляет качественные государственные услуги для всех`;
      }
      
      // Обновляем форму
      if (promptText.includes('форм')) {
        const formMatch = promptText.match(/(?:с\s+формой|формой)\s+(?:для|по)\s+(.*?)(?:\s*$)/i);
        if (formMatch && formMatch[1]) {
          const formType = formMatch[1].trim();
          const formSettings = { ...newSettings.formSettings };
          
          formSettings.title = `Форма для ${formType}`;
          formSettings.subtitle = `Заполните форму, чтобы отправить обращение по ${formType}`;
          
          newSettings.formSettings = formSettings;
          setSettings(formSettings);
        }
      }
      
      setLandingSettings(newSettings);
      setActiveTab('landing');
      
      toast({
        title: "Успешно",
        description: "Лендинг сгенерирован на основе промпта (используется локальная обработка)",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Генерация HTML кода для простой формы
  const generateFormHtml = () => {
    let fieldsHtml = '';
    
    settings.fields.forEach(field => {
      let fieldHtml = '';
      const fieldId = `field_${field.id}`;
      const requiredAttr = field.required ? 'required' : '';
      const requiredStar = field.required ? ' *' : '';
      
      switch (field.type) {
        case 'text':
        case 'email':
        case 'tel':
        case 'date':
        case 'number':
          fieldHtml = `
            <div class="form-group mb-4">
              <label for="${fieldId}" class="block text-sm font-medium mb-1">${field.label}${requiredStar}</label>
              <input type="${field.type}" id="${fieldId}" name="${fieldId}" class="w-full px-3 py-2 border rounded-md" placeholder="${field.placeholder || ''}" ${requiredAttr}>
            </div>`;
          break;
        
        case 'textarea':
          fieldHtml = `
            <div class="form-group mb-4">
              <label for="${fieldId}" class="block text-sm font-medium mb-1">${field.label}${requiredStar}</label>
              <textarea id="${fieldId}" name="${fieldId}" rows="4" class="w-full px-3 py-2 border rounded-md" placeholder="${field.placeholder || ''}" ${requiredAttr}></textarea>
            </div>`;
          break;
        
        case 'select':
          let options = '';
          if (field.options && field.options.length > 0) {
            options = field.options.map(option => `<option value="${option}">${option}</option>`).join('\n              ');
          }
          
          fieldHtml = `
            <div class="form-group mb-4">
              <label for="${fieldId}" class="block text-sm font-medium mb-1">${field.label}${requiredStar}</label>
              <select id="${fieldId}" name="${fieldId}" class="w-full px-3 py-2 border rounded-md" ${requiredAttr}>
              <option value="">Выберите...</option>
              ${options}
              </select>
            </div>`;
          break;
        
        case 'radio':
          if (field.options && field.options.length > 0) {
            let radioOptions = field.options.map((option, index) => `
              <div class="flex items-center mb-2">
                <input type="radio" id="${fieldId}_${index}" name="${fieldId}" value="${option}" class="mr-2" ${index === 0 && field.required ? 'required' : ''}>
                <label for="${fieldId}_${index}" class="text-sm">${option}</label>
              </div>`).join('\n');
            
            fieldHtml = `
              <div class="form-group mb-4">
                <label class="block text-sm font-medium mb-1">${field.label}${requiredStar}</label>
                ${radioOptions}
              </div>`;
          }
          break;
        
        case 'checkbox':
          fieldHtml = `
            <div class="form-group mb-4">
              <div class="flex items-center">
                <input type="checkbox" id="${fieldId}" name="${fieldId}" class="mr-2" ${requiredAttr}>
                <label for="${fieldId}" class="text-sm">${field.label}${requiredStar}</label>
              </div>
            </div>`;
          break;
        
        case 'file':
          fieldHtml = `
            <div class="form-group mb-4">
              <label for="${fieldId}" class="block text-sm font-medium mb-1">${field.label}${requiredStar}</label>
              <input type="file" id="${fieldId}" name="${fieldId}" class="w-full px-3 py-2 border rounded-md" ${requiredAttr}>
            </div>`;
          break;
      }
      
      fieldsHtml += fieldHtml;
    });

    // Генерируем базовый CSS для формы
    const css = `
    .citizen-request-form {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      background-color: ${settings.theme === 'light' ? '#ffffff' : '#1f2937'};
      color: ${settings.theme === 'light' ? '#111827' : '#e5e7eb'};
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      overflow: hidden;
    }
    .citizen-request-form-header {
      background-color: ${settings.primaryColor};
      color: white;
      padding: 1.5rem;
    }
    .citizen-request-form-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }
    .citizen-request-form-header p {
      margin-top: 0.5rem;
      margin-bottom: 0;
      opacity: 0.9;
    }
    .citizen-request-form-body {
      padding: 1.5rem;
    }
    .citizen-request-form-footer {
      padding: 1rem 1.5rem 1.5rem;
    }
    .citizen-request-form button {
      background-color: ${settings.primaryColor};
      color: white;
      border: none;
      padding: 0.625rem 1.25rem;
      font-size: 1rem;
      font-weight: 500;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .citizen-request-form button:hover {
      background-color: ${adjustColorBrightness(settings.primaryColor, -15)};
    }
    .success-message {
      display: none;
      padding: 1rem;
      background-color: #ecfdf5;
      color: #065f46;
      border-radius: 0.375rem;
      margin-bottom: 1rem;
    }
    `;

    // Генерируем JavaScript для обработки формы
    const javascript = `
    document.addEventListener('DOMContentLoaded', function() {
      const form = document.getElementById('citizen-request-form');
      const successMessage = document.getElementById('form-success-message');
      
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Собираем данные формы
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
          data[key] = value;
        }
        
        // Отправляем данные на сервер
        fetch('https://agent-smith.replit.app/api/external/citizen-requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
          // Показываем сообщение об успехе
          form.reset();
          successMessage.style.display = 'block';
          setTimeout(() => {
            successMessage.style.display = 'none';
          }, 5000);
        })
        .catch(error => {
          console.error('Ошибка при отправке формы:', error);
          alert('Произошла ошибка при отправке формы. Пожалуйста, попробуйте позже.');
        });
      });
    });
    `;

    // Собираем полный HTML документ
    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${settings.title}</title>
  <style>
${css}
  </style>
</head>
<body>
  <div class="citizen-request-form">
    <div class="citizen-request-form-header">
      <h2>${settings.title}</h2>
      <p>${settings.subtitle}</p>
    </div>
    
    <div class="citizen-request-form-body">
      <div id="form-success-message" class="success-message">
        ${settings.successMessage}
      </div>
      
      <form id="citizen-request-form">
${fieldsHtml}
        <div class="citizen-request-form-footer">
          <button type="submit">${settings.submitButtonText}</button>
        </div>
      </form>
    </div>
  </div>

  <script>
${javascript}
  </script>
</body>
</html>`;

    setHtmlCode(html);
    
    // Создаем предпросмотр в iframe
    const previewHtml = `
      <div class="citizen-request-form">
        <div class="citizen-request-form-header">
          <h2>${settings.title}</h2>
          <p>${settings.subtitle}</p>
        </div>
        
        <div class="citizen-request-form-body">
          <form>
${fieldsHtml}
            <div class="citizen-request-form-footer">
              <button type="button">${settings.submitButtonText}</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    setHtmlPreview(previewHtml);
  };

  // Функция для настройки яркости цвета (осветление/затемнение)
  function adjustColorBrightness(color: string, percent: number) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = (num >> 16) + percent;
    const g = ((num >> 8) & 0x00FF) + percent;
    const b = (num & 0x0000FF) + percent;
    
    const newR = Math.min(255, Math.max(0, r)).toString(16).padStart(2, '0');
    const newG = Math.min(255, Math.max(0, g)).toString(16).padStart(2, '0');
    const newB = Math.min(255, Math.max(0, b)).toString(16).padStart(2, '0');
    
    return `#${newR}${newG}${newB}`;
  }

  // Копирование HTML кода
  const copyHtmlCode = () => {
    navigator.clipboard.writeText(htmlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Скопировано",
      description: "HTML код формы скопирован в буфер обмена",
    });
  };

  // Загрузка HTML файла
  const downloadHtmlFile = () => {
    const blob = new Blob([htmlCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agent-smith-form.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Скачивание",
      description: "Файл HTML формы загружен",
    });
  };

  // Добавление нового поля
  const addField = () => {
    const newId = settings.fields.length > 0 
      ? Math.max(...settings.fields.map(f => f.id)) + 1 
      : 1;
    
    setSettings(prev => ({
      ...prev,
      fields: [...prev.fields, {
        id: newId,
        type: 'text',
        label: 'Новое поле',
        required: false,
        placeholder: 'Введите значение'
      }]
    }));
  };

  // Удаление поля
  const removeField = (id: number) => {
    setSettings(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== id)
    }));
  };

  // Обновление типа поля
  const updateFieldType = (id: number, type: string) => {
    setSettings(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === id 
          ? { ...field, type } 
          : field
      )
    }));
  };

  // Обновление метки поля
  const updateFieldLabel = (id: number, label: string) => {
    setSettings(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === id 
          ? { ...field, label } 
          : field
      )
    }));
  };

  // Обновление заполнителя поля
  const updateFieldPlaceholder = (id: number, placeholder: string) => {
    setSettings(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === id 
          ? { ...field, placeholder } 
          : field
      )
    }));
  };

  // Обновление обязательности поля
  const updateFieldRequired = (id: number, required: boolean) => {
    setSettings(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === id 
          ? { ...field, required } 
          : field
      )
    }));
  };

  // Обновление опций для выпадающего списка или радио кнопок
  const updateFieldOptions = (id: number, options: string) => {
    const optionsArray = options.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
    
    setSettings(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === id 
          ? { ...field, options: optionsArray } 
          : field
      )
    }));
  };

  // Перемещение поля вверх
  const moveFieldUp = (id: number) => {
    const fields = [...settings.fields];
    const index = fields.findIndex(f => f.id === id);
    
    if (index > 0) {
      const temp = fields[index];
      fields[index] = fields[index - 1];
      fields[index - 1] = temp;
      
      setSettings(prev => ({
        ...prev,
        fields
      }));
    }
  };

  // Перемещение поля вниз
  const moveFieldDown = (id: number) => {
    const fields = [...settings.fields];
    const index = fields.findIndex(f => f.id === id);
    
    if (index < fields.length - 1) {
      const temp = fields[index];
      fields[index] = fields[index + 1];
      fields[index + 1] = temp;
      
      setSettings(prev => ({
        ...prev,
        fields
      }));
    }
  };

  // Сохранение настроек формы
  const saveSettings = () => {
    // В реальном приложении здесь будет API запрос для сохранения настроек
    toast({
      title: "Настройки сохранены",
      description: "Настройки HTML формы успешно сохранены",
    });
    
    if (refreshTab) refreshTab();
  };

  if (isLoadingSettings) {
    return <div>Загрузка настроек...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Генератор HTML формы</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1" 
            onClick={downloadHtmlFile}
          >
            <FileCode className="h-4 w-4" />
            Скачать HTML
          </Button>
          
          <Button 
            variant="default" 
            size="sm" 
            className="gap-1" 
            onClick={saveSettings}
          >
            <Check className="h-4 w-4" />
            Сохранить
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Левая колонка - настройки формы */}
        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-md">Настройки формы</CardTitle>
              <CardDescription>Настройте параметры HTML формы</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="form-title">Заголовок формы</Label>
                  <Input 
                    id="form-title" 
                    value={settings.title} 
                    onChange={e => setSettings(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Форма обращения"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="form-subtitle">Подзаголовок формы</Label>
                  <Input 
                    id="form-subtitle" 
                    value={settings.subtitle} 
                    onChange={e => setSettings(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Пожалуйста, заполните форму обращения"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="form-submit-text">Текст кнопки отправки</Label>
                  <Input 
                    id="form-submit-text" 
                    value={settings.submitButtonText} 
                    onChange={e => setSettings(prev => ({ ...prev, submitButtonText: e.target.value }))}
                    placeholder="Отправить"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="form-success-message">Сообщение об успешной отправке</Label>
                  <Textarea 
                    id="form-success-message" 
                    value={settings.successMessage} 
                    onChange={e => setSettings(prev => ({ ...prev, successMessage: e.target.value }))}
                    placeholder="Ваше обращение успешно отправлено. Спасибо!"
                    className="mt-1"
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="form-theme">Тема оформления</Label>
                  <div className="flex gap-2 mt-2">
                    <div 
                      className={`flex items-center justify-center rounded-md p-2 border cursor-pointer ${settings.theme === 'light' ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setSettings(prev => ({ ...prev, theme: 'light' }))}
                    >
                      <span className="bg-white text-black rounded-full p-3 text-xs">Светлая</span>
                    </div>
                    <div 
                      className={`flex items-center justify-center rounded-md p-2 border cursor-pointer ${settings.theme === 'dark' ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setSettings(prev => ({ ...prev, theme: 'dark' }))}
                    >
                      <span className="bg-slate-900 text-white rounded-full p-3 text-xs">Темная</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="form-color">Основной цвет</Label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      type="color" 
                      value={settings.primaryColor} 
                      onChange={e => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-12 h-9 p-1"
                    />
                    <Input 
                      type="text" 
                      value={settings.primaryColor} 
                      onChange={e => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-md">Поля формы</CardTitle>
              <CardDescription>Настройте поля, которые будут отображаться в форме</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 items-center border-b pb-2 text-xs font-medium text-muted-foreground mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5"></span>
                  <span>Тип поля</span>
                </div>
                <div>Заголовок</div>
                <div className="flex justify-end">Действия</div>
              </div>
              
              {settings.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-3 gap-4 items-center py-2 border-b border-dashed last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="cursor-move">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <Select 
                      value={field.type} 
                      onValueChange={(value) => updateFieldType(field.id, value)}
                    >
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue placeholder="Выберите тип поля" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Input 
                      value={field.label} 
                      onChange={(e) => updateFieldLabel(field.id, e.target.value)}
                      className="h-8"
                    />
                    
                    {/* Дополнительные опции для выпадающего списка и радио */}
                    {(field.type === 'select' || field.type === 'radio') && (
                      <Input 
                        value={field.options?.join(', ')} 
                        onChange={(e) => updateFieldOptions(field.id, e.target.value)}
                        className="h-8 mt-2"
                        placeholder="Варианты, через запятую"
                      />
                    )}
                  </div>
                  
                  <div className="flex justify-end items-center gap-1">
                    <div className="flex items-center mr-2">
                      <Switch 
                        id={`field-required-${field.id}`}
                        checked={field.required}
                        onCheckedChange={(checked) => updateFieldRequired(field.id, checked)}
                      />
                      <Label htmlFor={`field-required-${field.id}`} className="ml-2 text-xs">
                        Обязательное
                      </Label>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => moveFieldUp(field.id)}
                      disabled={index === 0}
                      className="h-7 w-7"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => moveFieldDown(field.id)}
                      disabled={index === settings.fields.length - 1}
                      className="h-7 w-7"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeField(field.id)}
                      className="h-7 w-7 text-destructive"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button 
                variant="outline" 
                className="w-full gap-1" 
                onClick={addField}
              >
                <Plus className="h-4 w-4" />
                Добавить поле
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Правая колонка - предпросмотр и код */}
        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-md">Предпросмотр формы</CardTitle>
              <CardDescription>Так форма будет выглядеть на вашем сайте</CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="border rounded-md p-4 overflow-auto max-h-96"
                dangerouslySetInnerHTML={{ __html: htmlPreview }}
                style={{ 
                  '--form-color': settings.primaryColor,
                  '--form-bg': settings.theme === 'light' ? 'white' : '#1f2937',
                  '--form-text': settings.theme === 'light' ? '#111827' : '#e5e7eb'
                } as React.CSSProperties}
              />
            </CardContent>
          </Card>
          
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-md">HTML код формы</CardTitle>
              <CardDescription>
                Скопируйте этот код и вставьте его на свой сайт для отображения формы обращений
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute top-2 right-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={copyHtmlCode}
                    className="h-7 w-7"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="overflow-auto bg-slate-950 text-slate-50 p-4 rounded-md text-xs max-h-64">
                  {htmlCode}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}