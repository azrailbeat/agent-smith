/**
 * API для управления базами данных и импорта/экспорта шаблонов
 */

import { Router } from "express";
import { storage } from "./storage";
import { DatabaseProvider, databaseConnector } from "./services/database-connector";
import { templateManager } from "./services/template-manager";
import { logActivity } from "./activity-logger";
import path from "path";
import fs from "fs";

// Папка для хранения экспортированных файлов
const EXPORTS_DIR = path.join(__dirname, "..", "data", "exports");
// Создаем папку, если она не существует
if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

export function registerDatabaseRoutes(router: Router): void {
  // Получение текущего провайдера БД
  router.get("/api/database/provider", async (req, res) => {
    try {
      const provider = databaseConnector.getCurrentProvider();
      
      res.json({
        success: true,
        provider
      });
    } catch (error) {
      console.error("Ошибка при получении провайдера БД:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при получении провайдера БД"
      });
    }
  });
  
  // Переключение провайдера БД
  router.post("/api/database/switch-provider", async (req, res) => {
    try {
      const { provider, config } = req.body;
      
      // Логируем действие
      await logActivity({
        action: "database_switch",
        entityType: "database",
        userId: req.session?.userId,
        details: `Переключение БД на ${provider}`,
        metadata: { provider }
      });
      
      // Проверяем, поддерживается ли провайдер
      if (!Object.values(DatabaseProvider).includes(provider)) {
        return res.status(400).json({
          success: false,
          error: `Неизвестный провайдер: ${provider}`
        });
      }
      
      const result = await databaseConnector.switchProvider(provider, config);
      
      if (result) {
        res.json({
          success: true,
          provider
        });
      } else {
        res.status(500).json({
          success: false,
          error: `Ошибка при переключении на ${provider}`
        });
      }
    } catch (error) {
      console.error("Ошибка при переключении провайдера БД:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при переключении провайдера БД"
      });
    }
  });
  
  // Тестирование подключения к БД
  router.post("/api/database/test-connection", async (req, res) => {
    try {
      const { provider, config } = req.body;
      
      // Логируем действие
      await logActivity({
        action: "database_test",
        entityType: "database",
        userId: req.session?.userId,
        details: `Тестирование подключения к ${provider}`,
        metadata: { provider }
      });
      
      const result = await databaseConnector.testConnection(provider, config);
      
      res.json({
        success: true,
        connected: result
      });
    } catch (error) {
      console.error("Ошибка при тестировании подключения к БД:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при тестировании подключения к БД"
      });
    }
  });
  
  // Экспорт базы данных
  router.post("/api/database/export", async (req, res) => {
    try {
      const { tables } = req.body;
      
      // Логируем действие
      await logActivity({
        action: "database_export",
        entityType: "database",
        userId: req.session?.userId,
        details: "Экспорт базы данных",
        metadata: { tables }
      });
      
      const data = await databaseConnector.exportData(tables);
      
      // Сохраняем в файл
      const filename = `db_export_${new Date().toISOString().replace(/:/g, "-")}.json`;
      const filePath = path.join(EXPORTS_DIR, filename);
      
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
      
      res.json({
        success: true,
        filename,
        data
      });
    } catch (error) {
      console.error("Ошибка при экспорте данных:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при экспорте данных"
      });
    }
  });
  
  // Импорт базы данных
  router.post("/api/database/import", async (req, res) => {
    try {
      const { data } = req.body;
      
      // Логируем действие
      await logActivity({
        action: "database_import",
        entityType: "database",
        userId: req.session?.userId,
        details: "Импорт базы данных",
        metadata: { tables: Object.keys(data) }
      });
      
      const result = await databaseConnector.importData(data);
      
      res.json({
        success: result
      });
    } catch (error) {
      console.error("Ошибка при импорте данных:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при импорте данных"
      });
    }
  });

  // Маршруты для управления шаблонами
  
  // Получение списка шаблонов
  router.get("/api/templates", async (req, res) => {
    try {
      const templates = templateManager.getAvailableTemplates();
      
      res.json({
        success: true,
        templates
      });
    } catch (error) {
      console.error("Ошибка при получении списка шаблонов:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при получении списка шаблонов"
      });
    }
  });
  
  // Получение конкретного шаблона
  router.get("/api/templates/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      
      const template = templateManager.loadTemplateFromFile(filename);
      
      res.json({
        success: true,
        template
      });
    } catch (error) {
      console.error(`Ошибка при получении шаблона ${req.params.filename}:`, error);
      res.status(404).json({
        success: false,
        error: "Шаблон не найден"
      });
    }
  });
  
  // Создание шаблона агента
  router.post("/api/templates/agent/:id", async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const { exportDependencies, exportIntegrations } = req.body;
      
      if (isNaN(agentId)) {
        return res.status(400).json({
          success: false,
          error: "Некорректный ID агента"
        });
      }
      
      // Логируем действие
      await logActivity({
        action: "template_create",
        entityType: "agent",
        entityId: agentId,
        userId: req.session?.userId,
        details: `Создание шаблона агента #${agentId}`,
        metadata: { exportDependencies, exportIntegrations }
      });
      
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: "Агент не найден"
        });
      }
      
      const template = await templateManager.exportAgent(agentId, {
        exportDependencies,
        exportIntegrations
      });
      
      if (!template) {
        return res.status(500).json({
          success: false,
          error: "Ошибка при создании шаблона"
        });
      }
      
      // Сохраняем шаблон в файл
      const filename = `agent_${agent.name.replace(/\s+/g, "_").toLowerCase()}.json`;
      const filePath = templateManager.saveTemplateToFile(template, filename);
      
      res.json({
        success: true,
        filename,
        template
      });
    } catch (error) {
      console.error("Ошибка при создании шаблона агента:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при создании шаблона агента"
      });
    }
  });
  
  // Импорт шаблона агента
  router.post("/api/templates/import/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const { overwriteExisting, importDependencies } = req.body;
      
      // Логируем действие
      await logActivity({
        action: "template_import",
        entityType: "template",
        userId: req.session?.userId,
        details: `Импорт шаблона ${filename}`,
        metadata: { filename, overwriteExisting, importDependencies }
      });
      
      const template = templateManager.loadTemplateFromFile(filename);
      
      let result;
      
      switch (template.type) {
        case "agent":
          result = await templateManager.importAgent(template, {
            overwriteExisting,
            importDependencies
          });
          break;
        case "organization_structure":
          result = await templateManager.importOrgStructure(template, {
            overwriteExisting
          });
          break;
        case "system_setting":
          result = await templateManager.importSystemSettings(template);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: `Неподдерживаемый тип шаблона: ${template.type}`
          });
      }
      
      res.json({
        success: true,
        result
      });
    } catch (error) {
      console.error(`Ошибка при импорте шаблона ${req.params.filename}:`, error);
      res.status(500).json({
        success: false,
        error: "Ошибка при импорте шаблона"
      });
    }
  });
  
  // Удаление шаблона
  router.delete("/api/templates/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      
      // Логируем действие
      await logActivity({
        action: "template_delete",
        entityType: "template",
        userId: req.session?.userId,
        details: `Удаление шаблона ${filename}`
      });
      
      const templatesDir = path.join(__dirname, "..", "data", "templates");
      const filePath = path.join(templatesDir, filename.endsWith(".json") ? filename : `${filename}.json`);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: "Шаблон не найден"
        });
      }
      
      fs.unlinkSync(filePath);
      
      res.json({
        success: true
      });
    } catch (error) {
      console.error(`Ошибка при удалении шаблона ${req.params.filename}:`, error);
      res.status(500).json({
        success: false,
        error: "Ошибка при удалении шаблона"
      });
    }
  });
  
  // Экспорт организационной структуры
  router.post("/api/templates/org-structure", async (req, res) => {
    try {
      const options = req.body;
      
      // Логируем действие
      await logActivity({
        action: "template_create",
        entityType: "org_structure",
        userId: req.session?.userId,
        details: "Создание шаблона организационной структуры"
      });
      
      const template = await templateManager.exportOrgStructure(options);
      
      if (!template) {
        return res.status(500).json({
          success: false,
          error: "Ошибка при создании шаблона"
        });
      }
      
      // Сохраняем шаблон в файл
      const filename = `org_structure_${new Date().toISOString().replace(/:/g, "-")}.json`;
      const filePath = templateManager.saveTemplateToFile(template, filename);
      
      res.json({
        success: true,
        filename,
        template
      });
    } catch (error) {
      console.error("Ошибка при создании шаблона организационной структуры:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при создании шаблона организационной структуры"
      });
    }
  });
  
  // Резервное копирование всех шаблонов
  router.post("/api/templates/backup", async (req, res) => {
    try {
      const options = req.body;
      
      // Логируем действие
      await logActivity({
        action: "template_backup",
        entityType: "template",
        userId: req.session?.userId,
        details: "Создание резервной копии всех шаблонов"
      });
      
      const backupDir = await templateManager.exportAllTemplates(options);
      
      if (!backupDir) {
        return res.status(500).json({
          success: false,
          error: "Ошибка при создании резервной копии"
        });
      }
      
      res.json({
        success: true,
        backupDir
      });
    } catch (error) {
      console.error("Ошибка при создании резервной копии шаблонов:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при создании резервной копии шаблонов"
      });
    }
  });
}