import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, ArrowRight, Bot, Hourglass, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Интерфейс агента ИИ
 */
interface Agent {
  id: number;
  name: string;
  type: string;
  description?: string;
}

/**
 * Интерфейс обращения гражданина
 */
interface CitizenRequest {
  id: number;
  fullName: string;
  status: string;
  subject: string;
  createdAt: Date;
  aiProcessed?: boolean;
}

/**
 * Интерфейс шага обработки
 */
interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
}

/**
 * Интерфейс пропсов диалога автоматической обработки
 */
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
  onProcess: (settings: { agentId?: number, autoProcess?: boolean, autoClassify?: boolean, autoRespond?: boolean, forceReprocess?: boolean }) => void;
}

/**
 * Тип для экспорта методов через ref
 */
export interface AutoProcessDialogRef {
  setProcessReport: (report: any) => void;
}

/**
 * Компонент диалога автоматической обработки обращений
 */
const AutoProcessDialog = forwardRef<AutoProcessDialogRef, AutoProcessDialogProps>((props, ref) => {
  const { open, onOpenChange, settings, onSettingsChange, onProcess } = props;
  
  // Состояния процесса обработки
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [processedRequests, setProcessedRequests] = useState<CitizenRequest[]>([]);
  const [requestMoved, setRequestMoved] = useState<boolean>(false);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [requestsToProcess, setRequestsToProcess] = useState<CitizenRequest[]>([]);
  const [processReport, setProcessReport] = useState<any>(null);
  
  // Экспортируем методы через ref
  useImperativeHandle(ref, () => ({
    setProcessReport: (report: any) => {
      setProcessReport(report);
      // Также сбросим анимацию прогресса, когда получен отчет
      if (report) {
        setProgress(100);
        setIsProcessing(false);
      }
    }
  }));
  
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
   * Фильтруем агентов по типу (citizen_requests) и убираем дубликаты по имени
   */
  const citizenRequestAgents = agents
    .filter(agent => agent.type === "citizen_requests")
    // Фильтр для удаления дубликатов - сохраняем только первого агента с уникальным именем
    .reduce<Agent[]>((unique, agent) => {
      const exists = unique.find(a => a.name === agent.name);
      if (!exists) {
        unique.push(agent);
      }
      return unique;
    }, []);
  
  // Получаем список необработанных обращений
  const { data: requests = [] } = useQuery<CitizenRequest[]>({
    queryKey: ["/api/citizen-requests"],
    refetchOnWindowFocus: false,
  });
  
  // Фильтруем только новые обращения
  const newRequests = requests.filter(req => req.status === 'new');

  // Состояние для отслеживания, нужно ли перезапускать уже обработанные запросы
  const [forceReprocess, setForceReprocess] = useState<boolean>(false);
  
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

  // Обработчик для запуска процесса
  const startProcessing = () => {
    if (!settings.enabled || !settings.agentId) {
      alert('Необходимо включить ИИ и выбрать агента');
      return;
    }
    setIsProcessing(true);
    setProcessingStep(0);
    setProgress(0);
    // Сбросим отчет при старте новой обработки
    setProcessReport(null);
    // Имитируем выбор обращений из текущего списка
    setRequestsToProcess(newRequests.slice(0, Math.min(newRequests.length, 5)));
    // Имитируем выбор клиента для демонстрации
    if (newRequests.length > 0) {
      setSelectedClient(newRequests[0].fullName);
    }
    
    // После завершения анимации запускаем реальную обработку
    setTimeout(() => {
      onProcess({
        ...settings, 
        forceReprocess // Добавляем параметр для повторной обработки
      });
    }, 5000);
  };

  // Функция для отображения итогового отчета
  const renderReportContent = () => {
    if (!processReport) return null;
    
    const { summary } = processReport;
    
    return (
      <div className="space-y-4 mt-4 border border-green-100 rounded-lg p-4 bg-green-50">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-medium text-green-800">Отчёт о выполнении</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="bg-white rounded p-2 border border-green-200">
            <p className="text-xs text-gray-600">Всего обращений:</p>
            <p className="text-xl font-bold text-gray-900">{summary.total}</p>
          </div>
          <div className="bg-white rounded p-2 border border-green-200">
            <p className="text-xs text-gray-600">Обработано:</p>
            <p className="text-xl font-bold text-blue-700">{summary.processed}</p>
          </div>
          <div className="bg-white rounded p-2 border border-green-200">
            <p className="text-xs text-gray-600">Успешно:</p>
            <p className="text-xl font-bold text-green-700">{summary.succeeded}</p>
          </div>
          <div className="bg-white rounded p-2 border border-green-200">
            <p className="text-xs text-gray-600">С ошибками:</p>
            <p className="text-xl font-bold text-red-700">{summary.failed}</p>
          </div>
        </div>
        
        <div className="bg-white rounded p-3 border border-green-200 text-sm">
          <p className="font-medium mb-1">Примененные действия:</p>
          <Badge variant="outline" className="mr-1">{summary.actions}</Badge>
        </div>
        
        <div className="bg-white rounded p-3 border border-green-200 text-sm">
          <p className="font-medium mb-1">Использован агент:</p>
          <div className="flex items-center">
            <Bot className="h-4 w-4 mr-2 text-blue-600" />
            <span>{summary.agentName} (ID: {summary.agentId})</span>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 text-right">
          Время завершения: {new Date(summary.timeStamp).toLocaleString()}
        </div>
        
        <div className="flex justify-center mt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Закрыть отчет
          </Button>
        </div>
      </div>
    );
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
      
      {processReport ? renderReportContent() : (
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
                    <p className="mb-1 font-medium">Текущее обращение:</p>
                    <div className="bg-white p-2 rounded flex items-center">
                      <Hourglass className="h-3 w-3 mr-2 text-orange-500" />
                      <span className="flex-1">{selectedClient}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  // Отображение настроек для автоматической обработки
  const renderSettingsContent = () => (
    <>
      <DialogHeader>
        <DialogTitle>Автоматическая обработка обращений</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-6 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-process-switch">Использовать ИИ</Label>
            <div className="text-sm text-muted-foreground">
              Включить автоматическую обработку с ИИ
            </div>
          </div>
          <Switch
            id="auto-process-switch"
            checked={settings.enabled}
            onCheckedChange={(checked) => 
              onSettingsChange({ ...settings, enabled: checked })
            }
          />
        </div>
        
        <div className="space-y-3 pb-2">
          <Label htmlFor="agent-select">Выберите агента для обработки</Label>
          <Select
            disabled={!settings.enabled}
            value={settings.agentId?.toString() || ""}
            onValueChange={(value) => 
              onSettingsChange({ ...settings, agentId: parseInt(value) })
            }
          >
            <SelectTrigger id="agent-select">
              <SelectValue placeholder="Выберите агента" />
            </SelectTrigger>
            <SelectContent>
              {citizenRequestAgents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id.toString()}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {settings.agentId ? 
              agents.find(a => a.id === settings.agentId)?.description || "Агент для обработки обращений граждан" : 
              "Выберите агента для автоматической обработки обращений"}
          </p>
        </div>
        
        <div className="border-t pt-5 space-y-3">
          <h4 className="font-medium">Настройки обработки</h4>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-classify">
              Автоматическая классификация
            </Label>
            <Switch
              id="auto-classify"
              disabled={!settings.enabled}
              checked={settings.autoClassify || false}
              onCheckedChange={(checked) => 
                onSettingsChange({ ...settings, autoClassify: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-respond">
              Генерация ответов
            </Label>
            <Switch
              id="auto-respond"
              disabled={!settings.enabled}
              checked={settings.autoRespond || false}
              onCheckedChange={(checked) => 
                onSettingsChange({ ...settings, autoRespond: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="force-reprocess">
              Повторно обработать обращения с AI-признаком
            </Label>
            <Switch
              id="force-reprocess"
              disabled={!settings.enabled}
              checked={forceReprocess}
              onCheckedChange={setForceReprocess}
            />
          </div>
        </div>
        
        <div className="border-t pt-3">
          <div className="flex items-center space-x-2 text-sm">
            {forceReprocess ? (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                <Trash2 className="mr-1 h-3 w-3" /> Включена повторная обработка
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                {newRequests.length} обращений для обработки
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <DialogFooter>
        <Button 
          variant="outline" 
          onClick={() => onOpenChange(false)}
        >
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
      <DialogContent className="sm:max-w-[500px]">
        {isProcessing ? renderProcessingContent() : renderSettingsContent()}
      </DialogContent>
    </Dialog>
  );
});

// Добавляем displayName для React.forwardRef
AutoProcessDialog.displayName = "AutoProcessDialog";

export { AutoProcessDialog };