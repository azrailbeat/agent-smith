import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Send, RotateCw } from 'lucide-react';

type AnalysisType = 'activity' | 'trends' | 'performance' | 'recommendations';

interface AIAnalysisPanelProps {
  onAnalyze?: (type: AnalysisType, query: string) => Promise<string>;
}

export function AIAnalysisPanel({ onAnalyze }: AIAnalysisPanelProps) {
  const [analysisType, setAnalysisType] = useState<AnalysisType>('activity');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      if (onAnalyze) {
        const response = await onAnalyze(analysisType, query);
        setResult(response);
      } else {
        // Симуляция ответа если нет реального API
        await new Promise(resolve => setTimeout(resolve, 1500));
        setResult(`Анализ ${analysisType} по запросу: ${query}\n\nДля получения реальных результатов настройте OpenAI API в системных настройках.`);
      }
    } catch (error) {
      setResult(`Ошибка при выполнении анализа: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Анализ с помощью ИИ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Select
              value={analysisType}
              onValueChange={(value) => setAnalysisType(value as AnalysisType)}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Тип анализа" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Выберите тип анализа</SelectLabel>
                  <SelectItem value="activity">Анализ активности</SelectItem>
                  <SelectItem value="trends">Анализ трендов</SelectItem>
                  <SelectItem value="performance">Анализ производительности</SelectItem>
                  <SelectItem value="recommendations">Рекомендации по улучшению</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <div className="flex-1 flex gap-2">
              <Textarea 
                placeholder="Введите ваш запрос для анализа данных..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 min-h-[80px]"
              />
              <Button onClick={handleAnalyze} disabled={isLoading || !query.trim()} className="self-end">
                {isLoading ? <RotateCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {result && (
            <Card className="bg-slate-50 border">
              <CardContent className="pt-4 whitespace-pre-line">
                {result}
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Используйте естественный язык для анализа данных системы
      </CardFooter>
    </Card>
  );
}

export default AIAnalysisPanel;