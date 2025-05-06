/**
 * API маршруты для модуля протоколов заседаний
 */
import express, { Router } from 'express';
import { 
  getMeetings, 
  getMeetingById, 
  createMeeting, 
  updateMeeting,
  generateProtocol,
  saveToBlockchain
} from './controllers/meeting-protocols';

export function registerMeetingRoutes(app: express.Express): void {
  const router = Router();

  // Получение списка всех протоколов заседаний
  router.get('/api/meetings', getMeetings);
  
  // Получение протокола заседания по ID
  router.get('/api/meetings/:id', getMeetingById);
  
  // Создание нового протокола заседания
  router.post('/api/meetings', createMeeting);
  
  // Обновление протокола заседания
  router.patch('/api/meetings/:id', updateMeeting);
  
  // Генерация протокола заседания с помощью AI
  router.post('/api/meetings/:id/protocol', generateProtocol);
  
  // Сохранение протокола в блокчейне
  router.post('/api/meetings/:id/blockchain', saveToBlockchain);
  
  // Логируем все маршруты при запуске
  console.log('Регистрация маршрутов API для протоколов заседаний');
  
  // Добавляем маршруты к приложению
  app.use(router);
}