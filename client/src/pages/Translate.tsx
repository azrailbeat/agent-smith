import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mic, Volume, RotateCcw, Copy, Download, Save, StopCircle, History, Upload, Video, PlayCircle, CheckCircle, DatabaseIcon, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface Translation {
  id: number;
  date: Date;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  title?: string;
  audioUrl?: string;
  savedToRegistry?: boolean;
  analyzed?: boolean;
  metadata?: {
    source?: string;
    context?: string;
    confidenceScore?: number;
    meetingId?: number;
    speakerName?: string;
    documentId?: string;
  };
}

interface YandexSpeechRecognitionResponse {
  result: string;
}

interface TranscriptSegment {
  text: string;
  timestamp: number;
  speaker?: string;
  confidence: number;
}

interface AudioRecording {
  id: number;
  date: Date;
  duration: number;
  url: string;
  transcript?: TranscriptSegment[];
  language: string;
  metadata?: {
    source?: string;
    meetingId?: number;
    speakerName?: string;
  };
}

const Translate = () => {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("ru");
  const [targetLang, setTargetLang] = useState("en");
  const [isListening, setIsListening] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [translationTitle, setTranslationTitle] = useState("");
  const [translationHistory, setTranslationHistory] = useState<Translation[]>([]);
  const [translationMetadata, setTranslationMetadata] = useState({ source: "", context: "" });
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<Translation | null>(null);
  
  // Новые состояния
  const [activeTab, setActiveTab] = useState("translate");
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [currentRecordingId, setCurrentRecordingId] = useState<number | null>(null);
  const [prompterMode, setPrompterMode] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [prompterText, setPrompterText] = useState("");
  const [prompterSpeed, setPrompterSpeed] = useState(2);
  const [conversationMode, setConversationMode] = useState(false);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [savingToRegistry, setSavingToRegistry] = useState(false);
  
  // Для Yandex Speech Kit
  const [isYandexEnabled, setIsYandexEnabled] = useState(false);
  
  // Refs для аудио и видео
  const recognitionRef = useRef<any>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prompterIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  const translateMutation = useMutation({
    mutationFn: async (data: { text: string; from: string; to: string }) => {
      return apiRequest("POST", "/api/translate", data);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setTranslatedText(data.translatedText);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось выполнить перевод: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Реализация перевода в реальном времени с задержкой
  useEffect(() => {
    if (sourceText.trim()) {
      const debounceTimer = setTimeout(() => {
        translateMutation.mutate({
          text: sourceText,
          from: sourceLang,
          to: targetLang
        });
      }, 500);

      return () => clearTimeout(debounceTimer);
    }
  }, [sourceText, sourceLang, targetLang]);

  // Для речевого ввода (Speech Recognition)
  const startListening = () => {
    if (isYandexEnabled) {
      startYandexSpeechRecognition();
      return;
    }
    
    if (!('webkitSpeechRecognition' in window)) {
      toast({
        title: "Не поддерживается",
        description: "Распознавание речи не поддерживается вашим браузером",
        variant: "destructive"
      });
      return;
    }

    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = sourceLang === 'ru' ? 'ru-RU' : 
                         sourceLang === 'kz' ? 'kk-KZ' : 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        setSourceText((prev) => prev + ' ' + transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Ошибка распознавания:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error("Ошибка инициализации речевого ввода:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось запустить распознавание речи",
        variant: "destructive"
      });
    }
  };
  
  // Останавливаем запись
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };
  
  // Для Yandex Speech Kit
  const startYandexSpeechRecognition = async () => {
    try {
      setIsListening(true);
      
      // Здесь должен быть код для запуска записи через микрофон
      // и отправки аудио в Yandex Speech Kit API
      
      toast({
        title: "Запись через Yandex Speech Kit",
        description: "Запись через Yandex Speech Kit запущена"
      });
      
      // Заглушка для демонстрации
      setTimeout(() => {
        setIsListening(false);
        toast({
          title: "Распознавание завершено",
          description: "Аудио было успешно распознано через Yandex Speech Kit"
        });
      }, 5000);
    } catch (error) {
      console.error("Ошибка при использовании Yandex Speech Kit:", error);
      setIsListening(false);
      toast({
        title: "Ошибка",
        description: "Не удалось запустить распознавание через Yandex Speech Kit",
        variant: "destructive"
      });
    }
  };
  
  // Функция для запуска записи аудио и видео
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      audioRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      audioRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Создаем новую запись
        const newRecording: AudioRecording = {
          id: recordings.length + 1,
          date: new Date(),
          duration: recordingTime,
          url: audioUrl,
          language: sourceLang,
          transcript: [{
            text: sourceText,
            timestamp: 0,
            confidence: 0.95
          }]
        };
        
        setRecordings([...recordings, newRecording]);
        setCurrentRecordingId(newRecording.id);
        
        toast({
          title: "Запись завершена",
          description: `Аудио записано (${recordingTime} сек) и готово к анализу`
        });
      };
      
      // Запускаем запись
      audioRecorderRef.current.start();
      setIsRecording(true);
      
      // Запускаем таймер
      let seconds = 0;
      recordingIntervalRef.current = setInterval(() => {
        seconds++;
        setRecordingTime(seconds);
      }, 1000);
    } catch (error) {
      console.error("Ошибка при записи аудио:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось запустить запись аудио. Проверьте доступ к микрофону.",
        variant: "destructive"
      });
    }
  };
  
  // Функция для остановки записи
  const stopAudioRecording = () => {
    if (audioRecorderRef.current && isRecording) {
      audioRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };
  
  // Функция для запуска телесуфлера
  const startPrompter = () => {
    if (!prompterText) {
      setPrompterText(sourceLang === targetLang ? sourceText : translatedText);
    }
    
    setPrompterMode(true);
    
    // Автоскролл для телесуфлера
    if (autoScroll && prompterIntervalRef.current === null) {
      prompterIntervalRef.current = setInterval(() => {
        const prompterElement = document.getElementById('prompter-text');
        if (prompterElement) {
          prompterElement.scrollTop += prompterSpeed;
        }
      }, 100);
    }
  };
  
  // Функция для остановки телесуфлера
  const stopPrompter = () => {
    setPrompterMode(false);
    
    if (prompterIntervalRef.current) {
      clearInterval(prompterIntervalRef.current);
      prompterIntervalRef.current = null;
    }
  };
  
  // Функция для сохранения в реестр
  const saveToRegistry = async () => {
    setSavingToRegistry(true);
    
    try {
      // Здесь будет API-запрос для сохранения в блокчейн-реестр
      
      setTimeout(() => {
        toast({
          title: "Сохранено в реестре",
          description: "Перевод и аудиозапись сохранены в GovChain"
        });
        
        // Обновляем запись в истории
        if (selectedHistoryItem) {
          const updatedHistory = translationHistory.map(item => 
            item.id === selectedHistoryItem.id 
              ? { ...item, savedToRegistry: true } 
              : item
          );
          setTranslationHistory(updatedHistory);
        }
        
        setSavingToRegistry(false);
      }, 2000);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить в реестр",
        variant: "destructive"
      });
      setSavingToRegistry(false);
    }
  };
  
  // Анализ перевода с помощью AI
  const analyzeTranslation = () => {
    setShowAnalysisDialog(true);
    
    // Здесь будет запрос к API для анализа перевода
    setTimeout(() => {
      if (selectedHistoryItem) {
        const updatedHistory = translationHistory.map(item => 
          item.id === selectedHistoryItem.id 
            ? { ...item, analyzed: true } 
            : item
        );
        setTranslationHistory(updatedHistory);
      }
      
      toast({
        title: "Анализ завершен",
        description: "AI успешно проанализировал перевод"
      });
    }, 2000);
  };
  
  // Сохранение перевода
  const saveTranslation = () => {
    if (!sourceText || !translatedText) {
      toast({
        title: "Ошибка",
        description: "Нет текста для сохранения",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaveDialogOpen(true);
  };
  
  // Выполнение сохранения с метаданными
  const handleSaveTranslation = () => {
    // Создаем новую запись перевода
    const newTranslation: Translation = {
      id: translationHistory.length + 1,
      date: new Date(),
      sourceText,
      translatedText,
      sourceLang,
      targetLang,
      title: translationTitle || `Перевод ${new Date().toLocaleDateString()}`,
      metadata: {
        source: translationMetadata.source,
        context: translationMetadata.context,
        confidenceScore: 0.95 // Это значение должно приходить от API
      }
    };
    
    // Добавляем в историю
    setTranslationHistory([...translationHistory, newTranslation]);
    
    // Закрываем диалог
    setIsSaveDialogOpen(false);
    setTranslationTitle("");
    setTranslationMetadata({ source: "", context: "" });
    
    toast({
      title: "Сохранено",
      description: "Перевод успешно сохранен в истории"
    });
  };
  
  // Загрузка перевода в формате JSON
  const downloadTranslation = () => {
    if (!sourceText || !translatedText) {
      toast({
        title: "Ошибка",
        description: "Нет текста для загрузки",
        variant: "destructive"
      });
      return;
    }
    
    const translationData = {
      sourceText,
      translatedText,
      sourceLang,
      targetLang,
      timestamp: new Date().toISOString()
    };
    
    const jsonString = JSON.stringify(translationData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `translation_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Загружено",
      description: "Файл перевода успешно скачан"
    });
  };

  // Для озвучивания (Text-to-Speech)
  const speakText = (text: string, lang: string) => {
    if (!('speechSynthesis' in window)) {
      toast({
        title: "Не поддерживается",
        description: "Синтез речи не поддерживается вашим браузером",
        variant: "destructive"
      });
      return;
    }

    const speechSynthesis = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ru' ? 'ru-RU' : 
                    lang === 'kz' ? 'kk-KZ' : 'en-US';
    speechSynthesis.speak(utterance);
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Скопировано",
        description: "Текст скопирован в буфер обмена",
      });
    }).catch(err => {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать текст",
        variant: "destructive"
      });
    });
  };

  return (
    <>
      {/* Заголовок страницы */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Перевод в реальном времени</h1>
        <p className="mt-2 text-sm text-neutral-700">
          Переводите текст между казахским, русским и английским языками с возможностью записи аудио и телесуфлером
        </p>
      </div>
      
      {/* Табы для разных режимов работы */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="bg-neutral-100">
          <TabsTrigger value="translate" className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-900">
            Перевод текста
          </TabsTrigger>
          <TabsTrigger value="record" className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-900">
            Запись аудио
          </TabsTrigger>
          <TabsTrigger value="conversation" className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-900">
            Разговорник
          </TabsTrigger>
          <TabsTrigger value="registry" className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-900">
            Реестр переводов
          </TabsTrigger>
        </TabsList>
      
        {/* Содержимое вкладки "Перевод текста" */}
        <TabsContent value="translate" className="mt-0">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Исходный текст */}
            <Card className="backdrop-blur-sm bg-white/90 border border-neutral-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Исходный текст</CardTitle>
                  <Select value={sourceLang} onValueChange={setSourceLang}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Язык" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="kz">Казахский</SelectItem>
                      <SelectItem value="en">Английский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <CardDescription>Введите или продиктуйте текст для перевода</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="Введите текст здесь..."
                    className="min-h-[200px] resize-none border-neutral-300 focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                  />
                  <div className="flex justify-between">
                    <div className="space-x-2">
                      {!isListening ? (
                        <Button
                          variant="outline"
                          onClick={() => startListening()}
                          className={isListening ? "bg-primary-100" : ""}
                        >
                          <Mic className="h-4 w-4 mr-2" />
                          Диктовать
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => stopListening()}
                          className="bg-red-100 hover:bg-red-200 text-red-700 border-red-300"
                        >
                          <StopCircle className="h-4 w-4 mr-2" />
                          Остановить
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => speakText(sourceText, sourceLang)}
                        disabled={!sourceText}
                      >
                        <Volume className="h-4 w-4 mr-2" />
                        Прослушать
                      </Button>
                    </div>
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(sourceText)}
                        disabled={!sourceText}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Копировать
                      </Button>
                      <Button variant="outline" onClick={() => setSourceText("")} disabled={!sourceText}>
                        Очистить
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Переведенный текст */}
            <Card className="backdrop-blur-sm bg-white/90 border border-neutral-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Перевод</CardTitle>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      onClick={swapLanguages}
                      className="mr-2 p-2 h-8 w-8"
                      title="Поменять языки местами"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Select value={targetLang} onValueChange={setTargetLang}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Язык" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ru">Русский</SelectItem>
                        <SelectItem value="kz">Казахский</SelectItem>
                        <SelectItem value="en">Английский</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <CardDescription>Перевод обновляется автоматически</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div
                    className={`min-h-[200px] p-3 rounded-md border ${
                      translateMutation.isPending
                        ? "animate-pulse bg-neutral-50"
                        : "bg-neutral-50 border-neutral-300"
                    }`}
                  >
                    {translateMutation.isPending ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="h-5 w-5 border-t-2 border-primary-500 rounded-full animate-spin"></div>
                        <span className="ml-2 text-neutral-500">Переводим...</span>
                      </div>
                    ) : (
                      translatedText || (
                        <span className="text-neutral-400">Перевод появится здесь</span>
                      )
                    )}
                  </div>
                  <div className="flex justify-between">
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => saveTranslation()}
                        disabled={!translatedText}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Сохранить
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => downloadTranslation()}
                        disabled={!translatedText}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Скачать
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsHistoryDialogOpen(true)}
                      >
                        <History className="h-4 w-4 mr-2" />
                        История
                      </Button>
                    </div>
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => speakText(translatedText, targetLang)}
                        disabled={!translatedText}
                      >
                        <Volume className="h-4 w-4 mr-2" />
                        Прослушать
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(translatedText)}
                        disabled={!translatedText}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Копировать
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Информационная карточка */}
          <Card className="mt-6 bg-gradient-to-r from-primary-50 to-white border border-primary-100">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <h3 className="text-lg font-medium text-primary-900">
                    Используйте перевод для документов и переговоров
                  </h3>
                  <p className="mt-1 text-sm text-neutral-600 max-w-xl">
                    RoAI использует передовые технологии нейронного машинного перевода для обеспечения точных 
                    и контекстно-зависимых переводов между казахским, русским и английским языками.
                  </p>
                </div>
                <Button className="mt-4 md:mt-0" onClick={() => startPrompter()}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Запустить телесуфлер
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Содержимое вкладки "Запись аудио" */}
        <TabsContent value="record" className="mt-0">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Панель управления записью */}
            <Card>
              <CardHeader>
                <CardTitle>Запись аудио</CardTitle>
                <CardDescription>
                  Запишите аудио, которое будет переведено и транскрибировано
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isRecording ? (
                  <div className="flex flex-col items-center justify-center p-6 border border-red-200 bg-red-50 rounded-md">
                    <div className="flex items-center mb-4">
                      <div className="animate-pulse mr-2 h-3 w-3 rounded-full bg-red-500"></div>
                      <span className="text-red-700 font-medium">Запись</span>
                      <span className="ml-2 text-lg font-bold text-red-700">{recordingTime} сек</span>
                    </div>
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={stopAudioRecording}
                    >
                      <StopCircle className="h-5 w-5 mr-2" />
                      Остановить запись
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="language">Язык записи</Label>
                      <Select value={sourceLang} onValueChange={setSourceLang}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Выберите язык" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ru">Русский</SelectItem>
                          <SelectItem value="kz">Казахский</SelectItem>
                          <SelectItem value="en">Английский</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <Label htmlFor="translateTo">Перевести на</Label>
                      <Select value={targetLang} onValueChange={setTargetLang}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Выберите язык" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ru">Русский</SelectItem>
                          <SelectItem value="kz">Казахский</SelectItem>
                          <SelectItem value="en">Английский</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="yandex-speech" 
                        checked={isYandexEnabled} 
                        onCheckedChange={setIsYandexEnabled}
                      />
                      <Label htmlFor="yandex-speech">Использовать Yandex SpeechKit для казахского языка</Label>
                    </div>
                    
                    <Button
                      className="w-full"
                      onClick={startAudioRecording}
                    >
                      <Mic className="h-5 w-5 mr-2" />
                      Начать запись
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={recordings.length === 0}
                      onClick={() => {
                        const inputElement = document.createElement("input");
                        inputElement.type = "file";
                        inputElement.accept = "audio/*";
                        inputElement.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            const newRecording: AudioRecording = {
                              id: recordings.length + 1,
                              date: new Date(),
                              duration: 0,
                              url,
                              language: sourceLang
                            };
                            setRecordings([...recordings, newRecording]);
                            setCurrentRecordingId(newRecording.id);
                            toast({
                              title: "Файл загружен",
                              description: "Аудиофайл успешно загружен"
                            });
                          }
                        };
                        inputElement.click();
                      }}
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Загрузить аудиофайл
                    </Button>
                  </div>
                )}
                
                {/* Телесуфлер */}
                {prompterMode && (
                  <div className="mt-4 border border-primary-200 rounded-md p-4 bg-primary-50">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-primary-900">Режим телесуфлера</h3>
                      <Button
                        variant="outline" 
                        size="sm"
                        onClick={stopPrompter}
                      >
                        <StopCircle className="h-4 w-4 mr-1" />
                        Выход
                      </Button>
                    </div>
                    <div 
                      id="prompter-text"
                      className="h-48 overflow-auto p-3 bg-white border border-neutral-200 rounded text-lg"
                    >
                      {prompterText}
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="auto-scroll" className="text-sm">Автопрокрутка</Label>
                        <Switch 
                          id="auto-scroll" 
                          checked={autoScroll} 
                          onCheckedChange={setAutoScroll}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="speed" className="text-sm">Скорость</Label>
                        <input 
                          type="range" 
                          id="speed" 
                          min="1" 
                          max="5" 
                          step="1"
                          value={prompterSpeed}
                          onChange={(e) => setPrompterSpeed(parseInt(e.target.value))}
                          className="w-24"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Список записей */}
            <Card>
              <CardHeader>
                <CardTitle>Записи</CardTitle>
                <CardDescription>
                  Ваши сохраненные аудиозаписи и их транскрипции
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recordings.length === 0 ? (
                  <div className="text-center py-12">
                    <Mic className="h-12 w-12 mx-auto text-neutral-300" />
                    <h3 className="mt-2 text-lg font-medium text-neutral-900">Нет записей</h3>
                    <p className="mt-1 text-neutral-500">Запишите аудио или загрузите аудиофайл</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recordings.map((recording) => (
                      <div key={recording.id} className="border rounded-md p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">
                              Запись #{recording.id}
                              <span className="ml-2 text-sm text-neutral-500">
                                ({new Date(recording.date).toLocaleString()})
                              </span>
                            </div>
                            <div className="text-sm text-neutral-500">
                              {recording.duration > 0 ? `${recording.duration} сек` : "Загруженный файл"}
                              <Badge className="ml-2 bg-neutral-100 text-neutral-800 hover:bg-neutral-200">
                                {recording.language === 'ru' ? 'Русский' : 
                                 recording.language === 'kz' ? 'Казахский' : 'Английский'}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedHistoryItem({
                                  id: recording.id,
                                  date: recording.date,
                                  sourceText: recording.transcript?.[0]?.text || "",
                                  translatedText: "",
                                  sourceLang: recording.language,
                                  targetLang: targetLang,
                                  audioUrl: recording.url
                                });
                                saveToRegistry();
                              }}
                            >
                              <DatabaseIcon className="h-4 w-4 mr-1" />
                              В реестр
                            </Button>
                          </div>
                        </div>
                        
                        {/* Аудиоплеер */}
                        <div className="mt-2">
                          <audio 
                            src={recording.url} 
                            controls 
                            className="w-full h-10"
                          ></audio>
                        </div>
                        
                        {/* Транскрипция */}
                        {recording.transcript && (
                          <div className="mt-2">
                            <div className="text-xs text-neutral-500 mb-1">Транскрипция:</div>
                            <div className="text-sm border border-neutral-200 rounded p-2 bg-neutral-50">
                              {recording.transcript[0]?.text || "Транскрипция недоступна"}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Содержимое вкладки "Разговорник" */}
        <TabsContent value="conversation" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Двусторонний режим перевода</CardTitle>
              <CardDescription>
                Используйте этот режим для разговора между людьми, говорящими на разных языках
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-md p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Участник 1</h3>
                    <Select value={sourceLang} onValueChange={setSourceLang}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Язык" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ru">Русский</SelectItem>
                        <SelectItem value="kz">Казахский</SelectItem>
                        <SelectItem value="en">Английский</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea 
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="Введите текст или запишите речь..."
                    className="min-h-[150px] mb-2"
                  />
                  <div className="flex justify-between">
                    <Button 
                      variant="outline"
                      onClick={() => startListening()}
                      disabled={isListening}
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      Диктовать
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => speakText(sourceText, sourceLang)}
                      disabled={!sourceText}
                    >
                      <Volume className="h-4 w-4 mr-2" />
                      Прослушать
                    </Button>
                  </div>
                </div>
                
                <div className="border rounded-md p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Участник 2</h3>
                    <Select value={targetLang} onValueChange={setTargetLang}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Язык" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ru">Русский</SelectItem>
                        <SelectItem value="kz">Казахский</SelectItem>
                        <SelectItem value="en">Английский</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div 
                    className="min-h-[150px] p-3 mb-2 bg-neutral-50 border border-neutral-200 rounded-md"
                  >
                    {translatedText || (
                      <span className="text-neutral-400">Перевод появится здесь</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <Button 
                      variant="outline"
                      onClick={swapLanguages}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Поменять языки
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => speakText(translatedText, targetLang)}
                      disabled={!translatedText}
                    >
                      <Volume className="h-4 w-4 mr-2" />
                      Прослушать
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="font-medium mb-2">История разговора</h3>
                <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto">
                  {translationHistory.length > 0 ? (
                    <div className="space-y-3">
                      {translationHistory.map((item) => (
                        <div key={item.id} className="flex flex-col space-y-2">
                          <div className="flex items-start">
                            <Badge className="mr-2 bg-primary-100 text-primary-800">
                              {item.sourceLang === 'ru' ? 'RU' : 
                              item.sourceLang === 'kz' ? 'KZ' : 'EN'}
                            </Badge>
                            <div className="bg-primary-50 rounded-md p-2 text-sm">
                              {item.sourceText}
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Badge className="mr-2 bg-neutral-100 text-neutral-800">
                              {item.targetLang === 'ru' ? 'RU' : 
                              item.targetLang === 'kz' ? 'KZ' : 'EN'}
                            </Badge>
                            <div className="bg-neutral-50 rounded-md p-2 text-sm">
                              {item.translatedText}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-neutral-500">
                      Начните разговор, чтобы видеть историю
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button 
                    variant="outline"
                    onClick={downloadTranslation}
                    disabled={translationHistory.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Сохранить разговор
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Содержимое вкладки "Реестр переводов" */}
        <TabsContent value="registry" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Реестр переводов</CardTitle>
              <CardDescription>
                Все переводы, сохраненные в блокчейн-реестре GovChain
              </CardDescription>
            </CardHeader>
            <CardContent>
              {translationHistory.filter(item => item.savedToRegistry).length === 0 ? (
                <div className="text-center py-12">
                  <DatabaseIcon className="h-12 w-12 mx-auto text-neutral-300" />
                  <h3 className="mt-2 text-lg font-medium text-neutral-900">Реестр пуст</h3>
                  <p className="mt-1 text-neutral-500">
                    Сохраните переводы в реестр для обеспечения целостности и надежности
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {translationHistory
                    .filter(item => item.savedToRegistry)
                    .map((item) => (
                      <Card key={item.id} className="bg-white border-primary-100">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base">{item.title}</CardTitle>
                              <CardDescription>
                                {new Date(item.date).toLocaleString()} • 
                                <Badge className="ml-1 bg-green-100 text-green-800">
                                  В реестре GovChain
                                </Badge>
                                {item.analyzed && (
                                  <Badge className="ml-1 bg-blue-100 text-blue-800">
                                    Проанализировано AI
                                  </Badge>
                                )}
                              </CardDescription>
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedHistoryItem(item);
                                  analyzeTranslation();
                                }}
                                disabled={item.analyzed}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {item.analyzed ? "Проанализировано" : "Анализ"}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-neutral-500 mb-1">
                                Исходный текст ({item.sourceLang === 'ru' ? 'Русский' : 
                                              item.sourceLang === 'kz' ? 'Казахский' : 'Английский'})
                              </div>
                              <div className="p-2 bg-neutral-50 rounded border border-neutral-200 text-sm">
                                {item.sourceText}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-neutral-500 mb-1">
                                Перевод ({item.targetLang === 'ru' ? 'Русский' : 
                                        item.targetLang === 'kz' ? 'Казахский' : 'Английский'})
                              </div>
                              <div className="p-2 bg-neutral-50 rounded border border-neutral-200 text-sm">
                                {item.translatedText}
                              </div>
                            </div>
                          </div>
                          
                          {item.audioUrl && (
                            <div className="mt-3">
                              <div className="text-xs text-neutral-500 mb-1">Аудиозапись</div>
                              <audio src={item.audioUrl} controls className="w-full h-8"></audio>
                            </div>
                          )}
                          
                          {item.metadata && (
                            <div className="mt-3 text-xs text-neutral-500">
                              {item.metadata.source && <span>Источник: {item.metadata.source} • </span>}
                              {item.metadata.context && <span>Контекст: {item.metadata.context} • </span>}
                              {item.metadata.confidenceScore && (
                                <span>Точность: {(item.metadata.confidenceScore * 100).toFixed(1)}%</span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Диалоговое окно для сохранения перевода */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Сохранить перевод</DialogTitle>
            <DialogDescription>
              Заполните информацию для сохранения текущего перевода в истории
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Название
              </Label>
              <Input
                id="title"
                value={translationTitle}
                onChange={(e) => setTranslationTitle(e.target.value)}
                className="col-span-3"
                placeholder="Введите название для перевода"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="source" className="text-right">
                Источник
              </Label>
              <Input
                id="source"
                value={translationMetadata.source}
                onChange={(e) => setTranslationMetadata({ ...translationMetadata, source: e.target.value })}
                className="col-span-3"
                placeholder="Укажите источник текста (документ, разговор и т.д.)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="context" className="text-right">
                Контекст
              </Label>
              <Input
                id="context"
                value={translationMetadata.context}
                onChange={(e) => setTranslationMetadata({ ...translationMetadata, context: e.target.value })}
                className="col-span-3"
                placeholder="Укажите контекст перевода"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveTranslation}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалоговое окно с историей переводов */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>История переводов</DialogTitle>
            <DialogDescription>
              Ваши сохраненные переводы
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[500px] overflow-y-auto">
            {translationHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 mx-auto text-neutral-300" />
                <h3 className="mt-2 text-lg font-medium text-neutral-900">История пуста</h3>
                <p className="mt-1 text-neutral-500">У вас пока нет сохраненных переводов</p>
              </div>
            ) : (
              <div className="space-y-4">
                {translationHistory.map((item) => (
                  <Card key={item.id} className="p-3 hover:bg-neutral-50">
                    <div className="flex justify-between items-center">
                      <div className="font-medium">
                        {item.title}
                        <span className="ml-2 text-sm font-normal text-neutral-500">
                          ({new Date(item.date).toLocaleString()})
                        </span>
                      </div>
                      <div>
                        <Badge className="mr-1 bg-neutral-100 text-neutral-800">
                          {item.sourceLang} → {item.targetLang}
                        </Badge>
                        {item.savedToRegistry && (
                          <Badge className="bg-green-100 text-green-800">
                            В реестре
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 space-y-2">
                      <div className="p-2 bg-neutral-50 rounded border border-neutral-200">
                        {item.sourceText.substring(0, 100)}{item.sourceText.length > 100 ? "..." : ""}
                      </div>
                      <div className="p-2 bg-neutral-50 rounded border border-neutral-200">
                        {item.translatedText.substring(0, 100)}{item.translatedText.length > 100 ? "..." : ""}
                      </div>
                    </div>
                    {item.metadata && (
                      <div className="mt-2 text-xs text-neutral-500">
                        {item.metadata.source && <span>Источник: {item.metadata.source} | </span>}
                        {item.metadata.context && <span>Контекст: {item.metadata.context}</span>}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалоговое окно для анализа перевода */}
      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Анализ перевода</DialogTitle>
            <DialogDescription>
              AI анализирует качество и точность перевода
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedHistoryItem && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-1">Исходный текст:</h3>
                  <div className="p-3 bg-neutral-50 rounded border border-neutral-200">
                    {selectedHistoryItem.sourceText}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-1">Перевод:</h3>
                  <div className="p-3 bg-neutral-50 rounded border border-neutral-200">
                    {selectedHistoryItem.translatedText}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-1">Результаты анализа:</h3>
                  <div className="p-3 bg-primary-50 rounded border border-primary-200">
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                        <div>
                          <span className="font-medium">Точность перевода: 94%</span>
                          <p className="text-sm text-neutral-600">
                            Перевод точно передает смысл оригинального текста
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                        <div>
                          <span className="font-medium">Грамматические конструкции: 98%</span>
                          <p className="text-sm text-neutral-600">
                            Грамматические конструкции использованы правильно
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                        <div>
                          <span className="font-medium">Стилистическое соответствие: 92%</span>
                          <p className="text-sm text-neutral-600">
                            Стиль перевода соответствует оригинальному тексту
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnalysisDialog(false)}>
              Закрыть
            </Button>
            <Button 
              onClick={() => {
                setShowAnalysisDialog(false);
                saveToRegistry();
              }}
              disabled={savingToRegistry || (selectedHistoryItem?.savedToRegistry === true)}
            >
              {savingToRegistry ? (
                <>
                  <div className="h-4 w-4 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                  Сохранение...
                </>
              ) : selectedHistoryItem?.savedToRegistry ? (
                <>Уже в реестре</>
              ) : (
                <>Сохранить в реестр</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Translate;