/**
 * API маршруты для обработки аудиофайлов и транскрибации
 */
import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { 
  transcribeAudio, 
  processTextWithAI, 
  TranscriptionProvider, 
  TextProcessingModel 
} from './audio-service';
import { logActivity } from './activity-logger';
import { recordToBlockchain, BlockchainRecordType } from './blockchain';

// Настройка multer для обработки загрузки файлов
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // Лимит 25 МБ
});

export function registerAudioRoutes(app: express.Express): void {
  
  // Маршрут для транскрибации аудиофайла
  app.post('/api/transcribe', upload.single('audioFile'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Аудиофайл не был загружен' });
      }
      
      const { provider, language, meetingId } = req.body;
      
      // Проверяем наличие требуемых полей
      if (!provider) {
        return res.status(400).json({ error: 'Не указан провайдер транскрибации' });
      }
      
      // Определяем провайдера транскрибации
      let transcriptionProvider;
      switch (provider) {
        case 'whisper':
          transcriptionProvider = TranscriptionProvider.OPENAI_WHISPER;
          break;
        case 'speechkit':
          transcriptionProvider = TranscriptionProvider.YANDEX_SPEECHKIT;
          break;
        default:
          return res.status(400).json({ error: 'Неизвестный провайдер транскрибации' });
      }
      
      // Выполняем транскрибацию
      const transcript = await transcribeAudio(
        req.file.buffer, 
        req.file.originalname,
        transcriptionProvider,
        language
      );
      
      // Логируем активность
      await logActivity({
        action: 'audio_transcription',
        entityType: 'meeting',
        entityId: parseInt(meetingId) || 0,
        details: `Аудиофайл транскрибирован: ${req.file.originalname}`,
        metadata: { 
          provider, 
          fileSize: req.file.size, 
          language 
        }
      });
      
      // Если указан идентификатор встречи, записываем в блокчейн
      if (meetingId) {
        try {
          const transactionHash = await recordToBlockchain({
            entityId: parseInt(meetingId),
            entityType: 'meeting',
            action: 'audio_transcription',
            metadata: {
              fileSize: req.file.size,
              fileName: req.file.originalname,
              provider,
              language,
              transcriptLength: transcript.length
            }
          });
          
          // Возвращаем результат с хешем транзакции
          return res.json({ 
            success: true,
            transcript,
            transactionHash,
            provider,
            fileInfo: {
              name: req.file.originalname,
              size: req.file.size,
              mimeType: req.file.mimetype
            }
          });
        } catch (blockchainError) {
          // Если не удалось записать в блокчейн, все равно возвращаем транскрипт
          console.error('Ошибка при записи в блокчейн:', blockchainError);
          return res.json({ 
            success: true,
            transcript,
            blockchainError: 'Не удалось записать данные в блокчейн',
            provider,
            fileInfo: {
              name: req.file.originalname,
              size: req.file.size,
              mimeType: req.file.mimetype
            }
          });
        }
      }
      
      // Возвращаем результат без записи в блокчейн
      return res.json({ 
        success: true,
        transcript,
        provider,
        fileInfo: {
          name: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype
        }
      });
      
    } catch (error) {
      console.error('Ошибка при транскрибации аудио:', error);
      return res.status(500).json({ 
        error: 'Ошибка при транскрибации аудио',
        message: error.message 
      });
    }
  });

  // Маршрут для обработки текста с использованием ИИ
  app.post('/api/process-text', async (req: Request, res: Response) => {
    try {
      const { text, model, prompt, meetingId } = req.body;
      
      // Проверяем наличие требуемых полей
      if (!text) {
        return res.status(400).json({ error: 'Не указан текст для обработки' });
      }
      if (!model) {
        return res.status(400).json({ error: 'Не указана модель для обработки текста' });
      }
      
      // Определяем модель для обработки текста
      let textProcessingModel;
      switch (model) {
        case 'openai':
          textProcessingModel = TextProcessingModel.OPENAI;
          break;
        case 'anthropic':
          textProcessingModel = TextProcessingModel.ANTHROPIC;
          break;
        case 'vllm':
          textProcessingModel = TextProcessingModel.VLLM;
          break;
        case 'google':
          textProcessingModel = TextProcessingModel.GOOGLE;
          break;
        case 'huggingface':
          textProcessingModel = TextProcessingModel.HUGGINGFACE;
          break;
        default:
          return res.status(400).json({ error: 'Неизвестная модель для обработки текста' });
      }
      
      // Выполняем обработку текста
      const processedText = await processTextWithAI(
        text,
        textProcessingModel,
        prompt
      );
      
      // Логируем активность
      await logActivity({
        action: 'text_processing',
        entityType: 'meeting',
        entityId: parseInt(meetingId) || 0,
        details: `Текст обработан с использованием ${model}`,
        metadata: { 
          model,
          textLength: text.length,
          promptLength: prompt?.length || 0
        }
      });
      
      // Если указан идентификатор встречи, записываем в блокчейн
      if (meetingId) {
        try {
          const transactionHash = await recordToBlockchain({
            entityId: parseInt(meetingId),
            entityType: 'meeting',
            action: 'text_processing',
            metadata: {
              model,
              textLength: text.length,
              processedTextLength: processedText.length,
              prompt: prompt
            }
          });
          
          // Возвращаем результат с хешем транзакции
          return res.json({ 
            success: true,
            processedText,
            transactionHash,
            model
          });
        } catch (blockchainError) {
          // Если не удалось записать в блокчейн, все равно возвращаем результат
          console.error('Ошибка при записи в блокчейн:', blockchainError);
          return res.json({ 
            success: true,
            processedText,
            blockchainError: 'Не удалось записать данные в блокчейн',
            model
          });
        }
      }
      
      // Возвращаем результат без записи в блокчейн
      return res.json({ 
        success: true,
        processedText,
        model
      });
      
    } catch (error) {
      console.error('Ошибка при обработке текста:', error);
      return res.status(500).json({ 
        error: 'Ошибка при обработке текста', 
        message: error.message 
      });
    }
  });
  
  // Маршрут для полной обработки аудиофайла (транскрибация + обработка текста)
  app.post('/api/process-audio', upload.single('audioFile'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Аудиофайл не был загружен' });
      }
      
      const { 
        transcriptionProvider, 
        textProcessingModel, 
        language, 
        prompt,
        meetingId 
      } = req.body;
      
      // Проверяем наличие требуемых полей
      if (!transcriptionProvider) {
        return res.status(400).json({ error: 'Не указан провайдер транскрибации' });
      }
      if (!textProcessingModel) {
        return res.status(400).json({ error: 'Не указана модель для обработки текста' });
      }
      
      // Определяем провайдера транскрибации
      let transcriptionProviderEnum;
      switch (transcriptionProvider) {
        case 'whisper':
          transcriptionProviderEnum = TranscriptionProvider.OPENAI_WHISPER;
          break;
        case 'speechkit':
          transcriptionProviderEnum = TranscriptionProvider.YANDEX_SPEECHKIT;
          break;
        default:
          return res.status(400).json({ error: 'Неизвестный провайдер транскрибации' });
      }
      
      // Определяем модель для обработки текста
      let textProcessingModelEnum;
      switch (textProcessingModel) {
        case 'openai':
          textProcessingModelEnum = TextProcessingModel.OPENAI;
          break;
        case 'anthropic':
          textProcessingModelEnum = TextProcessingModel.ANTHROPIC;
          break;
        case 'vllm':
          textProcessingModelEnum = TextProcessingModel.VLLM;
          break;
        case 'google':
          textProcessingModelEnum = TextProcessingModel.GOOGLE;
          break;
        case 'huggingface':
          textProcessingModelEnum = TextProcessingModel.HUGGINGFACE;
          break;
        default:
          return res.status(400).json({ error: 'Неизвестная модель для обработки текста' });
      }
      
      // Этап 1: транскрибация аудио
      const transcript = await transcribeAudio(
        req.file.buffer, 
        req.file.originalname,
        transcriptionProviderEnum,
        language
      );
      
      // Этап 2: обработка полученного текста
      const processedText = await processTextWithAI(
        transcript,
        textProcessingModelEnum,
        prompt || "Проанализируй и структурируй текст следующего транскрипта:"
      );
      
      // Логируем активность
      await logActivity({
        action: 'audio_processing',
        entityType: 'meeting',
        entityId: parseInt(meetingId) || 0,
        details: `Аудиофайл обработан: ${req.file.originalname}`,
        metadata: { 
          transcriptionProvider, 
          textProcessingModel, 
          fileSize: req.file.size, 
          language,
          transcriptLength: transcript.length,
          processedTextLength: processedText.length
        }
      });
      
      // Если указан идентификатор встречи, записываем в блокчейн
      if (meetingId) {
        try {
          const transactionHash = await recordToBlockchain({
            entityId: parseInt(meetingId),
            entityType: 'meeting',
            action: 'audio_processing',
            metadata: {
              fileName: req.file.originalname,
              fileSize: req.file.size,
              transcriptionProvider,
              textProcessingModel,
              language,
              transcriptLength: transcript.length,
              processedTextLength: processedText.length
            }
          });
          
          // Возвращаем результат с хешем транзакции
          return res.json({ 
            success: true,
            transcript,
            processedText,
            transactionHash,
            fileInfo: {
              name: req.file.originalname,
              size: req.file.size,
              mimeType: req.file.mimetype
            }
          });
        } catch (blockchainError) {
          // Если не удалось записать в блокчейн, все равно возвращаем результат
          console.error('Ошибка при записи в блокчейн:', blockchainError);
          return res.json({ 
            success: true,
            transcript,
            processedText,
            blockchainError: 'Не удалось записать данные в блокчейн',
            fileInfo: {
              name: req.file.originalname,
              size: req.file.size,
              mimeType: req.file.mimetype
            }
          });
        }
      }
      
      // Возвращаем результат без записи в блокчейн
      return res.json({ 
        success: true,
        transcript,
        processedText,
        fileInfo: {
          name: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype
        }
      });
      
    } catch (error) {
      console.error('Ошибка при обработке аудиофайла:', error);
      return res.status(500).json({ 
        error: 'Ошибка при обработке аудиофайла', 
        message: error.message 
      });
    }
  });
}