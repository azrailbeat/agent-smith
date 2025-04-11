import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mic, Volume, RotateCcw, Copy } from "lucide-react";

const Translate = () => {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("ru");
  const [targetLang, setTargetLang] = useState("en");
  const [isListening, setIsListening] = useState(false);
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
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSourceText((prev) => prev + ' ' + transcript);
      };

      recognition.onerror = (event) => {
        console.error("Ошибка распознавания:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

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
                  <Button
                    variant="outline"
                    onClick={() => startListening()}
                    disabled={isListening}
                    className={isListening ? "bg-primary-100" : ""}
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    {isListening ? "Слушаю..." : "Диктовать"}
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
              <div className="flex justify-end">
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
    </>
  );
};

export default Translate;