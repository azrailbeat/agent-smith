import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Mic, Upload, Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface AudioTranscribeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTranscribe: (transcript: string, processedText?: string) => void;
  meetingId?: number;
}

export function AudioTranscribeDialog({ open, onOpenChange, onTranscribe, meetingId }: AudioTranscribeDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcriptionProvider, setTranscriptionProvider] = useState('whisper');
  const [useAIProcessing, setUseAIProcessing] = useState(false);
  const [processingModel, setProcessingModel] = useState('openai');
  const [transcript, setTranscript] = useState('');
  const [processedText, setProcessedText] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Функция для выбора файла
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Проверяем тип файла
      if (!file.type.startsWith('audio/')) {
        toast({
          title: "Неподдерживаемый формат",
          description: "Пожалуйста, загрузите аудиофайл",
          variant: "destructive"
        });
        return;
      }

      // Проверяем размер файла (максимум 25 МБ)
      if (file.size > 25 * 1024 * 1024) {
        toast({
          title: "Слишком большой файл",
          description: "Максимальный размер файла - 25 МБ",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  // Запускаем запись с микрофона
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const file = new File([audioBlob], `recording_${Date.now()}.wav`, { type: 'audio/wav' });
        setSelectedFile(file);
        setRecordingStatus('stopped');
        
        // Останавливаем все треки потока
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingStatus('recording');
      setRecordingTime(0);
      
      // Запускаем таймер для отображения времени записи
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Ошибка при доступе к микрофону:', error);
      toast({
        title: "Ошибка доступа к микрофону",
        description: "Пожалуйста, предоставьте доступ к микрофону или используйте загрузку файла",
        variant: "destructive"
      });
    }
  };

  // Останавливаем запись
  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingStatus === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Останавливаем таймер
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // Отображаем время записи в формате MM:SS
  const formatRecordingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Отправляем файл на сервер для транскрибации
  const uploadAndTranscribe = async () => {
    if (!selectedFile) {
      toast({
        title: "Файл не выбран",
        description: "Пожалуйста, выберите аудиофайл для транскрибации",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('audioFile', selectedFile);
      formData.append('transcriptionProvider', transcriptionProvider);
      
      if (meetingId) {
        formData.append('meetingId', meetingId.toString());
      }

      // Если выбрана обработка через ИИ, отправляем на другой эндпоинт
      const endpoint = useAIProcessing ? '/api/process-audio' : '/api/transcribe';
      
      if (useAIProcessing) {
        formData.append('textProcessingModel', processingModel);
      }

      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          
          if (response.success) {
            setTranscript(response.transcript);
            
            if (useAIProcessing && response.processedText) {
              setProcessedText(response.processedText);
              onTranscribe(response.transcript, response.processedText);
            } else {
              onTranscribe(response.transcript);
            }
            
            toast({
              title: "Транскрибация успешна",
              description: useAIProcessing 
                ? "Аудио успешно транскрибировано и обработано" 
                : "Аудио успешно транскрибировано",
              variant: "default"
            });
          } else {
            toast({
              title: "Ошибка",
              description: response.message || "Не удалось обработать аудиофайл",
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "Ошибка сервера",
            description: `Статус: ${xhr.status}`,
            variant: "destructive"
          });
        }
        
        setIsUploading(false);
        onOpenChange(false);
      };

      xhr.onerror = () => {
        toast({
          title: "Ошибка соединения",
          description: "Не удалось подключиться к серверу",
          variant: "destructive"
        });
        setIsUploading(false);
      };

      xhr.open('POST', endpoint, true);
      xhr.send(formData);
      
    } catch (error) {
      console.error('Ошибка при отправке файла:', error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при отправке файла",
        variant: "destructive"
      });
      setIsUploading(false);
    }
  };

  // Очистка при закрытии диалога
  const handleCloseDialog = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setTranscript('');
      setProcessedText('');
      setUploadProgress(0);
      
      // Останавливаем запись, если она активна
      if (isRecording) {
        stopRecording();
      }
      
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseDialog}>
      <DialogContent className="max-w-md md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Транскрибация аудио</DialogTitle>
          <DialogDescription>
            Загрузите аудиофайл или запишите аудио для транскрибации
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Выбор файла */}
          <div className="space-y-2">
            <Label htmlFor="audioFile">Аудиофайл</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="audioFile"
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                disabled={isRecording || isUploading}
                className="flex-1"
                ref={fileInputRef}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRecording || isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Выбрать
              </Button>
            </div>
            {selectedFile && (
              <div className="text-sm text-muted-foreground mt-1 flex items-center">
                <Check className="h-4 w-4 mr-1 text-green-500" /> 
                {selectedFile.name} ({Math.round(selectedFile.size / 1024)} КБ)
              </div>
            )}
          </div>

          {/* Запись с микрофона */}
          <div className="space-y-2">
            <Label>Запись с микрофона</Label>
            <div className="flex items-center space-x-2">
              {!isRecording ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={startRecording}
                  disabled={isUploading}
                  className="w-full"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Начать запись
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={stopRecording}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Остановить запись ({formatRecordingTime(recordingTime)})
                </Button>
              )}
            </div>
          </div>

          {/* Выбор провайдера транскрибации */}
          <div className="space-y-2">
            <Label>Провайдер транскрибации</Label>
            <RadioGroup 
              value={transcriptionProvider} 
              onValueChange={setTranscriptionProvider}
              className="flex space-x-4"
              disabled={isUploading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="whisper" id="whisper" />
                <Label htmlFor="whisper">OpenAI Whisper</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="speechkit" id="speechkit" />
                <Label htmlFor="speechkit">Yandex SpeechKit</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Опция обработки текста через ИИ */}
          <div className="flex items-center space-y-0 space-x-2">
            <Switch
              id="use-ai-processing"
              checked={useAIProcessing}
              onCheckedChange={setUseAIProcessing}
              disabled={isUploading}
            />
            <Label htmlFor="use-ai-processing">Обработать текст с помощью ИИ</Label>
          </div>

          {/* Выбор модели обработки текста (отображается только если включена обработка) */}
          {useAIProcessing && (
            <div className="space-y-2">
              <Label>Модель для обработки текста</Label>
              <RadioGroup 
                value={processingModel} 
                onValueChange={setProcessingModel}
                className="grid grid-cols-2 gap-2"
                disabled={isUploading}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="openai" id="openai" />
                  <Label htmlFor="openai">OpenAI</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="anthropic" id="anthropic" />
                  <Label htmlFor="anthropic">Anthropic Claude</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vllm" id="vllm" />
                  <Label htmlFor="vllm">vLLM</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="huggingface" id="huggingface" />
                  <Label htmlFor="huggingface">HuggingFace</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Прогресс загрузки */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Прогресс</Label>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} max={100} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCloseDialog}
            disabled={isUploading}
          >
            Отмена
          </Button>
          <Button
            type="button"
            onClick={uploadAndTranscribe}
            disabled={!selectedFile || isUploading || isRecording}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Обработка...
              </>
            ) : (
              'Транскрибировать'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}