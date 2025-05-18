import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Building, FileText, Upload, Plus, Database, Search, Settings, BookOpen } from "lucide-react";
import { CompanyKnowledge } from "./CompanyKnowledge";
import OrgStructureManagement from "./OrgStructureManagement2";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

// Типы для системы управления знаниями
interface KnowledgeSource {
  id: string;
  name: string;
  description: string;
  type: "document" | "database" | "api" | "web";
  status: "active" | "inactive";
  lastUpdated: string;
  documentCount: number;
}

interface KnowledgeQuery {
  id: string;
  query: string;
  timestamp: string;
  results: number;
  sources: string[];
}

// Демо-данные для источников знаний
const demoKnowledgeSources: KnowledgeSource[] = [
  {
    id: "1",
    name: "Правовая база РК",
    description: "Законодательные акты Республики Казахстан",
    type: "database",
    status: "active",
    lastUpdated: "2025-05-12T10:30:00",
    documentCount: 1256
  },
  {
    id: "2",
    name: "Внутренняя документация",
    description: "Документы организации, регламенты и процедуры",
    type: "document",
    status: "active",
    lastUpdated: "2025-05-10T14:22:00",
    documentCount: 347
  },
  {
    id: "3",
    name: "Научные публикации",
    description: "Публикации в журналах и научных изданиях",
    type: "api",
    status: "inactive",
    lastUpdated: "2025-04-28T09:15:00",
    documentCount: 83
  },
  {
    id: "4",
    name: "Веб-ресурсы",
    description: "Официальные сайты и порталы",
    type: "web",
    status: "active",
    lastUpdated: "2025-05-13T08:45:00",
    documentCount: 129
  }
];

// Демо-данные для истории запросов
const demoKnowledgeQueries: KnowledgeQuery[] = [
  {
    id: "q1",
    query: "Процедура оформления обращений граждан через портал",
    timestamp: "2025-05-13T09:22:34",
    results: 12,
    sources: ["1", "2"]
  },
  {
    id: "q2",
    query: "Нормативные требования к системам хранения данных",
    timestamp: "2025-05-12T15:45:22",
    results: 8,
    sources: ["1", "4"]
  },
  {
    id: "q3",
    query: "Методы внедрения искусственного интеллекта в госуправлении",
    timestamp: "2025-05-11T11:03:17",
    results: 15,
    sources: ["3", "4"]
  }
];

export default function UnifiedCompanyKnowledge() {
  const [activeTab, setActiveTab] = useState("rag-system");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddSourceDialogOpen, setIsAddSourceDialogOpen] = useState(false);
  const [isConfigureRAGDialogOpen, setIsConfigureRAGDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{text: string, source: string, relevance: number}[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Обработчик запроса к базе знаний
  const handleKnowledgeSearch = () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Имитация запроса к RAG
    setTimeout(() => {
      setSearchResults([
        {
          text: "Согласно законодательству РК, обращения граждан должны обрабатываться в течение 15 рабочих дней с момента регистрации.",
          source: "Закон РК 'О порядке рассмотрения обращений граждан'",
          relevance: 0.95
        },
        {
          text: "Портал eOtinish.kz предоставляет гражданам возможность подавать заявления в электронном виде с использованием ЭЦП.",
          source: "Регламент работы с порталом eOtinish.kz",
          relevance: 0.89
        },
        {
          text: "Процедура регистрации обращений включает: прием, регистрацию, первичную обработку, предварительное рассмотрение и определение ответственного исполнителя.",
          source: "Инструкция по делопроизводству",
          relevance: 0.82
        }
      ]);
      setIsSearching(false);
    }, 1500);
  };

  // Определение типа источника для иконки
  const getSourceTypeIcon = (type: string) => {
    switch (type) {
      case "document": return <FileText className="h-5 w-5 text-blue-500" />;
      case "database": return <Database className="h-5 w-5 text-green-500" />;
      case "api": return <Settings className="h-5 w-5 text-purple-500" />;
      case "web": return <BookOpen className="h-5 w-5 text-amber-500" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">База знаний</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsConfigureRAGDialogOpen(true)} variant="outline">
            <Settings className="mr-2 h-4 w-4" /> Настройки RAG
          </Button>
          <Button onClick={() => setIsAddSourceDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> Добавить источник
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="mb-4">
          <TabsTrigger value="rag-system" className="flex items-center">
            <Database className="mr-2 h-4 w-4" /> Система RAG
          </TabsTrigger>
          <TabsTrigger value="knowledge">
            <FileText className="mr-2 h-4 w-4" /> Документы
          </TabsTrigger>
          <TabsTrigger value="structure">
            <Building className="mr-2 h-4 w-4" /> Организационная структура
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rag-system">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Retrieval-Augmented Generation (RAG)</CardTitle>
                  <CardDescription>
                    Задайте вопрос к базе знаний для получения релевантной информации
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Input 
                        placeholder="Введите ваш запрос..." 
                        className="flex-1"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleKnowledgeSearch()}
                      />
                      <Button 
                        onClick={handleKnowledgeSearch} 
                        disabled={isSearching || !searchQuery.trim()}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {isSearching ? "Поиск..." : "Найти"}
                        <Search className="ml-2 h-4 w-4" />
                      </Button>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="space-y-4 mt-6">
                        <h3 className="text-lg font-medium">Результаты поиска:</h3>
                        {searchResults.map((result, index) => (
                          <Card key={index} className={`border-l-4 ${result.relevance > 0.9 ? 'border-l-green-500' : result.relevance > 0.8 ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
                            <CardContent className="p-4">
                              <p className="mb-2">{result.text}</p>
                              <div className="flex justify-between items-center text-sm text-muted-foreground">
                                <span>Источник: {result.source}</span>
                                <Badge variant="outline">
                                  Релевантность: {(result.relevance * 100).toFixed(0)}%
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>История запросов</CardTitle>
                  <CardDescription>
                    Последние запросы к базе знаний
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {demoKnowledgeQueries.map((query) => (
                      <div key={query.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="font-medium">{query.query}</p>
                          <div className="flex items-center mt-1 text-sm text-muted-foreground">
                            <span>{new Date(query.timestamp).toLocaleString()}</span>
                            <span className="mx-2">•</span>
                            <span>{query.results} результатов</span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSearchQuery(query.query);
                            handleKnowledgeSearch();
                          }}
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Источники знаний</CardTitle>
                  <CardDescription>
                    Подключенные базы знаний для RAG-системы
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {demoKnowledgeSources.map((source) => (
                      <div key={source.id} className="p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {getSourceTypeIcon(source.type)}
                            <h3 className="ml-2 font-medium">{source.name}</h3>
                          </div>
                          <Badge variant={source.status === "active" ? "outline" : "secondary"}>
                            {source.status === "active" ? "Активный" : "Неактивный"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{source.description}</p>
                        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                          <span>Документов: {source.documentCount}</span>
                          <span>Обновлено: {new Date(source.lastUpdated).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setIsAddSourceDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Добавить источник
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="knowledge">
          <CompanyKnowledge standalone={false} />
        </TabsContent>

        <TabsContent value="structure">
          <OrgStructureManagement standalone={false} />
        </TabsContent>
      </Tabs>

      {/* Диалог добавления источника знаний */}
      <Dialog open={isAddSourceDialogOpen} onOpenChange={setIsAddSourceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить источник знаний</DialogTitle>
            <DialogDescription>
              Подключите новый источник данных для системы RAG
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="source-name">Название источника</Label>
              <Input id="source-name" placeholder="Введите название источника" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-description">Описание</Label>
              <Textarea id="source-description" placeholder="Краткое описание источника данных" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-type">Тип источника</Label>
              <select id="source-type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                <option value="document">Документы</option>
                <option value="database">База данных</option>
                <option value="api">API</option>
                <option value="web">Веб-ресурс</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-connection">Строка подключения</Label>
              <Input id="source-connection" placeholder="URL, путь или строка подключения" />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="source-status" defaultChecked />
              <Label htmlFor="source-status">Активировать источник</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSourceDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => setIsAddSourceDialogOpen(false)}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог настройки системы RAG */}
      <Dialog open={isConfigureRAGDialogOpen} onOpenChange={setIsConfigureRAGDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Настройки RAG-системы</DialogTitle>
            <DialogDescription>
              Конфигурирование системы Retrieval-Augmented Generation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-4">
              <h3 className="font-medium">Общие настройки</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="embeddings-model">Модель эмбеддингов</Label>
                  <select id="embeddings-model" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                    <option value="openai">OpenAI - text-embedding-3-large</option>
                    <option value="local">Sentence Transformers (локальный)</option>
                    <option value="huggingface">HuggingFace - multilingual-e5-large</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vector-database">Векторная база данных</Label>
                  <select id="vector-database" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                    <option value="qdrant">Qdrant</option>
                    <option value="postgres">PostgreSQL с pgvector</option>
                    <option value="milvus">Milvus</option>
                  </select>
                </div>
              </div>
              
              <Separator />
              
              <h3 className="font-medium">Параметры поиска</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="similarity-threshold">Порог релевантности</Label>
                  <div className="flex items-center space-x-2">
                    <Input id="similarity-threshold" type="number" min="0.1" max="1.0" step="0.05" defaultValue="0.7" />
                    <span className="text-sm text-muted-foreground">(0.1 - 1.0)</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-results">Максимальное число результатов</Label>
                  <Input id="max-results" type="number" min="1" max="50" defaultValue="10" />
                </div>
              </div>
              
              <Separator />
              
              <h3 className="font-medium">Интеграция с моделью LLM</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="llm-model">Модель LLM</Label>
                  <select id="llm-model" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                    <option value="antropic">Anthropic Claude-3.7-Sonnet</option>
                    <option value="openai">OpenAI GPT-4o</option>
                    <option value="llama">Llama-3-Instruct-70B</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="system-prompt">Системный промпт</Label>
                  <Textarea id="system-prompt" placeholder="Системный промпт для модели" 
                    defaultValue="Вы - ассистент государственной информационной системы. Отвечайте точно и кратко на вопросы, используя предоставленный контекст. Если в контексте нет ответа на вопрос, скажите об этом."
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigureRAGDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => setIsConfigureRAGDialogOpen(false)}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}