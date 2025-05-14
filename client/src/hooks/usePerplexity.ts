/**
 * Хук для удобного использования Perplexity API в компонентах
 */
import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { perplexityService } from '../services/perplexityService';

interface UsePerplexityOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function usePerplexity(options: UsePerplexityOptions = {}) {
  const [isApiAvailable, setIsApiAvailable] = useState<boolean | null>(null);
  const { onSuccess, onError } = options;

  // Мутация для проверки доступности API
  const checkStatusMutation = useMutation({
    mutationFn: () => perplexityService.checkApiStatus(),
    onSuccess: (data) => {
      setIsApiAvailable(data.available);
    },
    onError: (error) => {
      setIsApiAvailable(false);
      if (onError) onError(error as Error);
    },
  });

  // Мутация для генерации текста
  const generateTextMutation = useMutation({
    mutationFn: ({
      prompt,
      systemPrompt,
      model,
      temperature,
    }: {
      prompt: string;
      systemPrompt?: string;
      model?: string;
      temperature?: number;
    }) => perplexityService.generateText(prompt, systemPrompt, model, temperature),
    onSuccess: (data) => {
      if (onSuccess) onSuccess(data);
    },
    onError: (error) => {
      if (onError) onError(error as Error);
    },
  });

  // Мутация для анализа текста
  const analyzeTextMutation = useMutation({
    mutationFn: ({
      text,
      task,
      model,
    }: {
      text: string;
      task: string;
      model?: string;
    }) => perplexityService.analyzeText(text, task, model),
    onSuccess: (data) => {
      if (onSuccess) onSuccess(data);
    },
    onError: (error) => {
      if (onError) onError(error as Error);
    },
  });

  // Мутация для саммаризации документа
  const summarizeDocumentMutation = useMutation({
    mutationFn: ({
      document,
      model,
    }: {
      document: string;
      model?: string;
    }) => perplexityService.summarizeDocument(document, model),
    onSuccess: (data) => {
      if (onSuccess) onSuccess(data);
    },
    onError: (error) => {
      if (onError) onError(error as Error);
    },
  });

  // Мутация для ответа на вопрос
  const answerQuestionMutation = useMutation({
    mutationFn: ({
      question,
      contextData,
      model,
    }: {
      question: string;
      contextData: any;
      model?: string;
    }) => perplexityService.answerDataQuestion(question, contextData, model),
    onSuccess: (data) => {
      if (onSuccess) onSuccess(data);
    },
    onError: (error) => {
      if (onError) onError(error as Error);
    },
  });

  // Функция для проверки доступности API
  const checkApiStatus = useCallback(() => {
    checkStatusMutation.mutate();
  }, [checkStatusMutation]);

  // Функция для генерации текста
  const generateText = useCallback(
    (prompt: string, systemPrompt?: string, model?: string, temperature?: number) => {
      generateTextMutation.mutate({ prompt, systemPrompt, model, temperature });
    },
    [generateTextMutation]
  );

  // Функция для анализа текста
  const analyzeText = useCallback(
    (text: string, task: string, model?: string) => {
      analyzeTextMutation.mutate({ text, task, model });
    },
    [analyzeTextMutation]
  );

  // Функция для саммаризации документа
  const summarizeDocument = useCallback(
    (document: string, model?: string) => {
      summarizeDocumentMutation.mutate({ document, model });
    },
    [summarizeDocumentMutation]
  );

  // Функция для ответа на вопрос
  const answerQuestion = useCallback(
    (question: string, contextData: any, model?: string) => {
      answerQuestionMutation.mutate({ question, contextData, model });
    },
    [answerQuestionMutation]
  );

  return {
    isApiAvailable,
    checkApiStatus,
    generateText,
    analyzeText,
    summarizeDocument,
    answerQuestion,
    generateTextStatus: {
      isLoading: generateTextMutation.isPending,
      isError: generateTextMutation.isError,
      error: generateTextMutation.error,
      data: generateTextMutation.data,
    },
    analyzeTextStatus: {
      isLoading: analyzeTextMutation.isPending,
      isError: analyzeTextMutation.isError,
      error: analyzeTextMutation.error,
      data: analyzeTextMutation.data,
    },
    summarizeDocumentStatus: {
      isLoading: summarizeDocumentMutation.isPending,
      isError: summarizeDocumentMutation.isError,
      error: summarizeDocumentMutation.error,
      data: summarizeDocumentMutation.data,
    },
    answerQuestionStatus: {
      isLoading: answerQuestionMutation.isPending,
      isError: answerQuestionMutation.isError,
      error: answerQuestionMutation.error,
      data: answerQuestionMutation.data,
    },
    statusCheckStatus: {
      isLoading: checkStatusMutation.isPending,
      isError: checkStatusMutation.isError,
      error: checkStatusMutation.error,
      data: checkStatusMutation.data,
    },
  };
}