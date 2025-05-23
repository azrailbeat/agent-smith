import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building, User, Plus, Edit, PenSquare, Search, Mail, Settings, Users, FileText, Bot } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import RulesContainer from "@/components/org-structure/RulesContainer";
import DraggableOrgStructure from "@/components/org-structure/DraggableOrgStructure";
import AssignAgentDialog from "@/components/org-structure/AssignAgentDialog";

// Расширенный интерфейс Position с полем agentId для назначения ИИ агентов
interface PositionWithAgent extends Position {
  agentId?: number | null;
}

// Определение типов данных
interface Department {
  id: number;
  name: string;
  description: string | null;
  parentId: number | null;
}

interface Position {
  id: number;
  name: string;
  departmentId: number;
  level: number;
}

interface Employee {
  id: number;
  fullName: string;
  positionId: number;
  departmentId: number;
  email?: string;
}

interface Rule {
  id: number;
  name: string;
  description: string;
  departmentId: number;
  positionId: number | null;
  priority: number;
}

// Схемы валидации форм
const departmentSchema = z.object({
  name: z.string().min(2, { message: "Название должно содержать минимум 2 символа" }),
  description: z.string().optional(),
  parentId: z.number().optional().nullable(),
});

const positionSchema = z.object({
  name: z.string().min(2, { message: "Название должно содержать минимум 2 символа" }),
  departmentId: z.number(),
  level: z.number().min(0).max(10),
});

const employeeSchema = z.object({
  fullName: z.string().min(2, { message: "ФИО должно содержать минимум 2 символа" }),
  departmentId: z.number(),
  positionId: z.number(),
  email: z.string().email({ message: "Введите корректный email" }).optional(),
});

const ruleSchema = z.object({
  name: z.string().min(2, { message: "Название должно содержать минимум 2 символа" }),
  description: z.string(),
  departmentId: z.number(),
  positionId: z.number().nullable(),
  priority: z.number().min(1).max(100),
});

// Определяем интерфейс для props
interface OrgStructureManagementProps {
  standalone?: boolean;
}

export default function OrgStructureManagement({ standalone = true }: OrgStructureManagementProps) {
  const [activeTab, setActiveTab] = useState("structure");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Состояния для поиска
  const [searchQuery, setSearchQuery] = useState("");
  
  // Состояния для редактирования
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [isEditingDepartment, setIsEditingDepartment] = useState(false);

  // Диалоги
  const [isAddDepartmentOpen, setIsAddDepartmentOpen] = useState(false);
  const [isAddPositionOpen, setIsAddPositionOpen] = useState(false);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [isAssignAgentOpen, setIsAssignAgentOpen] = useState(false);
  const [selectedDepartmentForPosition, setSelectedDepartmentForPosition] = useState<number | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<{
    id: number;
    name: string;
    departmentId: number;
    departmentName: string;
    agentId: number | null;
  } | null>(null);

  // Получение данных
  const { data: departments = [], isLoading: isLoadingDepts } = useQuery({
    queryKey: ["/api/departments"],
  });

  const { data: positions = [], isLoading: isLoadingPositions } = useQuery({
    queryKey: ["/api/positions"],
  });

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: rules = [], isLoading: isLoadingRules } = useQuery({
    queryKey: ["/api/task-rules"],
  });

  // Формы
  const departmentForm = useForm<z.infer<typeof departmentSchema>>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
      description: "",
      parentId: null,
    },
  });

  const positionForm = useForm<z.infer<typeof positionSchema>>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      name: "",
      departmentId: 0,
      level: 1,
    },
  });

  const employeeForm = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      fullName: "",
      departmentId: 0,
      positionId: 0,
      email: "",
    },
  });

  const ruleForm = useForm<z.infer<typeof ruleSchema>>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: "",
      description: "",
      departmentId: 0,
      positionId: null,
      priority: 50,
    },
  });

  // Обновление форм при выборе отдела для редактирования
  useEffect(() => {
    if (selectedDepartment && isEditingDepartment) {
      departmentForm.setValue("name", selectedDepartment.name);
      departmentForm.setValue("description", selectedDepartment.description || "");
      departmentForm.setValue("parentId", selectedDepartment.parentId);
    }
  }, [selectedDepartment, isEditingDepartment, departmentForm]);

  // Мутации
  const createDepartmentMutation = useMutation({
    mutationFn: (data: z.infer<typeof departmentSchema>) => {
      return apiRequest("POST", "/api/departments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setIsAddDepartmentOpen(false);
      departmentForm.reset();
      toast({
        title: "Успешно",
        description: "Подразделение успешно создано",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать подразделение",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.infer<typeof departmentSchema> }) => {
      return apiRequest("PUT", `/api/departments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setIsEditingDepartment(false);
      setSelectedDepartment(null);
      departmentForm.reset();
      toast({
        title: "Успешно",
        description: "Подразделение успешно обновлено",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить подразделение",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const createPositionMutation = useMutation({
    mutationFn: (data: z.infer<typeof positionSchema>) => {
      return apiRequest("POST", "/api/positions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      setIsAddPositionOpen(false);
      positionForm.reset();
      toast({
        title: "Успешно",
        description: "Должность успешно создана",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать должность",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const createEmployeeMutation = useMutation({
    mutationFn: (data: z.infer<typeof employeeSchema>) => {
      return apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddEmployeeOpen(false);
      employeeForm.reset();
      toast({
        title: "Успешно",
        description: "Сотрудник успешно добавлен",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить сотрудника",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: z.infer<typeof ruleSchema>) => {
      return apiRequest("POST", "/api/task-rules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-rules"] });
      setIsAddRuleOpen(false);
      ruleForm.reset();
      toast({
        title: "Успешно",
        description: "Правило успешно создано",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать правило",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Обработчики форм
  const onSubmitDepartment = (data: z.infer<typeof departmentSchema>) => {
    if (isEditingDepartment && selectedDepartment) {
      updateDepartmentMutation.mutate({ id: selectedDepartment.id, data });
    } else {
      createDepartmentMutation.mutate(data);
    }
  };

  const onSubmitPosition = (data: z.infer<typeof positionSchema>) => {
    createPositionMutation.mutate(data);
  };

  const onSubmitEmployee = (data: z.infer<typeof employeeSchema>) => {
    createEmployeeMutation.mutate(data);
  };

  const onSubmitRule = (data: z.infer<typeof ruleSchema>) => {
    createRuleMutation.mutate(data);
  };

  const handleAddPositionToDepartment = (departmentId: number) => {
    setSelectedDepartmentForPosition(departmentId);
    positionForm.setValue("departmentId", departmentId);
    setIsAddPositionOpen(true);
  };

  const handleEditDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setIsEditingDepartment(true);
    setIsAddDepartmentOpen(true);
  };

  // Функция для фильтрации департаментов и отделов по поисковому запросу
  const filteredDepartments = searchQuery
    ? departments.filter(
        dept =>
          dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (dept.description && dept.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : departments;

  // Группировка должностей по отделам
  const positionsByDepartment = departments.reduce((acc, department) => {
    acc[department.id] = positions.filter(pos => pos.departmentId === department.id);
    return acc;
  }, {} as Record<number, Position[]>);

  // Группировка сотрудников по отделам
  const employeesByDepartment = departments.reduce((acc, department) => {
    acc[department.id] = employees.filter(emp => emp.departmentId === department.id);
    return acc;
  }, {} as Record<number, Employee[]>);

  // Построение дерева отделов
  const buildDepartmentTree = (departments: Department[], parentId: number | null = null): Department[] => {
    return departments
      .filter(dept => dept.parentId === parentId)
      .map(dept => ({
        ...dept,
        children: buildDepartmentTree(departments, dept.id)
      })) as Department[];
  };
  
  const departmentTree = buildDepartmentTree(departments);

  // Рендеринг отдела и его подотделов
  const renderDepartment = (department: any, level: number = 0) => {
    const departmentPositions = positionsByDepartment[department.id] || [];
    const departmentEmployees = employeesByDepartment[department.id] || [];
    
    return (
      <div key={department.id} className={`mb-8 ${level > 0 ? 'ml-6 border-l-2 pl-4 border-primary/30' : ''}`}>
        <div className="bg-card p-4 rounded-lg shadow-sm border">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-start">
              <Building className="h-5 w-5 mr-2 text-primary mt-1" />
              <div>
                <h3 className="text-lg font-medium">{department.name}</h3>
                {department.description && (
                  <p className="text-sm text-muted-foreground mt-1">{department.description}</p>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => handleAddPositionToDepartment(department.id)}>
                <Plus className="h-4 w-4 mr-1" /> Должность
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleEditDepartment(department)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Должности отдела */}
          {departmentPositions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <Users className="h-4 w-4 mr-1" /> Должности
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {departmentPositions.map(position => (
                  <div key={position.id} className="flex items-center p-2 bg-muted/50 rounded">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">{position.name}</span>
                    <Badge variant="outline" className="ml-auto text-xs mr-2">
                      Уровень: {position.level}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={() => {
                        const dept = departments.find(d => d.id === position.departmentId);
                        setSelectedPosition({
                          id: position.id,
                          name: position.name,
                          departmentId: position.departmentId,
                          departmentName: dept ? dept.name : "Отдел",
                          agentId: position.agentId || null
                        });
                        setIsAssignAgentOpen(true);
                      }}
                    >
                      <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Сотрудники отдела */}
          {departmentEmployees.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <Users className="h-4 w-4 mr-1" /> Сотрудники
              </h4>
              <div className="space-y-2">
                {departmentEmployees.map(employee => {
                  const position = positions.find(pos => pos.id === employee.positionId);
                  return (
                    <div key={employee.id} className="flex items-center p-2 bg-muted/30 rounded">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      <div>
                        <span className="text-sm font-medium">{employee.fullName}</span>
                        {position && (
                          <span className="text-xs block text-muted-foreground">{position.name}</span>
                        )}
                      </div>
                      {employee.email && (
                        <div className="ml-auto flex items-center text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 mr-1" />
                          {employee.email}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Дочерние отделы */}
        {department.children && department.children.length > 0 && (
          <div className="mt-2">
            {department.children.map((child: any) => renderDepartment(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const containerClass = standalone ? "container py-6" : "";
  
  return (
    <div className={containerClass}>
      {standalone && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Организационная структура</h1>
            <Button onClick={() => setIsAddDepartmentOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Добавить подразделение
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground mb-6">
            Управление структурой организации, подразделениями и распределением задач
          </div>
        </>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="structure">
            <Building className="mr-2 h-4 w-4" /> Структура
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Settings className="mr-2 h-4 w-4" /> Правила распределения
          </TabsTrigger>
        </TabsList>

        {/* Вкладка структуры */}
        <TabsContent value="structure" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Поиск</CardTitle>
              <CardDescription>
                Поиск по отделам, должностям и сотрудникам
              </CardDescription>
              <div className="flex items-center w-full relative">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Поиск по отделам, должностям и сотрудникам..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
          </Card>

          <div className="space-y-4">
            {isLoadingDepts ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : filteredDepartments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Структура не создана</h3>
                  <p className="text-muted-foreground mb-4">Добавьте первое подразделение для начала работы</p>
                  <Button onClick={() => setIsAddDepartmentOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Добавить подразделение
                  </Button>
                </CardContent>
              </Card>
            ) : (
              searchQuery ? (
                // Плоский список при поиске
                filteredDepartments.map(department => (
                  <div key={department.id} className="mb-4">
                    {renderDepartment(department)}
                  </div>
                ))
              ) : (
                // Компонент с drag-and-drop
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Управление организационной структурой</CardTitle>
                    <CardDescription>
                      Перетащите сотрудников между отделами для изменения их принадлежности и должности
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DraggableOrgStructure 
                      departments={departments} 
                      positions={positions} 
                      employees={employees} 
                      onUpdate={() => {
                        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
                        queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
                      }}
                    />
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </TabsContent>

        {/* Вкладка правил распределения */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Правила распределения задач</h2>
            <Button onClick={() => setIsAddRuleOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Добавить правило
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <RulesContainer onAddRule={() => setIsAddRuleOpen(true)} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Диалог добавления/редактирования отдела */}
      <Dialog open={isAddDepartmentOpen} onOpenChange={setIsAddDepartmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingDepartment ? "Редактировать" : "Добавить"} подразделение</DialogTitle>
            <DialogDescription>
              {isEditingDepartment
                ? "Обновите информацию о подразделении"
                : "Создайте новое подразделение в организационной структуре"}
            </DialogDescription>
          </DialogHeader>
          <Form {...departmentForm}>
            <form onSubmit={departmentForm.handleSubmit(onSubmitDepartment)} className="space-y-4">
              <FormField
                control={departmentForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название подразделения</FormLabel>
                    <FormControl>
                      <Input placeholder="Например: Министерство цифрового развития" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={departmentForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Описание отдела и его функций" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={departmentForm.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Родительский отдел</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      defaultValue={field.value?.toString() || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите родительский отдел (если есть)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Нет родительского отдела</SelectItem>
                        {departments && departments.map((department) => (
                          <SelectItem key={department.id} value={department.id.toString()}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Указывается, если это подразделение является частью более крупного подразделения
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                {isEditingDepartment && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditingDepartment(false);
                      setSelectedDepartment(null);
                      departmentForm.reset();
                    }}
                    className="mr-auto"
                  >
                    Отмена
                  </Button>
                )}
                <Button type="submit" disabled={createDepartmentMutation.isPending || updateDepartmentMutation.isPending}>
                  {(createDepartmentMutation.isPending || updateDepartmentMutation.isPending)
                    ? "Сохранение..."
                    : isEditingDepartment
                      ? "Обновить"
                      : "Сохранить"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Диалог добавления должности */}
      <Dialog open={isAddPositionOpen} onOpenChange={setIsAddPositionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить должность</DialogTitle>
            <DialogDescription>
              Создайте новую должность в организационной структуре
            </DialogDescription>
          </DialogHeader>
          <Form {...positionForm}>
            <form onSubmit={positionForm.handleSubmit(onSubmitPosition)} className="space-y-4">
              <FormField
                control={positionForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название должности</FormLabel>
                    <FormControl>
                      <Input placeholder="Например: Руководитель" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={positionForm.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Отдел</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value ? field.value.toString() : "1"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите отдел" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments && departments.map((department) => (
                          <SelectItem key={department.id} value={department.id.toString()}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={positionForm.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Уровень в организации</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="10" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormDescription>
                      От 0 (высший уровень) до 10 (низший уровень)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createPositionMutation.isPending}>
                  {createPositionMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Диалог добавления сотрудника */}
      <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить сотрудника</DialogTitle>
            <DialogDescription>
              Добавьте нового сотрудника в организационную структуру
            </DialogDescription>
          </DialogHeader>
          <Form {...employeeForm}>
            <form onSubmit={employeeForm.handleSubmit(onSubmitEmployee)} className="space-y-4">
              <FormField
                control={employeeForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ФИО сотрудника</FormLabel>
                    <FormControl>
                      <Input placeholder="Например: Иванов Иван Иванович" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={employeeForm.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Отдел</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите отдел" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id.toString()}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={employeeForm.control}
                name="positionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Должность</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите должность" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {positions
                          .filter(pos => pos.departmentId === employeeForm.getValues().departmentId)
                          .map((position) => (
                            <SelectItem key={position.id} value={position.id.toString()}>
                              {position.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={employeeForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Электронная почта</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createEmployeeMutation.isPending}>
                  {createEmployeeMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Диалог добавления правила */}
      <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить правило распределения</DialogTitle>
            <DialogDescription>
              Создайте новое правило для автоматического распределения задач
            </DialogDescription>
          </DialogHeader>
          <Form {...ruleForm}>
            <form onSubmit={ruleForm.handleSubmit(onSubmitRule)} className="space-y-4">
              <FormField
                control={ruleForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название правила</FormLabel>
                    <FormControl>
                      <Input placeholder="Например: Распределение запросов ИТ-поддержки" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={ruleForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание правила</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Опишите правило распределения задач..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={ruleForm.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Целевой отдел</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите отдел" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id.toString()}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={ruleForm.control}
                name="positionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Целевая должность (опционально)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      defaultValue={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите должность (если применимо)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Не указывать должность</SelectItem>
                        {positions
                          .filter(pos => pos.departmentId === ruleForm.getValues().departmentId)
                          .map((position) => (
                            <SelectItem key={position.id} value={position.id.toString()}>
                              {position.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Если должность не указана, задача будет распределена на уровне отдела
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={ruleForm.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Приоритет правила</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <Label className="w-10 text-right">1</Label>
                        <Input
                          type="range"
                          min="1"
                          max="100"
                          className="w-full"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                        <Label className="w-10">100</Label>
                      </div>
                    </FormControl>
                    <div className="text-center mt-1">
                      <Badge variant="outline">{field.value}</Badge>
                    </div>
                    <FormDescription>
                      Более высокий приоритет (ближе к 100) означает, что правило будет применяться раньше
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createRuleMutation.isPending}>
                  {createRuleMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Диалог назначения ИИ агента на должность */}
      {selectedPosition && (
        <AssignAgentDialog
          isOpen={isAssignAgentOpen}
          onClose={() => {
            setIsAssignAgentOpen(false);
            setSelectedPosition(null);
          }}
          positionId={selectedPosition.id}
          positionName={selectedPosition.name}
          departmentName={selectedPosition.departmentName}
          currentAgentId={selectedPosition.agentId}
        />
      )}
    </div>
  );
}