import React, { useState, useEffect } from "react";
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
import { Check, X, Bot, Loader2, UserCheck, FileText, Brain, Zap } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: number;
  name: string;
  type: string;
  description?: string;
  isActive: boolean;
  ministryId?: number;
}

interface AgentSelectionDialogProps {
  entityType: 'citizen_request' | 'meeting_protocol' | 'document';
  entityId?: number;
  onAgentsSelected?: (agents: number[]) => void;
  selectedAgents?: number[];
  buttonLabel?: string;
  dialogTitle?: string;
  dialogDescription?: string;
}

const AgentSelectionDialog: React.FC<AgentSelectionDialogProps> = ({
  entityType,
  entityId,
  onAgentsSelected,
  selectedAgents = [],
  buttonLabel = "Выбрать агентов",
  dialogTitle = "Выбор AI-агентов",
  dialogDescription = "Выберите AI-агентов для обработки"
}) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>(selectedAgents);
  const { toast } = useToast();

  // Загрузка списка всех агентов
  const { data: agents, isLoading: isAgentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      return response.json();
    }
  });

  // Загрузка сохраненных настроек агентов для типа сущности
  const { data: savedSettings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ['agent-settings', entityType, entityId],
    queryFn: async () => {
      try {
        let url = `/api/system/request-agent-settings?type=${entityType}`;
        if (entityId) {
          url += `&entityId=${entityId}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Agent settings not found');
        }
        return response.json();
      } catch (error) {
        console.warn('No saved agent settings found:', error);
        return null;
      }
    }
  });

  // Сохранение настроек агентов
  const saveSettingsMutation = useMutation({
    mutationFn: async (selectedAgents: number[]) => {
      let url = '/api/system/request-agent-settings';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestType: entityType,
          entityId: entityId || null,
          selectedAgents
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save agent settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-settings', entityType, entityId] });
      toast({
        title: "Настройки сохранены",
        description: "Список выбранных агентов обновлен"
      });
      
      if (onAgentsSelected) {
        onAgentsSelected(selected);
      }
    },
    onError: () => {
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить настройки агентов",
        variant: "destructive"
      });
    }
  });

  // Загрузка сохраненных настроек при открытии диалога
  useEffect(() => {
    if (savedSettings && savedSettings.selectedAgents) {
      setSelected(savedSettings.selectedAgents);
    } else if (selectedAgents.length > 0) {
      setSelected(selectedAgents);
    }
  }, [savedSettings, selectedAgents]);

  // Переключение выбора агента
  const toggleAgent = (agentId: number) => {
    setSelected(prev => 
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  // Выбрать всех агентов
  const selectAll = () => {
    if (agents) {
      const allAgentIds = agents
        .filter((agent: Agent) => agent.isActive)
        .map((agent: Agent) => agent.id);
      setSelected(allAgentIds);
    }
  };

  // Снять выделение со всех
  const deselectAll = () => {
    setSelected([]);
  };

  // Сохранение выбранных агентов
  const handleSave = () => {
    saveSettingsMutation.mutate(selected);
    setOpen(false);
  };

  // Иконка типа агента
  const getAgentIcon = (type: string) => {
    switch (type) {
      case "citizen_requests":
        return <UserCheck className="h-5 w-5 text-blue-600" />;
      case "meeting_protocols":
        return <FileText className="h-5 w-5 text-amber-600" />;
      case "document_processing":
        return <FileText className="h-5 w-5 text-green-600" />;
      case "knowledge_base":
        return <Brain className="h-5 w-5 text-purple-600" />;
      default:
        return <Bot className="h-5 w-5 text-slate-600" />;
    }
  };

  const isLoading = isAgentsLoading || isSettingsLoading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex gap-2 items-center">
          <Bot className="h-4 w-4" />
          <span>{buttonLabel}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Выбрать все
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Снять выделение
              </Button>
            </div>
            
            <Separator className="my-2" />
            
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {agents && agents
                  .filter((agent: Agent) => agent.isActive && (agent.type === 'citizen_requests' || agent.type === 'blockchain'))
                  .map((agent: Agent) => (
                    <Card 
                      key={agent.id} 
                      className={`cursor-pointer transition-all ${selected.includes(agent.id) ? 'border-primary/50 bg-primary/5' : ''}`}
                      onClick={() => toggleAgent(agent.id)}
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={selected.includes(agent.id)}
                            onCheckedChange={() => toggleAgent(agent.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          {getAgentIcon(agent.type)}
                          <div className="flex flex-col">
                            <span className="font-medium">{agent.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {agent.description?.substring(0, 60)}
                              {(agent.description?.length || 0) > 60 ? "..." : ""}
                            </span>
                          </div>
                        </div>
                        <Badge variant={selected.includes(agent.id) ? "default" : "outline"}>
                          {selected.includes(agent.id) ? (
                            <Check className="h-3 w-3 mr-1" />
                          ) : (
                            <X className="h-3 w-3 mr-1" />
                          )}
                          {selected.includes(agent.id) ? "Выбран" : "Не выбран"}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
          <Button 
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending}
          >
            {saveSettingsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AgentSelectionDialog;