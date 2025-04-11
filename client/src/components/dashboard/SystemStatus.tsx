import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SystemStatus } from "@/lib/types";

interface SystemStatusCardProps {
  refreshInterval?: number;
}

const SystemStatusCard = ({ refreshInterval = 60000 }: SystemStatusCardProps) => {
  const { data, isLoading, error } = useQuery<SystemStatus[]>({
    queryKey: ['/api/system/status'],
    refetchInterval: refreshInterval, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card className="bg-white shadow">
        <CardHeader>
          <CardTitle>Статус системы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex justify-between mb-2">
                  <div className="h-4 bg-neutral-200 rounded w-1/3"></div>
                  <div className="h-4 bg-neutral-200 rounded w-10"></div>
                </div>
                <div className="h-2 bg-neutral-200 rounded-full"></div>
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
          <CardTitle>Статус системы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-red-500 text-center">
            Не удалось загрузить статус системы
          </div>
        </CardContent>
      </Card>
    );
  }

  const statuses = data || [];

  return (
    <Card className="bg-white shadow">
      <CardHeader>
        <CardTitle>Статус системы</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statuses.map((status) => (
            <div key={status.id}>
              <div className="flex justify-between">
                <p className="text-sm font-medium text-neutral-800">{status.serviceName}</p>
                <p className="text-sm text-neutral-500">{status.status}%</p>
              </div>
              <div className="mt-2 w-full bg-neutral-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    status.status > 90 
                      ? 'bg-green-500' 
                      : status.status > 70 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                  }`} 
                  style={{ width: `${status.status}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-5 text-right">
          <a href="/analytics" className="text-sm font-medium text-primary-600 hover:text-primary-500">
            Подробная статистика
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemStatusCard;
