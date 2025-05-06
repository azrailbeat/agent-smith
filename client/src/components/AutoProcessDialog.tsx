import React from 'react';
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
import { Bot, AlertCircle } from 'lucide-react';

interface Agent {
  id: number;
  name: string;
  type: string;
  description?: string;
}

interface AutoProcessDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  settings: {
    enabled: boolean;
    agentId?: number;
    autoProcess?: boolean;
    autoClassify?: boolean;
    autoRespond?: boolean;
  };
  onSettingsChange: (settings: any) => void;
  onProcess: (settings: any) => void;
}

const AutoProcessDialog: React.FC<AutoProcessDialogProps> = ({
  isOpen,
  onOpenChange,
  settings,
  onSettingsChange,
  onProcess,
}) => {
  // Загрузка списка агентов
  const { data: agents = [], isLoading: isAgentsLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    refetchOnWindowFocus: false,
  });

  // Фильтруем агентов по типу (citizen_requests)
  const citizenRequestAgents = agents.filter(agent => 
    agent.type === "citizen_requests" && agent.id !== 174 && agent.id !== 202
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800 mb-4">
          <AlertCircle className="h-4 w-4 inline-block mr-2" />
          Автоматическая обработка будет применена ко всем необработанным обращениям. Этот процесс может занять некоторое время.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={() => {
              if (!settings.enabled || !settings.agentId) {
                alert('Необходимо включить ИИ и выбрать агента');
                return;
              }
              onProcess(settings);
              onOpenChange(false);
            }}
            disabled={!settings.enabled || !settings.agentId}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            <Bot className="h-4 w-4 mr-2" />
            Запустить обработку
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AutoProcessDialog;