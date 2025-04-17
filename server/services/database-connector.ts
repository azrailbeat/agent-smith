/**
 * Коннектор для базы данных с поддержкой переключения между локальной PostgreSQL и Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from '../shared/schema';
import { db as drizzleDb, pool } from '../db';

// Конфигурация для WebSockets в NeonDB
neonConfig.webSocketConstructor = ws;

// Типы провайдеров баз данных
export enum DatabaseProvider {
  LOCAL_POSTGRES = 'local_postgres',
  SUPABASE = 'supabase'
}

// Класс коннектора к базе данных
export class DatabaseConnector {
  private static instance: DatabaseConnector;
  private currentProvider: DatabaseProvider = DatabaseProvider.LOCAL_POSTGRES;
  private supabaseClient: SupabaseClient | null = null;
  private drizzleClient = drizzleDb;

  // Получение экземпляра синглтона
  public static getInstance(): DatabaseConnector {
    if (!DatabaseConnector.instance) {
      DatabaseConnector.instance = new DatabaseConnector();
    }
    return DatabaseConnector.instance;
  }

  // Приватный конструктор для синглтона
  private constructor() {}

  // Инициализация коннектора с указанным провайдером
  public async initialize(provider: DatabaseProvider = DatabaseProvider.LOCAL_POSTGRES): Promise<void> {
    this.currentProvider = provider;

    if (provider === DatabaseProvider.SUPABASE && !this.supabaseClient) {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_KEY;

      if (!url || !key) {
        throw new Error('SUPABASE_URL и SUPABASE_KEY должны быть указаны в переменных окружения');
      }

      this.supabaseClient = createClient(url, key);
      console.log('Supabase клиент инициализирован');
    }

    console.log(`DatabaseConnector инициализирован с провайдером: ${provider}`);
  }

  // Получение текущего провайдера
  public getCurrentProvider(): DatabaseProvider {
    return this.currentProvider;
  }

  // Переключение между провайдерами баз данных
  public async switchProvider(provider: DatabaseProvider): Promise<void> {
    if (this.currentProvider === provider) {
      console.log(`Уже используется провайдер: ${provider}`);
      return;
    }

    await this.initialize(provider);
    console.log(`Переключено на провайдер: ${provider}`);
  }

  // Получение клиента базы данных в зависимости от выбранного провайдера
  public getClient() {
    if (this.currentProvider === DatabaseProvider.SUPABASE) {
      if (!this.supabaseClient) {
        throw new Error('Supabase клиент не инициализирован');
      }
      return this.supabaseClient;
    }

    return this.drizzleClient;
  }

  // Получение прямого клиента Supabase для специфических операций
  public getSupabaseClient(): SupabaseClient {
    if (!this.supabaseClient) {
      throw new Error('Supabase клиент не инициализирован');
    }
    return this.supabaseClient;
  }

  // Получение прямого клиента Drizzle для специфических операций
  public getDrizzleClient() {
    return this.drizzleClient;
  }

  // Закрытие соединений
  public async close(): Promise<void> {
    if (this.currentProvider === DatabaseProvider.LOCAL_POSTGRES) {
      await pool.end();
    }
  }

  // Экспорт данных из базы
  public async exportData(tables: string[] = []): Promise<any> {
    try {
      if (this.currentProvider === DatabaseProvider.SUPABASE) {
        if (!this.supabaseClient) {
          throw new Error('Supabase клиент не инициализирован');
        }

        const exportData: Record<string, any[]> = {};
        
        // Если таблицы не указаны, экспортируем все доступные
        const allTables = tables.length === 0 ? Object.keys(schema) : tables;
        
        for (const tableName of allTables) {
          if (tableName in schema) {
            const { data, error } = await this.supabaseClient
              .from(tableName)
              .select('*');
            
            if (error) throw error;
            exportData[tableName] = data;
          }
        }
        
        return exportData;
      } else {
        // Для PostgreSQL используем Drizzle
        const exportData: Record<string, any[]> = {};
        
        // Если таблицы не указаны, экспортируем все доступные
        const allTables = tables.length === 0 ? Object.keys(schema) : tables;
        
        for (const tableName of allTables) {
          if (tableName in schema) {
            const tableData = await this.drizzleClient.select().from(schema[tableName as keyof typeof schema]);
            exportData[tableName] = tableData;
          }
        }
        
        return exportData;
      }
    } catch (error) {
      console.error('Ошибка при экспорте данных:', error);
      throw error;
    }
  }

  // Импорт данных в базу
  public async importData(data: Record<string, any[]>): Promise<void> {
    try {
      for (const [tableName, tableData] of Object.entries(data)) {
        if (tableData.length === 0) continue;
        
        if (this.currentProvider === DatabaseProvider.SUPABASE) {
          if (!this.supabaseClient) {
            throw new Error('Supabase клиент не инициализирован');
          }
          
          // Удаляем существующие данные
          const { error: deleteError } = await this.supabaseClient
            .from(tableName)
            .delete()
            .not('id', 'is', null);
          
          if (deleteError) throw deleteError;
          
          // Вставляем новые данные
          const { error: insertError } = await this.supabaseClient
            .from(tableName)
            .insert(tableData);
          
          if (insertError) throw insertError;
        } else {
          // Для PostgreSQL используем Drizzle
          // Очистка таблицы не включена - это нужно делать с осторожностью
          // Вставка данных
          if (tableName in schema) {
            await this.drizzleClient.insert(schema[tableName as keyof typeof schema]).values(tableData);
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при импорте данных:', error);
      throw error;
    }
  }
}

// Экспорт экземпляра синглтона
export const dbConnector = DatabaseConnector.getInstance();