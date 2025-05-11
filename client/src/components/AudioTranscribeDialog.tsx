import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Mic, StopCircle, Upload, Check, RefreshCw, FileText, Headphones, Bot } from 'lucide-react';

export interface AudioTranscribeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTranscribe: (transcript: string, processedText?: string) => void;
  meetingId?: number;
}

export function AudioTranscribeDialog({ open, onOpenChange, onTranscribe, meetingId }: AudioTranscribeDialogProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcriptionProvider, setTranscriptionProvider] = useState<'whisper' | 'speechkit'>('whisper');
  const [textProcessingModel, setTextProcessingModel] = useState<'openai' | 'anthropic' | 'vllm' | 'google' | 'huggingface'>('openai');
  const [language, setLanguage] = useState<string>('ru');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState<string>('');
  const [processedText, setProcessedText] = useState<string>('');
  const [processingPhase, setProcessingPhase] = useState<'idle' | 'transcribing' | 'processing' | 'completed'>('idle');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [processingEnabled, setProcessingEnabled] = useState<boolean>(true);
  
  const { toast } = useToast();
  const audioRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Начать запись аудио
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      
      audioRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };
      
      audioRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setRecordedAudio(audioBlob);
        setAudioUrl(audioUrl);
        setAudioFileName(`recorded_audio_${new Date().toISOString()}.wav`);
        
        toast({
          title: "Запись завершена",
          description: `Продолжительность: ${recordingTime} сек. Аудио готово к обработке.`
        });
      };
      
      audioRecorder.current.start();
      setIsRecording(true);
      
      // Запускаем таймер
      let seconds = 0;
      recordingInterval.current = setInterval(() => {
        seconds++;
        setRecordingTime(seconds);
      }, 1000);
      
    } catch (error) {
      console.error('Ошибка при запуске записи:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось запустить запись аудио. Проверьте разрешения микрофона.",
        variant: "destructive"
      });
    }
  };
  
  // Остановить запись аудио
  const stopRecording = () => {
    if (audioRecorder.current && isRecording) {
      audioRecorder.current.stop();
      setIsRecording(false);
      
      // Останавливаем таймер
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
      
      // Останавливаем все дорожки MediaStream
      audioRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };
  
  // Обработка загрузки файла
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Проверка размера файла (25 МБ = 25 * 1024 * 1024 байт)
      if (file.size > 25 * 1024 * 1024) {
        toast({
          title: "Файл слишком большой",
          description: "Максимальный размер файла: 25 МБ",
          variant: "destructive"
        });
        return;
      }
      
      // Проверка типа файла
      if (!file.type.startsWith('audio/')) {
        toast({
          title: "Неподдерживаемый тип файла",
          description: "Загрузите аудиофайл (mp3, wav, m4a и т.д.)",
          variant: "destructive"
        });
        return;
      }
      
      setAudioFile(file);
      setAudioFileName(file.name);
      setAudioUrl(URL.createObjectURL(file));
      
      toast({
        title: "Файл загружен",
        description: `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} МБ)`
      });
    }
  };
  
  // Транскрибация аудио
  const transcribeAudio = async () => {
    const audioToProcess = activeTab === 'upload' ? audioFile : recordedAudio;
    
    if (!audioToProcess) {
      toast({
        title: "Ошибка",
        description: "Сначала загрузите или запишите аудио",
        variant: "destructive"
      });
      return;
    }
    
    setIsTranscribing(true);
    setProcessingPhase('transcribing');
    setProgress(10);
    
    try {
      const formData = new FormData();
      formData.append('audioFile', audioToProcess, audioFileName);
      formData.append('transcriptionProvider', transcriptionProvider);
      formData.append('language', language);
      
      if (processingEnabled) {
        formData.append('textProcessingModel', textProcessingModel);
        
        // Если нужна полная обработка (транскрибация + обработка текста)
        const response = await fetch('/api/process-audio', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`Ошибка при обработке аудио: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Имитируем прогресс
        setProgress(50);
        setTranscript(result.transcript);
        setProcessingPhase('processing');
        
        setTimeout(() => {
          setProgress(100);
          setProcessedText(result.processedText);
          setProcessingPhase('completed');
          
          // Передаем результаты родительскому компоненту
          onTranscribe(result.transcript, result.processedText);
        }, 1000);
        
      } else {
        // Если нужна только транскрибация
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`Ошибка при транскрибации аудио: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Имитируем прогресс
        setProgress(100);
        setTranscript(result.transcript);
        setProcessingPhase('completed');
        
        // Передаем результаты родительскому компоненту
        onTranscribe(result.transcript);
      }
      
      toast({
        title: "Обработка завершена",
        description: "Аудио успешно транскрибировано"
      });
      
    } catch (error) {
      console.error('Ошибка при обработке аудио:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обработать аудио",
        variant: "destructive"
      });
    } finally {
      setIsTranscribing(false);
    }
  };
  
  // Сброс формы
  const resetForm = () => {
    setActiveTab('upload');
    setIsRecording(false);
    setRecordingTime(0);
    setRecordedAudio(null);
    setAudioFile(null);
    setAudioUrl('');
    setAudioFileName('');
    setTranscript('');
    setProcessedText('');
    setProgress(0);
    setProcessingPhase('idle');
    
    // Останавливаем запись, если она идет
    if (isRecording && audioRecorder.current) {
      stopRecording();
    }
  };
  
  const closeDialog = () => {
    resetForm();
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Транскрибация аудио</DialogTitle>
          <DialogDescription>
            Загрузите или запишите аудиофайл для транскрибации. Максимальный размер файла: 25 МБ.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upload' | 'record')} className="mt-4">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="upload">Загрузить файл</TabsTrigger>
            <TabsTrigger value="record">Записать аудио</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="mt-0">
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col gap-4">
                  <Label htmlFor="audio-file">Выберите аудиофайл</Label>
                  <Input 
                    id="audio-file" 
                    type="file" 
                    accept="audio/*" 
                    onChange={handleFileUpload}
                    disabled={isTranscribing} 
                  />
                  
                  {audioUrl && audioFile && (
                    <div className="mt-2">
                      <Label>Предпрослушивание</Label>
                      <audio controls src={audioUrl} className="w-full mt-2">
                        Ваш браузер не поддерживает аудио элемент.
                      </audio>
                      <p className="text-sm text-muted-foreground mt-1">
                        {audioFile.name} ({(audioFile.size / (1024 * 1024)).toFixed(2)} МБ)
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="record" className="mt-0">
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <Label>Запись аудио</Label>
                    <span className="text-sm font-mono">{recordingTime} сек.</span>
                  </div>
                  
                  <div className="flex gap-2">
                    {!isRecording ? (
                      <Button 
                        onClick={startRecording} 
                        disabled={isTranscribing}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Mic className="h-4 w-4 mr-2" />
                        Начать запись
                      </Button>
                    ) : (
                      <Button 
                        onClick={stopRecording} 
                        variant="destructive"
                      >
                        <StopCircle className="h-4 w-4 mr-2" />
                        Остановить
                      </Button>
                    )}
                  </div>
                  
                  {audioUrl && recordedAudio && (
                    <div className="mt-2">
                      <Label>Предпрослушивание</Label>
                      <audio controls src={audioUrl} className="w-full mt-2">
                        Ваш браузер не поддерживает аудио элемент.
                      </audio>
                      <p className="text-sm text-muted-foreground mt-1">
                        Продолжительность: {recordingTime} сек.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label htmlFor="transcription-provider">Провайдер транскрибации</Label>
            <Select
              value={transcriptionProvider}
              onValueChange={(value) => setTranscriptionProvider(value as 'whisper' | 'speechkit')}
              disabled={isTranscribing}
            >
              <SelectTrigger id="transcription-provider">
                <SelectValue placeholder="Выберите провайдера" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whisper">OpenAI Whisper</SelectItem>
                <SelectItem value="speechkit">Yandex SpeechKit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="language">Язык аудио</Label>
            <Select
              value={language}
              onValueChange={setLanguage}
              disabled={isTranscribing}
            >
              <SelectTrigger id="language">
                <SelectValue placeholder="Выберите язык" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">Русский</SelectItem>
                <SelectItem value="kk">Казахский</SelectItem>
                <SelectItem value="en">Английский</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="processing-enabled" className="flex items-center gap-2">
              <input
                id="processing-enabled"
                type="checkbox"
                checked={processingEnabled}
                onChange={(e) => setProcessingEnabled(e.target.checked)}
                disabled={isTranscribing}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              />
              Обработать текст с помощью ИИ
            </Label>
          </div>
          
          {processingEnabled && (
            <div className="mt-4">
              <Label htmlFor="text-processing-model">Модель обработки текста</Label>
              <Select
                value={textProcessingModel}
                onValueChange={(value) => setTextProcessingModel(value as any)}
                disabled={isTranscribing || !processingEnabled}
              >
                <SelectTrigger id="text-processing-model">
                  <SelectValue placeholder="Выберите модель" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                  <SelectItem value="vllm">vLLM (локальная модель)</SelectItem>
                  <SelectItem value="google">Google Gemini</SelectItem>
                  <SelectItem value="huggingface">HuggingFace</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        {processingPhase !== 'idle' && (
          <div className="mt-4">
            <Label>Прогресс обработки</Label>
            <Progress value={progress} className="mt-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{processingPhase === 'transcribing' ? 'Транскрибация...' : 
                    processingPhase === 'processing' ? 'Обработка текста...' : 
                    processingPhase === 'completed' ? 'Завершено' : ''}</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}
        
        {transcript && (
          <div className="mt-4">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Транскрипция
            </Label>
            <Textarea 
              value={transcript} 
              readOnly 
              className="mt-2 h-24 font-mono text-sm"
            />
          </div>
        )}
        
        {processedText && (
          <div className="mt-4">
            <Label className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Обработанный текст
            </Label>
            <Textarea 
              value={processedText} 
              readOnly 
              className="mt-2 h-24"
            />
          </div>
        )}
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="secondary"
            onClick={closeDialog}
            disabled={isTranscribing}
          >
            Отмена
          </Button>
          
          {processingPhase === 'completed' ? (
            <Button
              type="button"
              onClick={() => onTranscribe(transcript, processedText)}
              disabled={isTranscribing}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              <Check className="h-4 w-4 mr-2" />
              Использовать результат
            </Button>
          ) : (
            <Button
              type="button"
              onClick={transcribeAudio}
              disabled={isTranscribing || (!audioFile && !recordedAudio)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              {isTranscribing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Обработка...
                </>
              ) : (
                <>
                  <Headphones className="h-4 w-4 mr-2" />
                  Транскрибировать
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}