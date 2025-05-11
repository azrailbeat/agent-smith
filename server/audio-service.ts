/**
 * Сервис для обработки аудиофайлов и транскрибации
 */
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import OpenAI from 'openai';
import { logActivity, ActivityType } from './activity-logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Временная директория для хранения аудиофайлов
const TEMP_DIR = path.join(__dirname, '../temp');

// Обеспечиваем наличие папки для временных файлов
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export enum TranscriptionProvider {
  OPENAI_WHISPER = 'whisper',
  YANDEX_SPEECHKIT = 'speechkit'
}

export enum TextProcessingModel {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  VLLM = 'vllm',
  GOOGLE = 'google',
  HUGGINGFACE = 'huggingface'
}

/**
 * Транскрибирует аудиофайл с использованием OpenAI Whisper
 */
export async function transcribeWithWhisper(
  fileBuffer: Buffer, 
  filename: string,
  language?: string
): Promise<string> {
  try {
    const tempFilePath = path.join(TEMP_DIR, `${uuidv4()}-${filename}`);
    
    // Сохраняем файл временно
    fs.writeFileSync(tempFilePath, fileBuffer);
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      language: language,
    });
    
    // Удаляем временный файл
    fs.unlinkSync(tempFilePath);
    
    await logActivity({
      action: 'audio_transcription',
      entityType: 'audio',
      details: `Транскрибация аудио через Whisper: ${filename}`,
      metadata: { provider: 'whisper', fileSize: fileBuffer.length }
    });
    
    return transcription.text;
  } catch (error) {
    console.error("Ошибка при транскрибации аудио через Whisper:", error);
    throw new Error(`Ошибка при транскрибации аудио: ${error.message}`);
  }
}

/**
 * Транскрибирует аудиофайл с использованием Yandex SpeechKit
 */
export async function transcribeWithSpeechKit(
  fileBuffer: Buffer, 
  filename: string,
  language?: string
): Promise<string> {
  try {
    // Здесь будет реализован код для работы с Yandex SpeechKit API
    // Это заглушка, которая будет заменена на реальный код при наличии API-ключа Yandex
    
    await logActivity({
      action: 'audio_transcription',
      entityType: 'audio',
      details: `Транскрибация аудио через Yandex SpeechKit: ${filename}`,
      metadata: { provider: 'speechkit', fileSize: fileBuffer.length }
    });
    
    // В демо-режиме возвращаем заглушку
    return "Это заглушка транскрипции через Yandex SpeechKit. В реальном приложении здесь будет результат транскрибации.";
  } catch (error) {
    console.error("Ошибка при транскрибации аудио через SpeechKit:", error);
    throw new Error(`Ошибка при транскрибации аудио: ${error.message}`);
  }
}

/**
 * Обрабатывает текст с использованием выбранной модели ИИ
 */
export async function processTextWithAI(
  text: string,
  model: TextProcessingModel,
  prompt: string = "Проанализируй и структурируй текст следующего транскрипта:"
): Promise<string> {
  try {
    let result = '';
    
    switch (model) {
      case TextProcessingModel.OPENAI:
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { 
              role: "system", 
              content: "Ты помощник для анализа транскриптов встреч. Твоя задача - структурировать содержание, выделить ключевые моменты, решения и задачи."
            },
            { 
              role: "user", 
              content: `${prompt}\n\n${text}`
            }
          ],
        });
        result = response.choices[0].message.content;
        break;
        
      case TextProcessingModel.ANTHROPIC:
        // Здесь будет реализация для Anthropic
        result = "Обработка текста через Anthropic будет доступна после интеграции API.";
        break;
        
      case TextProcessingModel.VLLM:
        // Здесь будет реализация для vLLM
        result = "Обработка текста через vLLM будет доступна после интеграции API.";
        break;
        
      case TextProcessingModel.GOOGLE:
        // Здесь будет реализация для Google
        result = "Обработка текста через Google будет доступна после интеграции API.";
        break;
        
      case TextProcessingModel.HUGGINGFACE:
        // Здесь будет реализация для HuggingFace
        result = "Обработка текста через HuggingFace будет доступна после интеграции API.";
        break;
        
      default:
        throw new Error(`Неизвестная модель обработки текста: ${model}`);
    }
    
    await logActivity({
      action: 'text_processing',
      entityType: 'transcript',
      details: `Обработка текста через ${model}`,
      metadata: { model, textLength: text.length }
    });
    
    return result;
  } catch (error) {
    console.error(`Ошибка при обработке текста с помощью ${model}:`, error);
    throw new Error(`Ошибка при обработке текста: ${error.message}`);
  }
}

/**
 * Универсальная функция транскрибации, которая выбирает провайдера
 */
export async function transcribeAudio(
  fileBuffer: Buffer,
  filename: string,
  provider: TranscriptionProvider = TranscriptionProvider.OPENAI_WHISPER,
  language?: string
): Promise<string> {
  // Проверяем размер файла (не больше 25 МБ)
  const maxSizeBytes = 25 * 1024 * 1024; // 25 МБ в байтах
  if (fileBuffer.length > maxSizeBytes) {
    throw new Error(`Размер файла превышает 25 МБ (текущий размер: ${(fileBuffer.length / (1024 * 1024)).toFixed(2)} МБ)`);
  }
  
  switch (provider) {
    case TranscriptionProvider.OPENAI_WHISPER:
      return transcribeWithWhisper(fileBuffer, filename, language);
    case TranscriptionProvider.YANDEX_SPEECHKIT:
      return transcribeWithSpeechKit(fileBuffer, filename, language);
    default:
      throw new Error(`Неизвестный провайдер транскрибации: ${provider}`);
  }
}

/**
 * Полный процесс обработки аудиофайла: транскрибация и обработка текста
 */
export async function processAudioFile(
  fileBuffer: Buffer,
  filename: string,
  transcriptionProvider: TranscriptionProvider = TranscriptionProvider.OPENAI_WHISPER,
  textProcessingModel: TextProcessingModel = TextProcessingModel.OPENAI,
  language?: string
): Promise<{ transcript: string, processedText: string }> {
  // Сначала транскрибируем аудио
  const transcript = await transcribeAudio(fileBuffer, filename, transcriptionProvider, language);
  
  // Затем обрабатываем полученный текст
  const processedText = await processTextWithAI(transcript, textProcessingModel);
  
  return { transcript, processedText };
}