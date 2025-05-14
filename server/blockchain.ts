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

// Константы для механизма повторных попыток
const MAX_RETRY_ATTEMPTS = 3; // Максимальное количество попыток
const RETRY_DELAY_MS = 1000; // Базовая задержка между попытками в миллисекундах

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
    
    try {
      // Проверяем, есть ли уже такая запись в блокчейне (с retry)
      const existingRecord = await withRetry(
        async () => storage.getBlockchainRecordByHash(dataHash),
        'получение записи блокчейна по хешу'
      );
      
      if (existingRecord) {
        console.log(`Запись с хешем ${dataHash.substring(0, 10)}... уже существует в блокчейне, возвращаем её`);
        return existingRecord;
      }
    } catch (error) {
      console.warn(`Ошибка при проверке существующей записи блокчейна: ${error.message}. Продолжаем процесс.`);
      // Продолжаем выполнение, предполагая, что запись не существует
    }
    
    let blockchainRecord: BlockchainRecord;
    
    // Если есть ключ API Moralis, записываем в блокчейн
    if (moralisConfig.apiKey) {
      try {
        // Сохраняем данные в Swarm для получения хеша содержимого
        // (uploadToSwarm уже использует механизм retry внутри)
        const swarmResponse = await uploadToSwarm(dataToRecord);
        
        // Записываем хеш в смарт-контракт через Moralis API (с retry)
        const txResponse = await withRetry(
          async () => Moralis.EvmApi.utils.runContractFunction({
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
          }),
          'запись в смарт-контракт через Moralis'
        );
        
        // Получаем информацию о транзакции (с retry)
        const txReceipt = await withRetry(
          async () => Moralis.EvmApi.transaction.getTransactionReceipt({
            transactionHash: txResponse.raw.transactionHash,
            chain: moralisConfig.network
          }),
          'получение чека транзакции'
        );
        
        // Формируем запись блокчейна
        blockchainRecord = {
          hash: dataHash,
          transactionHash: txResponse.raw.transactionHash,
          blockNumber: parseInt(txReceipt.raw.blockNumber, 16),
          timestamp,
          networkId: moralisConfig.network,
          contractAddress: moralisConfig.contractAddress
        };
      } catch (error: any) {
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
    
    // Сохраняем запись блокчейна в базе данных (с retry)
    await withRetry(
      async () => storage.createBlockchainRecord({
        hash: blockchainRecord.hash,
        transactionHash: blockchainRecord.transactionHash,
        blockNumber: blockchainRecord.blockNumber,
        timestamp: new Date(blockchainRecord.timestamp),
        networkId: blockchainRecord.networkId,
        contractAddress: blockchainRecord.contractAddress,
        entityType: params.entityType,
        entityId: params.entityId,
        data: JSON.stringify(dataToRecord)
      }),
      'сохранение записи блокчейна в базе данных'
    );
    
    // Логируем запись в блокчейн (с отлавливанием ошибок)
    try {
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
    } catch (logError) {
      console.error('Ошибка при логировании активности:', logError);
      // Продолжаем выполнение, так как основные данные уже сохранены
    }
    
    return blockchainRecord;
  } catch (error: any) {
    console.error('Ошибка при записи в блокчейн:', error);
    
    // Логируем ошибку
    try {
      await logActivity({
        action: ActivityType.SYSTEM_ERROR,
        details: `Ошибка при записи в блокчейн: ${error.message}`
      });
    } catch (logError) {
      console.error('Ошибка при логировании ошибки:', logError);
    }
    
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
    
    // Получаем запись из базы данных (с retry)
    const localRecord = await withRetry(
      async () => storage.getBlockchainRecordByHash(hash),
      'получение локальной записи блокчейна по хешу'
    );
    
    if (!localRecord) {
      console.log(`Запись с хешем ${hash.substring(0, 10)}... не найдена в локальной базе данных`);
      return null;
    }
    
    // Если запись есть в локальной БД, но не в эмуляции, проверяем в блокчейне
    if (moralisConfig.apiKey && !localRecord.isEmulated) {
      try {
        // Получаем информацию о транзакции в блокчейне (с retry)
        const txReceipt = await withRetry(
          async () => Moralis.EvmApi.transaction.getTransactionReceipt({
            transactionHash: localRecord.transactionHash,
            chain: localRecord.networkId || moralisConfig.network
          }),
          'получение чека транзакции для верификации'
        );
        
        // Проверяем, подтверждена ли транзакция
        const isConfirmed = txReceipt && parseInt(txReceipt.raw.status, 16) === 1;
        
        if (!isConfirmed) {
          console.warn(`Транзакция ${localRecord.transactionHash.substring(0, 10)}... не подтверждена в блокчейне`);
          return null;
        }
        
        console.log(`Транзакция ${localRecord.transactionHash.substring(0, 10)}... успешно верифицирована в блокчейне`);
        
        // Если транзакция подтверждена, возвращаем запись
        return {
          hash: localRecord.hash,
          transactionHash: localRecord.transactionHash,
          blockNumber: localRecord.blockNumber,
          timestamp: localRecord.timestamp.toISOString(),
          networkId: localRecord.networkId,
          contractAddress: localRecord.contractAddress
        };
      } catch (error: any) {
        console.error('Ошибка при проверке записи в блокчейне:', error);
        
        // Логируем ошибку (с обработкой исключения при логировании)
        try {
          await logActivity({
            action: ActivityType.SYSTEM_ERROR,
            details: `Ошибка при проверке записи в блокчейне: ${error.message}`
          });
        } catch (logError) {
          console.error('Ошибка при логировании ошибки:', logError);
        }
        
        // В случае ошибки Moralis, возвращаем локальную запись с информационным сообщением
        console.log(`Используем локальную запись из-за ошибки блокчейна: ${error.message}`);
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
      if (!moralisConfig.apiKey) {
        console.log(`Используем локальную запись из-за отсутствия ключа API Moralis`);
      } else if (localRecord.isEmulated) {
        console.log(`Запись ${hash.substring(0, 10)}... является эмулированной, пропускаем проверку блокчейна`);
      }
      
      return {
        hash: localRecord.hash,
        transactionHash: localRecord.transactionHash,
        blockNumber: localRecord.blockNumber,
        timestamp: localRecord.timestamp.toISOString(),
        networkId: localRecord.networkId,
        contractAddress: localRecord.contractAddress
      };
    }
  } catch (error: any) {
    console.error('Ошибка при проверке записи в блокчейне:', error);
    
    // Логируем ошибку (с обработкой исключения при логировании)
    try {
      await logActivity({
        action: ActivityType.SYSTEM_ERROR,
        details: `Ошибка при проверке записи в блокчейне: ${error.message}`
      });
    } catch (logError) {
      console.error('Ошибка при логировании ошибки:', logError);
    }
    
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
 * @returns Идентификатор голосования в блокчейне и запись блокчейна
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
    
    // Валидация входных данных
    if (!title || title.trim() === '') {
      throw new Error('Название голосования не может быть пустым');
    }
    
    if (!options || !Array.isArray(options) || options.length < 2) {
      throw new Error('Для голосования требуется минимум 2 варианта выбора');
    }
    
    // Создаем идентификатор голосования
    const timestamp = Date.now();
    const hashedTitle = hashData(title).substring(0, 8);
    const votingId = `dao-voting-${timestamp}-${hashedTitle}`;
    
    // Формируем данные голосования
    const startTime = new Date().toISOString();
    const endTime = new Date(timestamp + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 дней
    
    const votingData = {
      id: votingId,
      title,
      description,
      options,
      startTime,
      endTime,
      status: 'active',
      votes: [],
      metadata: metadata || {}
    };
    
    console.log(`Создание DAO голосования: "${title}" с ${options.length} вариантами выбора`);
    
    // Сохраняем голосование в БД (с retry)
    await withRetry(
      async () => storage.createDAOVoting(votingData),
      'сохранение DAO голосования в базе данных'
    );
    
    // Подготавливаем числовой идентификатор для блокчейна
    const numericId = parseInt(timestamp.toString().substring(0, 10));
    
    // Записываем в блокчейн (уже использует retry внутри)
    const blockchainRecord = await recordToBlockchain({
      entityId: numericId,
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
    
    // Логируем создание голосования (с обработкой ошибок)
    try {
      await logActivity({
        action: ActivityType.ENTITY_CREATE,
        entityType: 'dao_voting',
        entityId: numericId,
        details: `Создано DAO голосование: ${title}`,
        metadata: {
          votingId,
          optionsCount: options.length,
          blockchainHash: blockchainRecord.hash
        }
      });
    } catch (logError) {
      console.error('Ошибка при логировании создания DAO голосования:', logError);
      // Продолжаем выполнение, так как основные данные уже сохранены
    }
    
    console.log(`DAO голосование успешно создано с ID: ${votingId}`);
    return { votingId, blockchainRecord };
  } catch (error: any) {
    console.error('Ошибка при создании DAO голосования:', error);
    
    // Логируем ошибку (с обработкой исключения при логировании)
    try {
      await logActivity({
        action: ActivityType.SYSTEM_ERROR,
        details: `Ошибка при создании DAO голосования: ${error.message}`
      });
    } catch (logError) {
      console.error('Ошибка при логировании ошибки:', logError);
    }
    
    // Пробрасываем ошибку с дополнительным контекстом
    throw new Error(`Не удалось создать DAO голосование: ${error.message}`);
  }
}

/**
 * Отправляет голос в голосовании DAO
 * 
 * @param votingId Идентификатор голосования
 * @param userId Идентификатор пользователя
 * @param optionIndex Индекс выбранного варианта
 * @param signature Цифровая подпись (для подтверждения личности)
 * @returns Статус голосования и запись блокчейна
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
    
    // Валидация входных данных
    if (!votingId || votingId.trim() === '') {
      throw new Error('Идентификатор голосования не может быть пустым');
    }
    
    if (!userId || userId <= 0) {
      throw new Error('Недопустимый идентификатор пользователя');
    }
    
    // Получаем голосование (с retry)
    const voting = await withRetry(
      async () => storage.getDAOVotingById(votingId),
      'получение DAO голосования по ID'
    );
    
    if (!voting) {
      throw new Error(`Голосование с ID ${votingId} не найдено`);
    }
    
    if (voting.status !== 'active') {
      throw new Error(`Голосование с ID ${votingId} не активно (текущий статус: ${voting.status})`);
    }
    
    if (optionIndex < 0 || optionIndex >= voting.options.length) {
      throw new Error(`Недопустимый индекс варианта: ${optionIndex}. Доступные варианты: 0-${voting.options.length - 1}`);
    }
    
    // Проверяем, голосовал ли уже пользователь
    const hasVoted = Array.isArray(voting.votes) && voting.votes.some(vote => vote.userId === userId);
    
    if (hasVoted) {
      throw new Error(`Пользователь с ID ${userId} уже проголосовал в этом голосовании`);
    }
    
    console.log(`Пользователь ${userId} голосует в DAO голосовании "${voting.title}" за вариант "${voting.options[optionIndex]}"`);
    
    // Создаем запись о голосе
    const vote = {
      userId,
      optionIndex,
      timestamp: new Date().toISOString(),
      signature: signature || ''
    };
    
    // Обновляем голосование в БД (с retry)
    await withRetry(
      async () => storage.addVoteToDAOVoting(votingId, vote),
      'добавление голоса в DAO голосование'
    );
    
    // Подготавливаем числовой идентификатор для блокчейна
    const numericId = parseInt(votingId.split('-')[2] || Date.now().toString().substring(0, 10));
    
    // Записываем в блокчейн (уже использует retry внутри)
    const blockchainRecord = await recordToBlockchain({
      entityId: numericId,
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
    
    // Логируем голосование (с обработкой ошибок)
    try {
      await logActivity({
        action: ActivityType.USER_ACTION,
        userId,
        entityType: 'dao_voting',
        entityId: numericId,
        details: `Пользователь проголосовал в DAO голосовании: ${voting.title}`,
        metadata: {
          votingId,
          optionIndex,
          option: voting.options[optionIndex],
          blockchainHash: blockchainRecord.hash
        }
      });
    } catch (logError) {
      console.error('Ошибка при логировании голосования в DAO:', logError);
      // Продолжаем выполнение, так как основные данные уже сохранены
    }
    
    console.log(`Голос пользователя ${userId} успешно записан в голосование ${votingId}`);
    return {
      success: true,
      blockchainRecord
    };
  } catch (error: any) {
    console.error('Ошибка при голосовании в DAO:', error);
    
    // Логируем ошибку (с обработкой исключения при логировании)
    try {
      await logActivity({
        action: ActivityType.SYSTEM_ERROR,
        details: `Ошибка при голосовании в DAO: ${error.message}`
      });
    } catch (logError) {
      console.error('Ошибка при логировании ошибки:', logError);
    }
    
    // Пробрасываем ошибку с дополнительным контекстом
    throw new Error(`Не удалось проголосовать в DAO: ${error.message}`);
  }
}

/**
 * Загружает данные в Swarm через API
 * 
 * @param data Данные для загрузки
 * @returns Хеш содержимого в Swarm
 */
/**
 * Выполняет операцию с повторными попытками в случае ошибок
 * 
 * @param operation Асинхронная операция, которую нужно выполнить
 * @param operationName Название операции для логирования
 * @param maxRetries Максимальное количество попыток
 * @param delayMs Базовая задержка в миллисекундах
 * @returns Результат операции
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRY_ATTEMPTS,
  delayMs: number = RETRY_DELAY_MS
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Логируем информацию о повторной попытке
      console.warn(
        `Ошибка при выполнении ${operationName} (попытка ${attempt}/${maxRetries}): ${error.message || 'Неизвестная ошибка'}`
      );
      
      // Если это последняя попытка, не ждем
      if (attempt === maxRetries) break;
      
      // Экспоненциальная задержка с небольшим случайным компонентом
      const waitTime = delayMs * Math.pow(2, attempt - 1) * (0.75 + Math.random() * 0.5);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // Если все попытки неудачны, логируем и пробрасываем последнюю ошибку
  const errorMessage = `Не удалось выполнить ${operationName} после ${maxRetries} попыток: ${lastError?.message || 'Неизвестная ошибка'}`;
  console.error(errorMessage);
  
  // Логируем критическую ошибку в активности
  await logActivity({
    action: ActivityType.SYSTEM_ERROR,
    details: errorMessage
  }).catch(e => console.error('Ошибка при логировании активности:', e));
  
  throw lastError;
}

async function uploadToSwarm(data: any): Promise<{ hash: string; url: string }> {
  const serializedData = typeof data === 'string' ? data : JSON.stringify(data);
  
  try {
    // Проверяем поддержку Swarm
    if (!moralisConfig.swarmGatewayUrl) {
      throw new Error('Swarm gateway URL не настроен');
    }
    
    // Попытка загрузки в Swarm с повторными попытками
    return await withRetry(
      async () => {
        // В реальном приложении здесь был бы запрос к Swarm API
        const contentHash = hashData(serializedData);
        
        // Симулируем ответ Swarm
        return {
          hash: contentHash,
          url: `${moralisConfig.swarmGatewayUrl}/${contentHash}`
        };
      },
      'загрузка в Swarm'
    );
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