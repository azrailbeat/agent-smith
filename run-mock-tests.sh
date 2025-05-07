#!/bin/bash

# Run all mock tests
echo "Running all mock tests..."
NODE_ENV=test npx jest tests/mock-*.test.js --forceExit

# Exit with the same code as Jest
exit $?