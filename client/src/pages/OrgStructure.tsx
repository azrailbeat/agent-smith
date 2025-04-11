import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
import { Badge } from "@/components/ui/badge";
import { 
  Building,
  UsersRound, 
  User, 
  UserCog, 
  Building2, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  Trash2,
  Search,
  ClipboardList,
  FileCheck,
  FileEdit,
  Check,
  X,
  RefreshCw,
  Mail
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Типы данных
type Department = {
  id: number;
  name: string;
  description?: string;
  parentId?: number;
  headId?: number;
  children?: Department[];
  level?: number;
  headName?: string;
};

type Position = {
  id: number;
  name: string;
  departmentId: number;
  level: number;
  canApprove: boolean;
  canAssign: boolean;
  employees?: User[];
};

type User = {
  id: number;
  username: string;
  fullName: string;
  departmentId?: number;
  positionId?: number;
  department?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
};

type TaskDistributionRule = {
  id: number;
  name: string;
  description: string;
  sourceType: "meeting" | "citizen_request" | "document";
  keywords: string[];
  departmentId: number;
  positionId: number;
  isActive: boolean;
};

const OrgStructurePage = () => {
  const { toast } = useToast();
  
  // Состояния для диалогов
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [showPositionDialog, setShowPositionDialog] = useState(false);
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [editingRule, setEditingRule] = useState<TaskDistributionRule | null>(null);
  
  // Состояния для поиска
  const [searchQuery, setSearchQuery] = useState("");
  
  // Демо данные для отделов
  const demoDepartments: Department[] = [
    {
      id: 1,
      name: "Министерство цифрового развития",
      description: "Главный орган по цифровизации государственных услуг",
      level: 0,
      headId: 1,
      headName: "Айнур Бекова",
      children: [
        {
          id: 2,
          name: "Департамент цифровых услуг",
          description: "Разработка и реализация цифровых государственных услуг",
          parentId: 1,
          level: 1,
          headId: 2,
          headName: "Петров Петр",
          children: [
            {
              id: 5,
              name: "Отдел разработки",
              description: "Разработка программного обеспечения",
              parentId: 2,
              level: 2,
              headId: 5,
              headName: "Семенов Семен"
            },
            {
              id: 6,
              name: "Отдел поддержки",
              description: "Техническая поддержка ИТ-систем",
              parentId: 2,
              level: 2,
              headId: 6,
              headName: "Смирнов Алексей"
            }
          ]
        },
        {
          id: 3,
          name: "Департамент инноваций",
          description: "Внедрение инновационных технологий",
          parentId: 1,
          level: 1,
          headId: 3,
          headName: "Смирнова Анна",
          children: [
            {
              id: 7,
              name: "Отдел искусственного интеллекта",
              description: "Разработка и внедрение систем искусственного интеллекта",
              parentId: 3,
              level: 2,
              headId: 7,
              headName: "Иванова Мария"
            }
          ]
        },
        {
          id: 4,
          name: "Департамент кибербезопасности",
          description: "Обеспечение информационной безопасности",
          parentId: 1,
          level: 1,
          headId: 4,
          headName: "Козлов Владимир"
        }
      ]
    }
  ];
  
  // Демо данные для должностей
  const demoPositions: Position[] = [
    { id: 1, name: "Министр", departmentId: 1, level: 0, canApprove: true, canAssign: true },
    { id: 2, name: "Директор департамента", departmentId: 2, level: 1, canApprove: true, canAssign: true },
    { id: 3, name: "Директор департамента", departmentId: 3, level: 1, canApprove: true, canAssign: true },
    { id: 4, name: "Директор департамента", departmentId: 4, level: 1, canApprove: true, canAssign: true },
    { id: 5, name: "Начальник отдела", departmentId: 5, level: 2, canApprove: true, canAssign: true },
    { id: 6, name: "Начальник отдела", departmentId: 6, level: 2, canApprove: true, canAssign: true },
    { id: 7, name: "Начальник отдела", departmentId: 7, level: 2, canApprove: true, canAssign: true },
    { id: 8, name: "Главный специалист", departmentId: 5, level: 3, canApprove: false, canAssign: false },
    { id: 9, name: "Главный специалист", departmentId: 6, level: 3, canApprove: false, canAssign: false },
    { id: 10, name: "Главный специалист", departmentId: 7, level: 3, canApprove: false, canAssign: false },
    { id: 11, name: "Специалист", departmentId: 5, level: 4, canApprove: false, canAssign: false },
    { id: 12, name: "Специалист", departmentId: 6, level: 4, canApprove: false, canAssign: false },
    { id: 13, name: "Специалист", departmentId: 7, level: 4, canApprove: false, canAssign: false },
  ];
  
  // Демо данные для пользователей
  const demoUsers: User[] = [
    { id: 1, username: "abekova", fullName: "Айнур Бекова", departmentId: 1, positionId: 1, department: "Министерство цифрового развития", email: "ainur.bekova@gov.kz", phone: "+7 (701) 111-11-11" },
    { id: 2, username: "petrov", fullName: "Петров Петр", departmentId: 2, positionId: 2, department: "Департамент цифровых услуг", email: "petrov@gov.kz", phone: "+7 (701) 222-22-22" },
    { id: 3, username: "asmyrnova", fullName: "Смирнова Анна", departmentId: 3, positionId: 3, department: "Департамент инноваций", email: "asmyrnova@gov.kz", phone: "+7 (701) 333-33-33" },
    { id: 4, username: "vkozlov", fullName: "Козлов Владимир", departmentId: 4, positionId: 4, department: "Департамент кибербезопасности", email: "vkozlov@gov.kz", phone: "+7 (701) 444-44-44" },
    { id: 5, username: "ssemenov", fullName: "Семенов Семен", departmentId: 5, positionId: 5, department: "Отдел разработки", email: "ssemenov@gov.kz", phone: "+7 (701) 555-55-55" },
    { id: 6, username: "asmyrnov", fullName: "Смирнов Алексей", departmentId: 6, positionId: 6, department: "Отдел поддержки", email: "asmyrnov@gov.kz", phone: "+7 (701) 666-66-66" },
    { id: 7, username: "mivanova", fullName: "Иванова Мария", departmentId: 7, positionId: 7, department: "Отдел искусственного интеллекта", email: "mivanova@gov.kz", phone: "+7 (701) 777-77-77" },
  ];
  
  // Демо данные для правил распределения задач
  const demoRules: TaskDistributionRule[] = [
    { 
      id: 1, 
      name: "Распределение задач по разработке", 
      description: "Автоматическое распределение задач, связанных с разработкой ПО",
      sourceType: "meeting",
      keywords: ["разработка", "ПО", "программирование", "код", "приложение"],
      departmentId: 5,
      positionId: 5,
      isActive: true
    },
    { 
      id: 2, 
      name: "Распределение задач поддержки", 
      description: "Автоматическое распределение задач технической поддержки",
      sourceType: "citizen_request",
      keywords: ["поддержка", "ошибка", "проблема", "сбой", "помощь"],
      departmentId: 6,
      positionId: 6,
      isActive: true
    },
    { 
      id: 3, 
      name: "Распределение задач по ИИ", 
      description: "Автоматическое распределение задач связанных с ИИ",
      sourceType: "document",
      keywords: ["ИИ", "искусственный интеллект", "машинное обучение", "НЛП", "анализ данных"],
      departmentId: 7,
      positionId: 7,
      isActive: true
    },
  ];
  
  // Запросы к API
  const { data: departments = demoDepartments, isLoading: isDepartmentsLoading } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
    enabled: false, // Отключаем, пока не реализовано API
  });
  
  const { data: positions = demoPositions, isLoading: isPositionsLoading } = useQuery<Position[]>({
    queryKey: ['/api/positions'],
    enabled: false,
  });
  
  const { data: users = demoUsers, isLoading: isUsersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: false,
  });
  
  const { data: rules = demoRules, isLoading: isRulesLoading } = useQuery<TaskDistributionRule[]>({
    queryKey: ['/api/task-rules'],
    enabled: false,
  });
  
  // Мутации для сохранения данных
  const saveDepartmentMutation = useMutation({
    mutationFn: (department: Department) => {
      // Добавить или обновить отдел
      if (department.id) {
        return apiRequest(`/api/departments/${department.id}`, { method: 'PATCH', data: department });
      } else {
        return apiRequest('/api/departments', { method: 'POST', data: department });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      setShowDepartmentDialog(false);
      setEditingDepartment(null);
      toast({
        title: "Успешно!",
        description: "Отдел сохранен",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить отдел",
        variant: "destructive",
      });
    }
  });
  
  const savePositionMutation = useMutation({
    mutationFn: (position: Position) => {
      if (position.id) {
        return apiRequest(`/api/positions/${position.id}`, { method: 'PATCH', data: position });
      } else {
        return apiRequest('/api/positions', { method: 'POST', data: position });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
      setShowPositionDialog(false);
      setEditingPosition(null);
      toast({
        title: "Успешно!",
        description: "Должность сохранена",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить должность",
        variant: "destructive",
      });
    }
  });
  
  const saveRuleMutation = useMutation({
    mutationFn: (rule: TaskDistributionRule) => {
      if (rule.id) {
        return apiRequest(`/api/task-rules/${rule.id}`, { method: 'PATCH', data: rule });
      } else {
        return apiRequest('/api/task-rules', { method: 'POST', data: rule });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-rules'] });
      setShowRuleDialog(false);
      setEditingRule(null);
      toast({
        title: "Успешно!",
        description: "Правило сохранено",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить правило",
        variant: "destructive",
      });
    }
  });
  
  // Обработчики добавления/редактирования
  const handleAddDepartment = (parentId?: number) => {
    setEditingDepartment({
      id: 0,
      name: "",
      description: "",
      parentId: parentId
    });
    setShowDepartmentDialog(true);
  };
  
  const handleEditDepartment = (department: Department) => {
    setEditingDepartment({...department});
    setShowDepartmentDialog(true);
  };
  
  const handleAddPosition = (departmentId: number) => {
    setEditingPosition({
      id: 0,
      name: "",
      departmentId,
      level: 0,
      canApprove: false,
      canAssign: false
    });
    setShowPositionDialog(true);
  };
  
  const handleEditPosition = (position: Position) => {
    setEditingPosition({...position});
    setShowPositionDialog(true);
  };
  
  const handleAddRule = () => {
    setEditingRule({
      id: 0,
      name: "",
      description: "",
      sourceType: "meeting",
      keywords: [],
      departmentId: 0,
      positionId: 0,
      isActive: true
    });
    setShowRuleDialog(true);
  };
  
  const handleEditRule = (rule: TaskDistributionRule) => {
    setEditingRule({...rule});
    setShowRuleDialog(true);
  };
  
  // Функция для рендеринга дерева подразделений
  const renderDepartmentTree = (departments: Department[], level = 0) => {
    return departments.map(department => (
      <div key={department.id} className={`ml-${level * 6} mb-4`}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <div className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2 text-primary" />
                  <CardTitle className="text-lg font-semibold">{department.name}</CardTitle>
                </div>
                {department.description && (
                  <CardDescription className="mt-1">{department.description}</CardDescription>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleEditDepartment(department)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Изменить
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleAddDepartment(department.id)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить подразделение
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {department.headId && (
              <div className="mb-4 p-3 bg-muted rounded-md flex items-center">
                <User className="h-5 w-5 mr-2 text-primary" />
                <div>
                  <div className="font-medium">{department.headName}</div>
                  <div className="text-sm text-muted-foreground">Руководитель</div>
                </div>
              </div>
            )}
            
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <UserCog className="h-4 w-4 mr-1" />
                Должности
              </h4>
              <div className="space-y-2">
                {positions
                  .filter(pos => pos.departmentId === department.id)
                  .map(position => (
                    <div key={position.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center">
                        <Badge className="mr-2">{position.name}</Badge>
                        <span className="text-sm text-muted-foreground">
                          Уровень: {position.level}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        {position.canApprove && (
                          <Badge variant="outline" className="bg-green-50 text-green-700">Утверждение</Badge>
                        )}
                        {position.canAssign && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">Назначение</Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleEditPosition(position)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                <Button variant="outline" size="sm" className="mt-2" onClick={() => handleAddPosition(department.id)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить должность
                </Button>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <UsersRound className="h-4 w-4 mr-1" />
                Сотрудники
              </h4>
              <div className="space-y-2">
                {users
                  .filter(user => user.departmentId === department.id)
                  .map(user => {
                    const userPosition = positions.find(p => p.id === user.positionId);
                    return (
                      <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.fullName} className="w-8 h-8 rounded-full" />
                            ) : (
                              <User className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{user.fullName}</div>
                            <div className="text-xs text-muted-foreground">
                              {userPosition?.name || 'Нет должности'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {user.email && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`mailto:${user.email}`}>
                                <Mail className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {department.children && department.children.length > 0 && (
          <div className="mt-2 pl-6 border-l-2 border-gray-200">
            {renderDepartmentTree(department.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };
  
  return (
    <>
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Организационная структура</h1>
            <p className="mt-2 text-sm text-neutral-700">
              Управление структурой организации, подразделениями и распределением задач
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button onClick={() => handleAddDepartment()}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить подразделение
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="structure">
        <TabsList className="mb-6">
          <TabsTrigger value="structure" className="flex items-center">
            <Building className="h-4 w-4 mr-2" />
            Структура
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center">
            <ClipboardList className="h-4 w-4 mr-2" />
            Правила распределения
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="structure">
          <div className="mb-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Поиск</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Поиск по отделам, должностям и сотрудникам..." 
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {isDepartmentsLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-neutral-100 rounded-lg"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {renderDepartmentTree(departments)}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="rules">
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Правила автоматического распределения задач</h2>
              <Button onClick={handleAddRule}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить правило
              </Button>
            </div>
          </div>
          
          {isRulesLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-neutral-100 rounded-lg"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map(rule => {
                const department = departments.flatMap(d => [d, ...(d.children || [])]).flat().find(d => d.id === rule.departmentId);
                const position = positions.find(p => p.id === rule.positionId);
                
                return (
                  <Card key={rule.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <CardTitle className="text-lg">{rule.name}</CardTitle>
                          {rule.isActive ? (
                            <Badge className="ml-2 bg-green-100 text-green-800">Активно</Badge>
                          ) : (
                            <Badge variant="outline" className="ml-2">Неактивно</Badge>
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleEditRule(rule)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Изменить
                        </Button>
                      </div>
                      <CardDescription>{rule.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Источник задач</h4>
                          <Badge className="bg-blue-100 text-blue-800">
                            {rule.sourceType === "meeting" && "Протоколы встреч"}
                            {rule.sourceType === "citizen_request" && "Обращения граждан"}
                            {rule.sourceType === "document" && "Документы"}
                          </Badge>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">Ключевые слова</h4>
                          <div className="flex flex-wrap gap-1">
                            {rule.keywords.map((keyword, index) => (
                              <Badge key={index} variant="outline">{keyword}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">Назначается</h4>
                          <div className="text-sm">
                            <div className="flex items-center">
                              <Building2 className="h-4 w-4 mr-1 text-neutral-500" />
                              {department?.name || "Не указан отдел"}
                            </div>
                            <div className="flex items-center mt-1">
                              <UserCog className="h-4 w-4 mr-1 text-neutral-500" />
                              {position?.name || "Не указана должность"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {rules.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-6">
                    <ClipboardList className="h-12 w-12 text-neutral-300 mb-4" />
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">Нет правил распределения</h3>
                    <p className="text-neutral-500 text-center max-w-md mb-4">
                      Создайте правила для автоматического распределения задач сотрудникам на основе протоколов, обращений и документов.
                    </p>
                    <Button onClick={handleAddRule}>
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить правило
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Диалог добавления/редактирования отдела */}
      <Dialog open={showDepartmentDialog} onOpenChange={setShowDepartmentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDepartment?.id ? 'Редактирование отдела' : 'Новый отдел'}</DialogTitle>
            <DialogDescription>
              Укажите информацию об отделе организации.
            </DialogDescription>
          </DialogHeader>
          
          {editingDepartment && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dept-name">Название отдела</Label>
                <Input 
                  id="dept-name" 
                  value={editingDepartment.name} 
                  onChange={(e) => setEditingDepartment({...editingDepartment, name: e.target.value})}
                  placeholder="Введите название отдела"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dept-description">Описание</Label>
                <Textarea 
                  id="dept-description" 
                  value={editingDepartment.description || ''} 
                  onChange={(e) => setEditingDepartment({...editingDepartment, description: e.target.value})}
                  placeholder="Опишите функции и назначение отдела"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dept-head">Руководитель</Label>
                <select 
                  id="dept-head"
                  className="w-full border-neutral-200 rounded-md"
                  value={editingDepartment.headId || ''}
                  onChange={(e) => setEditingDepartment({...editingDepartment, headId: parseInt(e.target.value) || undefined})}
                >
                  <option value="">Выберите руководителя</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.fullName}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepartmentDialog(false)}>Отмена</Button>
            <Button 
              onClick={() => editingDepartment && saveDepartmentMutation.mutate(editingDepartment)}
              disabled={saveDepartmentMutation.isPending}
            >
              {saveDepartmentMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог добавления/редактирования должности */}
      <Dialog open={showPositionDialog} onOpenChange={setShowPositionDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPosition?.id ? 'Редактирование должности' : 'Новая должность'}</DialogTitle>
            <DialogDescription>
              Укажите информацию о должности.
            </DialogDescription>
          </DialogHeader>
          
          {editingPosition && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pos-name">Название должности</Label>
                <Input 
                  id="pos-name" 
                  value={editingPosition.name} 
                  onChange={(e) => setEditingPosition({...editingPosition, name: e.target.value})}
                  placeholder="Введите название должности"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pos-level">Уровень в иерархии</Label>
                <Input 
                  id="pos-level" 
                  type="number" 
                  min="0"
                  value={editingPosition.level} 
                  onChange={(e) => setEditingPosition({...editingPosition, level: parseInt(e.target.value) || 0})}
                  placeholder="Уровень (0 - высший)"
                />
                <p className="text-sm text-muted-foreground">0 - руководитель, 1 - заместитель и т.д.</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pos-approve">Право утверждения</Label>
                  <Switch 
                    id="pos-approve"
                    checked={editingPosition.canApprove}
                    onCheckedChange={(checked) => setEditingPosition({...editingPosition, canApprove: checked})}
                  />
                </div>
                <p className="text-sm text-muted-foreground">Сотрудник может утверждать документы и задачи</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pos-assign">Право назначения</Label>
                  <Switch 
                    id="pos-assign"
                    checked={editingPosition.canAssign}
                    onCheckedChange={(checked) => setEditingPosition({...editingPosition, canAssign: checked})}
                  />
                </div>
                <p className="text-sm text-muted-foreground">Сотрудник может назначать задачи другим</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPositionDialog(false)}>Отмена</Button>
            <Button 
              onClick={() => editingPosition && savePositionMutation.mutate(editingPosition)}
              disabled={savePositionMutation.isPending}
            >
              {savePositionMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог добавления/редактирования правила распределения */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingRule?.id ? 'Редактирование правила' : 'Новое правило распределения'}</DialogTitle>
            <DialogDescription>
              Настройте правило для автоматического распределения задач.
            </DialogDescription>
          </DialogHeader>
          
          {editingRule && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Название правила</Label>
                <Input 
                  id="rule-name" 
                  value={editingRule.name} 
                  onChange={(e) => setEditingRule({...editingRule, name: e.target.value})}
                  placeholder="Введите название правила"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rule-description">Описание</Label>
                <Textarea 
                  id="rule-description" 
                  value={editingRule.description || ''} 
                  onChange={(e) => setEditingRule({...editingRule, description: e.target.value})}
                  placeholder="Опишите назначение правила"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rule-source">Источник задач</Label>
                <select 
                  id="rule-source"
                  className="w-full border-neutral-200 rounded-md"
                  value={editingRule.sourceType}
                  onChange={(e) => setEditingRule({...editingRule, sourceType: e.target.value as any})}
                >
                  <option value="meeting">Протоколы встреч</option>
                  <option value="citizen_request">Обращения граждан</option>
                  <option value="document">Документы</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rule-keywords">Ключевые слова (через запятую)</Label>
                <Input 
                  id="rule-keywords" 
                  value={editingRule.keywords.join(', ')} 
                  onChange={(e) => setEditingRule({
                    ...editingRule, 
                    keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                  })}
                  placeholder="Введите ключевые слова через запятую"
                />
                <p className="text-sm text-muted-foreground">
                  Задачи, содержащие эти ключевые слова, будут автоматически распределяться
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-department">Отдел</Label>
                  <select 
                    id="rule-department"
                    className="w-full border-neutral-200 rounded-md"
                    value={editingRule.departmentId || ''}
                    onChange={(e) => setEditingRule({...editingRule, departmentId: parseInt(e.target.value) || 0})}
                  >
                    <option value="">Выберите отдел</option>
                    {departments.flatMap(d => [
                      d,
                      ...(d.children || []).flatMap(c => [
                        c,
                        ...(c.children || [])
                      ])
                    ]).map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rule-position">Должность</Label>
                  <select 
                    id="rule-position"
                    className="w-full border-neutral-200 rounded-md"
                    value={editingRule.positionId || ''}
                    onChange={(e) => setEditingRule({...editingRule, positionId: parseInt(e.target.value) || 0})}
                  >
                    <option value="">Выберите должность</option>
                    {positions
                      .filter(p => !editingRule.departmentId || p.departmentId === editingRule.departmentId)
                      .map(pos => (
                        <option key={pos.id} value={pos.id}>
                          {pos.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rule-active">Правило активно</Label>
                  <Switch 
                    id="rule-active"
                    checked={editingRule.isActive}
                    onCheckedChange={(checked) => setEditingRule({...editingRule, isActive: checked})}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Если неактивно, правило не будет применяться при распределении задач
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>Отмена</Button>
            <Button 
              onClick={() => editingRule && saveRuleMutation.mutate(editingRule)}
              disabled={saveRuleMutation.isPending}
            >
              {saveRuleMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OrgStructurePage;