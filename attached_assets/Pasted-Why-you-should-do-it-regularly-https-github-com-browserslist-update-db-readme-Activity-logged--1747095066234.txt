Why you should do it regularly: https://github.com/browserslist/update-db#readme
Activity logged: [agent_created] Создан новый агент: Обработка обращений граждан (тип: citizen_requests) by user system
Activity logged: [agent_created] Создан новый агент: Анализ и проверка документов (тип: document_analysis) by user system
Activity logged: [agent_created] Создан новый агент: BlockchainAgent (тип: blockchain) by user system
Activity logged: [agent_created] Создан новый агент: Автопротокол совещаний (тип: meeting_protocols) by user system
Error:   Failed to scan for dependencies from entries:
  /home/runner/workspace/client/index.html
/home/runner/workspace/client/public/embed.html

  ✘ [ERROR] The symbol "generateFormHtml" has already been declared

    client/src/components/settings/HtmlFormSettings.tsx:1017:8:
      1017 │   const generateFormHtml = () => {
           ╵         ~~~~~~~~~~~~~~~~

  The symbol "generateFormHtml" was originally declared here:

    client/src/components/settings/HtmlFormSettings.tsx:235:8:
      235 │   const generateFormHtml = () => {
          ╵         ~~~~~~~~~~~~~~~~


    at failureErrorWithLog (/home/runner/workspace/node_modules/vite/node_modules/esbuild/lib/main.js:1472:15)
    at /home/runner/workspace/node_modules/vite/node_modules/esbuild/lib/main.js:945:25
    at runOnEndCallbacks (/home/runner/workspace/node_modules/vite/node_modules/esbuild/lib/main.js:1315:45)
    at buildResponseToResult (/home/runner/workspace/node_modules/vite/node_modules/esbuild/lib/main.js:943:7)
    at /home/runner/workspace/node_modules/vite/node_modules/esbuild/lib/main.js:955:9
    at new Promise (<anonymous>)
    at requestCallbacks.on-end (/home/runner/workspace/node_modules/vite/node_modules/esbuild/lib/main.js:954:54)
    at handleRequest (/home/runner/workspace/node_modules/vite/node_modules/esbuild/lib/main.js:647:17)
    at handleIncomingPacket (/home/runner/workspace/node_modules/vite/node_modules/esbuild/lib/main.js:672:7)
    at Socket.readFromStdout (/home/runner/workspace/node_modules/vite/node_modules/esbuild/lib/main.js:600:7)
    at Socket.emit (node:events:518:28)
    at addChunk (node:internal/streams/readable:561:12)
    at readableAddChunkPushByteMode (node:internal/streams/readable:512:3)
    at Readable.push (node:internal/streams/readable:392:5)
    at Pipe.onStreamRead (node:internal/stream_base_commons:191:23)