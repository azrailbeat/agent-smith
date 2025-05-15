import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Bot, Info } from 'lucide-react';

interface Agent {
  id: number;
  name: string;
  type: string;
  description: string;
  isActive: boolean;
}

interface Position {
  id: number;
  name: string;
  departmentId: number;
  level: number;
}

interface AssignAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  positionId: number;
  positionName: string;
  departmentName: string;
  currentAgentId?: number | null;
}

const AssignAgentDialog: React.FC<AssignAgentDialogProps> = ({
  isOpen,
  onClose,
  positionId,
  positionName,
  departmentName,
  currentAgentId
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(currentAgentId || null);

  // Загрузка списка агентов
  const { data: agents = [], isLoading: isLoadingAgents } = useQuery({
    queryKey: ['/api/agents'],
    enabled: isOpen,
  });

  // Мутация для назначения агента на должность
  const assignAgentMutation = useMutation({
    mutationFn: async ({ positionId, agentId }: { positionId: number, agentId: number | null }) => {
      return apiRequest('PATCH', `/api/positions/${positionId}`, {
        agentId: agentId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
      toast({
        title: 'Агент назначен',
        description: 'ИИ агент успешно назначен на должность',
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Ошибка при назначении',
        description: 'Не удалось назначить агента на должность. Пожалуйста, попробуйте снова.',
        variant: 'destructive',
      });
      console.error('Error assigning agent:', error);
    },
  });

  // Обработчик назначения агента
  const handleAssignAgent = () => {
    assignAgentMutation.mutate({ positionId, agentId: selectedAgentId });
  };

  // При открытии диалога установим текущего агента, если он есть
  useEffect(() => {
    if (isOpen && currentAgentId) {
      setSelectedAgentId(currentAgentId);
    }
  }, [isOpen, currentAgentId]);

  // Получение выбранного агента
  const selectedAgent = agents.find((agent: Agent) => agent.id === selectedAgentId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Назначение ИИ агента на должность</DialogTitle>
          <DialogDescription>
            Выберите ИИ агента для должности "{positionName}" в отделе "{departmentName}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="agent">ИИ агент</Label>
            <Select
              value={selectedAgentId?.toString() || ''}
              onValueChange={(value) => setSelectedAgentId(value ? parseInt(value) : null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите ИИ агента" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Нет агента (человек)</SelectItem>
                {agents.map((agent: Agent) => (
                  <SelectItem key={agent.id} value={agent.id.toString()}>
                    {agent.name} ({agent.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAgent && (
            <div className="bg-muted/40 p-3 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-5 w-5 text-primary" />
                <h4 className="font-medium">{selectedAgent.name}</h4>
                <Badge variant="outline" className="ml-auto">
                  {selectedAgent.type}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedAgent.description}
              </p>
            </div>
          )}

          <div className="bg-blue-50 p-3 rounded-md flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>Назначение ИИ агента на должность позволит автоматизировать выполнение задач, соответствующих этой должности в организационной структуре.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button 
            onClick={handleAssignAgent}
            disabled={assignAgentMutation.isPending}
          >
            {assignAgentMutation.isPending ? 'Назначение...' : 'Назначить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignAgentDialog;