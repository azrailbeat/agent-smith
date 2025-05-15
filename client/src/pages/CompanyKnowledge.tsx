import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Building, User, Plus, File, FileUp } from "lucide-react";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

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

interface JobDescription {
  id: number;
  title: string;
  positionId: number;
  departmentId: number;
  content: string;
  fileUrl?: string | null;
  createdAt: string;
  updatedAt: string;
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
  level: z.number().min(1).max(10),
});

const jobDescriptionSchema = z.object({
  title: z.string().min(2, { message: "Название должно содержать минимум 2 символа" }),
  content: z.string().min(10, { message: "Содержание должно быть не менее 10 символов" }),
  departmentId: z.number(),
  positionId: z.number(),
});

export default function CompanyKnowledge() {
  const [activeTab, setActiveTab] = useState("structure");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Диалоги
  const [isAddDepartmentOpen, setIsAddDepartmentOpen] = useState(false);
  const [isAddPositionOpen, setIsAddPositionOpen] = useState(false);
  const [isAddJobDescriptionOpen, setIsAddJobDescriptionOpen] = useState(false);
  const [isUploadJobDescriptionOpen, setIsUploadJobDescriptionOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Получение данных
  const { data: departments = [] } = useQuery({
    queryKey: ["/api/departments"],
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["/api/positions"],
  });

  const { data: jobDescriptions = [] } = useQuery({
    queryKey: ["/api/job-descriptions"],
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

  const jobDescriptionForm = useForm<z.infer<typeof jobDescriptionSchema>>({
    resolver: zodResolver(jobDescriptionSchema),
    defaultValues: {
      title: "",
      content: "",
      departmentId: 0,
      positionId: 0,
    },
  });

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
        description: "Отдел успешно создан",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать отдел",
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

  const createJobDescriptionMutation = useMutation({
    mutationFn: (data: z.infer<typeof jobDescriptionSchema>) => {
      return apiRequest("POST", "/api/job-descriptions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-descriptions"] });
      setIsAddJobDescriptionOpen(false);
      jobDescriptionForm.reset();
      toast({
        title: "Успешно",
        description: "Должностная инструкция успешно создана",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать должностную инструкцию",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const uploadJobDescriptionMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/job-descriptions", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Ошибка загрузки");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-descriptions"] });
      setIsUploadJobDescriptionOpen(false);
      setSelectedFile(null);
      toast({
        title: "Успешно",
        description: "Документ успешно загружен",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить документ",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Обработчики форм
  const onSubmitDepartment = (data: z.infer<typeof departmentSchema>) => {
    createDepartmentMutation.mutate(data);
  };

  const onSubmitPosition = (data: z.infer<typeof positionSchema>) => {
    createPositionMutation.mutate(data);
  };

  const onSubmitJobDescription = (data: z.infer<typeof jobDescriptionSchema>) => {
    createJobDescriptionMutation.mutate(data);
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите файл для загрузки",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("title", selectedFile.name);
    formData.append("departmentId", (document.getElementById("uploadDepartmentId") as HTMLSelectElement).value);
    formData.append("positionId", (document.getElementById("uploadPositionId") as HTMLSelectElement).value);
    formData.append("content", "Содержимое файла: " + selectedFile.name);

    uploadJobDescriptionMutation.mutate(formData);
  };

  // Группировка должностей по отделам
  const positionsByDepartment = departments.reduce((acc, department) => {
    acc[department.id] = positions.filter(pos => pos.departmentId === department.id);
    return acc;
  }, {} as Record<number, Position[]>);

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">База знаний компании</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsUploadJobDescriptionOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Загрузить должностную инструкцию
          </Button>
          <Button onClick={() => setIsAddJobDescriptionOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Создать базу знаний
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="structure">
            <Building className="mr-2 h-4 w-4" /> Организационная структура
          </TabsTrigger>
          <TabsTrigger value="jobDescriptions">
            <FileText className="mr-2 h-4 w-4" /> Базы знаний
          </TabsTrigger>
        </TabsList>

        {/* Вкладка структуры компании */}
        <TabsContent value="structure" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Структура компании</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsAddPositionOpen(true)}>
                <User className="mr-2 h-4 w-4" /> Добавить должность
              </Button>
              <Button onClick={() => setIsAddDepartmentOpen(true)}>
                <Building className="mr-2 h-4 w-4" /> Добавить отдел
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-1 lg:grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Структура компании</CardTitle>
                <CardDescription>
                  Департаменты и должности в организационной структуре
                </CardDescription>
              </CardHeader>
              <CardContent>
                {departments.length === 0 ? (
                  <div className="text-center p-6 text-muted-foreground">
                    Еще не добавлено ни одного отдела
                  </div>
                ) : (
                  <div className="space-y-6">
                    {departments.map((department) => (
                      <div key={department.id} className="border-l-4 border-primary pl-4 py-2">
                        <div className="flex items-center mb-2">
                          <Building className="h-5 w-5 mr-2 text-primary" />
                          <h3 className="text-lg font-medium">{department.name}</h3>
                        </div>
                        {department.description && (
                          <p className="text-sm text-muted-foreground mb-2">{department.description}</p>
                        )}
                        <div className="ml-4 space-y-2 mt-3">
                          {positionsByDepartment[department.id]?.length > 0 ? (
                            positionsByDepartment[department.id].map((position) => (
                              <div key={position.id} className="flex items-center">
                                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>{position.name}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-muted-foreground">Нет настроенных должностей</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Вкладка должностных инструкций */}
        <TabsContent value="jobDescriptions" className="space-y-4">
          <div className="grid md:grid-cols-1 lg:grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Должностные инструкции и профильные документы</CardTitle>
                <CardDescription>
                  Управление должностными инструкциями и профильными документами для сотрудников компании
                </CardDescription>
              </CardHeader>
              <CardContent>
                {jobDescriptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <FileText className="h-12 w-12 mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">В базе знаний нет должностных инструкций</p>
                    <Button variant="outline" onClick={() => setIsUploadJobDescriptionOpen(true)}>
                      <FileUp className="mr-2 h-4 w-4" /> Загрузить документы
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {jobDescriptions.map((jobDescription) => {
                      const department = departments.find(d => d.id === jobDescription.departmentId);
                      const position = positions.find(p => p.id === jobDescription.positionId);
                      
                      return (
                        <Card key={jobDescription.id}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">{jobDescription.title}</CardTitle>
                            <CardDescription>
                              {department?.name} - {position?.name}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center text-sm text-muted-foreground mb-3">
                              <File className="h-4 w-4 mr-2" />
                              <span>Дата создания: {new Date(jobDescription.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="line-clamp-3 text-sm mb-3">
                              {jobDescription.content}
                            </div>
                            {jobDescription.fileUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={jobDescription.fileUrl} target="_blank" rel="noopener noreferrer">
                                  <FileText className="h-4 w-4 mr-2" /> Открыть документ
                                </a>
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Диалог добавления отдела */}
      <Dialog open={isAddDepartmentOpen} onOpenChange={setIsAddDepartmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить отдел</DialogTitle>
            <DialogDescription>
              Создайте новый отдел в организационной структуре
            </DialogDescription>
          </DialogHeader>
          <Form {...departmentForm}>
            <form onSubmit={departmentForm.handleSubmit(onSubmitDepartment)} className="space-y-4">
              <FormField
                control={departmentForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название отдела</FormLabel>
                    <FormControl>
                      <Input placeholder="Например: ИТ отдел" {...field} />
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
                      onValueChange={(value) => field.onChange(parseInt(value) || null)}
                      defaultValue={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите родительский отдел (если есть)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Нет родительского отдела</SelectItem>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id.toString()}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Указывается, если этот отдел является частью более крупного подразделения
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createDepartmentMutation.isPending}>
                  {createDepartmentMutation.isPending ? "Сохранение..." : "Сохранить"}
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
                      <Input placeholder="Например: Системный администратор" {...field} />
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
                control={positionForm.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Уровень в организации</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="10" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormDescription>
                      От 1 (высший уровень) до 10 (низший уровень)
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

      {/* Диалог создания должностной инструкции */}
      <Dialog open={isAddJobDescriptionOpen} onOpenChange={setIsAddJobDescriptionOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Создать должностную инструкцию</DialogTitle>
            <DialogDescription>
              Заполните данные для новой должностной инструкции
            </DialogDescription>
          </DialogHeader>
          <Form {...jobDescriptionForm}>
            <form onSubmit={jobDescriptionForm.handleSubmit(onSubmitJobDescription)} className="space-y-4">
              <FormField
                control={jobDescriptionForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название документа</FormLabel>
                    <FormControl>
                      <Input placeholder="Например: Должностная инструкция системного администратора" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={jobDescriptionForm.control}
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
                  control={jobDescriptionForm.control}
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
                          {positions.map((position) => (
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
              </div>
              <FormField
                control={jobDescriptionForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Содержание инструкции</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Введите текст должностной инструкции..." className="min-h-[200px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createJobDescriptionMutation.isPending}>
                  {createJobDescriptionMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Диалог загрузки должностной инструкции */}
      <Dialog open={isUploadJobDescriptionOpen} onOpenChange={setIsUploadJobDescriptionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Загрузить должностную инструкцию</DialogTitle>
            <DialogDescription>
              Загрузите файл должностной инструкции
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="file">Выберите файл</label>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer border-primary/20 hover:border-primary/40">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл сюда
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, DOC, DOCX (макс. 10MB)
                      </p>
                    </div>
                    {selectedFile && (
                      <div className="text-sm font-medium text-center text-primary-600">
                        {selectedFile.name}
                      </div>
                    )}
                    <input id="file-upload" type="file" className="hidden" 
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx"
                    />
                  </label>
                </div>
              </div>
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="uploadDepartmentId">Отдел</label>
                <select id="uploadDepartmentId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  <option value="">Выберите отдел</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col space-y-1.5">
                <label htmlFor="uploadPositionId">Должность</label>
                <select id="uploadPositionId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  <option value="">Выберите должность</option>
                  {positions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={uploadJobDescriptionMutation.isPending}>
                {uploadJobDescriptionMutation.isPending ? "Загрузка..." : "Загрузить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}