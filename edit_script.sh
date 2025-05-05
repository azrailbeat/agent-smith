#!/bin/bash
line_num=1401
content="                                  <Button variant=\"ghost\" size=\"sm\" onClick={() => handleDeleteAgent(agent.id)}>\n                                    <Trash2 className=\"h-4 w-4 text-red-500\" />\n                                  </Button>"

# Make a backup
cp client/src/pages/AIAgents.tsx client/src/pages/AIAgents.tsx.bak

# Insert the new button before the closing div tag
sed -i "${line_num}i\\${content}" client/src/pages/AIAgents.tsx

echo "Edit complete"
