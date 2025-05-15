import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, BookOpen, ScaleIcon } from 'lucide-react';

interface RuleCardProps {
  rule: {
    id: number;
    name: string;
    description: string;
    departmentId: number;
    positionId: number | null;
    priority: number;
  };
  departmentName: string;
  positionName?: string;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const RuleCard: React.FC<RuleCardProps> = ({
  rule,
  departmentName,
  positionName,
  onEdit,
  onDelete,
}) => {
  return (
    <Card className="mb-4 overflow-hidden border-l-4 border-l-amber-400">
      <CardHeader className="pb-2">
        <CardTitle className="text-md flex items-center justify-between">
          <div className="flex items-center">
            <ScaleIcon className="h-5 w-5 mr-2 text-amber-500" />
            <span>{rule.name}</span>
          </div>
          <Badge variant="outline" className="ml-auto">
            Приоритет: {rule.priority}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-muted-foreground text-sm">{rule.description}</p>
        
        <div className="mt-4 space-y-2">
          <div className="flex items-center text-xs">
            <BookOpen className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <span className="text-muted-foreground">Применимо к:</span>
          </div>
          
          <div className="pl-5 space-y-1">
            <Badge variant="secondary" className="mr-2">
              {departmentName}
            </Badge>
            
            {positionName && (
              <Badge variant="outline" className="bg-secondary/50">
                {positionName}
              </Badge>
            )}
            
            {!positionName && (
              <Badge variant="outline" className="text-muted-foreground">
                Все должности
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <div className="flex justify-end space-x-2 w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(rule.id)}
            className="h-8"
          >
            <Edit className="h-3.5 w-3.5 mr-1" />
            Редактировать
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(rule.id)}
            className="h-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Удалить
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default RuleCard;