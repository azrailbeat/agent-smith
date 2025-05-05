import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Plus, Save, Trash2, Edit, Star, Check, X, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';

// Определение типа для правила распределения задач
interface TaskRule {
  id: number;
  name: string;
  description: string;
  sourceType: "meeting" | "citizen_request" | "document";
  keywords: string[];
  departmentId: number;
  positionId: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Схема валидации для формы создания/редактирования правила
const taskRuleSchema = z.object({
  name: z.string().min(3, { message: 'Название должно содержать минимум 3 символа' }),
  description: z.string().min(5, { message: 'Описание должно содержать минимум 5 символов' }),
  sourceType: z.enum(['meeting', 'citizen_request', 'document']),
  keywords: z.string().transform(val => val.split(',').map(k => k.trim()).filter(k => k)),
  departmentId: z.string().transform(val => parseInt(val)),
  positionId: z.string().transform(val => parseInt(val)),
  isActive: z.boolean().default(true),
});

type TaskRuleFormValues = z.infer<typeof taskRuleSchema>;

export default function OrgStructurePage() {
  const { toast } = useToast();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<TaskRule | null>(null);
  const [isCreatingDefault, setIsCreatingDefault] = useState(false);
  const queryClient = useQueryClient();

  // Запрос на получение всех правил
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['/api/task-rules'],
    staleTime: 1000 * 60, // 1 minute
  });

  // Форма для создания/редактирования правила
  const form = useForm<TaskRuleFormValues>({
    resolver: zodResolver(taskRuleSchema),
    defaultValues: {
      name: '',
      description: '',
      sourceType: 'citizen_request',
      keywords: '',
      departmentId: '0',
      positionId: '0',
      isActive: true,
    },
  });

  // Обновляем форму при редактировании
  useEffect(() => {
    if (editingRule) {
      form.reset({
        name: editingRule.name,
        description: editingRule.description,
        sourceType: editingRule.sourceType,
        keywords: editingRule.keywords.join(', '),
        departmentId: editingRule.departmentId.toString(),
        positionId: editingRule.positionId.toString(),
        isActive: editingRule.isActive,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        sourceType: 'citizen_request',
        keywords: '',
        departmentId: '0',
        positionId: '0',
        isActive: true,
      });
    }
  }, [editingRule, form]);

  // Создаем или обновляем правило
  const onSubmit = async (values: TaskRuleFormValues) => {
    try {
      if (editingRule) {
        // Обновление существующего правила
        await apiRequest(`/api/task-rules/${editingRule.id}`, {
          method: 'PATCH',
          data: values,
        });

        toast({
          title: 'Правило обновлено',
          description: `Правило "${values.name}" успешно обновлено`,
        });
      } else {
        // Создание нового правила
        await apiRequest('POST', '/api/task-rules', values);

        toast({
          title: 'Правило создано',
          description: `Правило "${values.name}" успешно создано`,
        });
      }

      // Инвалидируем кеш, чтобы обновить список правил
      queryClient.invalidateQueries({ queryKey: ['/api/task-rules'] });
      
      // Закрываем диалог и сбрасываем редактирование
      setOpenDialog(false);
      setEditingRule(null);
    } catch (error) {
      console.error('Ошибка при сохранении правила:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить правило. Попробуйте еще раз.',
        variant: 'destructive',
      });
    }
  };

  // Удаление правила
  const deleteRule = async (rule: TaskRule) => {
    if (!confirm(`Вы уверены, что хотите удалить правило "${rule.name}"?`)) {
      return;
    }

    try {
      await apiRequest('DELETE', `/api/task-rules/${rule.id}`);

      toast({
        title: 'Правило удалено',
        description: `Правило "${rule.name}" успешно удалено`,
      });

      // Инвалидируем кеш, чтобы обновить список правил
      queryClient.invalidateQueries({ queryKey: ['/api/task-rules'] });
    } catch (error) {
      console.error('Ошибка при удалении правила:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить правило. Попробуйте еще раз.',
        variant: 'destructive',
      });
    }
  };

  // Получение названия типа источника на русском
  const getSourceTypeName = (type: string) => {
    switch (type) {
      case 'meeting': return 'Протокол совещания';
      case 'citizen_request': return 'Обращение гражданина';
      case 'document': return 'Документ';
      default: return type;
    }
  };
  
  // Создание базовой организационной структуры
  const createDefaultOrgStructure = async () => {
    try {
      setIsCreatingDefault(true);
      const response = await apiRequest('POST', '/api/org-structure/default');
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Структура создана',
          description: 'Базовая организационная структура успешно создана',
        });
        
        // Обновляем данные на странице
        queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/task-rules'] });
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
      setIsCreatingDefault(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Управление организационной структурой</h1>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingRule(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить правило
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Редактирование правила' : 'Создание нового правила'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название</FormLabel>
                      <FormControl>
                        <Input placeholder="Введите название правила" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Описание</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Опишите правило" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sourceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип источника</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип источника" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="meeting">Протокол совещания</SelectItem>
                          <SelectItem value="citizen_request">Обращение гражданина</SelectItem>
                          <SelectItem value="document">Документ</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="keywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ключевые слова</FormLabel>
                      <FormControl>
                        <Input placeholder="Введите ключевые слова через запятую" {...field} />
                      </FormControl>
                      <FormDescription>
                        Список ключевых слов, разделенных запятыми, для поиска в тексте
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="departmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID отдела</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="positionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID должности</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Активно</FormLabel>
                        <FormDescription>
                          Правило будет применяться только если оно активно
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Сохранить
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rules.length > 0 ? (
            rules.map((rule: TaskRule) => (
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
                        onClick={() => { setEditingRule(rule); setOpenDialog(true); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteRule(rule)}
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
                      <strong className="text-sm text-muted-foreground">Тип источника:</strong>
                      <div>{getSourceTypeName(rule.sourceType)}</div>
                    </div>
                    <div>
                      <strong className="text-sm text-muted-foreground">Ключевые слова:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rule.keywords.map((keyword, index) => (
                          <Badge key={index} variant="secondary">{keyword}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong className="text-sm text-muted-foreground">ID отдела:</strong>
                        <div>{rule.departmentId}</div>
                      </div>
                      <div>
                        <strong className="text-sm text-muted-foreground">ID должности:</strong>
                        <div>{rule.positionId}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                  Создано: {new Date(rule.createdAt || Date.now()).toLocaleDateString()}
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center p-8">
              <p className="text-muted-foreground mb-4">Нет созданных правил распределения задач</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => { setEditingRule(null); setOpenDialog(true); }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Создать правило
                </Button>
                <Button 
                  variant="default" 
                  onClick={createDefaultOrgStructure}
                >
                  <Layers className="mr-2 h-4 w-4" />
                  Создать базовую структуру
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}