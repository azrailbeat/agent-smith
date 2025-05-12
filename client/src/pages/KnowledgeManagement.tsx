import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileText, Plus, Settings, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KnowledgeBase {
  id: number;
  name: string;
  description: string | null;
  agentId: number | null;
  vectorStorageType: string;
  vectorStorageUrl: string | null;
  vectorStorageApiKey: string | null;
  collectionName: string | null;
  documentCount: number | null;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeDocument {
  id: number;
  knowledgeBaseId: number;
  title: string | null;
  content: string;
  vectorId: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

interface Agent {
  id: number;
  name: string;
  type: string;
}

export default function KnowledgeManagement() {
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [createDocumentDialogOpen, setCreateDocumentDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('bases');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Получение списка агентов
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });

  // Получение списка баз знаний
  const { data: knowledgeBases = [], isLoading: loadingBases } = useQuery<KnowledgeBase[]>({
    queryKey: ['/api/knowledge-bases'],
  });

  // Получение документов для выбранной базы знаний
  const { data: documents = [], isLoading: loadingDocuments } = useQuery<KnowledgeDocument[]>({
    queryKey: ['/api/knowledge-documents', selectedKnowledgeBase?.id],
    enabled: !!selectedKnowledgeBase,
    queryFn: () => 
      apiRequest(`/api/knowledge-documents?knowledgeBaseId=${selectedKnowledgeBase?.id}`),
  });

  // Создание новой базы знаний
  const createKnowledgeBaseMutation = useMutation({
    mutationFn: (newBase: any) => 
      apiRequest('/api/knowledge-bases', 'POST', newBase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-bases'] });
      setCreateDialogOpen(false);
      toast({
        title: 'База знаний создана',
        description: 'Новая база знаний успешно создана',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось создать базу знаний: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Удаление базы знаний
  const deleteKnowledgeBaseMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/knowledge-bases/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-bases'] });
      setSelectedKnowledgeBase(null);
      toast({
        title: 'База знаний удалена',
        description: 'База знаний успешно удалена',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось удалить базу знаний: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Создание нового документа
  const createDocumentMutation = useMutation({
    mutationFn: (newDocument: any) => 
      apiRequest('/api/knowledge-documents', 'POST', newDocument),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/knowledge-documents', selectedKnowledgeBase?.id] 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-bases'] });
      setCreateDocumentDialogOpen(false);
      toast({
        title: 'Документ создан',
        description: 'Новый документ успешно добавлен в базу знаний',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось создать документ: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Удаление документа
  const deleteDocumentMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/knowledge-documents/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/knowledge-documents', selectedKnowledgeBase?.id] 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge-bases'] });
      setSelectedDocument(null);
      setDocumentDialogOpen(false);
      toast({
        title: 'Документ удален',
        description: 'Документ успешно удален из базы знаний',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось удалить документ: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Обработчик отправки формы создания базы знаний
  const handleCreateKnowledgeBase = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newBase = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      agentId: formData.get('agentId') ? parseInt(formData.get('agentId') as string) : null,
      vectorStorageType: formData.get('vectorStorageType') as string,
      vectorStorageUrl: formData.get('vectorStorageUrl') as string,
      vectorStorageApiKey: formData.get('vectorStorageApiKey') as string,
      collectionName: formData.get('collectionName') as string,
    };
    
    createKnowledgeBaseMutation.mutate(newBase);
  };

  // Обработчик отправки формы создания документа
  const handleCreateDocument = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!selectedKnowledgeBase) return;
    
    const newDocument = {
      knowledgeBaseId: selectedKnowledgeBase.id,
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      metadata: {}
    };
    
    createDocumentMutation.mutate(newDocument);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Управление базами знаний для агентов</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Создать базу знаний
        </Button>
      </div>

      <Tabs defaultValue="bases" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="bases">Базы знаний</TabsTrigger>
          {selectedKnowledgeBase && (
            <TabsTrigger value="documents">Документы</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="bases">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingBases ? (
              <p>Загрузка баз знаний...</p>
            ) : knowledgeBases.length === 0 ? (
              <div className="col-span-3 text-center py-8">
                <p className="text-muted-foreground">Нет доступных баз знаний. Создайте новую базу знаний.</p>
              </div>
            ) : (
              knowledgeBases.map((base) => (
                <Card 
                  key={base.id} 
                  className={`cursor-pointer hover:border-primary transition-colors ${
                    selectedKnowledgeBase?.id === base.id ? 'border-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedKnowledgeBase(base);
                    setActiveTab('documents');
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{base.name}</CardTitle>
                      <Badge variant="outline">{base.vectorStorageType}</Badge>
                    </div>
                    <CardDescription>
                      {base.description || 'Нет описания'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between mb-1">
                        <span>Документов:</span>
                        <span>{base.documentCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Агент:</span>
                        <span>
                          {base.agentId
                            ? agents.find(a => a.id === base.agentId)?.name || `ID: ${base.agentId}`
                            : 'Не назначен'}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Вы уверены, что хотите удалить эту базу знаний? Все документы будут удалены.')) {
                            deleteKnowledgeBaseMutation.mutate(base.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents">
          {selectedKnowledgeBase && (
            <>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedKnowledgeBase.name}</h2>
                  <p className="text-muted-foreground">
                    {selectedKnowledgeBase.description || 'Нет описания'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="secondary"
                    onClick={() => setActiveTab('bases')}
                  >
                    Назад к базам знаний
                  </Button>
                  <Button 
                    onClick={() => setCreateDocumentDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Добавить документ
                  </Button>
                </div>
              </div>

              <div className="bg-card rounded-lg border p-4">
                <div className="grid grid-cols-4 font-medium mb-2">
                  <div className="col-span-1">Название</div>
                  <div className="col-span-2">Содержание</div>
                  <div className="col-span-1">Создан</div>
                </div>
                <Separator className="mb-4" />

                {loadingDocuments ? (
                  <p className="py-4 text-center">Загрузка документов...</p>
                ) : documents.length === 0 ? (
                  <div className="py-8 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">В этой базе знаний нет документов</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setCreateDocumentDialogOpen(true)}
                    >
                      Создать первый документ
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="grid grid-cols-4 py-3 hover:bg-muted/50 rounded cursor-pointer"
                        onClick={() => {
                          setSelectedDocument(doc);
                          setDocumentDialogOpen(true);
                        }}
                      >
                        <div className="col-span-1 font-medium truncate">
                          {doc.title || 'Без названия'}
                        </div>
                        <div className="col-span-2 text-sm text-muted-foreground truncate">
                          {doc.content.substring(0, 100)}
                          {doc.content.length > 100 ? '...' : ''}
                        </div>
                        <div className="col-span-1 text-sm text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Диалог создания базы знаний */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Создать новую базу знаний</DialogTitle>
            <DialogDescription>
              Заполните информацию для создания новой базы знаний для агента.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateKnowledgeBase}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Название
                </Label>
                <Input
                  id="name"
                  name="name"
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Описание
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  className="col-span-3"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="agentId" className="text-right">
                  Агент
                </Label>
                <Select name="agentId">
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Выберите агента (опционально)" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.name} ({agent.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="vectorStorageType" className="text-right">
                  Тип хранилища
                </Label>
                <Select name="vectorStorageType" defaultValue="qdrant">
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Выберите тип векторного хранилища" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qdrant">Qdrant</SelectItem>
                    <SelectItem value="milvus">Milvus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="vectorStorageUrl" className="text-right">
                  URL хранилища
                </Label>
                <Input
                  id="vectorStorageUrl"
                  name="vectorStorageUrl"
                  className="col-span-3"
                  placeholder="http://localhost:6333"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="vectorStorageApiKey" className="text-right">
                  API ключ
                </Label>
                <Input
                  id="vectorStorageApiKey"
                  name="vectorStorageApiKey"
                  type="password"
                  className="col-span-3"
                  placeholder="Оставьте пустым, если не требуется"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="collectionName" className="text-right">
                  Название коллекции
                </Label>
                <Input
                  id="collectionName"
                  name="collectionName"
                  className="col-span-3"
                  placeholder="knowledge_base_1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setCreateDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={createKnowledgeBaseMutation.isPending}>
                {createKnowledgeBaseMutation.isPending ? 'Создание...' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Диалог просмотра документа */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.title || 'Без названия'}</DialogTitle>
            <DialogDescription>
              Документ из базы знаний "{selectedKnowledgeBase?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
            <pre className="whitespace-pre-wrap">{selectedDocument?.content}</pre>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="destructive"
              onClick={() => {
                if (selectedDocument && confirm('Вы уверены, что хотите удалить этот документ?')) {
                  deleteDocumentMutation.mutate(selectedDocument.id);
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Удалить
            </Button>
            <Button onClick={() => setDocumentDialogOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог создания документа */}
      <Dialog open={createDocumentDialogOpen} onOpenChange={setCreateDocumentDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Добавить документ в базу знаний</DialogTitle>
            <DialogDescription>
              Добавьте новый документ в базу знаний "{selectedKnowledgeBase?.name}"
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDocument}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Название
                </Label>
                <Input
                  id="title"
                  name="title"
                  className="col-span-3"
                  placeholder="Опционально"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="content" className="text-right pt-2">
                  Содержание
                </Label>
                <Textarea
                  id="content"
                  name="content"
                  className="col-span-3"
                  rows={10}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setCreateDocumentDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={createDocumentMutation.isPending}>
                {createDocumentMutation.isPending ? 'Добавление...' : 'Добавить документ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}