# Agent Smith Platform - Dockerfile

# Этап сборки
FROM node:20-alpine AS builder

# Рабочая директория
WORKDIR /app

# Копирование файлов package.json и package-lock.json
COPY package*.json ./

# Установка зависимостей
RUN npm ci

# Копирование исходного кода
COPY . .

# Сборка проекта
RUN npm run build

# Этап production
FROM node:20-alpine AS production

# Рабочая директория
WORKDIR /app

# Метаданные образа
LABEL maintainer="Консорциум QOSI Platform и Bitmagic <azrail@obscura.kz>"
LABEL version="1.0.0"
LABEL description="Agent Smith - Суверенная AI-платформа для госсектора с интеграцией eOtinish"
LABEL vendor="Консорциум QOSI Platform и Bitmagic"
LABEL org.astana-hub.project="Agent Smith"
LABEL org.govtech.eOtinish.compatible="true"

# Установка дополнительных зависимостей для работы с документами
RUN apk add --no-cache \
    tzdata \
    ca-certificates \
    openssl \
    python3 \
    py3-pip \
    && pip3 install --no-cache-dir pdf2image pytesseract

# Создание необходимых директорий
RUN mkdir -p /app/uploads /app/logs /app/data/vector_db

# Копирование собранных файлов и зависимостей
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Оптимизация размера образа
RUN npm prune --production && \
    rm -rf /tmp/* /var/cache/apk/* && \
    npm cache clean --force

# Определение переменных окружения
ENV NODE_ENV=production
ENV PORT=5000
ENV TZ=Asia/Almaty

# Открываем порт
EXPOSE 5000

# Скрипт запуска с поддержкой интеграции eOtinish
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Создание тома для постоянных данных
VOLUME ["/app/data", "/app/uploads", "/app/logs"]

# Точка входа с начальной синхронизацией eOtinish
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start"]

# Инструкция по сборке:
# docker build -t agent-smith-platform .
# docker run -p 5000:5000 --env-file .env agent-smith-platform