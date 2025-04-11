import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  FileCheck, 
  CheckCircle2, 
  Calendar, 
  User, 
  Clock, 
  Link as LinkIcon, 
  ExternalLink, 
  Database,
  Lock,
  FileText,
  Copy,
  AlertTriangle,
  Search as SearchIcon
} from "lucide-react";
import { BlockchainRecord, Activity } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// Компонент для отображения хеша блокчейна в сокращенном виде
const BlockchainHashDisplay = ({ hash }: { hash: string }) => {
  const { toast } = useToast();
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(hash);
    toast({
      title: "Скопировано в буфер обмена",
      description: "Хеш блокчейна скопирован в буфер обмена"
    });
  };
  
  const shortHash = hash.length > 20 
    ? `${hash.substring(0, 10)}...${hash.substring(hash.length - 6)}` 
    : hash;
  
  return (
    <div className="flex items-center space-x-1 font-mono text-sm">
      <span className="text-neutral-600">{shortHash}</span>
      <button 
        onClick={copyToClipboard}
        className="p-1 hover:bg-neutral-100 rounded-md"
        title="Копировать полный хеш"
      >
        <Copy className="h-3.5 w-3.5 text-neutral-500" />
      </button>
    </div>
  );
};

// Компонент для отображения блока активности
const ActivityCard = ({ activity }: { activity: Activity }) => {
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    
    if (diff < 60) return `${diff} сек назад`;
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} дн назад`;
    return new Date(date).toLocaleDateString();
  };
  
  const getActionIcon = (type: string) => {
    switch (type) {
      case "create_document":
        return <FileText className="h-5 w-5 text-blue-500" />;
      case "update_document":
        return <FileCheck className="h-5 w-5 text-green-500" />;
      case "blockchain_record":
        return <Database className="h-5 w-5 text-purple-500" />;
      case "create_task":
        return <CheckCircle2 className="h-5 w-5 text-orange-500" />;
      case "meeting_protocol":
        return <Calendar className="h-5 w-5 text-indigo-500" />;
      case "citizen_request":
        return <User className="h-5 w-5 text-primary-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-neutral-500" />;
    }
  };
  
  return (
    <div className="flex items-start space-x-4 p-4 border-b">
      <div className="bg-neutral-100 rounded-full p-2.5">
        {getActionIcon(activity.actionType)}
      </div>
      <div className="flex-1">
        <div className="flex justify-between">
          <h4 className="font-medium text-neutral-900">{activity.description}</h4>
          <span className="text-sm text-neutral-500">{getTimeAgo(activity.timestamp)}</span>
        </div>
        <div className="flex items-center mt-1 text-sm text-neutral-500">
          <User className="h-3.5 w-3.5 mr-1" />
          <span>{activity.userId ? `Пользователь #${activity.userId}` : "Система"}</span>
        </div>
        {activity.blockchainHash && (
          <div className="flex items-center mt-2">
            <Database className="h-3.5 w-3.5 mr-1 text-purple-500" />
            <BlockchainHashDisplay hash={activity.blockchainHash} />
          </div>
        )}
      </div>
    </div>
  );
};

// Компонент для отображения транзакции блокчейна
const BlockchainTransaction = ({ record }: { record: BlockchainRecord }) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Подтверждено</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">В обработке</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Ошибка</Badge>;
      default:
        return <Badge className="bg-neutral-100 text-neutral-800">{status}</Badge>;
    }
  };
  
  return (
    <>
      <TableRow className="hover:bg-neutral-50 cursor-pointer" onClick={() => setIsDetailsOpen(true)}>
        <TableCell className="font-medium">{record.id}</TableCell>
        <TableCell>
          <BlockchainHashDisplay hash={record.transactionHash} />
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            <span>{record.recordType}</span>
            <span className="text-sm text-neutral-500">{record.title}</span>
          </div>
        </TableCell>
        <TableCell>{formatDate(record.createdAt)}</TableCell>
        <TableCell>{getStatusBadge(record.status)}</TableCell>
        <TableCell>
          <div className="flex justify-end space-x-1">
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <ExternalLink className="h-4 w-4 text-neutral-500" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Детали транзакции блокчейна</DialogTitle>
            <DialogDescription>
              Информация о транзакции в GovChain
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-neutral-500 mb-1">ID транзакции</h3>
                <p className="text-lg font-medium">#{record.id}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-500 mb-1">Статус</h3>
                <div>{getStatusBadge(record.status)}</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-neutral-500 mb-1">Хеш транзакции</h3>
              <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200 flex items-center justify-between">
                <span className="font-mono text-sm">{record.transactionHash}</span>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-neutral-500 mb-1">Тип записи</h3>
                <p className="text-md">{record.recordType}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-500 mb-1">Название</h3>
                <p className="text-md">{record.title}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-neutral-500 mb-1">Создано</h3>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-neutral-500" />
                  <p className="text-md">{formatDate(record.createdAt)}</p>
                </div>
              </div>
              {record.confirmedAt && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-1">Подтверждено</h3>
                  <div className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                    <p className="text-md">{formatDate(record.confirmedAt)}</p>
                  </div>
                </div>
              )}
            </div>
            
            {record.metadata && (
              <div>
                <h3 className="text-sm font-medium text-neutral-500 mb-1">Метаданные</h3>
                <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200 h-48 overflow-auto">
                  <pre className="text-xs font-mono">{JSON.stringify(record.metadata, null, 2)}</pre>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Lock className="h-4 w-4 mr-1 text-green-600" />
                <span>Криптографически защищено в GovChain</span>
              </div>
              
              <Button variant="outline" size="sm" className="h-8">
                <LinkIcon className="h-4 w-4 mr-1" />
                Показать в блокчейне
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const DecisionHistory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  
  // Запрос на получение записей блокчейна
  const { data: blockchainRecords = [], isLoading: isLoadingRecords } = useQuery({
    queryKey: ['/api/blockchain/records'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/blockchain/records');
        const data = await res.json();
        return data as BlockchainRecord[];
      } catch (error) {
        console.error("Error fetching blockchain records", error);
        return [];
      }
    },
    staleTime: 60000
  });
  
  // Запрос на получение активности
  const { data: activities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: ['/api/activities'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/activities');
        const data = await res.json();
        return data as Activity[];
      } catch (error) {
        console.error("Error fetching activities", error);
        return [];
      }
    },
    staleTime: 60000
  });
  
  // Фильтрация записей блокчейна по статусу и типу
  const filteredRecords = blockchainRecords.filter(record => {
    let matchStatus = filterStatus === "all" || record.status === filterStatus;
    let matchType = filterType === "all" || record.recordType === filterType;
    let matchSearch = searchQuery === "" || 
      record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.transactionHash.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchStatus && matchType && matchSearch;
  });
  
  // Получение уникальных типов записей для фильтра
  const recordTypes = Array.from(new Set(blockchainRecords.map(record => record.recordType)));
  
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">История решений</h1>
        <p className="mt-2 text-sm text-neutral-700">
          Исследование записей в блокчейне и истории действий системы Agent Smith
        </p>
      </div>
      
      <Tabs defaultValue="blockchain" className="mb-6">
        <TabsList className="bg-neutral-100">
          <TabsTrigger value="blockchain" className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-900">
            Blockchain Explorer
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-900">
            Лента активности
          </TabsTrigger>
          <TabsTrigger value="verification" className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-900">
            Проверка документа
          </TabsTrigger>
        </TabsList>
        
        {/* Вкладка Blockchain Explorer */}
        <TabsContent value="blockchain">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Blockchain Explorer</CardTitle>
                  <CardDescription>
                    Записи, сохраненные в GovChain
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative w-80">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
                    <Input
                      type="search"
                      placeholder="Поиск по названию или хешу..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                  <select 
                    className="px-3 py-1 border rounded-md text-sm"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">Все статусы</option>
                    <option value="confirmed">Подтверждено</option>
                    <option value="pending">В обработке</option>
                    <option value="failed">Ошибка</option>
                  </select>
                  
                  <select 
                    className="px-3 py-1 border rounded-md text-sm"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">Все типы</option>
                    {recordTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <span className="text-sm text-neutral-500">
                    Показано {filteredRecords.length} из {blockchainRecords.length} записей
                  </span>
                </div>
              </div>
              
              {isLoadingRecords ? (
                <div className="flex justify-center items-center h-64">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 border-t-2 border-primary-500 rounded-full animate-spin"></div>
                    <p className="mt-4 text-neutral-500">Загрузка данных блокчейна...</p>
                  </div>
                </div>
              ) : blockchainRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Database className="h-16 w-16 text-neutral-300" />
                  <h3 className="mt-4 text-lg font-medium">Нет записей в блокчейне</h3>
                  <p className="mt-2 text-neutral-500 text-center max-w-md">
                    Записи будут появляться здесь, когда протоколы совещаний, обращения граждан и другие документы
                    будут сохранены в блокчейне для юридической значимости.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead className="w-[220px]">Хеш</TableHead>
                        <TableHead>Информация</TableHead>
                        <TableHead className="w-[180px]">Дата</TableHead>
                        <TableHead className="w-[120px]">Статус</TableHead>
                        <TableHead className="w-[80px] text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map(record => (
                        <BlockchainTransaction key={record.id} record={record} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Вкладка ленты активности */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Лента активности</CardTitle>
                  <CardDescription>
                    История действий в системе Agent Smith
                  </CardDescription>
                </div>
                <div>
                  <select className="px-3 py-1 border rounded-md text-sm">
                    <option value="all">Все действия</option>
                    <option value="blockchain_record">Записи в блокчейне</option>
                    <option value="document">Документы</option>
                    <option value="meeting">Совещания</option>
                    <option value="request">Обращения граждан</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingActivities ? (
                <div className="flex justify-center items-center h-64">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 border-t-2 border-primary-500 rounded-full animate-spin"></div>
                    <p className="mt-4 text-neutral-500">Загрузка ленты активности...</p>
                  </div>
                </div>
              ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Clock className="h-16 w-16 text-neutral-300" />
                  <h3 className="mt-4 text-lg font-medium">Нет записей активности</h3>
                  <p className="mt-2 text-neutral-500 text-center max-w-md">
                    Здесь будет отображаться история действий в системе Agent Smith
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {activities.map(activity => (
                    <ActivityCard key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Вкладка проверки документа */}
        <TabsContent value="verification">
          <Card>
            <CardHeader>
              <CardTitle>Проверка документа</CardTitle>
              <CardDescription>
                Проверьте подлинность документа по его хешу в блокчейне
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Введите хеш документа</h3>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
                      <Input 
                        type="text" 
                        placeholder="0x1a2b3c4d5e6f..." 
                        className="pl-8 font-mono"
                      />
                    </div>
                    <Button>
                      <SearchIcon className="h-4 w-4 mr-2" />
                      Проверить
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Загрузите документ для проверки</h3>
                  <div className="border-2 border-dashed rounded-md p-8 text-center">
                    <div className="flex flex-col items-center">
                      <FileText className="h-10 w-10 text-neutral-300 mb-2" />
                      <p className="text-neutral-500 mb-3">
                        Перетащите файл или нажмите для загрузки
                      </p>
                      <Button variant="outline">Выбрать файл</Button>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-neutral-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary-100 p-2 rounded-full">
                      <Lock className="h-5 w-5 text-primary-700" />
                    </div>
                    <div>
                      <h3 className="font-medium text-primary-900">Безопасная проверка</h3>
                      <p className="text-sm text-neutral-600">
                        Документ проверяется локально, его содержимое не передается на сервер.
                        Мы сравниваем только хеш вашего документа с записями в блокчейне.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default DecisionHistory;