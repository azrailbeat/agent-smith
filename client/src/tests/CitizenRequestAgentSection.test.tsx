import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CitizenRequestAgentSection from '../components/CitizenRequestAgentSection';

// Мок для react-query
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Мок данных обращения
const mockRequest = {
  id: 1,
  fullName: "Тестовый Пользователь",
  contactInfo: "test@example.com",
  requestType: "Обращение",
  subject: "Тестовое обращение",
  description: "Описание тестового обращения",
  status: "new",
  priority: "medium" as const,
  aiProcessed: false,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Мок функции обработки
const mockProcessFunction = jest.fn();

// Мок настроек агента
const mockAgentSettings = {
  enabled: true,
  agentId: 123,
  autoProcess: false,
  autoClassify: true,
  autoRespond: false
};

// Мок для react-query хука useQuery
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn().mockImplementation(({ queryKey }) => {
    if (queryKey[0] === '/api/agents') {
      return {
        data: [
          { id: 123, name: 'TestAgent', type: 'citizen_requests', description: 'Test Agent' },
          { id: 456, name: 'AnotherAgent', type: 'citizen_requests', description: 'Another Agent' }
        ],
        isLoading: false,
        error: null
      };
    }
    return { data: null, isLoading: false, error: null };
  })
}));

describe('CitizenRequestAgentSection Component', () => {
  // Настройка тестов
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders disabled state when enabled=false', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <CitizenRequestAgentSection 
          request={mockRequest}
          enabled={false}
          onProcess={mockProcessFunction}
        />
      </QueryClientProvider>
    );
    
    // Проверяем, что компонент показывает сообщение о выключенном ИИ
    expect(screen.getByText('ИИ-обработка отключена')).toBeInTheDocument();
  });

  test('renders loading state when agents are loading', () => {
    // Переопределяем мок для этого теста
    require('@tanstack/react-query').useQuery.mockImplementationOnce(() => ({
      data: [],
      isLoading: true,
      error: null
    }));

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <CitizenRequestAgentSection 
          request={mockRequest}
          enabled={true}
          onProcess={mockProcessFunction}
        />
      </QueryClientProvider>
    );
    
    // Проверяем, что компонент показывает загрузку
    expect(screen.getByText('Загрузка агентов...')).toBeInTheDocument();
  });

  test('renders empty state when no agents available', () => {
    // Переопределяем мок для этого теста
    require('@tanstack/react-query').useQuery.mockImplementationOnce(() => ({
      data: [],
      isLoading: false,
      error: null
    }));

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <CitizenRequestAgentSection 
          request={mockRequest}
          enabled={true}
          onProcess={mockProcessFunction}
        />
      </QueryClientProvider>
    );
    
    // Проверяем, что компонент показывает сообщение об отсутствии агентов
    expect(screen.getByText('Нет доступных агентов')).toBeInTheDocument();
  });

  test('processes request when button is clicked', async () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <CitizenRequestAgentSection 
          request={mockRequest}
          enabled={true}
          onProcess={mockProcessFunction}
          agentSettings={mockAgentSettings}
        />
      </QueryClientProvider>
    );
    
    // Находим кнопку и кликаем по ней
    const processButton = screen.getByRole('button', { name: /классифицировать|создать резюме|сформировать ответ/i });
    fireEvent.click(processButton);
    
    // Проверяем, что функция обработки была вызвана с правильными параметрами
    await waitFor(() => {
      expect(mockProcessFunction).toHaveBeenCalledWith(mockRequest.id, expect.any(String));
    });
  });

  test('shows already processed message when aiProcessed=true', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <CitizenRequestAgentSection 
          request={{...mockRequest, aiProcessed: true}}
          enabled={true}
          onProcess={mockProcessFunction}
        />
      </QueryClientProvider>
    );
    
    // Проверяем, что компонент показывает сообщение о предыдущей обработке
    expect(screen.getByText(/это обращение уже было обработано с помощью ИИ/i)).toBeInTheDocument();
  });
});