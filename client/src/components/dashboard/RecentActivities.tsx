import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ActivityItem {
  id: number;
  type: string;
  title: string;
  timeAgo: string;
  icon?: React.ReactNode;
}

interface RecentActivitiesProps {
  activities: ActivityItem[];
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Недавняя активность</CardTitle>
        <p className="text-xs text-muted-foreground">Из журнала взаимодействия с административных запросов</p>
      </CardHeader>
      <CardContent className="px-6">
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <Avatar className="h-8 w-8 bg-gray-200 border border-gray-300">
                <AvatarFallback>{activity.id % 10}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-sm">{activity.title}</p>
                <p className="text-xs text-muted-foreground">{activity.timeAgo}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-2 pb-4">
        <Button variant="link" className="px-0 text-sm font-normal" size="sm">
          Показать всю историю→
        </Button>
      </CardFooter>
    </Card>
  );
}

export default RecentActivities;