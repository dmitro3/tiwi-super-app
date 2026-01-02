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
  usdValue?: string; // USD value of the balance (from Moralis /wallets/{address}/tokens)
  priceUSD?: string; // Price per token in USD (from Moralis /wallets/{address}/tokens)
  priceChange24h?: string; // 24h price change percentage (from Moralis /wallets/{address}/tokens)
  portfolioPercentage?: string; // Percentage of portfolio (from Moralis /wallets/{address}/tokens)
  verified?: boolean; // Whether contract is verified (from Moralis /wallets/{address}/tokens)
}

// ============================================================================
// Transaction
// ============================================================================

export type TransactionType = 
  | 'Swap' 
  | 'Sent' 
  | 'Received' 
  | 'Stake' 
  | 'Unstake' 
  | 'Approve' 
  | 'Transfer'
  | 'DeFi'           // Generic DeFi activity
  | 'NFTTransfer'   // NFT transfers
  | 'ContractCall'; // Contract interactions
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
  chainId?: number; // Optional - only when chain is known (single-chain requests)
  status: TransactionStatus;
  blockNumber?: number;
  // Enhanced fields for portfolio activities
  gasFee?: string; // Gas fee in native token (formatted)
  gasFeeUSD?: string; // Gas fee in USD
  explorerUrl?: string; // Block explorer link (optional - only when chainId is known)
  tokenLogo?: string; // Token logo URL
  // Additional metadata
  metadata?: {
    protocol?: string;        // DEX/Protocol name (e.g., "Uniswap", "PancakeSwap")
    swapRoute?: string;        // Swap route
    dexName?: string;          // DEX name (Uniswap, PancakeSwap, etc.)
    pair?: string;             // Trading pair (e.g., "ETH/USDC")
    fromToken?: string;         // Token symbol sent
    toToken?: string;           // Token symbol received
    fromAmount?: string;        // Amount sent (formatted)
    toAmount?: string;          // Amount received (formatted)
    methodLabel?: string;       // Contract method name
    methodHash?: string;        // Method signature hash
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
  dailyChange?: number; // Daily percentage change (weighted average)
  dailyChangeUSD?: string; // Daily USD change (absolute value)
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

