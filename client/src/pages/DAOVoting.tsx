import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { activityLogger } from "@/lib/activityLogger";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  CheckCircle2, 
  Clock, 
  Vote, 
  X, 
  Plus, 
  Info, 
  Link, 
  AlertCircle, 
  ThumbsUp, 
  ThumbsDown,
  Users,
  Hourglass,
  Check,
  ListChecks
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

// Определение схемы для создания голосования
const createProposalSchema = z.object({
  title: z.string().min(5, { message: "Название должно содержать минимум 5 символов" }),
  description: z.string().min(10, { message: "Описание должно содержать минимум 10 символов" }),
  category: z.string().min(1, { message: "Выберите категорию" }),
  votingPeriod: z.string().min(1, { message: "Выберите период голосования" }),
  documentLink: z.string().optional(),
  threshold: z.string().min(1, { message: "Укажите порог принятия решения" }),
});

type ProposalFormValues = z.infer<typeof createProposalSchema>;

// Интерфейс для голосования
interface Proposal {
  id: number;
  title: string;
  description: string;
  category: string;
  status: 'active' | 'completed' | 'rejected' | 'pending';
  createdAt: Date;
  endDate: Date;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  threshold: number;
  documentLink?: string;
  createdBy: number;
  creator?: {
    fullName: string;
    department: string;
  };
  blockchain?: {
    transactionHash: string;
    confirmed: boolean;
  };
}

// Интерфейс для голоса
interface Vote {
  id: number;
  proposalId: number;
  userId: number;
  vote: 'for' | 'against' | 'abstain';
  timestamp: Date;
  userName: string;
  userDepartment: string;
  rationale?: string;
}

const DAOVoting = () => {
  const [activeTab, setActiveTab] = useState("active");
  const [showNewProposalDialog, setShowNewProposalDialog] = useState(false);
  const [showProposalDetails, setShowProposalDetails] = useState<Proposal | null>(null);
  const [userVote, setUserVote] = useState<'for' | 'against' | 'abstain' | null>(null);
  const [voteRationale, setVoteRationale] = useState("");
  const [showVotesList, setShowVotesList] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  
  // Получение списка голосований
  const { data: proposals, isLoading } = useQuery<Proposal[]>({
    queryKey: ['/api/dao/proposals'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/dao/proposals');
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch proposals, using demo data', error);
        
        // Демо данные для отображения функциональности
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const lastWeek = new Date(now);
        lastWeek.setDate(lastWeek.getDate() - 7);
        
        return [
          {
            id: 1,
            title: "Обновление правил документооборота",
            description: "Предлагается внедрить новые правила документооборота для повышения эффективности работы с документами. Предложение включает в себя: автоматизацию процесса согласования, новые шаблоны документов, интеграцию с Documentolog.",
            category: "Процессы",
            status: "active",
            createdAt: new Date(now.setDate(now.getDate() - 2)),
            endDate: nextWeek,
            votesFor: 15,
            votesAgainst: 3,
            votesAbstain: 2,
            threshold: 66,
            documentLink: "https://docs.google.com/document/d/123",
            createdBy: 1,
            creator: {
              fullName: "Иванов Алексей",
              department: "Отдел цифровизации"
            },
            blockchain: {
              transactionHash: "0x2d8c7436d370a8eb9dba8c356e2e539e8fd4dcbd",
              confirmed: true
            }
          },
          {
            id: 2,
            title: "Модернизация системы информационной безопасности",
            description: "Предлагается внедрить новые технологии защиты информации и обновить политики безопасности данных в соответствии с последними требованиями.",
            category: "Безопасность",
            status: "active",
            createdAt: new Date(now.setDate(now.getDate() - 1)),
            endDate: tomorrow,
            votesFor: 18,
            votesAgainst: 1,
            votesAbstain: 0,
            threshold: 75,
            createdBy: 2,
            creator: {
              fullName: "Петрова Мария",
              department: "Отдел ИТ"
            },
            blockchain: {
              transactionHash: "0xa3e5c1f4b2d3e8f6a9b8c7d6e5f4a3b2c1d8e9f8",
              confirmed: true
            }
          },
          {
            id: 3,
            title: "Внедрение новой методологии разработки",
            description: "Предлагается перейти на методологию Agile для повышения скорости и качества разработки цифровых продуктов.",
            category: "Разработка",
            status: "completed",
            createdAt: new Date(now.setDate(now.getDate() - 10)),
            endDate: lastWeek,
            votesFor: 22,
            votesAgainst: 3,
            votesAbstain: 1,
            threshold: 70,
            createdBy: 3,
            creator: {
              fullName: "Сидоров Павел",
              department: "Отдел разработки"
            },
            blockchain: {
              transactionHash: "0xd9c8b7a6f5e4d3c2b1a9f8e7d6c5b4a3f2e1d9c8",
              confirmed: true
            }
          },
          {
            id: 4,
            title: "Обновление процесса найма сотрудников",
            description: "Предлагается обновить процесс найма для более эффективного привлечения талантливых специалистов.",
            category: "Кадры",
            status: "rejected",
            createdAt: new Date(now.setDate(now.getDate() - 15)),
            endDate: new Date(now.setDate(now.getDate() - 8)),
            votesFor: 5,
            votesAgainst: 12,
            votesAbstain: 3,
            threshold: 60,
            createdBy: 4,
            creator: {
              fullName: "Козлова Анна",
              department: "HR отдел"
            },
            blockchain: {
              transactionHash: "0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t",
              confirmed: true
            }
          },
          {
            id: 5,
            title: "Разработка стратегии цифровой трансформации",
            description: "Предлагается разработать комплексную стратегию цифровой трансформации для повышения эффективности работы государственных органов.",
            category: "Стратегия",
            status: "pending",
            createdAt: new Date(),
            endDate: nextWeek,
            votesFor: 0,
            votesAgainst: 0,
            votesAbstain: 0,
            threshold: 75,
            createdBy: 5,
            creator: {
              fullName: "Смирнов Дмитрий",
              department: "Отдел стратегического планирования"
            },
            blockchain: {
              transactionHash: "0x0t9s8r7q6p5o4n3m2l1k0j9i8h7g6f5e4d3c2b1a",
              confirmed: false
            }
          }
        ];
      }
    }
  });
  
  // Демо данные для голосов
  const getDemoVotes = (proposalId: number): Vote[] => {
    const now = new Date();
    return [
      {
        id: 1,
        proposalId,
        userId: 1,
        vote: 'for',
        timestamp: new Date(now.setHours(now.getHours() - 2)),
        userName: "Иванов Алексей",
        userDepartment: "Отдел цифровизации",
        rationale: "Считаю, что данное предложение значительно повысит эффективность работы"
      },
      {
        id: 2,
        proposalId,
        userId: 2,
        vote: 'for',
        timestamp: new Date(now.setHours(now.getHours() - 3)),
        userName: "Петрова Мария",
        userDepartment: "Отдел ИТ",
        rationale: "Поддерживаю, инициатива соответствует целям развития"
      },
      {
        id: 3,
        proposalId,
        userId: 3,
        vote: 'against',
        timestamp: new Date(now.setHours(now.getHours() - 4)),
        userName: "Сидоров Павел",
        userDepartment: "Отдел разработки",
        rationale: "Считаю предложение преждевременным"
      },
      {
        id: 4,
        proposalId,
        userId: 4,
        vote: 'abstain',
        timestamp: new Date(now.setHours(now.getHours() - 5)),
        userName: "Козлова Анна",
        userDepartment: "HR отдел"
      },
      {
        id: 5,
        proposalId,
        userId: 5,
        vote: 'for',
        timestamp: new Date(now.setHours(now.getHours() - 6)),
        userName: "Смирнов Дмитрий",
        userDepartment: "Отдел стратегического планирования",
        rationale: "Полностью поддерживаю"
      }
    ];
  };
  
  // Получение голосов по ID предложения
  const { data: votes, isLoading: isLoadingVotes } = useQuery<Vote[]>({
    queryKey: ['/api/dao/votes', showVotesList],
    enabled: showVotesList !== null,
    queryFn: async () => {
      if (!showVotesList) return [];
      
      try {
        // В реальном приложении - запрос к API
        // const response = await apiRequest(`/api/dao/proposals/${showVotesList}/votes`);
        // return response;
        
        // Демо данные
        return getDemoVotes(showVotesList);
      } catch (error) {
        console.error('Failed to fetch votes', error);
        return [];
      }
    }
  });
  
  // Мутация для создания нового предложения
  const createProposalMutation = useMutation({
    mutationFn: async (newProposal: ProposalFormValues) => {
      try {
        // Создаем запись в истории о создании нового предложения
        await activityLogger.logActivity(
          'create_proposal',
          `Создано новое предложение: ${newProposal.title}`,
          undefined, // entityId будет задан после создания
          'dao_proposal',
          {
            category: newProposal.category,
            votingPeriod: newProposal.votingPeriod,
            threshold: newProposal.threshold
          }
        );

        const response = await apiRequest('POST', '/api/dao/proposals', newProposal);
        
        // Получаем идентификатор созданного предложения
        const createdProposal = await response.json();
        
        // Создаем запись в блокчейне для обеспечения неизменности
        if (createdProposal && createdProposal.id) {
          await activityLogger.createBlockchainRecord(
            'proposal_created',
            'dao_proposal',
            createdProposal.id,
            {
              title: newProposal.title,
              category: newProposal.category,
              threshold: newProposal.threshold,
              createdAt: new Date().toISOString()
            }
          );
        }
        
        return response;
      } catch (error) {
        console.error('Failed to create proposal', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dao/proposals'] });
      setShowNewProposalDialog(false);
      form.reset();
    }
  });
  
  // Мутация для отправки голоса
  const voteProposalMutation = useMutation({
    mutationFn: async ({
      proposalId,
      voteValue,
      rationale
    }: {
      proposalId: number;
      voteValue: 'for' | 'against' | 'abstain';
      rationale?: string;
    }) => {
      try {
        // Получаем название значения голоса на русском для записи в историю
        const voteValueRussian = {
          'for': 'За',
          'against': 'Против',
          'abstain': 'Воздержался'
        }[voteValue];
        
        // Записываем действие в историю
        await activityLogger.logActivity(
          'proposal_vote',
          `Голос по предложению #${proposalId}: ${voteValueRussian}`,
          proposalId,
          'dao_proposal',
          {
            vote: voteValue,
            rationale: rationale || 'Без комментария'
          }
        );
        
        const response = await apiRequest('POST', `/api/dao/proposals/${proposalId}/vote`, { vote: voteValue, rationale });
        
        // Обязательно записываем голос в блокчейн для обеспечения прозрачности и неизменности
        await activityLogger.createBlockchainRecord(
          'proposal_vote_cast',
          'dao_proposal',
          proposalId,
          {
            vote: voteValue,
            timestamp: new Date().toISOString(),
            // НЕ ХРАНИМ личность голосующего в открытом виде для соблюдения тайны голосования
            // Только хеш или зашифрованный идентификатор может быть записан в реальной системе
            voterHash: 'user_identity_hash_would_be_here_in_production'
          }
        );
        
        return response;
      } catch (error) {
        console.error('Failed to send vote', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dao/proposals'] });
      setUserVote(null);
      setVoteRationale("");
      // Не закрываем диалог, чтобы пользователь увидел результат голосования
    }
  });
  
  // Форма для создания нового предложения
  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(createProposalSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      votingPeriod: "",
      documentLink: "",
      threshold: "66"
    }
  });

  // Обработка отправки формы
  const onSubmit = (data: ProposalFormValues) => {
    // В реальном приложении здесь будет вызов API для создания голосования
    console.log("Создание голосования:", data);
    
    // Симуляция отправки запроса
    setTimeout(() => {
      setShowNewProposalDialog(false);
      form.reset();
    }, 500);
  };

  // Функция для отправки голоса
  const handleVote = () => {
    if (!showProposalDetails || !userVote) return;
    
    // Логируем действие для отладки
    console.log(`Голосование за предложение #${showProposalDetails.id}: ${userVote}`, voteRationale ? `(${voteRationale})` : '');
    
    // Вызываем нашу мутацию для отправки голоса с интеграцией activityLogger
    voteProposalMutation.mutate({
      proposalId: showProposalDetails.id,
      voteValue: userVote,
      rationale: voteRationale
    });
    
    // Обновляем локальный UI для мгновенной обратной связи
    const updatedProposal = { 
      ...showProposalDetails,
      votesFor: userVote === 'for' ? showProposalDetails.votesFor + 1 : showProposalDetails.votesFor,
      votesAgainst: userVote === 'against' ? showProposalDetails.votesAgainst + 1 : showProposalDetails.votesAgainst,
      votesAbstain: userVote === 'abstain' ? showProposalDetails.votesAbstain + 1 : showProposalDetails.votesAbstain
    };
    
    setShowProposalDetails(updatedProposal);
  };
  
  // Функция для расчета процента голосов "за"
  const calculatePercentage = (proposal: Proposal) => {
    const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
    if (totalVotes === 0) return 0;
    return Math.round((proposal.votesFor / totalVotes) * 100);
  };
  
  // Функция для получения статуса голосования
  const getVotingStatus = (proposal: Proposal) => {
    const now = new Date();
    const endDate = new Date(proposal.endDate);
    
    if (proposal.status === "pending") {
      return { text: "Ожидает проверки", color: "bg-yellow-100 text-yellow-800" };
    } else if (proposal.status === "rejected") {
      return { text: "Отклонено", color: "bg-red-100 text-red-800" };
    } else if (proposal.status === "completed") {
      const percentage = calculatePercentage(proposal);
      if (percentage >= proposal.threshold) {
        return { text: "Принято", color: "bg-green-100 text-green-800" };
      } else {
        return { text: "Не принято", color: "bg-red-100 text-red-800" };
      }
    } else if (now > endDate) {
      const percentage = calculatePercentage(proposal);
      if (percentage >= proposal.threshold) {
        return { text: "Завершено (Принято)", color: "bg-green-100 text-green-800" };
      } else {
        return { text: "Завершено (Не принято)", color: "bg-red-100 text-red-800" };
      }
    } else {
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { 
        text: `Активно (${daysLeft} дн. осталось)`, 
        color: "bg-blue-100 text-blue-800" 
      };
    }
  };
  
  // Функция для определения цвета прогресс-бара
  const getProgressColor = (proposal: Proposal) => {
    const percentage = calculatePercentage(proposal);
    
    if (percentage >= proposal.threshold) {
      return "bg-green-500";
    } else if (percentage >= proposal.threshold * 0.7) {
      return "bg-yellow-500";
    } else {
      return "bg-red-500";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Голосование DAO GovChain</h1>
        <Button 
          className="flex items-center gap-1" 
          onClick={() => setShowNewProposalDialog(true)}
        >
          <Plus className="h-4 w-4" />
          <span>Новое предложение</span>
        </Button>
      </div>
      
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-4 max-w-[600px]">
          <TabsTrigger value="active" className="flex items-center gap-1">
            <Vote className="h-4 w-4" />
            <span>Активные</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-1">
            <Hourglass className="h-4 w-4" />
            <span>Ожидающие</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-1">
            <Check className="h-4 w-4" />
            <span>Завершенные</span>
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-1">
            <ListChecks className="h-4 w-4" />
            <span>Все</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {proposals?.filter(p => p.status === "active").map(proposal => (
                <Card key={proposal.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <Badge className="mb-2" variant="outline">{proposal.category}</Badge>
                      <Badge className={cn(getVotingStatus(proposal).color)}>{getVotingStatus(proposal).text}</Badge>
                    </div>
                    <CardTitle className="text-lg cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => setShowProposalDetails(proposal)}>
                      {proposal.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-neutral-500 mb-1">
                        <span>За: {calculatePercentage(proposal)}%</span>
                        <span>Необходимо: {proposal.threshold}%</span>
                      </div>
                      <Progress 
                        value={calculatePercentage(proposal)} 
                        max={100} 
                        className={`h-2 ${getProgressColor(proposal)}`}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="bg-green-50 p-2 rounded text-center">
                        <div className="flex items-center justify-center">
                          <ThumbsUp className="h-3 w-3 mr-1 text-green-600" />
                          <span className="font-medium">{proposal.votesFor}</span>
                        </div>
                        <div className="text-xs text-neutral-600 mt-1">За</div>
                      </div>
                      <div className="bg-yellow-50 p-2 rounded text-center">
                        <div className="flex items-center justify-center">
                          <AlertCircle className="h-3 w-3 mr-1 text-yellow-500" />
                          <span className="font-medium">{proposal.votesAbstain}</span>
                        </div>
                        <div className="text-xs text-neutral-600 mt-1">Воздержались</div>
                      </div>
                      <div className="bg-red-50 p-2 rounded text-center">
                        <div className="flex items-center justify-center">
                          <ThumbsDown className="h-3 w-3 mr-1 text-red-600" />
                          <span className="font-medium">{proposal.votesAgainst}</span>
                        </div>
                        <div className="text-xs text-neutral-600 mt-1">Против</div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 flex justify-between">
                    <Button 
                      onClick={() => setShowVotesList(proposal.id)}
                      size="sm" 
                      variant="outline"
                      className="text-xs"
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Список голосов
                    </Button>
                    
                    <div className="flex items-center text-xs text-slate-500">
                      {proposal.blockchain?.confirmed ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center">
                                <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                                <span>В блокчейне</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs break-all">
                                Запись подтверждена в блокчейне. <br />
                                Хеш: {proposal.blockchain.transactionHash}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-amber-500" />
                          <span>Ожидает подтверждения</span>
                        </div>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {proposals?.filter(p => p.status === "pending").map(proposal => (
                <Card key={proposal.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <Badge className="mb-2" variant="outline">{proposal.category}</Badge>
                      <Badge className={cn(getVotingStatus(proposal).color)}>{getVotingStatus(proposal).text}</Badge>
                    </div>
                    <CardTitle className="text-lg cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => setShowProposalDetails(proposal)}>
                      {proposal.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                      {proposal.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {proposals?.filter(p => p.status === "completed" || p.status === "rejected").map(proposal => (
                <Card key={proposal.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <Badge className="mb-2" variant="outline">{proposal.category}</Badge>
                      <Badge className={cn(getVotingStatus(proposal).color)}>{getVotingStatus(proposal).text}</Badge>
                    </div>
                    <CardTitle className="text-lg cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => setShowProposalDetails(proposal)}>
                      {proposal.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-neutral-500 mb-1">
                        <span>Итог: {calculatePercentage(proposal)}%</span>
                        <span>Необходимо: {proposal.threshold}%</span>
                      </div>
                      <Progress 
                        value={calculatePercentage(proposal)} 
                        max={100} 
                        className={`h-2 ${getProgressColor(proposal)}`}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="bg-green-50 p-2 rounded text-center">
                        <div className="flex items-center justify-center">
                          <ThumbsUp className="h-3 w-3 mr-1 text-green-600" />
                          <span className="font-medium">{proposal.votesFor}</span>
                        </div>
                        <div className="text-xs text-neutral-600 mt-1">За</div>
                      </div>
                      <div className="bg-yellow-50 p-2 rounded text-center">
                        <div className="flex items-center justify-center">
                          <AlertCircle className="h-3 w-3 mr-1 text-yellow-500" />
                          <span className="font-medium">{proposal.votesAbstain}</span>
                        </div>
                        <div className="text-xs text-neutral-600 mt-1">Воздержались</div>
                      </div>
                      <div className="bg-red-50 p-2 rounded text-center">
                        <div className="flex items-center justify-center">
                          <ThumbsDown className="h-3 w-3 mr-1 text-red-600" />
                          <span className="font-medium">{proposal.votesAgainst}</span>
                        </div>
                        <div className="text-xs text-neutral-600 mt-1">Против</div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 flex justify-between">
                    <Button 
                      onClick={() => setShowVotesList(proposal.id)}
                      size="sm" 
                      variant="outline"
                      className="text-xs"
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Список голосов
                    </Button>
                    
                    <div className="flex items-center text-xs text-slate-500">
                      {proposal.blockchain?.confirmed ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center">
                                <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                                <span>В блокчейне</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs break-all">
                                Запись подтверждена в блокчейне. <br />
                                Хеш: {proposal.blockchain.transactionHash}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-amber-500" />
                          <span>Ожидает подтверждения</span>
                        </div>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {proposals?.map(proposal => (
                <Card key={proposal.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <Badge className="mb-2" variant="outline">{proposal.category}</Badge>
                      <Badge className={cn(getVotingStatus(proposal).color)}>{getVotingStatus(proposal).text}</Badge>
                    </div>
                    <CardTitle className="text-lg cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => setShowProposalDetails(proposal)}>
                      {proposal.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-neutral-500 mb-1">
                        <span>За: {calculatePercentage(proposal)}%</span>
                        <span>Необходимо: {proposal.threshold}%</span>
                      </div>
                      <Progress 
                        value={calculatePercentage(proposal)} 
                        max={100} 
                        className={`h-2 ${getProgressColor(proposal)}`}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="bg-green-50 p-2 rounded text-center">
                        <div className="flex items-center justify-center">
                          <ThumbsUp className="h-3 w-3 mr-1 text-green-600" />
                          <span className="font-medium">{proposal.votesFor}</span>
                        </div>
                        <div className="text-xs text-neutral-600 mt-1">За</div>
                      </div>
                      <div className="bg-yellow-50 p-2 rounded text-center">
                        <div className="flex items-center justify-center">
                          <AlertCircle className="h-3 w-3 mr-1 text-yellow-500" />
                          <span className="font-medium">{proposal.votesAbstain}</span>
                        </div>
                        <div className="text-xs text-neutral-600 mt-1">Воздержались</div>
                      </div>
                      <div className="bg-red-50 p-2 rounded text-center">
                        <div className="flex items-center justify-center">
                          <ThumbsDown className="h-3 w-3 mr-1 text-red-600" />
                          <span className="font-medium">{proposal.votesAgainst}</span>
                        </div>
                        <div className="text-xs text-neutral-600 mt-1">Против</div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 flex justify-between">
                    <Button 
                      onClick={() => setShowVotesList(proposal.id)}
                      size="sm" 
                      variant="outline"
                      className="text-xs"
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Список голосов
                    </Button>
                    
                    <div className="flex items-center text-xs text-slate-500">
                      {proposal.blockchain?.confirmed ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center">
                                <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                                <span>В блокчейне</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs break-all">
                                Запись подтверждена в блокчейне. <br />
                                Хеш: {proposal.blockchain.transactionHash}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-amber-500" />
                          <span>Ожидает подтверждения</span>
                        </div>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Диалог для создания нового голосования */}
      <Dialog 
        open={showNewProposalDialog} 
        onOpenChange={setShowNewProposalDialog}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Создать новое предложение</DialogTitle>
            <DialogDescription>
              Заполните форму для создания нового предложения для DAO голосования.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(createProposalMutation.mutate)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название предложения</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите название предложения" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание предложения</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Детально опишите ваше предложение..." 
                        className="h-32" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Категория</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите категорию" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Процессы">Процессы</SelectItem>
                            <SelectItem value="Безопасность">Безопасность</SelectItem>
                            <SelectItem value="Разработка">Разработка</SelectItem>
                            <SelectItem value="Кадры">Кадры</SelectItem>
                            <SelectItem value="Стратегия">Стратегия</SelectItem>
                            <SelectItem value="Финансы">Финансы</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="votingPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Период голосования</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите период" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 день</SelectItem>
                            <SelectItem value="3">3 дня</SelectItem>
                            <SelectItem value="7">7 дней</SelectItem>
                            <SelectItem value="14">14 дней</SelectItem>
                            <SelectItem value="30">30 дней</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="documentLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ссылка на документ (опционально)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Порог принятия (%)</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите порог" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="50">50% (Простое большинство)</SelectItem>
                            <SelectItem value="66">66% (Квалифицированное большинство)</SelectItem>
                            <SelectItem value="75">75% (Сверхбольшинство)</SelectItem>
                            <SelectItem value="90">90% (Почти единогласно)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-800" />
                <AlertTitle className="text-yellow-800">Внимание</AlertTitle>
                <AlertDescription className="text-yellow-800">
                  Предложение будет записано в блокчейн и не может быть изменено после создания.
                </AlertDescription>
              </Alert>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNewProposalDialog(false)}
                >
                  Отмена
                </Button>
                <Button 
                  type="submit"
                  disabled={createProposalMutation.isPending}
                >
                  {createProposalMutation.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Создание...
                    </>
                  ) : "Создать предложение"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Диалог для просмотра информации о голосовании */}
      <Dialog open={showProposalDetails !== null} onOpenChange={(open) => !open && setShowProposalDetails(null)}>
        <DialogContent className="sm:max-w-[700px]">
          {showProposalDetails && (
            <>
              <DialogHeader className="mb-2">
                <div className="flex justify-between items-start mb-2">
                  <Badge className="mb-1" variant="outline">{showProposalDetails.category}</Badge>
                  <Badge className={cn(getVotingStatus(showProposalDetails).color)}>
                    {getVotingStatus(showProposalDetails).text}
                  </Badge>
                </div>
                <DialogTitle>{showProposalDetails.title}</DialogTitle>
                <DialogDescription className="flex flex-col space-y-1 mt-2">
                  <span>Создано: {format(new Date(showProposalDetails.createdAt), "dd MMM yyyy", { locale: ru })}</span>
                  <span>Автор: {showProposalDetails.creator?.fullName}</span>
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="info" className="mt-2">
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="info">Информация</TabsTrigger>
                  <TabsTrigger value="history">История действий</TabsTrigger>
                </TabsList>
                
                <TabsContent value="info" className="space-y-4">
                  <p className="text-neutral-700 whitespace-pre-line">
                    {showProposalDetails.description}
                  </p>
                  
                  {showProposalDetails.documentLink && (
                    <div className="flex items-center">
                      <Link className="h-4 w-4 mr-2 text-blue-600" />
                      <a 
                        href={showProposalDetails.documentLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Ссылка на документ
                      </a>
                    </div>
                  )}
                
                  <div className="bg-neutral-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Информация о голосовании</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div className="bg-white p-3 rounded shadow-sm">
                        <div className="text-xs text-neutral-500">Порог принятия</div>
                        <div className="text-lg font-medium">{showProposalDetails.threshold}%</div>
                      </div>
                      <div className="bg-white p-3 rounded shadow-sm">
                        <div className="text-xs text-neutral-500">Всего голосов</div>
                        <div className="text-lg font-medium">
                          {showProposalDetails.votesFor + showProposalDetails.votesAgainst + showProposalDetails.votesAbstain}
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded shadow-sm">
                        <div className="text-xs text-neutral-500">Завершается</div>
                        <div className="text-lg font-medium">
                          {format(new Date(showProposalDetails.endDate), "d MMMM", { locale: ru })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-neutral-500 mb-1">
                        <span>За: {calculatePercentage(showProposalDetails)}%</span>
                        <span>Необходимо: {showProposalDetails.threshold}%</span>
                      </div>
                      <Progress 
                        value={calculatePercentage(showProposalDetails)} 
                        max={100} 
                        className={`h-2.5 ${getProgressColor(showProposalDetails)}`}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className="bg-green-50 p-2 rounded text-center">
                        <div className="flex items-center justify-center">
                          <ThumbsUp className="h-4 w-4 mr-1 text-green-600" />
                          <span className="font-medium">{showProposalDetails.votesFor}</span>
                        </div>
                        <div className="text-xs text-neutral-600 mt-1">За</div>
                      </div>
                      <div className="bg-yellow-50 p-2 rounded text-center">
                        <div className="flex items-center justify-center">
                          <AlertCircle className="h-4 w-4 mr-1 text-yellow-500" />
                          <span className="font-medium">{showProposalDetails.votesAbstain}</span>
                        </div>
                        <div className="text-xs text-neutral-600 mt-1">Воздержались</div>
                      </div>
                      <div className="bg-red-50 p-2 rounded text-center">
                        <div className="flex items-center justify-center">
                          <ThumbsDown className="h-4 w-4 mr-1 text-red-600" />
                          <span className="font-medium">{showProposalDetails.votesAgainst}</span>
                        </div>
                        <div className="text-xs text-neutral-600 mt-1">Против</div>
                      </div>
                    </div>
                  </div>
                  
                  {showProposalDetails.status === "active" && (
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium mb-3">Ваш голос</h4>
                      
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <Button 
                          variant={userVote === "for" ? "default" : "outline"}
                          className={cn(
                            "flex items-center justify-center",
                            userVote === "for" && "bg-green-600 hover:bg-green-700"
                          )}
                          onClick={() => setUserVote("for")}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          За
                        </Button>
                        <Button 
                          variant={userVote === "abstain" ? "default" : "outline"}
                          className={cn(
                            "flex items-center justify-center",
                            userVote === "abstain" && "bg-yellow-500 hover:bg-yellow-600"
                          )}
                          onClick={() => setUserVote("abstain")}
                        >
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Воздержаться
                        </Button>
                        <Button 
                          variant={userVote === "against" ? "default" : "outline"}
                          className={cn(
                            "flex items-center justify-center",
                            userVote === "against" && "bg-red-600 hover:bg-red-700"
                          )}
                          onClick={() => setUserVote("against")}
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          Против
                        </Button>
                      </div>
                      
                      {userVote && (
                        <>
                          <Textarea 
                            placeholder="Добавьте комментарий к вашему голосу (опционально)" 
                            className="mb-4 h-20" 
                            value={voteRationale}
                            onChange={(e) => setVoteRationale(e.target.value)}
                          />
                          
                          <Alert className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Важно!</AlertTitle>
                            <AlertDescription>
                              Ваш голос будет записан в блокчейн и не может быть изменен после отправки.
                            </AlertDescription>
                          </Alert>
                          
                          <Button 
                            className="w-full" 
                            onClick={handleVote}
                            disabled={voteProposalMutation.isPending}
                          >
                            {voteProposalMutation.isPending ? (
                              <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                Отправка голоса...
                              </>
                            ) : "Проголосовать"}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                  
                  {showProposalDetails.blockchain && (
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Информация о блокчейн-записи</h4>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Link className="h-4 w-4 mr-2 text-blue-600" />
                          <span className="text-xs text-neutral-600 font-mono">
                            {showProposalDetails.blockchain.transactionHash}
                          </span>
                        </div>
                        <div className="flex items-center">
                          {showProposalDetails.blockchain.confirmed ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />
                              <span className="text-xs text-green-600">Подтверждена</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-4 w-4 mr-1 text-yellow-500" />
                              <span className="text-xs text-yellow-500">Ожидает подтверждения</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="history" className="space-y-4">
                  <div className="bg-slate-50 rounded-md p-4">
                    <div className="mb-3">
                      <h4 className="text-sm font-medium flex items-center gap-2 text-slate-600">
                        <Info size={16} />
                        <span>История действий</span>
                      </h4>
                    </div>
                    
                    <div className="space-y-2 max-h-80 overflow-y-auto p-1">
                      <div className="flex items-start p-2 border-l-2 border-emerald-500 pl-3 bg-slate-50 rounded-sm">
                        <div className="mr-3 mt-1 text-emerald-500">
                          <Plus size={16} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">Создано новое предложение: {showProposalDetails.title}</p>
                          <div className="flex items-center mt-1">
                            <p className="text-xs text-slate-500">
                              {format(new Date(showProposalDetails.createdAt), "dd MMM yyyy, HH:mm", { locale: ru })}
                            </p>
                            {showProposalDetails.blockchain?.transactionHash && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="ml-2 flex items-center text-xs text-emerald-600">
                                      <Link size={12} className="mr-1" />
                                      <span>Blockchain</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs break-all max-w-xs">
                                      Хеш транзакции: {showProposalDetails.blockchain.transactionHash}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {showProposalDetails.votesFor + showProposalDetails.votesAgainst + showProposalDetails.votesAbstain > 0 && (
                        <div className="flex items-start p-2 border-l-2 border-blue-500 pl-3 bg-slate-50 rounded-sm">
                          <div className="mr-3 mt-1 text-blue-500">
                            <Vote size={16} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">Поступил голос: За</p>
                            <div className="flex items-center mt-1">
                              <p className="text-xs text-slate-500">
                                {format(new Date(new Date(showProposalDetails.createdAt).getTime() + 3600000), "dd MMM yyyy, HH:mm", { locale: ru })}
                              </p>
                              <div className="ml-2 flex items-center text-xs text-emerald-600">
                                <Link size={12} className="mr-1" />
                                <span>Blockchain</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {showProposalDetails.votesAgainst > 0 && (
                        <div className="flex items-start p-2 border-l-2 border-red-500 pl-3 bg-slate-50 rounded-sm">
                          <div className="mr-3 mt-1 text-red-500">
                            <Vote size={16} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">Поступил голос: Против</p>
                            <div className="flex items-center mt-1">
                              <p className="text-xs text-slate-500">
                                {format(new Date(new Date(showProposalDetails.createdAt).getTime() + 7200000), "dd MMM yyyy, HH:mm", { locale: ru })}
                              </p>
                              <div className="ml-2 flex items-center text-xs text-emerald-600">
                                <Link size={12} className="mr-1" />
                                <span>Blockchain</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Диалог для просмотра голосов */}
      <Dialog open={showVotesList !== null} onOpenChange={(open) => !open && setShowVotesList(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Список голосов</DialogTitle>
            <DialogDescription>
              {proposals?.find(p => p.id === showVotesList)?.title}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingVotes ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full"></div>
            </div>
          ) : votes && votes.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto p-1">
              {votes.map(vote => (
                <div 
                  key={vote.id} 
                  className={cn(
                    "p-3 rounded-lg border",
                    vote.vote === "for" ? "bg-green-50 border-green-200" : 
                    vote.vote === "against" ? "bg-red-50 border-red-200" : 
                    "bg-yellow-50 border-yellow-200"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-white",
                          vote.vote === "for" ? "bg-green-600" : 
                          vote.vote === "against" ? "bg-red-600" : 
                          "bg-yellow-500"
                        )}
                      >
                        {vote.vote === "for" ? (
                          <ThumbsUp className="h-4 w-4" />
                        ) : vote.vote === "against" ? (
                          <ThumbsDown className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="ml-3">
                        <div className="font-medium">{vote.userName}</div>
                        <div className="text-xs text-neutral-600">{vote.userDepartment}</div>
                      </div>
                    </div>
                    <Badge 
                      className={cn(
                        vote.vote === "for" ? "bg-green-100 text-green-800 hover:bg-green-100" : 
                        vote.vote === "against" ? "bg-red-100 text-red-800 hover:bg-red-100" : 
                        "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                      )}
                    >
                      {vote.vote === "for" ? "За" : vote.vote === "against" ? "Против" : "Воздержался"}
                    </Badge>
                  </div>
                  
                  {vote.rationale && (
                    <div className="mt-2 text-sm text-neutral-700 bg-white p-2 rounded-md border border-neutral-200">
                      {vote.rationale}
                    </div>
                  )}
                  
                  <div className="mt-2 text-xs text-neutral-500">
                    {format(new Date(vote.timestamp), "dd MMM yyyy, HH:mm", { locale: ru })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-neutral-500">
              Пока нет голосов для этого предложения
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DAOVoting;