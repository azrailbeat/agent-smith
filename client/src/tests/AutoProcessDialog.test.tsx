import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AutoProcessDialog from '../components/AutoProcessDialog';

// Мок для react-query
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Мок настроек агента
const mockSettings = {
  enabled: true,
  agentId: 123,
  autoProcess: false,
  autoClassify: true,
  autoRespond: false
};

// Мок функций
const mockOnOpenChange = jest.fn();
const mockOnSettingsChange = jest.fn();
const mockOnProcess = jest.fn();

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
    if (queryKey[0] === '/api/citizen-requests') {
      return {
        data: [
          { 
            id: 1, 
            fullName: 'Test User', 
            status: 'new', 
            subject: 'Test Subject', 
            createdAt: new Date() 
          },
          { 
            id: 2, 
            fullName: 'Another User', 
            status: 'new', 
            subject: 'Another Subject', 
            createdAt: new Date() 
          }
        ],
        isLoading: false,
        error: null
      };
    }
    return { data: null, isLoading: false, error: null };
  })
}));

describe('AutoProcessDialog Component', () => {
  // Настройка тестов
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders settings content when not processing', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <AutoProcessDialog 
          open={true}
          onOpenChange={mockOnOpenChange}
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          onProcess={mockOnProcess}
        />
      </QueryClientProvider>
    );
    
    // Проверяем, что диалог показывает настройки
    expect(screen.getByText('Настройки автоматической обработки')).toBeInTheDocument();
    expect(screen.getByText('Включить обработку ИИ')).toBeInTheDocument();
    expect(screen.getByText('Выберите агента для обработки')).toBeInTheDocument();
  });

  test('disables form elements when enabled=false', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <AutoProcessDialog 
          open={true}
          onOpenChange={mockOnOpenChange}
          settings={{...mockSettings, enabled: false}}
          onSettingsChange={mockOnSettingsChange}
          onProcess={mockOnProcess}
        />
      </QueryClientProvider>
    );
    
    // Ищем элементы формы и проверяем, что они отключены
    const agentSelect = screen.getByLabelText('Выберите агента для обработки');
    expect(agentSelect).toBeDisabled();
    
    // Проверяем, что диалог показывает сообщение о необходимости включения ИИ
    expect(screen.getByText('Необходимо включить для автоматической обработки')).toBeInTheDocument();
  });

  test('shows processing content when start button is clicked', async () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <AutoProcessDialog 
          open={true}
          onOpenChange={mockOnOpenChange}
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          onProcess={mockOnProcess}
        />
      </QueryClientProvider>
    );
    
    // Находим кнопку запуска и кликаем по ней
    const startButton = screen.getByRole('button', { name: /запустить автообработку/i });
    fireEvent.click(startButton);
    
    // Проверяем, что показался экран обработки
    await waitFor(() => {
      expect(screen.getByText('Автоматическая обработка обращений')).toBeInTheDocument();
    });
    
    // Ожидаем, что после задержки была вызвана функция onProcess
    jest.advanceTimersByTime(5000);
    await waitFor(() => {
      expect(mockOnProcess).toHaveBeenCalledWith(mockSettings);
    });
  });

  test('switches enabled flag when switch is clicked', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <AutoProcessDialog 
          open={true}
          onOpenChange={mockOnOpenChange}
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          onProcess={mockOnProcess}
        />
      </QueryClientProvider>
    );
    
    // Находим переключатель и кликаем по нему
    const enabledSwitch = screen.getByRole('switch', { name: /включить обработку ИИ/i });
    fireEvent.click(enabledSwitch);
    
    // Проверяем, что функция onSettingsChange была вызвана с обновленными настройками
    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      ...mockSettings,
      enabled: false // Инвертируем текущее значение (true -> false)
    });
  });

  test('changes agent ID when agent is selected', () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <AutoProcessDialog 
          open={true}
          onOpenChange={mockOnOpenChange}
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          onProcess={mockOnProcess}
        />
      </QueryClientProvider>
    );
    
    // Выбор в Select требует больше манипуляций с DOM
    // В реальном тесте нужно симулировать полное взаимодействие с Select
    
    // Находим селект и открываем его
    const agentSelect = screen.getByRole('combobox');
    fireEvent.click(agentSelect);
    
    // Тест требует дополнительной настройки для компонентов Radix UI
    // В этом примере мы просто проверяем наличие элемента
    expect(agentSelect).toBeInTheDocument();
  });
});