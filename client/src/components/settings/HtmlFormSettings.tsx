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

  // Генерация HTML кода для простой формы
  const generateSimpleFormHtml = () => {
    // Генерируем HTML для полей формы
    let fieldsHtml = '';
    settings.fields.forEach(field => {
      const requiredAttr = field.required ? 'required' : '';
      const placeholderAttr = field.placeholder ? `placeholder="${field.placeholder}"` : '';
      
      switch (field.type) {
        case 'text':
        case 'email':
        case 'tel':
          fieldsHtml += `
            <div class="citizen-request-form-field">
              <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
              <input type="${field.type}" id="${field.id}" name="${field.id}" ${requiredAttr} ${placeholderAttr}>
            </div>`;
          break;
        case 'textarea':
          fieldsHtml += `
            <div class="citizen-request-form-field">
              <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
              <textarea id="${field.id}" name="${field.id}" rows="4" ${requiredAttr} ${placeholderAttr}></textarea>
            </div>`;
          break;
        case 'select':
          const options = field.options?.map(option => `<option value="${option}">${option}</option>`).join('') || '';
          fieldsHtml += `
            <div class="citizen-request-form-field">
              <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
              <select id="${field.id}" name="${field.id}" ${requiredAttr}>
                <option value="" disabled selected>Выберите...</option>
                ${options}
              </select>
            </div>`;
          break;
        case 'radio':
          fieldsHtml += `
            <div class="citizen-request-form-field">
              <label>${field.label}${field.required ? ' *' : ''}</label>
              <div class="citizen-request-form-radio-group">`;
          
          field.options?.forEach((option, i) => {
            fieldsHtml += `
                <div class="citizen-request-form-radio">
                  <input type="radio" id="${field.id}_${i}" name="${field.id}" value="${option}" ${i === 0 && field.required ? 'required' : ''}>
                  <label for="${field.id}_${i}">${option}</label>
                </div>`;
          });
          
          fieldsHtml += `
              </div>
            </div>`;
          break;
      }
    });
    
    // CSS стили для формы
    const css = `
      .citizen-request-form {
        font-family: 'Arial', sans-serif;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background: var(--form-bg, ${settings.theme === 'light' ? 'white' : '#1f2937'});
        color: var(--form-text, ${settings.theme === 'light' ? '#111827' : '#e5e7eb'});
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      
      .citizen-request-form-header {
        text-align: center;
        margin-bottom: 24px;
      }
      
      .citizen-request-form-header h2 {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 8px;
      }
      
      .citizen-request-form-header p {
        font-size: 16px;
        opacity: 0.8;
      }
      
      .citizen-request-form-body {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .citizen-request-form-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      
      .citizen-request-form-field label {
        font-size: 14px;
        font-weight: 500;
      }
      
      .citizen-request-form-field input,
      .citizen-request-form-field textarea,
      .citizen-request-form-field select {
        padding: 10px 12px;
        border-radius: 4px;
        border: 1px solid ${settings.theme === 'light' ? '#d1d5db' : '#4b5563'};
        background: ${settings.theme === 'light' ? 'white' : '#374151'};
        color: ${settings.theme === 'light' ? '#111827' : '#e5e7eb'};
        font-size: 14px;
      }
      
      .citizen-request-form-radio-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .citizen-request-form-radio {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .citizen-request-form-footer {
        margin-top: 24px;
        display: flex;
        justify-content: center;
      }
      
      .citizen-request-form-footer button {
        padding: 10px 20px;
        background-color: var(--form-color, ${settings.primaryColor});
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      
      .citizen-request-form-footer button:hover {
        opacity: 0.9;
      }
      
      .citizen-request-form-success {
        background-color: #10b981;
        color: white;
        padding: 16px;
        border-radius: 4px;
        text-align: center;
        margin-top: 16px;
        display: none;
      }
    `;
    
    // JavaScript для формы
    const javascript = `
      document.addEventListener('DOMContentLoaded', function() {
        const form = document.querySelector('.citizen-request-form form');
        const successMessage = document.querySelector('.citizen-request-form-success');
        
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          
          // В реальном приложении здесь будет отправка формы на сервер
          // Имитация задержки отправки
          setTimeout(function() {
            form.style.display = 'none';
            successMessage.style.display = 'block';
          }, 1000);
        });
      });
    `;
    
    // Генерируем HTML код формы
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
      <form>
${fieldsHtml}
        <div class="citizen-request-form-footer">
          <button type="submit">${settings.submitButtonText}</button>
        </div>
      </form>
      
      <div class="citizen-request-form-success">
        ${settings.successMessage}
      </div>
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
  
  // Генерация HTML кода лендинга
  const generateLandingHtml = () => {
    // Здесь код для генерации лендинга
    const sectionsHtml = landingSettings.sections.map(section => {
      switch (section.type) {
        case 'text':
          return `
            <section class="content-section">
              <div class="container">
                <h2>${section.title}</h2>
                <div class="text-content">
                  <p>${section.content}</p>
                </div>
              </div>
            </section>`;
        case 'services':
          const items = section.items?.map(item => `
            <div class="service-card">
              <h3>${item.title}</h3>
              <p>${item.description}</p>
            </div>
          `).join('') || '';
          
          return `
            <section class="services-section">
              <div class="container">
                <h2>${section.title}</h2>
                <p class="section-intro">${section.content}</p>
                <div class="services-grid">
                  ${items}
                </div>
              </div>
            </section>`;
        case 'contacts':
          return `
            <section class="contacts-section">
              <div class="container">
                <h2>${section.title}</h2>
                <div class="contacts-grid">
                  <div class="contact-info">
                    <h3>Контактная информация</h3>
                    <p><strong>Адрес:</strong> ${landingSettings.address}</p>
                    <p><strong>Телефон:</strong> ${landingSettings.phone}</p>
                    <p><strong>Email:</strong> ${landingSettings.email}</p>
                  </div>
                  <div class="contact-form">
                    <h3>Форма обращения</h3>
                    <div class="embedded-form">
                      <!-- Здесь будет форма обращения -->
                    </div>
                  </div>
                </div>
              </div>
            </section>`;
        default:
          return '';
      }
    }).join('');
    
    // CSS для лендинга
    const landingCss = `
      :root {
        --primary-color: ${landingSettings.primaryColor};
        --text-color: #333;
        --bg-color: #fff;
        --header-bg: #f9f9f9;
        --footer-bg: #2c3e50;
        --footer-text: #ecf0f1;
      }
      
      body {
        font-family: 'Arial', sans-serif;
        line-height: 1.6;
        color: var(--text-color);
        margin: 0;
        padding: 0;
      }
      
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 20px;
      }
      
      header {
        background-color: var(--header-bg);
        padding: 20px 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .header-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .logo {
        font-size: 24px;
        font-weight: bold;
        color: var(--primary-color);
        text-decoration: none;
      }
      
      .nav-menu {
        display: flex;
        list-style: none;
        margin: 0;
        padding: 0;
      }
      
      .nav-menu li {
        margin-left: 20px;
      }
      
      .nav-menu a {
        color: var(--text-color);
        text-decoration: none;
        font-weight: 500;
        transition: color 0.3s;
      }
      
      .nav-menu a:hover {
        color: var(--primary-color);
      }
      
      .hero {
        background: linear-gradient(to right, var(--primary-color), #6c5ce7);
        color: white;
        padding: 100px 0;
        text-align: center;
      }
      
      .hero h1 {
        font-size: 48px;
        margin-bottom: 20px;
      }
      
      .hero p {
        font-size: 20px;
        max-width: 700px;
        margin: 0 auto;
      }
      
      .content-section {
        padding: 80px 0;
      }
      
      .content-section h2 {
        text-align: center;
        margin-bottom: 40px;
        color: var(--primary-color);
      }
      
      .text-content {
        max-width: 800px;
        margin: 0 auto;
        font-size: 16px;
      }
      
      .services-section {
        padding: 80px 0;
        background-color: #f5f7fa;
      }
      
      .services-section h2 {
        text-align: center;
        margin-bottom: 20px;
        color: var(--primary-color);
      }
      
      .section-intro {
        text-align: center;
        max-width: 700px;
        margin: 0 auto 40px;
      }
      
      .services-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 30px;
      }
      
      .service-card {
        background: white;
        border-radius: 8px;
        padding: 30px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        transition: transform 0.3s;
      }
      
      .service-card:hover {
        transform: translateY(-5px);
      }
      
      .service-card h3 {
        margin-top: 0;
        color: var(--primary-color);
      }
      
      .contacts-section {
        padding: 80px 0;
      }
      
      .contacts-section h2 {
        text-align: center;
        margin-bottom: 40px;
        color: var(--primary-color);
      }
      
      .contacts-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
      }
      
      .contact-info, .contact-form {
        padding: 30px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }
      
      footer {
        background-color: var(--footer-bg);
        color: var(--footer-text);
        padding: 50px 0 20px;
      }
      
      .footer-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 30px;
        margin-bottom: 30px;
      }
      
      .footer-col h3 {
        color: white;
        margin-top: 0;
        margin-bottom: 20px;
      }
      
      .footer-links {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .footer-links li {
        margin-bottom: 10px;
      }
      
      .footer-links a {
        color: var(--footer-text);
        text-decoration: none;
        transition: color 0.3s;
      }
      
      .footer-links a:hover {
        color: var(--primary-color);
      }
      
      .social-links {
        display: flex;
        gap: 15px;
      }
      
      .social-links a {
        color: white;
        font-size: 20px;
      }
      
      .footer-bottom {
        text-align: center;
        padding-top: 20px;
        border-top: 1px solid rgba(255,255,255,0.1);
      }
      
      @media (max-width: 768px) {
        .contacts-grid, .footer-grid {
          grid-template-columns: 1fr;
        }
        
        .hero h1 {
          font-size: 36px;
        }
        
        .hero p {
          font-size: 18px;
        }
      }
    `;
    
    // Генерируем HTML лендинга
    const headerLinks = landingSettings.headerLinks.map(link => `<li><a href="#">${link}</a></li>`).join('');
    const footerLinks = landingSettings.footerLinks.map(link => `<li><a href="#">${link}</a></li>`).join('');
    
    const landingHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${landingSettings.seoTitle || `${landingSettings.organizationName} - Официальный сайт`}</title>
  <meta name="description" content="${landingSettings.seoDescription || `Официальный интернет-ресурс ${landingSettings.organizationName}`}">
  <meta name="keywords" content="${landingSettings.seoKeywords || ''}">
  <style>
${landingCss}
  </style>
</head>
<body>
  <header>
    <div class="container header-container">
      <a href="#" class="logo">${landingSettings.organizationName}</a>
      <nav>
        <ul class="nav-menu">
          ${headerLinks}
        </ul>
      </nav>
    </div>
  </header>
  
  <div class="hero">
    <div class="container">
      <h1>${landingSettings.heroTitle}</h1>
      <p>${landingSettings.heroSubtitle}</p>
    </div>
  </div>
  
  ${sectionsHtml}
  
  <footer>
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col">
          <h3>О нас</h3>
          <p>${landingSettings.organizationDescription}</p>
        </div>
        <div class="footer-col">
          <h3>Контакты</h3>
          <p>Адрес: ${landingSettings.address}</p>
          <p>Телефон: ${landingSettings.phone}</p>
          <p>Email: ${landingSettings.email}</p>
        </div>
        <div class="footer-col">
          <h3>Информация</h3>
          <ul class="footer-links">
            ${footerLinks}
          </ul>
        </div>
        <div class="footer-col">
          <h3>Мы в соцсетях</h3>
          ${landingSettings.showSocialLinks ? `
          <div class="social-links">
            <a href="#"><span>Facebook</span></a>
            <a href="#"><span>Twitter</span></a>
            <a href="#"><span>Instagram</span></a>
          </div>` : ''}
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} ${landingSettings.organizationName}. Все права защищены.</p>
      </div>
    </div>
  </footer>
</body>
</html>`;

    setHtmlCode(landingHtml);
    
    // Создаем упрощенный предпросмотр
    const previewHtml = `
      <div style="max-width:100%; overflow:auto;">
        <header style="background-color:#f9f9f9; padding:15px; margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-weight:bold; color:${landingSettings.primaryColor};">${landingSettings.organizationName}</div>
            <div>
              <ul style="display:flex; list-style:none; gap:15px; margin:0;">
                ${landingSettings.headerLinks.slice(0, 3).map(link => `<li>${link}</li>`).join('')}
              </ul>
            </div>
          </div>
        </header>
        
        <div style="background:linear-gradient(to right, ${landingSettings.primaryColor}, #6c5ce7); color:white; padding:40px 20px; text-align:center; margin-bottom:20px;">
          <h1 style="margin-top:0;">${landingSettings.heroTitle}</h1>
          <p>${landingSettings.heroSubtitle}</p>
        </div>
        
        <div style="padding:20px; margin-bottom:20px;">
          <h2 style="color:${landingSettings.primaryColor};">${landingSettings.sections[0]?.title || 'Информация'}</h2>
          <p>${landingSettings.sections[0]?.content || landingSettings.organizationDescription}</p>
        </div>
        
        <div style="background:#f5f7fa; padding:20px; margin-bottom:20px;">
          <h2 style="color:${landingSettings.primaryColor}; text-align:center;">Форма обращения</h2>
          <div style="max-width:400px; margin:0 auto; background:white; padding:20px; border-radius:8px;">
            <div style="font-weight:bold; margin-bottom:10px;">${settings.title}</div>
            <div style="color:#666; margin-bottom:20px;">${settings.subtitle}</div>
            <div style="display:flex; flex-direction:column; gap:10px;">
              <div style="display:flex; flex-direction:column; gap:5px;">
                <label>ФИО *</label>
                <input type="text" style="padding:8px; border:1px solid #ddd; border-radius:4px;" />
              </div>
              <div style="display:flex; flex-direction:column; gap:5px;">
                <label>Email *</label>
                <input type="email" style="padding:8px; border:1px solid #ddd; border-radius:4px;" />
              </div>
              <div style="display:flex; justify-content:center; margin-top:15px;">
                <button style="background-color:${landingSettings.primaryColor}; color:white; border:none; padding:8px 16px; border-radius:4px;">${settings.submitButtonText}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    setHtmlPreview(previewHtml);
  };
  
  // Генерация HTML кода при изменении настроек
  useEffect(() => {
    if (activeTab === 'form' || activeTab === 'editor') {
      generateSimpleFormHtml();
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

  // Генерация HTML кода для полной формы
  const generateFullFormHtml = () => {
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
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center">
                          <Input 
                            value={field.options?.join(', ')} 
                            onChange={(e) => updateFieldOptions(field.id, e.target.value)}
                            className="h-8"
                            placeholder="Варианты, через запятую"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              // Добавление предустановленного списка значений для соответствующего типа поля
                              const fieldName = field.label.toLowerCase();
                              
                              let newOptions: string[] = [];
                              
                              if (fieldName.includes('тип') && fieldName.includes('обращ')) {
                                newOptions = ['Жалоба', 'Предложение', 'Вопрос', 'Благодарность', 'Запрос информации'];
                              } else if (fieldName.includes('регион') || fieldName.includes('област')) {
                                newOptions = ['г. Алматы', 'г. Астана', 'Акмолинская область', 'Актюбинская область', 
                                  'Алматинская область', 'Атырауская область', 'Восточно-Казахстанская область', 
                                  'Жамбылская область', 'Западно-Казахстанская область', 'Карагандинская область', 
                                  'Костанайская область', 'Кызылординская область', 'Мангистауская область', 
                                  'Павлодарская область', 'Северо-Казахстанская область', 'Туркестанская область'];
                              } else if (fieldName.includes('тематик') || fieldName.includes('категор')) {
                                newOptions = ['Жилищный вопрос', 'Коммунальные услуги', 'Социальная поддержка', 
                                  'Образование', 'Здравоохранение', 'Транспорт и дороги', 'Экология', 
                                  'Трудоустройство', 'Предпринимательство', 'Налоги и финансы', 'Безопасность', 
                                  'Государственные услуги'];
                              } else if (fieldName.includes('пол')) {
                                newOptions = ['Мужской', 'Женский'];
                              } else if (fieldName.includes('документ') || fieldName.includes('удостоверен')) {
                                newOptions = ['Удостоверение личности', 'Паспорт', 'Свидетельство о рождении', 'ИИН'];
                              }
                              
                              if (newOptions.length > 0) {
                                const updatedField = { ...field, options: newOptions };
                                setSettings(prev => ({
                                  ...prev,
                                  fields: prev.fields.map(f => f.id === field.id ? updatedField : f)
                                }));
                              } else {
                                toast({
                                  title: "Подсказка",
                                  description: "Для этого поля нет стандартных значений. Добавьте значения вручную через запятую.",
                                  variant: "default"
                                });
                              }
                            }}
                            className="ml-2 h-8 w-8"
                            title="Добавить стандартные значения"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        {field.options && field.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {field.options.map((option, i) => (
                              <div 
                                key={i} 
                                className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary flex items-center gap-1"
                              >
                                <span>{option}</span>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const updatedOptions = [...field.options!].filter((_, idx) => idx !== i);
                                    const updatedField = { ...field, options: updatedOptions };
                                    setSettings(prev => ({
                                      ...prev,
                                      fields: prev.fields.map(f => f.id === field.id ? updatedField : f)
                                    }));
                                  }}
                                  className="text-primary hover:text-primary/80"
                                >
                                  <Trash className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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