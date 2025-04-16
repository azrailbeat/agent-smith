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
  Sparkles,
  RotateCw,
  SearchCode,
  UserCog,
  Globe,
  ScrollText,
  Stethoscope,
  Briefcase,
  Camera,
  GraduationCap,
  Flame,
  BarChart2,
  Truck,
  Database
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
  const [showPersonaBuilderDialog, setShowPersonaBuilderDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [viewingAgent, setViewingAgent] = useState<Agent | null>(null);
  const [assigningTask, setAssigningTask] = useState<Task | null>(null);
  const [editingSystemPrompt, setEditingSystemPrompt] = useState<string>("");
  
  // Расширенная структура для конфигурации агента в PersonaBuilder
  interface KnowledgeSource {
    id: string;
    type: 'pinecone' | 'google_drive' | 'postgresql' | 'file';
    name: string;
    config: Record<string, any>;
  }
  
  interface AgentTrigger {
    id: string;
    type: 'event' | 'data' | 'cron';
    name: string;
    config: Record<string, any>;
  }
  
  interface PersonaBuilderConfig {
    name: string;
    model: string;
    prompt: string;
    knowledge_sources: KnowledgeSource[];
    triggers: AgentTrigger[];
    roles: ('public' | 'internal' | 'admin')[];
  }
  
  const [personaConfig, setPersonaConfig] = useState<PersonaBuilderConfig>({
    name: '',
    model: 'gpt-4o',
    prompt: '',
    knowledge_sources: [],
    triggers: [],
    roles: ['internal']
  });
  
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
      name: "ЛегалАдвайзер",
      type: "legal",
      ministryId: 1,
      typeId: 1,
      description: "Обработка обращений граждан по правовым вопросам",
      modelId: 1,
      isActive: true,
      systemPrompt: "Вы - помощник по правовым вопросам Министерства юстиции. Ваша задача - определить тип обращения, уровень приоритета и предложить решение в соответствии с законодательством РК.",
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
      name: "НормотворчествоАИ",
      type: "legal",
      ministryId: 1,
      typeId: 2,
      description: "Анализ нормативно-правовых актов и выявление ошибок",
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
      name: "ЕНТ-Консультант",
      type: "education",
      ministryId: 2,
      typeId: 3,
      description: "Консультация абитуриентов по вопросам ЕНТ и правилам поступления",
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
      name: "Қазақ тілі көмекшісі",
      type: "education",
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
      name: "МедЭксперт",
      type: "medical",
      ministryId: 11,
      typeId: 5,
      description: "Обработка медицинской документации и классификация диагнозов",
      modelId: 1,
      isActive: true,
      systemPrompt: "Вы - медицинский эксперт. Ваша задача - анализировать медицинские документы, классифицировать диагнозы и предлагать оптимальные варианты лечения.",
      config: { temperature: 0.1, max_tokens: 1500 },
      stats: { 
        documentsProcessed: 32467, 
        accuracyRate: 96.8,
        processingTime: "3.2 мин"
      },
      totalTasks: 142,
      completedTasks: 139
    },
    {
      id: 6,
      name: "ТрудЭксперт",
      type: "labor",
      ministryId: 3,
      typeId: 6,
      description: "Консультации по трудовому законодательству и анализ рынка труда",
      modelId: 3,
      isActive: true,
      systemPrompt: "Вы - эксперт по трудовому законодательству и аналитик рынка труда. Ваша задача - консультировать по вопросам трудовых отношений и анализировать тенденции рынка труда.",
      config: { temperature: 0.2, max_tokens: 2000 },
      stats: { 
        consultationsProvided: 28754, 
        satisfactionRate: 89.5,
        reportsGenerated: 187
      },
      totalTasks: 124,
      completedTasks: 118
    },
    {
      id: 7,
      name: "ТранспортАналитик",
      type: "transport",
      ministryId: 4,
      typeId: 7,
      description: "Аналитика транспортных потоков и оптимизация маршрутов",
      modelId: 1,
      isActive: true,
      systemPrompt: "Вы - эксперт по транспортной аналитике. Ваша задача - анализировать транспортные потоки, предлагать оптимальные маршруты и рекомендации по развитию транспортной инфраструктуры.",
      config: { temperature: 0.2, max_tokens: 1500 },
      stats: { 
        routesOptimized: 1254, 
        fuelSavings: "18.7%",
        congestionReduction: "23.5%"
      },
      totalTasks: 76,
      completedTasks: 72
    },
    {
      id: 8,
      name: "СубсидияЗаполнитель",
      type: "agriculture",
      ministryId: 9,
      typeId: 8,
      description: "Помощник по заполнению заявок на сельскохозяйственные субсидии",
      modelId: 1,
      isActive: true,
      systemPrompt: "Вы - специалист по сельскохозяйственным субсидиям. Ваша задача - помогать заполнять заявки на получение субсидий, проверять правильность оформления документов и консультировать по программам поддержки.",
      config: { temperature: 0.2, max_tokens: 1500 },
      stats: { 
        applicationsProcessed: 8754, 
        errorReduction: "76%",
        processingTime: "15 мин"
      },
      totalTasks: 94,
      completedTasks: 89
    },
    {
      id: 9,
      name: "КамераАИ",
      type: "mvd",
      ministryId: 5,
      typeId: 9,
      description: "Распознавание лиц и обнаружение нарушений правопорядка",
      modelId: 2,
      isActive: true,
      systemPrompt: "Вы - система компьютерного зрения для обеспечения правопорядка. Ваша задача - анализировать видеопоток с камер наблюдения, распознавать лица и обнаруживать подозрительное поведение.",
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
      name: "ПДДМонитор",
      type: "mvd",
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
    },
    {
      id: 11,
      name: "ОбращенияТрекер",
      type: "citizen_requests",
      description: "Центральный агент для обработки обращений граждан",
      modelId: 1,
      isActive: true,
      systemPrompt: "Вы - центральный агент для обработки обращений граждан. Ваша задача - классифицировать обращения, направлять их в соответствующие ведомства и формировать автоматические ответы на типовые запросы.",
      config: { temperature: 0.2, max_tokens: 2500 },
      stats: { 
        requestsProcessed: 145692, 
        averageProcessingTime: "1.8 мин",
        automaticResponseRate: 78.3
      },
      totalTasks: 523,
      completedTasks: 512
    },
    {
      id: 12,
      name: "БлокчейнРекордер",
      type: "blockchain",
      description: "Агент для записи и верификации транзакций в блокчейне",
      modelId: 4,
      isActive: true,
      systemPrompt: "Вы - агент для работы с блокчейном Hyperledger Besu. Ваша задача - обеспечивать запись важных транзакций в блокчейн, верифицировать целостность данных и предоставлять доказательства неизменности информации.",
      config: { 
        chainId: "besu-gov", 
        nodeEndpoint: "https://besu-node.gov.kz" 
      },
      stats: { 
        transactionsRecorded: 38945, 
        verificationSuccessRate: 100,
        averageConfirmationTime: "4.2 сек"
      },
      totalTasks: 187,
      completedTasks: 187
    },
    {
      id: 13,
      name: "ЭнергоЭффективность",
      type: "energy",
      ministryId: 6,
      description: "Анализ энергоэффективности зданий и инфраструктуры",
      modelId: 3,
      isActive: true,
      systemPrompt: "Вы - эксперт по энергоэффективности. Ваша задача - анализировать данные о энергопотреблении, предлагать меры по повышению энергоэффективности и рассчитывать экономический эффект от внедрения этих мер.",
      config: { temperature: 0.2, max_tokens: 2000 },
      stats: { 
        buildingsAnalyzed: 3456, 
        energySavings: "24.7%",
        recommendationsImplemented: 1872
      },
      totalTasks: 98,
      completedTasks: 92
    },
    {
      id: 14,
      name: "ТорговыйАналист",
      type: "trade",
      ministryId: 8,
      description: "Анализ товарооборота и торговых отношений",
      modelId: 3,
      isActive: true,
      systemPrompt: "Вы - эксперт по торговой аналитике. Ваша задача - анализировать данные о товарообороте, выявлять тенденции торговых отношений и предлагать меры по их оптимизации.",
      config: { temperature: 0.2, max_tokens: 2000 },
      stats: { 
        reportsGenerated: 245, 
        dataProcessed: "17.8 ТБ",
        insightsIdentified: 879
      },
      totalTasks: 62,
      completedTasks: 59
    },
    {
      id: 15,
      name: "МультиязычныйПереводчик",
      type: "translator",
      description: "Перевод документов между казахским, русским и английским языками",
      modelId: 1,
      isActive: true,
      systemPrompt: "Вы - профессиональный переводчик между казахским, русским и английским языками. Ваша задача - обеспечивать точный и контекстуально правильный перевод документов с сохранением терминологии и стиля.",
      config: { temperature: 0.2, max_tokens: 2000 },
      stats: { 
        pagesTranslated: 45780, 
        languagePairs: 3,
        accuracyRate: 97.2
      },
      totalTasks: 214,
      completedTasks: 208
    },
    {
      id: 16,
      name: "МетоПрот",
      type: "meeting_protocols",
      description: "Агент для расшифровки и составления протоколов совещаний",
      modelId: 1,
      isActive: true,
      systemPrompt: "Вы - специалист по составлению протоколов совещаний. Ваша задача - расшифровывать аудиозаписи совещаний, структурировать информацию, выделять ключевые решения и задачи, формировать протоколы.",
      config: { temperature: 0.1, max_tokens: 3000 },
      stats: { 
        meetingsProcessed: 2345, 
        averageProcessingTime: "12.4 мин",
        accuracyRate: 98.7
      },
      totalTasks: 156,
      completedTasks: 154
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
    enabled: true, // Используем API
  });
  
  const { data: integrations = demoIntegrations, isLoading: isIntegrationsLoading } = useQuery<Integration[]>({
    queryKey: ['/api/integrations'],
    enabled: true,
  });
  
  const { data: tasks = demoTasks, isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    enabled: true,
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
      ministryId: demoMinistries[0]?.id,  // Добавляем defaultное министерство
      typeId: demoAgentTypes[0]?.id,      // Добавляем defaultный тип агента
      modelId: integrations[0]?.id || 0,
      isActive: true,
      systemPrompt: "",
      config: { temperature: 0.3, max_tokens: 1000 }
    });
    setShowAgentDialog(true);
  };
  
  // Функция для открытия интерфейса PersonaBuilder
  const handleOpenPersonaBuilder = () => {
    // Инициализируем персону со значениями по умолчанию
    setPersonaConfig({
      name: '',
      model: 'gpt-4o',
      prompt: '',
      knowledge_sources: [],
      triggers: [],
      roles: ['internal']
    });
    setShowPersonaBuilderDialog(true);
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
      case "meeting_protocols":
        return <FileCheck className="h-5 w-5 text-purple-500" />;
      case "documents":
        return <FileStack className="h-5 w-5 text-amber-500" />;
      case "task_management":
        return <LayoutDashboard className="h-5 w-5 text-green-500" />;
      case "blockchain":
        return <Database className="h-5 w-5 text-red-500" />;
      case "translator":
        return <Globe className="h-5 w-5 text-teal-500" />;
      case "legal":
        return <ScrollText className="h-5 w-5 text-indigo-500" />;
      case "medical":
        return <Stethoscope className="h-5 w-5 text-pink-500" />;
      case "labor":
        return <Briefcase className="h-5 w-5 text-yellow-500" />;
      case "mvd":
        return <Camera className="h-5 w-5 text-slate-500" />;
      case "education":
        return <GraduationCap className="h-5 w-5 text-cyan-500" />;
      case "energy":
        return <Flame className="h-5 w-5 text-orange-500" />;
      case "trade":
        return <BarChart2 className="h-5 w-5 text-violet-500" />;
      case "transport":
        return <Truck className="h-5 w-5 text-lime-500" />;
      case "agriculture":
        return <BookOpen className="h-5 w-5 text-emerald-500" />;
      default:
        return <Bot className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getAgentTypeLabel = (type: string) => {
    switch (type) {
      case "citizen_requests":
        return "Обращения граждан";
      case "meeting_protocols":
        return "Протоколы совещаний";
      case "documents":
        return "Документы";
      case "task_management":
        return "Управление задачами";
      case "blockchain":
        return "Блокчейн";
      case "translator":
        return "Переводчик";
      case "legal":
        return "Юридический консультант";
      case "medical":
        return "Медицинский консультант";
      case "labor":
        return "Трудовые вопросы";
      case "mvd":
        return "МВД";
      case "education":
        return "Образование";
      case "energy":
        return "Энергетика";
      case "trade":
        return "Торговля";
      case "transport":
        return "Транспорт";
      case "agriculture":
        return "Сельское хозяйство";
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
      case "meeting_protocols":
        return "#8b5cf6"; // purple-500
      case "documents":
        return "#f59e0b"; // amber-500
      case "task_management":
        return "#10b981"; // green-500
      case "blockchain":
        return "#ef4444"; // red-500
      case "translator":
        return "#14b8a6"; // teal-500
      case "legal":
        return "#6366f1"; // indigo-500
      case "medical":
        return "#ec4899"; // pink-500
      case "labor":
        return "#facc15"; // yellow-500
      case "mvd":
        return "#64748b"; // slate-500
      case "education":
        return "#06b6d4"; // cyan-500
      case "energy":
        return "#f97316"; // orange-500
      case "trade":
        return "#8b5cf6"; // violet-500
      case "transport":
        return "#84cc16"; // lime-500
      case "agriculture":
        return "#10b981"; // emerald-500
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
          <div className="mt-4 sm:mt-0 flex space-x-3">
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
                        <Button variant="outline" size="sm" onClick={() => handleEditAgent(agent)}>
                          Редактировать
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
        
        <TabsContent value="ministry">
          <div className="space-y-8">
            {isAgentsLoading ? (
              <div className="animate-pulse space-y-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-6 bg-neutral-100 rounded w-1/3"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="h-48 bg-neutral-100 rounded-lg"></div>
                      <div className="h-48 bg-neutral-100 rounded-lg"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {demoMinistries.map(ministry => {
                  const ministryAgents = agents.filter(a => a.ministryId === ministry.id);
                  
                  if (ministryAgents.length === 0) return null;
                  
                  return (
                    <div key={ministry.id} className="space-y-4">
                      <div className="flex items-center space-x-2 border-b pb-2">
                        <span className="text-2xl">{ministry.icon}</span>
                        <h2 className="text-xl font-semibold">{ministry.name}</h2>
                        <Badge variant="outline" className="ml-2">{ministryAgents.length} агентов</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ministryAgents.map(agent => {
                          const integration = integrations.find(i => i.id === agent.modelId);
                          const agentType = demoAgentTypes.find(t => t.id === agent.typeId);
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
                                  {agent.description || (agentType ? agentType.description : `Агент для работы с ${getAgentTypeLabel(agent.type).toLowerCase()}`)}
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
                                  
                                  {agent.stats && (
                                    <>
                                      {Object.entries(agent.stats).map(([key, value], i) => (
                                        <div key={i} className="flex items-center justify-between text-sm">
                                          <span className="text-neutral-500 capitalize">
                                            {key.replace(/([A-Z])/g, ' $1').replace(/([A-Z][a-z])/g, ' $1').toLowerCase()}:
                                          </span>
                                          <span className="font-medium">{String(value)}</span>
                                        </div>
                                      ))}
                                    </>
                                  )}
                                  
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
                                <Button variant="outline" size="sm" onClick={() => handleEditAgent(agent)}>
                                  Редактировать
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
                      </div>
                    </div>
                  );
                })}
                
                {agents.filter(agent => !agent.ministryId).length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 border-b pb-2">
                      <Bot className="h-6 w-6 text-neutral-600" />
                      <h2 className="text-xl font-semibold">Общие агенты</h2>
                      <Badge variant="outline" className="ml-2">{agents.filter(agent => !agent.ministryId).length} агентов</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {agents
                        .filter(agent => !agent.ministryId)
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
                                <Button variant="outline" size="sm" onClick={() => handleEditAgent(agent)}>
                                  Редактировать
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
                    </div>
                  </div>
                )}
              </>
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
                <Label htmlFor="agent-ministry">Министерство</Label>
                <Select 
                  value={editingAgent.ministryId?.toString() || ""}
                  onValueChange={(value) => setEditingAgent({...editingAgent, ministryId: parseInt(value)})}
                >
                  <SelectTrigger id="agent-ministry">
                    <SelectValue placeholder="Выберите министерство" />
                  </SelectTrigger>
                  <SelectContent>
                    {demoMinistries.map(ministry => (
                      <SelectItem key={ministry.id} value={ministry.id.toString()}>
                        {ministry.icon ? `${ministry.icon} ` : ""}{ministry.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agent-type-id">Тип агента (классификация)</Label>
                <Select 
                  value={editingAgent.typeId?.toString() || ""}
                  onValueChange={(value) => setEditingAgent({...editingAgent, typeId: parseInt(value)})}
                >
                  <SelectTrigger id="agent-type-id">
                    <SelectValue placeholder="Выберите классификацию агента" />
                  </SelectTrigger>
                  <SelectContent>
                    {demoAgentTypes.map(type => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
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