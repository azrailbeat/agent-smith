import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  id: number;
  name: string;
  type: string;
  description?: string;
  isActive?: boolean;
}

interface AutoProcessingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: Agent[];
  onStartProcessing: (settings: AutoProcessSettings) => void;
}

export interface AutoProcessSettings {
  aiEnabled: boolean;
  selectedAgent: number | null;
  autoClassification: boolean;
  responseGeneration: boolean;
  reprocessAI: boolean;
}

const AutoProcessingDialog: React.FC<AutoProcessingDialogProps> = ({
  open,
  onOpenChange,
  agents,
  onStartProcessing
}) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AutoProcessSettings>({
    aiEnabled: false,
    selectedAgent: null,
    autoClassification: true,
    responseGeneration: false,
    reprocessAI: false
  });

  const handleStartProcessing = () => {
    if (!settings.aiEnabled || !settings.selectedAgent) {
      toast({
        title: "Ошибка",
        description: "Необходимо включить ИИ и выбрать агента",
        variant: "destructive",
      });
      return;
    }
    
    // Вызываем функцию для начала обработки
    onStartProcessing(settings);
    
    toast({
      title: "Автоматическая обработка",
      description: "Запущена автоматическая обработка обращений",
    });
    
    // Закрываем диалог
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Автоматическая обработка обращений</DialogTitle>
          <DialogDescription>
            Настройка параметров автоматической обработки с помощью ИИ
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {/* Переключатель ИИ */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <Label htmlFor="ai-enabled" className="text-base">Использовать ИИ</Label>
              <p className="text-sm text-gray-500">Включить автоматическую обработку с ИИ</p>
            </div>
            <Switch 
              id="ai-enabled" 
              checked={settings.aiEnabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({...prev, aiEnabled: checked}))
              }
            />
          </div>
          
          {/* Выбор агента */}
          <div className="mb-6">
            <Label htmlFor="agent-select" className="text-base mb-1.5 block">Выберите агента для обработки</Label>
            <Select 
              value={settings.selectedAgent?.toString()}
              onValueChange={(value) => 
                setSettings(prev => ({...prev, selectedAgent: parseInt(value)}))
              }
              disabled={!settings.aiEnabled}
            >
              <SelectTrigger id="agent-select" className="w-full">
                <SelectValue placeholder="Выберите агента" />
              </SelectTrigger>
              <SelectContent>
                {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id.toString()}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-base font-medium mb-3">Выберите агента для автоматической обработки обращений</div>
          
          <div className="h-px bg-gray-200 my-5"></div>
          
          <div className="text-base font-medium mb-4">Настройки обработки</div>
          
          {/* Настройки обработки */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-classification" className="text-sm">Автоматическая классификация</Label>
              <Switch 
                id="auto-classification" 
                checked={settings.autoClassification}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({...prev, autoClassification: checked}))
                }
                disabled={!settings.aiEnabled}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="response-generation" className="text-sm">Генерация ответов</Label>
              <Switch 
                id="response-generation" 
                checked={settings.responseGeneration}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({...prev, responseGeneration: checked}))
                }
                disabled={!settings.aiEnabled}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="reprocess-ai" className="text-sm">Повторно обработать обращения с AI-признаком</Label>
              <Switch 
                id="reprocess-ai" 
                checked={settings.reprocessAI}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({...prev, reprocessAI: checked}))
                }
                disabled={!settings.aiEnabled}
              />
            </div>
          </div>
          
          {/* Счетчик обращений для обработки */}
          <div className="mt-5">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              0 обращений для обработки
            </Badge>
          </div>
        </div>
        
        {/* Кнопки действий */}
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            onClick={handleStartProcessing}
            disabled={!settings.aiEnabled || !settings.selectedAgent}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Bot className="mr-2 h-4 w-4" />
            Запустить обработку
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AutoProcessingDialog;