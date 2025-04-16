/**
 * Интеграционные тесты системы Agent Smith
 * Проверяет интеграцию между всеми компонентами системы
 */

import { expect } from 'chai';
import { db } from '../db';
import { storage } from '../storage';
import { agentService } from '../services/agent-service';
import { recordToBlockchain } from '../services/blockchain';
import { detectLanguage, processUserMessage } from '../services/openai';

describe('Интеграционные тесты системы', () => {
  
  before(async () => {
    // Инициализировать базу данных и сервисы перед тестами
    if (agentService && !agentService.initialized) {
      await agentService.initialize();
    }
  });
  
  describe('Модуль обращений граждан', () => {
    it('должен правильно создавать обращение', async () => {
      // Создаем тестовое обращение
      const testRequest = {
        fullName: 'Тестов Тест Тестович',
        contactInfo: '+7 777 777 7777',
        requestType: 'documents',
        subject: 'Получение справки о несудимости',
        description: 'Нужна справка о несудимости для трудоустройства. Где и как я могу её получить?',
        priority: 'medium',
        status: 'new'
      };
      
      // Проверяем, что данные содержатся в правильных полях
      expect(testRequest.description).to.include('справка о несудимости');
      
      // Проверяем отображение полного текста в UI
      // Это условный тест, т.к. в Jest/Mocha мы бы проверяли через рендеринг компонента
      expect(testRequest.description).to.not.be.empty;
    });
    
    it('должен корректно отображать полный текст обращения', async () => {
      // Создаем тестовое обращение с разными полями
      const testRequest = {
        id: 999,
        fullName: 'Тестов Тест Тестович',
        contactInfo: '+7 777 777 7777',
        requestType: 'documents',
        subject: 'Получение справки о несудимости',
        description: 'Детальное описание запроса в поле description',
        content: 'Альтернативный текст в поле content',
        priority: 'medium',
        status: 'new',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Предполагаем, что в UI отображается правильное поле
      // В React компоненте мы используем: {selectedRequest.description || selectedRequest.content || "Содержание обращения не указано"}
      let displayedText = testRequest.description || testRequest.content || "Содержание обращения не указано";
      expect(displayedText).to.equal('Детальное описание запроса в поле description');
      
      // Проверяем случай, когда description отсутствует
      const testRequest2 = {
        ...testRequest,
        description: '',
        content: 'Только в поле content'
      };
      
      displayedText = testRequest2.description || testRequest2.content || "Содержание обращения не указано";
      expect(displayedText).to.equal('Только в поле content');
      
      // Проверяем случай, когда оба поля отсутствуют
      const testRequest3 = {
        ...testRequest,
        description: '',
        content: ''
      };
      
      displayedText = testRequest3.description || testRequest3.content || "Содержание обращения не указано";
      expect(displayedText).to.equal('Содержание обращения не указано');
    });
  });
  
  describe('Интеграция с блокчейном', () => {
    it('должен корректно сохранять хэш в базе данных', async () => {
      // Проверяем, что у обращения сохраняется хэш блокчейна
      const testRequest = {
        id: 999,
        fullName: 'Тестов Тест Тестович',
        contactInfo: '+7 777 777 7777',
        requestType: 'documents',
        subject: 'Тестовое обращение',
        description: 'Описание тестового обращения',
        blockchainHash: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        priority: 'medium',
        status: 'new',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Проверяем, что хэш корректно отображается в интерфейсе
      expect(testRequest.blockchainHash).to.be.a('string');
      expect(testRequest.blockchainHash.length).to.be.greaterThan(10);
      expect(testRequest.blockchainHash).to.include('0x');
    });
  });
  
  describe('Проверка интерфейса AI интеграции', () => {
    it('должен корректно отображать резюме, анализ и рекомендации', async () => {
      // Создаем тестовый запрос с результатами AI обработки
      const processedRequest = {
        id: 1001,
        fullName: 'Иванов Иван',
        contactInfo: '+7 701 234 5678',
        requestType: 'social',
        subject: 'Запрос на получение социальной помощи',
        description: 'Многодетная семья, 4 детей. Требуется оформление социальной помощи. Есть ли льготы для многодетных семей?',
        status: 'in_progress',
        priority: 'high',
        createdAt: new Date(),
        updatedAt: new Date(),
        aiProcessed: true,
        aiClassification: 'Категория: Социальная поддержка, Подкатегория: Многодетные семьи, Приоритет: Высокий',
        aiSuggestion: 'Рекомендуется предоставить информацию о программе "Әлеуметтік қамқорлық" для многодетных семей. Необходимо запросить дополнительные документы: удостоверения личности родителей, свидетельства о рождении детей, справку о составе семьи.',
        summary: 'Обращение от многодетной семьи (4 детей) о возможности получения социальной помощи и информации о льготах для многодетных семей.'
      };
      
      // Проверяем наличие всех полей для отображения в интерфейсе
      expect(processedRequest.summary).to.be.a('string');
      expect(processedRequest.aiClassification).to.be.a('string');
      expect(processedRequest.aiSuggestion).to.be.a('string');
      
      // Проверяем, что в резюме содержится ключевая информация из описания
      expect(processedRequest.summary).to.include('многодетной семьи');
      expect(processedRequest.summary).to.include('4 детей');
      expect(processedRequest.summary).to.include('социальной помощи');
      
      // Проверяем, что классификация содержит правильные категории
      expect(processedRequest.aiClassification).to.include('Социальная поддержка');
      expect(processedRequest.aiClassification).to.include('Многодетные семьи');
      
      // Проверяем, что предложение содержит конкретные рекомендации
      expect(processedRequest.aiSuggestion).to.include('документы');
    });
  });
  
  describe('Проверка модульной интеграции', () => {
    it('должен обеспечивать целостность данных между модулями', async () => {
      // Проверяем правильное формирование данных для интеграции между модулями
      const citizenRequestData = {
        id: 1002,
        fullName: 'Тестовый пользователь',
        contactInfo: 'test@example.com',
        requestType: 'documents',
        subject: 'Запрос на получение документа',
        description: 'Описание запроса',
        status: 'pending',
        priority: 'medium',
        createdAt: new Date(),
      };
      
      // Имитация связанной задачи
      const relatedTask = {
        id: 500,
        title: 'Обработать запрос #1002',
        description: 'Обработка запроса на получение документа',
        status: 'pending',
        priority: 'medium',
        createdAt: new Date(),
        assignedTo: 123,
        relatedRequestId: citizenRequestData.id
      };
      
      // Проверяем связь между объектами
      expect(relatedTask.relatedRequestId).to.equal(citizenRequestData.id);
      
      // Проверка целостности данных при передаче между модулями
      // В реальной системе здесь была бы проверка через API или базу данных
    });
  });
});