/**
 * Wallet-related types for backend services
 * Used for wallet balances and transaction history
 */

// ============================================================================
// Wallet Token Balance
// ============================================================================

export interface WalletToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string; // Raw balance in smallest unit (wei, lamports, etc.)
  balanceFormatted: string; // Human-readable balance
  chainId: number;
  logoURI?: string;
  usdValue?: string; // USD value of the balance
  priceUSD?: string; // Price per token in USD
}

// ============================================================================
// Transaction
// ============================================================================

export type TransactionType = 'Swap' | 'Sent' | 'Received' | 'Stake' | 'Unstake' | 'Approve' | 'Transfer';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface Transaction {
  id: string; // Unique transaction ID (hash or generated ID)
  hash: string; // Transaction hash
  type: TransactionType;
  from: string; // Sender address
  to: string; // Recipient address
  tokenAddress: string; // Token contract address (or native token address)
  tokenSymbol: string;
  amount: string; // Raw amount in smallest unit
  amountFormatted: string; // Human-readable amount
  usdValue?: string; // USD value at time of transaction
  timestamp: number; // Unix timestamp in milliseconds
  date: string; // Formatted date string (e.g., "Oct 9, 2024")
  chainId: number;
  status: TransactionStatus;
  blockNumber?: number;
  // Additional metadata
  metadata?: {
    protocol?: string; // e.g., "TIWI", "Uniswap", "Jupiter"
    swapRoute?: string; // For swap transactions
    [key: string]: any;
  };
}

// ============================================================================
// Wallet Balance Response
// ============================================================================

export interface WalletBalanceResponse {
  address: string;
  balances: WalletToken[];
  totalUSD: string; // Total portfolio value in USD
  chains: number[]; // Chain IDs that were queried
  timestamp: number; // When the data was fetched
}

// ============================================================================
// Transaction History Response
// ============================================================================

export interface TransactionHistoryResponse {
  address: string;
  transactions: Transaction[];
  total: number; // Total number of transactions (for pagination)
  limit: number;
  offset: number;
  hasMore: boolean; // Whether there are more transactions
  timestamp: number;
}

// ============================================================================
// Price Data
// ============================================================================

export interface TokenPrice {
  address: string;
  symbol: string;
  chainId: number;
  priceUSD: string;
  timestamp: number;
}

