#!/bin/bash

# Устанавливаем цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Заголовок
echo -e "${YELLOW}===========================================================${NC}"
echo -e "${YELLOW}     ЗАПУСК ИНТЕГРАЦИОННЫХ ТЕСТОВ ДЛЯ СИСТЕМЫ AGENT SMITH     ${NC}"
echo -e "${YELLOW}===========================================================${NC}"

# Функция для запуска теста и вывода результата
run_test() {
  test_file=$1
  test_name=$2
  
  echo -e "\n${YELLOW}Запуск теста: ${test_name}${NC}"
  npx jest $test_file --verbose
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Тест успешно пройден: ${test_name}${NC}"
    return 0
  else
    echo -e "${RED}Тест не пройден: ${test_name}${NC}"
    return 1
  fi
}

# Создаем массив тестов
declare -a tests=(
  "tests/api.test.ts:Базовые API тесты"
  "tests/citizen-request-process.test.ts:Тесты обработки обращений граждан"
  "tests/blockchain-activity-integration.test.ts:Тесты интеграции блокчейн и активности"
  "tests/organizational-structure.test.ts:Тесты организационной структуры"
  "tests/auto-process-report.test.ts:Тесты автоматической обработки и отчетов"
  "tests/agent-service-integration.test.ts:Тесты интеграции сервиса агентов"
  "tests/activity-history-audit.test.ts:Тесты аудита и истории активности"
)

# Инициализируем счетчики
total_tests=${#tests[@]}
passed_tests=0
failed_tests=0

# Запускаем все тесты
for test in "${tests[@]}"; do
  IFS=':' read -r file name <<< "$test"
  run_test "$file" "$name"
  if [ $? -eq 0 ]; then
    passed_tests=$((passed_tests+1))
  else
    failed_tests=$((failed_tests+1))
  fi
done

# Выводим сводную информацию
echo -e "\n${YELLOW}===========================================================${NC}"
echo -e "${YELLOW}                 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ                  ${NC}"
echo -e "${YELLOW}===========================================================${NC}"
echo -e "Всего тестов: ${total_tests}"
echo -e "${GREEN}Успешно пройдено: ${passed_tests}${NC}"
echo -e "${RED}Не пройдено: ${failed_tests}${NC}"

# Определяем общий результат
if [ $failed_tests -eq 0 ]; then
  echo -e "\n${GREEN}ВСЕ ТЕСТЫ УСПЕШНО ПРОЙДЕНЫ!${NC}"
  exit 0
else
  echo -e "\n${RED}ВНИМАНИЕ: НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОЙДЕНЫ!${NC}"
  exit 1
fi