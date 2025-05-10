// Скрипт запуска сервера для Replit
// Этот файл запускает приложение с настройками, необходимыми для среды Replit

// Запускаем сервер через npx tsx (TypeScript Execute)
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

console.log('Запуск сервера Agent Smith...');
console.log('Настройка: прослушивание на 0.0.0.0:5000');

// Запускаем сервер с настройками для разработки
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  env: { ...process.env, NODE_ENV: 'development' },
  stdio: 'inherit'
});

server.on('error', (err) => {
  console.error('Ошибка запуска сервера:', err);
});

console.log('Сервер запущен. Доступ: https://agent-smith.replit.app');