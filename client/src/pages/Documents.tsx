import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { FileCheck, Search, RefreshCw, Database, UploadCloud, FileText, CheckCircle, AlertCircle, Download, Link } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { queryClient } from "@/lib/queryClient";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Document = {
  id: number;
  title: string;
  fileType: string;
  createdAt: string;
  fileUrl: string | null;
  summary: string | null;
  taskId: number | null;
  processed: boolean | null;
  uploadedBy: number | null;
};

type SyncLog = {
  id: number;
  timestamp: string;
  source: string;
  status: "success" | "error";
  documentId?: number;
  details: string;
  blockchainRecorded: boolean;
  transactionHash?: string;
};

type IntegrationSettings = {
  active: boolean;
  apiKey: string;
  apiUrl: string;
  webhookUrl: string;
  autoSync: boolean;
  syncInterval: number;
  recordToBlockchain: boolean;
  lastSyncTime: string | null;
};

const Documents = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>({
    active: true,
    apiKey: "dk_35f6a72e8b4d3c91",
    apiUrl: "https://api.documentolog.kz/api/v3",
    webhookUrl: "https://agent-smith.gov.kz/api/webhook/documentolog",
    autoSync: true,
    syncInterval: 15, // in minutes
    recordToBlockchain: true,
    lastSyncTime: new Date().toISOString()
  });
  
  // Mock sync logs
  const [syncLogs] = useState<SyncLog[]>([
    {
      id: 1,
      timestamp: "2025-04-11T09:30:15",
      source: "Документолог",
      status: "success",
      documentId: 12345,
      details: "Импортирован документ 'Согласование бюджета проекта'",
      blockchainRecorded: true,
      transactionHash: "0x7cf1a78e31a5bcc60425c33c8a2d52b86ff1830f7d0d33deea89b3010ae9ec6c"
    },
    {
      id: 2,
      timestamp: "2025-04-11T08:45:22",
      source: "Документолог",
      status: "success",
      documentId: 12344,
      details: "Импортирован документ 'Заявка на командировку'",
      blockchainRecorded: true,
      transactionHash: "0x8bf3b25f28d4c08e254a633a1e59e96c5b5c5e3a6d28f4b13deebffe8c92f93a"
    },
    {
      id: 3,
      timestamp: "2025-04-10T16:12:08",
      source: "Документолог",
      status: "error",
      details: "Ошибка доступа к API: Invalid token",
      blockchainRecorded: false
    },
    {
      id: 4,
      timestamp: "2025-04-10T14:30:45",
      source: "Документолог",
      status: "success",
      documentId: 12340,
      details: "Импортирован документ 'Отчет за первый квартал'",
      blockchainRecorded: true,
      transactionHash: "0x6cf1a78e31a5bcc60425c33c8a2d52b86ff1830f7d0d33deea89b3010ae9ec6b"
    }
  ]);
  
  // Query documents
  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });
  
  // Mutation for manual sync
  const syncMutation = useMutation({
    mutationFn: async () => {
      return await fetch('/api/documents/sync', {
        method: 'POST',
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Синхронизация успешна",
        description: "Документы успешно синхронизированы с Документолог",
      });
      queryClient.invalidateQueries({queryKey: ['/api/documents']});
      setShowSyncDialog(false);
    },
    onError: () => {
      toast({
        title: "Ошибка синхронизации",
        description: "Не удалось синхронизировать документы",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for saving settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: IntegrationSettings) => {
      return await fetch('/api/integrations/documentolog/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Настройки сохранены",
        description: "Настройки интеграции с Документолог успешно обновлены",
      });
      setShowSettingsDialog(false);
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    }
  });
  
  // Filter documents based on search term
  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMMM yyyy, HH:mm", { locale: ru });
  };
  
  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(integrationSettings);
  };
  
  return (
    <>
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Документы</h1>
            <p className="mt-2 text-sm text-neutral-700">
              Управление документами и настройка интеграций с внешними системами
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-2">
            <Button 
              variant="outline" 
              className="inline-flex items-center"
              onClick={() => setShowSettingsDialog(true)}
            >
              <FileCheck className="mr-2 h-4 w-4" />
              Настройки интеграции
            </Button>
            <Button 
              className="inline-flex items-center"
              onClick={() => setShowSyncDialog(true)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Синхронизировать
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="documents">
        <TabsList className="mb-6">
          <TabsTrigger value="documents">Документы</TabsTrigger>
          <TabsTrigger value="sync">История синхронизаций</TabsTrigger>
          <TabsTrigger value="blockchain">Запись в блокчейн</TabsTrigger>
        </TabsList>
        
        <TabsContent value="documents">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Список документов</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Поиск документов..." 
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <CardDescription>
                Документы, импортированные из Документолог и других источников
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-12 bg-neutral-100 rounded-lg"></div>
                  ))}
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-neutral-300 mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">Документы не найдены</h3>
                  <p className="text-neutral-500 text-center max-w-md">
                    {searchTerm 
                      ? "По вашему запросу не найдено документов. Попробуйте изменить критерии поиска."
                      : "В системе еще нет документов. Используйте интеграцию с Документолог для импорта документов."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Дата загрузки</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      {
                        id: 12345,
                        title: "Согласование бюджета проекта",
                        fileType: "pdf",
                        createdAt: "2025-04-11T09:30:15",
                        fileUrl: "/documents/budget-agreement.pdf",
                        summary: "Согласование бюджета на 2025 год",
                        taskId: 45,
                        processed: true,
                        uploadedBy: 1
                      },
                      {
                        id: 12344,
                        title: "Заявка на командировку",
                        fileType: "docx",
                        createdAt: "2025-04-11T08:45:22",
                        fileUrl: "/documents/business-trip.docx",
                        summary: "Заявка на командировку в г. Алматы",
                        taskId: null,
                        processed: true,
                        uploadedBy: 1
                      },
                      {
                        id: 12343,
                        title: "Протокол совещания от 10.04.2025",
                        fileType: "pdf",
                        createdAt: "2025-04-10T17:20:35",
                        fileUrl: "/documents/meeting-protocol.pdf",
                        summary: "Обсуждение квартальных результатов",
                        taskId: 42,
                        processed: true,
                        uploadedBy: 1
                      },
                      {
                        id: 12340,
                        title: "Отчет за первый квартал",
                        fileType: "xlsx",
                        createdAt: "2025-04-10T14:30:45",
                        fileUrl: "/documents/q1-report.xlsx",
                        summary: "Финансовый отчет за первый квартал 2025 года",
                        taskId: 40,
                        processed: true,
                        uploadedBy: 1
                      }
                    ].map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          {doc.title}
                          {doc.taskId && (
                            <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 hover:bg-blue-100">
                              Задача #{doc.taskId}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase">
                            {doc.fileType}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(doc.createdAt)}</TableCell>
                        <TableCell>
                          {doc.processed ? (
                            <Badge className="bg-green-100 text-green-800">
                              Обработан
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              В обработке
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Скачать документ</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Link className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Открыть в Документолог</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle>История синхронизаций</CardTitle>
              <CardDescription>
                Журнал взаимодействия с внешними системами документооборота
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата и время</TableHead>
                    <TableHead>Источник</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Информация</TableHead>
                    <TableHead>Запись в блокчейн</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.timestamp)}</TableCell>
                      <TableCell>{log.source}</TableCell>
                      <TableCell>
                        {log.status === "success" ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Успешно
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Ошибка
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{log.details}</TableCell>
                      <TableCell>
                        {log.blockchainRecorded ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="bg-purple-100 text-purple-800 cursor-pointer">
                                <Database className="h-3 w-3 mr-1" />
                                Записано
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-mono text-xs">TX: {log.transactionHash}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge variant="outline">Не записано</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="blockchain">
          <Card>
            <CardHeader>
              <CardTitle>Запись документов в блокчейн</CardTitle>
              <CardDescription>
                Настройка автоматической записи документов и их метаданных в Hyperledger Besu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Запись в блокчейн активна</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Все документы, полученные из внешних систем, автоматически регистрируются в блокчейне Hyperledger Besu.</p>
                    </div>
                    <div className="mt-2">
                      <Badge className="bg-green-100 text-green-800">
                        Подключено к ноде Hyperledger Besu
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="blockchain-record" className="flex flex-col space-y-1">
                    <span>Запись в блокчейн</span>
                    <span className="font-normal text-sm text-muted-foreground">
                      Автоматически записывать все документы и события в блокчейн
                    </span>
                  </Label>
                  <Switch 
                    id="blockchain-record"
                    checked={integrationSettings.recordToBlockchain}
                    onCheckedChange={(checked) => 
                      setIntegrationSettings({...integrationSettings, recordToBlockchain: checked})
                    }
                  />
                </div>
                
                <div className="space-y-4 border rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-4">Типы данных для записи в блокчейн</h3>
                  
                  <div className="grid gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="record-documents" defaultChecked />
                      <Label htmlFor="record-documents">Документы и их метаданные</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="record-sync" defaultChecked />
                      <Label htmlFor="record-sync">События синхронизации с Документолог</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="record-access" defaultChecked />
                      <Label htmlFor="record-access">События доступа к документам</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="record-signing" defaultChecked />
                      <Label htmlFor="record-signing">Подписание документов</Label>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 border rounded-lg p-4">
                  <h3 className="text-sm font-medium">Данные для хранения в блокчейне</h3>
                  <div className="text-sm text-muted-foreground mb-4">
                    Настройте, какие данные будут сохраняться в блокчейне при записи документов
                  </div>
                  
                  <div className="grid gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="store-hash" defaultChecked />
                      <Label htmlFor="store-hash">Хеш документа (SHA-256)</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="store-metadata" defaultChecked />
                      <Label htmlFor="store-metadata">Метаданные документа (название, тип, автор)</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="store-timestamps" defaultChecked />
                      <Label htmlFor="store-timestamps">Временные метки (создания, изменения)</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="store-signatures" defaultChecked />
                      <Label htmlFor="store-signatures">Цифровые подписи и сертификаты</Label>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="hyperledger-url">URL ноды Hyperledger Besu</Label>
                  <Input id="hyperledger-url" defaultValue="https://besu.agent-smith.gov.kz:8545" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contract-address">Адрес смарт-контракта</Label>
                  <Input id="contract-address" defaultValue="0x7CF1a78E31A5bcc60425C33c8a2D52B86fF1830F" />
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="border-t px-6 py-4">
              <Button>Сохранить настройки</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Dialog for manual sync */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Синхронизация с Документолог</DialogTitle>
            <DialogDescription>
              Запустить ручную синхронизацию документов с системой Документолог
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="sync-all" />
              <Label htmlFor="sync-all">Синхронизировать все документы (включая ранее импортированные)</Label>
            </div>
            
            <div className="mt-4">
              <Label htmlFor="sync-period">Период синхронизации</Label>
              <div className="flex space-x-2 mt-2">
                <select
                  id="sync-period"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="1">За последние 24 часа</option>
                  <option value="7">За последние 7 дней</option>
                  <option value="30">За последние 30 дней</option>
                  <option value="all">За все время</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <Label htmlFor="doctype">Типы документов</Label>
              <div className="flex space-x-2 mt-2">
                <select
                  id="doctype"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">Все типы документов</option>
                  <option value="incoming">Входящие документы</option>
                  <option value="outgoing">Исходящие документы</option>
                  <option value="internal">Внутренние документы</option>
                </select>
              </div>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowSyncDialog(false)}
            >
              Отмена
            </Button>
            <Button 
              type="button" 
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Синхронизация...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Запустить синхронизацию
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for integration settings */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Настройки интеграции с Документолог</DialogTitle>
            <DialogDescription>
              Настройте параметры подключения к системе Документолог
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="integration-active" className="flex flex-col space-y-1">
                <span>Интеграция активна</span>
                <span className="font-normal text-sm text-muted-foreground">
                  Включить или отключить интеграцию с Документолог
                </span>
              </Label>
              <Switch 
                id="integration-active"
                checked={integrationSettings.active}
                onCheckedChange={(checked) => 
                  setIntegrationSettings({...integrationSettings, active: checked})
                }
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-url">URL API Документолог</Label>
              <Input 
                id="api-url" 
                value={integrationSettings.apiUrl} 
                onChange={(e) => setIntegrationSettings({...integrationSettings, apiUrl: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-key">API ключ</Label>
              <Input 
                id="api-key" 
                type="password"
                value={integrationSettings.apiKey} 
                onChange={(e) => setIntegrationSettings({...integrationSettings, apiKey: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL для вебхуков (только для просмотра)</Label>
              <div className="flex space-x-2">
                <Input 
                  id="webhook-url" 
                  value={integrationSettings.webhookUrl} 
                  readOnly
                />
                <Button variant="outline" size="icon" onClick={() => {
                  navigator.clipboard.writeText(integrationSettings.webhookUrl);
                  toast({
                    description: "URL скопирован в буфер обмена"
                  });
                }}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Укажите этот URL в настройках вебхуков на стороне Документолог для автоматического получения новых документов
              </p>
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="auto-sync" className="flex flex-col space-y-1">
                <span>Автоматическая синхронизация</span>
                <span className="font-normal text-sm text-muted-foreground">
                  Периодически проверять новые документы
                </span>
              </Label>
              <Switch 
                id="auto-sync"
                checked={integrationSettings.autoSync}
                onCheckedChange={(checked) => 
                  setIntegrationSettings({...integrationSettings, autoSync: checked})
                }
              />
            </div>
            
            {integrationSettings.autoSync && (
              <div className="space-y-2">
                <Label htmlFor="sync-interval">Интервал синхронизации (минуты)</Label>
                <Input 
                  id="sync-interval" 
                  type="number"
                  min="5"
                  max="1440"
                  value={integrationSettings.syncInterval} 
                  onChange={(e) => setIntegrationSettings({
                    ...integrationSettings, 
                    syncInterval: parseInt(e.target.value) || 15
                  })}
                />
              </div>
            )}
            
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="record-blockchain" className="flex flex-col space-y-1">
                <span>Запись в блокчейн</span>
                <span className="font-normal text-sm text-muted-foreground">
                  Автоматически записывать документы в блокчейн
                </span>
              </Label>
              <Switch 
                id="record-blockchain"
                checked={integrationSettings.recordToBlockchain}
                onCheckedChange={(checked) => 
                  setIntegrationSettings({...integrationSettings, recordToBlockchain: checked})
                }
              />
            </div>
            
            {integrationSettings.lastSyncTime && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="text-blue-800">
                  <span className="font-semibold">Последняя синхронизация:</span> {formatDate(integrationSettings.lastSyncTime)}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowSettingsDialog(false)}
            >
              Отмена
            </Button>
            <Button 
              type="button" 
              onClick={handleSaveSettings}
              disabled={saveSettingsMutation.isPending}
            >
              {saveSettingsMutation.isPending ? "Сохранение..." : "Сохранить настройки"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Documents;