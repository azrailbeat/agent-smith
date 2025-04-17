#!/bin/bash
cat > temp_file.ts << 'EOF'
// Используем импортированный сервис агентов
EOF

# Находим все строки с require pattern и заменяем
grep -n "const { agentService, AgentTaskType, AgentEntityType } = require('./services/agent-service');" server/routes.ts | while read -r line; do
  line_number=$(echo "$line" | cut -d':' -f1)
  sed -i "${line_number}d" server/routes.ts
  sed -i "${line_number}i\\      // Используем импортированный сервис агентов" server/routes.ts
done

chmod +x fix_require.sh
./fix_require.sh
