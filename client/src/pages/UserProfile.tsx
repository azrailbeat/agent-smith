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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Edit, 
  Shield, 
  Lock, 
  Key, 
  Bell, 
  LogOut, 
  Building, 
  Users, 
  AtSign,
  Phone,
  Calendar,
  Briefcase,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Типы данных
interface UserData {
  id: number;
  username: string;
  fullName: string;
  department?: string;
  departmentId?: number;
  positionId?: number;
  role: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
}

interface Activity {
  id: number;
  actionType: string;
  description: string;
  entityType?: string;
  entityId?: number;
  timestamp: string;
  metadata?: any;
}

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  assignedTo?: number;
}

interface Department {
  id: number;
  name: string;
}

interface Position {
  id: number;
  name: string;
  departmentId: number;
}

// Компонент для страницы профиля пользователя
const UserProfile = () => {
  const { toast } = useToast();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  // Демо-данные
  const demoUser: UserData = {
    id: 1,
    username: "admin",
    fullName: "Айнур Бекова",
    department: "Департамент цифровизации",
    departmentId: 2,
    positionId: 3,
    role: "admin",
    email: "ainur.bekova@gov.kz",
    phone: "+7 (701) 555-3322",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&h=256&q=80",
    isActive: true
  };

  const demoActivities: Activity[] = [
    {
      id: 1,
      actionType: "user_login",
      description: "Вход в систему",
      timestamp: "2025-04-16T08:32:12",
      metadata: { ip: "192.168.1.45", device: "Chrome/Windows" }
    },
    {
      id: 2,
      actionType: "entity_update",
      description: "Обновление задачи",
      entityType: "task",
      entityId: 24,
      timestamp: "2025-04-15T15:45:23",
      metadata: { changes: { status: { from: "pending", to: "in_progress" } } }
    },
    {
      id: 3,
      actionType: "entity_create",
      description: "Создание нового агента ИИ",
      entityType: "agent",
      entityId: 12,
      timestamp: "2025-04-14T11:23:05",
      metadata: { agentName: "Обработчик заявлений" }
    },
    {
      id: 4,
      actionType: "blockchain_record",
      description: "Запись в блокчейн",
      entityType: "document",
      entityId: 67,
      timestamp: "2025-04-13T09:17:42",
      metadata: { transactionHash: "0x7fe2d43b8c9a0adc44e5988981c82a..." }
    },
    {
      id: 5,
      actionType: "entity_update",
      description: "Изменение профиля пользователя",
      entityType: "user",
      entityId: 1,
      timestamp: "2025-04-10T16:02:39",
      metadata: { changes: { phone: { from: "+7 (701) 555-1111", to: "+7 (701) 555-3322" } } }
    }
  ];

  const demoTasks: Task[] = [
    {
      id: 1,
      title: "Разработка интерфейса Agent Smith",
      description: "Реализация дизайна пользовательского интерфейса для системы Agent Smith",
      status: "in_progress",
      assignedTo: 1
    },
    {
      id: 2,
      title: "Настройка интеграции с Moralis API",
      description: "Настройка и тестирование интеграции с блокчейн-сервисом Moralis",
      status: "completed",
      assignedTo: 1
    },
    {
      id: 3,
      title: "Анализ требований для модуля перевода",
      description: "Анализ и документирование требований для модуля машинного перевода в системе",
      status: "pending",
      assignedTo: 1
    }
  ];

  const demoDepartments: Department[] = [
    { id: 1, name: "Департамент информационной безопасности" },
    { id: 2, name: "Департамент цифровизации" },
    { id: 3, name: "Департамент разработки" },
    { id: 4, name: "Департамент по работе с гражданами" }
  ];

  const demoPositions: Position[] = [
    { id: 1, name: "Руководитель департамента", departmentId: 1 },
    { id: 2, name: "Руководитель департамента", departmentId: 2 },
    { id: 3, name: "Главный специалист", departmentId: 2 },
    { id: 4, name: "Специалист", departmentId: 2 },
    { id: 5, name: "Руководитель департамента", departmentId: 3 },
    { id: 6, name: "Разработчик", departmentId: 3 },
    { id: 7, name: "Тестировщик", departmentId: 3 },
    { id: 8, name: "Руководитель департамента", departmentId: 4 },
    { id: 9, name: "Консультант", departmentId: 4 }
  ];
  
  // Запросы к API
  const { data: user = demoUser, isLoading: isUserLoading } = useQuery<UserData>({
    queryKey: ['/api/users/current'],
    enabled: false, // Отключаем, пока не реализовано API
  });
  
  const { data: activities = demoActivities, isLoading: isActivitiesLoading } = useQuery<Activity[]>({
    queryKey: ['/api/activities/user', user.id],
    enabled: false,
  });
  
  const { data: tasks = demoTasks, isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks/user', user.id],
    enabled: false,
  });
  
  const { data: departments = demoDepartments, isLoading: isDepartmentsLoading } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
    enabled: false,
  });
  
  const { data: positions = demoPositions, isLoading: isPositionsLoading } = useQuery<Position[]>({
    queryKey: ['/api/positions'],
    enabled: false,
  });
  
  // Мутации для сохранения данных
  const updateUserMutation = useMutation({
    mutationFn: (userData: Partial<UserData>) => {
      return apiRequest('PATCH', `/api/users/${user.id}`, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/current'] });
      setShowEditDialog(false);
      setEditingUser(null);
      toast({
        title: "Успешно!",
        description: "Данные профиля обновлены",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить данные профиля",
        variant: "destructive",
      });
    }
  });
  
  const changePasswordMutation = useMutation({
    mutationFn: (data: typeof passwordData) => {
      return apiRequest('POST', '/api/users/password', data);
    },
    onSuccess: () => {
      setShowSecurityDialog(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      toast({
        title: "Успешно!",
        description: "Пароль успешно изменен",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось изменить пароль. Проверьте правильность текущего пароля.",
        variant: "destructive",
      });
    }
  });
  
  // Обработчик для редактирования профиля
  const handleEditProfile = () => {
    setEditingUser({...user});
    setShowEditDialog(true);
  };
  
  // Обработчик для изменения пароля
  const handleChangePassword = () => {
    setShowSecurityDialog(true);
  };
  
  // Обработчик для сохранения профиля
  const handleSaveProfile = () => {
    if (!editingUser) return;
    
    updateUserMutation.mutate({
      fullName: editingUser.fullName,
      email: editingUser.email,
      phone: editingUser.phone,
      departmentId: editingUser.departmentId,
      positionId: editingUser.positionId
    });
  };
  
  // Обработчик для сохранения нового пароля
  const handleSavePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Ошибка",
        description: "Пароли не совпадают",
        variant: "destructive",
      });
      return;
    }
    
    changePasswordMutation.mutate(passwordData);
  };
  
  // Обработчик для выхода из системы
  const handleLogout = () => {
    // В реальном приложении здесь был бы запрос к API для выхода
    toast({
      title: "Выход из системы",
      description: "Вы успешно вышли из системы",
    });
    
    // Перенаправление на страницу входа
    // window.location.href = "/login";
  };
  
  // Функция для отображения даты в локальном формате
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Функция для получения цвета статуса задачи
  const getStatusColor = (status: string) => {
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
        return "bg-gray-100 text-gray-800";
    }
  };
  
  // Функция для получения метки статуса задачи
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Ожидает";
      case "in_progress":
        return "В работе";
      case "completed":
        return "Выполнено";
      case "failed":
        return "Ошибка";
      default:
        return "Неизвестно";
    }
  };
  
  // Функция для получения типа действия
  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case "user_login":
        return "Вход в систему";
      case "user_logout":
        return "Выход из системы";
      case "entity_create":
        return "Создание";
      case "entity_update":
        return "Обновление";
      case "entity_delete":
        return "Удаление";
      case "blockchain_record":
        return "Запись в блокчейн";
      case "system_event":
        return "Системное событие";
      case "ai_processing":
        return "Обработка ИИ";
      default:
        return "Другое";
    }
  };
  
  // Функция для получения цвета типа действия
  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case "user_login":
      case "user_logout":
        return "bg-blue-100 text-blue-800";
      case "entity_create":
        return "bg-green-100 text-green-800";
      case "entity_update":
        return "bg-yellow-100 text-yellow-800";
      case "entity_delete":
        return "bg-red-100 text-red-800";
      case "blockchain_record":
        return "bg-purple-100 text-purple-800";
      case "system_event":
        return "bg-gray-100 text-gray-800";
      case "ai_processing":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  // Функция для получения доступных позиций для выбранного департамента
  const getPositionsForDepartment = (departmentId?: number) => {
    if (!departmentId) return [];
    return positions.filter(pos => pos.departmentId === departmentId);
  };
  
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Профиль пользователя</h1>
        <p className="mt-2 text-sm text-neutral-700">
          Управление личной информацией и настройками аккаунта
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                {user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.fullName} 
                    className="rounded-full w-28 h-28 object-cover border-4 border-white shadow"
                  />
                ) : (
                  <div className="rounded-full w-28 h-28 bg-emerald-600 flex items-center justify-center text-white text-3xl font-semibold">
                    {user.fullName.charAt(0)}
                  </div>
                )}
                
                <h2 className="mt-4 text-xl font-semibold text-neutral-900">{user.fullName}</h2>
                <p className="text-sm text-neutral-500">{user.department || "Департамент не указан"}</p>
                
                <Badge className="mt-2">
                  {user.role === "admin" ? "Администратор" : "Пользователь"}
                </Badge>
                
                <div className="w-full mt-6 space-y-2">
                  {user.email && (
                    <div className="flex items-center text-sm text-neutral-700 py-2 px-3 rounded-lg bg-neutral-50">
                      <AtSign className="h-4 w-4 text-neutral-500 mr-2" />
                      <span>{user.email}</span>
                    </div>
                  )}
                  
                  {user.phone && (
                    <div className="flex items-center text-sm text-neutral-700 py-2 px-3 rounded-lg bg-neutral-50">
                      <Phone className="h-4 w-4 text-neutral-500 mr-2" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-neutral-700 py-2 px-3 rounded-lg bg-neutral-50">
                    <User className="h-4 w-4 text-neutral-500 mr-2" />
                    <span>@{user.username}</span>
                  </div>
                </div>
                
                <div className="w-full mt-6 space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleEditProfile}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Редактировать профиль
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleChangePassword}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Изменить пароль
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Выйти из системы
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <Tabs defaultValue="activities">
            <TabsList className="mb-4">
              <TabsTrigger value="activities" className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Активность
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center">
                <Briefcase className="h-4 w-4 mr-2" />
                Задачи
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                Уведомления
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="activities">
              <Card>
                <CardHeader>
                  <CardTitle>История активности</CardTitle>
                  <CardDescription>
                    Последние действия пользователя в системе
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isActivitiesLoading ? (
                    <div className="animate-pulse space-y-4">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-16 bg-neutral-100 rounded-lg"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activities.map(activity => (
                        <div key={activity.id} className="flex items-start p-4 rounded-lg bg-white border">
                          <div className={`p-2 rounded-full ${getActionTypeColor(activity.actionType)}`}>
                            {activity.actionType === "user_login" && <User className="h-5 w-5" />}
                            {activity.actionType === "user_logout" && <LogOut className="h-5 w-5" />}
                            {activity.actionType === "entity_create" && <CheckCircle className="h-5 w-5" />}
                            {activity.actionType === "entity_update" && <Edit className="h-5 w-5" />}
                            {activity.actionType === "entity_delete" && <AlertCircle className="h-5 w-5" />}
                            {activity.actionType === "blockchain_record" && <Shield className="h-5 w-5" />}
                            {activity.actionType === "system_event" && <Bell className="h-5 w-5" />}
                            {activity.actionType === "ai_processing" && <Bot className="h-5 w-5" />}
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-sm font-medium text-neutral-900">{activity.description}</h4>
                                <p className="text-xs text-neutral-500">
                                  {activity.entityType && `${activity.entityType.charAt(0).toUpperCase() + activity.entityType.slice(1)}`}
                                  {activity.entityType && activity.entityId && ` #${activity.entityId}`}
                                </p>
                              </div>
                              <Badge className={getActionTypeColor(activity.actionType)}>
                                {getActionTypeLabel(activity.actionType)}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-neutral-500">
                              {formatDate(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {activities.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-neutral-500">Нет данных об активности</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="outline" size="sm">
                    <Clock className="h-4 w-4 mr-2" />
                    Показать всю историю
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="tasks">
              <Card>
                <CardHeader>
                  <CardTitle>Мои задачи</CardTitle>
                  <CardDescription>
                    Задачи, назначенные пользователю
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isTasksLoading ? (
                    <div className="animate-pulse space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-neutral-100 rounded-lg"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tasks.map(task => (
                        <div key={task.id} className="flex items-start p-4 rounded-lg bg-white border">
                          <div className={`p-2 rounded-full ${getStatusColor(task.status)}`}>
                            {task.status === "pending" && <Clock className="h-5 w-5" />}
                            {task.status === "in_progress" && <Briefcase className="h-5 w-5" />}
                            {task.status === "completed" && <CheckCircle className="h-5 w-5" />}
                            {task.status === "failed" && <AlertCircle className="h-5 w-5" />}
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-sm font-medium text-neutral-900">{task.title}</h4>
                                <p className="text-xs text-neutral-500 line-clamp-2">
                                  {task.description}
                                </p>
                              </div>
                              <Badge className={getStatusColor(task.status)}>
                                {getStatusLabel(task.status)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {tasks.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-neutral-500">Нет назначенных задач</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Показать все задачи
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Настройки уведомлений</CardTitle>
                  <CardDescription>
                    Управление настройками уведомлений
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-medium text-neutral-900">Уведомления по email</h4>
                        <p className="text-xs text-neutral-500">Получать уведомления на электронную почту</p>
                      </div>
                      <Switch checked={true} />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between py-3">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-medium text-neutral-900">Уведомления о новых задачах</h4>
                        <p className="text-xs text-neutral-500">Уведомлять о назначении новых задач</p>
                      </div>
                      <Switch checked={true} />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between py-3">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-medium text-neutral-900">Уведомления о мероприятиях</h4>
                        <p className="text-xs text-neutral-500">Уведомлять о предстоящих мероприятиях и совещаниях</p>
                      </div>
                      <Switch checked={true} />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between py-3">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-medium text-neutral-900">Уведомления ИИ-агентов</h4>
                        <p className="text-xs text-neutral-500">Уведомления о выполнении задач ИИ-агентами</p>
                      </div>
                      <Switch checked={false} />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between py-3">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-medium text-neutral-900">Уведомления о голосованиях ДАО</h4>
                        <p className="text-xs text-neutral-500">Уведомления о новых предложениях и результатах голосований</p>
                      </div>
                      <Switch checked={true} />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="default" size="sm">
                    Сохранить настройки
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Диалог редактирования профиля */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Редактирование профиля</DialogTitle>
            <DialogDescription>
              Внесите изменения в личную информацию пользователя
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">ФИО</Label>
                  <Input
                    id="fullName"
                    value={editingUser.fullName}
                    onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editingUser.email || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    value={editingUser.phone || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="department">Департамент</Label>
                  <Select
                    value={editingUser.departmentId?.toString() || ""}
                    onValueChange={(value) => {
                      const departmentId = parseInt(value);
                      setEditingUser({ 
                        ...editingUser, 
                        departmentId,
                        positionId: undefined
                      });
                    }}
                  >
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Выберите департамент" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="position">Должность</Label>
                  <Select
                    value={editingUser.positionId?.toString() || ""}
                    onValueChange={(value) => setEditingUser({ ...editingUser, positionId: parseInt(value) })}
                    disabled={!editingUser.departmentId}
                  >
                    <SelectTrigger id="position">
                      <SelectValue placeholder="Выберите должность" />
                    </SelectTrigger>
                    <SelectContent>
                      {getPositionsForDepartment(editingUser.departmentId).map((pos) => (
                        <SelectItem key={pos.id} value={pos.id.toString()}>
                          {pos.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveProfile}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог изменения пароля */}
      <Dialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Изменение пароля</DialogTitle>
            <DialogDescription>
              Введите текущий пароль и создайте новый
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Текущий пароль</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">Новый пароль</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Подтверждение пароля</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSecurityDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleSavePassword}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserProfile;