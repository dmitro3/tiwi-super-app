/**
 * TIWI Activity Service
 * 
 * Tracks and retrieves activities performed within the TIWI ecosystem/dApp platform.
 * Only transactions and NFT activities executed through TIWI are tracked and displayed.
 */

import { supabase } from '@/lib/backend/utils/supabase';
import type { Transaction, TransactionType } from '@/lib/backend/types/wallet';
import type { NFTActivity } from '@/lib/backend/types/nft';

// ============================================================================
// TIWI Activity Service Class
// ============================================================================

export class TIWIActivityService {
  /**
   * Save a transaction performed through TIWI platform
   * 
   * @param transaction - Transaction data to track
   */
  async saveTransaction(transaction: {
    walletAddress: string;
    transactionHash: string;
    chainId: number;
    type: TransactionType;
    fromTokenAddress?: string;
    fromTokenSymbol?: string;
    toTokenAddress?: string;
    toTokenSymbol?: string;
    amount?: string;
    amountFormatted?: string;
    usdValue?: number;
    routerName?: string;
    blockNumber?: number;
    blockTimestamp?: Date;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('tiwi_transactions')
        .insert({
          wallet_address: transaction.walletAddress.toLowerCase(),
          transaction_hash: transaction.transactionHash,
          chain_id: transaction.chainId,
          transaction_type: transaction.type,
          from_token_address: transaction.fromTokenAddress,
          from_token_symbol: transaction.fromTokenSymbol,
          to_token_address: transaction.toTokenAddress,
          to_token_symbol: transaction.toTokenSymbol,
          amount: transaction.amount,
          amount_formatted: transaction.amountFormatted,
          usd_value: transaction.usdValue,
          router_name: transaction.routerName,
          block_number: transaction.blockNumber,
          block_timestamp: transaction.blockTimestamp?.toISOString(),
        });

      if (error) {
        // Ignore duplicate errors (transaction already tracked)
        if (error.code !== '23505') { // Unique constraint violation
          console.error('[TIWIActivityService] Error saving transaction:', error);
        }
      }
    } catch (error) {
      console.error('[TIWIActivityService] Error saving transaction:', error);
    }
  }

  /**
   * Get TIWI platform transactions for a wallet
   * 
   * @param walletAddress - Wallet address
   * @param options - Query options
   * @returns Array of TIWI platform transactions
   */
  async getTransactions(
    walletAddress: string,
    options: {
      chainIds?: number[];
      types?: TransactionType[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Transaction[]> {
    try {
      const {
        chainIds,
        types,
        limit = 50,
        offset = 0,
      } = options;

      let query = supabase
        .from('tiwi_transactions')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .order('block_timestamp', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);

      // Filter by chain IDs if provided
      if (chainIds && chainIds.length > 0) {
        query = query.in('chain_id', chainIds);
      }

      // Filter by types if provided
      if (types && types.length > 0) {
        query = query.in('transaction_type', types);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[TIWIActivityService] Error fetching transactions:', error);
        return [];
      }

      // Convert database records to Transaction format
      return (data || []).map((record) => ({
        id: record.id,
        hash: record.transaction_hash,
        type: record.transaction_type as TransactionType,
        from: walletAddress, // Will be enriched from transaction data if needed
        to: record.to_token_address || '',
        tokenAddress: record.to_token_address || record.from_token_address || '',
        tokenSymbol: record.to_token_symbol || record.from_token_symbol || '',
        amount: record.amount || '0',
        amountFormatted: record.amount_formatted || '0',
        usdValue: record.usd_value?.toString(),
        timestamp: record.block_timestamp 
          ? new Date(record.block_timestamp).getTime()
          : new Date(record.created_at).getTime(),
        date: this.formatDate(
          record.block_timestamp 
            ? new Date(record.block_timestamp).getTime()
            : new Date(record.created_at).getTime()
        ),
        chainId: record.chain_id,
        status: 'confirmed' as const,
        blockNumber: record.block_number,
        metadata: {
          routerName: record.router_name,
          protocol: record.router_name,
        },
      }));
    } catch (error) {
      console.error('[TIWIActivityService] Error fetching transactions:', error);
      return [];
    }
  }

  /**
   * Save an NFT activity performed through TIWI platform
   * 
   * @param activity - NFT activity data to track
   */
  async saveNFTActivity(activity: {
    walletAddress: string;
    transactionHash: string;
    chainId: number;
    contractAddress: string;
    tokenId: string;
    type: 'mint' | 'transfer' | 'sent' | 'received' | 'sale' | 'purchase';
    fromAddress?: string;
    toAddress?: string;
    price?: string;
    priceUSD?: number;
    blockTimestamp?: Date;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('tiwi_nft_activities')
        .insert({
          wallet_address: activity.walletAddress.toLowerCase(),
          transaction_hash: activity.transactionHash,
          chain_id: activity.chainId,
          contract_address: activity.contractAddress,
          token_id: activity.tokenId,
          activity_type: activity.type,
          from_address: activity.fromAddress,
          to_address: activity.toAddress,
          price: activity.price,
          price_usd: activity.priceUSD,
          block_timestamp: activity.blockTimestamp?.toISOString(),
        });

      if (error) {
        // Ignore duplicate errors (activity already tracked)
        if (error.code !== '23505') { // Unique constraint violation
          console.error('[TIWIActivityService] Error saving NFT activity:', error);
        }
      }
    } catch (error) {
      console.error('[TIWIActivityService] Error saving NFT activity:', error);
    }
  }

  /**
   * Get TIWI platform NFT activities for a wallet
   * 
   * @param walletAddress - Wallet address
   * @param options - Query options
   * @returns Array of TIWI platform NFT activities
   */
  async getNFTActivities(
    walletAddress: string,
    options: {
      contractAddress?: string;
      tokenId?: string;
      chainId?: number;
      limit?: number;
    } = {}
  ): Promise<NFTActivity[]> {
    try {
      const {
        contractAddress,
        tokenId,
        chainId,
        limit = 50,
      } = options;

      let query = supabase
        .from('tiwi_nft_activities')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .order('block_timestamp', { ascending: false, nullsFirst: false })
        .limit(limit);

      // Filter by contract address if provided
      if (contractAddress) {
        query = query.eq('contract_address', contractAddress.toLowerCase());
      }

      // Filter by token ID if provided
      if (tokenId) {
        query = query.eq('token_id', tokenId);
      }

      // Filter by chain ID if provided
      if (chainId) {
        query = query.eq('chain_id', chainId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[TIWIActivityService] Error fetching NFT activities:', error);
        return [];
      }

      // Convert database records to NFTActivity format
      return (data || []).map((record) => {
        const timestamp = record.block_timestamp 
          ? new Date(record.block_timestamp).getTime()
          : new Date(record.created_at).getTime();

        return {
          type: record.activity_type as NFTActivity['type'],
          date: this.formatDate(timestamp),
          timestamp,
          nftName: record.contract_address, // Will be enriched with actual NFT name if available
          price: record.price,
          priceUSD: record.price_usd?.toString(),
          from: record.from_address,
          to: record.to_address,
          transactionHash: record.transaction_hash,
        };
      });
    } catch (error) {
      console.error('[TIWIActivityService] Error fetching NFT activities:', error);
      return [];
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
}

// ============================================================================
// Singleton Instance
// ============================================================================

let tiwiActivityServiceInstance: TIWIActivityService | null = null;

/**
 * Get singleton TIWIActivityService instance
 */
export function getTIWIActivityService(): TIWIActivityService {
  if (!tiwiActivityServiceInstance) {
    tiwiActivityServiceInstance = new TIWIActivityService();
  }
  return tiwiActivityServiceInstance;
}

