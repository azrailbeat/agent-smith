import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, FileText, Globe, Settings, Archive } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

export type RAGSource = {
  id: string;
  name: string;
  type: 'vectordb' | 'database' | 'document' | 'web' | 'internal';
  description: string;
  enabled: boolean;
  metadata?: Record<string, any>;
};

export type RAGConfig = {
  enabled: boolean;
  retrievalStrategy: 'similarity' | 'mmr' | 'hybrid';
  retrievalTopK: number;
  sources: RAGSource[];
  defaultPrompt: string;
};

interface RAGSourceSelectorProps {
  agentId?: number;
  onSave?: (config: RAGConfig) => void;
  defaultConfig?: RAGConfig;
  isGlobal?: boolean;
}

// Иконка в зависимости от типа источника
const getSourceIcon = (type: string) => {
  switch (type) {
    case 'vectordb':
      return <Database className="h-4 w-4 mr-2" />;
    case 'document':
      return <FileText className="h-4 w-4 mr-2" />;
    case 'web':
      return <Globe className="h-4 w-4 mr-2" />;
    case 'internal':
      return <Archive className="h-4 w-4 mr-2" />;
    default:
      return <Database className="h-4 w-4 mr-2" />;
  }
};

// Badge цвет для типа источника
const getSourceBadgeColor = (type: string): string => {
  switch (type) {
    case 'vectordb':
      return 'bg-blue-500';
    case 'document':
      return 'bg-green-500';
    case 'web':
      return 'bg-purple-500';
    case 'internal':
      return 'bg-amber-500';
    default:
      return 'bg-slate-500';
  }
};

const DEFAULT_CONFIG: RAGConfig = {
  enabled: true,
  retrievalStrategy: 'hybrid',
  retrievalTopK: 5,
  sources: [
    {
      id: 'milvus-gov',
      name: 'Государственные документы',
      type: 'vectordb',
      description: 'База государственных документов и НПА',
      enabled: true,
      metadata: {
        collection: 'gov_documents',
        engine: 'milvus'
      }
    },
    {
      id: 'internal-knowledge',
      name: 'Внутренние базы знаний',
      type: 'internal',
      description: 'Внутренние справочники и базы знаний',
      enabled: true,
      metadata: {
        path: '/data/knowledge'
      }
    },
    {
      id: 'document-archive',
      name: 'Архив документов',
      type: 'document',
      description: 'Исторический архив документов и справочников',
      enabled: false,
      metadata: {
        path: '/data/archive'
      }
    },
    {
      id: 'web-sources',
      name: 'Веб-источники',
      type: 'web',
      description: 'Данные из проверенных государственных веб-ресурсов',
      enabled: false,
      metadata: {
        allowedDomains: ['gov.kz', 'egov.kz']
      }
    }
  ],
  defaultPrompt: 'Используйте только данные из проверенных источников для ответа на этот вопрос:'
};

const RAGSourceSelector: React.FC<RAGSourceSelectorProps> = ({
  agentId,
  onSave,
  defaultConfig = DEFAULT_CONFIG,
  isGlobal = false
}) => {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<RAGConfig>(defaultConfig);
  const { toast } = useToast();

  // Подгрузка текущих настроек агента, если указан ID
  const { data: agentData, isLoading: isAgentLoading } = useQuery({
    queryKey: agentId ? ['agent', agentId] : null,
    queryFn: agentId 
      ? async () => {
          const data = await apiRequest<any>(`/api/agents/${agentId}`, { method: 'GET' });
          return data;
        }
      : () => null,
    enabled: !!agentId
  });

  // Загрузка глобальных настроек RAG, если это глобальное диалоговое окно
  const { data: globalRagConfig, isLoading: isGlobalLoading } = useQuery({
    queryKey: isGlobal ? ['rag-config', 'global'] : null,
    queryFn: isGlobal
      ? async () => {
          try {
            const data = await apiRequest<RAGConfig>('/api/system/rag-config', { method: 'GET' });
            return data;
          } catch (error) {
            console.error('Error loading global RAG config:', error);
            return defaultConfig;
          }
        }
      : () => null,
    enabled: isGlobal
  });

  // Загрузка настроек из агента или глобальных настроек
  useEffect(() => {
    if (agentId && agentData?.config?.rag) {
      setConfig(agentData.config.rag);
    } else if (isGlobal && globalRagConfig) {
      setConfig(globalRagConfig);
    }
  }, [agentData, globalRagConfig, agentId, isGlobal]);

  const handleSave = async () => {
    try {
      if (isGlobal) {
        // Сохраняем глобальные настройки RAG
        await apiRequest('/api/system/rag-config', {
          method: 'POST',
          body: JSON.stringify(config)
        });
        toast({
          title: "Настройки RAG сохранены",
          description: "Глобальные настройки RAG обновлены для всех агентов"
        });
      } else if (agentId) {
        // Обновляем настройки конкретного агента
        const updatedAgentData = await apiRequest(`/api/agents/${agentId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            config: {
              ...agentData?.config,
              rag: config
            }
          })
        });
        toast({
          title: "Настройки RAG обновлены",
          description: `Настройки RAG обновлены для агента "${updatedAgentData?.name}"`
        });
      }
      
      // Вызываем колбэк onSave, если он предоставлен
      if (onSave) {
        onSave(config);
      }
      
      setOpen(false);
    } catch (error) {
      console.error('Error saving RAG config:', error);
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить настройки RAG",
        variant: "destructive"
      });
    }
  };

  // Переключение включения/выключения источника
  const toggleSource = (sourceId: string) => {
    setConfig(prev => ({
      ...prev,
      sources: prev.sources.map(source => 
        source.id === sourceId 
          ? { ...source, enabled: !source.enabled } 
          : source
      )
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          {isGlobal ? 'Глобальные настройки RAG' : 'Настройки RAG'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isGlobal ? 'Глобальные настройки RAG' : 'Настройки Retrieval Augmented Generation'}
          </DialogTitle>
          <DialogDescription>
            Настройте источники знаний и параметры извлечения информации для AI-агентов.
            {isGlobal ? ' Эти настройки будут применены ко всем агентам по умолчанию.' : ''}
          </DialogDescription>
        </DialogHeader>
        
        {(isAgentLoading || isGlobalLoading) ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="sources">
            <TabsList className="mb-4">
              <TabsTrigger value="sources">Источники данных</TabsTrigger>
              <TabsTrigger value="settings">Настройки извлечения</TabsTrigger>
              <TabsTrigger value="prompt">Промпт RAG</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sources">
              <div className="space-y-2">
                <div className="flex items-center mb-4">
                  <Switch
                    id="rag-enabled"
                    checked={config.enabled}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
                  />
                  <Label htmlFor="rag-enabled" className="ml-2">
                    Использовать RAG для{isGlobal ? ' всех агентов' : ' этого агента'}
                  </Label>
                </div>
                
                <ScrollArea className="h-[400px] rounded-md border">
                  <div className="p-4 space-y-4">
                    {config.sources.map(source => (
                      <Card key={source.id} className={source.enabled ? "" : "opacity-70"}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center">
                              <Checkbox
                                id={`source-${source.id}`}
                                checked={source.enabled}
                                onCheckedChange={() => toggleSource(source.id)}
                              />
                              <div className="ml-3">
                                <div className="flex items-center">
                                  {getSourceIcon(source.type)}
                                  <span className="font-medium">{source.name}</span>
                                  <Badge className={`ml-2 ${getSourceBadgeColor(source.type)}`}>
                                    {source.type}
                                  </Badge>
                                </div>
                                <CardDescription>{source.description}</CardDescription>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
            
            <TabsContent value="settings">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="retrieval-strategy">Стратегия извлечения данных</Label>
                  <select
                    id="retrieval-strategy"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={config.retrievalStrategy}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      retrievalStrategy: e.target.value as 'similarity' | 'mmr' | 'hybrid' 
                    }))}
                  >
                    <option value="similarity">По схожести (Similarity)</option>
                    <option value="mmr">Максимальная маргинальная релевантность (MMR)</option>
                    <option value="hybrid">Гибридный подход</option>
                  </select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Определяет, как система будет выбирать наиболее релевантные данные
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="retrieval-topk">Количество извлекаемых фрагментов (Top-K)</Label>
                  <Input
                    id="retrieval-topk"
                    type="number"
                    min={1}
                    max={20}
                    value={config.retrievalTopK}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      retrievalTopK: parseInt(e.target.value) || 5
                    }))}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Сколько наиболее релевантных фрагментов данных будет извлекаться для каждого запроса
                  </p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="prompt">
              <div className="space-y-2">
                <Label htmlFor="default-prompt">Промпт для извлечения данных</Label>
                <textarea
                  id="default-prompt"
                  className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2"
                  value={config.defaultPrompt}
                  onChange={(e) => setConfig(prev => ({ ...prev, defaultPrompt: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Этот промпт будет использоваться при обращении к базам знаний через RAG.
                  Агенты будут дополнять его контекстно-зависимыми инструкциями.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
          <Button onClick={handleSave}>Сохранить настройки</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RAGSourceSelector;