import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TaskCheckIcon, CalendarIcon, ActivityIcon, FileIcon } from 'lucide-react';

interface StatItem {
  icon: React.ReactNode;
  title: string;
  value: number;
  color: string;
}

interface StatsCounterProps {
  stats: StatItem[];
}

export function StatsCounter({ stats }: StatsCounterProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="border border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">{stat.title}</span>
              <span className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</span>
            </div>
            <div className={`p-3 rounded-full bg-opacity-20`} style={{ backgroundColor: `${stat.color}20` }}>
              {stat.icon}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default StatsCounter;