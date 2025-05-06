import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Bot, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Agent {
  id: number;
  name: string;
  description: string;
  type: string;
  isActive: boolean;
}

interface CitizenRequest {
  id: number;
  fullName: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: Date;
}

interface AutoProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AutoProcessDialog({ open, onOpenChange }: AutoProcessDialogProps) {
  const queryClient = useQueryClient();
  
  // Состояние выбранных запросов и агентов
  const [selectedAgents, setSelectedAgents] = useState<number[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [targetStage, setTargetStage] = useState<string>('auto');
  
  // Загрузка данных агентов
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
    enabled: open,
  });
  
  // Загрузка данных запросов
  const { data: requests = [] } = useQuery<CitizenRequest[]>({
    queryKey: ['/api/citizen-requests'],
    enabled: open,
  });
  
  // Фильтруем только запросы со статусом 'new'
  const newRequests = requests.filter(request => request.status === 'new');
  
  // Мутация для обработки запросов
  const processMutation = useMutation({
    mutationFn: async (data: { requests: number[], agents: number[], targetStage: string }) => {
      return await apiRequest('POST', '/api/citizen-requests/process-batch', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/citizen-requests'] });
      onOpenChange(false);
    },
  });
  
  // Обработка нажатия кнопки "Обработать запросы"
  const handleProcessRequests = () => {
    processMutation.mutate({
      requests: selectedRequests,
      agents: selectedAgents,
      targetStage,
    });
  };
  
  // Сброс выбранных элементов при открытии диалога
  useEffect(() => {
    if (open) {
      setSelectedAgents([]);
      setSelectedRequests([]);
      setTargetStage('auto');
    }
  }, [open]);
  
  // Обработчик выбора всех запросов
  const handleSelectAllRequests = (checked: boolean) => {
    if (checked) {
      setSelectedRequests(newRequests.map(req => req.id));
    } else {
      setSelectedRequests([]);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Автоматическая обработка обращений</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Выберите ИИ-агентов и обращения для автоматической обработки и классификации
          </p>
          
          <div className="space-y-4">
            {/* Выбор ИИ-агентов */}
            <div>
              <h3 className="text-sm font-medium mb-2">Выбрать ИИ-агентов</h3>
              <ScrollArea className="h-[150px] border rounded-md p-2">
                {agents.filter(agent => agent.isActive).map((agent) => (
                  <div key={agent.id} className="flex items-center space-x-2 py-2 px-1 hover:bg-secondary/20 rounded">
                    <Checkbox 
                      id={`agent-${agent.id}`} 
                      checked={selectedAgents.includes(agent.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedAgents(prev => [...prev, agent.id]);
                        } else {
                          setSelectedAgents(prev => prev.filter(id => id !== agent.id));
                        }
                      }}
                    />
                    <div className="flex flex-col">
                      <Label htmlFor={`agent-${agent.id}`} className="font-medium">
                        {agent.name}
                      </Label>
                      <span className="text-xs text-muted-foreground">{agent.description}</span>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
            
            {/* Выбор обращений для обработки */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Выбрать обращения для обработки</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="select-all-requests" 
                    checked={selectedRequests.length === newRequests.length && newRequests.length > 0}
                    onCheckedChange={handleSelectAllRequests}
                  />
                  <Label htmlFor="select-all-requests" className="text-xs">
                    Выбрать все
                  </Label>
                </div>
              </div>
              
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {newRequests.length === 0 ? (
                  <div className="flex justify-center items-center h-full text-sm text-muted-foreground">
                    Нет новых обращений для обработки
                  </div>
                ) : (
                  newRequests.map((request) => (
                    <div key={request.id} className="flex items-center space-x-2 py-2 px-1 hover:bg-secondary/20 rounded">
                      <Checkbox 
                        id={`request-${request.id}`} 
                        checked={selectedRequests.includes(request.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRequests(prev => [...prev, request.id]);
                          } else {
                            setSelectedRequests(prev => prev.filter(id => id !== request.id));
                          }
                        }}
                      />
                      <div className="flex flex-col">
                        <Label htmlFor={`request-${request.id}`} className="font-medium truncate pr-2">
                          {request.subject || 'Без темы'}
                        </Label>
                        <div className="flex items-center text-xs">
                          <span className="text-muted-foreground">{request.fullName}</span>
                          <span className="mx-1">•</span>
                          <span className="text-muted-foreground">
                            {new Date(request.createdAt).toLocaleDateString('ru-RU')}
                          </span>
                          {request.priority && (
                            <Badge variant="outline" className="ml-2 text-xs" style={{
                              backgroundColor: 
                                request.priority === 'high' ? 'rgba(249, 115, 22, 0.1)' :
                                request.priority === 'urgent' ? 'rgba(239, 68, 68, 0.1)' :
                                request.priority === 'medium' ? 'rgba(234, 179, 8, 0.1)' :
                                'rgba(59, 130, 246, 0.1)',
                              color: 
                                request.priority === 'high' ? 'rgb(194, 65, 12)' :
                                request.priority === 'urgent' ? 'rgb(185, 28, 28)' :
                                request.priority === 'medium' ? 'rgb(161, 98, 7)' :
                                'rgb(37, 99, 235)'
                            }}>
                              {request.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </div>
            
            {/* Настройки обработки */}
            <div>
              <h3 className="text-sm font-medium mb-2">Настройки обработки</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="target-stage" className="text-sm block mb-1">Целевой этап</Label>
                  <Select value={targetStage} onValueChange={setTargetStage}>
                    <SelectTrigger id="target-stage">
                      <SelectValue placeholder="Выберите этап" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Автоматически определить</SelectItem>
                      <SelectItem value="processing">В обработке</SelectItem>
                      <SelectItem value="waiting">Ожидание информации</SelectItem>
                      <SelectItem value="completed">Завершено</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button 
            onClick={handleProcessRequests} 
            disabled={selectedAgents.length === 0 || selectedRequests.length === 0 || processMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
          >
            {processMutation.isPending ? 'Обработка...' : (
              <>
                <Bot className="mr-2 h-4 w-4" /> 
                Обработать {selectedRequests.length} {selectedRequests.length === 1 ? 'обращение' : 
                  selectedRequests.length < 5 ? 'обращения' : 'обращений'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
