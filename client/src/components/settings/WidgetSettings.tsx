import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Copy, Trash, GripVertical, Plus, ArrowDown, ArrowUp, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface WidgetField {
  id: number;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
}

interface WidgetSettings {
  type: string;
  enabled: boolean;
  settings: {
    title: string;
    subtitle?: string;
    primaryColor: string;
    theme: 'light' | 'dark';
    formFields: WidgetField[];
  };
}

const fieldTypes = [
  { value: 'text', label: 'Текстовое поле' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Телефон' },
  { value: 'textarea', label: 'Текстовая область' },
  { value: 'select', label: 'Выпадающий список' },
];

interface WidgetSettingsProps {
  refreshTab?: () => void;
}

export function WidgetSettings({ refreshTab }: WidgetSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [widgetPreview, setWidgetPreview] = useState<{ html: string }>({ html: '' });

  // Стандартные настройки виджета
  const defaultSettings: WidgetSettings = {
    type: 'widget',
    enabled: false,
    settings: {
      title: 'Форма обращения',
      primaryColor: '#1e40af',
      theme: 'light',
      formFields: [
        { id: 1, type: 'text', label: 'ФИО', required: true },
        { id: 2, type: 'email', label: 'Email', required: true },
        { id: 3, type: 'textarea', label: 'Текст обращения', required: true },
      ]
    }
  };

  const [settings, setSettings] = useState<WidgetSettings>(defaultSettings);

  // Получение настроек виджета
  const { data: widgetSettings, isLoading: isLoadingSettings } = useQuery<WidgetSettings>({
    queryKey: ['/api/system/integration-settings', 'widget'],
    queryFn: async () => {
      const response = await fetch('/api/system/integration-settings?type=widget', {
        method: 'GET'
      });
      return response.json();
    },
    enabled: true
  });

  // Обновление локального состояния при загрузке настроек с сервера
  useEffect(() => {
    if (widgetSettings) {
      setSettings(widgetSettings);
    }
  }, [widgetSettings]);

  // Эффект для обновления предпросмотра при изменении настроек
  useEffect(() => {
    updatePreview();
  }, [settings]);

  // Мутация для сохранения настроек виджета
  const saveSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: WidgetSettings) => {
      const response = await fetch('/api/system/integration-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedSettings)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Настройки сохранены",
        description: "Настройки виджета успешно обновлены",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/system/integration-settings', 'widget'] });
      if (refreshTab) refreshTab();
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки виджета",
        variant: "destructive",
      });
    }
  });

  // Обработчик изменения состояния включения виджета
  const handleEnabledChange = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, enabled }));
  };

  // Обработчик изменения заголовка
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({
      ...prev,
      settings: { ...prev.settings, title: e.target.value }
    }));
  };

  // Обработчик изменения подзаголовка
  const handleSubtitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({
      ...prev,
      settings: { ...prev.settings, subtitle: e.target.value }
    }));
  };

  // Обработчик изменения цвета
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({
      ...prev,
      settings: { ...prev.settings, primaryColor: e.target.value }
    }));
  };

  // Обработчик изменения темы
  const handleThemeChange = (theme: 'light' | 'dark') => {
    setSettings(prev => ({
      ...prev,
      settings: { ...prev.settings, theme }
    }));
  };

  // Функция сохранения настроек
  const saveSettings = () => {
    saveSettingsMutation.mutate(settings);
  };

  // Функция генерации кода для вставки
  const generateEmbedCode = () => {
    return `<div id="agent-smith-citizen-request-widget"></div>\n<script src="https://agent-smith.replit.app/widget.js" id="agent-smith-widget" data-color="${settings.settings.primaryColor}"></script>`;
  };

  // Функция копирования кода для вставки
  const copyEmbedCode = () => {
    const code = generateEmbedCode();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Скопировано",
      description: "Код виджета скопирован в буфер обмена",
    });
  };

  // Функция добавления нового поля
  const addField = () => {
    const newId = Math.max(0, ...settings.settings.formFields.map(f => f.id)) + 1;
    const newField = { id: newId, type: 'text', label: 'Новое поле', required: false };
    
    setSettings(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        formFields: [...prev.settings.formFields, newField]
      }
    }));
  };

  // Функция удаления поля
  const removeField = (id: number) => {
    setSettings(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        formFields: prev.settings.formFields.filter(field => field.id !== id)
      }
    }));
  };

  // Функция изменения типа поля
  const updateFieldType = (id: number, type: string) => {
    setSettings(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        formFields: prev.settings.formFields.map(field => 
          field.id === id ? { ...field, type } : field
        )
      }
    }));
  };

  // Функция изменения метки поля
  const updateFieldLabel = (id: number, label: string) => {
    setSettings(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        formFields: prev.settings.formFields.map(field => 
          field.id === id ? { ...field, label } : field
        )
      }
    }));
  };

  // Функция изменения обязательности поля
  const updateFieldRequired = (id: number, required: boolean) => {
    setSettings(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        formFields: prev.settings.formFields.map(field => 
          field.id === id ? { ...field, required } : field
        )
      }
    }));
  };

  // Функция перемещения поля вверх
  const moveFieldUp = (id: number) => {
    const fields = [...settings.settings.formFields];
    const index = fields.findIndex(f => f.id === id);
    if (index > 0) {
      const temp = fields[index];
      fields[index] = fields[index - 1];
      fields[index - 1] = temp;
      
      setSettings(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          formFields: fields
        }
      }));
    }
  };

  // Функция перемещения поля вниз
  const moveFieldDown = (id: number) => {
    const fields = [...settings.settings.formFields];
    const index = fields.findIndex(f => f.id === id);
    if (index < fields.length - 1) {
      const temp = fields[index];
      fields[index] = fields[index + 1];
      fields[index + 1] = temp;
      
      setSettings(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          formFields: fields
        }
      }));
    }
  };

  // Функция обновления предпросмотра виджета
  const updatePreview = () => {
    // Формируем HTML для предпросмотра
    let formFieldsHtml = '';
    settings.settings.formFields.forEach(field => {
      let fieldHtml = '';
      const requiredStar = field.required ? ' *' : '';
      
      switch (field.type) {
        case 'text':
        case 'email':
        case 'tel':
          fieldHtml = `
            <div class="mb-4">
              <label class="block mb-2 text-sm font-medium">${field.label}${requiredStar}</label>
              <input type="${field.type}" class="w-full p-2 border rounded" placeholder="Введите ${field.label.toLowerCase()}" ${field.required ? 'required' : ''}>
            </div>
          `;
          break;
        case 'textarea':
          fieldHtml = `
            <div class="mb-4">
              <label class="block mb-2 text-sm font-medium">${field.label}${requiredStar}</label>
              <textarea class="w-full p-2 border rounded" rows="3" placeholder="Введите ${field.label.toLowerCase()}" ${field.required ? 'required' : ''}></textarea>
            </div>
          `;
          break;
        case 'select':
          fieldHtml = `
            <div class="mb-4">
              <label class="block mb-2 text-sm font-medium">${field.label}${requiredStar}</label>
              <select class="w-full p-2 border rounded" ${field.required ? 'required' : ''}>
                <option value="">Выберите...</option>
                <option value="option1">Вариант 1</option>
                <option value="option2">Вариант 2</option>
                <option value="option3">Вариант 3</option>
              </select>
            </div>
          `;
          break;
      }
      
      formFieldsHtml += fieldHtml;
    });
    
    const html = `
      <div style="max-width: 100%; font-family: system-ui, sans-serif; border-radius: 0.5rem; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); background-color: ${settings.settings.theme === 'light' ? 'white' : '#1f2937'}; color: ${settings.settings.theme === 'light' ? 'black' : 'white'};">
        <div style="padding: 1rem; background-color: ${settings.settings.primaryColor}; color: white;">
          <h3 style="margin: 0; font-weight: 600; font-size: 1.25rem;">${settings.settings.title}</h3>
          <p style="margin-top: 0.5rem; margin-bottom: 0; font-size: 0.875rem;">Пожалуйста, заполните форму обращения</p>
        </div>
        <div style="padding: 1.5rem;">
          ${formFieldsHtml}
          <button style="width: 100%; padding: 0.625rem; font-weight: 500; color: white; background-color: ${settings.settings.primaryColor}; border: none; border-radius: 0.25rem; cursor: pointer;">
            Отправить
          </button>
        </div>
      </div>
    `;
    
    setWidgetPreview({ html });
  };

  if (isLoadingSettings) {
    return <div>Загрузка настроек...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Виджет для сайта</h3>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1" 
          onClick={() => saveSettings()}
        >
          Сгенерировать код
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="space-y-4 border rounded-lg p-4 bg-card">
            <h4 className="text-sm font-medium mb-2">Настройки виджета</h4>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="title">Заголовок</Label>
                <Input 
                  id="title" 
                  value={settings.settings.title} 
                  onChange={handleTitleChange}
                  placeholder="Форма обращения"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="subtitle">Фраза обращения</Label>
                <Input 
                  id="subtitle" 
                  value={settings.settings.subtitle || ''} 
                  onChange={handleSubtitleChange}
                  placeholder="Пожалуйста, заполните форму обращения"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="theme">Тема оформления</Label>
                <div className="flex gap-2 mt-2">
                  <div 
                    className={`flex items-center justify-center rounded-md p-2 border cursor-pointer ${settings.settings.theme === 'light' ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => handleThemeChange('light')}
                  >
                    <span className="bg-white text-black rounded-full p-3 text-xs">Светлая</span>
                  </div>
                  <div 
                    className={`flex items-center justify-center rounded-md p-2 border cursor-pointer ${settings.settings.theme === 'dark' ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    <span className="bg-slate-900 text-white rounded-full p-3 text-xs">Темная</span>
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="color">Основной цвет</Label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    type="color" 
                    value={settings.settings.primaryColor} 
                    onChange={handleColorChange}
                    className="w-12 h-9 p-1"
                  />
                  <Input 
                    type="text" 
                    value={settings.settings.primaryColor} 
                    onChange={handleColorChange}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4 border rounded-lg p-4 bg-card">
            <h4 className="text-sm font-medium mb-2">Поля формы</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Настройте поля, которые будут отображаться в форме обращений
            </p>
            
            <div className="grid grid-cols-3 gap-4 items-center border-b pb-2 text-xs font-medium text-muted-foreground mb-2">
              <div className="flex items-center gap-2">
                <span className="w-5"></span>
                <span>Тип поля</span>
              </div>
              <div>Заголовок</div>
              <div className="flex justify-end">Действия</div>
            </div>
            
            {settings.settings.formFields.map((field, index) => (
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
                    placeholder="Название поля"
                  />
                </div>
                
                <div className="flex items-center justify-end gap-2">
                  <div className="flex items-center gap-1">
                    <Switch 
                      id={`field-required-${field.id}`}
                      checked={field.required}
                      onCheckedChange={(checked) => updateFieldRequired(field.id, checked)}
                      className="scale-75"
                    />
                    <Label htmlFor={`field-required-${field.id}`} className="text-xs whitespace-nowrap">
                      Обязательное
                    </Label>
                  </div>
                  
                  <div className="flex gap-1">
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
                      disabled={index === settings.settings.formFields.length - 1}
                      className="h-7 w-7"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeField(field.id)}
                      className="h-7 w-7 text-destructive hover:text-destructive"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2" 
              onClick={addField}
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить поле
            </Button>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="border rounded-lg p-4 bg-card">
            <h4 className="text-sm font-medium mb-2">Предпросмотр виджета</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Так виджет будет выглядеть на вашем сайте
            </p>
            
            <div className="border rounded-lg overflow-hidden">
              <div dangerouslySetInnerHTML={{ __html: widgetPreview.html }} />
            </div>
          </div>
          
          <div className="border rounded-lg p-4 bg-card">
            <h4 className="text-sm font-medium mb-2">Код для встраивания</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Вставьте этот код на ваш сайт для отображения виджета
            </p>
            
            <div className="relative">
              <div className="bg-muted p-3 rounded-md text-xs font-mono whitespace-pre-wrap break-all overflow-x-auto">
                {generateEmbedCode()}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={copyEmbedCode}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}