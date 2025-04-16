import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Loader2, 
  Settings, 
  Zap, 
  FileText, 
  Database,
  Brain,
  BarChart2,
  Flame,
  Stethoscope,
  Scale,
  GraduationCap,
  Construction,
  ShoppingBasket,
  Tractor,
  Globe,
  Briefcase,
  Truck,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Agent = {
  id: number;
  name: string;
  type: string;
  description?: string;
  isActive: boolean;
  stats?: Record<string, any>;
  ministryId?: number;
};

type AgentCategory = {
  name: string;
  agents: Agent[];
};

type AgentSelection = {
  [agentId: number]: boolean;
};

interface AgentSelectionDialogProps {
  requestType: string;
  onAgentsSelected?: (selectedAgents: number[]) => void;
  defaultSelectedAgents?: number[];
}

// Иконка по типу агента
const getAgentIcon = (type: string, ministryId?: number) => {
  // По типу
  switch (type) {
    case "citizen_requests":
      return <Bot className="h-5 w-5 text-blue-500" />;
    case "meeting_protocols":
      return <FileText className="h-5 w-5 text-amber-500" />;
    case "translator":
      return <Globe className="h-5 w-5 text-green-500" />;
    case "blockchain":
      return <Database className="h-5 w-5 text-purple-500" />;
    case "knowledge_base":
      return <Brain className="h-5 w-5 text-indigo-500" />;
    case "legal":
      return <Scale className="h-5 w-5 text-red-600" />;
    case "healthcare":
      return <Stethoscope className="h-5 w-5 text-emerald-500" />;
    case "education":
      return <GraduationCap className="h-5 w-5 text-blue-600" />;
    case "energy":
      return <Flame className="h-5 w-5 text-orange-500" />;
    case "construction":
      return <Construction className="h-5 w-5 text-stone-600" />;
    case "trade":
      return <ShoppingBasket className="h-5 w-5 text-violet-500" />;
    case "agriculture":
      return <Tractor className="h-5 w-5 text-green-600" />;
    case "labor":
      return <Briefcase className="h-5 w-5 text-amber-600" />;
    case "transport":
      return <Truck className="h-5 w-5 text-sky-600" />;
    case "internal_affairs":
      return <Shield className="h-5 w-5 text-blue-700" />;
    default:
      return <Bot className="h-5 w-5 text-slate-500" />;
  }
};

// Получаем цвет для бейджа по типу
const getAgentBadgeColor = (type: string): string => {
  switch (type) {
    case "citizen_requests":
      return "bg-blue-100 text-blue-800";
    case "meeting_protocols":
      return "bg-amber-100 text-amber-800";
    case "translator":
      return "bg-green-100 text-green-800";
    case "blockchain":
      return "bg-purple-100 text-purple-800";
    case "legal":
      return "bg-red-100 text-red-800";
    case "healthcare":
      return "bg-emerald-100 text-emerald-800";
    case "education":
      return "bg-blue-100 text-blue-800";
    case "knowledge_base":
      return "bg-indigo-100 text-indigo-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
};

const AgentSelectionDialog: React.FC<AgentSelectionDialogProps> = ({
  requestType,
  onAgentsSelected,
  defaultSelectedAgents = []
}) => {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<AgentSelection>({});
  const { toast } = useToast();

  // Загрузка списка агентов
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      return response.json();
    }
  });

  // Загрузка настроек выбора агентов для обращений
  const { data: requestAgentSettings } = useQuery({
    queryKey: ['request-agent-settings', requestType],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/system/request-agent-settings?type=${requestType}`);
        if (!response.ok) {
          throw new Error('Settings not found');
        }
        return response.json();
      } catch (error) {
        console.warn('No saved agent settings found:', error);
        return { selectedAgents: defaultSelectedAgents };
      }
    },
    initialData: { selectedAgents: defaultSelectedAgents },
    onSuccess: (data) => {
      // Инициализация выбора из загруженных настроек
      const newSelection: AgentSelection = {};
      if (data?.selectedAgents) {
        data.selectedAgents.forEach((id: number) => {
          newSelection[id] = true;
        });
      }
      setSelection(newSelection);
    }
  });

  // Мутация для сохранения настроек
  const saveSettingsMutation = useMutation({
    mutationFn: async (selectedAgentIds: number[]) => {
      const response = await fetch('/api/system/request-agent-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestType,
          selectedAgents: selectedAgentIds
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-agent-settings', requestType] });
      toast({
        title: "Настройки сохранены",
        description: "Конфигурация AI-агентов для обращений обновлена"
      });
    },
    onError: () => {
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить настройки AI-агентов",
        variant: "destructive"
      });
    }
  });

  // Обработка изменения выбора агента
  const handleAgentToggle = (agentId: number) => {
    setSelection(prev => ({
      ...prev,
      [agentId]: !prev[agentId]
    }));
  };

  // Применение выбранных настроек
  const handleApply = () => {
    const selectedAgentIds = Object.entries(selection)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => parseInt(id));
    
    // Сохраняем настройки
    saveSettingsMutation.mutate(selectedAgentIds);
    
    // Вызываем колбэк, если он предоставлен
    if (onAgentsSelected) {
      onAgentsSelected(selectedAgentIds);
    }
    
    setOpen(false);
  };

  // Группируем агентов по категориям
  const groupAgentsByCategory = (agents: Agent[] = []): AgentCategory[] => {
    const crossInstitutional: Agent[] = [];
    const ministrySpecific: Agent[] = [];
    
    agents.forEach(agent => {
      if (agent.ministryId) {
        ministrySpecific.push(agent);
      } else {
        crossInstitutional.push(agent);
      }
    });
    
    return [
      { name: 'Межведомственные агенты', agents: crossInstitutional },
      { name: 'Профильные агенты министерств', agents: ministrySpecific }
    ];
  };

  const agentCategories = groupAgentsByCategory(agents);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex gap-2 items-center">
          <Settings className="h-4 w-4" />
          <span>Настроить AI-агентов</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Выбор AI-агентов для обращений</DialogTitle>
          <DialogDescription>
            Выберите, какие AI-агенты будут использоваться для обработки обращений граждан.
            Рекомендуется включать агентов, соответствующих тематике обращений.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[400px] rounded-md border p-4">
            <div className="space-y-6">
              {agentCategories.map((category, index) => (
                <div key={index} className="space-y-3">
                  <h3 className="font-medium text-lg">{category.name}</h3>
                  <div className="space-y-3">
                    {category.agents.map(agent => (
                      <Card 
                        key={agent.id} 
                        className={selection[agent.id] ? "border-primary" : ""}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={`agent-${agent.id}`}
                                checked={!!selection[agent.id]}
                                onCheckedChange={() => handleAgentToggle(agent.id)}
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  {getAgentIcon(agent.type, agent.ministryId)}
                                  <Label
                                    htmlFor={`agent-${agent.id}`}
                                    className="font-medium text-base cursor-pointer"
                                  >
                                    {agent.name}
                                  </Label>
                                  <Badge className={getAgentBadgeColor(agent.type)}>
                                    {agent.type}
                                  </Badge>
                                </div>
                                <CardDescription className="mt-1">{agent.description}</CardDescription>
                                {agent.stats && (
                                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                    {agent.stats.accuracyRate && (
                                      <div className="flex items-center gap-1">
                                        <Zap className="h-3 w-3" />
                                        <span>Точность: {(agent.stats.accuracyRate * 100).toFixed(0)}%</span>
                                      </div>
                                    )}
                                    {agent.stats.avgResponseTime && (
                                      <div className="flex items-center gap-1">
                                        <BarChart2 className="h-3 w-3" />
                                        <span>Время ответа: {agent.stats.avgResponseTime}с</span>
                                      </div>
                                    )}
                                    {agent.stats.timeReduction && (
                                      <div className="flex items-center gap-1">
                                        <Brain className="h-3 w-3" />
                                        <span>Экономия времени: {agent.stats.timeReduction}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
          <Button 
            onClick={handleApply}
            disabled={saveSettingsMutation.isPending}
          >
            {saveSettingsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Применить'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AgentSelectionDialog;