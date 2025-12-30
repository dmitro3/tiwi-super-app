/**
 * Transaction History Service
 * 
 * Orchestrates transaction history fetching across multiple chains.
 * Handles pagination, filtering, and normalization.
 */

import { getCache, CACHE_TTL } from '@/lib/backend/utils/cache';
import type { Transaction, TransactionHistoryResponse, TransactionType } from '@/lib/backend/types/wallet';
import { SOLANA_CHAIN_ID } from '@/lib/backend/providers/moralis';

// ============================================================================
// Transaction History Service Class
// ============================================================================

export class TransactionHistoryService {
  private cache = getCache();

  /**
   * Get transaction history for a wallet
   * 
   * @param address - Wallet address
   * @param options - Query options
   * @returns Transaction history response with pagination
   */
  async getTransactionHistory(
    address: string,
    options: {
      chainIds?: number[];
      types?: TransactionType[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<TransactionHistoryResponse> {
    const {
      chainIds,
      types,
      limit = 20,
      offset = 0,
    } = options;

    // Default to major chains if not specified
    const chainsToFetch = chainIds || [
      1,      // Ethereum
      56,     // BSC
      137,    // Polygon
      42161,  // Arbitrum
      43114,  // Avalanche
      8453,   // Base
      SOLANA_CHAIN_ID, // Solana
    ];

    // Check cache
    const cacheKey = `transactions:${address.toLowerCase()}:${chainsToFetch.sort().join(',')}:${limit}:${offset}`;
    const cached = this.cache.get<TransactionHistoryResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    // TODO: Implement actual transaction fetching from Moralis/blockchain
    // For now, return mock data structure
    // This will be implemented in the next phase with Moralis transaction API
    
    // Placeholder: Fetch transactions from Moralis
    const transactions = await this.fetchTransactionsFromMoralis(
      address,
      chainsToFetch,
      types,
      limit + offset // Fetch more to determine hasMore
    );

    // Apply pagination
    const paginatedTransactions = transactions.slice(offset, offset + limit);
    const hasMore = transactions.length > offset + limit;

    // Build response
    const response: TransactionHistoryResponse = {
      address,
      transactions: paginatedTransactions,
      total: transactions.length, // This would be actual total from API
      limit,
      offset,
      hasMore,
      timestamp: Date.now(),
    };

    // Cache response
    this.cache.set(cacheKey, response, CACHE_TTL.TRANSACTIONS);

    return response;
  }

  /**
   * Fetch transactions from Moralis API
   */
  private async fetchTransactionsFromMoralis(
    address: string,
    chainIds: number[],
    types?: TransactionType[],
    limit: number = 20
  ): Promise<Transaction[]> {
    const allTransactions: Transaction[] = [];
    
    // Ensure Moralis is initialized
    const { initializeMoralis } = await import('@/lib/backend/utils/moralis-init');
    await initializeMoralis();
    
    const { SOLANA_CHAIN_ID } = await import('@/lib/backend/providers/moralis');
    const Moralis = (await import('moralis')).default;
    const CHAIN_ID_TO_MORALIS: Record<number, string> = {
      1: '0x1',
      10: '0xa',
      56: '0x38',
      137: '0x89',
      42161: '0xa4b1',
      43114: '0xa86a',
      8453: '0x2105',
      250: '0xfa',
      100: '0x64',
      1101: '0x44d',
      324: '0x144',
      5000: '0x1388',
      59144: '0xe708',
      534352: '0x82750',
    };
    
    // Fetch transactions for all chains in parallel with timeout
    const fetchPromises = chainIds.map(async (chainId) => {
      try {
        // Add timeout to prevent hanging requests
        const timeoutPromise = new Promise<Transaction[]>((resolve) => {
          setTimeout(() => resolve([]), 10000); // 10 second timeout
        });
        
        const fetchPromise = (async () => {
          if (chainId === SOLANA_CHAIN_ID) {
            return await this.fetchSolanaTransactions(address, limit);
          } else {
            const moralisChain = CHAIN_ID_TO_MORALIS[chainId];
            if (!moralisChain) {
              return [];
            }
            return await this.fetchEVMTransactions(address, moralisChain, chainId, limit);
          }
        })();
        
        return await Promise.race([fetchPromise, timeoutPromise]);
      } catch (error) {
        console.error(`[TransactionHistoryService] Error fetching transactions for chain ${chainId}:`, error);
        return [];
      }
    });
    
    const results = await Promise.all(fetchPromises);
    
    // Flatten and sort by timestamp (newest first)
    for (const transactions of results) {
      allTransactions.push(...transactions);
    }
    
    allTransactions.sort((a, b) => b.timestamp - a.timestamp);
    
    // Filter by types if specified
    if (types && types.length > 0) {
      return allTransactions.filter(tx => types.includes(tx.type));
    }
    
    return allTransactions.slice(0, limit);
  }

  /**
   * Fetch EVM transactions from Moralis
   */
  private async fetchEVMTransactions(
    address: string,
    moralisChain: string,
    chainId: number,
    limit: number
  ): Promise<Transaction[]> {
    try {
      // Moralis is already initialized by the provider
      const Moralis = (await import('moralis')).default;
      
      const response = await Moralis.EvmApi.transaction.getWalletTransactions({
        address,
        chain: moralisChain,
        limit,
      });
      
      const transactions: Transaction[] = [];
      
      if (response.raw && Array.isArray(response.raw)) {
        for (const tx of response.raw) {
          try {
            // Determine transaction type
            const txType = this.determineTransactionType(tx, address);
            
            // Extract token information (if token transfer)
            const tokenAddress = tx.to_address?.address || '0x0000000000000000000000000000000000000000';
            const tokenSymbol = 'ETH'; // Default to native token
            const amount = tx.value || '0';
            const decimals = 18; // Native token decimals
            
            // Format amount
            const amountFormatted = this.formatBalance(amount, decimals);
            
            // Format date
            const timestamp = tx.block_timestamp 
              ? new Date(tx.block_timestamp).getTime()
              : Date.now();
            const date = this.formatDate(timestamp);
            
            transactions.push({
              id: tx.hash || `${chainId}-${tx.transaction_index || Date.now()}`,
              hash: tx.hash || '',
              type: txType,
              from: tx.from_address?.address || '',
              to: tx.to_address?.address || '',
              tokenAddress,
              tokenSymbol,
              amount,
              amountFormatted,
              timestamp,
              date,
              chainId,
              status: tx.receipt_status === '1' ? 'confirmed' : 'failed',
              blockNumber: tx.block_number ? parseInt(tx.block_number.toString(), 10) : undefined,
            });
          } catch (txError) {
            console.warn('[TransactionHistoryService] Error processing EVM transaction:', txError);
            continue;
          }
        }
      }
      
      return transactions;
    } catch (error) {
      console.error('[TransactionHistoryService] Error fetching EVM transactions:', error);
      return [];
    }
  }

  /**
   * Fetch Solana transactions from Moralis
   */
  private async fetchSolanaTransactions(
    address: string,
    limit: number
  ): Promise<Transaction[]> {
    try {
      // Moralis is already initialized by the provider
      const Moralis = (await import('moralis')).default;
      
      const response = await Moralis.SolApi.transaction.getTransactions({
        address,
        network: 'mainnet',
        limit,
      });
      
      const transactions: Transaction[] = [];
      
      const result = response.result || response;
      const txList = Array.isArray(result) ? result : (Array.isArray((result as any).data) ? (result as any).data : []);
      
      if (txList && Array.isArray(txList)) {
        for (const tx of txList) {
          try {
            const txData = tx as any;
            
            // Determine transaction type
            const txType = this.determineSolanaTransactionType(txData, address);
            
            // Extract amount (in lamports)
            const amount = txData.amount || txData.lamports || '0';
            const decimals = 9; // SOL decimals
            const amountFormatted = this.formatBalance(amount, decimals);
            
            // Format date
            const timestamp = txData.blockTime 
              ? txData.blockTime * 1000 
              : (txData.timestamp || Date.now());
            const date = this.formatDate(timestamp);
            
            transactions.push({
              id: txData.signature || `${Date.now()}-${Math.random()}`,
              hash: txData.signature || '',
              type: txType,
              from: address,
              to: txData.destination || address,
              tokenAddress: 'So11111111111111111111111111111111111111112', // Native SOL
              tokenSymbol: 'SOL',
              amount,
              amountFormatted,
              timestamp,
              date,
              chainId: 7565164, // Solana chain ID
              status: txData.err ? 'failed' : 'confirmed',
              blockNumber: txData.slot,
            });
          } catch (txError) {
            console.warn('[TransactionHistoryService] Error processing Solana transaction:', txError);
            continue;
          }
        }
      }
      
      return transactions;
    } catch (error) {
      console.error('[TransactionHistoryService] Error fetching Solana transactions:', error);
      return [];
    }
  }

  /**
   * Determine transaction type for EVM transactions
   */
  private determineTransactionType(tx: any, address: string): TransactionType {
    const from = tx.from_address?.address?.toLowerCase() || '';
    const to = tx.to_address?.address?.toLowerCase() || '';
    const addressLower = address.toLowerCase();
    
    // Check if it's a swap (interacts with DEX contract)
    if (tx.to_address?.address && this.isDEXContract(tx.to_address.address)) {
      return 'Swap';
    }
    
    // Check if it's a stake/unstake (interacts with staking contract)
    if (tx.to_address?.address && this.isStakingContract(tx.to_address.address)) {
      return tx.value && BigInt(tx.value) > BigInt(0) ? 'Stake' : 'Unstake';
    }
    
    // Check if sent or received
    if (from === addressLower && to !== addressLower) {
      return 'Sent';
    }
    
    if (to === addressLower && from !== addressLower) {
      return 'Received';
    }
    
    // Default to Transfer
    return 'Transfer';
  }

  /**
   * Determine transaction type for Solana transactions
   */
  private determineSolanaTransactionType(tx: any, address: string): TransactionType {
    // Check if it's a swap (Jupiter, Raydium, etc.)
    if (tx.programId && this.isSolanaDEXProgram(tx.programId)) {
      return 'Swap';
    }
    
    // Check if it's a stake/unstake
    if (tx.programId && this.isSolanaStakingProgram(tx.programId)) {
      return tx.amount && parseFloat(tx.amount) > 0 ? 'Stake' : 'Unstake';
    }
    
    // Check if sent or received
    const amount = parseFloat(tx.amount || tx.lamports || '0');
    if (amount > 0) {
      return 'Received';
    } else if (amount < 0) {
      return 'Sent';
    }
    
    return 'Transfer';
  }

  /**
   * Check if address is a known DEX contract
   */
  private isDEXContract(address: string): boolean {
    const dexContracts = [
      // Uniswap V2
      '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
      // Uniswap V3 Router
      '0xe592427a0aece92de3edee1f18e0157c05861564',
      // SushiSwap
      '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f',
      // PancakeSwap
      '0x10ed43c718714eb63d5aa57b78b54704e256024e',
      // 1inch
      '0x1111111254fb6c44bac0bed2854e76f90643097d',
    ];
    
    return dexContracts.includes(address.toLowerCase());
  }

  /**
   * Check if address is a known staking contract
   */
  private isStakingContract(address: string): boolean {
    // Add known staking contract addresses
    const stakingContracts: string[] = [];
    return stakingContracts.includes(address.toLowerCase());
  }

  /**
   * Check if Solana program is a DEX
   */
  private isSolanaDEXProgram(programId: string): boolean {
    const dexPrograms = [
      'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter
      '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium
    ];
    return dexPrograms.includes(programId);
  }

  /**
   * Check if Solana program is a staking program
   */
  private isSolanaStakingProgram(programId: string): boolean {
    const stakingPrograms = [
      'Stake11111111111111111111111111111111111112', // Native staking
    ];
    return stakingPrograms.includes(programId);
  }

  /**
   * Format balance from raw amount
   */
  private formatBalance(balance: string, decimals: number): string {
    try {
      if (!balance || balance === '0') return '0';
      
      const validDecimals = Math.max(0, Math.min(18, Math.floor(Number(decimals) || 18)));
      const balanceNum = BigInt(balance);
      const divisor = BigInt(10 ** validDecimals);
      const wholePart = balanceNum / divisor;
      const fractionalPart = balanceNum % divisor;
      
      if (fractionalPart === BigInt(0)) {
        return wholePart.toString();
      }
      
      const fractionalStr = fractionalPart.toString().padStart(validDecimals, '0');
      const trimmedFractional = fractionalStr.replace(/0+$/, '');
      return trimmedFractional ? `${wholePart}.${trimmedFractional}` : wholePart.toString();
    } catch (error) {
      return '0';
    }
  }

  /**
   * Format date from timestamp
   */
  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  /**
   * Clear cache for a specific address
   */
  clearCache(address: string): void {
    // Similar to wallet balance service
    // Rely on TTL expiration for now
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let transactionHistoryServiceInstance: TransactionHistoryService | null = null;

/**
 * Get singleton TransactionHistoryService instance
 */
export function getTransactionHistoryService(): TransactionHistoryService {
  if (!transactionHistoryServiceInstance) {
    transactionHistoryServiceInstance = new TransactionHistoryService();
  }
  return transactionHistoryServiceInstance;
}

