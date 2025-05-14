/**
 * API-клиент для взаимодействия с бэкендом
 */
import axios from 'axios';

// Создаем инстанс axios с базовыми настройками
const apiClient = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string>;
}

/**
 * Универсальная функция для выполнения API-запросов
 */
export async function apiRequest<T = any>(
  endpoint: string, 
  options: RequestOptions = {}
): Promise<T> {
  try {
    const { method = 'GET', params, data, headers } = options;
    
    const response = await apiClient({
      method,
      url: endpoint,
      params,
      data,
      headers,
    });
    
    return response.data;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    
    if (axios.isAxiosError(error)) {
      // Формируем информативное сообщение об ошибке
      const errorMessage = error.response?.data?.message || error.message;
      const status = error.response?.status;
      
      throw new Error(`API Error (${status}): ${errorMessage}`);
    }
    
    throw error;
  }
}

/**
 * Обработчик ошибок API
 */
export function handleApiError(error: any): { message: string; status?: number } {
  console.error('API Error:', error);
  
  if (axios.isAxiosError(error)) {
    return {
      message: error.response?.data?.message || error.message,
      status: error.response?.status,
    };
  }
  
  return {
    message: error.message || 'Неизвестная ошибка',
  };
}