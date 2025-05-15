import { useState, useEffect } from 'react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Users,
  Shield,
  Lock,
  Building,
  KeyRound
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// Временные типы данных для примера
type Role = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
};

type Permission = {
  id: string;
  name: string;
  description: string;
  resource: string;
  actions: string[];
};

type UserWithRoles = {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  roles: string[];
  active: boolean;
};

// Демо-данные
const demoRoles: Role[] = [
  {
    id: '1',
    name: 'Администратор',
    description: 'Полный доступ к системе',
    permissions: ['all:read', 'all:write', 'all:delete', 'all:admin'],
    createdAt: '2025-01-01',
    updatedAt: '2025-04-15'
  },
  {
    id: '2',
    name: 'Руководитель отдела',
    description: 'Доступ к управлению отделом и сотрудниками',
    permissions: ['department:read', 'department:write', 'employees:read', 'employees:write', 'tasks:read', 'tasks:write'],
    createdAt: '2025-01-10',
    updatedAt: '2025-04-10'
  },
  {
    id: '3',
    name: 'Сотрудник',
    description: 'Базовый доступ к системе',
    permissions: ['profile:read', 'profile:write', 'tasks:read', 'documents:read'],
    createdAt: '2025-01-15',
    updatedAt: '2025-03-20'
  },
  {
    id: '4',
    name: 'Аналитик',
    description: 'Доступ к аналитическим данным',
    permissions: ['analytics:read', 'reports:read', 'reports:write'],
    createdAt: '2025-02-01',
    updatedAt: '2025-04-01'
  }
];

const demoPermissions: Permission[] = [
  {
    id: '1',
    name: 'all:admin',
    description: 'Административный доступ ко всем ресурсам',
    resource: 'system',
    actions: ['read', 'write', 'delete', 'admin']
  },
  {
    id: '2',
    name: 'department:read',
    description: 'Просмотр данных отдела',
    resource: 'department',
    actions: ['read']
  },
  {
    id: '3',
    name: 'department:write',
    description: 'Редактирование данных отдела',
    resource: 'department',
    actions: ['write']
  },
  {
    id: '4',
    name: 'employees:read',
    description: 'Просмотр данных сотрудников',
    resource: 'employees',
    actions: ['read']
  },
  {
    id: '5',
    name: 'employees:write',
    description: 'Управление данными сотрудников',
    resource: 'employees',
    actions: ['write']
  },
  {
    id: '6',
    name: 'tasks:read',
    description: 'Просмотр задач',
    resource: 'tasks',
    actions: ['read']
  },
  {
    id: '7',
    name: 'tasks:write',
    description: 'Управление задачами',
    resource: 'tasks',
    actions: ['write']
  }
];

const demoUsers: UserWithRoles[] = [
  {
    id: '1',
    name: 'Иванов Иван Иванович',
    email: 'ivanov@example.com',
    department: 'IT отдел',
    position: 'Руководитель IT отдела',
    roles: ['Администратор'],
    active: true
  },
  {
    id: '2',
    name: 'Петров Петр Петрович',
    email: 'petrov@example.com',
    department: 'Отдел маркетинга',
    position: 'Руководитель отдела маркетинга',
    roles: ['Руководитель отдела'],
    active: true
  },
  {
    id: '3',
    name: 'Сидорова Анна Михайловна',
    email: 'sidorova@example.com',
    department: 'Аналитический отдел',
    position: 'Старший аналитик',
    roles: ['Аналитик', 'Сотрудник'],
    active: true
  },
  {
    id: '4',
    name: 'Смирнов Алексей Владимирович',
    email: 'smirnov@example.com',
    department: 'IT отдел',
    position: 'Разработчик',
    roles: ['Сотрудник'],
    active: true
  }
];

const resourceTypes = [
  'system', 'department', 'employees', 'tasks', 'documents', 'reports', 'analytics', 'profile'
];

const actionTypes = ['read', 'write', 'delete', 'admin'];

// Компонент для управления RBAC
export default function RbacManagement() {
  const [activeTab, setActiveTab] = useState('roles');
  const [roles, setRoles] = useState<Role[]>(demoRoles);
  const [permissions, setPermissions] = useState<Permission[]>(demoPermissions);
  const [users, setUsers] = useState<UserWithRoles[]>(demoUsers);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState<Partial<Role>>({
    name: '',
    description: '',
    permissions: []
  });
  const [editPermission, setEditPermission] = useState<Permission | null>(null);
  const [newPermission, setNewPermission] = useState<Partial<Permission>>({
    name: '',
    description: '',
    resource: '',
    actions: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Фильтрация элементов по поисковому запросу
  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPermissions = permissions.filter(permission => 
    permission.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    permission.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.resource.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Обработчики событий
  const handleCreateRole = () => {
    if (!newRole.name || !newRole.description) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }

    const newRoleObj: Role = {
      id: (roles.length + 1).toString(),
      name: newRole.name,
      description: newRole.description,
      permissions: newRole.permissions || [],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    setRoles([...roles, newRoleObj]);
    setNewRole({
      name: '',
      description: '',
      permissions: []
    });

    toast({
      title: "Успешно",
      description: `Роль "${newRoleObj.name}" создана`,
    });
  };

  const handleUpdateRole = () => {
    if (!editRole) return;

    const updatedRoles = roles.map(role => 
      role.id === editRole.id ? { ...editRole, updatedAt: new Date().toISOString().split('T')[0] } : role
    );

    setRoles(updatedRoles);
    setEditRole(null);

    toast({
      title: "Успешно",
      description: `Роль "${editRole.name}" обновлена`,
    });
  };

  const handleDeleteRole = (id: string) => {
    setRoles(roles.filter(role => role.id !== id));

    toast({
      title: "Успешно",
      description: "Роль удалена",
    });
  };

  const handleCreatePermission = () => {
    if (!newPermission.name || !newPermission.description || !newPermission.resource || !newPermission.actions || newPermission.actions.length === 0) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }

    const newPermissionObj: Permission = {
      id: (permissions.length + 1).toString(),
      name: newPermission.name,
      description: newPermission.description,
      resource: newPermission.resource,
      actions: newPermission.actions || []
    };

    setPermissions([...permissions, newPermissionObj]);
    setNewPermission({
      name: '',
      description: '',
      resource: '',
      actions: []
    });

    toast({
      title: "Успешно",
      description: `Разрешение "${newPermissionObj.name}" создано`,
    });
  };

  const handleUpdatePermission = () => {
    if (!editPermission) return;

    const updatedPermissions = permissions.map(permission => 
      permission.id === editPermission.id ? editPermission : permission
    );

    setPermissions(updatedPermissions);
    setEditPermission(null);

    toast({
      title: "Успешно",
      description: `Разрешение "${editPermission.name}" обновлено`,
    });
  };

  const handleDeletePermission = (id: string) => {
    setPermissions(permissions.filter(permission => permission.id !== id));

    toast({
      title: "Успешно",
      description: "Разрешение удалено",
    });
  };

  const handleTogglePermissionForRole = (roleId: string, permissionName: string) => {
    const updatedRoles = roles.map(role => {
      if (role.id === roleId) {
        const hasPermission = role.permissions.includes(permissionName);
        const newPermissions = hasPermission
          ? role.permissions.filter(p => p !== permissionName)
          : [...role.permissions, permissionName];
        
        return { ...role, permissions: newPermissions, updatedAt: new Date().toISOString().split('T')[0] };
      }
      return role;
    });

    setRoles(updatedRoles);
  };

  const handleToggleRoleForUser = (userId: string, roleName: string) => {
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        const hasRole = user.roles.includes(roleName);
        const newRoles = hasRole
          ? user.roles.filter(r => r !== roleName)
          : [...user.roles, roleName];
        
        return { ...user, roles: newRoles };
      }
      return user;
    });

    setUsers(updatedUsers);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold flex items-center">
          <Shield className="mr-4 h-8 w-8" />
          Управление доступом
        </h1>
      </div>

      <div className="mb-6">
        <div className="flex w-full max-w-sm items-center space-x-2 mb-4">
          <Input 
            placeholder="Поиск..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="roles" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Роли
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center">
            <KeyRound className="mr-2 h-4 w-4" />
            Разрешения
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Пользователи и роли
          </TabsTrigger>
        </TabsList>

        {/* Вкладка ролей */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold mb-4">Управление ролями</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Создать новую роль</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создание новой роли</DialogTitle>
                  <DialogDescription>
                    Заполните данные для создания новой роли
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="roleName" className="text-right">
                      Название роли
                    </label>
                    <Input
                      id="roleName"
                      className="col-span-3"
                      value={newRole.name}
                      onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="roleDescription" className="text-right">
                      Описание
                    </label>
                    <Input
                      id="roleDescription"
                      className="col-span-3"
                      value={newRole.description}
                      onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <label className="text-right pt-2">
                      Разрешения
                    </label>
                    <div className="col-span-3 grid grid-cols-2 gap-2">
                      {permissions.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`permission-${permission.id}`} 
                            checked={(newRole.permissions || []).includes(permission.name)}
                            onCheckedChange={(checked) => {
                              const perms = newRole.permissions || [];
                              setNewRole({
                                ...newRole, 
                                permissions: checked 
                                  ? [...perms, permission.name]
                                  : perms.filter(p => p !== permission.name)
                              });
                            }}
                          />
                          <label 
                            htmlFor={`permission-${permission.id}`}
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {permission.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Отмена</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button onClick={handleCreateRole}>Создать</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white rounded-lg border shadow-sm">
            <Table>
              <TableCaption>Список ролей системы</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Разрешения</TableHead>
                  <TableHead>Последнее обновление</TableHead>
                  <TableHead className="w-[150px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>{role.description}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.map((permission, index) => (
                          <Badge key={index} variant="outline">{permission}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{role.updatedAt}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditRole(role)}>
                              Редактировать
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Редактирование роли</DialogTitle>
                              <DialogDescription>
                                Измените данные роли
                              </DialogDescription>
                            </DialogHeader>
                            {editRole && (
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <label htmlFor="editRoleName" className="text-right">
                                    Название роли
                                  </label>
                                  <Input
                                    id="editRoleName"
                                    className="col-span-3"
                                    value={editRole.name}
                                    onChange={(e) => setEditRole({...editRole, name: e.target.value})}
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <label htmlFor="editRoleDescription" className="text-right">
                                    Описание
                                  </label>
                                  <Input
                                    id="editRoleDescription"
                                    className="col-span-3"
                                    value={editRole.description}
                                    onChange={(e) => setEditRole({...editRole, description: e.target.value})}
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4">
                                  <label className="text-right pt-2">
                                    Разрешения
                                  </label>
                                  <div className="col-span-3 grid grid-cols-2 gap-2">
                                    {permissions.map((permission) => (
                                      <div key={permission.id} className="flex items-center space-x-2">
                                        <Checkbox 
                                          id={`edit-permission-${permission.id}`} 
                                          checked={editRole.permissions.includes(permission.name)}
                                          onCheckedChange={(checked) => {
                                            setEditRole({
                                              ...editRole, 
                                              permissions: checked 
                                                ? [...editRole.permissions, permission.name]
                                                : editRole.permissions.filter(p => p !== permission.name)
                                            });
                                          }}
                                        />
                                        <label 
                                          htmlFor={`edit-permission-${permission.id}`}
                                          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                          {permission.name}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Отмена</Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button onClick={handleUpdateRole}>Сохранить</Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeleteRole(role.id)}
                        >
                          Удалить
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Вкладка разрешений */}
        <TabsContent value="permissions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold mb-4">Управление разрешениями</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Создать новое разрешение</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создание нового разрешения</DialogTitle>
                  <DialogDescription>
                    Заполните данные для создания нового разрешения
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="permissionName" className="text-right">
                      Название
                    </label>
                    <Input
                      id="permissionName"
                      className="col-span-3"
                      value={newPermission.name}
                      onChange={(e) => setNewPermission({...newPermission, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="permissionDescription" className="text-right">
                      Описание
                    </label>
                    <Input
                      id="permissionDescription"
                      className="col-span-3"
                      value={newPermission.description}
                      onChange={(e) => setNewPermission({...newPermission, description: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="permissionResource" className="text-right">
                      Ресурс
                    </label>
                    <Select
                      value={newPermission.resource}
                      onValueChange={(value) => setNewPermission({...newPermission, resource: value})}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Выберите ресурс" />
                      </SelectTrigger>
                      <SelectContent>
                        {resourceTypes.map((resource) => (
                          <SelectItem key={resource} value={resource}>{resource}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <label className="text-right pt-2">
                      Действия
                    </label>
                    <div className="col-span-3 flex flex-wrap gap-2">
                      {actionTypes.map((action) => (
                        <div key={action} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`action-${action}`} 
                            checked={(newPermission.actions || []).includes(action)}
                            onCheckedChange={(checked) => {
                              const actions = newPermission.actions || [];
                              setNewPermission({
                                ...newPermission, 
                                actions: checked 
                                  ? [...actions, action]
                                  : actions.filter(a => a !== action)
                              });
                            }}
                          />
                          <label 
                            htmlFor={`action-${action}`}
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {action}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Отмена</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button onClick={handleCreatePermission}>Создать</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white rounded-lg border shadow-sm">
            <Table>
              <TableCaption>Список разрешений системы</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Ресурс</TableHead>
                  <TableHead>Действия</TableHead>
                  <TableHead className="w-[150px]">Операции</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPermissions.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell className="font-medium">{permission.name}</TableCell>
                    <TableCell>{permission.description}</TableCell>
                    <TableCell>{permission.resource}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {permission.actions.map((action, index) => (
                          <Badge key={index} variant="outline">{action}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditPermission(permission)}>
                              Редактировать
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Редактирование разрешения</DialogTitle>
                              <DialogDescription>
                                Измените данные разрешения
                              </DialogDescription>
                            </DialogHeader>
                            {editPermission && (
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <label htmlFor="editPermissionName" className="text-right">
                                    Название
                                  </label>
                                  <Input
                                    id="editPermissionName"
                                    className="col-span-3"
                                    value={editPermission.name}
                                    onChange={(e) => setEditPermission({...editPermission, name: e.target.value})}
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <label htmlFor="editPermissionDescription" className="text-right">
                                    Описание
                                  </label>
                                  <Input
                                    id="editPermissionDescription"
                                    className="col-span-3"
                                    value={editPermission.description}
                                    onChange={(e) => setEditPermission({...editPermission, description: e.target.value})}
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <label htmlFor="editPermissionResource" className="text-right">
                                    Ресурс
                                  </label>
                                  <Select
                                    value={editPermission.resource}
                                    onValueChange={(value) => setEditPermission({...editPermission, resource: value})}
                                  >
                                    <SelectTrigger className="col-span-3">
                                      <SelectValue placeholder="Выберите ресурс" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {resourceTypes.map((resource) => (
                                        <SelectItem key={resource} value={resource}>{resource}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4">
                                  <label className="text-right pt-2">
                                    Действия
                                  </label>
                                  <div className="col-span-3 flex flex-wrap gap-2">
                                    {actionTypes.map((action) => (
                                      <div key={action} className="flex items-center space-x-2">
                                        <Checkbox 
                                          id={`edit-action-${action}`} 
                                          checked={editPermission.actions.includes(action)}
                                          onCheckedChange={(checked) => {
                                            setEditPermission({
                                              ...editPermission, 
                                              actions: checked 
                                                ? [...editPermission.actions, action]
                                                : editPermission.actions.filter(a => a !== action)
                                            });
                                          }}
                                        />
                                        <label 
                                          htmlFor={`edit-action-${action}`}
                                          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                          {action}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Отмена</Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button onClick={handleUpdatePermission}>Сохранить</Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeletePermission(permission.id)}
                        >
                          Удалить
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Вкладка пользователей */}
        <TabsContent value="users" className="space-y-4">
          <h2 className="text-2xl font-semibold mb-4">Пользователи и их роли</h2>

          <div className="bg-white rounded-lg border shadow-sm">
            <Table>
              <TableCaption>Список пользователей и их роли</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Отдел</TableHead>
                  <TableHead>Должность</TableHead>
                  <TableHead>Роли</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-[180px]">Операции</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>{user.position}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role, index) => (
                          <Badge key={index} variant="outline">{role}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? "outline" : "destructive"} className={user.active ? "bg-green-100 text-green-800" : ""}>
                        {user.active ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Управление ролями
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Управление ролями пользователя</DialogTitle>
                            <DialogDescription>
                              Назначьте роли пользователю {user.name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <div className="space-y-4">
                              {roles.map((role) => (
                                <div key={role.id} className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={`user-role-${user.id}-${role.id}`} 
                                    checked={user.roles.includes(role.name)}
                                    onCheckedChange={(checked) => {
                                      handleToggleRoleForUser(user.id, role.name);
                                    }}
                                  />
                                  <div>
                                    <label 
                                      htmlFor={`user-role-${user.id}-${role.id}`}
                                      className="font-medium"
                                    >
                                      {role.name}
                                    </label>
                                    <p className="text-sm text-muted-foreground">{role.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button>Готово</Button>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}