/**
 * Сервис для подключения к разным базам данных
 * Позволяет переключаться между провайдерами БД (PostgreSQL, Supabase) без изменения основной логики
 */

import { Pool } from '@neondatabase/serverless';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { storage } from '../storage';

export enum DatabaseProvider {
  MEMORY = 'memory',
  POSTGRES = 'postgres',
  SUPABASE = 'supabase'
}

export interface DatabaseConfig {
  connectionString?: string;
  url?: string;
  key?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

// Типы для сущностей
export interface Agent {
  id: number;
  name: string;
  type: string;
  description?: string | null;
  ministryId?: number | null;
  typeId?: number | null;
  isActive?: boolean | null;
  systemPrompt?: string | null;
  modelId?: number | null;
  config?: any;
  stats?: any;
}

export interface AgentType {
  id: number;
  name: string;
  description?: string | null;
}

export interface Ministry {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
}

export interface Integration {
  id: number;
  name: string;
  type: string;
  apiUrl: string;
  apiKey?: string | null;
  isActive?: boolean | null;
  config?: any;
}

export class DatabaseConnector {
  private static instance: DatabaseConnector;
  private currentProvider: DatabaseProvider = DatabaseProvider.MEMORY;
  private supabaseClient: SupabaseClient | null = null;
  private postgresPool: Pool | null = null;
  
  private constructor() {}
  
  public static getInstance(): DatabaseConnector {
    if (!DatabaseConnector.instance) {
      DatabaseConnector.instance = new DatabaseConnector();
    }
    return DatabaseConnector.instance;
  }
  
  /**
   * Получить текущий провайдер базы данных
   */
  public getCurrentProvider(): DatabaseProvider {
    return this.currentProvider;
  }
  
  /**
   * Переключиться на другой провайдер базы данных
   */
  public async switchProvider(provider: DatabaseProvider, config?: DatabaseConfig): Promise<boolean> {
    try {
      // Тестируем соединение перед переключением
      const connectionTest = await this.testConnection(provider, config);
      if (!connectionTest) {
        console.error(`Не удалось подключиться к ${provider} с указанными параметрами`);
        return false;
      }
      
      // Закрываем текущие соединения
      await this.closeConnections();
      
      // Инициализация нового провайдера
      switch (provider) {
        case DatabaseProvider.POSTGRES:
          if (!config?.connectionString) {
            throw new Error('Не указана строка подключения для PostgreSQL');
          }
          this.postgresPool = new Pool({ connectionString: config.connectionString });
          break;
        
        case DatabaseProvider.SUPABASE:
          if (!config?.url || !config?.key) {
            throw new Error('Не указаны URL или API-ключ для Supabase');
          }
          this.supabaseClient = createClient(config.url, config.key);
          break;
        
        case DatabaseProvider.MEMORY:
          // Для in-memory ничего дополнительно не нужно
          break;
        
        default:
          throw new Error(`Неизвестный провайдер: ${provider}`);
      }
      
      this.currentProvider = provider;
      
      // Сохраняем информацию о текущем провайдере
      await storage.updateSystemSetting('currentDatabaseProvider', provider);
      
      // Если есть конфигурация, сохраняем её (без чувствительных данных)
      if (config) {
        const safeConfig = { ...config };
        // Скрываем чувствительные данные для хранения
        if (safeConfig.password) safeConfig.password = '***';
        if (safeConfig.key) safeConfig.key = '***';
        if (safeConfig.connectionString) {
          // Маскируем пароль в строке подключения
          safeConfig.connectionString = safeConfig.connectionString.replace(/:([^:@]+)@/, ':***@');
        }
        
        await storage.updateSystemSetting(`${provider}Config`, JSON.stringify(safeConfig));
      }
      
      console.log(`Успешно переключились на провайдер ${provider}`);
      return true;
    } catch (error) {
      console.error(`Ошибка при переключении на провайдер ${provider}:`, error);
      return false;
    }
  }
  
  /**
   * Закрыть все активные подключения к базам данных
   */
  public async closeConnections(): Promise<void> {
    if (this.postgresPool) {
      await this.postgresPool.end();
      this.postgresPool = null;
    }
    
    // Для Supabase нет явного метода закрытия соединения
    this.supabaseClient = null;
  }
  
  /**
   * Экспорт данных из текущей базы в формат JSON
   */
  public async exportData(tables: string[] = []): Promise<Record<string, any[]>> {
    const result: Record<string, any[]> = {};
    
    try {
      switch (this.currentProvider) {
        case DatabaseProvider.MEMORY:
          // Для in-memory экспортируем данные из хранилища
          const exportTables = tables.length > 0 ? tables : [
            'users', 'tasks', 'documents', 'messages',
            'activities', 'blockchain_records', 'system_status',
            'integrations', 'agents', 'departments', 'positions',
            'ministries', 'citizen_requests', 'planka_links',
            'task_rules'
          ];
          
          for (const table of exportTables) {
            switch (table) {
              case 'users':
                result[table] = await storage.getUsers();
                break;
              case 'tasks':
                result[table] = await storage.getTasks();
                break;
              case 'documents':
                result[table] = await storage.getDocuments();
                break;
              case 'messages':
                result[table] = await storage.getMessages();
                break;
              case 'activities':
                result[table] = await storage.getActivities();
                break;
              case 'blockchain_records':
                result[table] = await storage.getBlockchainRecords();
                break;
              case 'system_status':
                result[table] = await storage.getSystemStatuses();
                break;
              case 'integrations':
                result[table] = await storage.getIntegrations();
                break;
              case 'agents':
                result[table] = await storage.getAgents();
                break;
              case 'departments':
                result[table] = await storage.getDepartments();
                break;
              case 'positions':
                result[table] = await storage.getPositions();
                break;
              case 'ministries':
                result[table] = await storage.getMinistries();
                break;
              case 'citizen_requests':
                result[table] = await storage.getCitizenRequests();
                break;
              case 'planka_links':
                result[table] = await storage.getPlankaLinks();
                break;
              case 'task_rules':
                result[table] = await storage.getTaskRules();
                break;
            }
          }
          break;
        
        case DatabaseProvider.POSTGRES:
          if (!this.postgresPool) {
            throw new Error('Отсутствует подключение к PostgreSQL');
          }
          
          // Если таблицы не указаны, получаем список всех таблиц
          const tableNames = tables.length > 0 ? tables : await this.getPostgresTableNames();
          
          for (const tableName of tableNames) {
            const { rows } = await this.postgresPool.query(`SELECT * FROM ${tableName}`);
            result[tableName] = rows;
          }
          break;
        
        case DatabaseProvider.SUPABASE:
          if (!this.supabaseClient) {
            throw new Error('Отсутствует подключение к Supabase');
          }
          
          // Если таблицы не указаны, получаем список всех таблиц
          const supabaseTables = tables.length > 0 ? tables : await this.getSupabaseTableNames();
          
          for (const tableName of supabaseTables) {
            const { data, error } = await this.supabaseClient
              .from(tableName)
              .select('*');
            
            if (error) {
              throw error;
            }
            
            result[tableName] = data || [];
          }
          break;
      }
      
      return result;
    } catch (error) {
      console.error('Ошибка при экспорте данных:', error);
      throw error;
    }
  }
  
  /**
   * Импорт данных в формате JSON в текущую базу данных
   */
  public async importData(data: Record<string, any[]>): Promise<boolean> {
    try {
      switch (this.currentProvider) {
        case DatabaseProvider.MEMORY:
          // Для in-memory импортируем данные в хранилище
          for (const [table, records] of Object.entries(data)) {
            switch (table) {
              case 'users':
                for (const record of records) {
                  await storage.createUser(record);
                }
                break;
              case 'tasks':
                for (const record of records) {
                  await storage.createTask(record);
                }
                break;
              case 'documents':
                for (const record of records) {
                  await storage.createDocument(record);
                }
                break;
              case 'messages':
                for (const record of records) {
                  await storage.createMessage(record);
                }
                break;
              case 'activities':
                for (const record of records) {
                  await storage.createActivity(record);
                }
                break;
              case 'blockchain_records':
                for (const record of records) {
                  await storage.createBlockchainRecord(record);
                }
                break;
              case 'integrations':
                for (const record of records) {
                  await storage.createIntegration(record);
                }
                break;
              case 'agents':
                for (const record of records) {
                  await storage.createAgent(record);
                }
                break;
              case 'departments':
                for (const record of records) {
                  await storage.createDepartment(record);
                }
                break;
              case 'positions':
                for (const record of records) {
                  await storage.createPosition(record);
                }
                break;
              case 'ministries':
                for (const record of records) {
                  await storage.createMinistry(record);
                }
                break;
              case 'citizen_requests':
                for (const record of records) {
                  await storage.createCitizenRequest(record);
                }
                break;
              case 'planka_links':
                for (const record of records) {
                  await storage.createPlankaLink(record);
                }
                break;
              case 'task_rules':
                for (const record of records) {
                  await storage.createTaskRule(record);
                }
                break;
            }
          }
          break;
        
        case DatabaseProvider.POSTGRES:
          if (!this.postgresPool) {
            throw new Error('Отсутствует подключение к PostgreSQL');
          }
          
          // Начинаем транзакцию
          const client = await this.postgresPool.connect();
          try {
            await client.query('BEGIN');
            
            for (const [tableName, rows] of Object.entries(data)) {
              // Очищаем таблицу перед импортом
              await client.query(`DELETE FROM ${tableName}`);
              
              for (const row of rows) {
                // Формируем колонки и значения для INSERT
                const columns = Object.keys(row).join(', ');
                const placeholders = Object.keys(row).map((_, i) => `$${i + 1}`).join(', ');
                const values = Object.values(row);
                
                await client.query(
                  `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
                  values
                );
              }
            }
            
            await client.query('COMMIT');
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          } finally {
            client.release();
          }
          break;
        
        case DatabaseProvider.SUPABASE:
          if (!this.supabaseClient) {
            throw new Error('Отсутствует подключение к Supabase');
          }
          
          for (const [tableName, rows] of Object.entries(data)) {
            // Очищаем таблицу перед импортом
            const { error: deleteError } = await this.supabaseClient
              .from(tableName)
              .delete()
              .neq('id', -1); // Условие, которое всегда истинно
            
            if (deleteError) {
              throw deleteError;
            }
            
            if (rows.length > 0) {
              // Импортируем данные
              const { error: insertError } = await this.supabaseClient
                .from(tableName)
                .insert(rows);
              
              if (insertError) {
                throw insertError;
              }
            }
          }
          break;
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка при импорте данных:', error);
      return false;
    }
  }
  
  /**
   * Получить список таблиц в PostgreSQL
   */
  private async getPostgresTableNames(): Promise<string[]> {
    if (!this.postgresPool) {
      throw new Error('Отсутствует подключение к PostgreSQL');
    }
    
    const { rows } = await this.postgresPool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `);
    
    return rows.map(row => row.table_name);
  }
  
  /**
   * Получить список таблиц в Supabase
   */
  private async getSupabaseTableNames(): Promise<string[]> {
    if (!this.supabaseClient) {
      throw new Error('Отсутствует подключение к Supabase');
    }
    
    // Получаем список таблиц через системную информацию PostgreSQL
    const { data, error } = await this.supabaseClient.rpc('get_schema_tables');
    
    if (error) {
      throw error;
    }
    
    return data || [];
  }
  
  /**
   * Тестирование подключения к указанному провайдеру
   */
  public async testConnection(provider: DatabaseProvider, config?: DatabaseConfig): Promise<boolean> {
    try {
      switch (provider) {
        case DatabaseProvider.MEMORY:
          // Для in-memory всегда успешно
          return true;
        
        case DatabaseProvider.POSTGRES:
          if (!config?.connectionString) {
            throw new Error('Не указана строка подключения для PostgreSQL');
          }
          
          const tempPool = new Pool({ connectionString: config.connectionString });
          try {
            const client = await tempPool.connect();
            try {
              await client.query('SELECT NOW()');
              return true;
            } finally {
              client.release();
            }
          } finally {
            await tempPool.end();
          }
        
        case DatabaseProvider.SUPABASE:
          if (!config?.url || !config?.key) {
            throw new Error('Не указаны URL или API-ключ для Supabase');
          }
          
          const tempClient = createClient(config.url, config.key);
          const { data, error } = await tempClient.from('_test_connection').select('*').limit(1);
          
          if (error && error.code !== 'PGRST116') { // PGRST116 = Table not found, что в нашем случае нормально
            throw error;
          }
          
          return true;
        
        default:
          throw new Error(`Неизвестный провайдер: ${provider}`);
      }
    } catch (error) {
      console.error(`Ошибка при тестировании подключения к ${provider}:`, error);
      return false;
    }
  }
}

export const databaseConnector = DatabaseConnector.getInstance();