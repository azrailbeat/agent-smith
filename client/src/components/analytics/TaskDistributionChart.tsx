import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface TaskStatusData {
  name: string;
  Создано: number;
  "В процессе": number;
  "Готово к проверке": number;
  Завершено: number;
  "Требует внимания": number;
}

interface TaskDistributionChartProps {
  data: TaskStatusData[];
}

export function TaskDistributionChart({ data }: TaskDistributionChartProps) {
  const colors = {
    "Создано": "#D9D9D9",
    "В процессе": "#F59E0B",
    "Готово к проверке": "#10B981",
    "Завершено": "#3B82F6",
    "Требует внимания": "#EF4444"
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="flex items-start space-y-0 pb-0">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1.5 8H2.5M13.5 8H14.5M8 1.5V2.5M8 13.5V14.5M3.38 3.38L4.09 4.09M12.62 3.38L11.91 4.09M12.62 12.62L11.91 11.91M3.38 12.62L4.09 11.91" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11 10.5C11 11.8807 9.88071 13 8.5 13C7.11929 13 6 11.8807 6 10.5C6 9.11929 7.11929 8 8.5 8C9.88071 8 11 9.11929 11 10.5Z" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700">Распределение задач по статусам</h3>
            <p className="text-xs text-gray-500">Количество задач в каждом статусе</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[240px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              width={500}
              height={300}
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 0,
                bottom: 5,
              }}
              barSize={40}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Создано" fill={colors["Создано"]} name="Создано" />
              <Bar dataKey="В процессе" fill={colors["В процессе"]} name="В процессе" />
              <Bar dataKey="Готово к проверке" fill={colors["Готово к проверке"]} name="Готово к проверке" />
              <Bar dataKey="Завершено" fill={colors["Завершено"]} name="Завершено" />
              <Bar dataKey="Требует внимания" fill={colors["Требует внимания"]} name="Требует внимания" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default TaskDistributionChart;