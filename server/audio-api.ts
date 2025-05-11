/**
 * API маршруты для обработки аудиофайлов и транскрибации
 */
import express, { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { 
  transcribeAudio, 
  processTextWithAI, 
  processAudioFile,
  TranscriptionProvider,
  TextProcessingModel
} from './audio-service';
import { logActivity } from './activity-logger';
import { recordToBlockchain, BlockchainRecordType } from './blockchain';

// Настройка multer для сохранения аудиофайлов во временную директорию
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(process.cwd(), 'temp');
    // Проверяем наличие директории, если нет - создаем
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Создаем middleware для загрузки файлов
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 МБ максимальный размер файла
  },
  fileFilter: (req, file, cb) => {
    // Проверяем, что загружаемый файл - аудио
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый тип файла. Разрешены только аудиофайлы.'), false);
    }
  }
});

export function registerAudioRoutes(app: express.Express): void {
  /**
   * Маршрут для транскрибации аудиофайла
   */
  app.post('/api/transcribe', upload.single('audioFile'), async (req: Request, res: Response) => {
    try {
      // Проверяем, был ли загружен файл
      if (!req.file) {
        return res.status(400).json({ 
          error: 'No file uploaded',
          message: 'Пожалуйста, загрузите аудиофайл'
        });
      }

      // Получаем параметры из запроса
      const transcriptionProvider = (req.body.transcriptionProvider as TranscriptionProvider) || TranscriptionProvider.OPENAI_WHISPER;
      const language = req.body.language || 'ru';
      const meetingId = req.body.meetingId ? parseInt(req.body.meetingId) : undefined;

      // Считываем файл в буфер
      const fileBuffer = fs.readFileSync(req.file.path);

      // Транскрибируем аудио
      const transcript = await transcribeAudio(
        fileBuffer, 
        { language }, 
        transcriptionProvider
      );

      // Записываем активность
      await logActivity({
        action: 'audio_transcription',
        entityType: 'meeting',
        entityId: meetingId,
        details: `Транскрибация аудиофайла: ${req.file.originalname}`,
        metadata: {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          provider: transcriptionProvider
        }
      });

      // Если указан ID встречи, записываем в блокчейн
      if (meetingId) {
        try {
          const blockchainHash = await recordToBlockchain({
            entityId: meetingId,
            entityType: 'meeting',
            action: 'audio_transcription',
            metadata: {
              transcriptionTime: new Date().toISOString(),
              fileName: req.file.originalname,
              fileSize: req.file.size,
              provider: transcriptionProvider
            }
          });

          // Отвечаем с данными транскрипции
          res.json({
            success: true,
            transcript,
            blockchainHash
          });
        } catch (blockchainError) {
          console.error('Ошибка при записи в блокчейн:', blockchainError);
          
          // Даже если запись в блокчейн не удалась, возвращаем транскрипцию
          res.json({
            success: true,
            transcript,
            blockchainError: 'Не удалось записать в блокчейн'
          });
        }
      } else {
        // Если ID встречи не указан, просто возвращаем результат
        res.json({
          success: true,
          transcript
        });
      }

      // Удаляем временный файл после обработки
      fs.unlinkSync(req.file.path);
      
    } catch (error) {
      console.error('Ошибка при транскрибации аудио:', error);
      
      // Удаляем временный файл в случае ошибки
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({
        error: 'Failed to transcribe audio',
        message: error.message || 'Произошла ошибка при обработке аудио'
      });
    }
  });

  /**
   * Маршрут для обработки текста с использованием LLM моделей
   */
  app.post('/api/process-text', async (req: Request, res: Response) => {
    try {
      const { text, model, meetingId } = req.body;
      
      if (!text) {
        return res.status(400).json({
          error: 'No text provided',
          message: 'Текст для обработки не предоставлен'
        });
      }
      
      const textProcessingModel = (model as TextProcessingModel) || TextProcessingModel.OPENAI;
      
      // Обрабатываем текст с использованием выбранной модели
      const processedText = await processTextWithAI(text, textProcessingModel);
      
      // Если указан ID встречи, логируем активность
      if (meetingId) {
        await logActivity({
          action: 'text_processing',
          entityType: 'meeting',
          entityId: parseInt(meetingId),
          details: `Обработка текста протокола с использованием ${textProcessingModel}`,
          metadata: {
            textLength: text.length,
            model: textProcessingModel
          }
        });
      }
      
      res.json({
        success: true,
        processedText
      });
      
    } catch (error) {
      console.error('Ошибка при обработке текста:', error);
      res.status(500).json({
        error: 'Failed to process text',
        message: error.message || 'Произошла ошибка при обработке текста'
      });
    }
  });

  /**
   * Маршрут для комплексной обработки аудиофайла (транскрибация + обработка текста)
   */
  app.post('/api/process-audio', upload.single('audioFile'), async (req: Request, res: Response) => {
    try {
      // Проверяем, был ли загружен файл
      if (!req.file) {
        return res.status(400).json({ 
          error: 'No file uploaded',
          message: 'Пожалуйста, загрузите аудиофайл'
        });
      }

      // Получаем параметры из запроса
      const transcriptionProvider = (req.body.transcriptionProvider as TranscriptionProvider) || TranscriptionProvider.OPENAI_WHISPER;
      const textProcessingModel = (req.body.textProcessingModel as TextProcessingModel) || TextProcessingModel.OPENAI;
      const language = req.body.language || 'ru';
      const meetingId = req.body.meetingId ? parseInt(req.body.meetingId) : undefined;

      // Считываем файл в буфер
      const fileBuffer = fs.readFileSync(req.file.path);

      // Обрабатываем аудиофайл полностью
      const { transcript, processedText } = await processAudioFile(
        fileBuffer,
        { language },
        transcriptionProvider,
        textProcessingModel
      );

      // Записываем активность
      await logActivity({
        action: 'audio_processing',
        entityType: 'meeting',
        entityId: meetingId,
        details: `Обработка аудиофайла: ${req.file.originalname}`,
        metadata: {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          transcriptionProvider,
          textProcessingModel
        }
      });

      // Если указан ID встречи, записываем в блокчейн
      if (meetingId) {
        try {
          const blockchainHash = await recordToBlockchain({
            entityId: meetingId,
            entityType: 'meeting',
            action: 'audio_processing',
            metadata: {
              processingTime: new Date().toISOString(),
              fileName: req.file.originalname,
              fileSize: req.file.size,
              transcriptionProvider,
              textProcessingModel
            }
          });

          // Отвечаем с данными обработки
          res.json({
            success: true,
            transcript,
            processedText,
            blockchainHash
          });
        } catch (blockchainError) {
          console.error('Ошибка при записи в блокчейн:', blockchainError);
          
          // Даже если запись в блокчейн не удалась, возвращаем результаты
          res.json({
            success: true,
            transcript,
            processedText,
            blockchainError: 'Не удалось записать в блокчейн'
          });
        }
      } else {
        // Если ID встречи не указан, просто возвращаем результат
        res.json({
          success: true,
          transcript,
          processedText
        });
      }

      // Удаляем временный файл после обработки
      fs.unlinkSync(req.file.path);
      
    } catch (error) {
      console.error('Ошибка при обработке аудио:', error);
      
      // Удаляем временный файл в случае ошибки
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({
        error: 'Failed to process audio',
        message: error.message || 'Произошла ошибка при обработке аудио'
      });
    }
  });
}