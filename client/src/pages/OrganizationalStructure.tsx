import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, X, Building2, Users, BookUser, Briefcase, Edit, Trash2, UserPlus, ChevronRight, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Интерфейс для отдела
interface Department {
  id: number;
  name: string;
  description: string;
  managerId?: number | null;
  parentDepartmentId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Интерфейс для должности
interface Position {
  id: number;
  name: string;
  description: string;
  departmentId: number;
  responsibilities: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Интерфейс для правила распределения задач
interface TaskRule {
  id: number;
  name: string;
  description: string;
  sourceType: "meeting" | "citizen_request" | "document";
  keywords: string[];
  departmentId: number;
  positionId: number;
  userId?: number | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Интерфейс для пользователя
interface User {
  id: number;
  username: string;
  email?: string;
  fullName?: string;
  role?: string;
  departmentId?: number | null;
  positionId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function OrganizationalStructurePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("departments");
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const [expandedDepartments, setExpandedDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Запросы на получение данных
  const { data: departments = [] } = useQuery({
    queryKey: ["/api/departments"],
    staleTime: 1000 * 60, // 1 minute
  });
  
  const { data: positions = [] } = useQuery({
    queryKey: ["/api/positions"],
    staleTime: 1000 * 60, // 1 minute
  });
  
  const { data: taskRules = [] } = useQuery({
    queryKey: ["/api/task-rules"],
    staleTime: 1000 * 60, // 1 minute
  });
  
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 1000 * 60, // 1 minute
  });

  const handleAccordionToggle = (value: string) => {
    setExpandedDepartments(prev => {
      if (prev.includes(value)) {
        return prev.filter(item => item !== value);
      } else {
        return [...prev, value];
      }
    });
  };

  // Создание базовой организационной структуры
  const createDefaultOrgStructure = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('POST', '/api/org-structure/default');
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Структура создана',
          description: 'Базовая организационная структура успешно создана',
        });
        
        // Обновляем данные на странице
        queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/task-rules"] });
      } else {
        toast({
          title: 'Внимание',
          description: result.message || 'Организационная структура уже существует',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Ошибка при создании базовой структуры:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать базовую организационную структуру. Попробуйте еще раз.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterDepartments = () => {
    if (!searchQuery.trim()) return departments;
    return departments.filter((dept: Department) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getDepartmentUsers = (deptId: number) => {
    return users.filter((user: User) => user.departmentId === deptId);
  };

  const getDepartmentPositions = (deptId: number) => {
    return positions.filter((pos: Position) => pos.departmentId === deptId);
  };

  const getUserName = (userId?: number | null) => {
    if (!userId) return 'Не назначено';
    const user = users.find((u: User) => u.id === userId);
    return user ? (user.fullName || user.username) : 'Не назначено';
  };
  
  // Функция для рендеринга сотрудника в отделе
  const renderDepartmentUser = (user: User) => {
    return (
      <div key={user.id} className="flex items-center justify-between p-2 border rounded-md">
        <div className="flex items-center">
          <BookUser className="mr-2 h-4 w-4 text-muted-foreground" />
          <div>
            <div>{user.fullName || user.username}</div>
            <div className="text-xs text-muted-foreground">
              {positions.find((p: Position) => p.id === user.positionId)?.name || 'Должность не указана'}
            </div>
          </div>
        </div>
        <div className="flex space-x-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEditingUser(user);
              setNewUserDialogOpen(true);
            }}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDeleteUser(user.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  // Состояние и функции для диалога создания/редактирования сотрудника
  const [newUserDialogOpen, setNewUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Форма для сотрудника
  const userForm = useForm({
    resolver: zodResolver(
      z.object({
        username: z.string().min(3, { message: 'Имя пользователя должно содержать минимум 3 символа' }),
        fullName: z.string().min(3, { message: 'ФИО должно содержать минимум 3 символа' }),
        email: z.string().email({ message: 'Введите корректный email' }).optional().nullable(),
        role: z.string().optional(),
        departmentId: z.string().optional(),
        positionId: z.string().optional()
      })
    ),
    defaultValues: {
      username: '',
      fullName: '',
      email: '',
      role: 'user',
      departmentId: '',
      positionId: ''
    }
  });

  // Сброс формы сотрудника
  const resetUserForm = useCallback(() => {
    userForm.reset({
      username: '',
      fullName: '',
      email: '',
      role: 'user',
      departmentId: '',
      positionId: ''
    });
  }, [userForm]);

  // Загрузка данных для редактирования
  useEffect(() => {
    if (editingUser) {
      userForm.reset({
        username: editingUser.username,
        fullName: editingUser.fullName || '',
        email: editingUser.email || '',
        role: editingUser.role || 'user',
        departmentId: editingUser.departmentId ? String(editingUser.departmentId) : '',
        positionId: editingUser.positionId ? String(editingUser.positionId) : ''
      });
    }
  }, [editingUser, userForm]);

  // Обработка создания/редактирования сотрудника
  const handleUserSubmit = async (values: any) => {
    try {
      setIsLoading(true);
      const formattedValues = {
        ...values,
        departmentId: values.departmentId ? parseInt(values.departmentId) : null,
        positionId: values.positionId ? parseInt(values.positionId) : null
      };

      if (editingUser) {
        // Обновление существующего сотрудника
        await apiRequest('PATCH', `/api/users/${editingUser.id}`, formattedValues);
        toast({
          title: 'Сотрудник обновлен',
          description: `${values.fullName} успешно обновлен`,
        });
      } else {
        // Создание нового сотрудника
        await apiRequest('POST', '/api/users', formattedValues);
        toast({
          title: 'Сотрудник создан',
          description: `${values.fullName} успешно добавлен`,
        });
      }

      // Обновляем данные и закрываем диалог
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setNewUserDialogOpen(false);
      setEditingUser(null);
      resetUserForm();
    } catch (error) {
      console.error('Ошибка при сохранении сотрудника:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить данные сотрудника',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Обработка удаления сотрудника
  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этого сотрудника?')) return;
    
    try {
      setIsLoading(true);
      await apiRequest('DELETE', `/api/users/${userId}`);
      
      toast({
        title: 'Сотрудник удален',
        description: 'Сотрудник успешно удален из системы',
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    } catch (error) {
      console.error('Ошибка при удалении сотрудника:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить сотрудника',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Организационная структура</h1>
        <Button 
          onClick={createDefaultOrgStructure}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Создать базовую структуру
        </Button>
      </div>
      
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-2">
          Организационная структура министерства, предназначенная для распределения задач
        </p>
        
        <Tabs defaultValue="departments" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="departments">Отделы</TabsTrigger>
            <TabsTrigger value="employees">Сотрудники</TabsTrigger>
            <TabsTrigger value="task-rules">Правила распределения</TabsTrigger>
          </TabsList>
          
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по разделам, должностям и сотрудникам..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <TabsContent value="departments" className="space-y-4">
            {filterDepartments().length > 0 ? (
              <Accordion
                type="multiple"
                value={expandedDepartments}
                onValueChange={setExpandedDepartments}
                className="space-y-4"
              >
                {filterDepartments().map((dept: Department) => (
                  <AccordionItem key={dept.id} value={dept.id.toString()} className="border rounded-lg p-1">
                    <AccordionTrigger className="px-4 py-2 hover:bg-accent hover:text-accent-foreground rounded-md">
                      <div className="flex items-center">
                        <Building2 className="mr-2 h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium">{dept.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Руководитель: {getUserName(dept.managerId)}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-2 pb-3">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2 flex items-center">
                            <Users className="mr-2 h-4 w-4" />
                            Сотрудники
                          </h4>
                          <div className="pl-6 space-y-2">
                            {getDepartmentUsers(dept.id).length > 0 ? (
                              getDepartmentUsers(dept.id).map((user: User) => (
                                renderDepartmentUser(user)
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground">Нет сотрудников в отделе</div>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2"
                              onClick={() => {
                                setEditingUser(null);
                                resetUserForm();
                                userForm.setValue("departmentId", dept.id.toString());
                                setNewUserDialogOpen(true);
                              }}
                            >
                              <UserPlus className="mr-2 h-4 w-4" />
                              Добавить сотрудника
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2 flex items-center">
                            <Briefcase className="mr-2 h-4 w-4" />
                            Должности
                          </h4>
                          <div className="pl-6 space-y-2">
                            {getDepartmentPositions(dept.id).length > 0 ? (
                              getDepartmentPositions(dept.id).map((position: Position) => (
                                <div key={position.id} className="flex items-center justify-between p-2 border rounded-md">
                                  <div>
                                    <div className="font-medium">{position.name}</div>
                                    <div className="text-xs text-muted-foreground truncate max-w-md">
                                      {position.description}
                                    </div>
                                  </div>
                                  <div className="flex space-x-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground">Нет должностей в отделе</div>
                            )}
                            <Button variant="outline" size="sm" className="mt-2">
                              <Plus className="mr-2 h-4 w-4" />
                              Добавить должность
                            </Button>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center p-8">
                <p className="text-muted-foreground mb-4">Отделы не найдены</p>
                <Button 
                  variant="default" 
                  onClick={createDefaultOrgStructure}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building2 className="mr-2 h-4 w-4" />}
                  Создать базовую структуру
                </Button>
              </div>
            )}
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Добавить отдел
            </Button>
          </TabsContent>
          
          <TabsContent value="employees" className="space-y-4">
            {users.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.filter(u => 
                  !searchQuery.trim() || 
                  (u.fullName && u.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  u.username.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((user: User) => (
                  <Card key={user.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="text-lg">{user.fullName || user.username}</CardTitle>
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingUser(user);
                              setNewUserDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        {departments.find((d: Department) => d.id === user.departmentId)?.name || 'Отдел не указан'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Должность:</span>{' '}
                          {positions.find((p: Position) => p.id === user.positionId)?.name || 'Не указана'}
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Email:</span>{' '}
                          {user.email || 'Не указан'}
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Роль:</span>{' '}
                          {user.role || 'Пользователь'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center p-8">
                <p className="text-muted-foreground mb-4">Пользователи не найдены</p>
              </div>
            )}
            <Button className="mt-4" onClick={() => {
              setEditingUser(null);
              resetUserForm();
              setNewUserDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить сотрудника
            </Button>
            
            {/* Диалог создания/редактирования сотрудника */}
            <Dialog open={newUserDialogOpen} onOpenChange={setNewUserDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? `Редактирование сотрудника` : `Создание нового сотрудника`}
                  </DialogTitle>
                  <DialogDescription>
                    {editingUser
                      ? 'Измените данные сотрудника и привязку к отделу и должности'
                      : 'Введите данные нового сотрудника и привяжите его к отделу и должности'}
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...userForm}>
                  <form onSubmit={userForm.handleSubmit(handleUserSubmit)} className="space-y-4">
                    <FormField
                      control={userForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Имя пользователя</FormLabel>
                          <FormControl>
                            <Input placeholder="user123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={userForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ФИО</FormLabel>
                          <FormControl>
                            <Input placeholder="Иванов Иван Иванович" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={userForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="user@example.com" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={userForm.control}
                      name="departmentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Отдел</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите отдел" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departments.map((dept: Department) => (
                                <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={userForm.control}
                      name="positionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Должность</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={!userForm.watch('departmentId')}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите должность" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {userForm.watch('departmentId') ? (
                                positions
                                  .filter((pos: Position) => pos.departmentId === parseInt(userForm.watch('departmentId')))
                                  .map((pos: Position) => (
                                    <SelectItem key={pos.id} value={pos.id.toString()}>{pos.name}</SelectItem>
                                  ))
                              ) : (
                                <SelectItem value="" disabled>Сначала выберите отдел</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={userForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Роль в системе</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите роль" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="user">Пользователь</SelectItem>
                              <SelectItem value="manager">Руководитель</SelectItem>
                              <SelectItem value="admin">Администратор</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setNewUserDialogOpen(false)}>
                        Отмена
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingUser ? 'Сохранить' : 'Создать'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </TabsContent>
          
          <TabsContent value="task-rules" className="space-y-4">
            {taskRules.length > 0 ? (
              <div className="space-y-4">
                {taskRules.filter((rule: TaskRule) => 
                  !searchQuery.trim() || 
                  rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  rule.description.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((rule: TaskRule) => (
                  <Card key={rule.id} className={rule.isActive ? 'border-primary/50' : 'opacity-70'}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="flex items-start gap-2">
                          {rule.name}
                          {rule.isActive && <Badge variant="outline" className="bg-green-100 text-green-800">Активно</Badge>}
                          {!rule.isActive && <Badge variant="outline" className="bg-gray-100 text-gray-800">Неактивно</Badge>}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost" 
                            size="icon"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>{rule.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="space-y-3">
                        <div>
                          <strong className="text-sm text-muted-foreground">Отдел:</strong>
                          <div>
                            {departments.find((d: Department) => d.id === rule.departmentId)?.name || 'Не указан'}
                          </div>
                        </div>
                        <div>
                          <strong className="text-sm text-muted-foreground">Должность:</strong>
                          <div>
                            {positions.find((p: Position) => p.id === rule.positionId)?.name || 'Не указана'}
                          </div>
                        </div>
                        {rule.userId && (
                          <div>
                            <strong className="text-sm text-muted-foreground">Ответственное лицо:</strong>
                            <div>
                              {getUserName(rule.userId)}
                            </div>
                          </div>
                        )}
                        <div>
                          <strong className="text-sm text-muted-foreground">Тип источника:</strong>
                          <div>
                            {rule.sourceType === 'meeting' ? 'Протокол совещания' : 
                             rule.sourceType === 'citizen_request' ? 'Обращение гражданина' : 'Документ'}
                          </div>
                        </div>
                        <div>
                          <strong className="text-sm text-muted-foreground">Ключевые слова:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {rule.keywords && Array.isArray(rule.keywords) ? rule.keywords.map((keyword, index) => (
                              <Badge key={index} variant="secondary">{keyword}</Badge>
                            )) : null}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center p-8">
                <p className="text-muted-foreground mb-4">Правила распределения не найдены</p>
                <Button 
                  variant="default" 
                  onClick={createDefaultOrgStructure}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Создать базовую структуру
                </Button>
              </div>
            )}
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Добавить правило
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
