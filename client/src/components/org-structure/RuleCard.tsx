import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";

interface RuleCardProps {
  title: string;
  description: string;
  sourceType: string;
  keywords?: string[];
  departmentId: number;
  positionId?: number;
  createdAt: string;
  isActive?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const RuleCard: React.FC<RuleCardProps> = ({
  title,
  description,
  sourceType,
  keywords = [],
  departmentId,
  positionId,
  createdAt,
  isActive = true,
  onEdit,
  onDelete
}) => {
  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="font-bold text-lg">{title}</CardTitle>
            <div className="flex items-center mt-1 text-sm">
              {isActive && <Badge className="mr-2 bg-emerald-600 text-white">Активно</Badge>}
              <span className="text-muted-foreground">ID отдела: {departmentId}</span>
              {positionId && (
                <span className="text-muted-foreground ml-2">ID должности: {positionId}</span>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">{description}</p>
        
        <div className="text-sm mb-3">
          <span className="font-medium">Тип источника:</span> 
          <span className="ml-2">{sourceType}</span>
        </div>
        
        {keywords.length > 0 && (
          <div className="text-sm mb-1">
            <span className="font-medium">Ключевые слова:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {keywords.map((keyword, index) => (
                <Badge key={index} variant="outline">{keyword}</Badge>
              ))}
            </div>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground mt-3">
          Создано: {createdAt}
        </div>
      </CardContent>
    </Card>
  );
};

export default RuleCard;