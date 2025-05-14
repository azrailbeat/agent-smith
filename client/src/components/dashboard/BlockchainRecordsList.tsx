import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from 'lucide-react';

interface BlockchainRecord {
  id: number;
  entity: string;
  entityId: string;
  hash: string;
  timeAgo: string;
}

interface BlockchainRecordsListProps {
  records: BlockchainRecord[];
}

export function BlockchainRecordsList({ records }: BlockchainRecordsListProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Последние записи в блокчейне</CardTitle>
        <p className="text-xs text-muted-foreground">Записи внесенные с DAO-фиксацией</p>
      </CardHeader>
      <CardContent className="space-y-4 px-6">
        {records.map((record) => (
          <div key={record.id} className="border rounded-md p-3 space-y-2">
            <div className="flex justify-between items-start">
              <div className="text-sm font-medium">{record.entity} #{record.entityId}</div>
              <Badge variant="outline" className="bg-red-50 text-red-600 hover:bg-red-50">Ошибка</Badge>
            </div>
            <div className="text-xs text-gray-500">{record.timeAgo}</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                <Check className="h-3 w-3 mr-1" />
                Хеш
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="pt-2 pb-4">
        <Button variant="link" className="px-0 text-sm font-normal" size="sm">
          Показать все записи→
        </Button>
      </CardFooter>
    </Card>
  );
}

export default BlockchainRecordsList;