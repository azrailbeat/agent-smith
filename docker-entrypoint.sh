#!/bin/sh
set -e

# Функция проверки подключения к базе данных
wait_for_db() {
  echo "Проверка подключения к базе данных..."
  
  # Если используется переменная DATABASE_URL
  if [ -n "$DATABASE_URL" ]; then
    HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
    PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  else
    # Иначе используем отдельные переменные
    HOST=$PGHOST
    PORT=$PGPORT
  fi
  
  # Ожидание доступности базы данных
  until nc -z -v -w5 $HOST $PORT; do
    echo "Ожидание базы данных на $HOST:$PORT..."
    sleep 1
  done
  
  echo "База данных доступна!"
}

# Запуск синхронизации с eOtinish, если указаны все необходимые переменные
run_eotinish_sync() {
  if [ -n "$EOTINISH_API_URL" ] && [ -n "$EOTINISH_API_KEY" ]; then
    echo "Запуск первичной синхронизации с eOtinish..."
    node ./dist/server/scripts/sync-eotinish.js
    echo "Синхронизация с eOtinish завершена"
  else
    echo "Переменные окружения для интеграции с eOtinish не настроены. Пропуск синхронизации."
  fi
}

# Создание базовых индексов векторной БД, если указан тип
setup_vector_db() {
  if [ "$VECTOR_DB_TYPE" = "qdrant" ] || [ "$VECTOR_DB_TYPE" = "milvus" ]; then
    echo "Инициализация векторной базы данных ($VECTOR_DB_TYPE)..."
    node ./dist/server/scripts/init-vector-db.js
    echo "Векторная БД инициализирована"
  fi
}

# Основная логика запуска
echo "Запуск Agent Smith в контейнере..."

# Проверка наличия базы данных и ожидание её доступности
wait_for_db

# Применение миграций базы данных
echo "Применение миграций базы данных..."
npm run db:push

# Настройка векторной базы данных
setup_vector_db

# Синхронизация с eOtinish
run_eotinish_sync

# Запуск основного приложения
echo "Запуск основного приложения Agent Smith..."
exec "$@"