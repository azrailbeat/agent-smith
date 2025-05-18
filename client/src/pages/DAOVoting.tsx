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

  // Фильтрация предложений в зависимости от выбранной вкладки
  const filteredProposals = proposals?.filter(proposal => {
    if (activeTab === "active") return proposal.status === "active" || proposal.status === "pending";
    if (activeTab === "completed") return proposal.status === "completed";
    if (activeTab === "rejected") return proposal.status === "rejected";
    return true;
  });

  // Функция для определения цвета статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Функция для определения статуса на русском
  const getStatusName = (status: string) => {
    switch (status) {
      case 'active': return 'Активно';
      case 'pending': return 'Ожидает';
      case 'completed': return 'Принято';
      case 'rejected': return 'Отклонено';
      default: return status;
    }
  };

  // Функция для получения иконки статуса
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="h-4 w-4 mr-1" />;
      case 'pending': return <Hourglass className="h-4 w-4 mr-1" />;
      case 'completed': return <Check className="h-4 w-4 mr-1" />;
      case 'rejected': return <X className="h-4 w-4 mr-1" />;
      default: return null;
    }
  };

  // Функция для расчета процента голосов "за"
  const calculatePercentage = (proposal: Proposal) => {
    const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
    if (totalVotes === 0) return 0;
    
    // Расчет процента голосов "за" без учета воздержавшихся
    const totalDecisiveVotes = proposal.votesFor + proposal.votesAgainst;
    if (totalDecisiveVotes === 0) return 0;
    
    return Math.round((proposal.votesFor / totalDecisiveVotes) * 100);
  };

  // Функция для расчета статуса голосования
  const getVotingStatus = (proposal: Proposal) => {
    const percentage = calculatePercentage(proposal);
    if (percentage >= proposal.threshold) return "будет принято";
    return "будет отклонено";
  };

  // Функция для расчета цвета прогресса голосования
  const getProgressColor = (proposal: Proposal) => {
    const percentage = calculatePercentage(proposal);
    if (percentage >= proposal.threshold) return "bg-green-500";
    if (percentage >= proposal.threshold * 0.7) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="container mx-auto py-6">
      {/* Заголовок страницы и кнопка создания */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold">DAO Голосования</h1>
          <p className="text-neutral-500 mt-1">
            Децентрализованная система принятия решений с блокчейн-верификацией
          </p>
        </div>
        <Dialog open={showNewProposalDialog} onOpenChange={setShowNewProposalDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Новое предложение
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Создать новое предложение</DialogTitle>
              <DialogDescription>
                Заполните данные для создания нового предложения для голосования. 
                После создания оно будет записано в блокчейн.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название</FormLabel>
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
                      <FormLabel>Описание</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Подробно опишите суть предложения" 
                          className="min-h-[120px]" 
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
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите категорию" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="processes">Процессы</SelectItem>
                            <SelectItem value="security">Безопасность</SelectItem>
                            <SelectItem value="development">Разработка</SelectItem>
                            <SelectItem value="hr">Кадры</SelectItem>
                            <SelectItem value="strategy">Стратегия</SelectItem>
                            <SelectItem value="finance">Финансы</SelectItem>
                            <SelectItem value="other">Другое</SelectItem>
                          </SelectContent>
                        </Select>
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
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите период" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1d">1 день</SelectItem>
                            <SelectItem value="3d">3 дня</SelectItem>
                            <SelectItem value="1w">1 неделя</SelectItem>
                            <SelectItem value="2w">2 недели</SelectItem>
                            <SelectItem value="1m">1 месяц</SelectItem>
                          </SelectContent>
                        </Select>
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
                          <Input placeholder="https://docs.example.com/doc" {...field} />
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
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите порог" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="50">50% (простое большинство)</SelectItem>
                            <SelectItem value="66">66% (2/3 голосов)</SelectItem>
                            <SelectItem value="75">75% (3/4 голосов)</SelectItem>
                            <SelectItem value="90">90% (почти единогласно)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Важно!</AlertTitle>
                  <AlertDescription>
                    Создание предложения записывается в блокчейн и не может быть отменено. 
                    Пожалуйста, проверьте все данные перед отправкой.
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
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? "Создание..." : "Создать предложение"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Вкладки для фильтрации голосований */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="mb-6"
      >
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="active">Активные</TabsTrigger>
          <TabsTrigger value="completed">Принятые</TabsTrigger>
          <TabsTrigger value="rejected">Отклоненные</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Список предложений */}
      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredProposals && filteredProposals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProposals.map((proposal) => (
            <Card key={proposal.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className={cn("flex items-center", getStatusColor(proposal.status))}>
                    {getStatusIcon(proposal.status)}
                    {getStatusName(proposal.status)}
                  </Badge>
                  <Badge variant="outline" className="bg-neutral-100">
                    {proposal.category}
                  </Badge>
                </div>
                <CardTitle className="line-clamp-2 text-lg">{proposal.title}</CardTitle>
                <CardDescription className="flex items-center text-xs mt-1">
                  <span>Создано: {format(new Date(proposal.createdAt), "d MMMM yyyy", { locale: ru })}</span>
                  <span className="mx-1">•</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Всего проголосовало: {proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-600 line-clamp-3 mb-4">
                  {proposal.description}
                </p>
                
                {proposal.status === 'active' && (
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-neutral-500 mb-1">
                      <span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              Порог: {proposal.threshold}%
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Необходимый процент голосов "за" для принятия</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                      <span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              Результат: {calculatePercentage(proposal)}%
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Текущий процент голосов "за" (без учета воздержавшихся)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                    </div>
                    <Progress 
                      value={calculatePercentage(proposal)} 
                      max={100} 
                      className={`h-2 ${getProgressColor(proposal)}`}
                    />
                    <div className="mt-2 flex justify-between text-xs">
                      <div className="flex items-center">
                        <ThumbsUp className="h-3.5 w-3.5 mr-1 text-green-600" />
                        <span>{proposal.votesFor}</span>
                      </div>
                      <div className="flex items-center">
                        <AlertCircle className="h-3.5 w-3.5 mr-1 text-yellow-500" />
                        <span>{proposal.votesAbstain}</span>
                      </div>
                      <div className="flex items-center">
                        <ThumbsDown className="h-3.5 w-3.5 mr-1 text-red-600" />
                        <span>{proposal.votesAgainst}</span>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-center text-neutral-500">
                      Осталось: {format(new Date(proposal.endDate), "d MMMM", { locale: ru })} • При текущих голосах {getVotingStatus(proposal)}
                    </div>
                  </div>
                )}
                
                {(proposal.status === 'completed' || proposal.status === 'rejected') && (
                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-500">Итог: {calculatePercentage(proposal)}%</span>
                      <span className="text-neutral-500">Порог: {proposal.threshold}%</span>
                    </div>
                    <Progress 
                      value={calculatePercentage(proposal)} 
                      max={100} 
                      className={`h-2 ${proposal.status === 'completed' ? "bg-green-500" : "bg-red-500"}`}
                    />
                    <div className="mt-2 flex justify-between text-xs">
                      <div className="flex items-center">
                        <ThumbsUp className="h-3.5 w-3.5 mr-1 text-green-600" />
                        <span>{proposal.votesFor}</span>
                      </div>
                      <div className="flex items-center">
                        <AlertCircle className="h-3.5 w-3.5 mr-1 text-yellow-500" />
                        <span>{proposal.votesAbstain}</span>
                      </div>
                      <div className="flex items-center">
                        <ThumbsDown className="h-3.5 w-3.5 mr-1 text-red-600" />
                        <span>{proposal.votesAgainst}</span>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-center text-neutral-500">
                      Завершено: {format(new Date(proposal.endDate), "d MMMM yyyy", { locale: ru })}
                    </div>
                  </div>
                )}
                
                {proposal.blockchain && (
                  <div className="mt-3 text-xs text-neutral-500 flex items-center justify-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center">
                            <Link className="h-3 w-3 mr-1" />
                            <span className="text-xs truncate w-40">
                              {proposal.blockchain.transactionHash.substring(0, 10)}...{proposal.blockchain.transactionHash.substring(proposal.blockchain.transactionHash.length - 8)}
                            </span>
                            {proposal.blockchain.confirmed && (
                              <CheckCircle2 className="h-3 w-3 ml-1 text-green-600" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Транзакция в блокчейне: {proposal.blockchain.transactionHash}</p>
                          <p>Статус: {proposal.blockchain.confirmed ? "Подтверждена" : "Ожидает подтверждения"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between pt-0">
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setShowVotesList(proposal.id);
                  }}
                >
                  <ListChecks className="h-3.5 w-3.5 mr-1" />
                  Голоса
                </Button>
                <Button 
                  size="sm"
                  className="text-xs"
                  onClick={() => setShowProposalDetails(proposal)}
                >
                  <Info className="h-3.5 w-3.5 mr-1" />
                  Подробнее
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center my-12">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto">
            <Vote className="h-8 w-8 text-neutral-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium">Нет предложений для голосования</h3>
          <p className="mt-2 text-neutral-500 max-w-md mx-auto">
            {activeTab === "active" 
              ? "В настоящее время нет активных предложений. Вы можете создать новое предложение, нажав на кнопку выше."
              : `В системе пока нет ${activeTab === "completed" ? "принятых" : "отклоненных"} предложений.`
            }
          </p>
        </div>
      )}
      
      {/* Диалог для просмотра деталей предложения */}
      <Dialog open={!!showProposalDetails} onOpenChange={(open) => !open && setShowProposalDetails(null)}>
        <DialogContent className="sm:max-w-[700px]">
          {showProposalDetails && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={cn("flex items-center", getStatusColor(showProposalDetails.status))}>
                    {getStatusIcon(showProposalDetails.status)}
                    {getStatusName(showProposalDetails.status)}
                  </Badge>
                  <Badge variant="outline" className="bg-neutral-100">
                    {showProposalDetails.category}
                  </Badge>
                </div>
                <DialogTitle className="text-xl">{showProposalDetails.title}</DialogTitle>
                <DialogDescription className="flex flex-col sm:flex-row sm:items-center text-xs mt-1">
                  <span>ID: #{showProposalDetails.id}</span>
                  <span className="hidden sm:inline mx-1">•</span>
                  <span>Создано: {format(new Date(showProposalDetails.createdAt), "d MMMM yyyy", { locale: ru })}</span>
                  <span className="hidden sm:inline mx-1">•</span>
                  <span>Автор: {showProposalDetails.creator?.fullName}</span>
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 my-2">
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
                        >
                          Проголосовать
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
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Диалог для просмотра голосов */}
      <Dialog open={showVotesList !== null} onOpenChange={(open) => !open && setShowVotesList(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Голоса по предложению #{showVotesList}</DialogTitle>
            <DialogDescription>
              Список всех голосов с информацией о том, кто, когда и как проголосовал
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingVotes ? (
            <div className="flex justify-center my-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : votes && votes.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto">
              {votes.map((vote) => (
                <div 
                  key={vote.id} 
                  className="border-b last:border-b-0 py-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        <span className="font-medium text-sm">{vote.userName}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {vote.userDepartment}
                        </Badge>
                      </div>
                      <div className="text-xs text-neutral-500 mt-1">
                        {format(new Date(vote.timestamp), "d MMMM, HH:mm", { locale: ru })}
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "flex items-center",
                        vote.vote === "for" 
                          ? "bg-green-100 text-green-800" 
                          : vote.vote === "against" 
                            ? "bg-red-100 text-red-800" 
                            : "bg-yellow-100 text-yellow-800"
                      )}
                    >
                      {vote.vote === "for" ? (
                        <ThumbsUp className="h-3 w-3 mr-1" />
                      ) : vote.vote === "against" ? (
                        <ThumbsDown className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {vote.vote === "for" ? "За" : vote.vote === "against" ? "Против" : "Воздержался"}
                    </Badge>
                  </div>
                  {vote.rationale && (
                    <div className="mt-2 text-sm text-neutral-600 bg-neutral-50 p-2 rounded">
                      {vote.rationale}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center my-8">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto">
                <Vote className="h-6 w-6 text-neutral-400" />
              </div>
              <h3 className="mt-3 text-sm font-medium">Нет голосов</h3>
              <p className="mt-1 text-xs text-neutral-500">
                По этому предложению еще никто не проголосовал
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DAOVoting;