import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QuestionMarkCircledIcon, Cross2Icon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type HelpCharacter = 'agent-smith' | 'blockchain-buddy' | 'document-helper' | 'meeting-assistant' | 'default';

interface HelpBubbleProps {
  title?: string;
  content: string | React.ReactNode;
  character?: HelpCharacter;
  position?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  onDismiss?: () => void;
  showInitially?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Компонент контекстной подсказки с персонажем-помощником
 * Показывает всплывающую подсказку с милым персонажем, который объясняет функциональность элемента
 */
export function HelpBubble({
  title,
  content,
  character = 'default',
  position = 'right',
  className,
  onDismiss,
  showInitially = false,
  size = 'md',
}: HelpBubbleProps) {
  const [isOpen, setIsOpen] = useState(showInitially);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Закрываем пузырь при клике снаружи
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (onDismiss) onDismiss();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onDismiss]);

  // Определяем размеры подсказки
  const bubbleSizes = {
    sm: 'max-w-[200px]',
    md: 'max-w-[300px]',
    lg: 'max-w-[400px]',
  };

  // Получаем изображение персонажа
  const characterImage = getCharacterImage(character);

  // Определяем позицию подсказки
  const positionClasses = {
    top: 'bottom-full mb-2',
    right: 'left-full ml-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
  };

  return (
    <div className={cn("relative inline-flex", className)} ref={bubbleRef}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
        onClick={() => setIsOpen(!isOpen)}
      >
        <QuestionMarkCircledIcon className="h-4 w-4" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute z-50",
              positionClasses[position],
              bubbleSizes[size]
            )}
          >
            <Card className="border-primary/20 shadow-md">
              <div className="absolute top-2 right-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full hover:bg-muted"
                  onClick={() => {
                    setIsOpen(false);
                    if (onDismiss) onDismiss();
                  }}
                >
                  <Cross2Icon className="h-3 w-3" />
                </Button>
              </div>

              <CardContent className="pt-4 pb-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-12 h-12">
                    <img 
                      src={characterImage} 
                      alt={`${character} character`} 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    {title && <h4 className="text-sm font-medium mb-1">{title}</h4>}
                    <div className="text-xs text-muted-foreground">{content}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Получает URL изображения персонажа по его типу
 */
function getCharacterImage(character: HelpCharacter): string {
  // В реальном проекте здесь будут пути к реальным изображениям персонажей
  // Сейчас используем плейсхолдеры
  const characterImages = {
    'agent-smith': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0iI2I0ZTdmZiIvPjxjaXJjbGUgY3g9IjMzIiBjeT0iNDAiIHI9IjciIGZpbGw9IiMzMzMiLz48Y2lyY2xlIGN4PSI2NyIgY3k9IjQwIiByPSI3IiBmaWxsPSIjMzMzIi8+PGNpcmNsZSBjeD0iMzMiIGN5PSIzOCIgcj0iMiIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjY3IiBjeT0iMzgiIHI9IjIiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNMzUgNTVDMzUgNjUgNjUgNjUgNjUgNTUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTI1IDIwQzI1IDE1IDM1IDEwIDUwIDEwQzY1IDEwIDc1IDE1IDc1IDIwIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==',
    'blockchain-buddy': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0iI2ZmZDRlMyIvPjxjaXJjbGUgY3g9IjMzIiBjeT0iNDAiIHI9IjciIGZpbGw9IiMzMzMiLz48Y2lyY2xlIGN4PSI2NyIgY3k9IjQwIiByPSI3IiBmaWxsPSIjMzMzIi8+PGNpcmNsZSBjeD0iMzMiIGN5PSIzOCIgcj0iMiIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjY3IiBjeT0iMzgiIHI9IjIiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNMzUgNTVDMzUgNjUgNjUgNjUgNjUgNTUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTIwIDIzTDMzIDE1TDUwIDEwTDY3IDE1TDgwIDIzIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==',
    'document-helper': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0iI2Q0ZmZkNCIvPjxjaXJjbGUgY3g9IjMzIiBjeT0iNDAiIHI9IjciIGZpbGw9IiMzMzMiLz48Y2lyY2xlIGN4PSI2NyIgY3k9IjQwIiByPSI3IiBmaWxsPSIjMzMzIi8+PGNpcmNsZSBjeD0iMzMiIGN5PSIzOCIgcj0iMiIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjY3IiBjeT0iMzgiIHI9IjIiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNNDAgNjBDNDUgNjggNTUgNjggNjAgNjAiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIi8+PHJlY3QgeD0iMjUiIHk9IjEwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjUiIHN0cm9rZT0iIzMzMyIgZmlsbD0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iNTUiIHk9IjEwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjUiIHN0cm9rZT0iIzMzMyIgZmlsbD0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+',
    'meeting-assistant': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0iI2Y4ZmZkNCIvPjxjaXJjbGUgY3g9IjMzIiBjeT0iNDAiIHI9IjciIGZpbGw9IiMzMzMiLz48Y2lyY2xlIGN4PSI2NyIgY3k9IjQwIiByPSI3IiBmaWxsPSIjMzMzIi8+PGNpcmNsZSBjeD0iMzMiIGN5PSIzOCIgcj0iMiIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjY3IiBjeT0iMzgiIHI9IjIiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNNDAgNjBDNDAgNTUgNjAgNTUgNjAgNjAiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSIxNSIgcj0iMTAiIHN0cm9rZT0iIzMzMyIgZmlsbD0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTQ1IDEzTDUwIDE4TDU1IDEzIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==',
    'default': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0iI2U5ZTlmZiIvPjxjaXJjbGUgY3g9IjMzIiBjeT0iNDAiIHI9IjciIGZpbGw9IiMzMzMiLz48Y2lyY2xlIGN4PSI2NyIgY3k9IjQwIiByPSI3IiBmaWxsPSIjMzMzIi8+PGNpcmNsZSBjeD0iMzMiIGN5PSIzOCIgcj0iMiIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjY3IiBjeT0iMzgiIHI9IjIiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNMzAgNjBDNDAgNzAgNjAgNzAgNzAgNjAiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIi8+PC9zdmc+',
  };

  return characterImages[character];
}