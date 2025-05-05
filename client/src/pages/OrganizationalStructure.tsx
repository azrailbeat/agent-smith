import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PlusCircle,
  Pencil,
  Trash2,
  Check,
  X,
  Settings,
  File,
  Briefcase,
  Code,
  Headphones,
  Bot,
  Building,
  UserCog,
  Clipboard,
  Copy,
} from "lucide-react";

// Типы данных
interface Department {
  id: number;
  name: string;
  description: string | null;
  parentId: number | null;
  headId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface Position {
  id: number;
  name: string;
  departmentId: number;
  level: number;
  canApprove: boolean;
  canAssign: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface OrganizationalRule {
  id: number;
  name: string;
  description: string | null;
  type: string;
  isActive: boolean;
  sourceType: string;
  keywordsList: string[];
  departmentId: number | null;
  assignToAgentId: number | null;
  assignToPositionId: number | null;
  config: any;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface Agent {
  id: number;
  name: string;
  type: string;
  description: string | null;
  modelId: number | null;
  isActive: boolean;
  systemPrompt: string | null;
  config: any;
}

export default function OrganizationalStructure() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("rules");
  
  // Состояние для диалогов
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [showPositionDialog, setShowPositionDialog] = useState(false);
  
  // Состояние для форм
  const [currentRule, setCurrentRule] = useState<Partial<OrganizationalRule>>({
    name: "",
    description: "",
    type: "development",
    isActive: true,
    sourceType: "citizen_request",
    keywordsList: [],
  });
  
  const [currentDepartment, setCurrentDepartment] = useState<Partial<Department>>({
    name: "",
    description: "",
  });
  
  const [currentPosition, setCurrentPosition] = useState<Partial<Position>>({
    name: "",
    departmentId: 0,
    level: 0,
    canApprove: false,
    canAssign: false,
  });
  
  // Состояние для редактирования
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(null);
  
  const [keywordInput, setKeywordInput] = useState("");
  
  // Запросы данных
  const { data: rules = [], isLoading: isLoadingRules } = useQuery<OrganizationalRule[]>({
    queryKey: ["/api/task-rules"],
  });
  
  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });
  
  const { data: positions = [], isLoading: isLoadingPositions } = useQuery<Position[]>({
    queryKey: ["/api/positions"],
  });
  
  const { data: agents = [], isLoading: isLoadingAgents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });
  
  // Мутации для правил
  const saveRuleMutation = useMutation({
    mutationFn: async (rule: Partial<OrganizationalRule>) => {
      if (isEditMode && selectedRuleId) {
        return await apiRequest("PATCH", `/api/task-rules/${selectedRuleId}`, rule);
      } else {
        return await apiRequest("POST", "/api/task-rules", rule);
      }
    },
    onSuccess: () => {
      toast({
        title: isEditMode ? "Правило обновлено" : "Правило создано",
        description: `Правило "${currentRule.name}" успешно ${isEditMode ? "обновлено" : "создано"}`
      });
      setShowRuleDialog(false);
      resetRuleForm();
      queryClient.invalidateQueries({ queryKey: ["/api/task-rules"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось ${isEditMode ? "обновить" : "создать"} правило: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/task-rules/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Правило удалено",
        description: "Правило успешно удалено"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/task-rules"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось удалить правило: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Мутации для отделов
  const saveDepartmentMutation = useMutation({
    mutationFn: async (department: Partial<Department>) => {
      if (isEditMode && selectedDepartmentId) {
        return await apiRequest("PATCH", `/api/departments/${selectedDepartmentId}`, department);
      } else {
        return await apiRequest("POST", "/api/departments", department);
      }
    },
    onSuccess: () => {
      toast({
        title: isEditMode ? "Отдел обновлен" : "Отдел создан",
        description: `Отдел "${currentDepartment.name}" успешно ${isEditMode ? "обновлен" : "создан"}`
      });
      setShowDepartmentDialog(false);
      resetDepartmentForm();
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось ${isEditMode ? "обновить" : "создать"} отдел: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/departments/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Отдел удален",
        description: "Отдел успешно удален"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось удалить отдел: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Мутации для должностей
  const savePositionMutation = useMutation({
    mutationFn: async (position: Partial<Position>) => {
      if (isEditMode && selectedPositionId) {
        return await apiRequest("PATCH", `/api/positions/${selectedPositionId}`, position);
      } else {
        return await apiRequest("POST", "/api/positions", position);
      }
    },
    onSuccess: () => {
      toast({
        title: isEditMode ? "Должность обновлена" : "Должность создана",
        description: `Должность "${currentPosition.name}" успешно ${isEditMode ? "обновлена" : "создана"}`
      });
      setShowPositionDialog(false);
      resetPositionForm();
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось ${isEditMode ? "обновить" : "создать"} должность: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const deletePositionMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/positions/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Должность удалена",
        description: "Должность успешно удалена"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось удалить должность: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Функции для работы с формами
  const resetRuleForm = () => {
    setCurrentRule({
      name: "",
      description: "",
      type: "development",
      isActive: true,
      sourceType: "citizen_request",
      keywordsList: [],
    });
    setIsEditMode(false);
    setSelectedRuleId(null);
  };
  
  const resetDepartmentForm = () => {
    setCurrentDepartment({
      name: "",
      description: "",
    });
    setIsEditMode(false);
    setSelectedDepartmentId(null);
  };
  
  const resetPositionForm = () => {
    setCurrentPosition({
      name: "",
      departmentId: 0,
      level: 0,
      canApprove: false,
      canAssign: false,
    });
    setIsEditMode(false);
    setSelectedPositionId(null);
  };
  
  const handleEditRule = (rule: OrganizationalRule) => {
    setCurrentRule({
      ...rule,
      keywordsList: rule.keywordsList || [],
    });
    setSelectedRuleId(rule.id);
    setIsEditMode(true);
    setShowRuleDialog(true);
  };
  
  const handleEditDepartment = (department: Department) => {
    setCurrentDepartment({
      ...department,
    });
    setSelectedDepartmentId(department.id);
    setIsEditMode(true);
    setShowDepartmentDialog(true);
  };
  
  const handleEditPosition = (position: Position) => {
    setCurrentPosition({
      ...position,
    });
    setSelectedPositionId(position.id);
    setIsEditMode(true);
    setShowPositionDialog(true);
  };
  
  const handleAddKeyword = () => {
    if (keywordInput.trim()) {
      setCurrentRule({
        ...currentRule,
        keywordsList: [...(currentRule.keywordsList || []), keywordInput.trim()],
      });
      setKeywordInput("");
    }
  };
  
  const handleRemoveKeyword = (keyword: string) => {
    setCurrentRule({
      ...currentRule,
      keywordsList: (currentRule.keywordsList || []).filter(k => k !== keyword),
    });
  };
  
  // Помощники для отображения
  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case "development": return <Code className="h-4 w-4" />
      case "support": return <Headphones className="h-4 w-4" />
      case "ai": return <Bot className="h-4 w-4" />
      case "documents": return <File className="h-4 w-4" />
      case "infrastructure": return <Building className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  };
  
  const getSourceTypeIcon = (type: string) => {
    switch (type) {
      case "citizen_request": return <Clipboard className="h-4 w-4" />
      case "document": return <File className="h-4 w-4" />
      case "task": return <Briefcase className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  };
  
  // Функция генерации идентификатора цвета на основе строки
  const getColorFromString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
      'bg-red-100 text-red-800',
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Функция получения названия должности
  const getPositionById = (id: number | null) => {
    if (!id) return "";
    const position = positions.find(p => p.id === id);
    return position ? position.name : "";
  }

  // Функция получения названия агента
  const getAgentById = (id: number | null) => {
    if (!id) return "";
    const agent = agents.find(a => a.id === id);
    return agent ? agent.name : "";
  }

  // Функция получения названия отдела
  const getDepartmentById = (id: number | null) => {
    if (!id) return "";
    const department = departments.find(d => d.id === id);
    return department ? department.name : "";
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Управление организационной структурой</h1>
          <p className="mt-2 text-sm text-neutral-700">
            Создавайте правила распределения задач, управляйте отделами и должностями
          </p>
        </div>
        <Button onClick={() => setShowRuleDialog(true)} className="space-x-1">
          <PlusCircle className="h-4 w-4" />
          <span>Добавить правило</span>
        </Button>
      </div>

      <Tabs defaultValue="rules" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-neutral-100">
          <TabsTrigger value="rules">Правила распределения</TabsTrigger>
          <TabsTrigger value="departments">Отделы</TabsTrigger>
          <TabsTrigger value="positions">Должности</TabsTrigger>
        </TabsList>
        
        <TabsContent value="rules" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingRules ? (
              <div className="col-span-3 p-8 text-center">Загрузка правил...</div>
            ) : rules.length === 0 ? (
              <div className="col-span-3 p-8 text-center text-neutral-600">
                Правила не найдены. Создайте первое правило распределения.
              </div>
            ) : (
              rules.map(rule => (
                <Card key={rule.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex space-x-2 items-center">
                        <Badge variant="outline" className={getColorFromString(rule.type)}>
                          {getRuleTypeIcon(rule.type)}
                          <span className="ml-1">
                            {rule.type === "development" && "Разработка"}
                            {rule.type === "support" && "Поддержка"}
                            {rule.type === "ai" && "ИИ"}
                            {rule.type === "documents" && "Документы"}
                            {rule.type === "infrastructure" && "Инфраструктура"}
                          </span>
                        </Badge>
                        {rule.isActive ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            <Check className="h-3 w-3 mr-1" />
                            Активно
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-100 text-red-800">
                            <X className="h-3 w-3 mr-1" />
                            Неактивно
                          </Badge>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditRule(rule)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteRuleMutation.mutate(rule.id)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-2">{rule.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {rule.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium mb-1 text-neutral-500">Тип источника:</div>
                        <div className="flex items-center space-x-1 text-sm">
                          {getSourceTypeIcon(rule.sourceType)}
                          <span>
                            {rule.sourceType === "citizen_request" && "Обращение гражданина"}
                            {rule.sourceType === "document" && "Документ"}
                            {rule.sourceType === "task" && "Задача"}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium mb-1 text-neutral-500">Ключевые слова:</div>
                        <div className="flex flex-wrap gap-1">
                          {rule.keywordsList && rule.keywordsList.length > 0 ? (
                            rule.keywordsList.map((keyword, index) => (
                              <Badge key={index} variant="secondary" className="bg-neutral-100">
                                {keyword}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-neutral-500 italic">Не указаны</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <div>
                          <div className="text-sm font-medium mb-1 text-neutral-500">Отдел:</div>
                          <div className="text-sm">
                            {getDepartmentById(rule.departmentId) || "Не назначен"}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium mb-1 text-neutral-500">Должность:</div>
                          <div className="text-sm">
                            {getPositionById(rule.assignToPositionId) || "Не назначена"}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium mb-1 text-neutral-500">ИИ агент:</div>
                        <div className="text-sm">
                          {getAgentById(rule.assignToAgentId) || "Не назначен"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="text-xs text-neutral-500 pt-0">
                    Создано: {new Date(rule.createdAt || Date.now()).toLocaleDateString()}
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="departments" className="space-y-4">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold">Отделы и департаменты</h2>
            <Button onClick={() => setShowDepartmentDialog(true)} className="space-x-1">
              <PlusCircle className="h-4 w-4" />
              <span>Добавить отдел</span>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingDepartments ? (
              <div className="col-span-3 p-8 text-center">Загрузка отделов...</div>
            ) : departments.length === 0 ? (
              <div className="col-span-3 p-8 text-center text-neutral-600">
                Отделы не найдены. Создайте первый отдел.
              </div>
            ) : (
              departments.map(department => (
                <Card key={department.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{department.name}</CardTitle>
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditDepartment(department)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteDepartmentMutation.mutate(department.id)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      {department.description || "Описание отсутствует"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium mb-1 text-neutral-500">Родительский отдел:</div>
                        <div className="text-sm">
                          {department.parentId ? (
                            getDepartmentById(department.parentId)
                          ) : (
                            <span className="text-neutral-500 italic">Главный отдел</span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium mb-1 text-neutral-500">Должности в отделе:</div>
                        <div>
                          {positions
                            .filter(p => p.departmentId === department.id)
                            .map(position => (
                              <Badge key={position.id} className="mr-1 mb-1">
                                {position.name}
                              </Badge>
                            ))
                          }
                          {!positions.some(p => p.departmentId === department.id) && (
                            <span className="text-neutral-500 italic text-sm">Нет должностей</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="text-xs text-neutral-500">
                    Создано: {new Date(department.createdAt || Date.now()).toLocaleDateString()}
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="positions" className="space-y-4">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold">Должности</h2>
            <Button onClick={() => setShowPositionDialog(true)} className="space-x-1">
              <PlusCircle className="h-4 w-4" />
              <span>Добавить должность</span>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingPositions ? (
              <div className="col-span-3 p-8 text-center">Загрузка должностей...</div>
            ) : positions.length === 0 ? (
              <div className="col-span-3 p-8 text-center text-neutral-600">
                Должности не найдены. Создайте первую должность.
              </div>
            ) : (
              positions.map(position => (
                <Card key={position.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{position.name}</CardTitle>
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditPosition(position)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deletePositionMutation.mutate(position.id)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex mt-2 space-x-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        Уровень: {position.level}
                      </Badge>
                      {position.canApprove && (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <Check className="h-3 w-3 mr-1" />
                          Может утверждать
                        </Badge>
                      )}
                      {position.canAssign && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                          <UserCog className="h-3 w-3 mr-1" />
                          Может назначать
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium mb-1 text-neutral-500">Отдел:</div>
                        <div className="text-sm">
                          {getDepartmentById(position.departmentId) || "Не назначен"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="text-xs text-neutral-500">
                    Создано: {new Date(position.createdAt || Date.now()).toLocaleDateString()}
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Диалог создания/редактирования правила */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Редактирование правила" : "Новое правило распределения"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? "Измените параметры правила распределения задач" : "Создайте новое правило для автоматического распределения задач"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Название правила</Label>
              <Input
                id="rule-name"
                value={currentRule.name}
                onChange={(e) => setCurrentRule({...currentRule, name: e.target.value})}
                placeholder="Введите название правила"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rule-description">Описание</Label>
              <Textarea
                id="rule-description"
                value={currentRule.description || ''}
                onChange={(e) => setCurrentRule({...currentRule, description: e.target.value})}
                placeholder="Опишите назначение и принцип работы правила"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rule-type">Тип правила</Label>
              <Select 
                value={currentRule.type} 
                onValueChange={(value) => setCurrentRule({...currentRule, type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Разработка</SelectItem>
                  <SelectItem value="support">Поддержка</SelectItem>
                  <SelectItem value="ai">ИИ</SelectItem>
                  <SelectItem value="documents">Документы</SelectItem>
                  <SelectItem value="infrastructure">Инфраструктура</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rule-source-type">Тип источника</Label>
              <Select 
                value={currentRule.sourceType} 
                onValueChange={(value) => setCurrentRule({...currentRule, sourceType: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип источника" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="citizen_request">Обращение гражданина</SelectItem>
                  <SelectItem value="document">Документ</SelectItem>
                  <SelectItem value="task">Задача</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rule-department">Отдел</Label>
              <Select 
                value={currentRule.departmentId?.toString() || ''} 
                onValueChange={(value) => setCurrentRule({...currentRule, departmentId: parseInt(value) || null})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите отдел" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Не выбрано</SelectItem>
                  {departments.map(department => (
                    <SelectItem key={department.id} value={department.id.toString()}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rule-position">Должность</Label>
              <Select 
                value={currentRule.assignToPositionId?.toString() || ''} 
                onValueChange={(value) => setCurrentRule({...currentRule, assignToPositionId: parseInt(value) || null})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите должность" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Не выбрано</SelectItem>
                  {positions.map(position => (
                    <SelectItem key={position.id} value={position.id.toString()}>
                      {position.name} ({getDepartmentById(position.departmentId)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rule-agent">ИИ агент</Label>
              <Select 
                value={currentRule.assignToAgentId?.toString() || ''} 
                onValueChange={(value) => setCurrentRule({...currentRule, assignToAgentId: parseInt(value) || null})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите агента" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Не выбрано</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      {agent.name} ({agent.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Ключевые слова</Label>
              <div className="flex space-x-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Введите ключевое слово"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                />
                <Button type="button" onClick={handleAddKeyword}>Добавить</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {currentRule.keywordsList && currentRule.keywordsList.length > 0 ? (
                  currentRule.keywordsList.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="pr-1 pl-2 py-1 flex items-center space-x-1">
                      <span>{keyword}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 rounded-full"
                        onClick={() => handleRemoveKeyword(keyword)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))
                ) : (
                  <div className="text-sm text-neutral-500 italic">Нет ключевых слов</div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="rule-active"
                checked={currentRule.isActive}
                onCheckedChange={(checked) => setCurrentRule({...currentRule, isActive: checked})}
              />
              <Label htmlFor="rule-active">Активно</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRuleDialog(false);
              resetRuleForm();
            }}>
              Отмена
            </Button>
            <Button 
              onClick={() => saveRuleMutation.mutate(currentRule)}
              disabled={!currentRule.name}
            >
              {isEditMode ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог создания/редактирования отдела */}
      <Dialog open={showDepartmentDialog} onOpenChange={setShowDepartmentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Редактирование отдела" : "Новый отдел"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? "Измените данные отдела" : "Создайте новый отдел в организационной структуре"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="department-name">Название отдела</Label>
              <Input
                id="department-name"
                value={currentDepartment.name}
                onChange={(e) => setCurrentDepartment({...currentDepartment, name: e.target.value})}
                placeholder="Введите название отдела"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="department-description">Описание</Label>
              <Textarea
                id="department-description"
                value={currentDepartment.description || ''}
                onChange={(e) => setCurrentDepartment({...currentDepartment, description: e.target.value})}
                placeholder="Опишите назначение и функции отдела"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="department-parent">Родительский отдел</Label>
              <Select 
                value={currentDepartment.parentId?.toString() || ''} 
                onValueChange={(value) => setCurrentDepartment({...currentDepartment, parentId: parseInt(value) || null})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите родительский отдел" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Главный отдел</SelectItem>
                  {departments
                    .filter(d => !isEditMode || d.id !== selectedDepartmentId) // Исключаем текущий отдел
                    .map(department => (
                    <SelectItem key={department.id} value={department.id.toString()}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDepartmentDialog(false);
              resetDepartmentForm();
            }}>
              Отмена
            </Button>
            <Button 
              onClick={() => saveDepartmentMutation.mutate(currentDepartment)}
              disabled={!currentDepartment.name}
            >
              {isEditMode ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог создания/редактирования должности */}
      <Dialog open={showPositionDialog} onOpenChange={setShowPositionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Редактирование должности" : "Новая должность"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? "Измените данные должности" : "Создайте новую должность в организационной структуре"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="position-name">Название должности</Label>
              <Input
                id="position-name"
                value={currentPosition.name}
                onChange={(e) => setCurrentPosition({...currentPosition, name: e.target.value})}
                placeholder="Введите название должности"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="position-department">Отдел</Label>
              <Select 
                value={currentPosition.departmentId?.toString() || ''} 
                onValueChange={(value) => setCurrentPosition({...currentPosition, departmentId: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите отдел" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(department => (
                    <SelectItem key={department.id} value={department.id.toString()}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="position-level">Уровень</Label>
              <Input
                id="position-level"
                type="number"
                value={currentPosition.level?.toString() || '0'}
                onChange={(e) => setCurrentPosition({...currentPosition, level: parseInt(e.target.value) || 0})}
                min="0"
                max="10"
              />
              <div className="text-xs text-neutral-500">
                0 - Высший уровень (руководитель), 10 - низший уровень
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="position-approve"
                checked={currentPosition.canApprove}
                onCheckedChange={(checked) => setCurrentPosition({...currentPosition, canApprove: checked})}
              />
              <Label htmlFor="position-approve">Может утверждать документы и задачи</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="position-assign"
                checked={currentPosition.canAssign}
                onCheckedChange={(checked) => setCurrentPosition({...currentPosition, canAssign: checked})}
              />
              <Label htmlFor="position-assign">Может назначать задачи</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPositionDialog(false);
              resetPositionForm();
            }}>
              Отмена
            </Button>
            <Button 
              onClick={() => savePositionMutation.mutate(currentPosition)}
              disabled={!currentPosition.name || !currentPosition.departmentId}
            >
              {isEditMode ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
