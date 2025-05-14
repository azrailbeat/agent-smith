import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TaskStatusProps {
  data: {
    status: string;
    count: number;
    color: string;
  }[];
}

export function TaskStatusChart({ data }: TaskStatusProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">Распределение задач по статусам</CardTitle>
        <p className="text-xs text-gray-500">Количество задач в каждом статусе</p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              width={500}
              height={300}
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Legend />
              {data.map((entry, index) => (
                <Bar 
                  key={`bar-${index}`}
                  dataKey="count" 
                  fill={entry.color} 
                  name={entry.status} 
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default TaskStatusChart;