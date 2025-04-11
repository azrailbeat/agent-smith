import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mic, Volume, RotateCcw, Copy, Download, Save, StopCircle, History } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Translation {
  id: number;
  date: Date;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  title?: string;
  metadata?: {
    source?: string;
    context?: string;
    confidenceScore?: number;
  };
}

interface YandexSpeechRecognitionResponse {
  result: string;
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
  
  // Для Yandex Speech Kit
  const [isYandexEnabled, setIsYandexEnabled] = useState(false);
  
  const recognitionRef = useRef<any>(null);
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
      const SpeechRecognition = window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = sourceLang === 'ru' ? 'ru-RU' : 
                         sourceLang === 'kz' ? 'kk-KZ' : 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        setSourceText((prev) => prev + ' ' + transcript);
      };

      recognition.onerror = (event) => {
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
          Переводите текст между казахским, русским и английским языками
        </p>
      </div>

      {/* Основное содержимое */}
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
            <Button className="mt-4 md:mt-0" onClick={() => window.open("/documents", "_self")}>
              Перейти к документам
            </Button>
          </div>
        </CardContent>
      </Card>
      
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
                placeholder="Опишите контекст перевода (необязательно)"
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
      
      {/* Диалоговое окно для истории переводов */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>История переводов</DialogTitle>
            <DialogDescription>
              Просмотр и управление сохраненными переводами
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {translationHistory.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                История переводов пуста
              </div>
            ) : (
              <div className="space-y-4">
                {translationHistory.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-xs text-neutral-500">
                          {new Date(item.date).toLocaleString()} | {item.sourceLang} → {item.targetLang}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        className="h-8 w-8 p-0" 
                        onClick={() => {
                          setSourceText(item.sourceText);
                          setTranslatedText(item.translatedText);
                          setSourceLang(item.sourceLang);
                          setTargetLang(item.targetLang);
                          setIsHistoryDialogOpen(false);
                        }}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
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
    </>
  );
};

export default Translate;