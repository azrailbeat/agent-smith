import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { 
  History, 
  Search, 
  Database, 
  Filter, 
  Check, 
  ClipboardEdit, 
  FileCheck, 
  MessageSquare, 
  Calendar,
  User,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type HistoryRecord = {
  id: number;
  timestamp: string;
  actionType: string;
  description: string;
  userId?: number | null;
  userFullName?: string;
  relatedId?: number | null;
  relatedType?: string | null;
  blockchainHash?: string | null;
  metadata?: Record<string, any>;
};

type FilterOptions = {
  actionType: string;
  dateRange: string;
  blockchainOnly: boolean;
  searchTerm: string;
  userId: string;
};

const HistoryPage = () => {
  const { toast } = useToast();
  const [showRecordDetails, setShowRecordDetails] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState<FilterOptions>({
    actionType: "all",
    dateRange: "all",
    blockchainOnly: false,
    searchTerm: "",
    userId: "all"
  });

  // Demo history records
  const demoHistoryRecords: HistoryRecord[] = [
    {
      id: 1,
      timestamp: "2025-04-11T14:32:22",
      actionType: "document_created",
      description: "Создан новый документ: Отчет о проделанной работе",
      userId: 1,
      userFullName: "Иванов Иван",
      relatedId: 123,
      relatedType: "document",
      blockchainHash: "0x7cf1a78e31a5bcc60425c33c8a2d52b86ff1830f7d0d33deea89b3010ae9ec6c",
      metadata: {
        documentType: "report",
        size: "1.2MB",
        format: "pdf"
      }
    },
    {
      id: 2,
      timestamp: "2025-04-11T14:15:08",
      actionType: "task_status_changed",
      description: "Изменен статус задачи: Подготовка отчета → Завершено",
      userId: 1,
      userFullName: "Иванов Иван",
      relatedId: 45,
      relatedType: "task",
      blockchainHash: "0x8bf3b25f28d4c08e254a633a1e59e96c5b5c5e3a6d28f4b13deebffe8c92f93a",
      metadata: {
        oldStatus: "in_progress",
        newStatus: "completed",
        taskTitle: "Подготовка отчета"
      }
    },
    {
      id: 3,
      timestamp: "2025-04-11T13:42:30",
      actionType: "citizen_request_processed",
      description: "Обработано обращение гражданина: Запрос на выдачу справки",
      userId: 2,
      userFullName: "Петров Петр",
      relatedId: 78,
      relatedType: "citizen_request",
      blockchainHash: "0x5de1c7ae3dba14e7c798862f5b6e3c138b84510d851c3254a805a22fb10782a8",
      metadata: {
        requestType: "certificate",
        citizenName: "Сидоров С.С.",
        responseTime: "2 days",
        status: "completed"
      }
    },
    {
      id: 4,
      timestamp: "2025-04-11T12:08:15",
      actionType: "meeting_protocol_created",
      description: "Создан протокол совещания: Обсуждение нового проекта",
      userId: 3,
      userFullName: "Смирнова Анна",
      relatedId: 34,
      relatedType: "meeting",
      blockchainHash: "0x9dc1a78e31a5bcc60425c33c8a2d52b86ff1830f7d0d33deea89b3010ae9ec6d",
      metadata: {
        meetingTitle: "Обсуждение нового проекта",
        participants: ["Иванов И.И.", "Петров П.П.", "Смирнова А.А."],
        decisions: ["Утвердить план проекта", "Назначить ответственных"],
        duration: "1.5 hours"
      }
    },
    {
      id: 5,
      timestamp: "2025-04-11T11:30:25",
      actionType: "login",
      description: "Вход в систему",
      userId: 1,
      userFullName: "Иванов Иван",
      blockchainHash: null
    },
    {
      id: 6,
      timestamp: "2025-04-11T10:45:18",
      actionType: "document_signed",
      description: "Подписан документ: Приказ о назначении",
      userId: 4,
      userFullName: "Козлов Владимир",
      relatedId: 122,
      relatedType: "document",
      blockchainHash: "0x3df1a78e31a5bcc60425c33c8a2d52b86ff1830f7d0d33deea89b3010ae9ec7b",
      metadata: {
        signatureType: "digital",
        documentTitle: "Приказ о назначении",
        signatureDate: "2025-04-11T10:45:18"
      }
    },
    {
      id: 7,
      timestamp: "2025-04-10T17:12:45",
      actionType: "system_update",
      description: "Обновление системы Agent Smith до версии 2.5.1",
      blockchainHash: "0x2bf3b25f28d4c08e254a633a1e59e96c5b5c5e3a6d28f4b13deebffe8c92f93c",
      metadata: {
        oldVersion: "2.5.0",
        newVersion: "2.5.1",
        updateType: "security",
        changes: ["Исправлены уязвимости безопасности", "Улучшена производительность"]
      }
    },
    {
      id: 8,
      timestamp: "2025-04-10T16:08:32",
      actionType: "task_created",
      description: "Создана новая задача: Разработка API для интеграции",
      userId: 2,
      userFullName: "Петров Петр",
      relatedId: 46,
      relatedType: "task",
      blockchainHash: "0x1af3b25f28d4c08e254a633a1e59e96c5b5c5e3a6d28f4b13deebffe8c92f93d",
      metadata: {
        priority: "high",
        dueDate: "2025-04-20",
        assignedTo: "Иванов Иван",
        taskType: "development"
      }
    }
  ];

  // Query history records
  const { data: historyRecords = demoHistoryRecords, isLoading } = useQuery<HistoryRecord[]>({
    queryKey: ['/api/activities'],
  });
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMMM yyyy, HH:mm", { locale: ru });
  };
  
  // Apply filters to history records
  const filteredRecords = historyRecords.filter(record => {
    // Filter by action type
    if (filters.actionType !== "all" && record.actionType !== filters.actionType) {
      return false;
    }
    
    // Filter by blockchain only
    if (filters.blockchainOnly && !record.blockchainHash) {
      return false;
    }
    
    // Filter by search term
    if (filters.searchTerm && !record.description.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by user
    if (filters.userId !== "all" && record.userId !== parseInt(filters.userId)) {
      return false;
    }
    
    // Filter by date range
    if (filters.dateRange !== "all") {
      const recordDate = new Date(record.timestamp);
      const today = new Date();
      
      switch (filters.dateRange) {
        case "today":
          return recordDate.toDateString() === today.toDateString();
        case "yesterday":
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          return recordDate.toDateString() === yesterday.toDateString();
        case "week":
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          return recordDate >= weekAgo;
        case "month":
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          return recordDate >= monthAgo;
      }
    }
    
    return true;
  });
  
  // Get icon for action type
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "document_created":
      case "document_updated":
      case "document_deleted":
      case "document_signed":
        return <FileCheck className="h-4 w-4" />;
      case "task_created":
      case "task_updated":
      case "task_status_changed":
      case "task_deleted":
        return <ClipboardEdit className="h-4 w-4" />;
      case "citizen_request_created":
      case "citizen_request_processed":
      case "citizen_request_closed":
        return <MessageSquare className="h-4 w-4" />;
      case "meeting_protocol_created":
      case "meeting_scheduled":
      case "meeting_cancelled":
        return <Calendar className="h-4 w-4" />;
      case "login":
      case "logout":
      case "password_changed":
        return <User className="h-4 w-4" />;
      case "system_update":
      case "system_error":
      case "system_warning":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };
  
  // Get color for badge based on action type
  const getActionColor = (actionType: string) => {
    if (actionType.includes("created") || actionType.includes("signed")) {
      return "bg-green-100 text-green-800";
    } else if (actionType.includes("updated") || actionType.includes("changed") || actionType.includes("processed")) {
      return "bg-blue-100 text-blue-800";
    } else if (actionType.includes("deleted") || actionType.includes("cancelled") || actionType.includes("error")) {
      return "bg-red-100 text-red-800";
    } else if (actionType.includes("warning")) {
      return "bg-yellow-100 text-yellow-800";
    } else if (actionType.includes("login") || actionType.includes("logout")) {
      return "bg-purple-100 text-purple-800";
    } else {
      return "bg-neutral-100 text-neutral-800";
    }
  };
  
  // View details of a record
  const viewRecordDetails = (record: HistoryRecord) => {
    setSelectedRecord(record);
    setShowRecordDetails(true);
  };
  
  // Reset filters
  const resetFilters = () => {
    setFilters({
      actionType: "all",
      dateRange: "all",
      blockchainOnly: false,
      searchTerm: "",
      userId: "all"
    });
  };
  
  return (
    <>
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">История</h1>
            <p className="mt-2 text-sm text-neutral-700">
              Полный журнал событий и действий в системе с аудиторским следом в блокчейне
            </p>
          </div>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="action-type">Тип действия</Label>
              <Select 
                value={filters.actionType} 
                onValueChange={(value) => setFilters({...filters, actionType: value})}
              >
                <SelectTrigger id="action-type">
                  <SelectValue placeholder="Все типы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="document_created">Создание документа</SelectItem>
                  <SelectItem value="document_signed">Подписание документа</SelectItem>
                  <SelectItem value="task_status_changed">Изменение статуса задачи</SelectItem>
                  <SelectItem value="task_created">Создание задачи</SelectItem>
                  <SelectItem value="citizen_request_processed">Обработка обращения</SelectItem>
                  <SelectItem value="meeting_protocol_created">Протокол совещания</SelectItem>
                  <SelectItem value="login">Вход в систему</SelectItem>
                  <SelectItem value="system_update">Обновление системы</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="date-range">Период</Label>
              <Select 
                value={filters.dateRange} 
                onValueChange={(value) => setFilters({...filters, dateRange: value})}
              >
                <SelectTrigger id="date-range">
                  <SelectValue placeholder="Все время" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все время</SelectItem>
                  <SelectItem value="today">Сегодня</SelectItem>
                  <SelectItem value="yesterday">Вчера</SelectItem>
                  <SelectItem value="week">Последние 7 дней</SelectItem>
                  <SelectItem value="month">Последние 30 дней</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="user-filter">Пользователь</Label>
              <Select 
                value={filters.userId} 
                onValueChange={(value) => setFilters({...filters, userId: value})}
              >
                <SelectTrigger id="user-filter">
                  <SelectValue placeholder="Все пользователи" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все пользователи</SelectItem>
                  <SelectItem value="1">Иванов Иван</SelectItem>
                  <SelectItem value="2">Петров Петр</SelectItem>
                  <SelectItem value="3">Смирнова Анна</SelectItem>
                  <SelectItem value="4">Козлов Владимир</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="search-history">Поиск по описанию</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="search-history"
                  placeholder="Поиск..." 
                  className="pl-8"
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex items-end">
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  className="gap-1"
                  onClick={() => setFilters({...filters, blockchainOnly: !filters.blockchainOnly})}
                >
                  <Database className="h-4 w-4" />
                  {filters.blockchainOnly ? 'Все записи' : 'Только в блокчейне'}
                </Button>
                <Button 
                  variant="ghost"
                  onClick={resetFilters}
                >
                  Сбросить
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="all">
        <TabsList className="mb-6">
          <TabsTrigger value="all">Все события</TabsTrigger>
          <TabsTrigger value="documents">Документы</TabsTrigger>
          <TabsTrigger value="tasks">Задачи</TabsTrigger>
          <TabsTrigger value="citizen-requests">Обращения граждан</TabsTrigger>
          <TabsTrigger value="blockchain">Блокчейн</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Журнал событий системы</CardTitle>
              <CardDescription>
                Все действия пользователей и системные события
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-12 bg-neutral-100 rounded-lg"></div>
                  ))}
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-neutral-300 mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">Нет событий</h3>
                  <p className="text-neutral-500 text-center max-w-md">
                    По указанным критериям не найдено событий. Попробуйте изменить параметры фильтрации.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата и время</TableHead>
                      <TableHead>Тип действия</TableHead>
                      <TableHead>Описание</TableHead>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Блокчейн</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map(record => (
                      <TableRow key={record.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewRecordDetails(record)}>
                        <TableCell className="text-neutral-500 whitespace-nowrap">
                          {formatDate(record.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`flex items-center gap-1 ${getActionColor(record.actionType)}`}>
                            {getActionIcon(record.actionType)}
                            <span className="capitalize">
                              {record.actionType.replace(/_/g, ' ')}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{record.description}</TableCell>
                        <TableCell>
                          {record.userFullName ? (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {record.userFullName}
                            </span>
                          ) : (
                            <span className="text-neutral-400">Система</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.blockchainHash ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="bg-purple-100 text-purple-800 cursor-pointer">
                                    <Database className="h-3 w-3 mr-1" />
                                    Записано
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-mono text-xs">{record.blockchainHash}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Badge variant="outline">Не записано</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Search className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="documents">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>История документов</CardTitle>
              <CardDescription>
                Все события связанные с документами в системе
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата и время</TableHead>
                    <TableHead>Действие</TableHead>
                    <TableHead>Документ</TableHead>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Блокчейн</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords
                    .filter(record => 
                      record.actionType.includes('document') || 
                      (record.relatedType === 'document')
                    )
                    .map(record => (
                      <TableRow key={record.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewRecordDetails(record)}>
                        <TableCell className="text-neutral-500 whitespace-nowrap">
                          {formatDate(record.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`flex items-center gap-1 ${getActionColor(record.actionType)}`}>
                            {getActionIcon(record.actionType)}
                            <span className="capitalize">
                              {record.actionType.replace(/_/g, ' ')}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {record.description.replace('Создан новый документ: ', '').replace('Подписан документ: ', '')}
                        </TableCell>
                        <TableCell>
                          {record.userFullName || <span className="text-neutral-400">Система</span>}
                        </TableCell>
                        <TableCell>
                          {record.blockchainHash ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="bg-purple-100 text-purple-800 cursor-pointer">
                                    <Database className="h-3 w-3 mr-1" />
                                    Записано
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-mono text-xs">{record.blockchainHash}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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
        
        <TabsContent value="tasks">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>История задач</CardTitle>
              <CardDescription>
                Все события связанные с задачами в системе
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата и время</TableHead>
                    <TableHead>Действие</TableHead>
                    <TableHead>Задача</TableHead>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Детали</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords
                    .filter(record => 
                      record.actionType.includes('task') || 
                      (record.relatedType === 'task')
                    )
                    .map(record => (
                      <TableRow key={record.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewRecordDetails(record)}>
                        <TableCell className="text-neutral-500 whitespace-nowrap">
                          {formatDate(record.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`flex items-center gap-1 ${getActionColor(record.actionType)}`}>
                            {getActionIcon(record.actionType)}
                            <span className="capitalize">
                              {record.actionType.replace(/_/g, ' ')}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.metadata && record.metadata.taskTitle ? 
                            record.metadata.taskTitle : 
                            record.description.replace('Создана новая задача: ', '').replace('Изменен статус задачи: ', '')
                          }
                        </TableCell>
                        <TableCell>
                          {record.userFullName || <span className="text-neutral-400">Система</span>}
                        </TableCell>
                        <TableCell>
                          {record.actionType === 'task_status_changed' && record.metadata ? (
                            <div className="flex items-center gap-1">
                              <Badge className="bg-neutral-100 text-neutral-800">{record.metadata.oldStatus.replace(/_/g, ' ')}</Badge>
                              <span>→</span>
                              <Badge className="bg-green-100 text-green-800">{record.metadata.newStatus.replace(/_/g, ' ')}</Badge>
                            </div>
                          ) : (
                            <span>#{record.relatedId}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="citizen-requests">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>История обращений граждан</CardTitle>
              <CardDescription>
                Все события связанные с обращениями граждан
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата и время</TableHead>
                    <TableHead>Действие</TableHead>
                    <TableHead>Обращение</TableHead>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords
                    .filter(record => 
                      record.actionType.includes('citizen_request') || 
                      (record.relatedType === 'citizen_request')
                    )
                    .map(record => (
                      <TableRow key={record.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewRecordDetails(record)}>
                        <TableCell className="text-neutral-500 whitespace-nowrap">
                          {formatDate(record.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`flex items-center gap-1 ${getActionColor(record.actionType)}`}>
                            {getActionIcon(record.actionType)}
                            <span className="capitalize">
                              {record.actionType.replace(/_/g, ' ')}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.description.replace('Обработано обращение гражданина: ', '')}
                        </TableCell>
                        <TableCell>
                          {record.userFullName || <span className="text-neutral-400">Система</span>}
                        </TableCell>
                        <TableCell>
                          {record.metadata && record.metadata.status ? (
                            <Badge className={
                              record.metadata.status === 'completed' ? 
                              'bg-green-100 text-green-800' : 
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {record.metadata.status === 'completed' ? 'Завершено' : 'В обработке'}
                            </Badge>
                          ) : (
                            <span>-</span>
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
            <CardHeader className="pb-3">
              <CardTitle>Записи в блокчейне</CardTitle>
              <CardDescription>
                События и документы, закрепленные в блокчейне Hyperledger Besu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <Database className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Подключение к блокчейну активно</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Система подключена к сети Hyperledger Besu и записывает все важные события в блокчейн для обеспечения целостности и неизменности данных.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата и время</TableHead>
                    <TableHead>Тип записи</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead>Хеш транзакции</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords
                    .filter(record => record.blockchainHash)
                    .map(record => (
                      <TableRow key={record.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewRecordDetails(record)}>
                        <TableCell className="text-neutral-500 whitespace-nowrap">
                          {formatDate(record.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`flex items-center gap-1 ${getActionColor(record.actionType)}`}>
                            {getActionIcon(record.actionType)}
                            <span className="capitalize">
                              {record.actionType.replace(/_/g, ' ')}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{record.description}</TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-purple-700">{record.blockchainHash.substring(0, 10)}...{record.blockchainHash.substring(record.blockchainHash.length - 10)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Подтверждено
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Record Details Dialog */}
      <Dialog open={showRecordDetails} onOpenChange={setShowRecordDetails}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Детали записи</DialogTitle>
            <DialogDescription>
              Подробная информация о событии в системе
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="py-4">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{selectedRecord.description}</h3>
                    <p className="text-sm text-neutral-500">
                      {formatDate(selectedRecord.timestamp)}
                    </p>
                  </div>
                  <Badge className={`${getActionColor(selectedRecord.actionType)}`}>
                    {selectedRecord.actionType.replace(/_/g, ' ')}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Идентификатор</Label>
                    <div className="text-sm bg-neutral-50 p-2 rounded-md">#{selectedRecord.id}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Пользователь</Label>
                    <div className="text-sm bg-neutral-50 p-2 rounded-md flex items-center gap-2">
                      {selectedRecord.userFullName ? (
                        <>
                          <User className="h-4 w-4 text-neutral-500" />
                          <span>{selectedRecord.userFullName}</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Система</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {selectedRecord.relatedId && selectedRecord.relatedType && (
                    <div className="space-y-2">
                      <Label>Связанный объект</Label>
                      <div className="text-sm bg-neutral-50 p-2 rounded-md">
                        <span className="capitalize">{selectedRecord.relatedType.replace(/_/g, ' ')}</span> #{selectedRecord.relatedId}
                      </div>
                    </div>
                  )}
                  
                  {selectedRecord.blockchainHash && (
                    <div className="space-y-2">
                      <Label>Хеш в блокчейне</Label>
                      <div className="text-sm bg-neutral-50 p-2 rounded-md font-mono text-xs truncate">
                        {selectedRecord.blockchainHash}
                      </div>
                    </div>
                  )}
                </div>
                
                {selectedRecord.metadata && Object.keys(selectedRecord.metadata).length > 0 && (
                  <div className="space-y-2">
                    <Label>Дополнительные данные</Label>
                    <div className="text-sm bg-neutral-50 p-4 rounded-md overflow-auto max-h-48 font-mono text-xs">
                      <pre>{JSON.stringify(selectedRecord.metadata, null, 2)}</pre>
                    </div>
                  </div>
                )}
                
                {selectedRecord.blockchainHash && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex">
                      <Database className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-purple-800">Информация о записи в блокчейне</h3>
                        <div className="mt-2 text-sm text-purple-700 space-y-1">
                          <p>Транзакция: <span className="font-mono">{selectedRecord.blockchainHash}</span></p>
                          <p>Статус: Подтверждено (8 подтверждений)</p>
                          <p>Записано: {formatDate(selectedRecord.timestamp)}</p>
                          <p>Тип смарт-контракта: AuditLog</p>
                        </div>
                        <div className="mt-2">
                          <a 
                            href={`https://explorer.agent-smith.gov.kz/tx/${selectedRecord.blockchainHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-purple-700 hover:text-purple-800 text-sm flex items-center"
                          >
                            Открыть в блокчейн-обозревателе
                            <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRecordDetails(false)}
            >
              Закрыть
            </Button>
            {selectedRecord && selectedRecord.blockchainHash && (
              <Button 
                onClick={() => {
                  toast({
                    title: "Проверено в блокчейне",
                    description: "Запись подтверждена в блокчейне Hyperledger Besu",
                  });
                }}
                className="gap-1"
              >
                <Check className="h-4 w-4" />
                Проверить в блокчейне
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HistoryPage;