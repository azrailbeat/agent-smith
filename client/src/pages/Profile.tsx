import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

import { User as UserType } from "@/lib/types";
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
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Building, Phone, Calendar, MapPin, Clock, Save, Edit } from "lucide-react";

const ProfilePage = () => {
  const { toast } = useToast();

  // Демо данные пользователя
  const demoUser: UserType = {
    id: 1,
    username: "admin",
    fullName: "Даулет Нурланов",
    email: "daulet.nurlanov@gov.kz",
    department: "Управление ИТ",
    position: "Старший разработчик",
    phone: "+7 (705) 123-45-67",
    joinDate: "01.06.2023",
    location: "Астана",
    timeZone: "Asia/Almaty (GMT+6)",
    bio: "Разработчик с опытом работы в государственном секторе. Специализируюсь на интеграции AI-решений и блокчейн технологий.",
    role: "admin",
    avatarUrl: null,
    skills: ["JavaScript", "React", "Node.js", "AI Integration", "Blockchain"]
  };

  // Состояние для редактируемого пользователя
  const [editMode, setEditMode] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType>(demoUser);

  // Запрос данных пользователя с сервера (использует демо-данные)
  const { data: currentUser = demoUser } = useQuery<UserType>({
    queryKey: ['/api/users/me'],
    enabled: false, // Отключаем на демо
  });

  // Мутация для обновления данных пользователя
  const updateUserMutation = useMutation({
    mutationFn: (userData: Partial<UserType>) => {
      return apiRequest('PATCH', `/api/users/${currentUser.id}`, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      toast({
        title: "Профиль обновлен",
        description: "Ваши данные успешно сохранены"
      });
      setEditMode(false);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить профиль",
        variant: "destructive"
      });
    }
  });

  // Функция для сохранения профиля
  const handleSaveProfile = () => {
    updateUserMutation.mutate(editingUser);
  };

  return (
    <div className="container max-w-5xl mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Профиль сотрудника</h1>
        <p className="mt-2 text-sm text-slate-500">
          Управление персональной информацией и настройками
        </p>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="w-full border-b pb-0 mb-2">
          <TabsTrigger value="personal" className="rounded-b-none">Личная информация</TabsTrigger>
          <TabsTrigger value="skills" className="rounded-b-none">Компетенции</TabsTrigger>
          <TabsTrigger value="activity" className="rounded-b-none">Активность</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle>Персональные данные</CardTitle>
                <CardDescription>
                  Основная информация о вашем профиле
                </CardDescription>
              </div>
              <Button 
                variant={editMode ? "default" : "outline"} 
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Сохранить
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Редактировать
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="pb-6 space-y-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="sm:w-1/3">
                  <div className="mb-5 flex justify-center">
                    <div className="h-32 w-32 rounded-full bg-emerald-100 flex items-center justify-center">
                      <span className="text-4xl font-semibold text-emerald-600">{editingUser.fullName.charAt(0)}</span>
                    </div>
                  </div>
                  {editMode && (
                    <div className="text-center">
                      <Button variant="outline" size="sm">Обновить фото</Button>
                    </div>
                  )}
                </div>
                <div className="sm:w-2/3 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">ФИО</Label>
                      <div className="flex mt-1.5">
                        <div className="flex items-center mr-2 text-slate-400"><User size={18} /></div>
                        {editMode ? (
                          <Input 
                            id="fullName" 
                            value={editingUser.fullName} 
                            onChange={(e) => setEditingUser({...editingUser, fullName: e.target.value})} 
                          />
                        ) : (
                          <div className="text-slate-700 pt-1">{currentUser.fullName}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <div className="flex mt-1.5">
                        <div className="flex items-center mr-2 text-slate-400"><Mail size={18} /></div>
                        {editMode ? (
                          <Input 
                            id="email" 
                            value={editingUser.email} 
                            onChange={(e) => setEditingUser({...editingUser, email: e.target.value})} 
                          />
                        ) : (
                          <div className="text-slate-700 pt-1">{currentUser.email}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="department">Департамент</Label>
                      <div className="flex mt-1.5">
                        <div className="flex items-center mr-2 text-slate-400"><Building size={18} /></div>
                        {editMode ? (
                          <Input 
                            id="department" 
                            value={editingUser.department} 
                            onChange={(e) => setEditingUser({...editingUser, department: e.target.value})} 
                          />
                        ) : (
                          <div className="text-slate-700 pt-1">{currentUser.department}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="position">Должность</Label>
                      <div className="flex mt-1.5">
                        <div className="flex items-center mr-2 text-slate-400"><Building size={18} /></div>
                        {editMode ? (
                          <Input 
                            id="position" 
                            value={editingUser.position} 
                            onChange={(e) => setEditingUser({...editingUser, position: e.target.value})} 
                          />
                        ) : (
                          <div className="text-slate-700 pt-1">{currentUser.position}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone">Телефон</Label>
                      <div className="flex mt-1.5">
                        <div className="flex items-center mr-2 text-slate-400"><Phone size={18} /></div>
                        {editMode ? (
                          <Input 
                            id="phone" 
                            value={editingUser.phone} 
                            onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})} 
                          />
                        ) : (
                          <div className="text-slate-700 pt-1">{currentUser.phone}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="location">Местоположение</Label>
                      <div className="flex mt-1.5">
                        <div className="flex items-center mr-2 text-slate-400"><MapPin size={18} /></div>
                        {editMode ? (
                          <Input 
                            id="location" 
                            value={editingUser.location} 
                            onChange={(e) => setEditingUser({...editingUser, location: e.target.value})} 
                          />
                        ) : (
                          <div className="text-slate-700 pt-1">{currentUser.location}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-md font-medium">Дополнительная информация</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="joinDate">Дата начала работы</Label>
                    <div className="flex mt-1.5">
                      <div className="flex items-center mr-2 text-slate-400"><Calendar size={18} /></div>
                      {editMode ? (
                        <Input 
                          id="joinDate" 
                          value={editingUser.joinDate} 
                          onChange={(e) => setEditingUser({...editingUser, joinDate: e.target.value})} 
                        />
                      ) : (
                        <div className="text-slate-700 pt-1">{currentUser.joinDate}</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="timeZone">Часовой пояс</Label>
                    <div className="flex mt-1.5">
                      <div className="flex items-center mr-2 text-slate-400"><Clock size={18} /></div>
                      {editMode ? (
                        <Input 
                          id="timeZone" 
                          value={editingUser.timeZone} 
                          onChange={(e) => setEditingUser({...editingUser, timeZone: e.target.value})} 
                        />
                      ) : (
                        <div className="text-slate-700 pt-1">{currentUser.timeZone}</div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="bio">О себе</Label>
                  {editMode ? (
                    <Textarea 
                      id="bio" 
                      value={editingUser.bio} 
                      onChange={(e) => setEditingUser({...editingUser, bio: e.target.value})} 
                      className="mt-1.5"
                      rows={3}
                    />
                  ) : (
                    <div className="bg-slate-50 rounded-md p-3 mt-1.5 text-slate-700">
                      {currentUser.bio || "Информация не указана"}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-5 flex justify-between bg-slate-50">
              <p className="text-xs text-slate-500">
                ID: {currentUser.id} | Логин: {currentUser.username}
              </p>
              {editMode && (
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Отмена
                  </Button>
                  <Button 
                    onClick={handleSaveProfile}
                    disabled={updateUserMutation.isPending}>
                    Сохранить
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <CardTitle>Компетенции и навыки</CardTitle>
              <CardDescription>
                Ваши профессиональные навыки и квалификация
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-md font-medium mb-2">Технические навыки</h3>
                <div className="flex flex-wrap gap-2">
                  {(currentUser.skills || []).map((skill, i) => (
                    <div key={i} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                      {skill}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-md font-medium mb-2">Сертификаты и обучение</h3>
                <div className="space-y-3">
                  <div className="border rounded-md p-3">
                    <div className="font-medium">Разработка AI-приложений на базе GPT-4</div>
                    <div className="text-sm text-slate-500">OpenAI | Получен: Февраль 2025</div>
                  </div>
                  <div className="border rounded-md p-3">
                    <div className="font-medium">Сертифицированный разработчик Hyperledger Besu</div>
                    <div className="text-sm text-slate-500">Linux Foundation | Получен: Декабрь 2024</div>
                  </div>
                  <div className="border rounded-md p-3">
                    <div className="font-medium">Управление проектами в госсекторе</div>
                    <div className="text-sm text-slate-500">Academy of Public Administration | Получен: Октябрь 2023</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>История активности</CardTitle>
              <CardDescription>
                Ваши недавние действия в системе Agent Smith
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-l-2 border-emerald-500 pl-4 pb-6 relative">
                  <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[6.5px] top-0"></div>
                  <div className="font-medium">Обновлен системный промпт для агента "Консультант по правовым вопросам"</div>
                  <div className="text-sm text-slate-500">16 апреля 2025, 12:34</div>
                </div>
                
                <div className="border-l-2 border-emerald-500 pl-4 pb-6 relative">
                  <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[6.5px] top-0"></div>
                  <div className="font-medium">Создан новый агент "Ассистент по жилищным вопросам"</div>
                  <div className="text-sm text-slate-500">15 апреля 2025, 15:22</div>
                </div>
                
                <div className="border-l-2 border-emerald-500 pl-4 pb-6 relative">
                  <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[6.5px] top-0"></div>
                  <div className="font-medium">Обработано обращение "Получение выписки из ЕГРН" #4328</div>
                  <div className="text-sm text-slate-500">14 апреля 2025, 09:15</div>
                </div>
                
                <div className="border-l-2 border-emerald-500 pl-4 relative">
                  <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[6.5px] top-0"></div>
                  <div className="font-medium">Участие в голосовании "Внедрение новой системы классификации обращений"</div>
                  <div className="text-sm text-slate-500">12 апреля 2025, 16:40</div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-center">
              <Button variant="outline">Показать больше активностей</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;