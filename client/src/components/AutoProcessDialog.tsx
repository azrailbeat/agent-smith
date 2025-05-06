/**
 * AutoProcessDialog Component
 * 
 * Компонент диалога для настройки и запуска автоматической обработки обращений граждан
 * с использованием ИИ-агентов. Обеспечивает настройку параметров обработки и
 * анимированное отображение процесса выполнения.
 * 
 * @version 1.0.0
 * @since 06.05.2025
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { Bot, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

/**
 * Интерфейс агента ИИ
 * @interface Agent
 * @property {number} id - Идентификатор агента
 * @property {string} name - Имя агента
 * @property {string} type - Тип агента (citizen_requests, blockchain, etc.)
 * @property {string} [description] - Описание агента
 */
interface Agent {
  id: number;
  name: string;
  type: string;
  description?: string;
}

/**
 * Интерфейс обращения гражданина
 * @interface CitizenRequest
 * @property {number} id - Идентификатор обращения
 * @property {string} fullName - ФИО гражданина
 * @property {string} status - Статус обращения
 * @property {string} subject - Тема обращения
 * @property {Date} createdAt - Дата создания обращения
 */
interface CitizenRequest {
  id: number;
  fullName: string;
  status: string;
  subject: string;
  createdAt: Date;
}

/**
 * Интерфейс шага обработки
 * @interface ProcessingStep
 * @property {string} id - Идентификатор шага
 * @property {string} title - Заголовок шага
 * @property {string} description - Описание шага
 * @property {'pending' | 'in_progress' | 'completed' | 'error'} status - Статус шага обработки
 */
interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
}

interface AutoProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: {
    enabled: boolean;
    agentId?: number;
    autoProcess?: boolean;
    autoClassify?: boolean;
    autoRespond?: boolean;
  };
  onSettingsChange: (settings: any) => void;
  onProcess: (settings: { agentId?: number, autoProcess?: boolean, autoClassify?: boolean, autoRespond?: boolean }) => void;
}

const AutoProcessDialog: React.FC<AutoProcessDialogProps> = ({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  onProcess,
}) => {
  // Состояния процесса обработки
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [processedRequests, setProcessedRequests] = useState<CitizenRequest[]>([]);
  const [requestMoved, setRequestMoved] = useState<boolean>(false);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [requestsToProcess, setRequestsToProcess] = useState<CitizenRequest[]>([]);
  
  // Этапы обработки
  const processingSteps: ProcessingStep[] = [
    { 
      id: 'prepare', 
      title: 'Подготовка данных', 
      description: 'Подготовка данных для обработки ИИ', 
      status: 'pending' 
    },
    { 
      id: 'classify', 
      title: 'Классификация обращений', 
      description: 'ИИ классифицирует обращения по темам и приоритетам', 
      status: 'pending' 
    },
    { 
      id: 'analyze', 
      title: 'Анализ содержимого', 
      description: 'Глубокий анализ содержания обращений', 
      status: 'pending' 
    },
    { 
      id: 'respond', 
      title: 'Подготовка ответов', 
      description: 'Генерация предварительных ответов на обращения', 
      status: 'pending' 
    },
    { 
      id: 'move', 
      title: 'Перемещение обращений', 
      description: 'Перемещение обращений в соответствующие статусы', 
      status: 'pending' 
    }
  ];

  // Загрузка списка агентов
  const { data: agents = [], isLoading: isAgentsLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    refetchOnWindowFocus: false,
  });

  /**
   * Фильтруем агентов по типу (citizen_requests)
   * @type {Agent[]}
   */
  const citizenRequestAgents = agents.filter(agent => 
    agent.type === "citizen_requests"
  );
  
  // Получаем список необработанных обращений
  const { data: requests = [] } = useQuery<CitizenRequest[]>({
    queryKey: ["/api/citizen-requests"],
    refetchOnWindowFocus: false,
  });
  
  // Фильтруем только новые обращения
  const newRequests = requests.filter(req => req.status === 'new');
  
  // Эффект для обновления прогресса
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        if (progress < 100) {
          setProgress(prev => {
            // Увеличиваем прогресс быстрее, если сейчас активный этап
            const increment = processingStep === Math.floor(prev / 20) ? 2 : 0.5;
            const newProgress = Math.min(prev + increment, 100);
            
            // Переход к следующему этапу
            if (Math.floor(newProgress / 20) > processingStep) {
              setProcessingStep(Math.floor(newProgress / 20));
            }
            
            return newProgress;
          });
        } else {
          clearInterval(interval);
          setIsProcessing(false);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isProcessing, progress, processingStep]);
  
  // Обновление статусов этапов
  const stepsWithStatus = processingSteps.map((step, index) => {
    if (index < processingStep) {
      return { ...step, status: 'completed' as const };
    } else if (index === processingStep) {
      return { ...step, status: 'in_progress' as const };
    } else {
      return step;
    }
  });

  // Состояние для отслеживания, нужно ли перезапускать уже обработанные запросы
  const [forceReprocess, setForceReprocess] = useState<boolean>(false);

  // Обработчик для запуска процесса
  const startProcessing = () => {
    if (!settings.enabled || !settings.agentId) {
      alert('Необходимо включить ИИ и выбрать агента');
      return;
    }
    setIsProcessing(true);
    setProcessingStep(0);
    setProgress(0);
    // Имитируем выбор обращений из текущего списка
    setRequestsToProcess(newRequests.slice(0, Math.min(newRequests.length, 5)));
    // Имитируем выбор клиента для демонстрации
    if (newRequests.length > 0) {
      setSelectedClient(newRequests[0].fullName);
    }
    
    // После завершения анимации запускаем реальную обработку
    setTimeout(() => {
      onProcess({
        ...settings as any, 
        forceReprocess // Добавляем параметр для повторной обработки
      });
    }, 5000);
  };

  // Отображение прогресса при обработке обращений
  const renderProcessingContent = () => (
    <>
      <div className="py-2 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-3">
          <Bot className="h-6 w-6 text-blue-600 animate-pulse" />
        </div>
        <h3 className="text-lg font-medium mb-1">Автоматическая обработка обращений</h3>
        <p className="text-gray-500 mb-4 text-sm">
          Агент {agents.find(a => a.id === settings.agentId)?.name || 'ИИ'} обрабатывает {newRequests.length} обращений
        </p>
      </div>
      
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Прогресс: {Math.floor(progress)}%</span>
          <Badge variant="outline" className="text-xs">
            Этап {processingStep + 1}/{processingSteps.length}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
        
        <div className="space-y-3 max-h-[260px] overflow-y-auto p-1">
          {stepsWithStatus.map((step, index) => (
            <div 
              key={step.id} 
              className={`flex items-center p-3 rounded-md border ${
                step.status === 'in_progress' 
                  ? 'border-blue-200 bg-blue-50' 
                  : step.status === 'completed' 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="mr-3">
                {step.status === 'pending' && (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
                {step.status === 'in_progress' && (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                )}
                {step.status === 'completed' && (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{step.title}</p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              {step.status === 'in_progress' && index === 4 && requestMoved && (
                <Badge className="ml-auto animate-pulse bg-green-500">
                  Перемещено: 2 обращения
                </Badge>
              )}
            </div>
          ))}
        </div>
        
        {processingStep >= 3 && (
          <div className="border border-blue-100 rounded-md p-3 bg-blue-50">
            <h4 className="text-sm font-medium flex items-center mb-2">
              <ArrowRight className="h-4 w-4 mr-1 text-blue-500" />
              Сводка действий
            </h4>
            <div className="space-y-2">
              {processingStep >= 4 && (
                <div className="flex items-center justify-between text-xs">
                  <span>Обработано обращений:</span>
                  <Badge variant="outline" className="bg-white">
                    {Math.min(progress > 90 ? newRequests.length : Math.floor(newRequests.length * progress / 100), newRequests.length)}
                  </Badge>
                </div>
              )}
              {selectedClient && progress > 60 && (
                <div className="text-xs border-t border-blue-200 pt-2 mt-2">
                  <div className="flex items-center mb-1">
                    <span className="font-medium">{selectedClient}</span>
                    <Badge className="ml-2 text-[10px] bg-green-500">В работе</Badge>
                  </div>
                  <p className="text-gray-600">Обращение классифицировано и передано в работу ведомству</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-center">
        <Button 
          variant="outline" 
          onClick={() => {
            setIsProcessing(false);
            onOpenChange(false);
          }}
          className="w-full"
        >
          Закрыть
        </Button>
      </div>
    </>
  );
  
  // Отображение настроек и выбора параметров
  const renderSettingsContent = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Настройки автоматической обработки
        </DialogTitle>
        <DialogDescription>
          Настройте параметры автоматической обработки обращений с помощью ИИ-агентов
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="ai-enabled" className="flex items-center gap-2">
            Включить обработку ИИ
            {!settings.enabled && (
              <span className="text-xs text-yellow-600 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                Необходимо включить для автоматической обработки
              </span>
            )}
          </Label>
          <Switch
            id="ai-enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) =>
              onSettingsChange({ ...settings, enabled: checked })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent-select">Выберите агента для обработки</Label>
          <Select
            value={settings.agentId?.toString() || ""}
            onValueChange={(value) =>
              onSettingsChange({ ...settings, agentId: parseInt(value) })
            }
            disabled={!settings.enabled || isAgentsLoading}
          >
            <SelectTrigger id="agent-select">
              <SelectValue placeholder="Выберите агента" />
            </SelectTrigger>
            <SelectContent>
              {citizenRequestAgents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id.toString()}>
                  {agent.name} {agent.description ? `- ${agent.description}` : ""}
                </SelectItem>
              ))}
              {citizenRequestAgents.length === 0 && (
                <SelectItem value="" disabled>
                  Нет доступных агентов
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 border border-gray-100 rounded-md p-4 bg-gray-50">
          <h3 className="font-medium">Типы обработки</h3>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-classify">Автоматическая классификация</Label>
            <Switch
              id="auto-classify"
              checked={settings.autoClassify || false}
              onCheckedChange={(checked) =>
                onSettingsChange({ ...settings, autoClassify: checked })
              }
              disabled={!settings.enabled}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-summarize">Автоматическое резюмирование</Label>
            <Switch
              id="auto-summarize"
              checked={settings.autoProcess || false}
              onCheckedChange={(checked) =>
                onSettingsChange({ ...settings, autoProcess: checked })
              }
              disabled={!settings.enabled}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-respond">Автоматические ответы</Label>
            <Switch
              id="auto-respond"
              checked={settings.autoRespond || false}
              onCheckedChange={(checked) =>
                onSettingsChange({ ...settings, autoRespond: checked })
              }
              disabled={!settings.enabled}
            />
          </div>
          
          <div className="pt-2 mt-2 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <Label htmlFor="force-reprocess" className="flex items-center gap-2">
                Повторная обработка
                <span className="text-xs text-gray-500">
                  Повторно обработать уже обработанные запросы
                </span>
              </Label>
              <Switch
                id="force-reprocess"
                checked={forceReprocess}
                onCheckedChange={setForceReprocess}
                disabled={!settings.enabled}
              />
            </div>
          </div>
        </div>
        
        {newRequests.length > 0 || forceReprocess ? (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800 mb-4">
            <p className="flex items-center"><AlertCircle className="h-4 w-4 inline-block mr-2" />
              {forceReprocess 
                ? `Найдены обращения для повторной обработки` 
                : `Найдено ${newRequests.length} необработанных обращений`
              }
            </p>
            <div className="mt-2 text-xs">
              {(forceReprocess ? requests : newRequests).slice(0, 3).map(req => (
                <div key={req.id} className="py-1 border-t border-blue-100 flex justify-between">
                  <span className="font-medium truncate max-w-[150px]">{req.fullName}</span>
                  <Badge variant={req.aiProcessed && forceReprocess ? "secondary" : "outline"} className="ml-2">
                    {req.aiProcessed && forceReprocess ? "Повторно" : req.subject.substring(0, 15)+'...'}
                  </Badge>
                </div>
              ))}
              {(forceReprocess ? requests : newRequests).length > 3 && (
                <div className="text-center pt-1 text-blue-600">
                  + еще {(forceReprocess ? requests : newRequests).length - 3}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800 mb-4">
            <AlertCircle className="h-4 w-4 inline-block mr-2" />
            Не найдено необработанных обращений. Включите опцию "Повторная обработка", чтобы обработать существующие запросы.
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Отмена
        </Button>
        <Button 
          onClick={startProcessing}
          disabled={!settings.enabled || !settings.agentId || (newRequests.length === 0 && !forceReprocess)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600"
        >
          <Bot className="h-4 w-4 mr-2" />
          {forceReprocess ? "Повторно обработать" : "Запустить обработку"}
        </Button>
      </DialogFooter>
    </>
  );

  // Эффект для имитации перемещения обращений
  useEffect(() => {
    if (processingStep === 4 && !requestMoved) {
      const timer = setTimeout(() => {
        setRequestMoved(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [processingStep, requestMoved]);

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!isProcessing) {
        onOpenChange(value);
      }
    }}>
      <DialogContent className={`sm:max-w-[${isProcessing ? '550px' : '500px'}]`}>
        {isProcessing ? renderProcessingContent() : renderSettingsContent()}
      </DialogContent>
    </Dialog>
  );
};

export { AutoProcessDialog };
export default AutoProcessDialog;