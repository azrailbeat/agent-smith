/**
 * Simple blockchain service for demonstration
 * In a real implementation, this would connect to a proper blockchain node
 */

import crypto from 'crypto';

// Generate a random blockchain-like hash
function generateRandomHash(): string {
  return '0x' + crypto.randomBytes(16).toString('hex').substring(0, 16);
}

// Create timestamp for blockchain records
function getTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

// Interface for blockchain record
interface BlockchainData {
  type: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  timestamp?: number;
}

// Interface for blockchain response
interface BlockchainResponse {
  transactionHash: string;
  blockHeight?: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * Record a document or decision to blockchain
 * This is a simulated function that would normally connect to a real blockchain
 */
export async function recordToBlockchain(data: BlockchainData): Promise<BlockchainResponse> {
  // In a real implementation, this would interact with a blockchain
  const timestamp = data.timestamp || getTimestamp();
  const transactionHash = generateRandomHash();
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  return {
    transactionHash,
    blockHeight: Math.floor(Math.random() * 1000000) + 10000000,
    timestamp,
    status: 'confirmed'
  };
}

/**
 * Verify a blockchain record
 * This is a simulated function that would normally verify against a real blockchain
 */
export async function verifyBlockchainRecord(transactionHash: string): Promise<{
  verified: boolean;
  blockHeight?: number;
  timestamp?: number;
  data?: Record<string, any>;
}> {
  // In a real implementation, this would check the blockchain
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
  
  // Simulate success most of the time
  if (Math.random() > 0.05) {
    return {
      verified: true,
      blockHeight: Math.floor(Math.random() * 1000000) + 10000000,
      timestamp: getTimestamp() - Math.floor(Math.random() * 86400),
      data: {
        type: "document", 
        title: "Verified blockchain record",
        content: "Hash verification successful"
      }
    };
  }
  
  return { verified: false };
}

/**
 * Generate a hash for any data
 */
export function generateDataHash(data: any): string {
  return crypto
    .createHash('sha256')
    .update(typeof data === 'string' ? data : JSON.stringify(data))
    .digest('hex');
}
