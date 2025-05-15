import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import RuleCard from './RuleCard';

interface Rule {
  id: number;
  title: string;
  description: string;
  departmentId: number;
  positionId?: number | null;
  sourceType: string;
  keywords: string[];
  createdAt: string;
  isActive: boolean;
}

interface RulesContainerProps {
  onAddRule: () => void;
}

const RulesContainer: React.FC<RulesContainerProps> = ({ onAddRule }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Загрузка правил с сервера
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['/api/org-structure/rules'],
    initialData: [
      {
        id: 1,
        title: 'Запросы по ИТ-поддержке',
        description: 'Распределение запросов, связанных с технической поддержкой',
        departmentId: 3,
        positionId: null,
        sourceType: 'Обращение гражданина',
        keywords: ['ит', 'техподдержка', 'компьютер', 'принтер'],
        createdAt: '05.05.2025',
        isActive: true
      },
      {
        id: 2,
        title: 'Юридические вопросы',
        description: 'Распределение запросов по правовым вопросам',
        departmentId: 5,
        positionId: null,
        sourceType: 'Обращение гражданина',
        keywords: ['закон', 'документ', 'право', 'юрист'],
        createdAt: '05.05.2025',
        isActive: true
      },
      {
        id: 3,
        title: 'Кадровые вопросы',
        description: 'Распределение запросов по трудоустройству и кадровой работе',
        departmentId: 4,
        positionId: null,
        sourceType: 'Обращение гражданина',
        keywords: ['работа', 'кадры', 'сотрудник', 'зарплата'],
        createdAt: '05.05.2025',
        isActive: true
      }
    ]
  });
  
  // Фильтрация правил по поисковому запросу
  const filteredRules = searchTerm 
    ? rules.filter(rule => 
        rule.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        rule.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()))
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRules.map((rule) => (
            <RuleCard
              key={rule.id}
              title={rule.title}
              description={rule.description}
              departmentId={rule.departmentId}
              positionId={rule.positionId || undefined}
              sourceType={rule.sourceType}
              keywords={rule.keywords}
              createdAt={rule.createdAt}
              isActive={rule.isActive}
              onEdit={() => handleEditRule(rule.id)}
              onDelete={() => handleDeleteRule(rule.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RulesContainer;