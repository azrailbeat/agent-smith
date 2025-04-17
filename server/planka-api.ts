/**
 * API для интеграции с Planka (система управления проектами Kanban)
 */

import { Router } from "express";
import { storage } from "./storage";
import { plankaService } from "./services/planka-integration";
import { logActivity } from "./activity-logger";

// Настройки по умолчанию
const DEFAULT_PLANKA_CONFIG = {
  enabled: false,
  plankaUrl: "",
  plankaToken: "",
  syncInterval: 15, // минут
  autoSync: true
};

export function registerPlankaRoutes(router: Router): void {
  // Получение настроек Planka
  router.get("/api/planka/config", async (req, res) => {
    try {
      // Берем настройки из хранилища или используем значения по умолчанию
      const storedConfig = await storage.getSystemSetting("plankaConfig");
      const config = storedConfig ? JSON.parse(storedConfig) : DEFAULT_PLANKA_CONFIG;
      
      // Маскируем токен в ответе из соображений безопасности
      if (config.plankaToken) {
        config.plankaToken = "***"; // Не отправляем реальный токен клиенту
      }
      
      res.json({
        success: true,
        config
      });
    } catch (error) {
      console.error("Ошибка при получении настроек Planka:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при получении настроек Planka"
      });
    }
  });
  
  // Обновление настроек Planka
  router.post("/api/planka/config", async (req, res) => {
    try {
      const { enabled, plankaUrl, plankaToken, syncInterval, autoSync } = req.body;
      
      // Логируем действие
      await logActivity({
        action: "planka_update_config",
        entityType: "integration",
        userId: req.session?.userId,
        details: "Обновление настроек интеграции с Planka"
      });
      
      // Получаем текущие настройки
      const storedConfig = await storage.getSystemSetting("plankaConfig");
      const currentConfig = storedConfig ? JSON.parse(storedConfig) : DEFAULT_PLANKA_CONFIG;
      
      // Создаем обновленную конфигурацию
      const newConfig = {
        ...currentConfig,
        enabled: enabled !== undefined ? enabled : currentConfig.enabled,
        plankaUrl: plankaUrl || currentConfig.plankaUrl,
        // Не обновляем токен, если передано значение "***" (маска)
        plankaToken: (plankaToken && plankaToken !== "***") ? plankaToken : currentConfig.plankaToken,
        syncInterval: syncInterval || currentConfig.syncInterval,
        autoSync: autoSync !== undefined ? autoSync : currentConfig.autoSync
      };
      
      // Сохраняем настройки
      await storage.updateSystemSetting("plankaConfig", JSON.stringify(newConfig));
      
      // Если включена интеграция, инициализируем сервис
      if (newConfig.enabled) {
        try {
          await plankaService.initialize({
            url: newConfig.plankaUrl,
            token: newConfig.plankaToken,
            syncInterval: newConfig.syncInterval,
            autoSync: newConfig.autoSync
          });
          
          // Обновляем статус системной интеграции
          await storage.updateSystemStatus("PlankaIntegration", {
            serviceName: "PlankaIntegration",
            status: 100,
            details: "Интеграция с Planka активна"
          });
        } catch (error) {
          console.error("Ошибка при инициализации сервиса Planka:", error);
          
          // Обновляем статус с ошибкой
          await storage.updateSystemStatus("PlankaIntegration", {
            serviceName: "PlankaIntegration",
            status: 0,
            details: `Ошибка: ${error.message}`
          });
          
          return res.status(500).json({
            success: false,
            error: "Ошибка инициализации Planka: " + error.message
          });
        }
      } else {
        // Если интеграция выключена, останавливаем сервис
        plankaService.stop();
        
        // Обновляем статус системной интеграции
        await storage.updateSystemStatus("PlankaIntegration", {
          serviceName: "PlankaIntegration",
          status: 50,
          details: "Интеграция с Planka отключена"
        });
      }
      
      // Маскируем токен в ответе
      const responseConfig = { ...newConfig, plankaToken: "***" };
      
      res.json({
        success: true,
        config: responseConfig
      });
    } catch (error) {
      console.error("Ошибка при обновлении настроек Planka:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при обновлении настроек Planka"
      });
    }
  });
  
  // Проверка подключения к Planka
  router.post("/api/planka/test-connection", async (req, res) => {
    try {
      const { url, token } = req.body;
      
      // Логируем действие
      await logActivity({
        action: "planka_test_connection",
        entityType: "integration",
        userId: req.session?.userId,
        details: "Тестирование подключения к Planka",
        metadata: { url }
      });
      
      const result = await plankaService.testConnection(url, token);
      
      res.json({
        success: true,
        connected: result.success,
        message: result.message,
        details: result.details
      });
    } catch (error) {
      console.error("Ошибка при тестировании подключения к Planka:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при тестировании подключения"
      });
    }
  });
  
  // Ручная синхронизация с Planka
  router.post("/api/planka/sync", async (req, res) => {
    try {
      // Логируем действие
      await logActivity({
        action: "planka_sync",
        entityType: "integration",
        userId: req.session?.userId,
        details: "Ручная синхронизация с Planka"
      });
      
      const result = await plankaService.synchronize();
      
      res.json({
        success: true,
        syncResult: result
      });
    } catch (error) {
      console.error("Ошибка при синхронизации с Planka:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при синхронизации с Planka"
      });
    }
  });
  
  // Получение проектов из Planka
  router.get("/api/planka/projects", async (req, res) => {
    try {
      // Логируем действие
      await logActivity({
        action: "planka_get_projects",
        entityType: "integration",
        userId: req.session?.userId,
        details: "Получение списка проектов из Planka"
      });
      
      const projects = await plankaService.getProjects();
      
      res.json({
        success: true,
        projects
      });
    } catch (error) {
      console.error("Ошибка при получении проектов из Planka:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при получении проектов из Planka"
      });
    }
  });
  
  // Получение досок в проекте
  router.get("/api/planka/project/:projectId/boards", async (req, res) => {
    try {
      const { projectId } = req.params;
      
      // Логируем действие
      await logActivity({
        action: "planka_get_boards",
        entityType: "integration",
        userId: req.session?.userId,
        details: `Получение досок проекта ${projectId} из Planka`
      });
      
      const boards = await plankaService.getBoardsByProject(projectId);
      
      res.json({
        success: true,
        boards
      });
    } catch (error) {
      console.error("Ошибка при получении досок из Planka:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при получении досок из Planka"
      });
    }
  });
  
  // Создание связи задачи с карточкой Planka
  router.post("/api/planka/link", async (req, res) => {
    try {
      const { entityType, entityId, projectId, boardId, cardName, description } = req.body;
      
      if (!entityType || !entityId) {
        return res.status(400).json({
          success: false,
          error: "Требуются параметры entityType и entityId"
        });
      }
      
      // Логируем действие
      await logActivity({
        action: "planka_create_link",
        entityType: entityType,
        entityId: entityId,
        userId: req.session?.userId,
        details: `Создание связи ${entityType} #${entityId} с карточкой Planka`
      });
      
      // Получаем сущность по типу и ID
      let entity;
      switch (entityType) {
        case "task":
          entity = await storage.getTask(entityId);
          break;
        case "document":
          entity = await storage.getDocument(entityId);
          break;
        case "citizen_request":
          entity = await storage.getCitizenRequest(entityId);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: `Неподдерживаемый тип сущности: ${entityType}`
          });
      }
      
      if (!entity) {
        return res.status(404).json({
          success: false,
          error: `Сущность ${entityType} #${entityId} не найдена`
        });
      }
      
      // Создаем карточку в Planka
      const cardResult = await plankaService.createCard({
        name: cardName || entity.title || `${entityType} #${entityId}`,
        description: description || entity.description || "",
        projectId,
        boardId
      });
      
      if (!cardResult.success) {
        return res.status(500).json({
          success: false,
          error: cardResult.message
        });
      }
      
      // Сохраняем связь в хранилище
      const link = await storage.createPlankaLink({
        entityType,
        entityId,
        plankaProjectId: projectId,
        plankaBoardId: boardId,
        plankaCardId: cardResult.cardId,
        createdAt: new Date(),
        lastSyncedAt: new Date()
      });
      
      res.json({
        success: true,
        link,
        cardDetails: cardResult
      });
    } catch (error) {
      console.error("Ошибка при создании связи с карточкой Planka:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при создании связи с карточкой Planka"
      });
    }
  });
  
  // Получение связанных карточек Planka для сущности
  router.get("/api/planka/links/:entityType/:entityId", async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      
      // Логируем действие
      await logActivity({
        action: "planka_get_links",
        entityType: entityType,
        entityId: parseInt(entityId),
        userId: req.session?.userId,
        details: `Получение связей ${entityType} #${entityId} с Planka`
      });
      
      const links = await storage.getPlankaLinkByEntity(
        entityType,
        parseInt(entityId)
      );
      
      // Получаем подробную информацию о каждой карточке из Planka
      const detailedLinks = [];
      for (const link of links) {
        try {
          const cardDetails = await plankaService.getCardDetails(link.plankaCardId);
          detailedLinks.push({
            ...link,
            cardDetails: cardDetails.success ? cardDetails.card : null
          });
        } catch (error) {
          // Если не удалось получить детали карточки, добавляем только информацию о связи
          detailedLinks.push({
            ...link,
            cardDetails: null,
            error: error.message
          });
        }
      }
      
      res.json({
        success: true,
        links: detailedLinks
      });
    } catch (error) {
      console.error("Ошибка при получении связей с Planka:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при получении связей с Planka"
      });
    }
  });
  
  // Получение всех связей с Planka
  router.get("/api/planka/links", async (req, res) => {
    try {
      // Логируем действие
      await logActivity({
        action: "planka_get_all_links",
        entityType: "integration",
        userId: req.session?.userId,
        details: "Получение всех связей с Planka"
      });
      
      const links = await storage.getPlankaLinks();
      
      res.json({
        success: true,
        links
      });
    } catch (error) {
      console.error("Ошибка при получении всех связей с Planka:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при получении всех связей с Planka"
      });
    }
  });
  
  // Удаление связи с Planka
  router.delete("/api/planka/link/:linkId", async (req, res) => {
    try {
      const linkId = parseInt(req.params.linkId);
      
      if (isNaN(linkId)) {
        return res.status(400).json({
          success: false,
          error: "Некорректный ID связи"
        });
      }
      
      // Получаем связь перед удалением для логирования
      const link = await storage.getPlankaLink(linkId);
      if (!link) {
        return res.status(404).json({
          success: false,
          error: "Связь не найдена"
        });
      }
      
      // Логируем действие
      await logActivity({
        action: "planka_delete_link",
        entityType: link.entityType,
        entityId: link.entityId,
        userId: req.session?.userId,
        details: `Удаление связи ${link.entityType} #${link.entityId} с карточкой Planka #${link.plankaCardId}`
      });
      
      // Удаляем карточку в Planka (опционально)
      const deleteCardResult = await plankaService.deleteCard(link.plankaCardId);
      
      // Удаляем связь из хранилища
      const result = await storage.deletePlankaLink(linkId);
      
      res.json({
        success: result,
        cardDeleted: deleteCardResult.success
      });
    } catch (error) {
      console.error(`Ошибка при удалении связи с Planka #${req.params.linkId}:`, error);
      res.status(500).json({
        success: false,
        error: "Ошибка при удалении связи с Planka"
      });
    }
  });
}