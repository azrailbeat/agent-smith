import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  Bot, 
  FileText, 
  Loader2, 
  Brain, 
  Zap, 
  Database,
  Globe,
  Scale,
  Stethoscope, 
  GraduationCap,
  Flame,
  Construction,
  ShoppingBasket,
  Tractor,
  Briefcase,
  Truck,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AgentButtonOrderConfig from "./AgentButtonOrderConfig";
import RAGSourceSelector from "./RAGSourceSelector";
import { ALLOWED_AGENT_TYPES } from "@shared/constants";

interface Agent {
  id: number;
  name: string;
  type: string;
  description?: string;
  isActive: boolean;
  ministryId?: number;
}

type AgentButtonConfig = {
  agentId: number;
  visible: boolean;
  order: number;
};

interface AgentActionButtonsProps {
  pageType: 'citizen_requests' | 'meeting_protocols' | 'documents';
  entityId?: number;
  onAgentAction: (agentId: number, agentName: string, actionType: string) => Promise<void>;
  showSettings?: boolean;
  showRAGSettings?: boolean;
  actionTypes?: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
  }>;
  isProcessing?: boolean;
}

// Иконка агента по типу
const getAgentIcon = (type: string) => {
  switch (type) {
    case "citizen_requests":
      return <Bot className="h-4 w-4" />;
    case "meeting_protocols":
      return <FileText className="h-4 w-4" />;
    case "document_processing":
      return <FileText className="h-4 w-4" />;
    case "translator":
      return <Globe className="h-4 w-4" />;
    case "blockchain":
      return <Database className="h-4 w-4" />;
    case "knowledge_base":
      return <Brain className="h-4 w-4" />;
    case "legal":
      return <Scale className="h-4 w-4" />;
    case "healthcare":
      return <Stethoscope className="h-4 w-4" />;
    case "education":
      return <GraduationCap className="h-4 w-4" />;
    case "energy":
      return <Flame className="h-4 w-4" />;
    case "construction":
      return <Construction className="h-4 w-4" />;
    case "trade":
      return <ShoppingBasket className="h-4 w-4" />;
    case "agriculture":
      return <Tractor className="h-4 w-4" />;
    case "labor":
      return <Briefcase className="h-4 w-4" />;
    case "transport":
      return <Truck className="h-4 w-4" />;
    case "internal_affairs":
      return <Shield className="h-4 w-4" />;
    default:
      return <Bot className="h-4 w-4" />;
  }
};

// Цвет кнопки агента
const getAgentButtonVariant = (type: string): "default" | "outline" | "secondary" | "destructive" | "ghost" => {
  switch (type) {
    case "citizen_requests":
      return "default";
    case "meeting_protocols":
      return "secondary";
    case "document_processing":
      return "secondary";
    case "knowledge_base":
      return "outline";
    case "legal":
      return "destructive";
    default:
      return "outline";
  }
};

const AgentActionButtons: React.FC<AgentActionButtonsProps> = ({
  pageType,
  entityId,
  onAgentAction,
  showSettings = true,
  showRAGSettings = true,
  actionTypes = [{ id: "process", label: "Обработать", icon: <Zap className="h-4 w-4 mr-2" /> }],
  isProcessing = false
}) => {
  const [agentButtons, setAgentButtons] = useState<Array<Agent & { visible: boolean, order: number }>>([]);
  const { toast } = useToast();

  // Загрузка списка агентов
  const { data: allAgents = [], isLoading: isAgentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      return response.json();
    }
  });
  
  // Фильтруем только по разрешенным типам агентов
  const agents = allAgents.filter(agent => {
    // Проверяем, что агент активен и принадлежит к разрешенному типу
    return agent.isActive && ALLOWED_AGENT_TYPES.includes(agent.type);
  });

  // Загрузка настроек кнопок
  const { data: buttonConfig, isLoading: isConfigLoading } = useQuery({
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
        return { buttons: [] };
      }
    }
  });

  // Обработка нажатия кнопки агента
  const handleAgentAction = async (agent: Agent, actionType: string) => {
    try {
      // Проверяем, может ли агент выполнить это действие
      const canPerformAction = (
        // Анализ обращений для классификации и резюме
        (actionType === "classify" || actionType === "summarize") && 
        (agent.type === "citizen_requests" || agent.name === "Анализ обращений") ||
        
        // Генерация ответа для DocumentAI
        (actionType === "respond") && 
        (agent.type === "document_processing" || agent.name === "DocumentAI") ||
        
        // Блокчейн запись
        (actionType === "blockchain" || actionType === "record") && 
        (agent.type === "blockchain" || agent.name === "Блокчейн-агент") ||
        
        // Полная обработка для всех агентов
        (actionType === "full")
      );
      
      if (!canPerformAction) {
        toast({
          title: "Несовместимое действие",
          description: `Агент "${agent.name}" не может выполнить действие "${actionType}". Пожалуйста, выберите подходящего агента для этого действия.`,
          variant: "destructive"
        });
        return;
      }
      
      await onAgentAction(agent.id, agent.name, actionType);
    } catch (error) {
      console.error('Error performing agent action:', error);
      toast({
        title: "Ошибка",
        description: `Не удалось выполнить действие "${actionType}" для агента ${agent.name}`,
        variant: "destructive"
      });
    }
  };

  // Объединение агентов и настроек кнопок
  useEffect(() => {
    if (agents && buttonConfig) {
      const configMap = new Map<number, AgentButtonConfig>();
      
      // Создаем карту конфигураций, если они есть
      if (buttonConfig.buttons && buttonConfig.buttons.length > 0) {
        buttonConfig.buttons.forEach((config: AgentButtonConfig) => {
          configMap.set(config.agentId, config);
        });
      }
      
      // Создаем список кнопок с настройками
      const buttons = agents
        .filter((agent: Agent) => agent.isActive)
        .map((agent: Agent) => {
          const config = configMap.get(agent.id);
          return {
            ...agent,
            visible: config ? config.visible : true,
            order: config ? config.order : 0
          };
        })
        .sort((a, b) => a.order - b.order);
      
      setAgentButtons(buttons);
    }
  }, [agents, buttonConfig]);

  const isLoading = isAgentsLoading || isConfigLoading;

  return (
    <div className="space-y-2">
      {showSettings && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <AgentButtonOrderConfig pageType={pageType} />
          {showRAGSettings && <RAGSourceSelector isGlobal={true} />}
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {agentButtons
            .filter(agent => agent.visible)
            .map(agent => (
              <div key={agent.id} className="relative">
                {actionTypes.length === 1 ? (
                  <Button
                    size="sm"
                    variant={getAgentButtonVariant(agent.type)}
                    onClick={() => handleAgentAction(agent, actionTypes[0].id)}
                    disabled={isProcessing}
                    className="flex gap-2 items-center"
                  >
                    {getAgentIcon(agent.type)}
                    <span>{agent.name}</span>
                    {actionTypes[0].icon}
                  </Button>
                ) : (
                  <div className="flex">
                    {actionTypes.map(action => (
                      <Button
                        key={`${agent.id}-${action.id}`}
                        size="sm"
                        variant={getAgentButtonVariant(agent.type)}
                        onClick={() => handleAgentAction(agent, action.id)}
                        disabled={isProcessing}
                        className="flex gap-1 items-center mx-1"
                      >
                        {getAgentIcon(agent.type)}
                        <span>{agent.name}</span>
                        {action.icon}
                        <span>{action.label}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          
          {agentButtons.filter(agent => agent.visible).length === 0 && (
            <div className="text-sm text-muted-foreground p-2">
              Нет активных AI-агентов для отображения. Используйте настройки для включения агентов.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentActionButtons;