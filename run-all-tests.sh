#!/bin/bash

# Определяем цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================================${NC}"
echo -e "${YELLOW}      AGENT SMITH PLATFORM - COMPREHENSIVE TESTS      ${NC}"
echo -e "${BLUE}=======================================================${NC}"

# Проверка наличия файла jest.config.js
if [ ! -f jest.config.js ]; then
    echo -e "${RED}Error: jest.config.js not found!${NC}"
    echo "Make sure you are in the project root directory."
    exit 1
fi

# Проверка наличия тестовых файлов
if [ ! -d tests ]; then
    echo -e "${RED}Error: tests directory not found!${NC}"
    echo "Creating tests directory..."
    mkdir -p tests
fi

# Устанавливаем права на выполнение скрипта запуска тестов
chmod +x ./run-tests.sh

# Проверка окружения для тестов
echo -e "${YELLOW}Checking test environment...${NC}"
# Проверка, доступна ли база данных
if [ -n "$DATABASE_URL" ]; then
    echo -e "${GREEN}✓ Database connection is configured${NC}"
else
    echo -e "${RED}✗ DATABASE_URL is not set!${NC}"
    echo "Tests that require database may fail."
fi

# Проверка, доступны ли API ключи для внешних сервисов
if [ -n "$OPENAI_API_KEY" ]; then
    echo -e "${GREEN}✓ OpenAI API key is available${NC}"
else
    echo -e "${YELLOW}⚠ OPENAI_API_KEY is not set!${NC}"
    echo "Tests using OpenAI will use mock responses."
fi

if [ -n "$MORALIS_API_KEY" ]; then
    echo -e "${GREEN}✓ Moralis API key is available${NC}"
else
    echo -e "${YELLOW}⚠ MORALIS_API_KEY is not set!${NC}"
    echo "Tests using blockchain will use simulated responses."
fi

echo -e "${YELLOW}Preparing test environment...${NC}"
# Создаем тестовую базу данных или схему, если это необходимо
# NODE_ENV=test npm run db:prepare

echo -e "${BLUE}=======================================================${NC}"
echo -e "${YELLOW}Starting test suite...${NC}"
echo -e "${BLUE}=======================================================${NC}"

# Запускаем скрипт с тестами
./run-tests.sh

TEST_EXIT_CODE=$?

echo -e "${BLUE}=======================================================${NC}"
echo -e "${YELLOW}Test execution completed${NC}"
echo -e "${BLUE}=======================================================${NC}"

# Создаем отчет о тестировании
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_FILE="test-report_${TIMESTAMP}.txt"

echo "Agent Smith Platform - Test Report" > $REPORT_FILE
echo "Generated: $(date)" >> $REPORT_FILE
echo "===============================================" >> $REPORT_FILE
echo "" >> $REPORT_FILE

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "Overall Test Result: PASS" >> $REPORT_FILE
    echo -e "${GREEN}All tests passed successfully!${NC}"
else
    echo "Overall Test Result: FAIL" >> $REPORT_FILE
    echo -e "${RED}Some tests failed. See report for details.${NC}"
fi

echo "" >> $REPORT_FILE
echo "Test Categories:" >> $REPORT_FILE
echo "- Repository Tests" >> $REPORT_FILE
echo "- Service Tests" >> $REPORT_FILE
echo "- API Tests" >> $REPORT_FILE
echo "- Integration Tests" >> $REPORT_FILE
echo "- Performance Tests" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "See detailed logs for more information." >> $REPORT_FILE

echo -e "${YELLOW}Test report generated: ${REPORT_FILE}${NC}"
echo -e "${BLUE}=======================================================${NC}"

exit $TEST_EXIT_CODE