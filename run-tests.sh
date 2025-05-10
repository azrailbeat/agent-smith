#!/bin/bash

# Определяем цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting test suite for Agent Smith Platform${NC}"
echo "=============================================="

# Функция для запуска тестов в определенной категории
run_test_category() {
  local category=$1
  local test_file=$2
  
  echo -e "${YELLOW}Running ${category} tests...${NC}"
  NODE_ENV=test npx jest ${test_file} --forceExit
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ ${category} tests passed${NC}"
    return 0
  else
    echo -e "${RED}✗ ${category} tests failed${NC}"
    return 1
  fi
}

# Запускаем тесты в определенном порядке
run_repository_tests() {
  run_test_category "Repository" "tests/repositories.test.js"
  return $?
}

run_service_tests() {
  run_test_category "Service" "tests/services.test.js"
  return $?
}

run_api_tests() {
  run_test_category "API" "tests/api.test.js"
  return $?
}

run_integration_tests() {
  run_test_category "Integration" "tests/integration.test.js"
  return $?
}

run_performance_tests() {
  run_test_category "Performance" "tests/performance.test.js"
  return $?
}

# Определяем успешность тестов
REPO_SUCCESS=0
SERVICE_SUCCESS=0
API_SUCCESS=0
INTEGRATION_SUCCESS=0
PERFORMANCE_SUCCESS=0

# Запускаем тесты и сохраняем результаты
run_repository_tests
REPO_SUCCESS=$?

run_service_tests
SERVICE_SUCCESS=$?

run_api_tests
API_SUCCESS=$?

run_integration_tests
INTEGRATION_SUCCESS=$?

run_performance_tests
PERFORMANCE_SUCCESS=$?

# Выводим итоговый результат
echo "=============================================="
echo -e "${YELLOW}Test Results Summary:${NC}"
echo "=============================================="

if [ $REPO_SUCCESS -eq 0 ]; then
  echo -e "${GREEN}✓ Repository tests: PASS${NC}"
else
  echo -e "${RED}✗ Repository tests: FAIL${NC}"
fi

if [ $SERVICE_SUCCESS -eq 0 ]; then
  echo -e "${GREEN}✓ Service tests: PASS${NC}"
else
  echo -e "${RED}✗ Service tests: FAIL${NC}"
fi

if [ $API_SUCCESS -eq 0 ]; then
  echo -e "${GREEN}✓ API tests: PASS${NC}"
else
  echo -e "${RED}✗ API tests: FAIL${NC}"
fi

if [ $INTEGRATION_SUCCESS -eq 0 ]; then
  echo -e "${GREEN}✓ Integration tests: PASS${NC}"
else
  echo -e "${RED}✗ Integration tests: FAIL${NC}"
fi

if [ $PERFORMANCE_SUCCESS -eq 0 ]; then
  echo -e "${GREEN}✓ Performance tests: PASS${NC}"
else
  echo -e "${RED}✗ Performance tests: FAIL${NC}"
fi

echo "=============================================="

# Определяем общий результат
TOTAL_SUCCESS=$(( $REPO_SUCCESS + $SERVICE_SUCCESS + $API_SUCCESS + $INTEGRATION_SUCCESS + $PERFORMANCE_SUCCESS ))

if [ $TOTAL_SUCCESS -eq 0 ]; then
  echo -e "${GREEN}All tests passed successfully!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. Please check the output above for details.${NC}"
  exit 1
fi