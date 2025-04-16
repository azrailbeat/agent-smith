import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Alert, 
  AlertDescription, 
  AlertTitle
} from "@/components/ui/alert";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  UserCog, 
  Shield, 
  Key, 
  FileText, 
  Bell, 
  History, 
  Save,
  AlertTriangle
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

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

const UserProfile = () => {
  const { toast } = useToast();
  
  // В реальном приложении эти данные должны приходить из API
  const [userData, setUserData] = useState<UserData>({
    id: 1,
    username: "admin",
    fullName: "Айнур Бекова",
    department: "Департамент цифровизации",
    role: "admin",
    email: "ainur.bekova@gov.kz",
    phone: "+7 (701) 234-5678",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&h=256&q=80",
    isActive: true
  });

  const [editMode, setEditMode] = useState(false);
  const [editedUserData, setEditedUserData] = useState<UserData>(userData);

  // Статистика для демонстрации
  const statistics = {
    tasksCompleted: 47,
    tasksTotal: 62,
    documentsProcessed: 128,
    blocksVerified: 384,
    lastActive: new Date().toLocaleString('ru-RU')
  };

  // Список активностей пользователя
  const userActivities = [
    { 
      id: 1, 
      actionType: "task_completed", 
      description: "Завершена задача 'Анализ обращения №2025-04578'", 
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleString('ru-RU')
    },
    { 
      id: 2, 
      actionType: "document_created", 
      description: "Создан новый документ 'Отчет о работе департамента за март 2025'", 
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toLocaleString('ru-RU')
    },
    { 
      id: 3, 
      actionType: "task_assigned", 
      description: "Назначена задача 'Подготовка квартального отчета'", 
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleString('ru-RU')
    },
    { 
      id: 4, 
      actionType: "system_login", 
      description: "Вход в систему", 
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleString('ru-RU')
    },
    { 
      id: 5, 
      actionType: "blockchain_transaction", 
      description: "Внесена запись в блокчейн для документа 'Договор о сотрудничестве №45/2025'", 
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleString('ru-RU')
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = () => {
    // В реальном приложении здесь должен быть запрос к API
    setUserData(editedUserData);
    setEditMode(false);
    toast({
      title: "Успешно!",
      description: "Профиль успешно обновлен",
    });
  };

  return (
    <>
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Профиль пользователя</h1>
            <p className="mt-2 text-sm text-neutral-700">
              Управление личными данными и настройками безопасности
            </p>
          </div>
          {!editMode && (
            <div className="mt-4 sm:mt-0">
              <Button onClick={() => setEditMode(true)}>
                <UserCog className="h-4 w-4 mr-2" />
                Редактировать профиль
              </Button>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            Профиль
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            Безопасность
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center">
            <History className="h-4 w-4 mr-2" />
            Активность
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            Уведомления
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Личные данные</CardTitle>
              <CardDescription>
                Просмотр и редактирование личных данных
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-full md:w-1/3">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={userData.avatarUrl} />
                      <AvatarFallback>{userData.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <h3 className="font-medium">{userData.fullName}</h3>
                      <p className="text-sm text-neutral-500">{userData.department}</p>
                      <p className="text-sm text-neutral-500">{userData.role === 'admin' ? 'Администратор' : 'Пользователь'}</p>
                    </div>
                    {editMode && (
                      <Button variant="outline" size="sm">
                        Изменить фото
                      </Button>
                    )}
                  </div>
                </div>
                <div className="w-full md:w-2/3 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">ФИО</Label>
                      {editMode ? (
                        <Input
                          id="fullName"
                          name="fullName"
                          value={editedUserData.fullName}
                          onChange={handleInputChange}
                        />
                      ) : (
                        <div className="p-2 border rounded-md bg-neutral-50">{userData.fullName}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Логин</Label>
                      <div className={`p-2 border rounded-md ${editMode ? 'bg-neutral-100' : 'bg-neutral-50'}`}>
                        {userData.username}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      {editMode ? (
                        <Input
                          id="email"
                          name="email"
                          value={editedUserData.email || ''}
                          onChange={handleInputChange}
                        />
                      ) : (
                        <div className="p-2 border rounded-md bg-neutral-50">{userData.email || 'Не указан'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Телефон</Label>
                      {editMode ? (
                        <Input
                          id="phone"
                          name="phone"
                          value={editedUserData.phone || ''}
                          onChange={handleInputChange}
                        />
                      ) : (
                        <div className="p-2 border rounded-md bg-neutral-50">{userData.phone || 'Не указан'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Департамент</Label>
                      {editMode ? (
                        <Input
                          id="department"
                          name="department"
                          value={editedUserData.department || ''}
                          onChange={handleInputChange}
                        />
                      ) : (
                        <div className="p-2 border rounded-md bg-neutral-50">{userData.department || 'Не указан'}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Роль</Label>
                      <div className="p-2 border rounded-md bg-neutral-50">
                        {userData.role === 'admin' ? 'Администратор' : 'Пользователь'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            {editMode && (
              <CardFooter className="border-t pt-4 flex justify-end space-x-2">
                <Button variant="outline" onClick={() => {
                  setEditMode(false);
                  setEditedUserData(userData);
                }}>
                  Отмена
                </Button>
                <Button onClick={handleSaveProfile}>
                  <Save className="h-4 w-4 mr-2" />
                  Сохранить
                </Button>
              </CardFooter>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Статистика работы</CardTitle>
              <CardDescription>
                Анализ активности и эффективности
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg bg-neutral-50">
                  <div className="text-sm text-neutral-600 mb-2">Задачи</div>
                  <div className="text-2xl font-semibold mb-2">
                    {statistics.tasksCompleted}/{statistics.tasksTotal}
                  </div>
                  <Progress 
                    value={(statistics.tasksCompleted / statistics.tasksTotal) * 100} 
                    className="h-2"
                  />
                  <div className="text-xs text-neutral-500 mt-2">
                    Выполнено {Math.round((statistics.tasksCompleted / statistics.tasksTotal) * 100)}% задач
                  </div>
                </div>
                <div className="p-4 border rounded-lg bg-neutral-50">
                  <div className="text-sm text-neutral-600 mb-2">Документы</div>
                  <div className="text-2xl font-semibold mb-2">
                    {statistics.documentsProcessed}
                  </div>
                  <div className="text-xs text-neutral-500">
                    Документов обработано
                  </div>
                </div>
                <div className="p-4 border rounded-lg bg-neutral-50">
                  <div className="text-sm text-neutral-600 mb-2">Блокчейн-записи</div>
                  <div className="text-2xl font-semibold mb-2">
                    {statistics.blocksVerified}
                  </div>
                  <div className="text-xs text-neutral-500">
                    Верифицированных записей
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Безопасность</CardTitle>
              <CardDescription>
                Настройки пароля и двухфакторной аутентификации
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <Key className="h-4 w-4 mr-2" />
                    Изменение пароля
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Текущий пароль</Label>
                      <Input id="currentPassword" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Новый пароль</Label>
                      <Input id="newPassword" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Подтверждение пароля</Label>
                      <Input id="confirmPassword" type="password" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button size="sm">Сменить пароль</Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Двухфакторная аутентификация
                  </h3>
                  <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Рекомендация</AlertTitle>
                    <AlertDescription>
                      Рекомендуем включить двухфакторную аутентификацию для повышения безопасности вашего аккаунта.
                    </AlertDescription>
                  </Alert>
                  <Button variant="outline">Настроить 2FA</Button>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Журнал доступа
                  </h3>
                  <div className="text-sm text-neutral-600 mb-3">
                    Последние входы в систему
                  </div>
                  <div className="space-y-2">
                    <div className="p-3 border rounded-md bg-neutral-50">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">Успешный вход</div>
                          <div className="text-sm text-neutral-500">IP: 185.68.56.22, Казахстан, Астана</div>
                        </div>
                        <div className="text-sm text-neutral-500">Сегодня, 09:32</div>
                      </div>
                    </div>
                    <div className="p-3 border rounded-md bg-neutral-50">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">Успешный вход</div>
                          <div className="text-sm text-neutral-500">IP: 185.68.56.22, Казахстан, Астана</div>
                        </div>
                        <div className="text-sm text-neutral-500">Вчера, 17:45</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>История активности</CardTitle>
              <CardDescription>
                Журнал действий пользователя в системе
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userActivities.map(activity => (
                  <div key={activity.id} className="p-3 border rounded-md bg-neutral-50">
                    <div className="flex flex-col md:flex-row md:justify-between">
                      <div>
                        <div className="font-medium">{activity.description}</div>
                        <div className="text-sm text-neutral-500">
                          Тип действия: {activity.actionType.replace('_', ' ')}
                        </div>
                      </div>
                      <div className="text-sm text-neutral-500 mt-2 md:mt-0">
                        {activity.timestamp}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" className="w-full">
                Показать больше
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Настройки уведомлений</CardTitle>
              <CardDescription>
                Управление каналами и типами уведомлений
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3">Email-уведомления</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <div className="font-medium">Новые задачи</div>
                        <div className="text-sm text-neutral-500">Уведомления о назначении новых задач</div>
                      </div>
                      <div>
                        <input type="checkbox" id="task-email" className="toggle" defaultChecked />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <div className="font-medium">Комментарии</div>
                        <div className="text-sm text-neutral-500">Уведомления о новых комментариях к задачам</div>
                      </div>
                      <div>
                        <input type="checkbox" id="comment-email" className="toggle" defaultChecked />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <div className="font-medium">Системные события</div>
                        <div className="text-sm text-neutral-500">Важные системные уведомления</div>
                      </div>
                      <div>
                        <input type="checkbox" id="system-email" className="toggle" defaultChecked />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-3">Браузерные уведомления</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <div className="font-medium">Новые задачи</div>
                        <div className="text-sm text-neutral-500">Уведомления о назначении новых задач</div>
                      </div>
                      <div>
                        <input type="checkbox" id="task-browser" className="toggle" defaultChecked />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <div className="font-medium">Сообщения</div>
                        <div className="text-sm text-neutral-500">Уведомления о новых сообщениях</div>
                      </div>
                      <div>
                        <input type="checkbox" id="message-browser" className="toggle" defaultChecked />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button className="w-full">
                Сохранить настройки
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default UserProfile;