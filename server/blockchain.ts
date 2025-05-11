/**
 * Blockchain Service
 * Handles all blockchain-related operations for secure and immutable records
 */

import { storage } from './storage';
import axios from 'axios';
import { logActivity, ActivityType } from './activity-logger';

export enum BlockchainRecordType {
  CITIZEN_REQUEST = 'citizen_request',
  TASK = 'task',
  DOCUMENT = 'document',
  SYSTEM_EVENT = 'system_event',
  USER_ACTION = 'user_action',
  MEETING = 'meeting',
  MEETING_PROTOCOL = 'meeting_protocol',
  MEETING_TASK = 'meeting_task',
  AUDIO_TRANSCRIPTION = 'audio_transcription'
}

export interface BlockchainData {
  entityId: number;
  entityType: string;
  action: string;
  userId?: number;
  metadata?: Record<string, any>;
  ipfsHash?: string;
}

/**
 * Записывает данные в блокчейн
 * @param data Данные для записи
 * @returns Хеш транзакции в блокчейне
 */
export async function recordToBlockchain(data: BlockchainData): Promise<string> {
  try {
    const now = new Date();
    
    // Проверяем, что есть API ключ для Moralis
    const moralisApiKey = process.env.MORALIS_API_KEY;
    if (!moralisApiKey) {
      console.warn('Морально API ключ не найден в переменных окружения');
      return await simulateBlockchainRecord();
    }
    
    // Определяем тип записи на основе типа сущности
    let recordType: string;
    switch (data.entityType) {
      case 'citizen_request':
        recordType = BlockchainRecordType.CITIZEN_REQUEST;
        break;
      case 'task':
        recordType = BlockchainRecordType.TASK;
        break;
      case 'document':
        recordType = BlockchainRecordType.DOCUMENT;
        break;
      case 'activity':
        recordType = data.action.includes('user') 
          ? BlockchainRecordType.USER_ACTION 
          : BlockchainRecordType.SYSTEM_EVENT;
        break;
      default:
        recordType = BlockchainRecordType.SYSTEM_EVENT;
    }
    
    // Создаем запись в локальной базе данных
    const blockchainRecord = {
      createdAt: now,
      confirmedAt: null, // Будет обновлено после подтверждения транзакции
      title: `${data.entityType} #${data.entityId}: ${data.action}`,
      recordType,
      entityType: data.entityType,
      entityId: data.entityId,
      status: 'pending',
      transactionHash: '', // Будет обновлено после получения хеша
      metadata: data.metadata || {},
      userId: data.userId
    };
    
    const record = await storage.createBlockchainRecord(blockchainRecord);
    
    // Подготавливаем данные для отправки в Moralis API
    const blockchainData = {
      ...data,
      timestamp: now.toISOString(),
      recordId: record.id
    };
    
    try {
      // Вызываем Moralis API для записи в блокчейн
      const transactionHash = await simulateMoralisApiCall(blockchainData, moralisApiKey);
      
      // Обновляем запись с хешем транзакции
      await storage.updateBlockchainRecord(record.id, {
        ...record,
        transactionHash,
        status: 'confirmed',
        confirmedAt: new Date()
      });
      
      console.log(`Данные успешно записаны в блокчейн, хеш транзакции: ${transactionHash}`);
      return transactionHash;
    } catch (error) {
      console.error('Ошибка при записи в блокчейн:', error);
      
      // Обновляем запись с ошибкой
      await storage.updateBlockchainRecord(record.id, {
        ...record,
        status: 'failed',
        metadata: {
          ...record.metadata,
          error: error.message
        }
      });
      
      throw error;
    }
  } catch (error) {
    console.error('Ошибка при подготовке данных для блокчейна:', error);
    throw error;
  }
}

/**
 * Вызов Moralis API для записи данных в блокчейн
 * В демо режиме возвращает симулированный хеш транзакции
 * @param data Данные для отправки в блокчейн
 * @param apiKey API-ключ Moralis
 */
async function simulateMoralisApiCall(data: any, apiKey: string): Promise<string> {
  try {
    // Проверяем, работаем ли мы в демо-режиме
    const isDemo = process.env.DEMO_MODE === 'true';
    
    if (isDemo) {
      // Для демо просто возвращаем случайный хеш транзакции
      return new Promise((resolve) => {
        setTimeout(() => {
          // Генерируем случайный хеш транзакции
          const hash = '0x' + Array.from({ length: 64 }, () => 
            Math.floor(Math.random() * 16).toString(16)
          ).join('');
          
          resolve(hash);
        }, 1000); // Имитируем задержку сети
      });
    }
    
    // Для реального вызова Moralis API
    const endpoint = 'https://deep-index.moralis.io/api/v2/ipfs/uploadFolder';
    
    // Подготавливаем данные для записи в IPFS
    const ipfsData = [{
      path: `govchain/${data.entityType}_${data.entityId}_${Date.now()}.json`,
      content: Buffer.from(JSON.stringify(data)).toString('base64')
    }];
    
    // Отправляем данные в IPFS через Moralis API
    const response = await axios.post(endpoint, ipfsData, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Записываем активность
    await logActivity({
      action: 'blockchain_record',
      entityType: data.entityType,
      entityId: data.entityId,
      details: `Данные записаны в блокчейн: ${data.entityType} #${data.entityId}`,
      metadata: { transactionType: data.action }
    });
    
    // Возвращаем хеш IPFS или транзакции
    if (response.data && response.data.length > 0 && response.data[0].path) {
      return response.data[0].path; // Используем путь к IPFS как хеш транзакции
    } else {
      throw new Error('Moralis API не вернул действительный хеш IPFS');
    }
  } catch (error) {
    console.error('Ошибка при вызове Moralis API:', error);
    
    // Если произошла ошибка, в демо-режиме возвращаем симулированный хеш
    if (process.env.DEMO_MODE === 'true') {
      return '0x' + Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
    }
    
    throw error;
  }
}

/**
 * Симулирует запись в блокчейн, когда API ключ не настроен
 */
async function simulateBlockchainRecord(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const hash = 'simulated_' + Date.now() + '_' + 
        Math.random().toString(36).substring(2, 15);
      resolve(hash);
    }, 500);
  });
}

/**
 * Получить статус транзакции в блокчейне
 * @param transactionHash Хеш транзакции
 */
export async function getTransactionStatus(transactionHash: string): Promise<{
  status: string;
  timestamp?: Date;
  blockNumber?: number;
  gasUsed?: number;
}> {
  // Проверяем, есть ли запись в локальной базе данных
  const records = await storage.getBlockchainRecordByHash(transactionHash);
  if (records.length > 0) {
    const record = records[0];
    return {
      status: record.status,
      timestamp: record.confirmedAt || record.createdAt
    };
  }
  
  // Если API ключ Moralis настроен, можно запросить статус через API
  const moralisApiKey = process.env.MORALIS_API_KEY;
  if (moralisApiKey && !transactionHash.startsWith('simulated_')) {
    // Здесь должен быть запрос к API Moralis
    // return await moralisApiGetTransactionStatus(transactionHash, moralisApiKey);
    
    // Пока возвращаем заглушку
    return {
      status: 'confirmed',
      timestamp: new Date(),
      blockNumber: Math.floor(Math.random() * 1000000),
      gasUsed: Math.floor(Math.random() * 100000)
    };
  }
  
  // Возвращаем заглушку для симулированных транзакций
  return {
    status: 'simulated',
    timestamp: new Date()
  };
}

/**
 * Получить все транзакции для конкретной сущности
 * @param entityType Тип сущности
 * @param entityId ID сущности
 */
export async function getEntityTransactions(entityType: string, entityId: number): Promise<any[]> {
  return await storage.getBlockchainRecordsByEntity(entityType, entityId);
}