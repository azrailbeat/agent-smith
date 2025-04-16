import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Settings, 
  Database, 
  Loader2, 
  Check, 
  X, 
  FileQuestion,
  Globe,
  Server,
  FileText,
  Cpu,
  Layers
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface RAGSourceSettings {
  id: string;
  name: string;
  type: 'vectordb' | 'database' | 'document' | 'web' | 'internal';
  description: string;
  enabled: boolean;
  metadata?: Record<string, any>;
}

export interface RAGConfig {
  enabled: boolean;
  retrievalStrategy: 'similarity' | 'mmr' | 'hybrid';
  retrievalTopK: number;
  sources: RAGSourceSettings[];
  defaultPrompt: string;
}

interface RAGSourceSelectorProps {
  isGlobal?: boolean;
  entityId?: number;
  entityType?: 'citizen_request' | 'meeting_protocol' | 'document';
  onSourcesChange?: (sources: RAGSourceSettings[]) => void;
}

// Иконка типа источника
const getSourceIcon = (type: string) => {
  switch (type) {
    case "vectordb":
      return <Layers className="h-5 w-5 text-blue-500" />;
    case "database":
      return <Database className="h-5 w-5 text-green-500" />;
    case "document":
      return <FileText className="h-5 w-5 text-yellow-500" />;
    case "web":
      return <Globe className="h-5 w-5 text-purple-500" />;
    case "internal":
      return <Server className="h-5 w-5 text-indigo-500" />;
    default:
      return <FileQuestion className="h-5 w-5 text-gray-500" />;
  }
};

const RAGSourceSelector: React.FC<RAGSourceSelectorProps> = ({
  isGlobal = false,
  entityId,
  entityType,
  onSourcesChange
}) => {
  const [open, setOpen] = useState(false);
  const [ragConfig, setRagConfig] = useState<RAGConfig>({
    enabled: true,
    retrievalStrategy: 'hybrid',
    retrievalTopK: 5,
    sources: [],
    defaultPrompt: ''
  });
  const { toast } = useToast();

  // Формируем ключ запроса в зависимости от типа (глобальный или для конкретной сущности)
  const getQueryKey = () => {
    if (isGlobal) {
      return ['rag-config', 'global'];
    } else if (entityId && entityType) {
      return ['rag-config', entityType, entityId];
    }
    return null;
  };

  // Загрузка настроек RAG
  const { data: ragData, isLoading } = useQuery({
    queryKey: getQueryKey() as readonly string[],
    queryFn: async () => {
      try {
        let url = '/api/system/rag-config';
        if (!isGlobal && entityId && entityType) {
          url = `/api/system/rag-config/${entityType}/${entityId}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('RAG configuration not found');
        }
        return response.json();
      } catch (error) {
        console.warn('Error loading RAG configuration:', error);
        return null;
      }
    },
    enabled: !!getQueryKey()
  });

  // Мутация для сохранения настроек
  const saveConfigMutation = useMutation({
    mutationFn: async (config: RAGConfig) => {
      let url = '/api/system/rag-config';
      if (!isGlobal && entityId && entityType) {
        url = `/api/system/rag-config/${entityType}/${entityId}`;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save RAG configuration');
      }
      
      return response.json();
    },
    onSuccess: () => {
      if (getQueryKey()) {
        queryClient.invalidateQueries({ queryKey: getQueryKey() as readonly string[] });
      }
      toast({
        title: "Настройки сохранены",
        description: "Конфигурация RAG обновлена"
      });
      
      // Вызываем callback, если передан
      if (onSourcesChange) {
        onSourcesChange(ragConfig.sources);
      }
    },
    onError: () => {
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить настройки RAG",
        variant: "destructive"
      });
    }
  });

  // Инициализация конфигурации при загрузке данных
  useEffect(() => {
    if (ragData) {
      setRagConfig(ragData);
    }
  }, [ragData]);

  // Обработчик переключения активности источника
  const handleSourceToggle = (sourceId: string) => {
    setRagConfig(prevConfig => ({
      ...prevConfig,
      sources: prevConfig.sources.map(source => 
        source.id === sourceId 
          ? { ...source, enabled: !source.enabled } 
          : source
      )
    }));
  };

  // Изменение стратегии извлечения
  const handleStrategyChange = (strategy: 'similarity' | 'mmr' | 'hybrid') => {
    setRagConfig(prevConfig => ({
      ...prevConfig,
      retrievalStrategy: strategy
    }));
  };

  // Изменение количества возвращаемых результатов
  const handleTopKChange = (value: number[]) => {
    setRagConfig(prevConfig => ({
      ...prevConfig,
      retrievalTopK: value[0]
    }));
  };

  // Изменение активности RAG
  const handleEnabledToggle = () => {
    setRagConfig(prevConfig => ({
      ...prevConfig,
      enabled: !prevConfig.enabled
    }));
  };

  // Изменение стандартного промпта
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRagConfig(prevConfig => ({
      ...prevConfig,
      defaultPrompt: e.target.value
    }));
  };

  // Сохранение настроек
  const handleSave = () => {
    saveConfigMutation.mutate(ragConfig);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex gap-2 items-center">
          <Database className="h-4 w-4" />
          <span>Источники RAG</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Настройка источников данных RAG</DialogTitle>
          <DialogDescription>
            Настройте источники данных для улучшения ответов AI-агентов с помощью
            Retrieval Augmented Generation (RAG)
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="rag-enabled" 
                  checked={ragConfig.enabled}
                  onCheckedChange={handleEnabledToggle}
                />
                <Label htmlFor="rag-enabled">Включить RAG</Label>
              </div>
              <Badge 
                variant={ragConfig.enabled ? "default" : "outline"}
                className={ragConfig.enabled ? "bg-green-100 text-green-800" : ""}
              >
                {ragConfig.enabled ? "Включен" : "Отключен"}
              </Badge>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Стратегия извлечения</h4>
              <Select 
                value={ragConfig.retrievalStrategy}
                onValueChange={(value) => handleStrategyChange(value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите стратегию" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="similarity">По схожести</SelectItem>
                  <SelectItem value="mmr">Максимальное разнообразие (MMR)</SelectItem>
                  <SelectItem value="hybrid">Гибридная</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Количество результатов (Top-K)</h4>
                <Badge variant="outline">{ragConfig.retrievalTopK}</Badge>
              </div>
              <Slider 
                defaultValue={[ragConfig.retrievalTopK]} 
                max={20}
                min={1}
                step={1}
                onValueChange={handleTopKChange}
              />
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Стандартный промпт</h4>
              <Textarea 
                placeholder="Стандартный промпт для RAG-запросов"
                value={ragConfig.defaultPrompt}
                onChange={handlePromptChange}
                className="h-20"
              />
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Источники данных</h4>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {ragConfig.sources.map(source => (
                    <Card key={source.id} className={!source.enabled ? "opacity-60" : ""}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getSourceIcon(source.type)}
                          <div className="flex flex-col">
                            <span className="font-medium">{source.name}</span>
                            <span className="text-xs text-muted-foreground">{source.description}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={source.enabled}
                            onCheckedChange={() => handleSourceToggle(source.id)}
                          />
                          <Badge variant={source.enabled ? "default" : "outline"}>
                            {source.enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {ragConfig.sources.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileQuestion className="h-8 w-8 mx-auto mb-2" />
                      <p>Нет доступных источников данных</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
          <Button 
            onClick={handleSave}
            disabled={saveConfigMutation.isPending}
          >
            {saveConfigMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RAGSourceSelector;