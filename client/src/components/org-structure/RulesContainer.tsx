import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import RuleCard from './RuleCard';

interface Rule {
  id: number;
  name: string;
  description: string;
  departmentId: number;
  positionId: number | null;
  priority: number;
}

interface Department {
  id: number;
  name: string;
}

interface Position {
  id: number;
  name: string;
  departmentId: number;
}

interface RulesContainerProps {
  onAddRule: () => void;
}

const RulesContainer: React.FC<RulesContainerProps> = ({ onAddRule }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Загрузка правил с сервера
  const { data: rules = [], isLoading: isLoadingRules } = useQuery({
    queryKey: ['/api/org-structure/rules'],
    initialData: [
      {
        id: 1,
        name: 'Запросы по ИТ-поддержке',
        description: 'Распределение запросов, связанных с технической поддержкой',
        departmentId: 3,
        positionId: null,
        priority: 80
      },
      {
        id: 2,
        name: 'Юридические вопросы',
        description: 'Распределение запросов по правовым вопросам',
        departmentId: 5,
        positionId: null,
        priority: 75
      },
      {
        id: 3,
        name: 'Кадровые вопросы',
        description: 'Распределение запросов по трудоустройству и кадровой работе',
        departmentId: 4,
        positionId: null,
        priority: 70
      }
    ]
  });
  
  // Загрузка отделов
  const { data: departments = [], isLoading: isLoadingDepts } = useQuery({
    queryKey: ['/api/departments'],
    initialData: [
      { id: 1, name: 'Руководство' },
      { id: 2, name: 'Канцелярия' },
      { id: 3, name: 'ИТ отдел' },
      { id: 4, name: 'Отдел кадров' },
      { id: 5, name: 'Юридический отдел' }
    ]
  });
  
  // Загрузка должностей
  const { data: positions = [], isLoading: isLoadingPositions } = useQuery({
    queryKey: ['/api/positions'],
    initialData: [
      { id: 1, name: 'Директор', departmentId: 1 },
      { id: 2, name: 'Заместитель директора', departmentId: 1 },
      { id: 3, name: 'Руководитель ИТ отдела', departmentId: 3 },
      { id: 4, name: 'Инженер', departmentId: 3 },
      { id: 5, name: 'Юрист', departmentId: 5 }
    ]
  });
  
  // Фильтрация правил по поисковому запросу
  const filteredRules = searchTerm 
    ? rules.filter(rule => 
        rule.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        rule.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : rules;

  const handleEditRule = (id: number) => {
    console.log(`Редактирование правила с ID: ${id}`);
    // Здесь будет логика редактирования
  };

  const handleDeleteRule = (id: number) => {
    console.log(`Удаление правила с ID: ${id}`);
    // Здесь будет логика удаления
  };
  
  // Получение имени отдела по ID
  const getDepartmentName = (departmentId: number): string => {
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : 'Отдел не найден';
  };
  
  // Получение имени должности по ID
  const getPositionName = (positionId: number | null): string | undefined => {
    if (!positionId) return undefined;
    const position = positions.find(p => p.id === positionId);
    return position ? position.name : undefined;
  };
  
  const isLoading = isLoadingRules || isLoadingDepts || isLoadingPositions;

  return (
    <div>
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Поиск правил..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">Правила не найдены</p>
          <Button onClick={onAddRule} variant="link" className="mt-2">
            Создать правило
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {filteredRules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              departmentName={getDepartmentName(rule.departmentId)}
              positionName={getPositionName(rule.positionId)}
              onEdit={handleEditRule}
              onDelete={handleDeleteRule}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RulesContainer;