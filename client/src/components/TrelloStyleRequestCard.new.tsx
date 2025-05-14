/**
 * Agent Smith Platform - Компонент карточки обращения для Trello-подобного интерфейса
 * 
 * Отображает карточку обращения в kanban-доске с возможностью перетаскивания
 * 
 * @version 1.2.0
 * @since 14.05.2025
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Bot, Calendar, Clock, Tag, Flag, FileText, Database } from 'lucide-react';
import { CitizenRequest } from '@shared/types';

// Extend CitizenRequest type to include optional fields we need
declare module '@shared/types' {
  interface CitizenRequest {
    files?: Array<any>;
  }
}

interface TrelloStyleRequestCardProps {
  request: CitizenRequest;
  onClick: () => void;
}

const TrelloStyleRequestCard: React.FC<TrelloStyleRequestCardProps> = ({ request, onClick }) => {
  // Извлекаем необходимые данные из запроса
  const {
    id,
    subject,
    description,
    fullName,
    priority,
    createdAt,
    updatedAt,
    category,
    aiProcessed,
    aiClassification,
    blockchainHash
  } = request;
  
  // Опциональные поля
  const files = request.files || [];

  // Получить цвет приоритета
  const getPriorityColor = (priority: string): string => {
    const priorityColors: {[key: string]: string} = {
      'low': 'bg-green-500',
      'medium': 'bg-yellow-500',
      'high': 'bg-orange-500',
      'urgent': 'bg-red-500'
    };
    return priorityColors[priority] || 'bg-gray-500';
  };

  // Получить название приоритета
  const getPriorityLabel = (priority: string): string => {
    const priorityLabels: {[key: string]: string} = {
      'low': 'Низкий',
      'medium': 'Средний',
      'high': 'Высокий',
      'urgent': 'Срочный'
    };
    return priorityLabels[priority] || priority;
  };

  // Ограничение длины текста
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Форматирование даты
  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <Card 
      className="w-full mb-3 cursor-pointer border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Заголовок и приоритет */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="font-medium text-sm leading-tight">{truncateText(subject, 60)}</p>
          </div>
          <div className="ml-2 shrink-0">
            <div className={`h-2 w-2 rounded-full ${getPriorityColor(priority)}`} title={getPriorityLabel(priority)}></div>
          </div>
        </div>

        {/* Текст обращения */}
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {truncateText(description || '', 120)}
        </p>

        {/* Категория */}
        {category && (
          <div className="mb-3 flex flex-wrap">
            <Badge variant="outline" className="bg-gray-50 mb-1 truncate max-w-[100%]">
              <Tag className="h-3 w-3 text-gray-400 mr-1" />
              <span className="truncate">{category}</span>
            </Badge>
          </div>
        )}

        {/* ИИ классификация, если есть */}
        {aiClassification && aiProcessed && (
          <div className="mb-3">
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 truncate max-w-[100%]">
              <Bot className="h-3 w-3 mr-1 text-purple-500" />
              <span className="truncate">{aiClassification}</span>
            </Badge>
          </div>
        )}

        {/* Индикаторы обработки */}
        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
          <div className="flex items-center">
            <User className="h-3 w-3 mr-1" />
            <span className="truncate max-w-[120px]">{fullName}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Индикатор блокчейн */}
            {blockchainHash && (
              <div className="flex items-center" title="Сохранено в блокчейн">
                <Database className="h-3 w-3 text-blue-500" />
              </div>
            )}
            
            {/* Индикатор ИИ обработки */}
            {aiProcessed && (
              <div className="flex items-center" title="Обработано ИИ">
                <Bot className="h-3 w-3 text-purple-500" />
              </div>
            )}
            
            {/* Индикатор файлов */}
            {files && files.length > 0 && (
              <div className="flex items-center" title={`Прикреплено файлов: ${files.length}`}>
                <FileText className="h-3 w-3 text-gray-500" />
              </div>
            )}
            
            <div className="flex items-center">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className="ml-1">{formatDate(createdAt)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrelloStyleRequestCard;