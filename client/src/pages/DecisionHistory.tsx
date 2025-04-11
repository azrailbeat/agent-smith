import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { BlockchainRecord, FormattedBlockchainRecord } from "@/lib/types";
import { ShieldCheck, AlertCircle, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const DecisionHistory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: recordsData, isLoading } = useQuery<BlockchainRecord[]>({
    queryKey: ['/api/blockchain/records'],
  });

  // Format blockchain records for display
  const formatRecords = (records: BlockchainRecord[]): FormattedBlockchainRecord[] => {
    return records.map(record => {
      // Format time ago
      const timeAgo = record.createdAt 
        ? format(new Date(record.createdAt), "dd.MM.yyyy HH:mm", { locale: ru })
        : '';

      // Format status badge
      let statusBadge = {
        color: "bg-yellow-100 text-yellow-800",
        text: "В обработке"
      };

      if (record.status === 'confirmed') {
        statusBadge = {
          color: "bg-green-100 text-green-800",
          text: "Подтверждено"
        };
      } else if (record.status === 'failed') {
        statusBadge = {
          color: "bg-red-100 text-red-800",
          text: "Ошибка"
        };
      }

      // Shortened hash
      const shortHash = record.transactionHash.length > 16 
        ? `${record.transactionHash.substring(0, 8)}...${record.transactionHash.substring(record.transactionHash.length - 8)}`
        : record.transactionHash;

      return {
        ...record,
        timeAgo,
        statusBadge,
        shortHash
      };
    });
  };

  const records = isLoading ? [] : formatRecords(recordsData || []);
  
  // Filter records by search term
  const filteredRecords = searchTerm 
    ? records.filter(record => 
        record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.transactionHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.recordType.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : records;

  return (
    <>
      {/* Page header */}
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">История решений</h1>
            <p className="mt-2 text-sm text-neutral-700">
              Записи всех решений с DAO-фиксацией в блокчейне
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex">
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-neutral-400" />
              </div>
              <Input 
                type="text" 
                placeholder="Поиск по записям..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button className="ml-3">
              Проверить хеш
            </Button>
          </div>
        </div>
      </div>

      {/* Blockchain records table */}
      <Card>
        <CardHeader>
          <CardTitle>Записи в блокчейне</CardTitle>
          <CardDescription>
            Все решения, зафиксированные в блокчейне для обеспечения прозрачности
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-neutral-100 rounded"></div>
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ShieldCheck className="h-12 w-12 text-neutral-400 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">Записей не найдено</h3>
              <p className="text-neutral-500 text-center max-w-md">
                {searchTerm 
                  ? "По вашему запросу не найдено записей в блокчейне. Попробуйте изменить критерии поиска."
                  : "В системе еще нет записей в блокчейне. Они появятся по мере принятия решений."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Тип записи</TableHead>
                  <TableHead>Хеш транзакции</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id} className="hover:bg-neutral-50 cursor-pointer" onClick={() => window.location.href = `/history/${record.id}`}>
                    <TableCell className="font-medium">{record.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {record.recordType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{record.shortHash}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-neutral-500" />
                        {record.timeAgo}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={record.statusBadge.color}>
                        {record.statusBadge.text}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default DecisionHistory;
