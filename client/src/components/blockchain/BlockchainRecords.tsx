import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { BlockchainRecord, FormattedBlockchainRecord } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { ShieldCheck } from "lucide-react";

// Helper function to format blockchain records
const formatBlockchainRecords = (records: BlockchainRecord[]): FormattedBlockchainRecord[] => {
  return records.map(record => {
    // Format time ago
    const timeAgo = record.createdAt ? formatDistanceToNow(new Date(record.createdAt), { 
      addSuffix: true,
      locale: ru
    }) : '';

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

interface BlockchainRecordsProps {
  limit?: number;
}

const BlockchainRecords = ({ limit = 3 }: BlockchainRecordsProps) => {
  const { data, isLoading, error } = useQuery<BlockchainRecord[]>({
    queryKey: ['/api/blockchain/records'],
  });

  if (isLoading) {
    return (
      <Card className="bg-white shadow">
        <CardHeader>
          <CardTitle>Последние записи в блокчейне</CardTitle>
          <CardDescription>Загрузка...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse border border-neutral-200 rounded-md p-4">
                <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-neutral-200 rounded w-1/2 mb-3"></div>
                <div className="h-3 bg-neutral-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white shadow">
        <CardHeader>
          <CardTitle>Последние записи в блокчейне</CardTitle>
          <CardDescription>Ошибка загрузки данных</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-red-500 text-center">
            Не удалось загрузить записи блокчейна
          </div>
        </CardContent>
      </Card>
    );
  }

  const formattedRecords = formatBlockchainRecords(data || []).slice(0, limit);

  if (formattedRecords.length === 0) {
    return (
      <Card className="bg-white shadow">
        <CardHeader>
          <CardTitle>Последние записи в блокчейне</CardTitle>
          <CardDescription>Записи решений с DAO-фиксацией</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8">
            <ShieldCheck className="h-12 w-12 text-neutral-400 mb-4" />
            <p className="text-center text-neutral-600">
              Нет записей в блокчейне
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow">
      <CardHeader>
        <CardTitle>Последние записи в блокчейне</CardTitle>
        <CardDescription>
          Записи решений с DAO-фиксацией
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {formattedRecords.map((record) => (
            <div key={record.id} className="border border-neutral-200 rounded-md p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-neutral-900">{record.title}</h4>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${record.statusBadge.color}`}>
                  {record.statusBadge.text}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">{record.timeAgo}</p>
              <div className="mt-3 flex items-center">
                <ShieldCheck className="h-5 w-5 text-primary-600 mr-2" />
                <span className="text-xs text-neutral-800 font-mono">Хеш: {record.shortHash}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-5 text-right">
          <a href="/history" className="text-sm font-medium text-primary-600 hover:text-primary-500">
            Показать все записи
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </CardContent>
    </Card>
  );
};

export default BlockchainRecords;
