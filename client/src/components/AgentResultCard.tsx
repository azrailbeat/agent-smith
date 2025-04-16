import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Copy, 
  Cpu, 
  ExternalLink,
  ThumbsDown,
  ThumbsUp,
  Zap,
  FileText,
  Brain,
  BarChart2,
  Stethoscope,
  Scale,
  GraduationCap,
  Truck,
  Tractor,
  Briefcase,
  Globe,
  Flame,
  Construction,
  ShoppingBasket,
  Shield
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface AgentResultData {
  agentId: number;
  agentName: string;
  agentType: string;
  timestamp: string;
  result: {
    summary?: string;
    analysis?: string;
    classification?: string;
    recommendation?: string;
    keyPoints?: string[];
    entities?: Array<{name: string, type: string, value: string}>;
    confidence: number;
    processingTime: number;
    sources?: Array<{title: string, url?: string}>;
  };
  metadata?: Record<string, any>;
}

interface AgentResultCardProps {
  data: AgentResultData;
  expanded?: boolean;
  showHeader?: boolean;
  variant?: "default" | "compact" | "expanded";
  onFeedback?: (feedback: "positive" | "negative") => void;
}

// Иконка агента по типу
const getAgentIcon = (type: string) => {
  switch (type) {
    case "citizen_requests":
      return <Bot className="h-5 w-5 text-blue-500" />;
    case "meeting_protocols":
      return <FileText className="h-5 w-5 text-amber-500" />;
    case "document_processing":
      return <FileText className="h-5 w-5 text-green-600" />;
    case "translator":
      return <Globe className="h-5 w-5 text-green-500" />;
    case "knowledge_base":
      return <Brain className="h-5 w-5 text-indigo-500" />;
    case "legal":
      return <Scale className="h-5 w-5 text-red-600" />;
    case "healthcare":
      return <Stethoscope className="h-5 w-5 text-emerald-500" />;
    case "education":
      return <GraduationCap className="h-5 w-5 text-blue-600" />;
    case "energy":
      return <Flame className="h-5 w-5 text-orange-500" />;
    case "construction":
      return <Construction className="h-5 w-5 text-stone-600" />;
    case "trade":
      return <ShoppingBasket className="h-5 w-5 text-violet-500" />;
    case "agriculture":
      return <Tractor className="h-5 w-5 text-green-600" />;
    case "labor":
      return <Briefcase className="h-5 w-5 text-amber-600" />;
    case "transport":
      return <Truck className="h-5 w-5 text-sky-600" />;
    case "internal_affairs":
      return <Shield className="h-5 w-5 text-blue-700" />;
    default:
      return <Cpu className="h-5 w-5 text-slate-500" />;
  }
};

// Цвет бейджа по уровню уверенности
const getConfidenceBadgeColor = (confidence: number): string => {
  if (confidence >= 0.9) return "bg-green-100 text-green-800";
  if (confidence >= 0.7) return "bg-blue-100 text-blue-800";
  if (confidence >= 0.5) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
};

// Текст уровня уверенности
const getConfidenceText = (confidence: number): string => {
  if (confidence >= 0.9) return "Высокая";
  if (confidence >= 0.7) return "Хорошая";
  if (confidence >= 0.5) return "Средняя";
  return "Низкая";
};

const AgentResultCard: React.FC<AgentResultCardProps> = ({ 
  data, 
  expanded: initialExpanded = false,
  showHeader = true,
  variant = "default",
  onFeedback
}) => {
  const [expanded, setExpanded] = useState(initialExpanded || variant === "expanded");
  const { toast } = useToast();
  
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Скопировано",
        description: "Текст скопирован в буфер обмена"
      });
    });
  };
  
  const handleFeedback = (type: "positive" | "negative") => {
    if (onFeedback) {
      onFeedback(type);
      toast({
        title: type === "positive" ? "Положительный отзыв" : "Отрицательный отзыв",
        description: "Спасибо за отзыв! Это поможет нам улучшить работу AI-агентов.",
      });
    }
  };
  
  // Форматирование времени
  const formattedTime = new Date(data.timestamp).toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return (
    <Card className={variant === "compact" ? "shadow-sm" : "shadow"}>
      {showHeader && (
        <CardHeader className={variant === "compact" ? "p-3" : "p-4"}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {getAgentIcon(data.agentType)}
              <CardTitle className={variant === "compact" ? "text-base" : "text-lg"}>
                {data.agentName}
              </CardTitle>
              <Badge variant="outline">
                {data.agentType}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getConfidenceBadgeColor(data.result.confidence)}>
                <Zap className="h-3 w-3 mr-1" />
                {getConfidenceText(data.result.confidence)}
              </Badge>
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {data.result.processingTime.toFixed(1)}с
              </Badge>
            </div>
          </div>
          <CardDescription className="flex items-center gap-1 text-sm">
            <Clock className="h-3 w-3" />
            {formattedTime}
          </CardDescription>
        </CardHeader>
      )}
      
      <CardContent className={variant === "compact" ? "p-3 pt-0" : "p-4 pt-0"}>
        {data.result.summary && (
          <div className={expanded ? "" : "line-clamp-3"}>
            <p className="text-sm font-medium mb-1">Резюме:</p>
            <p className="text-sm mb-3 whitespace-pre-line">{data.result.summary}</p>
          </div>
        )}
        
        {expanded && (
          <>
            {data.result.classification && (
              <div className="my-3">
                <p className="text-sm font-medium mb-1">Классификация:</p>
                <Badge variant="outline" className="text-sm">
                  {data.result.classification}
                </Badge>
              </div>
            )}
            
            {data.result.analysis && (
              <div className="my-3">
                <p className="text-sm font-medium mb-1">Детальный анализ:</p>
                <ScrollArea className="h-[200px] rounded-md border p-2">
                  <p className="text-sm whitespace-pre-line">{data.result.analysis}</p>
                </ScrollArea>
              </div>
            )}
            
            {data.result.keyPoints && data.result.keyPoints.length > 0 && (
              <div className="my-3">
                <p className="text-sm font-medium mb-1">Ключевые моменты:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {data.result.keyPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {data.result.recommendation && (
              <div className="my-3">
                <p className="text-sm font-medium mb-1">Рекомендация:</p>
                <p className="text-sm p-2 bg-muted rounded-md">{data.result.recommendation}</p>
              </div>
            )}
            
            {data.result.entities && data.result.entities.length > 0 && (
              <div className="my-3">
                <p className="text-sm font-medium mb-1">Обнаруженные сущности:</p>
                <div className="flex flex-wrap gap-2">
                  {data.result.entities.map((entity, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {entity.name}: {entity.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {data.result.sources && data.result.sources.length > 0 && (
              <div className="my-3">
                <p className="text-sm font-medium mb-1">Источники:</p>
                <ul className="text-sm space-y-1">
                  {data.result.sources.map((source, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      {source.url ? (
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center"
                        >
                          {source.title}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      ) : (
                        <span>{source.title}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        
        {!expanded && (data.result.summary?.length || 0) > 150 && (
          <div className="flex justify-center mt-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setExpanded(true)}
              className="text-xs"
            >
              Показать полностью
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
      
      <CardFooter className={variant === "compact" ? "p-3 pt-0" : "p-4 pt-0"}>
        <div className="w-full flex justify-between items-center">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleCopy(data.result.summary || "")}
              className="text-xs"
            >
              <Copy className="h-3 w-3 mr-1" />
              Копировать
            </Button>
            
            {expanded && variant !== "compact" && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setExpanded(false)}
                className="text-xs"
              >
                Свернуть
                <ChevronUp className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
          
          {onFeedback && (
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleFeedback("positive")}
                className="text-xs text-green-600"
              >
                <ThumbsUp className="h-3 w-3 mr-1" />
                Полезно
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleFeedback("negative")}
                className="text-xs text-red-600"
              >
                <ThumbsDown className="h-3 w-3 mr-1" />
                Неточно
              </Button>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default AgentResultCard;