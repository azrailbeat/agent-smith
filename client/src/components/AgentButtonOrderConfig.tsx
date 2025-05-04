import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  GripVertical, 
  Loader2, 
  Bot, 
  FileText,
  Globe,
  Database,
  Brain,
  Scale,
  Stethoscope,
  GraduationCap,
  Flame,
  Construction,
  ShoppingBasket,
  Tractor,
  Briefcase,
  Truck,
  Shield,
  Eye,
  EyeOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Agent = {
  id: number;
  name: string;
  type: string;
  description?: string;
  isActive: boolean;
  ministryId?: number;
};

type AgentButtonConfig = {
  agentId: number;
  visible: boolean;
  order: number;
};

interface AgentButtonOrderConfigProps {
  pageType: 'citizen_requests' | 'meeting_protocols' | 'documents';
  defaultConfig?: AgentButtonConfig[];
}

// Иконка по типу агента
const getAgentIcon = (type: string) => {
  switch (type) {
    case "citizen_requests":
      return <Bot className="h-5 w-5 text-blue-500" />;
    case "meeting_protocols":
      return <FileText className="h-5 w-5 text-amber-500" />;
    case "document_processing":
      return <FileText className="h-5 w-5 text-green-600" />;
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

const AgentButtonOrderConfig: React.FC<AgentButtonOrderConfigProps> = ({
  pageType,
  defaultConfig = []
}) => {
  const [open, setOpen] = useState(false);
  const [agentConfigs, setAgentConfigs] = useState<(AgentButtonConfig & { agent?: Agent })[]>([]);
  const { toast } = useToast();

  // Загрузка списка агентов
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

  // Загрузка настроек кнопок
  const { data: savedConfig, isLoading: isConfigLoading } = useQuery({
    queryKey: ['agent-button-config', pageType],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/system/button-config?pageType=${pageType}`);
        if (!response.ok) {
          throw new Error('Button config not found');
        }
        return response.json();
      } catch (error) {
        console.warn('No saved button config found:', error);
        return { buttons: defaultConfig };
      }
    }
  });

  // Мутация для сохранения настроек
  const saveConfigMutation = useMutation({
    mutationFn: async (configs: AgentButtonConfig[]) => {
      const response = await fetch('/api/system/button-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pageType,
          buttons: configs
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save button configuration');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-button-config', pageType] });
      toast({
        title: "Настройки сохранены",
        description: "Порядок и видимость кнопок агентов обновлены"
      });
    },
    onError: () => {
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить настройки кнопок",
        variant: "destructive"
      });
    }
  });

  // Инициализация конфигурации при загрузке данных
  useEffect(() => {
    if (agents && savedConfig) {
      const configMap = new Map<number, AgentButtonConfig>();
      
      // Сначала создаем карту конфигураций из сохраненных настроек
      if (savedConfig.buttons && savedConfig.buttons.length > 0) {
        savedConfig.buttons.forEach((config: AgentButtonConfig) => {
          configMap.set(config.agentId, config);
        });
      }
      
      // Фильтруем агентов только по разрешенным типам
      const allowedAgentTypes = ['citizen_requests', 'blockchain', 'document_processing', 'meeting_protocols'];
      const filteredAgents = agents.filter((agent: Agent) => allowedAgentTypes.includes(agent.type));

      // Создаем полную конфигурацию только для разрешенных агентов
      const fullConfig = filteredAgents.map((agent: Agent, index: number) => {
        const existingConfig = configMap.get(agent.id);
        
        return {
          agentId: agent.id,
          visible: existingConfig ? existingConfig.visible : true,
          order: existingConfig ? existingConfig.order : index,
          agent
        };
      });
      
      // Сортируем по порядку
      fullConfig.sort((a, b) => a.order - b.order);
      
      setAgentConfigs(fullConfig);
    }
  }, [agents, savedConfig]);

  // Обработка перетаскивания
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(agentConfigs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Обновляем порядок
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));
    
    setAgentConfigs(updatedItems);
  };

  // Переключение видимости кнопки
  const toggleVisibility = (agentId: number) => {
    setAgentConfigs(current => 
      current.map(config => 
        config.agentId === agentId 
          ? { ...config, visible: !config.visible } 
          : config
      )
    );
  };

  // Сохранение настроек
  const handleSave = () => {
    const configsToSave = agentConfigs.map(({ agentId, visible, order }) => ({
      agentId,
      visible,
      order
    }));
    
    saveConfigMutation.mutate(configsToSave);
    setOpen(false);
  };

  const isLoading = isAgentsLoading || isConfigLoading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex gap-2 items-center">
          <Settings className="h-4 w-4" />
          <span>Кнопки агентов</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Настройка кнопок агентов</DialogTitle>
          <DialogDescription>
            Настройте порядок и видимость кнопок AI-агентов на странице.
            Перетащите кнопки, чтобы изменить их порядок.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="agent-buttons">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {agentConfigs.map((config, index) => (
                    <Draggable
                      key={config.agentId}
                      draggableId={config.agentId.toString()}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <Card className={!config.visible ? "opacity-60" : ""}>
                            <CardContent className="p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    {config.agent && getAgentIcon(config.agent.type)}
                                    <span className="font-medium">{config.agent?.name}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {config.agent?.description?.substring(0, 40)}
                                    {(config.agent?.description?.length || 0) > 40 ? "..." : ""}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => toggleVisibility(config.agentId)}
                                >
                                  {config.visible ? (
                                    <Eye className="h-4 w-4" />
                                  ) : (
                                    <EyeOff className="h-4 w-4" />
                                  )}
                                </Button>
                                <Badge variant={config.visible ? "default" : "outline"}>
                                  {config.visible ? "Видима" : "Скрыта"}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
          <Button 
            onClick={handleSave}
            disabled={saveConfigMutation.isPending}
          >
            {saveConfigMutation.isPending ? (
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

export default AgentButtonOrderConfig;