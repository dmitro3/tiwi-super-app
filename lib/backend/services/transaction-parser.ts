/**
 * Transaction Parser Service
 * 
 * Parses Moralis wallet history response and categorizes transactions.
 * Detects swaps, DeFi activities, and enhances transaction metadata.
 */

import type { Transaction, TransactionType } from '@/lib/backend/types/wallet';

// ============================================================================
// DEX Router Addresses (Known DEX Contracts)
// ============================================================================

const DEX_ROUTERS: Record<number, Record<string, string>> = {
  1: { // Ethereum
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D': 'Uniswap V2',
    '0xE592427A0AEce92De3Edee1F18E0157C05861564': 'Uniswap V3',
    '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F': 'SushiSwap',
    '0x1111111254EEB25477B68fb85Ed929f73A960582': '1inch',
    '0xDef1C0ded9bec7F1a1670819833240f027b25EfF': '0x Protocol',
  },
  56: { // BSC
    '0x10ED43C718714eb63d5aA57B78B54704E256024E': 'PancakeSwap V2',
    '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4': 'PancakeSwap V3',
    '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506': 'SushiSwap',
  },
  137: { // Polygon
    '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff': 'QuickSwap',
    '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506': 'SushiSwap',
  },
  42161: { // Arbitrum
    '0xE592427A0AEce92De3Edee1F18E0157C05861564': 'Uniswap V3',
    '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506': 'SushiSwap',
  },
  43114: { // Avalanche
    '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106': 'Pangolin',
    '0x60aE616a2155Ee3d9A68541Ba454486b0938d625': 'Trader Joe',
  },
  8453: { // Base
    '0x2626664c2603336E57B271c5C0b26F421741e481': 'Uniswap V3',
    '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24': 'BaseSwap',
  },
};

// ============================================================================
// Swap Method Signatures
// ============================================================================

const SWAP_METHOD_SIGNATURES: Record<string, string> = {
  '0x7ff36ab5': 'swapExactETHForTokens',
  '0x18cbafe5': 'swapExactTokensForETH',
  '0x38ed1739': 'swapExactTokensForTokens',
  '0x4a25d94a': 'swapTokensForExactTokens',
  '0x8803dbee': 'swapTokensForExactETH',
  '0xb6f9de95': 'swapExactETHForTokensSupportingFeeOnTransferTokens',
  '0x5c11d795': 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
  '0x414bf389': 'exactInputSingle', // Uniswap V3
  '0xdb3e2198': 'exactInput/multicall', // Uniswap V3 (exactInput or multicall containing swaps)
};

// ============================================================================
// DeFi Method Signatures
// ============================================================================

const DEFI_METHOD_SIGNATURES: Record<string, string> = {
  '0xa694fc3a': 'stake',
  '0x3d18b912': 'unstake',
  '0x095ea7b3': 'approve',
  '0x23b872dd': 'transferFrom',
  '0xe8e33700': 'addLiquidity',
  '0xbaa2abde': 'removeLiquidity',
  '0x02751cec': 'removeLiquidityETH',
  '0xf305d719': 'addLiquidityETH',
};

// ============================================================================
// Transaction Parser Interface
// ============================================================================

interface MoralisERC20Transfer {
  token_name?: string;
  token_symbol?: string;
  token_logo?: string | null;
  token_decimals?: string;
  from_address: string;
  to_address: string;
  address: string; // Token contract address
  log_index: number;
  value: string;
  value_formatted?: string;
  possible_spam?: boolean;
  verified_contract?: boolean;
  direction: 'send' | 'receive';
}

interface MoralisNativeTransfer {
  from_address: string;
  to_address: string;
  value: string;
  value_formatted: string;
  direction: 'send' | 'receive';
  internal_transaction?: boolean;
  token_symbol?: string;
  token_logo?: string | null;
}

interface MoralisHistoryItem {
  chain?: string; // May be undefined in unified responses
  block_number: string;
  block_timestamp: string;
  hash: string;
  category: string; // Transaction category from Moralis
  log_index: number;
  from_address: string;
  to_address: string;
  value: string;
  gas: string;
  gas_price: string;
  receipt_status: string;
  receipt_gas_used?: string;
  transaction_fee?: string;
  token_address?: string;
  token_symbol?: string;
  token_name?: string;
  token_decimals?: string;
  token_logo?: string;
  value_formatted?: string;
  possible_spam?: boolean;
  verified_contract?: boolean;
  method_label?: string | null;
  method_hash?: string;
  erc20_transfers?: MoralisERC20Transfer[];
  native_transfers?: MoralisNativeTransfer[];
  nft_transfers?: any[];
  summary?: string;
}

// ============================================================================
// Transaction Parser Class
// ============================================================================

export class TransactionParser {
  /**
   * Parse Moralis wallet history response
   * 
   * @param historyResponse - Raw response from getWalletHistory
   * @param walletAddress - Wallet address (for determining sent/received)
   * @param chainIds - Array of chain IDs that were requested (used to map transactions to chains)
   * @returns Array of parsed and categorized transactions
   */
  parseWalletHistory(
    historyResponse: any,
    walletAddress: string,
    chainId?: number
  ): Transaction[] {
    const transactions: Transaction[] = [];
    const walletLower = walletAddress.toLowerCase();
    
    const items: MoralisHistoryItem[] = historyResponse.result || [];
    
    for (const item of items) {
      try {
        const transaction = this.parseHistoryItem(item, walletLower, chainId);
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error) {
        console.error('[TransactionParser] Error parsing transaction:', error);
        continue;
      }
    }
    
    // Sort by timestamp (newest first)
    return transactions.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Parse a single history item
   * Uses transfer arrays (erc20_transfers, native_transfers) for accurate data
   */
  private parseHistoryItem(
    item: MoralisHistoryItem,
    walletAddress: string,
    chainId?: number
  ): Transaction | null {
    try {
      // Parse timestamp
      const timestamp = new Date(item.block_timestamp).getTime();
      const date = this.formatDate(timestamp);

      // Determine transaction type from category field
      const txType = this.mapCategoryToTransactionType(item.category);

      // Extract data from transfer arrays (priority: erc20 > native > top-level)
      const erc20Transfer = item.erc20_transfers && item.erc20_transfers.length > 0 
        ? item.erc20_transfers[0] 
        : null;
      const nativeTransfer = item.native_transfers && item.native_transfers.length > 0 
        ? item.native_transfers[0] 
        : null;

      // Extract from address (priority: transfer arrays > top-level)
      const fromAddress = (
        erc20Transfer?.from_address ||
        nativeTransfer?.from_address ||
        item.from_address
      )?.toLowerCase() || '';

      // Extract to address (priority: transfer arrays > top-level)
      const toAddress = (
        erc20Transfer?.to_address ||
        nativeTransfer?.to_address ||
        item.to_address
      )?.toLowerCase() || '';

      // Extract token information
      let tokenAddress: string;
      let tokenSymbol: string;
      let tokenLogo: string | undefined;
      let amount: string;
      let amountFormatted: string;
      let decimals: number;

      if (erc20Transfer) {
        // ERC20 transfer
        tokenAddress = erc20Transfer.address || '0x0000000000000000000000000000000000000000';
        tokenSymbol = erc20Transfer.token_symbol || 'UNKNOWN';
        tokenLogo = erc20Transfer.token_logo || undefined;
        amount = erc20Transfer.value || '0';
        decimals = erc20Transfer.token_decimals ? parseInt(erc20Transfer.token_decimals, 10) : 18;
        // Use value_formatted if available, otherwise calculate
        amountFormatted = erc20Transfer.value_formatted || this.formatBalance(amount, decimals);
      } else if (nativeTransfer) {
        // Native transfer
        tokenAddress = '0x0000000000000000000000000000000000000000';
        tokenSymbol = nativeTransfer.token_symbol || 'ETH';
        tokenLogo = nativeTransfer.token_logo || undefined;
        amount = nativeTransfer.value || '0';
        decimals = 18;
        // Use value_formatted from native transfer
        amountFormatted = nativeTransfer.value_formatted || this.formatBalance(amount, decimals);
      } else {
        // Fallback to top-level fields
        tokenAddress = item.token_address || '0x0000000000000000000000000000000000000000';
        tokenSymbol = item.token_symbol || 'ETH';
        tokenLogo = item.token_logo || undefined;
        amount = item.value || '0';
        decimals = item.token_decimals ? parseInt(item.token_decimals, 10) : 18;
        amountFormatted = item.value_formatted || this.formatBalance(amount, decimals);
      }

      // Calculate gas fee
      const gasFee = this.calculateGasFee(item);

      // Generate explorer URL only if chainId is known (optional for future)
      const explorerUrl = chainId ? this.getExplorerUrl(item.hash, chainId) : undefined;

      // Build metadata
      const metadata = this.buildMetadata(item, txType);

      return {
        id: `${item.hash}-${item.log_index}`,
        hash: item.hash,
        type: txType,
        from: fromAddress,
        to: toAddress,
        tokenAddress,
        tokenSymbol,
        amount,
        amountFormatted,
        timestamp,
        date,
        chainId: chainId, // Optional - only when known
        status: item.receipt_status === '1' ? 'confirmed' : 'failed',
        blockNumber: item.block_number ? parseInt(item.block_number, 10) : undefined,
        gasFee,
        tokenLogo,
        explorerUrl, // Optional - only when chainId is known
        metadata,
      };
    } catch (error) {
      console.error('[TransactionParser] Error parsing history item:', error);
      return null;
    }
  }

  /**
   * Map Moralis category to TransactionType
   * Uses the category field directly from Moralis response
   */
  private mapCategoryToTransactionType(category: string): TransactionType {
    const categoryLower = category?.toLowerCase() || '';
    
    // Map Moralis categories to our transaction types
    const categoryMap: Record<string, TransactionType> = {
      'receive': 'Received',
      'send': 'Sent',
      'token receive': 'Received',
      'token send': 'Sent',
      'nft receive': 'NFTTransfer',
      'nft send': 'NFTTransfer',
      'contract': 'ContractCall',
      'approve': 'Approve',
      'swap': 'Swap',
      'deposit': 'DeFi',
      'withdraw': 'DeFi',
      'mint': 'ContractCall',
      'burn': 'ContractCall',
    };

    // Check exact match first
    if (categoryMap[categoryLower]) {
      return categoryMap[categoryLower];
    }

    // Check partial matches
    if (categoryLower.includes('nft')) {
      return 'NFTTransfer';
    }
    if (categoryLower.includes('token')) {
      // Determine if send or receive from direction
      if (categoryLower.includes('send')) {
        return 'Sent';
      }
      if (categoryLower.includes('receive')) {
        return 'Received';
      }
    }
    if (categoryLower.includes('swap') || categoryLower.includes('exchange')) {
      return 'Swap';
    }
    if (categoryLower.includes('approve')) {
      return 'Approve';
    }
    if (categoryLower.includes('contract') || categoryLower.includes('interaction')) {
      return 'ContractCall';
    }

    // Default fallback
    return 'Transfer';
  }

  /**
   * Detect swap transactions
   */
  private isSwapTransaction(
    item: MoralisHistoryItem,
    chainId: number
  ): boolean {
    const toLower = item.to_address?.toLowerCase() || '';
    
    // Check if to_address is a known DEX router
    const dexRouters = DEX_ROUTERS[chainId] || {};
    if (dexRouters[toLower]) {
      return true;
    }

    // Check method signature
    if (item.method_hash && SWAP_METHOD_SIGNATURES[item.method_hash.toLowerCase()]) {
      return true;
    }

    // Check method label
    if (item.method_label) {
      const methodLower = item.method_label.toLowerCase();
      if (methodLower.includes('swap') || methodLower.includes('exchange')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect DeFi activities
   */
  private isDeFiActivity(
    item: MoralisHistoryItem,
    chainId: number
  ): boolean {
    // Check method signature
    if (item.method_hash) {
      const methodHash = item.method_hash.toLowerCase();
      if (DEFI_METHOD_SIGNATURES[methodHash]) {
        return true;
      }
    }

    // Check method label
    if (item.method_label) {
      const methodLower = item.method_label.toLowerCase();
      if (
        methodLower.includes('stake') ||
        methodLower.includes('unstake') ||
        methodLower.includes('deposit') ||
        methodLower.includes('withdraw') ||
        methodLower.includes('liquidity')
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Build transaction metadata
   */
  private buildMetadata(
    item: MoralisHistoryItem,
    txType: TransactionType
  ): Transaction['metadata'] {
    const metadata: Transaction['metadata'] = {
      methodLabel: item.method_label || undefined,
      methodHash: item.method_hash || undefined,
    };

    // Try to extract method name for swaps
    if (txType === 'Swap' && item.method_hash) {
      const methodName = SWAP_METHOD_SIGNATURES[item.method_hash.toLowerCase()];
      if (methodName) {
        metadata.swapRoute = methodName;
      }
    }

    // Add protocol info for DeFi
    if (txType === 'DeFi' && item.method_label) {
      metadata.protocol = item.method_label;
    }

    return metadata;
  }

  /**
   * Get chain ID from chain name
   * Matches the chain names returned by Moralis /wallets/ endpoints
   */
  private getChainIdFromName(chainName: string | undefined | null): number | null {
    // Handle null/undefined chain name
    if (!chainName || typeof chainName !== 'string') {
      return null;
    }

    const chainMap: Record<string, number> = {
      'eth': 1,
      'ethereum': 1,
      'optimism': 10,
      'bsc': 56,
      'binance': 56,
      'polygon': 137,
      'arbitrum': 42161,
      'avalanche': 43114,
      'base': 8453,
      'fantom': 250,
      'gnosis': 100,
      'polygon-zkevm': 1101,
    };
    return chainMap[chainName.toLowerCase()] || null;
  }

  /**
   * Get chain name from chain ID (reverse lookup)
   * Used when chain field is missing from response
   */
  private getChainNameFromId(chainId: number): string | null {
    const chainMap: Record<number, string> = {
      1: 'eth',
      10: 'optimism',
      56: 'bsc',
      137: 'polygon',
      42161: 'arbitrum',
      43114: 'avalanche',
      8453: 'base',
      250: 'fantom',
      100: 'gnosis',
      1101: 'polygon-zkevm',
    };
    return chainMap[chainId] || null;
  }

  /**
   * Format balance (wei to human-readable)
   */
  private formatBalance(amount: string, decimals: number): string {
    try {
      const amountBigInt = BigInt(amount);
      const divisor = BigInt(10 ** decimals);
      const wholePart = amountBigInt / divisor;
      const fractionalPart = amountBigInt % divisor;
      
      if (fractionalPart === BigInt(0)) {
        return wholePart.toString();
      }
      
      const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
      const trimmedFractional = fractionalStr.replace(/0+$/, '');
      
      return `${wholePart}.${trimmedFractional}`;
    } catch {
      return '0';
    }
  }

  /**
   * Format date
   */
  private formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Calculate gas fee in native token (formatted)
   */
  private calculateGasFee(item: MoralisHistoryItem): string | undefined {
    if (!item.gas || !item.gas_price) {
      return undefined;
    }

    try {
      const gasUsed = BigInt(item.gas);
      const gasPrice = BigInt(item.gas_price);
      const gasFeeWei = gasUsed * gasPrice;
      
      // Convert to ETH (18 decimals)
      const gasFeeEth = Number(gasFeeWei) / 1e18;
      
      // Format with appropriate decimals
      if (gasFeeEth < 0.0001) {
        return gasFeeEth.toFixed(6);
      } else if (gasFeeEth < 1) {
        return gasFeeEth.toFixed(4);
      } else {
        return gasFeeEth.toFixed(2);
      }
    } catch {
      return undefined;
    }
  }

  /**
   * Calculate gas fee in USD (placeholder - would need gas price in USD)
   */
  private calculateGasFeeUSD(item: MoralisHistoryItem, chainId: number): string | undefined {
    // TODO: Fetch current gas price in USD for the chain
    // For now, return undefined - can be enriched later
    return undefined;
  }

  /**
   * Generate block explorer URL for transaction
   */
  private getExplorerUrl(txHash: string, chainId: number): string {
    const explorerMap: Record<number, string> = {
      1: 'https://etherscan.io/tx/',      // Ethereum
      10: 'https://optimistic.etherscan.io/tx/', // Optimism
      56: 'https://bscscan.com/tx/',      // BSC
      137: 'https://polygonscan.com/tx/', // Polygon
      42161: 'https://arbiscan.io/tx/',   // Arbitrum
      43114: 'https://snowtrace.io/tx/',  // Avalanche
      8453: 'https://basescan.org/tx/',   // Base
      250: 'https://ftmscan.com/tx/',     // Fantom
      100: 'https://gnosisscan.io/tx/',   // Gnosis
    };

    const baseUrl = explorerMap[chainId];
    if (!baseUrl) {
      return '';
    }

    return `${baseUrl}${txHash}`;
  }

  /**
   * Truncate address for display (e.g., "0x1234...5678")
   */
  private truncateAddress(address: string): string {
    if (!address || address.length < 10) {
      return address;
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Get chain badge identifier
   */
  private getChainBadge(chainId: number): string {
    const badgeMap: Record<number, string> = {
      1: 'evm-ethereum',
      10: 'evm-optimism',
      56: 'evm-bnb-chain',
      137: 'evm-polygon',
      42161: 'evm-arbitrum',
      43114: 'evm-avalanche',
      8453: 'evm-base',
      250: 'evm-fantom',
      100: 'evm-gnosis',
    };

    return badgeMap[chainId] || `evm-chain-${chainId}`;
  }
}

