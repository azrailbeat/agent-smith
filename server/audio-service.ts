/**
 * Сервис для обработки аудиофайлов и транскрибации
 */
import axios from 'axios';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logActivity } from './activity-logger';

// Enum для провайдеров транскрибации
export enum TranscriptionProvider {
  OPENAI_WHISPER = 'whisper',
  YANDEX_SPEECHKIT = 'speechkit'
}

// Enum для моделей обработки текста
export enum TextProcessingModel {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  VLLM = 'vllm',
  GOOGLE = 'google',
  HUGGINGFACE = 'huggingface'
}

// Интерфейс для опций транскрибации
interface TranscriptionOptions {
  language?: string;
  prompt?: string;
}

// Создаем клиенты для API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Транскрибирует аудиофайл с использованием OpenAI Whisper
 */
export async function transcribeWithWhisper(
  fileBuffer: Buffer, 
  options: TranscriptionOptions = {}
): Promise<string> {
  try {
    // В Node.js среде мы не можем использовать конструктор File (он доступен только в браузере)
    // Вместо этого OpenAI API принимает Buffer напрямую
    const transcription = await openai.audio.transcriptions.create({
      file: fileBuffer,
      model: 'whisper-1',
      language: options.language,
      prompt: options.prompt
    });
    
    return transcription.text;
  } catch (error) {
    console.error('Ошибка при транскрибации с Whisper:', error);
    throw new Error(`Ошибка при транскрибации с Whisper: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Транскрибирует аудиофайл с использованием Yandex SpeechKit
 */
export async function transcribeWithSpeechKit(
  fileBuffer: Buffer, 
  options: TranscriptionOptions = {}
): Promise<string> {
  try {
    // Проверяем наличие API-ключа
    const speechKitApiKey = process.env.YANDEX_SPEECHKIT_API_KEY;
    if (!speechKitApiKey) {
      throw new Error('Отсутствует API-ключ Yandex SpeechKit');
    }
    
    // Настраиваем запрос к API Yandex SpeechKit
    const url = 'https://stt.api.cloud.yandex.net/speech/v1/stt:recognize';
    const params = {
      lang: options.language || 'ru-RU',
      format: 'lpcm',
      sampleRateHertz: 48000,
    };
    
    const headers = {
      Authorization: `Api-Key ${speechKitApiKey}`,
      'Content-Type': 'application/octet-stream'
    };
    
    // Отправляем запрос
    const response = await axios.post(url, fileBuffer, { 
      params, 
      headers 
    });
    
    // Проверяем результат
    if (response.status !== 200 || !response.data.result) {
      throw new Error(`Ошибка при запросе к Yandex SpeechKit: ${response.statusText}`);
    }
    
    return response.data.result;
  } catch (error) {
    console.error('Ошибка при транскрибации с SpeechKit:', error);
    throw new Error(`Ошибка при транскрибации с SpeechKit: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Обрабатывает текст с использованием выбранной модели ИИ
 */
export async function processTextWithAI(
  text: string,
  model: TextProcessingModel = TextProcessingModel.OPENAI
): Promise<string> {
  try {
    switch (model) {
      case TextProcessingModel.OPENAI:
        return await processWithOpenAI(text);
      case TextProcessingModel.ANTHROPIC:
        return await processWithAnthropic(text);
      case TextProcessingModel.VLLM:
      case TextProcessingModel.GOOGLE:
      case TextProcessingModel.HUGGINGFACE:
        // Заглушка для других моделей - в реальном приложении здесь была бы интеграция
        // с соответствующими API
        return `Обработка текста с использованием ${model} будет реализована в следующих версиях`;
      default:
        throw new Error(`Неподдерживаемая модель обработки текста: ${model}`);
    }
  } catch (error) {
    console.error(`Ошибка при обработке текста с использованием ${model}:`, error);
    throw new Error(`Ошибка при обработке текста: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Обработка текста с использованием OpenAI API
 */
async function processWithOpenAI(text: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    messages: [
      {
        role: "system",
        content: `Ты - помощник для создания протоколов встреч. Проанализируй транскрипцию встречи и создай структурированный протокол. Выдели:
        1. Краткое резюме встречи (до 200 слов)
        2. Ключевые решения, принятые на встрече (начинай каждый пункт с "Решение:")
        3. Задачи, которые нужно выполнить (начинай с "Задача:")
        
        Пиши на том же языке, что и транскрипция. Сохраняй профессиональный тон.`
      },
      {
        role: "user",
        content: text
      }
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });
  
  return completion.choices[0].message.content || '';
}

/**
 * Обработка текста с использованием Anthropic API
 */
async function processWithAnthropic(text: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
    max_tokens: 2000,
    system: `Ты - помощник для создания протоколов встреч. Проанализируй транскрипцию встречи и создай структурированный протокол. Выдели:
    1. Краткое резюме встречи (до 200 слов)
    2. Ключевые решения, принятые на встрече (начинай каждый пункт с "Решение:")
    3. Задачи, которые нужно выполнить (начинай с "Задача:")
    
    Пиши на том же языке, что и транскрипция. Сохраняй профессиональный тон.`,
    messages: [
      {
        role: "user",
        content: text
      }
    ],
    temperature: 0.7,
  });
  
  return message.content[0].text || '';
}

/**
 * Универсальная функция транскрибации, которая выбирает провайдера
 */
export async function transcribeAudio(
  fileBuffer: Buffer,
  options: TranscriptionOptions = {},
  provider: TranscriptionProvider = TranscriptionProvider.OPENAI_WHISPER
): Promise<string> {
  switch (provider) {
    case TranscriptionProvider.OPENAI_WHISPER:
      return await transcribeWithWhisper(fileBuffer, options);
    case TranscriptionProvider.YANDEX_SPEECHKIT:
      return await transcribeWithSpeechKit(fileBuffer, options);
    default:
      throw new Error(`Неподдерживаемый провайдер транскрибации: ${provider}`);
  }
}

/**
 * Полный процесс обработки аудиофайла: транскрибация и обработка текста
 */
export async function processAudioFile(
  fileBuffer: Buffer,
  options: TranscriptionOptions = {},
  transcriptionProvider: TranscriptionProvider = TranscriptionProvider.OPENAI_WHISPER,
  textProcessingModel: TextProcessingModel = TextProcessingModel.OPENAI
): Promise<{ transcript: string, processedText: string }> {
  try {
    // Шаг 1: Транскрибация
    const transcript = await transcribeAudio(fileBuffer, options, transcriptionProvider);
    
    // Шаг 2: Обработка текста
    const processedText = await processTextWithAI(transcript, textProcessingModel);
    
    // Возвращаем оба результата
    return {
      transcript,
      processedText
    };
  } catch (error) {
    console.error('Ошибка при обработке аудиофайла:', error);
    throw new Error(`Ошибка при обработке аудиофайла: ${error.message || 'Unknown error'}`);
  }
}