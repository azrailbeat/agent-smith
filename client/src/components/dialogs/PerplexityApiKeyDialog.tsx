/**
 * Диалог для запроса API ключа Perplexity
 */
import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Key, AlertTriangle } from 'lucide-react';
import { perplexityService } from '@/services/perplexityService';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface PerplexityApiKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PerplexityApiKeyDialog({ 
  isOpen, 
  onClose,
  onSuccess
}: PerplexityApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('llama-3.1-sonar-small-128k-online');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const handleSubmit = async () => {
    if (!apiKey) {
      setError('API ключ обязателен');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await perplexityService.saveApiKey(apiKey, model);
      
      toast({
        title: 'API ключ сохранен',
        description: 'Ключ Perplexity API успешно сохранен',
      });
      
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error saving API key:', err);
      
      setError(
        err.message || 
        'Не удалось сохранить API ключ. Пожалуйста, проверьте правильность ключа.'
      );
      
      toast({
        title: 'Ошибка сохранения',
        description: 'Произошла ошибка при сохранении API ключа',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Key className="mr-2 h-5 w-5" />
            Ключ Perplexity API
          </DialogTitle>
          <DialogDescription>
            Введите ваш API ключ для интеграции с Perplexity AI.
            Ключи можно получить в панели управления <a href="https://perplexity.ai/settings/api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Perplexity</a>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {error && (
            <div className="bg-destructive/10 p-3 rounded-md flex items-start">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mr-2 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="apiKey">API ключ</Label>
            <Input
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="font-mono"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Модель по умолчанию</Label>
            <RadioGroup 
              value={model} 
              onValueChange={setModel}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="llama-3.1-sonar-small-128k-online" id="model-small" />
                <Label htmlFor="model-small" className="font-normal">
                  llama-3.1-sonar-small-128k-online (Стандартная)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="llama-3.1-sonar-large-128k-online" id="model-large" />
                <Label htmlFor="model-large" className="font-normal">
                  llama-3.1-sonar-large-128k-online (Улучшенная)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="llama-3.1-sonar-huge-128k-online" id="model-huge" />
                <Label htmlFor="model-huge" className="font-normal">
                  llama-3.1-sonar-huge-128k-online (Максимальная)
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !apiKey}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}