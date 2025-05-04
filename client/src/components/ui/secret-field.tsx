import React, { useState } from 'react';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface SecretFieldProps {
  label?: string;
  value: string;
  obscuredValue?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  maxLength?: number;
  showCopyButton?: boolean;
  showRotateButton?: boolean;
  onRotate?: () => Promise<string>;
  description?: string;
  name?: string;
}

/**
 * SecretField - компонент для безопасного отображения и работы с секретными данными
 * Скрывает значение по умолчанию и показывает только при явном действии пользователя
 */
export const SecretField = ({
  label,
  value,
  obscuredValue = '••••••••••••••••••••••••••••••',
  onChange,
  readOnly = false,
  maxLength,
  showCopyButton = true,
  showRotateButton = false,
  onRotate,
  description,
  name,
}: SecretFieldProps) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [showRotateDialog, setShowRotateDialog] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  
  // Копирование в буфер обмена
  const copyToClipboard = () => {
    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };
  
  // Обновление секрета
  const handleRotate = async () => {
    if (!onRotate) return;
    
    setIsRotating(true);
    try {
      const newValue = await onRotate();
      onChange?.(newValue);
      setShowRotateDialog(false);
      setOtpValue('');
    } catch (error) {
      console.error('Error rotating secret:', error);
    } finally {
      setIsRotating(false);
    }
  };
  
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex space-x-2">
        <div className="relative flex-1">
          <Input
            type={isRevealed ? 'text' : 'password'}
            value={isRevealed ? value : obscuredValue}
            onChange={(e) => onChange?.(e.target.value)}
            readOnly={readOnly || !isRevealed}
            maxLength={maxLength}
            className={readOnly ? 'font-mono bg-muted cursor-not-allowed' : 'font-mono'}
            name={name}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            onClick={() => setIsRevealed(!isRevealed)}
            tabIndex={-1}
            title={isRevealed ? 'Скрыть' : 'Показать'}
          >
            {isRevealed ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {showCopyButton && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={copyToClipboard}
            title="Копировать"
            disabled={!value}
          >
            {isCopied ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-green-500"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            )}
          </Button>
        )}
        
        {showRotateButton && onRotate && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowRotateDialog(true)}
            title="Обновить ключ"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      
      {/* Диалог подтверждения ротации ключа */}
      <Dialog open={showRotateDialog} onOpenChange={setShowRotateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение обновления ключа</DialogTitle>
            <DialogDescription>
              Для обновления ключа требуется дополнительное подтверждение через OTP.
              Отправьте запрос на получение OTP и введите полученный код.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="otp" className="text-right">OTP код</Label>
              <Input
                id="otp"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value)}
                className="col-span-3"
                placeholder="Введите полученный OTP код"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRotateDialog(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleRotate} 
              disabled={isRotating || otpValue.length < 6}
            >
              {isRotating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Обновление...
                </>
              ) : (
                'Подтвердить обновление'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
