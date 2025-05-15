#!/bin/bash

# Скрипт для запуска сервера с включенным сборщиком мусора
# Это позволяет использовать global.gc() в коде для принудительной очистки памяти

# Запуск в режиме разработки с флагом --expose-gc
NODE_ENV=development node --expose-gc ./node_modules/.bin/tsx server/index.ts