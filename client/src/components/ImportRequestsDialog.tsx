import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Info,
  Upload,
  HelpCircle,
  RefreshCw
} from 'lucide-react';

interface ImportRequestsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  errors: number;
  requests: Array<{
    id: number;
    subject: string;
    status: 'created' | 'updated';
  }>;
  errorDetails: Array<{
    data: any;
    error: string;
  }>;
}

const ImportRequestsDialog: React.FC<ImportRequestsDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Мутация для загрузки файла с обращениями
  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Начинаем отслеживать прогресс загрузки
      let progressInterval: ReturnType<typeof setInterval> | undefined;
      
      try {
        // Имитируем прогресс загрузки
        progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            // Ограничиваем максимальный прогресс до 95%, чтобы показать, что процесс не завершен
            return prev < 95 ? prev + 5 : prev;
          });
        }, 300);
        
        // Создаем объект запроса вручную, а не через apiRequest
        console.log('Отправка запроса на импорт файла...');
        const response = await fetch('/api/citizen-requests/import-from-file', {
          method: 'POST',
          body: formData,
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            // Не устанавливаем Content-Type для multipart/form-data, 
            // браузер это сделает автоматически с правильной границей (boundary)
          }
        });
        
        // Останавливаем интервал прогресса
        if (progressInterval) clearInterval(progressInterval);
        
        // Завершаем прогресс
        setUploadProgress(100);
        
        if (!response.ok) {
          let errorMessage = 'Ошибка при импорте обращений';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // Если не удалось распарсить JSON, используем текст ответа
            errorMessage = await response.text() || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        const result = await response.json();
        return result as ImportResult;
      } catch (error) {
        // Также останавливаем интервал в случае ошибки
        if (progressInterval) clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Обновляем UI с результатами импорта
      setImportStatus('success');
      setImportResult(data);
      
      // Обновляем список обращений
      queryClient.invalidateQueries({ queryKey: ['/api/citizen-requests'] });
      
      // Показываем уведомление
      toast({
        title: 'Импорт завершен',
        description: `Успешно импортировано ${data.imported} из ${data.total} обращений.`,
      });
    },
    onError: (error) => {
      console.error('Ошибка импорта:', error);
      setImportStatus('error');
      setUploadError(error instanceof Error ? error.message : 'Неизвестная ошибка импорта');
      
      toast({
        title: 'Ошибка импорта',
        description: error instanceof Error ? error.message : 'Не удалось импортировать обращения',
        variant: 'destructive',
      });
    },
  });

  // Обработка загрузки файла
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    
    // Сбрасываем состояние импорта при выборе нового файла
    if (file) {
      setImportStatus('idle');
      setUploadProgress(0);
      setImportResult(null);
      setUploadError(null);
    }
  };

  // Запуск импорта
  const handleImport = () => {
    if (!selectedFile) {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, выберите файл для импорта',
        variant: 'destructive',
      });
      return;
    }
    
    // Устанавливаем состояние загрузки
    setImportStatus('uploading');
    setUploadProgress(0);
    setUploadError(null);
    
    // Создаем FormData для отправки файла
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    // Запускаем мутацию
    importMutation.mutate(formData);
  };

  // Сброс состояния при закрытии диалога
  const handleClose = () => {
    onClose();
    
    // Сбрасываем состояние только после закрытия для лучшего UX
    setTimeout(() => {
      setSelectedFile(null);
      setImportStatus('idle');
      setUploadProgress(0);
      setImportResult(null);
      setUploadError(null);
      
      // Очищаем input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 200);
  };

  const resetImport = () => {
    setSelectedFile(null);
    setImportStatus('idle');
    setUploadProgress(0);
    setImportResult(null);
    setUploadError(null);
    
    // Очищаем input file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Импорт обращений из файла
          </DialogTitle>
          <DialogDescription>
            Загрузите файл CSV или Excel с данными обращений граждан для импорта в систему.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {importStatus === 'idle' && (
            <>
              <div className="grid gap-4">
                <Label htmlFor="file" className="text-lg">Выберите файл</Label>
                <div className="flex items-center gap-2">
                  <Input
                    ref={fileInputRef}
                    id="file"
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-4 w-4" />
                  Поддерживаемые форматы: CSV, Excel (.xls, .xlsx)
                </div>
              </div>
              
              <div className="rounded-md bg-blue-50 p-4 mt-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Рекомендации по подготовке файла</h4>
                    <div className="mt-1 text-xs text-blue-700">
                      <p>1. Файл должен содержать заголовки столбцов в первой строке.</p>
                      <p>2. Рекомендуемые столбцы: ФИО, Контакт, Тип, Тема, Описание, Регион, Категория.</p>
                      <p>3. <strong>Важно:</strong> Для корректной работы файл должен содержать столбец "Срок" или "Deadline".</p>
                      <p>4. Система автоматически сопоставит столбцы с полями обращений.</p>
                      <p>5. При наличии столбца 'ID' или 'ExternalId', система будет проверять обращения на дубликаты.</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {importStatus === 'uploading' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Импорт обращений...</span>
              </div>
              <Progress value={uploadProgress} className="h-2 w-full" />
              <p className="text-sm text-muted-foreground">
                Пожалуйста, не закрывайте это окно до завершения импорта.
              </p>
            </div>
          )}

          {importStatus === 'error' && (
            <div className="rounded-md bg-destructive/10 p-4 my-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-destructive">Ошибка импорта</h4>
                  <p className="mt-1 text-sm text-destructive/90">{uploadError}</p>
                </div>
              </div>
            </div>
          )}

          {importStatus === 'success' && importResult && (
            <div className="space-y-4">
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-green-800">Импорт успешно завершен</h4>
                    <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                      <div className="bg-white rounded-md p-2 text-center">
                        <p className="text-muted-foreground">Всего записей</p>
                        <p className="text-xl font-semibold">{importResult.total}</p>
                      </div>
                      <div className="bg-white rounded-md p-2 text-center">
                        <p className="text-muted-foreground">Импортировано</p>
                        <p className="text-xl font-semibold text-green-600">{importResult.imported}</p>
                      </div>
                      <div className="bg-white rounded-md p-2 text-center">
                        <p className="text-muted-foreground">Ошибок</p>
                        <p className="text-xl font-semibold text-red-600">{importResult.errors}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="results">
                  <AccordionTrigger>
                    Результаты импорта ({importResult.requests.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    {importResult.requests.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Тема</TableHead>
                            <TableHead>Статус</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResult.requests.map((req) => (
                            <TableRow key={req.id}>
                              <TableCell>{req.id}</TableCell>
                              <TableCell>{req.subject}</TableCell>
                              <TableCell>
                                {req.status === 'created' ? (
                                  <span className="text-green-600 flex items-center gap-1">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Создано
                                  </span>
                                ) : (
                                  <span className="text-blue-600 flex items-center gap-1">
                                    <RefreshCw className="h-4 w-4" />
                                    Обновлено
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">Нет импортированных записей</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
                
                {importResult.errors > 0 && (
                  <AccordionItem value="errors">
                    <AccordionTrigger className="text-destructive">
                      Ошибки импорта ({importResult.errors})
                    </AccordionTrigger>
                    <AccordionContent>
                      {importResult.errorDetails.map((error, index) => (
                        <div key={index} className="rounded-md bg-destructive/10 p-3 mb-2">
                          <p className="text-sm font-medium text-destructive">{error.error}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Данные: {JSON.stringify(error.data)}
                          </p>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {importStatus === 'idle' && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Отмена
              </Button>
              <Button 
                type="button"
                onClick={handleImport}
                disabled={!selectedFile}
                className="flex items-center gap-1.5"
              >
                <Upload className="h-4 w-4" />
                Импортировать
              </Button>
            </>
          )}
          
          {importStatus === 'uploading' && (
            <Button
              variant="outline"
              disabled
            >
              Идет импорт...
            </Button>
          )}
          
          {(importStatus === 'success' || importStatus === 'error') && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Закрыть
              </Button>
              <Button 
                type="button"
                onClick={resetImport}
                variant="secondary"
                className="flex items-center gap-1.5"
              >
                <RefreshCw className="h-4 w-4" />
                Импортировать другой файл
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportRequestsDialog;