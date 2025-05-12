import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Calendar, 
  Clock, 
  FileText, 
  Users, 
  Database, 
  MoreHorizontal, 
  CheckCircle2, 
  Headphones,
  Bot,
  ListChecks
} from 'lucide-react';

// Типы данных
interface Meeting {
  id: number;
  title: string;
  description?: string;
  date: Date;
  duration: number;
  organizer: string;
  participants: string[];
  status: string;
  protocol?: {
    summary: string;
    decisions: string[];
    tasks: any[];
  };
  blockchainHash?: string;
}

interface TrelloStyleMeetingCardProps {
  meeting: Meeting;
  onClick: () => void;
  draggableProps: any;
  dragHandleProps: any;
  innerRef: React.Ref<HTMLDivElement>;
  isDragging: boolean;
  onTranscribeClick?: (e: React.MouseEvent) => void;
  onViewProtocolClick?: (e: React.MouseEvent) => void;
}

const TrelloStyleMeetingCard: React.FC<TrelloStyleMeetingCardProps> = ({
  meeting,
  onClick,
  draggableProps,
  dragHandleProps,
  innerRef,
  isDragging,
  onTranscribeClick,
  onViewProtocolClick
}) => {
  // Форматирование даты
  const formatDate = (date: Date) => {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.toLocaleDateString('ru-RU');
  };

  // Определяем цвет бордера в зависимости от статуса
  const getStatusBorderColor = () => {
    switch (meeting.status) {
      case 'scheduled': return 'border-l-yellow-400';
      case 'in_progress': return 'border-l-blue-400';
      case 'completed': return 'border-l-green-400';
      case 'cancelled': return 'border-l-red-400';
      default: return 'border-l-gray-300';
    }
  };

  // Получаем иконку статуса
  const getStatusIcon = () => {
    switch (meeting.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'scheduled':
        return <Calendar className="h-4 w-4 text-yellow-500" />;
      case 'cancelled':
        return <CheckCircle2 className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={innerRef}
      {...draggableProps}
      {...dragHandleProps}
      className={`mb-2 bg-white rounded border-l-[3px] ${getStatusBorderColor()} border border-gray-200 ${isDragging ? "shadow-lg rotate-1" : "shadow-sm"} hover:shadow-md transition-all duration-200`}
      onClick={onClick}
    >
      <div className="p-2.5">
        {/* Заголовок встречи */}
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-medium text-xs line-clamp-1 max-w-[75%]">
            {meeting.title || "Без темы"}
          </h4>
          <Badge 
            className="text-[10px] px-1.5 py-0 h-4" 
            variant="outline"
          >
            {meeting.duration} мин
          </Badge>
        </div>
        
        {/* Организатор */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-1">
            {getStatusIcon()}
            <span className="text-xs text-gray-700 font-medium truncate max-w-[90%]">
              {meeting.organizer}
            </span>
          </div>
          <div className="flex-shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full" onClick={e => e.stopPropagation()}>
                  <MoreHorizontal className="h-2.5 w-2.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-1.5" side="bottom" align="end">
                <div className="space-y-1">
                  {/* Меню действий */}
                  <div className="text-[10px] font-bold text-muted-foreground mb-1">Действия</div>
                  {/* Опции */}
                  <div className="grid grid-cols-1 gap-0.5">
                    {onTranscribeClick && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-[10px] h-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTranscribeClick(e);
                        }}
                      >
                        <Headphones className="h-2.5 w-2.5 mr-1.5" />
                        Транскрибировать аудио
                      </Button>
                    )}
                    {onViewProtocolClick && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-[10px] h-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewProtocolClick(e);
                        }}
                      >
                        <FileText className="h-2.5 w-2.5 mr-1.5" />
                        Просмотр протокола
                      </Button>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        {/* Если есть протокол, показываем резюме */}
        {meeting.protocol?.summary && (
          <div className="bg-blue-50 p-1.5 rounded text-[10px] text-blue-800 mb-2 border border-blue-200">
            <div className="font-medium mb-0.5 flex items-center">
              <FileText className="h-2.5 w-2.5 mr-1" /> 
              Протокол:
            </div>
            <div className="line-clamp-2">
              {meeting.protocol.summary}
            </div>
          </div>
        )}
        
        {/* Индикаторы статуса в одну строку */}
        <div className="flex flex-wrap gap-1 mb-2">
          <Badge variant="outline" className="bg-gray-50 text-gray-700 text-[10px] flex items-center px-1 h-4 border-gray-200">
            <Users className="h-2.5 w-2.5 mr-0.5" /> {meeting.participants.length}
          </Badge>
          
          {meeting.protocol?.tasks && meeting.protocol.tasks.length > 0 && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 text-[10px] flex items-center px-1 h-4 border-amber-200">
              <ListChecks className="h-2.5 w-2.5 mr-0.5" /> {meeting.protocol.tasks.length}
            </Badge>
          )}
          
          {meeting.blockchainHash && (
            <Badge variant="outline" className="bg-green-50 text-green-700 text-[10px] flex items-center px-1 h-4 border-green-200">
              <Database className="h-2.5 w-2.5 mr-0.5" /> GovChain
            </Badge>
          )}
        </div>
        
        {/* Футер карточки */}
        <div className="flex justify-between items-center text-[10px] text-gray-500 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <span className="text-gray-400">ID: {meeting.id}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-2.5 w-2.5" />
            {formatDate(meeting.date)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrelloStyleMeetingCard;