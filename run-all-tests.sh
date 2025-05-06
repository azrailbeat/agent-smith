#!/bin/bash

# Цветной вывод
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${MAGENTA}=== ЗАПУСК ПОЛНОГО НАБОРА ТЕСТОВ AGENT SMITH ===${NC}"
echo -e "${BLUE}Начало тестирования системы в $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo

# Проверка, запущен ли сервер
echo -e "${BLUE}Проверка доступности сервера...${NC}"
curl -s http://localhost:5000/api/system/status > /dev/null
if [ $? -ne 0 ]; then
  echo -e "${RED}Ошибка: сервер не запущен на http://localhost:5000${NC}"
  echo -e "${YELLOW}Убедитесь, что сервер запущен перед выполнением тестов${NC}"
  exit 1
fi
echo -e "${GREEN}Сервер доступен${NC}"
echo

# Запуск API-тестов
echo -e "${MAGENTA}=== ЗАПУСК API-ТЕСТОВ ===${NC}"
node test-api.js
API_TESTS_RESULT=$?
echo

# Запуск интеграционных тестов
echo -e "${MAGENTA}=== ЗАПУСК ИНТЕГРАЦИОННЫХ ТЕСТОВ ===${NC}"
node test-integration.js
INTEGRATION_TESTS_RESULT=$?
echo

# Запуск специфичных тестов
echo -e "${MAGENTA}=== ЗАПУСК СПЕЦИФИЧНЫХ ТЕСТОВ ===${NC}"
node tests/agent-smith-specific-tests.js
SPECIFIC_TESTS_RESULT=$?
echo

# Запуск комплексных тестов (с таймаутом)
echo -e "${MAGENTA}=== ЗАПУСК КОМПЛЕКСНЫХ ТЕСТОВ (с таймаутом 60 секунд) ===${NC}"
timeout 60 node comprehensive-tests.js
COMPREHENSIVE_TESTS_RESULT=$?
if [ $COMPREHENSIVE_TESTS_RESULT -eq 124 ]; then
  echo -e "${YELLOW}Комплексные тесты были прерваны по таймауту${NC}"
  COMPREHENSIVE_TESTS_RESULT=1
fi
echo

# Итоговый результат
echo -e "${MAGENTA}=== ИТОГОВЫЕ РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ ===${NC}"
echo -e "API-тесты: $([ $API_TESTS_RESULT -eq 0 ] && echo -e "${GREEN}ПРОЙДЕНЫ${NC}" || echo -e "${RED}НЕ ПРОЙДЕНЫ${NC}")"
echo -e "Интеграционные тесты: $([ $INTEGRATION_TESTS_RESULT -eq 0 ] && echo -e "${GREEN}ПРОЙДЕНЫ${NC}" || echo -e "${RED}НЕ ПРОЙДЕНЫ${NC}")"
echo -e "Специфичные тесты: $([ $SPECIFIC_TESTS_RESULT -eq 0 ] && echo -e "${GREEN}ПРОЙДЕНЫ${NC}" || echo -e "${RED}НЕ ПРОЙДЕНЫ${NC}")"
echo -e "Комплексные тесты: $([ $COMPREHENSIVE_TESTS_RESULT -eq 0 ] && echo -e "${GREEN}ПРОЙДЕНЫ${NC}" || echo -e "${RED}НЕ ПРОЙДЕНЫ${NC}")"
echo

TOTAL_PASSED=$(( $API_TESTS_RESULT == 0 ? 1 : 0 ))
TOTAL_PASSED=$(( $TOTAL_PASSED + ($INTEGRATION_TESTS_RESULT == 0 ? 1 : 0) ))
TOTAL_PASSED=$(( $TOTAL_PASSED + ($SPECIFIC_TESTS_RESULT == 0 ? 1 : 0) ))
TOTAL_PASSED=$(( $TOTAL_PASSED + ($COMPREHENSIVE_TESTS_RESULT == 0 ? 1 : 0) ))

TOTAL_TESTS=4

echo -e "${MAGENTA}ИТОГО: $TOTAL_PASSED из $TOTAL_TESTS наборов тестов пройдены успешно${NC}"

if [ $TOTAL_PASSED -eq $TOTAL_TESTS ]; then
  echo -e "${GREEN}ВСЕ ТЕСТЫ УСПЕШНО ПРОЙДЕНЫ${NC}"
  echo -e "${GREEN}Система Agent Smith полностью функциональна и готова к использованию${NC}"
  exit 0
else
  echo -e "${YELLOW}Необходимо исправить ошибки в некоторых тестах${NC}"
  exit 1
fi