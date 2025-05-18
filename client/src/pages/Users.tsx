import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from "@/components/ui/card";
import { UserRole } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  PlusCircle, 
  Pencil, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  FileDown, 
  Search, 
  Filter,
  User,
  UserPlus,
  Users as UsersIcon,
  Settings,
  Shield,
  BadgeInfo,
  Clock,
  ListFilter,
  ArrowDownUp,
  FileSpreadsheet,
  BarChart4,
  Mail,
  Phone
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Badge
} from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  department: string | null;
  role: string;
  isActive: boolean;
  phone: string | null;
  avatarUrl: string | null;
}

interface UserFormData {
  username: string;
  password: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  phone: string;
  isActive: boolean;
}

const Users = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: "",
    password: "",
    fullName: "",
    email: "",
    department: "",
    role: "operator",
    phone: "",
    isActive: true,
  });

  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: (data: UserFormData) => 
      apiRequest("/api/users", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Пользователь создан",
        description: "Новый пользователь успешно добавлен в систему",
      });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: `Не удалось создать пользователя: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: (data: { id: number; userData: Partial<UserFormData> }) => 
      apiRequest(`/api/users/${data.id}`, "PUT", data.userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Пользователь обновлен",
        description: "Данные пользователя успешно обновлены",
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: `Не удалось обновить данные пользователя: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/users/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Пользователь удален",
        description: "Пользователь успешно удален из системы",
      });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: `Не удалось удалить пользователя: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      fullName: "",
      email: "",
      department: "",
      role: "operator",
      phone: "",
      isActive: true,
    });
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(formData);
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    // Подготавливаем данные пользователя для отправки
    const userData = { ...formData };
    // Удаляем пароль, если он пустой
    if (userData.password === "") {
      const { password, ...rest } = userData;
      return updateUserMutation.mutate({
        id: selectedUser.id,
        userData: rest,
      });
    }

    updateUserMutation.mutate({
      id: selectedUser.id,
      userData,
    });
  };

  const handleDeleteUser = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: "", // Пароль не передаем для редактирования
      fullName: user.fullName,
      email: user.email || "",
      department: user.department || "",
      role: user.role,
      phone: user.phone || "",
      isActive: user.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  // Получаем список всех уникальных отделов
  const departments = users ? 
    Array.from(new Set(users.map(user => user.department).filter(Boolean) as string[])) : 
    [];
  
  // Расширенная фильтрация
  const filteredUsers = users?.filter(user => {
    // Фильтр по вкладке
    const tabFilter = 
      activeTab === "all" ? true :
      activeTab === "active" ? user.isActive :
      activeTab === "inactive" ? !user.isActive :
      activeTab === "admins" ? user.role === UserRole.ADMIN :
      activeTab === "managers" ? user.role === UserRole.MANAGER :
      activeTab === "operators" ? user.role === UserRole.OPERATOR :
      true;
    
    // Фильтр по поисковому запросу
    const searchFilter = !searchQuery ? true : (
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.department && user.department.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    // Фильтр по отделу
    const deptFilter = !departmentFilter ? true : 
      user.department === departmentFilter;
    
    return tabFilter && searchFilter && deptFilter;
  });

  const getRoleName = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return "Администратор";
      case UserRole.MANAGER:
        return "Руководитель";
      case UserRole.OPERATOR:
        return "Оператор";
      default:
        return role;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Загрузка пользователей...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <div className="text-destructive text-xl">Ошибка загрузки данных</div>
        <p className="text-muted-foreground">{`${error}`}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Пользователи</h1>
          <p className="text-muted-foreground mt-1">Управление учетными записями и правами доступа</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            // Экспорт пользователей
            if (!users || users.length === 0) {
              toast({
                title: "Нет данных для экспорта",
                variant: "destructive",
              });
              return;
            }
            
            // Готовим заголовки
            const headers = ["ID", "Имя пользователя", "ФИО", "Роль", "Отдел", "Email", "Телефон", "Статус"];
            
            // Готовим данные строк
            const rows = filteredUsers?.map(user => [
              user.id,
              user.username,
              user.fullName,
              getRoleName(user.role),
              user.department || "",
              user.email || "",
              user.phone || "",
              user.isActive ? "Активен" : "Неактивен"
            ]);
            
            if (!rows || rows.length === 0) {
              toast({
                title: "Нет данных для экспорта",
                variant: "destructive",
              });
              return;
            }
            
            // Формируем CSV
            const csvContent = [
              headers.join(','),
              ...rows.map(row => row.join(','))
            ].join('\n');
            
            // Создаем временную ссылку для скачивания файла
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`);
            link.click();
          }}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Добавить пользователя
          </Button>
        </div>
      </div>

      {/* Статистика пользователей */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Всего пользователей</p>
                <p className="text-3xl font-bold mt-1">{users?.length || 0}</p>
              </div>
              <UsersIcon className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Администраторы</p>
                <p className="text-3xl font-bold mt-1">
                  {users?.filter(u => u.role === UserRole.ADMIN).length || 0}
                </p>
              </div>
              <Shield className="h-8 w-8 text-red-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Руководители</p>
                <p className="text-3xl font-bold mt-1">
                  {users?.filter(u => u.role === UserRole.MANAGER).length || 0}
                </p>
              </div>
              <BadgeInfo className="h-8 w-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Операторы</p>
                <p className="text-3xl font-bold mt-1">
                  {users?.filter(u => u.role === UserRole.OPERATOR).length || 0}
                </p>
              </div>
              <User className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Список пользователей системы</CardTitle>
          <CardDescription>
            Управление аккаунтами и правами доступа в системе
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Поиск и фильтры */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative w-full md:w-1/2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Поиск по имени, отделу, email..."
                className="pl-9 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    {departmentFilter || "Все отделы"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Фильтр по отделу</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDepartmentFilter(null)} className={!departmentFilter ? 'bg-secondary' : ''}>
                    Все отделы
                  </DropdownMenuItem>
                  {departments.map((dept) => (
                    <DropdownMenuItem 
                      key={dept} 
                      onClick={() => setDepartmentFilter(dept)}
                      className={departmentFilter === dept ? 'bg-secondary' : ''}
                    >
                      {dept}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center">
                    <ArrowDownUp className="h-4 w-4 mr-2" />
                    Сортировка
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Сортировать по</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => toast({ title: "Сортировка по имени", description: "Функция будет реализована в следующем обновлении" })}>
                    Имя (А-Я)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast({ title: "Сортировка по имени", description: "Функция будет реализована в следующем обновлении" })}>
                    Имя (Я-А)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast({ title: "Сортировка по отделу", description: "Функция будет реализована в следующем обновлении" })}>
                    Отдел (А-Я)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast({ title: "Сортировка по роли", description: "Функция будет реализована в следующем обновлении" })}>
                    Роль
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button
                variant="outline"
                onClick={() => {
                  toast({
                    title: "Аналитика пользователей", 
                    description: "Модуль аналитики будет доступен в ближайшем обновлении"
                  });
                }}
              >
                <BarChart4 className="h-4 w-4 mr-2" />
                Аналитика
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">Все</TabsTrigger>
              <TabsTrigger value="active">Активные</TabsTrigger>
              <TabsTrigger value="inactive">Неактивные</TabsTrigger>
              <TabsTrigger value="admins">Администраторы</TabsTrigger>
              <TabsTrigger value="managers">Руководители</TabsTrigger>
              <TabsTrigger value="operators">Операторы</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {/* Таблица пользователей */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Контакты</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead>Отдел</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers && filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={user.avatarUrl || undefined} alt={user.fullName} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {user.fullName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.fullName}</div>
                                <div className="text-sm text-muted-foreground">{user.username}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.email && (
                              <div className="flex items-center text-sm mb-1">
                                <Mail className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                <span>{user.email}</span>
                              </div>
                            )}
                            {user.phone && (
                              <div className="flex items-center text-sm">
                                <Phone className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                            {!user.email && !user.phone && (
                              <span className="text-muted-foreground text-sm">Не указаны</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`
                              ${user.role === UserRole.ADMIN 
                                ? 'bg-red-100 text-red-800 hover:bg-red-100' 
                                : user.role === UserRole.MANAGER 
                                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' 
                                  : 'bg-green-100 text-green-800 hover:bg-green-100'
                              }
                            `}>
                              {getRoleName(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.department ? (
                              <span>{user.department}</span>
                            ) : (
                              <span className="text-muted-foreground">Не указан</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.isActive ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle className="mr-1 h-3.5 w-3.5" />
                                Активен
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                <XCircle className="mr-1 h-3.5 w-3.5" />
                                Неактивен
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-full"
                              onClick={() => openEditDialog(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-full"
                              onClick={() => openDeleteDialog(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="32"
                              height="32"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="mb-2 opacity-50"
                            >
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            <p>Пользователи не найдены</p>
                            <p className="text-sm">{searchQuery && "Попробуйте изменить параметры поиска"}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Диалог добавления пользователя */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Добавить нового пользователя</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Имя пользователя</Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">ФИО</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Отдел</Label>
                  <Input
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Роль</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => handleSelectChange("role", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите роль" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.OPERATOR}>
                        Оператор
                      </SelectItem>
                      <SelectItem value={UserRole.MANAGER}>
                        Руководитель
                      </SelectItem>
                      <SelectItem value={UserRole.ADMIN}>
                        Администратор
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isActive">Активный пользователь</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Добавить
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования пользователя */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Редактировать пользователя</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditUser}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Имя пользователя</Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Пароль (не заполняйте, если не меняете)</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">ФИО</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Отдел</Label>
                  <Input
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Роль</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => handleSelectChange("role", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите роль" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.OPERATOR}>
                        Оператор
                      </SelectItem>
                      <SelectItem value={UserRole.MANAGER}>
                        Руководитель
                      </SelectItem>
                      <SelectItem value={UserRole.ADMIN}>
                        Администратор
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isActive">Активный пользователь</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Сохранить
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления пользователя */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь удалить пользователя{" "}
              <strong>{selectedUser?.fullName}</strong>. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              className="bg-red-600 text-white hover:bg-red-700">
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Удаление...
                </>
              ) : (
                "Удалить"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Users;