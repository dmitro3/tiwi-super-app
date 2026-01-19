/**
 * Moralis Provider
 * 
 * Handles wallet balance fetching for EVM and Solana chains using Moralis REST API.
 * Provides unified interface for native and token balances with provider-level caching.
 */

import type { WalletToken } from '@/lib/backend/types/wallet';
import {
  getEVMNativeBalance as getEVMNativeBalanceAPI,
  getEVMTokenBalances as getEVMTokenBalancesAPI,
  getWalletTokensWithPrices as getWalletTokensWithPricesAPI,
  getSolanaNativeBalance as getSolanaNativeBalanceAPI,
  getSolanaTokenBalances as getSolanaTokenBalancesAPI,
  getAddressType,
  isValidEVMAddress,
  isValidSolanaAddress,
} from './moralis-rest-client';

// ============================================================================
// Configuration
// ============================================================================

// Map canonical chain IDs to Moralis chain hex strings
const CHAIN_ID_TO_MORALIS: Record<number, string> = {
  1: '0x1', // Ethereum
  10: '0xa', // Optimism
  56: '0x38', // BSC
  137: '0x89', // Polygon
  42161: '0xa4b1', // Arbitrum
  43114: '0xa86a', // Avalanche
  8453: '0x2105', // Base
  250: '0xfa', // Fantom
  100: '0x64', // Gnosis
  1101: '0x44d', // Polygon zkEVM
  324: '0x144', // zkSync Era
  5000: '0x1388', // Mantle
  59144: '0xe708', // Linea
  534352: '0x82750', // Scroll
};

// Solana chain ID
export const SOLANA_CHAIN_ID = 7565164;
const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';

// Native token symbols by chain
const NATIVE_SYMBOLS: Record<number, string> = {
  1: 'ETH',
  10: 'ETH',
  56: 'BNB',
  137: 'POL', // Polygon native token is POL, not MATIC
  42161: 'ETH',
  43114: 'AVAX',
  8453: 'ETH',
  250: 'FTM',
  100: 'xDAI',
  1101: 'ETH',
  324: 'ETH',
  5000: 'MNT',
  59144: 'ETH',
  534352: 'ETH',
};

// Known decimals for common tokens (fallback)
const KNOWN_DECIMALS: Record<string, number> = {
  // USDT addresses
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 6, // Ethereum USDT
  '0x55d398326f99059ff775485246999027b3197955': 18, // BSC USDT
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 6, // Polygon USDT
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 6, // Arbitrum USDT
  '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': 6, // Optimism USDT
  // USDC addresses
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6, // Ethereum USDC
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': 18, // BSC USDC
};

const KNOWN_SYMBOL_DECIMALS: Record<string, number> = {
  'USDT': 6,
  'USDC': 6,
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatBalance(balance: string, decimals: number): string {
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
    console.warn('[MoralisProvider] Error formatting balance:', balance, 'decimals:', decimals, error);
    return '0';
  }
}

function getTokenDecimals(tokenData: any, chainId: number): number {
  const tokenAddressLower = (tokenData.token_address || '').toLowerCase();
  const tokenSymbol = (tokenData.symbol || '').toUpperCase();
  
  if (KNOWN_DECIMALS[tokenAddressLower]) {
    return KNOWN_DECIMALS[tokenAddressLower];
  }
  
  if (KNOWN_SYMBOL_DECIMALS[tokenSymbol]) {
    // BSC uses 18 decimals for stablecoins
    if ((tokenSymbol === 'USDT' || tokenSymbol === 'USDC') && chainId === 56) {
      return 18;
    }
    return KNOWN_SYMBOL_DECIMALS[tokenSymbol];
  }
  
  const decimals = tokenData.decimals !== undefined && tokenData.decimals !== null
    ? Number(tokenData.decimals)
    : 18;
  
  return Math.max(0, Math.min(18, Math.floor(decimals)));
}

// ============================================================================
// EVM Balance Fetching
// ============================================================================

/**
 * Get native token balance for EVM chain
 */
export async function getEVMNativeBalance(
  address: string,
  chainId: number
): Promise<WalletToken | null> {
  try {
    // Validate EVM address
    if (!isValidEVMAddress(address)) {
      console.warn(`[MoralisProvider] Invalid EVM address: ${address}`);
      return null;
    }

    const moralisChain = CHAIN_ID_TO_MORALIS[chainId];
    if (!moralisChain) {
      console.warn(`[MoralisProvider] Chain ${chainId} not supported by Moralis`);
      return null;
    }
    
    const response = await getEVMNativeBalanceAPI(address, chainId, moralisChain);
    
    // Moralis REST API returns: { balance: string }
    const balance = response.balance || '0';
    const balanceBigInt = BigInt(balance);
    
    if (balanceBigInt === BigInt(0)) {
      return null;
    }
    
    const decimals = 18;
    const balanceFormatted = formatBalance(balance, decimals);
    const symbol = NATIVE_SYMBOLS[chainId] || 'NATIVE';
    
    // For Polygon (chain 137), use the correct native token address
    // Polygon native token address: 0x0000000000000000000000000000000000001010
    const tokenAddress = chainId === 137 
      ? '0x0000000000000000000000000000000000001010' 
      : '0x0000000000000000000000000000000000000000';
    
    return {
      address: tokenAddress,
      symbol,
      name: `${symbol} (Native)`,
      decimals,
      balance,
      balanceFormatted,
      chainId,
    };
  } catch (error: any) {
    console.error(`[MoralisProvider] Error fetching native balance for chain ${chainId}:`, error);
    return null;
  }
}

/**
 * Get all ERC-20 token balances for EVM chain
 */
export async function getEVMTokenBalances(
  address: string,
  chainId: number
): Promise<WalletToken[]> {
  try {
    // Validate EVM address
    if (!isValidEVMAddress(address)) {
      console.warn(`[MoralisProvider] Invalid EVM address: ${address}`);
      return [];
    }

    const moralisChain = CHAIN_ID_TO_MORALIS[chainId];
    if (!moralisChain) {
      console.warn(`[MoralisProvider] Chain ${chainId} not supported by Moralis`);
      return [];
    }
    
    const response = await getEVMTokenBalancesAPI(address, chainId, moralisChain);
    
    // Moralis REST API returns array of tokens
    if (!Array.isArray(response)) {
      return [];
    }
    
    const tokens: WalletToken[] = [];
    
    for (const tokenData of response) {
      try {
        const rawBalance = tokenData.balance || '0';
        const balanceBigInt = BigInt(rawBalance);
        
        if (balanceBigInt === BigInt(0)) {
          continue;
        }
        
        // Filter out spam and unverified tokens
        const notSpam = tokenData.possible_spam !== true;
        const verified = tokenData.verified_contract === true;
        
        if (!notSpam || !verified) {
          continue;
        }
        
        const decimals = getTokenDecimals(tokenData, chainId);
        const balanceFormatted = formatBalance(rawBalance, decimals);
        
        tokens.push({
          address: tokenData.token_address,
          symbol: tokenData.symbol || 'UNKNOWN',
          name: tokenData.name || 'Unknown Token',
          decimals,
          balance: rawBalance.toString(),
          balanceFormatted,
          chainId,
          logoURI: tokenData.logo || tokenData.thumbnail,
        });
      } catch (tokenError) {
        console.warn('[MoralisProvider] Error processing token:', tokenError);
        continue;
      }
    }
    
    return tokens;
  } catch (error: any) {
    console.error(`[MoralisProvider] Error fetching token balances for chain ${chainId}:`, error);
    return [];
  }
}

/**
 * Get all tokens (native + ERC-20) for EVM chain
 * 
 * OPTIMIZED: Uses /wallets/{address}/tokens endpoint which returns:
 * - Native token + all ERC20 tokens in ONE call (50% fewer API calls)
 * - USD prices included (usd_price, usd_value)
 * - 24h price change included (usd_price_24hr_percent_change)
 * - Portfolio percentage included (portfolio_percentage)
 */
export async function getEVMWalletTokens(
  address: string,
  chainId: number
): Promise<WalletToken[]> {
  try {
    // Validate EVM address
    if (!isValidEVMAddress(address)) {
      console.warn(`[MoralisProvider] Invalid EVM address: ${address}`);
      return [];
    }

    // Use optimized endpoint: /wallets/{address}/tokens
    // This returns native + ERC20 tokens with prices in one call
    const response = await getWalletTokensWithPricesAPI(address, chainId);
    
    // Moralis /wallets/{address}/tokens returns: { result: Token[], cursor: string, page: string, page_size: string }
    const tokenDataArray = response.result || response;
    
    if (!Array.isArray(tokenDataArray)) {
      console.warn('[MoralisProvider] Invalid response format from /wallets/{address}/tokens');
      return [];
    }
    
    const tokens: WalletToken[] = [];
    
    for (const tokenData of tokenDataArray) {
      try {
        const rawBalance = tokenData.balance || '0';
        const balanceBigInt = BigInt(rawBalance);
        
        // Skip zero balances
        if (balanceBigInt === BigInt(0)) {
          continue;
        }
        
        // Filter out spam tokens
        if (tokenData.possible_spam === true) {
          continue;
        }
        
        // Determine if this is the native token
        const isNative = tokenData.native_token === true || 
                        tokenData.token_address === '' ||
                        tokenData.token_address === null ||
                        tokenData.token_address === undefined;
        
        // Get token address (native tokens have empty address)
        const tokenAddress = isNative 
          ? (chainId === 137 
              ? '0x0000000000000000000000000000000000001010'  // Polygon native
              : '0x0000000000000000000000000000000000000000')  // Other chains
          : tokenData.token_address;
        
        // Get decimals
        const decimals = getTokenDecimals(tokenData, chainId);
        const balanceFormatted = formatBalance(rawBalance, decimals);
        
        // Extract USD values from response (already included!)
        const usdPrice = tokenData.usd_price ? String(tokenData.usd_price) : undefined;
        const usdValue = tokenData.usd_value ? String(tokenData.usd_value) : undefined;
        const priceChange24h = tokenData.usd_price_24hr_percent_change 
          ? String(tokenData.usd_price_24hr_percent_change) 
          : undefined;
        const portfolioPercentage = tokenData.portfolio_percentage 
          ? String(tokenData.portfolio_percentage) 
          : undefined;
        
        // Get symbol and name
        const symbol = isNative 
          ? (NATIVE_SYMBOLS[chainId] || 'NATIVE')
          : (tokenData.symbol || 'UNKNOWN');
        const name = isNative
          ? `${symbol} (Native)`
          : (tokenData.name || 'Unknown Token');
        
        tokens.push({
          address: tokenAddress,
          symbol,
          name,
          decimals,
          balance: rawBalance.toString(),
          balanceFormatted,
          chainId,
          logoURI: tokenData.logo || tokenData.thumbnail,
          priceUSD: usdPrice,
          usdValue: usdValue,
          priceChange24h: priceChange24h,
          portfolioPercentage: portfolioPercentage,
          verified: tokenData.verified_contract === true,
        });
      } catch (tokenError) {
        console.warn('[MoralisProvider] Error processing token:', tokenError);
        continue;
      }
    }
    
    return tokens;
  } catch (error: any) {
    console.error(`[MoralisProvider] Error fetching wallet tokens for chain ${chainId}:`, error);
    
    // Don't fallback to old endpoints - they use wrong format and cause 404 errors
    // Instead, log the error and return empty array (graceful degradation)
    // The /wallets/{address}/tokens endpoint should work for all supported chains
    if (error.status === 404) {
      console.warn(`[MoralisProvider] Chain ${chainId} may not be supported by Moralis /wallets/ endpoint. Check CHAIN_NAME_MAP.`);
    }
    
    return [];
  }
}

/**
 * @deprecated This fallback method is no longer used.
 * All chains should use /wallets/{address}/tokens endpoint with chain names.
 * The old endpoints (/{address}/erc20) use hex format and cause 404 errors.
 */

// ============================================================================
// Solana Balance Fetching
// ============================================================================

/**
 * Get native SOL balance
 */
export async function getSolanaNativeBalance(
  address: string
): Promise<WalletToken | null> {
  try {
    // Validate Solana address - don't fetch if it's an EVM address
    const addressType = getAddressType(address);
    if (addressType !== 'solana') {
      // Silently return null if it's an EVM address (not an error)
      if (addressType === 'evm') {
        return null;
      }
      console.warn(`[MoralisProvider] Invalid Solana address: ${address}`);
      return null;
    }
    
    const response = await getSolanaNativeBalanceAPI(address);
    
    // Portfolio endpoint returns: { nativeBalance: { lamports: string, solana: string }, tokens: [...], nfts: [...] }
    let lamports = '0';
    
    if (response.nativeBalance) {
      // Portfolio endpoint structure
      if (response.nativeBalance.lamports !== undefined && response.nativeBalance.lamports !== null) {
        lamports = response.nativeBalance.lamports.toString();
      } else if (response.nativeBalance.solana !== undefined) {
        // Convert SOL to lamports
        const solAmount = parseFloat(response.nativeBalance.solana.toString());
        lamports = (BigInt(Math.floor(solAmount * 1e9))).toString();
      }
    } else if (response.lamports !== undefined && response.lamports !== null) {
      // Legacy response structure
      lamports = response.lamports.toString();
      // Fix: Check if incorrectly multiplied by 10^9
      const lamportsNum = BigInt(lamports);
      if (lamportsNum > BigInt(10 ** 15)) {
        lamports = (lamportsNum / BigInt(10 ** 9)).toString();
      }
    } else if (response.balance !== undefined) {
      // Fallback to balance field
      const balance = response.balance;
      const balanceStr = balance.toString();
      const balanceNum = typeof balance === 'string' ? parseFloat(balance) : Number(balance);
      
      if (balanceStr.includes('.') || (balanceNum > 0 && balanceNum < 1000)) {
        lamports = (BigInt(Math.floor(balanceNum * 1e9))).toString();
      } else {
        const balanceBigInt = BigInt(balanceStr);
        if (balanceBigInt > BigInt(10 ** 15)) {
          lamports = (balanceBigInt / BigInt(10 ** 9)).toString();
        } else {
          lamports = balanceStr;
        }
      }
    }
    
    const balanceBigInt = BigInt(lamports);
    if (balanceBigInt === BigInt(0)) {
      return null;
    }
    
    const decimals = 9;
    const balanceFormatted = formatBalance(lamports, decimals);
    
    return {
      address: NATIVE_SOL_MINT,
      symbol: 'SOL',
      name: 'Solana',
      decimals,
      balance: lamports,
      balanceFormatted,
      chainId: SOLANA_CHAIN_ID,
    };
  } catch (error: any) {
    // Don't log error if it's just an invalid address type
    if (error.message?.includes('Invalid Solana address')) {
      return null;
    }
    console.error('[MoralisProvider] Error fetching Solana native balance:', error);
    return null;
  }
}

/**
 * Get all Solana token balances (native SOL + SPL tokens)
 */
export async function getSolanaTokenBalances(
  address: string
): Promise<WalletToken[]> {
  try {
    // Validate Solana address - don't fetch if it's an EVM address
    const addressType = getAddressType(address);
    if (addressType !== 'solana') {
      // Silently return empty array if it's an EVM address (not an error)
      if (addressType === 'evm') {
        return [];
      }
      console.warn(`[MoralisProvider] Invalid Solana address: ${address}`);
      return [];
    }

    const tokens: WalletToken[] = [];
    
    // Get native SOL balance
    const nativeToken = await getSolanaNativeBalance(address);
    if (nativeToken) {
      tokens.push(nativeToken);
    }
    
    // Get SPL token balances
    try {
      const response = await getSolanaTokenBalancesAPI(address);
      
      // Portfolio endpoint returns: { nativeBalance: {...}, tokens: [...], nfts: [...] }
      // Legacy endpoint returns: array of tokens
      let tokenArray: any[] = [];
      
      if (response.tokens && Array.isArray(response.tokens)) {
        // Portfolio endpoint structure
        tokenArray = response.tokens;
      } else if (Array.isArray(response)) {
        // Legacy endpoint structure
        tokenArray = response;
      }
      
      for (const tokenData of tokenArray) {
          try {
            const mint = tokenData.mint || tokenData.token_address;
          
          // Use amountRaw (integer string) instead of amount (decimal string) for BigInt conversion
          // amountRaw is the raw balance in smallest units (e.g., "23320246664668" for tokens with 6 decimals)
          // amount is the human-readable decimal (e.g., "23320246.664668")
          const balanceRaw = tokenData.amountRaw || tokenData.balance || '0';
          
          // Validate that balanceRaw is a valid integer string before converting to BigInt
          if (!/^\d+$/.test(balanceRaw.toString())) {
            console.warn(`[MoralisProvider] Invalid amountRaw for token ${mint}: ${balanceRaw}`);
            continue;
          }
          
          const balanceBigInt = BigInt(balanceRaw);
            
            if (balanceBigInt === BigInt(0)) {
              continue;
            }
            
            const decimals = tokenData.decimals !== undefined 
              ? Number(tokenData.decimals) 
              : 9;
          const balanceFormatted = formatBalance(balanceRaw, decimals);
            
            tokens.push({
              address: mint,
              symbol: tokenData.symbol || 'UNKNOWN',
              name: tokenData.name || 'Unknown Token',
              decimals,
            balance: balanceRaw.toString(),
              balanceFormatted,
              chainId: SOLANA_CHAIN_ID,
              logoURI: tokenData.logo || tokenData.thumbnail,
            });
          } catch (tokenError) {
            console.warn('[MoralisProvider] Error processing Solana token:', tokenError);
            continue;
        }
      }
    } catch (splError: any) {
      // Don't log error if it's just an invalid address type
      if (!splError.message?.includes('Invalid Solana address')) {
        console.warn('[MoralisProvider] Error fetching SPL tokens:', splError);
      }
    }
    
    return tokens;
  } catch (error: any) {
    // Don't log error if it's just an invalid address type
    if (error.message?.includes('Invalid Solana address')) {
      return [];
    }
    console.error('[MoralisProvider] Error fetching Solana token balances:', error);
    return [];
  }
}

// ============================================================================
// Unified Wallet Token Fetching
// ============================================================================

/**
 * Get wallet tokens for a specific chain
 * Automatically determines if address is EVM or Solana and fetches accordingly
 */
export async function getWalletTokens(
  address: string,
  chainIds: number[]
): Promise<WalletToken[]> {
  const allTokens: WalletToken[] = [];
  
  // Determine address type once
  const addressType = getAddressType(address);
  
  // Fetch tokens for each chain in parallel
  const fetchPromises = chainIds.map(async (chainId) => {
    try {
      if (chainId === SOLANA_CHAIN_ID) {
        // Only fetch Solana if address is actually a Solana address
        if (addressType === 'solana') {
          return await getSolanaTokenBalances(address);
        }
        // Skip Solana for EVM addresses
        return [];
      } else {
        // Only fetch EVM if address is actually an EVM address
        if (addressType === 'evm') {
          return await getEVMWalletTokens(address, chainId);
        }
        // Skip EVM for Solana addresses
        return [];
      }
    } catch (error) {
      console.error(`[MoralisProvider] Error fetching tokens for chain ${chainId}:`, error);
      return [];
    }
  });
  
  const results = await Promise.all(fetchPromises);
  
  // Flatten results
  for (const tokens of results) {
    allTokens.push(...tokens);
  }
  
  return allTokens;
}