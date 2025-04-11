import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Activity, FormattedActivity } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { AlertCircleIcon, FileIcon, UserIcon, CheckCircleIcon } from "lucide-react";

// Helper function to format activities
const formatActivities = (activities: Activity[]): FormattedActivity[] => {
  return activities.map(activity => {
    // Format time ago
    const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { 
      addSuffix: true,
      locale: ru
    });

    // Set icon and color based on activity type
    let icon = <FileIcon />;
    let color = "bg-primary-500";

    switch (activity.actionType) {
      case "user_login":
      case "user_activity":
        icon = <UserIcon />;
        color = "bg-info";
        break;
      case "document_processed":
      case "document_uploaded":
        icon = <FileIcon />;
        color = "bg-primary-500";
        break;
      case "blockchain_record_created":
      case "dao_record_confirmed":
        icon = <CheckCircleIcon />;
        color = "bg-green-500";
        break;
      default:
        icon = <AlertCircleIcon />;
        color = "bg-neutral-500";
    }

    return {
      ...activity,
      timeAgo,
      icon,
      color
    };
  });
};

interface ActivityFeedProps {
  limit?: number;
}

const ActivityFeed = ({ limit = 5 }: ActivityFeedProps) => {
  const { data, isLoading, error } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
  });

  if (isLoading) {
    return (
      <Card className="bg-white shadow mb-6">
        <CardHeader>
          <CardTitle>Недавняя активность</CardTitle>
          <CardDescription>Загрузка...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex">
                <div className="rounded-full bg-neutral-200 h-10 w-10"></div>
                <div className="ml-3 flex-1">
                  <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white shadow mb-6">
        <CardHeader>
          <CardTitle>Недавняя активность</CardTitle>
          <CardDescription>Ошибка загрузки данных</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4 text-red-500">
            <AlertCircleIcon className="mr-2" />
            <span>Не удалось загрузить историю активности</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formattedActivities = formatActivities(data || []).slice(0, limit);

  if (formattedActivities.length === 0) {
    return (
      <Card className="bg-white shadow mb-6">
        <CardHeader>
          <CardTitle>Недавняя активность</CardTitle>
          <CardDescription>Нет недавней активности</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-center text-neutral-600">
              Нет записей об активности в системе
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow">
      <CardHeader className="border-b border-neutral-200">
        <CardTitle>Недавняя активность</CardTitle>
        <CardDescription>
          История взаимодействий и обработанных запросов
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 py-2 divide-y divide-neutral-200">
        {formattedActivities.map((activity) => (
          <div key={activity.id} className="py-3">
            <div className="flex space-x-3">
              <div>
                <div className={`${activity.color} rounded-full h-8 w-8 flex items-center justify-center`}>
                  <div className="text-white h-5 w-5">
                    {activity.icon}
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-800" dangerouslySetInnerHTML={{ 
                  __html: activity.description.replace(
                    /"([^"]+)"/g, 
                    '<a href="#" class="font-medium text-primary-600">$1</a>'
                  )
                }} />
                
                {activity.blockchainHash && (
                  <p className="text-sm text-neutral-500">
                    <a href={`#${activity.blockchainHash}`} className="font-medium text-primary-600">
                      ID записи: {activity.blockchainHash.substring(0, 8)}...{activity.blockchainHash.substring(activity.blockchainHash.length - 6)}
                    </a>
                  </p>
                )}
                
                <p className="text-sm text-neutral-500 mt-1">
                  {activity.timeAgo}
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="px-4 py-3 border-t border-neutral-200 bg-neutral-50 text-right">
        <a href="/history" className="text-sm font-medium text-primary-600 hover:text-primary-500">
          Показать всю историю
          <span aria-hidden="true">&rarr;</span>
        </a>
      </CardFooter>
    </Card>
  );
};

export default ActivityFeed;
