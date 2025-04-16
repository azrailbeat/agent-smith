import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { queryClient } from "@/lib/queryClient";

// Определение типа для параметров URL
type AIAgentParams = {
  id?: string;
};
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Brain, 
  Server, 
  RefreshCw, 
  Plus, 
  Edit, 
  CheckCircle, 
  XCircle, 
  Play,
  BookOpen,
  MessageSquare,
  FileStack,
  LayoutDashboard,
  FileCheck,
  Zap,
  FlaskConical,
  RotateCw,
  SearchCode,
  UserCog
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Типы данных
type Ministry = {
  id: number;
  name: string;
  shortName?: string;
  description?: string;
  icon?: string;
};

type AgentType = {
  id: number;
  name: string;
  category: string;
  description?: string;
  icon?: string;
};

type Agent = {
  id: number;
  name: string;
  type: string;
  description?: string;
  ministryId?: number;
  ministry?: Ministry;
  typeId?: number;
  agentType?: AgentType;
  modelId: number;
  isActive: boolean;
  systemPrompt: string;
  config: any;
  stats?: any;
  tasks?: Task[];
  totalTasks?: number;
  completedTasks?: number;
};

type Integration = {
  id: number;
  name: string;
  type: string;
  apiUrl: string;
  apiKey?: string;
  isActive: boolean;
  config: any;
};

type Task = {
  id: number;
  title: string;
  description: string;
  status: string;
  assignedTo?: number;
  agentId?: number;
};

const AIAgentsPage = () => {
  const { toast } = useToast();
  const params = useParams<AIAgentParams>();
  const agentId = params && params.id ? parseInt(params.id) : null;
  
  // Состояния для диалогов
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [viewingAgent, setViewingAgent] = useState<Agent | null>(null);
  const [assigningTask, setAssigningTask] = useState<Task | null>(null);
  const [editingSystemPrompt, setEditingSystemPrompt] = useState<string>("");
  
  // Демо данные для министерств
  const demoMinistries: Ministry[] = [
    {
      id: 1,
      name: "Министерство юстиции",
      shortName: "Минюст",
      description: "Министерство юстиции Республики Казахстан",
      icon: "⚖️"
    },
    {
      id: 2,
      name: "Министерство образования и науки",
      shortName: "МОН",
      description: "Министерство образования и науки Республики Казахстан",
      icon: "📚"
    },
    {
      id: 3,
      name: "Министерство труда и социальной защиты",
      shortName: "Минтруд",
      description: "Министерство труда и социальной защиты населения Республики Казахстан",
      icon: "🧑‍🦽"
    },
    {
      id: 4,
      name: "Министерство транспорта",
      shortName: "Минтранс",
      description: "Министерство транспорта и коммуникаций Республики Казахстан",
      icon: "🚆"
    },
    {
      id: 5,
      name: "Министерство внутренних дел",
      shortName: "МВД",
      description: "Министерство внутренних дел Республики Казахстан",
      icon: "🚓"
    },
    {
      id: 6,
      name: "Министерство энергетики",
      shortName: "Минэнерго",
      description: "Министерство энергетики Республики Казахстан",
      icon: "🛢"
    },
    {
      id: 7,
      name: "Министерство промышленности и строительства",
      shortName: "МинПром",
      description: "Министерство промышленности и строительства Республики Казахстан",
      icon: "🏗"
    },
    {
      id: 8,
      name: "Министерство торговли и интеграции",
      shortName: "МинТорг",
      description: "Министерство торговли и интеграции Республики Казахстан",
      icon: "🛍"
    },
    {
      id: 9,
      name: "Министерство сельского хозяйства",
      shortName: "Минсельхоз",
      description: "Министерство сельского хозяйства Республики Казахстан",
      icon: "🌾"
    },
    {
      id: 10,
      name: "Министерство иностранных дел",
      shortName: "МИД",
      description: "Министерство иностранных дел Республики Казахстан",
      icon: "🌐"
    },
    {
      id: 11,
      name: "Министерство здравоохранения",
      shortName: "Минздрав",
      description: "Министерство здравоохранения Республики Казахстан",
      icon: "🏥"
    }
  ];

  // Демо данные для типов агентов
  const demoAgentTypes: AgentType[] = [
    {
      id: 1,
      name: "Консультант по правовым вопросам",
      category: "legal_consultant",
      description: "Обработка обращений граждан по правовым вопросам"
    },
    {
      id: 2,
      name: "ИИ в законотворчестве",
      category: "legislation_assistant",
      description: "Анализ нормативно-правовых актов и выявление ошибок"
    },
    {
      id: 3,
      name: "Консультант по ЕНТ",
      category: "education_consultant",
      description: "Консультация по вопросам поступления и ЕНТ"
    },
    {
      id: 4,
      name: "Ассистент по казахской грамматике",
      category: "language_assistant",
      description: "Проверка текстов на казахском языке"
    },
    {
      id: 5,
      name: "Определение инвалидности",
      category: "disability_verification",
      description: "Автоматическое определение инвалидности по документам"
    },
    {
      id: 6,
      name: "Управление трудовыми ресурсами",
      category: "hr_management",
      description: "Прогноз кадровых потребностей и анализ рынка труда"
    },
    {
      id: 7,
      name: "Транспортный консультант",
      category: "transport_consultant",
      description: "Консультации по вопросам транспорта и перевозок"
    },
    {
      id: 8,
      name: "ЖД-анализ (Pangu)",
      category: "railway_analysis",
      description: "Анализ состояния железнодорожной инфраструктуры"
    },
    {
      id: 9,
      name: "Видеомониторинг",
      category: "video_monitoring",
      description: "Распознавание лиц и обнаружение нарушений"
    },
    {
      id: 10,
      name: "Приложение 'Қорғау'",
      category: "traffic_rules",
      description: "Выявление нарушений ПДД"
    }
  ];  
  
  // Демо данные для агентов
  const demoAgents: Agent[] = [
    {
      id: 1,
      name: "Консультант по правовым вопросам",
      type: "legal_consultant",
      ministryId: 1,
      typeId: 1,
      description: "Обработка обращений граждан по правовым вопросам (~100 тыс. обращений граждан)",
      modelId: 1,
      isActive: true,
      systemPrompt: "Вы - помощник для классификации обращений граждан. Ваша задача - определить тип обращения, уровень приоритета и предложить решение.",
      config: { temperature: 0.3, max_tokens: 1000 },
      stats: { 
        processedRequests: 100000, 
        avgResponseTime: "4.3 часа",
        satisfactionRate: 92
      },
      totalTasks: 127,
      completedTasks: 119
    },
    {
      id: 2,
      name: "ИИ в законотворчестве",
      type: "legislation_assistant",
      ministryId: 1,
      typeId: 2,
      description: "Анализ нормативно-правовых актов и выявление ошибок (6 тыс. документов)",
      modelId: 1,
      isActive: true,
      systemPrompt: "Вы - эксперт по юридическому анализу. Ваша задача - анализировать нормативно-правовые акты, выявлять противоречия и предлагать улучшения.",
      config: { temperature: 0.2, max_tokens: 2000 },
      stats: { 
        processedDocuments: 6000, 
        errorsFound: 347,
        timeReduction: "87%"
      },
      totalTasks: 52,
      completedTasks: 48
    },
    {
      id: 3,
      name: "Консультант по ЕНТ",
      type: "education_consultant",
      ministryId: 2,
      typeId: 3,
      description: "Консультация абитуриентов по вопросам ЕНТ и правилам поступления (~50 тыс. запросов)",
      modelId: 1,
      isActive: true,
      systemPrompt: "Вы - консультант по вопросам ЕНТ и поступления в вузы Казахстана. Ваша задача - предоставлять точную информацию о правилах, требованиях и процедурах.",
      config: { temperature: 0.1, max_tokens: 1500 },
      stats: { 
        consultationsProvided: 49876, 
        satisfactionRate: 94,
        responseTime: "2.1 мин"
      },
      totalTasks: 208,
      completedTasks: 195
    },
    {
      id: 4,
      name: "Ассистент по казахской грамматике",
      type: "language_assistant",
      ministryId: 2,
      typeId: 4,
      description: "Проверка и коррекция текстов на казахском языке",
      modelId: 1,
      isActive: true,
      systemPrompt: "Вы - эксперт по казахскому языку. Ваша задача - проверять грамматику, орфографию и стилистику текстов на казахском языке, предлагать исправления.",
      config: { temperature: 0.3, max_tokens: 1000 },
      stats: { 
        textsAnalyzed: 25000, 
        averageErrors: 12.7,
        satisfactionRate: 91
      },
      totalTasks: 77,
      completedTasks: 74
    },
    {
      id: 5,
      name: "Определение инвалидности",
      type: "disability_verification",
      ministryId: 3,
      typeId: 5,
      description: "Автоматическое определение инвалидности по документам (~80тыс. проверено)",
      modelId: 1,
      isActive: true,
      systemPrompt: "Вы - специалист по медицинской экспертизе. Ваша задача - анализировать медицинские документы и определять группу инвалидности в соответствии с законодательством.",
      config: { temperature: 0.1, max_tokens: 1000 },
      stats: { 
        documentsProcessed: 79542, 
        processingTime: "10 мин",
        accuracyRate: 97.5
      },
      totalTasks: 304,
      completedTasks: 304
    },
    {
      id: 6,
      name: "Управление трудовыми ресурсами",
      type: "hr_management",
      ministryId: 3,
      typeId: 6,
      description: "Прогноз кадровых потребностей и анализ рынка труда",
      modelId: 3,
      isActive: true,
      systemPrompt: "Вы - аналитик рынка труда. Ваша задача - анализировать данные о занятости, вакансиях, образовании и предсказывать будущие потребности в кадрах.",
      config: { temperature: 0.2, max_tokens: 2000 },
      stats: { 
        reportsGenerated: 124, 
        predictionAccuracy: 86,
        regionsAnalyzed: 17
      },
      totalTasks: 45,
      completedTasks: 42
    },
    {
      id: 7,
      name: "Транспортный консультант",
      type: "transport_consultant",
      ministryId: 4,
      typeId: 7,
      description: "Консультации по вопросам транспорта и грузоперевозок",
      modelId: 1,
      isActive: true,
      systemPrompt: "Вы - эксперт по транспортной логистике. Ваша задача - консультировать по вопросам перевозок, оптимальных маршрутов и требований к документации.",
      config: { temperature: 0.2, max_tokens: 1500 },
      stats: { 
        queriesHandled: 15420, 
        averageResponseTime: "3.4 мин",
        costReduction: "24%"
      },
      totalTasks: 56,
      completedTasks: 51
    },
    {
      id: 8,
      name: "ЖД-анализ (Pangu)",
      type: "railway_analysis",
      ministryId: 4,
      typeId: 8,
      description: "Анализ состояния ЖД инфраструктуры (16 тыс. км)",
      modelId: 2,
      isActive: true,
      systemPrompt: "Вы - специалист по железнодорожной инфраструктуре. Ваша задача - анализировать данные о состоянии путей, предсказывать возможные проблемы и планировать ремонты.",
      config: { temperature: 0.1, max_tokens: 2000 },
      stats: { 
        trackAnalyzed: 16000, 
        issuesPredicted: 427,
        maintenanceSavings: "34.7%"
      },
      totalTasks: 78,
      completedTasks: 76
    },
    {
      id: 9,
      name: "Видеомониторинг",
      type: "video_monitoring",
      ministryId: 5,
      typeId: 9,
      description: "Распознавание лиц и обнаружение нарушений (система 'Сергек')",
      modelId: 2,
      isActive: true,
      systemPrompt: "Вы - система компьютерного зрения. Ваша задача - анализировать видеопоток с камер наблюдения, распознавать лица и обнаруживать подозрительное поведение.",
      config: { temperature: 0.1, max_tokens: 1000 },
      stats: { 
        camerasConnected: 4578, 
        eventsDetected: 62451,
        responseTime: "1.2 сек"
      },
      totalTasks: 104,
      completedTasks: 102
    },
    {
      id: 10,
      name: "Приложение 'Қорғау'",
      type: "traffic_rules",
      ministryId: 5,
      typeId: 10,
      description: "Выявление нарушений ПДД по фото и видео",
      modelId: 2,
      isActive: true,
      systemPrompt: "Вы - эксперт по правилам дорожного движения. Ваша задача - анализировать фото и видео для выявления нарушений ПДД и определения штрафных санкций.",
      config: { temperature: 0.2, max_tokens: 1500 },
      stats: { 
        violationsDetected: 214792, 
        processingTime: "4.7 сек",
        accuracyRate: 98.2
      },
      totalTasks: 352,
      completedTasks: 349
    }
  ];
  
  // Демо данные для моделей (интеграций)
  const demoIntegrations: Integration[] = [
    { id: 1, name: "GPT-4o", type: "openai", apiUrl: "https://api.openai.com", isActive: true, config: { model: "gpt-4o" } },
    { id: 2, name: "Local Whisper", type: "vllm", apiUrl: "http://localhost:8000", isActive: true, config: { model: "whisper-large-v3" } },
    { id: 3, name: "Task LLM", type: "ollama", apiUrl: "http://localhost:11434", isActive: true, config: { model: "llama3:8b" } },
    { id: 4, name: "Moralis Blockchain API", type: "moralis", apiUrl: "https://deep-index.moralis.io/api/v2", isActive: true, config: { chain: "besu" } }
  ];
  
  // Демо задачи
  const demoTasks: Task[] = [
    { id: 1, title: "Классификация обращения №2023-56789", description: "Требуется проанализировать и классифицировать обращение гражданина", status: "in_progress", agentId: 1 },
    { id: 2, title: "Транскрибация совещания от 20.04.2025", description: "Необходимо произвести транскрибацию аудиозаписи совещания и выделить ключевые решения", status: "pending", agentId: 2 },
    { id: 3, title: "Анализ договора №ДГВ-45/2025", description: "Требуется проанализировать договор и выделить ключевые условия и риски", status: "completed", agentId: 3 },
    { id: 4, title: "Распределение задач по отделу разработки", description: "Необходимо распределить 15 задач среди 5 разработчиков с учетом их компетенций", status: "pending", agentId: 4 },
    { id: 5, title: "Ежедневный отчет о блокчейн-транзакциях", description: "Сформировать отчет о транзакциях в блокчейне за 22.04.2025", status: "completed", agentId: 5 }
  ];
  
  // Запросы к API
  const { data: agents = demoAgents, isLoading: isAgentsLoading } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
    enabled: false, // Отключаем, пока не реализовано API
  });
  
  const { data: integrations = demoIntegrations, isLoading: isIntegrationsLoading } = useQuery<Integration[]>({
    queryKey: ['/api/integrations'],
    enabled: false,
  });
  
  const { data: tasks = demoTasks, isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    enabled: false,
  });
  
  // Мутации для сохранения данных
  const saveAgentMutation = useMutation({
    mutationFn: (agent: Agent) => {
      if (agent.id) {
        return apiRequest('PATCH', `/api/agents/${agent.id}`, agent);
      } else {
        return apiRequest('POST', '/api/agents', agent);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      setShowAgentDialog(false);
      setEditingAgent(null);
      toast({
        title: "Успешно!",
        description: "Агент сохранен",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить агента",
        variant: "destructive",
      });
    }
  });
  
  const updateAgentStatusMutation = useMutation({
    mutationFn: (data: {id: number, isActive: boolean}) => {
      return apiRequest('PATCH', `/api/agents/${data.id}/status`, { isActive: data.isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      toast({
        title: "Успешно!",
        description: "Статус агента обновлен",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус агента",
        variant: "destructive",
      });
    }
  });
  
  const updateSystemPromptMutation = useMutation({
    mutationFn: (data: {id: number, systemPrompt: string}) => {
      return apiRequest('PATCH', `/api/agents/${data.id}/prompt`, { systemPrompt: data.systemPrompt });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      setShowPromptDialog(false);
      toast({
        title: "Успешно!",
        description: "Системный промпт обновлен",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить системный промпт",
        variant: "destructive",
      });
    }
  });
  
  const assignTaskMutation = useMutation({
    mutationFn: (data: {taskId: number, agentId: number}) => {
      return apiRequest('PATCH', `/api/tasks/${data.taskId}/assign`, { agentId: data.agentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      setShowTaskDialog(false);
      setAssigningTask(null);
      toast({
        title: "Успешно!",
        description: "Задача назначена агенту",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось назначить задачу",
        variant: "destructive",
      });
    }
  });
  
  // Обработчики действий
  const handleAddAgent = () => {
    setEditingAgent({
      id: 0,
      name: "",
      type: "citizen_requests",
      description: "",
      modelId: integrations[0]?.id || 0,
      isActive: true,
      systemPrompt: "",
      config: { temperature: 0.3, max_tokens: 1000 }
    });
    setShowAgentDialog(true);
  };
  
  const handleEditAgent = (agent: Agent) => {
    setEditingAgent({...agent});
    setShowAgentDialog(true);
  };
  
  const handleToggleAgentStatus = (agent: Agent) => {
    updateAgentStatusMutation.mutate({
      id: agent.id,
      isActive: !agent.isActive
    });
  };
  
  const handleViewAgent = (agent: Agent) => {
    setViewingAgent(agent);
    
    // Переходим к деталям агента
    window.location.href = `/ai-agents/${agent.id}`;
  };
  
  const handleEditSystemPrompt = (agent: Agent) => {
    setEditingSystemPrompt(agent.systemPrompt);
    setEditingAgent(agent);
    setShowPromptDialog(true);
  };
  
  const handleAssignTask = (task: Task) => {
    setAssigningTask(task);
    setShowTaskDialog(true);
  };
  
  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case "citizen_requests":
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case "meetings":
        return <BookOpen className="h-5 w-5 text-purple-500" />;
      case "documents":
        return <FileStack className="h-5 w-5 text-amber-500" />;
      case "task_management":
        return <LayoutDashboard className="h-5 w-5 text-green-500" />;
      case "blockchain":
        return <FileCheck className="h-5 w-5 text-red-500" />;
      default:
        return <Bot className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getAgentTypeLabel = (type: string) => {
    switch (type) {
      case "citizen_requests":
        return "Обращения граждан";
      case "meetings":
        return "Протоколы совещаний";
      case "documents":
        return "Документы";
      case "task_management":
        return "Управление задачами";
      case "blockchain":
        return "Блокчейн";
      default:
        return "Общий";
    }
  };
  
  const getModelTypeIcon = (type: string) => {
    switch (type) {
      case "openai":
        return <Zap className="h-5 w-5 text-green-500" />;
      case "vllm":
        return <FlaskConical className="h-5 w-5 text-blue-500" />;
      case "ollama":
        return <SearchCode className="h-5 w-5 text-orange-500" />;
      case "moralis":
        return <Server className="h-5 w-5 text-purple-500" />;
      default:
        return <Brain className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getAgentTypeColor = (type: string): string => {
    switch (type) {
      case "citizen_requests":
        return "#3b82f6"; // blue-500
      case "meetings":
        return "#8b5cf6"; // purple-500
      case "documents":
        return "#f59e0b"; // amber-500
      case "task_management":
        return "#10b981"; // green-500
      case "blockchain":
        return "#ef4444"; // red-500
      default:
        return "#6b7280"; // gray-500
    }
  };
  
  return (
    <>
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">ИИ-агенты</h1>
            <p className="mt-2 text-sm text-neutral-700">
              Управление искусственными интеллектуальными агентами для автоматизации процессов
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button onClick={handleAddAgent}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить агента
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active" className="flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Активные
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center">
            <Bot className="h-4 w-4 mr-2" />
            Все агенты
          </TabsTrigger>
          <TabsTrigger value="ministry" className="flex items-center">
            <FileStack className="h-4 w-4 mr-2" />
            По министерствам
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center">
            <FileCheck className="h-4 w-4 mr-2" />
            Задачи агентов
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          {isAgentsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-neutral-100 rounded-lg"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents
                .filter(agent => agent.isActive)
                .map(agent => {
                  const integration = integrations.find(i => i.id === agent.modelId);
                  const agentTasks = tasks.filter(t => t.agentId === agent.id);
                  const completedTasksCount = agentTasks.filter(t => t.status === "completed").length;
                  const progress = agentTasks.length > 0 ? Math.round((completedTasksCount / agentTasks.length) * 100) : 100;
                  
                  return (
                    <Card key={agent.id} className="overflow-hidden border-t-4" style={{ borderTopColor: getAgentTypeColor(agent.type) }}>
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center">
                            {getAgentTypeIcon(agent.type)}
                            <CardTitle className="ml-2 text-lg">
                              {agent.name}
                            </CardTitle>
                          </div>
                          <Badge className={agent.isActive ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-800"}>
                            {agent.isActive ? "Активен" : "Отключен"}
                          </Badge>
                        </div>
                        <CardDescription className="mt-1">
                          {agent.description || `Агент для работы с ${getAgentTypeLabel(agent.type).toLowerCase()}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-500 flex items-center">
                              <Brain className="h-4 w-4 mr-1" />
                              Модель:
                            </span>
                            <span className="font-medium flex items-center">
                              {integration && getModelTypeIcon(integration.type)}
                              <span className="ml-1">{integration?.name || "Неизвестная модель"}</span>
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-500 flex items-center">
                              <FileCheck className="h-4 w-4 mr-1" />
                              Задачи:
                            </span>
                            <span className="font-medium">{agent.completedTasks || completedTasksCount}/{agent.totalTasks || agentTasks.length}</span>
                          </div>
                          
                          <div className="w-full bg-neutral-100 rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between border-t pt-4 bg-neutral-50">
                        <Button variant="outline" size="sm" onClick={() => handleViewAgent(agent)}>
                          Подробнее
                        </Button>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditSystemPrompt(agent)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleToggleAgentStatus(agent)}>
                            {agent.isActive ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  );
                })}
                
              {agents.filter(agent => agent.isActive).length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center p-8 bg-neutral-50 rounded-lg border border-dashed text-center">
                  <Bot className="h-12 w-12 text-neutral-300 mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">Нет активных агентов</h3>
                  <p className="text-neutral-500 max-w-md mb-6">
                    Активируйте существующих агентов или создайте новых, чтобы автоматизировать рабочие процессы.
                  </p>
                  <Button onClick={handleAddAgent}>
                    <Plus className="h-4 w-4 mr-2" />
                    Создать агента
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="all">
          <div className="space-y-4">
            {isAgentsLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-32 bg-neutral-100 rounded-lg"></div>
                ))}
              </div>
            ) : (
              agents.map(agent => {
                const integration = integrations.find(i => i.id === agent.modelId);
                return (
                  <Card key={agent.id} className="overflow-hidden">
                    <div className="flex flex-col sm:flex-row">
                      <div className="w-2" style={{ backgroundColor: getAgentTypeColor(agent.type) }}></div>
                      <div className="flex-1 p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                          <div className="flex items-center mb-2 sm:mb-0">
                            {getAgentTypeIcon(agent.type)}
                            <h3 className="text-lg font-semibold ml-2">{agent.name}</h3>
                            <Badge className={`ml-2 ${agent.isActive ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-800"}`}>
                              {agent.isActive ? "Активен" : "Отключен"}
                            </Badge>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditAgent(agent)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Изменить
                            </Button>
                            <Button 
                              variant={agent.isActive ? "ghost" : "outline"} 
                              size="sm"
                              onClick={() => handleToggleAgentStatus(agent)}
                              className={agent.isActive ? "text-red-500 hover:text-red-700" : "text-green-500 hover:text-green-700"}
                            >
                              {agent.isActive ? (
                                <>
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Отключить
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Активировать
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-sm text-neutral-600 mb-4">{agent.description}</div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center">
                            <div className="mr-2 p-2 bg-neutral-100 rounded-full">
                              {getModelTypeIcon(integration?.type || "")}
                            </div>
                            <div>
                              <div className="text-xs text-neutral-500">Модель</div>
                              <div className="font-medium">{integration?.name || "Неизвестная модель"}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center">
                            <div className="mr-2 p-2 bg-neutral-100 rounded-full">
                              <FileCheck className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                              <div className="text-xs text-neutral-500">Тип</div>
                              <div className="font-medium">{getAgentTypeLabel(agent.type)}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center">
                            <Button variant="ghost" size="sm" onClick={() => handleEditSystemPrompt(agent)}>
                              <FileStack className="h-4 w-4 mr-1" />
                              Системный промпт
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
            
            {agents.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-10">
                  <Bot className="h-16 w-16 text-neutral-300 mb-4" />
                  <h3 className="text-xl font-medium text-neutral-900 mb-2">Нет агентов</h3>
                  <p className="text-neutral-500 text-center max-w-md mb-6">
                    Создайте ИИ-агентов для автоматизации различных процессов в системе: обработки обращений, анализа документов, транскрибации совещаний и других задач.
                  </p>
                  <Button onClick={handleAddAgent}>
                    <Plus className="h-4 w-4 mr-2" />
                    Создать первого агента
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="tasks">
          <div className="space-y-4">
            {isTasksLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-20 bg-neutral-100 rounded-lg"></div>
                ))}
              </div>
            ) : (
              tasks.map(task => {
                const agent = agents.find(a => a.id === task.agentId);
                return (
                  <Card key={task.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <h3 className="font-medium text-neutral-900">{task.title}</h3>
                            <Badge className={`ml-2 ${getStatusColor(task.status)}`}>
                              {getStatusLabel(task.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-neutral-600">{task.description}</p>
                        </div>
                        
                        <div className="ml-4 flex items-center">
                          {agent ? (
                            <div className="flex items-center bg-neutral-100 p-2 rounded-md">
                              <Bot className="h-4 w-4 text-primary mr-2" />
                              <span className="text-sm font-medium">{agent.name}</span>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => handleAssignTask(task)}>
                              <UserCog className="h-4 w-4 mr-1" />
                              Назначить агента
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
            
            {tasks.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <FileCheck className="h-12 w-12 text-neutral-300 mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">Нет задач</h3>
                  <p className="text-neutral-500 text-center max-w-md">
                    Задачи для агентов будут появляться здесь по мере их создания в системе.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Диалог создания/редактирования агента */}
      <Dialog open={showAgentDialog} onOpenChange={setShowAgentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAgent?.id ? 'Редактирование агента' : 'Новый агент'}</DialogTitle>
            <DialogDescription>
              Укажите параметры ИИ-агента для автоматизации процессов.
            </DialogDescription>
          </DialogHeader>
          
          {editingAgent && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="agent-name">Название агента</Label>
                <Input 
                  id="agent-name" 
                  value={editingAgent.name} 
                  onChange={(e) => setEditingAgent({...editingAgent, name: e.target.value})}
                  placeholder="Введите название агента"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agent-type">Тип агента</Label>
                <Select 
                  value={editingAgent.type}
                  onValueChange={(value) => setEditingAgent({...editingAgent, type: value})}
                >
                  <SelectTrigger id="agent-type">
                    <SelectValue placeholder="Выберите тип агента" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="citizen_requests">Обращения граждан</SelectItem>
                    <SelectItem value="meetings">Протоколы совещаний</SelectItem>
                    <SelectItem value="documents">Документы</SelectItem>
                    <SelectItem value="task_management">Управление задачами</SelectItem>
                    <SelectItem value="blockchain">Блокчейн</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agent-description">Описание</Label>
                <Textarea 
                  id="agent-description" 
                  value={editingAgent.description || ''} 
                  onChange={(e) => setEditingAgent({...editingAgent, description: e.target.value})}
                  placeholder="Опишите назначение и функции агента"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agent-model">Модель (интеграция)</Label>
                <Select 
                  value={editingAgent.modelId.toString()}
                  onValueChange={(value) => setEditingAgent({...editingAgent, modelId: parseInt(value)})}
                >
                  <SelectTrigger id="agent-model">
                    <SelectValue placeholder="Выберите модель" />
                  </SelectTrigger>
                  <SelectContent>
                    {integrations.map(integration => (
                      <SelectItem key={integration.id} value={integration.id.toString()}>
                        {integration.name} ({integration.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agent-prompt">Системный промпт</Label>
                <Textarea 
                  id="agent-prompt" 
                  value={editingAgent.systemPrompt} 
                  onChange={(e) => setEditingAgent({...editingAgent, systemPrompt: e.target.value})}
                  placeholder="Введите системный промпт для агента"
                  rows={4}
                />
                <p className="text-xs text-neutral-500">
                  Системный промпт определяет роль и инструкции для ИИ-агента.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="agent-active">Активность</Label>
                  <Switch 
                    id="agent-active"
                    checked={editingAgent.isActive}
                    onCheckedChange={(checked) => setEditingAgent({...editingAgent, isActive: checked})}
                  />
                </div>
                <p className="text-xs text-neutral-500">
                  Неактивные агенты не будут обрабатывать новые задачи.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAgentDialog(false)}>Отмена</Button>
            <Button 
              onClick={() => editingAgent && saveAgentMutation.mutate(editingAgent)}
              disabled={saveAgentMutation.isPending}
            >
              {saveAgentMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог редактирования системного промпта */}
      <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Системный промпт для агента "{editingAgent?.name}"</DialogTitle>
            <DialogDescription>
              Измените системный промпт, определяющий поведение и специализацию агента.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Textarea 
              value={editingSystemPrompt} 
              onChange={(e) => setEditingSystemPrompt(e.target.value)}
              placeholder="Введите системный промпт для агента"
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-sm text-neutral-500">
              Хороший системный промпт должен четко определять роль агента, его ограничения и шаги для выполнения задач.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromptDialog(false)}>Отмена</Button>
            <Button 
              onClick={() => editingAgent && updateSystemPromptMutation.mutate({
                id: editingAgent.id,
                systemPrompt: editingSystemPrompt
              })}
              disabled={updateSystemPromptMutation.isPending}
            >
              {updateSystemPromptMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог назначения задачи агенту */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Назначение задачи агенту</DialogTitle>
            <DialogDescription>
              Выберите ИИ-агента для выполнения задачи "{assigningTask?.title}".
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-agent">Агент</Label>
              <Select 
                onValueChange={(value) => {
                  if (assigningTask) {
                    assignTaskMutation.mutate({
                      taskId: assigningTask.id,
                      agentId: parseInt(value)
                    });
                  }
                }}
              >
                <SelectTrigger id="task-agent">
                  <SelectValue placeholder="Выберите агента" />
                </SelectTrigger>
                <SelectContent>
                  {agents
                    .filter(agent => agent.isActive)
                    .map(agent => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.name} ({getAgentTypeLabel(agent.type)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Вспомогательные функции
function getAgentTypeColor(type: string): string {
  switch (type) {
    case "citizen_requests":
      return "#3b82f6"; // blue-500
    case "meetings":
      return "#8b5cf6"; // purple-500
    case "documents":
      return "#f59e0b"; // amber-500
    case "task_management":
      return "#10b981"; // green-500
    case "blockchain":
      return "#ef4444"; // red-500
    default:
      return "#6b7280"; // gray-500
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-neutral-100 text-neutral-800";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Ожидает";
    case "in_progress":
      return "В процессе";
    case "completed":
      return "Завершено";
    case "failed":
      return "Ошибка";
    default:
      return "Неизвестно";
  }
}

export default AIAgentsPage;