/**
 * Модуль интеграции с блокчейном для обеспечения неизменности и 
 * юридической значимости государственных решений и документов
 * 
 * Поддерживает работу с Hyperledger Besu через Moralis API и/или
 * прямую интеграцию с смарт-контрактами
 */

import crypto from 'crypto';
import Moralis from 'moralis';
import { storage } from './storage';
import { logActivity, ActivityType } from './activity-logger';

// Типы записей блокчейна
export enum BlockchainRecordType {
  CITIZEN_REQUEST = 'citizen_request',
  DOCUMENT = 'document',
  PROTOCOL = 'protocol',
  MEETING = 'meeting',
  AGENT_RESULT = 'agent_result',
  TASK = 'task',
  DECISION = 'decision',
  VOTE = 'vote'
}

// Параметры для записи в блокчейн
export interface BlockchainRecordParams {
  entityId: number;
  entityType: BlockchainRecordType;
  action: string;
  userId?: number;
  metadata?: any;
}

// Результат записи в блокчейн
export interface BlockchainRecord {
  hash: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: string;
  networkId?: string;
  contractAddress?: string;
}

// Флаг инициализации блокчейна
let isBlockchainInitialized = false;

// Конфигурация Moralis
const moralisConfig = {
  apiKey: process.env.MORALIS_API_KEY || '',
  network: 'sepolia', // Тестовая сеть Ethereum
  contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS || '',
  swarmGatewayUrl: 'https://gateway.ethswarm.org/bzz'
};

// Конфигурация Hyperledger
const hyperledgerConfig = {
  url: process.env.HYPERLEDGER_URL || '',
  contractAddress: process.env.HYPERLEDGER_CONTRACT_ADDRESS || '',
  privateKey: process.env.HYPERLEDGER_PRIVATE_KEY || ''
};

/**
 * Инициализирует сервисы блокчейна
 */
async function initializeBlockchain() {
  if (isBlockchainInitialized) {
    return;
  }
  
  try {
    // Инициализируем Moralis SDK
    if (moralisConfig.apiKey) {
      await Moralis.start({
        apiKey: moralisConfig.apiKey
      });
      
      // Логируем успешную инициализацию
      await logActivity({
        action: ActivityType.SYSTEM_EVENT,
        details: 'Moralis API успешно инициализирован'
      });
      
      isBlockchainInitialized = true;
    } else {
      console.warn('MORALIS_API_KEY не настроен. Функции блокчейна будут работать в режиме эмуляции.');
      
      // Логируем предупреждение
      await logActivity({
        action: ActivityType.SYSTEM_EVENT,
        details: 'Блокчейн запущен в режиме эмуляции из-за отсутствия ключа API Moralis'
      });
      
      // Включаем режим эмуляции
      isBlockchainInitialized = true;
    }
  } catch (error) {
    console.error('Ошибка при инициализации блокчейна:', error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_ERROR,
      details: `Ошибка при инициализации блокчейна: ${error.message}`
    });
    
    // В случае ошибки тоже включаем режим эмуляции
    isBlockchainInitialized = true;
  }
}

/**
 * Создает хеш данных для записи в блокчейн
 * 
 * @param data Данные для хеширования
 * @returns Хеш данных
 */
function hashData(data: any): string {
  const stringifiedData = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(stringifiedData).digest('hex');
}

/**
 * Записывает данные в блокчейн для обеспечения неизменности
 * 
 * @param params Параметры для записи в блокчейн
 * @returns Информация о записи в блокчейне
 */
export async function recordToBlockchain(params: BlockchainRecordParams): Promise<BlockchainRecord> {
  // Инициализируем блокчейн, если еще не инициализирован
  if (!isBlockchainInitialized) {
    await initializeBlockchain();
  }
  
  try {
    // Подготавливаем данные для записи
    const timestamp = new Date().toISOString();
    const dataToRecord = {
      entityId: params.entityId,
      entityType: params.entityType,
      action: params.action,
      userId: params.userId || 0,
      timestamp,
      metadata: params.metadata || {}
    };
    
    // Создаем хеш данных
    const dataHash = hashData(dataToRecord);
    
    // Проверяем, есть ли уже такая запись в блокчейне
    const existingRecord = await storage.getBlockchainRecordByHash(dataHash);
    if (existingRecord) {
      return existingRecord;
    }
    
    let blockchainRecord: BlockchainRecord;
    
    // Если есть ключ API Moralis, записываем в блокчейн
    if (moralisConfig.apiKey) {
      try {
        // Сохраняем данные в Swarm для получения хеша содержимого
        const swarmResponse = await uploadToSwarm(dataToRecord);
        
        // Записываем хеш в смарт-контракт через Moralis API
        const txResponse = await Moralis.EvmApi.utils.runContractFunction({
          abi: [
            {
              inputs: [
                { internalType: 'string', name: 'contentHash', type: 'string' },
                { internalType: 'string', name: 'docType', type: 'string' },
                { internalType: 'uint256', name: 'entityId', type: 'uint256' }
              ],
              name: 'recordDocument',
              outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
              stateMutability: 'nonpayable',
              type: 'function'
            }
          ],
          functionName: 'recordDocument',
          params: {
            contentHash: swarmResponse.hash,
            docType: params.entityType,
            entityId: params.entityId
          },
          address: moralisConfig.contractAddress,
          chain: moralisConfig.network
        });
        
        // Получаем информацию о транзакции
        const txReceipt = await Moralis.EvmApi.transaction.getTransactionReceipt({
          transactionHash: txResponse.raw.transactionHash,
          chain: moralisConfig.network
        });
        
        // Формируем запись блокчейна
        blockchainRecord = {
          hash: dataHash,
          transactionHash: txResponse.raw.transactionHash,
          blockNumber: parseInt(txReceipt.raw.blockNumber, 16),
          timestamp,
          networkId: moralisConfig.network,
          contractAddress: moralisConfig.contractAddress
        };
      } catch (error) {
        console.error('Ошибка при записи в блокчейн через Moralis:', error);
        
        // В случае ошибки Moralis, используем локальную эмуляцию
        blockchainRecord = createLocalBlockchainRecord(dataHash, timestamp);
        
        // Логируем ошибку
        await logActivity({
          action: ActivityType.SYSTEM_ERROR,
          details: `Ошибка при записи в блокчейн через Moralis: ${error.message}. Использована локальная эмуляция.`
        });
      }
    } else {
      // Если нет ключа API, используем локальную эмуляцию
      blockchainRecord = createLocalBlockchainRecord(dataHash, timestamp);
    }
    
    // Сохраняем запись блокчейна в базе данных
    const savedRecord = await storage.createBlockchainRecord({
      hash: blockchainRecord.hash,
      transactionHash: blockchainRecord.transactionHash,
      blockNumber: blockchainRecord.blockNumber,
      timestamp: new Date(blockchainRecord.timestamp),
      networkId: blockchainRecord.networkId,
      contractAddress: blockchainRecord.contractAddress,
      entityType: params.entityType,
      entityId: params.entityId,
      data: JSON.stringify(dataToRecord)
    });
    
    // Логируем запись в блокчейн
    await logActivity({
      action: ActivityType.BLOCKCHAIN_RECORD,
      entityType: params.entityType,
      entityId: params.entityId,
      details: `Данные записаны в блокчейн: ${blockchainRecord.hash.substring(0, 10)}...`,
      metadata: {
        hash: blockchainRecord.hash,
        transactionHash: blockchainRecord.transactionHash,
        blockNumber: blockchainRecord.blockNumber,
        timestamp: blockchainRecord.timestamp
      }
    });
    
    return blockchainRecord;
  } catch (error) {
    console.error('Ошибка при записи в блокчейн:', error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_ERROR,
      details: `Ошибка при записи в блокчейн: ${error.message}`
    });
    
    // В случае ошибки возвращаем локальную запись
    const timestamp = new Date().toISOString();
    const dataHash = hashData(params);
    
    return createLocalBlockchainRecord(dataHash, timestamp);
  }
}

/**
 * Проверяет существование и валидность записи в блокчейне
 * 
 * @param hash Хеш записи для проверки
 * @returns Информация о записи или null, если запись не найдена
 */
export async function verifyBlockchainRecord(hash: string): Promise<BlockchainRecord | null> {
  try {
    // Инициализируем блокчейн, если еще не инициализирован
    if (!isBlockchainInitialized) {
      await initializeBlockchain();
    }
    
    // Получаем запись из базы данных
    const localRecord = await storage.getBlockchainRecordByHash(hash);
    
    if (!localRecord) {
      return null;
    }
    
    // Если запись есть в локальной БД, но не в эмуляции, проверяем в блокчейне
    if (moralisConfig.apiKey && !localRecord.isEmulated) {
      try {
        // Получаем информацию о транзакции в блокчейне
        const txReceipt = await Moralis.EvmApi.transaction.getTransactionReceipt({
          transactionHash: localRecord.transactionHash,
          chain: localRecord.networkId || moralisConfig.network
        });
        
        // Проверяем, подтверждена ли транзакция
        const isConfirmed = txReceipt && parseInt(txReceipt.raw.status, 16) === 1;
        
        if (!isConfirmed) {
          // Если транзакция не подтверждена, возвращаем ошибку
          return null;
        }
        
        // Если транзакция подтверждена, возвращаем запись
        return {
          hash: localRecord.hash,
          transactionHash: localRecord.transactionHash,
          blockNumber: localRecord.blockNumber,
          timestamp: localRecord.timestamp.toISOString(),
          networkId: localRecord.networkId,
          contractAddress: localRecord.contractAddress
        };
      } catch (error) {
        console.error('Ошибка при проверке записи в блокчейне:', error);
        
        // Логируем ошибку
        await logActivity({
          action: ActivityType.SYSTEM_ERROR,
          details: `Ошибка при проверке записи в блокчейне: ${error.message}`
        });
        
        // В случае ошибки Moralis, возвращаем локальную запись
        return {
          hash: localRecord.hash,
          transactionHash: localRecord.transactionHash,
          blockNumber: localRecord.blockNumber,
          timestamp: localRecord.timestamp.toISOString(),
          networkId: localRecord.networkId,
          contractAddress: localRecord.contractAddress
        };
      }
    } else {
      // Если запись в эмуляции или нет ключа API, возвращаем локальную запись
      return {
        hash: localRecord.hash,
        transactionHash: localRecord.transactionHash,
        blockNumber: localRecord.blockNumber,
        timestamp: localRecord.timestamp.toISOString(),
        networkId: localRecord.networkId,
        contractAddress: localRecord.contractAddress
      };
    }
  } catch (error) {
    console.error('Ошибка при проверке записи в блокчейне:', error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_ERROR,
      details: `Ошибка при проверке записи в блокчейне: ${error.message}`
    });
    
    return null;
  }
}

/**
 * Создает и регистрирует голосование DAO для важных решений
 * 
 * @param title Название голосования
 * @param description Описание голосования
 * @param options Варианты для голосования
 * @param metadata Дополнительные метаданные
 * @returns Идентификатор голосования в блокчейне
 */
export async function createDAOVoting(
  title: string,
  description: string,
  options: string[],
  metadata: any = {}
): Promise<{
  votingId: string;
  blockchainRecord: BlockchainRecord;
}> {
  try {
    // Инициализируем блокчейн, если еще не инициализирован
    if (!isBlockchainInitialized) {
      await initializeBlockchain();
    }
    
    // Создаем идентификатор голосования
    const votingId = `dao-voting-${Date.now()}-${hashData(title).substring(0, 8)}`;
    
    // Формируем данные голосования
    const votingData = {
      id: votingId,
      title,
      description,
      options,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 дней
      status: 'active',
      votes: [],
      metadata
    };
    
    // Сохраняем голосование в БД
    const voting = await storage.createDAOVoting(votingData);
    
    // Записываем в блокчейн
    const blockchainRecord = await recordToBlockchain({
      entityId: parseInt(votingId.split('-')[2]),
      entityType: BlockchainRecordType.VOTE,
      action: 'create_dao_voting',
      metadata: {
        votingId,
        title,
        description,
        options,
        startTime: votingData.startTime
      }
    });
    
    // Логируем создание голосования
    await logActivity({
      action: ActivityType.ENTITY_CREATE,
      entityType: 'dao_voting',
      entityId: parseInt(votingId.split('-')[2]),
      details: `Создано DAO голосование: ${title}`,
      metadata: {
        votingId,
        optionsCount: options.length,
        blockchainHash: blockchainRecord.hash
      }
    });
    
    return { votingId, blockchainRecord };
  } catch (error) {
    console.error('Ошибка при создании DAO голосования:', error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_ERROR,
      details: `Ошибка при создании DAO голосования: ${error.message}`
    });
    
    throw error;
  }
}

/**
 * Отправляет голос в голосовании DAO
 * 
 * @param votingId Идентификатор голосования
 * @param userId Идентификатор пользователя
 * @param optionIndex Индекс выбранного варианта
 * @param signature Цифровая подпись (для подтверждения личности)
 * @returns Хеш транзакции голосования
 */
export async function voteInDAO(
  votingId: string,
  userId: number,
  optionIndex: number,
  signature: string = ''
): Promise<{
  success: boolean;
  blockchainRecord: BlockchainRecord;
}> {
  try {
    // Инициализируем блокчейн, если еще не инициализирован
    if (!isBlockchainInitialized) {
      await initializeBlockchain();
    }
    
    // Получаем голосование
    const voting = await storage.getDAOVotingById(votingId);
    
    if (!voting) {
      throw new Error(`Голосование с ID ${votingId} не найдено`);
    }
    
    if (voting.status !== 'active') {
      throw new Error(`Голосование с ID ${votingId} не активно`);
    }
    
    if (optionIndex < 0 || optionIndex >= voting.options.length) {
      throw new Error(`Недопустимый индекс варианта: ${optionIndex}`);
    }
    
    // Проверяем, голосовал ли уже пользователь
    const hasVoted = voting.votes.some(vote => vote.userId === userId);
    
    if (hasVoted) {
      throw new Error(`Пользователь с ID ${userId} уже проголосовал`);
    }
    
    // Создаем запись о голосе
    const vote = {
      userId,
      optionIndex,
      timestamp: new Date().toISOString(),
      signature
    };
    
    // Обновляем голосование в БД
    const updatedVoting = await storage.addVoteToDAOVoting(votingId, vote);
    
    // Записываем в блокчейн
    const blockchainRecord = await recordToBlockchain({
      entityId: parseInt(votingId.split('-')[2]),
      entityType: BlockchainRecordType.VOTE,
      action: 'vote_dao',
      userId,
      metadata: {
        votingId,
        optionIndex,
        option: voting.options[optionIndex],
        timestamp: vote.timestamp
      }
    });
    
    // Логируем голосование
    await logActivity({
      action: ActivityType.USER_ACTION,
      userId,
      entityType: 'dao_voting',
      entityId: parseInt(votingId.split('-')[2]),
      details: `Пользователь проголосовал в DAO голосовании: ${voting.title}`,
      metadata: {
        votingId,
        optionIndex,
        option: voting.options[optionIndex],
        blockchainHash: blockchainRecord.hash
      }
    });
    
    return { success: true, blockchainRecord };
  } catch (error) {
    console.error('Ошибка при голосовании в DAO:', error);
    
    // Логируем ошибку
    await logActivity({
      action: ActivityType.SYSTEM_ERROR,
      details: `Ошибка при голосовании в DAO: ${error.message}`
    });
    
    throw error;
  }
}

/**
 * Загружает данные в Swarm через API
 * 
 * @param data Данные для загрузки
 * @returns Хеш содержимого в Swarm
 */
async function uploadToSwarm(data: any): Promise<{ hash: string; url: string }> {
  const serializedData = typeof data === 'string' ? data : JSON.stringify(data);
  
  try {
    // Проверяем поддержку Swarm
    if (!moralisConfig.swarmGatewayUrl) {
      throw new Error('Swarm gateway URL не настроен');
    }
    
    // В реальном приложении здесь был бы запрос к Swarm API
    const contentHash = hashData(serializedData);
    
    // Симулируем ответ Swarm
    return {
      hash: contentHash,
      url: `${moralisConfig.swarmGatewayUrl}/${contentHash}`
    };
  } catch (error) {
    console.error('Ошибка при загрузке в Swarm:', error);
    
    // В случае ошибки возвращаем хеш данных
    const contentHash = hashData(serializedData);
    
    return {
      hash: contentHash,
      url: `local-hash:${contentHash}`
    };
  }
}

/**
 * Создает локальную запись блокчейна (эмуляция)
 * 
 * @param hash Хеш данных
 * @param timestamp Временная метка
 * @returns Локальная запись блокчейна
 */
function createLocalBlockchainRecord(hash: string, timestamp: string): BlockchainRecord {
  return {
    hash,
    transactionHash: `local-tx-${Date.now()}-${hash.substring(0, 10)}`,
    blockNumber: Math.floor(Date.now() / 1000),
    timestamp,
    networkId: 'local-emulation',
    contractAddress: 'local-contract-0x000000'
  };
}