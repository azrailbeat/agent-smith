import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Building, Users, Settings, Shield, ChevronRight, User, Briefcase } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { departments as mockDepartments, positions as mockPositions, employees as mockEmployees } from '@/shared/mock_data';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

import DraggableOrgStructure from '@/components/org-structure/DraggableOrgStructure';
import RulesContainer from '@/components/org-structure/RulesContainer';

// Схемы валидации
const departmentSchema = z.object({
  name: z.string().min(2, 'Название должно содержать минимум 2 символа'),
  description: z.string().optional(),
  parentId: z.number().nullable().optional(),
});

const positionSchema = z.object({
  name: z.string().min(2, 'Название должно содержать минимум 2 символа'),
  departmentId: z.number(),
  level: z.number().min(0).max(10),
});

const employeeSchema = z.object({
  fullName: z.string().min(5, 'ФИО должно содержать минимум 5 символов'),
  departmentId: z.number(),
  positionId: z.number(),
  email: z.string().email('Некорректный email'),
});

const ruleSchema = z.object({
  name: z.string().min(3, 'Название должно содержать минимум 3 символа'),
  description: z.string().min(5, 'Описание должно содержать минимум 5 символов'),
  departmentId: z.number(),
  positionId: z.number().nullable().optional(),
  priority: z.number().min(1).max(100),
});

// Интерфейсы данных
interface Department {
  id: number;
  name: string;
  description?: string;
  parentId?: number | null;
}

interface Position {
  id: number;
  name: string;
  departmentId: number;
  level: number;
  agentId?: number | null;
}

interface Employee {
  id: number;
  fullName: string;
  departmentId: number;
  positionId: number;
  email: string;
}

export default function OrgStructureManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('structure');
  const [searchQuery, setSearchQuery] = useState('');

  // Состояния диалогов
  const [isAddDepartmentOpen, setIsAddDepartmentOpen] = useState(false);
  const [isAddPositionOpen, setIsAddPositionOpen] = useState(false);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [isEditingDepartment, setIsEditingDepartment] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  // Загрузка данных
  const { data: departments = mockDepartments, isLoading: isLoadingDepts } = useQuery({
    queryKey: ['/api/departments'],
    initialData: mockDepartments,
  });

  const { data: positions = mockPositions, isLoading: isLoadingPositions } = useQuery({
    queryKey: ['/api/positions'],
    initialData: mockPositions,
  });

  const { data: employees = mockEmployees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['/api/employees'],
    initialData: mockEmployees,
  });

  // Формы
  const departmentForm = useForm<z.infer<typeof departmentSchema>>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      description: '',
      parentId: null,
    },
  });

  const positionForm = useForm<z.infer<typeof positionSchema>>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      name: '',
      departmentId: departments && departments.length > 0 ? departments[0].id : 1,
      level: 5,
    },
  });

  const employeeForm = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      fullName: '',
      departmentId: departments && departments.length > 0 ? departments[0].id : 1,
      positionId: positions && positions.length > 0 ? positions[0].id : 1,
      email: '',
    },
  });

  const ruleForm = useForm<z.infer<typeof ruleSchema>>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: '',
      description: '',
      departmentId: departments && departments.length > 0 ? departments[0].id : 1,
      positionId: null,
      priority: 50,
    },
  });

  // Мутации
  const createDepartmentMutation = useMutation({
    mutationFn: (data: z.infer<typeof departmentSchema>) => {
      return apiRequest('POST', '/api/departments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      setIsAddDepartmentOpen(false);
      departmentForm.reset();
    },
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: (data: any) => {
      return apiRequest('PATCH', `/api/departments/${selectedDepartment?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      setIsAddDepartmentOpen(false);
      setIsEditingDepartment(false);
      setSelectedDepartment(null);
      departmentForm.reset();
    },
  });

  const createPositionMutation = useMutation({
    mutationFn: (data: z.infer<typeof positionSchema>) => {
      return apiRequest('POST', '/api/positions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
      setIsAddPositionOpen(false);
      positionForm.reset();
    },
  });

  const createEmployeeMutation = useMutation({
    mutationFn: (data: z.infer<typeof employeeSchema>) => {
      return apiRequest('POST', '/api/employees', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      setIsAddEmployeeOpen(false);
      employeeForm.reset();
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: z.infer<typeof ruleSchema>) => {
      return apiRequest('POST', '/api/org-structure/rules', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org-structure/rules'] });
      setIsAddRuleOpen(false);
      ruleForm.reset();
    },
  });

  // Обработчики форм
  const onSubmitDepartment = (data: z.infer<typeof departmentSchema>) => {
    if (isEditingDepartment && selectedDepartment) {
      updateDepartmentMutation.mutate(data);
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

  // Вспомогательные функции
  const handleEditDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setIsEditingDepartment(true);
    departmentForm.reset({
      name: department.name,
      description: department.description || '',
      parentId: department.parentId || null,
    });
    setIsAddDepartmentOpen(true);
  };

  // Изменение отдела в форме сотрудника
  useEffect(() => {
    const departmentId = employeeForm.watch('departmentId');
    if (departmentId) {
      // Находим первую должность для выбранного отдела
      const deptPositions = positions.filter(
        (pos) => pos.departmentId === departmentId
      );
      if (deptPositions.length > 0) {
        employeeForm.setValue('positionId', deptPositions[0].id);
      }
    }
  }, [employeeForm.watch('departmentId'), positions, employeeForm]);

  // Изменение отдела в форме правила
  useEffect(() => {
    const departmentId = ruleForm.watch('departmentId');
    if (departmentId) {
      // Сбрасываем positionId, так как он может быть недействительным для нового отдела
      ruleForm.setValue('positionId', null);
    }
  }, [ruleForm.watch('departmentId'), ruleForm]);

  // Фильтрация по поиску
  const filteredDepartments = searchQuery
    ? departments.filter((dept) => 
        dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dept.description && dept.description.toLowerCase().includes(searchQuery.toLowerCase())))
    : departments;

  // Рендеринг отдела
  const renderDepartment = (department: Department) => {
    const deptPositions = positions.filter(pos => pos.departmentId === department.id);
    const deptEmployees = employees.filter(emp => emp.departmentId === department.id);
    
    return (
      <Card key={department.id} className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center">
              <Building className="mr-2 h-5 w-5 text-muted-foreground" />
              {department.name}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => handleEditDepartment(department)}>
                Редактировать
              </Button>
            </div>
          </CardTitle>
          {department.description && (
            <CardDescription>{department.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center mb-2">
                <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Должности ({deptPositions.length})</h4>
              </div>
              {deptPositions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {deptPositions.map((position) => (
                    <div key={position.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded-md">
                      <div className="flex items-center">
                        <span>{position.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          Уровень: {position.level}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Нет должностей</p>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2"
                onClick={() => {
                  positionForm.setValue('departmentId', department.id);
                  setIsAddPositionOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Добавить должность
              </Button>
            </div>
            
            <div>
              <div className="flex items-center mb-2">
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Сотрудники ({deptEmployees.length})</h4>
              </div>
              {deptEmployees.length > 0 ? (
                <div className="space-y-2">
                  {deptEmployees.map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded-md">
                      <div className="flex-1">
                        <div className="font-medium">{employee.fullName}</div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          <span className="mr-2">{employee.email}</span>
                          <Badge variant="outline" className="text-xs">
                            {positions.find(p => p.id === employee.positionId)?.name || 'Должность не найдена'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Нет сотрудников</p>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2"
                onClick={() => {
                  employeeForm.setValue('departmentId', department.id);
                  
                  // Находим первую должность в отделе и устанавливаем её
                  const deptPositions = positions.filter(p => p.departmentId === department.id);
                  if (deptPositions.length > 0) {
                    employeeForm.setValue('positionId', deptPositions[0].id);
                  }
                  
                  setIsAddEmployeeOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Добавить сотрудника
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Организационная структура</h1>
          <p className="text-muted-foreground">
            Управление структурой организации, подразделениями и распределением задач
          </p>
        </div>
        <Button onClick={() => setIsAddDepartmentOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Добавить подразделение
        </Button>
      </div>
      
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
                      onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))}
                      defaultValue={field.value ? field.value.toString() : "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите родительский отдел (если есть)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Нет родительского отдела</SelectItem>
                        {departments && departments.map((department) => (
                          department.id !== selectedDepartment?.id && (
                            <SelectItem key={department.id} value={department.id.toString()}>
                              {department.name}
                            </SelectItem>
                          )
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
                      defaultValue={field.value ? field.value.toString() : (departments[0]?.id || "1").toString()}
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
                      <Input 
                        type="number" 
                        min="0" 
                        max="10" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))} 
                      />
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
                      defaultValue={field.value ? field.value.toString() : (departments[0]?.id || "1").toString()}
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
                control={employeeForm.control}
                name="positionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Должность</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value ? field.value.toString() : 
                        positions.filter(p => p.departmentId === employeeForm.getValues().departmentId)[0]?.id.toString() || "1"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите должность" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {positions && positions
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
                      defaultValue={field.value ? field.value.toString() : (departments[0]?.id || "1").toString()}
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
                control={ruleForm.control}
                name="positionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Целевая должность (опционально)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))}
                      defaultValue={field.value ? field.value.toString() : "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите должность (если применимо)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Не указывать должность</SelectItem>
                        {positions && positions
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
                      Правила с более высоким приоритетом применяются в первую очередь
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
    </div>
  );
}