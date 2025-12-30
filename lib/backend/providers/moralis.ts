/**
 * Moralis Provider
 * 
 * Handles wallet balance fetching for EVM and Solana chains using Moralis API.
 * Provides unified interface for native and token balances.
 */

import Moralis from 'moralis';
import type { WalletToken } from '@/lib/backend/types/wallet';

// ============================================================================
// Configuration
// ============================================================================

// Moralis API key - should be set in environment variables
// Fallback to the key from tiwi-test for development
const MORALIS_API_KEY = process.env.MORALIS_API_KEY || process.env.NEXT_PUBLIC_MORALIS_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImI3YzM4YjA2LTUwMjQtNDcxNC1iOTZhLTZiNzljNGQxZTE4NiIsIm9yZ0lkIjoiNDg1MjE2IiwidXNlcklkIjoiNDk5MTk1IiwidHlwZUlkIjoiOTI3ZGNlNzQtYmZkZi00Yjc3LWJlZTUtZTBmNTNlNDAzMTAwIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NjUyNjAyMjQsImV4cCI6NDkyMTAyMDIyNH0._OVkoNmyqPF5xmJSwOfuifJUjOKpeVVJYayAmG992D8';

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
// Initialization
// ============================================================================

import { initializeMoralis } from '@/lib/backend/utils/moralis-init';

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
    await initializeMoralis();
    
    const moralisChain = CHAIN_ID_TO_MORALIS[chainId];
    if (!moralisChain) {
      console.warn(`[MoralisProvider] Chain ${chainId} not supported by Moralis`);
      return null;
    }
    
    const response = await Moralis.EvmApi.balance.getNativeBalance({
      address,
      chain: moralisChain,
    });
    
    const balance = response.raw.balance || '0';
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
  } catch (error) {
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
    await initializeMoralis();
    
    const moralisChain = CHAIN_ID_TO_MORALIS[chainId];
    if (!moralisChain) {
      console.warn(`[MoralisProvider] Chain ${chainId} not supported by Moralis`);
      return [];
    }
    
    const response = await Moralis.EvmApi.token.getWalletTokenBalances({
      address,
      chain: moralisChain,
    });
    
    if (!response.raw || !Array.isArray(response.raw)) {
      return [];
    }
    
    const tokens: WalletToken[] = [];
    
    for (const tokenData of response.raw) {
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
  } catch (error) {
    console.error(`[MoralisProvider] Error fetching token balances for chain ${chainId}:`, error);
    return [];
  }
}

/**
 * Get all tokens (native + ERC-20) for EVM chain
 */
export async function getEVMWalletTokens(
  address: string,
  chainId: number
): Promise<WalletToken[]> {
  const tokens: WalletToken[] = [];
  
  // Fetch native and ERC-20 tokens in parallel
  const [nativeToken, erc20Tokens] = await Promise.all([
    getEVMNativeBalance(address, chainId),
    getEVMTokenBalances(address, chainId),
  ]);
  
  if (nativeToken) {
    tokens.push(nativeToken);
  }
  
  tokens.push(...erc20Tokens);
  
  return tokens;
}

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
    await initializeMoralis();
    
    const response = await Moralis.SolApi.account.getBalance({
      address,
      network: 'mainnet',
    });
    
    const result = response.result || response;
    const responseData = result as any;
    
    // Extract balance from various possible response structures
    let lamports = '0';
    
    if (responseData.lamports !== undefined && responseData.lamports !== null) {
      lamports = responseData.lamports.toString();
      // Fix: Check if incorrectly multiplied by 10^9
      const lamportsNum = BigInt(lamports);
      if (lamportsNum > BigInt(10 ** 15)) {
        lamports = (lamportsNum / BigInt(10 ** 9)).toString();
      }
    } else if (responseData.nativeBalance?.lamports !== undefined) {
      lamports = responseData.nativeBalance.lamports.toString();
      const lamportsNum = BigInt(lamports);
      if (lamportsNum > BigInt(10 ** 15)) {
        lamports = (lamportsNum / BigInt(10 ** 9)).toString();
      }
    } else if (responseData.sol !== undefined) {
      const solAmount = typeof responseData.sol === 'string' 
        ? parseFloat(responseData.sol) 
        : Number(responseData.sol);
      lamports = (BigInt(Math.floor(solAmount * 1e9))).toString();
    } else if (responseData.balance !== undefined) {
      const balance = responseData.balance;
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
  } catch (error) {
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
    await initializeMoralis();
    
    const tokens: WalletToken[] = [];
    
    // Get native SOL balance
    const nativeToken = await getSolanaNativeBalance(address);
    if (nativeToken) {
      tokens.push(nativeToken);
    }
    
    // Get SPL token balances
    try {
      const response = await Moralis.SolApi.account.getSPL({
        address,
        network: 'mainnet',
      });
      
      const result = response.result || response;
      const splTokens = Array.isArray(result) 
        ? result 
        : (Array.isArray((result as any).data) ? (result as any).data : []);
      
      if (splTokens && Array.isArray(splTokens)) {
        for (const token of splTokens) {
          try {
            const tokenData = token as any;
            
            // Extract amount and decimals
            let rawAmount = '0';
            let tokenDecimals = 9;
            
            if (tokenData.decimals !== undefined && tokenData.decimals !== null) {
              tokenDecimals = Number(tokenData.decimals);
            }
            
            if (tokenData.amount) {
              if (tokenData.amount.lamports !== undefined) {
                rawAmount = tokenData.amount.lamports.toString();
              } else if ((tokenData.amount as any).raw !== undefined) {
                rawAmount = (tokenData.amount as any).raw.toString();
              } else if (typeof tokenData.amount === 'string') {
                const amountStr = tokenData.amount;
                const amountNum = parseFloat(amountStr);
                if (amountStr.includes('.') || (amountNum > 0 && amountNum < 1000)) {
                  rawAmount = (BigInt(Math.floor(amountNum * (10 ** tokenDecimals)))).toString();
                } else {
                  rawAmount = amountStr;
                }
              } else if (typeof tokenData.amount === 'number') {
                const amountNum = tokenData.amount;
                if (amountNum > 0 && amountNum < 1000) {
                  rawAmount = (BigInt(Math.floor(amountNum * (10 ** tokenDecimals)))).toString();
                } else {
                  rawAmount = amountNum.toString();
                }
              }
            }
            
            const balanceBigInt = BigInt(rawAmount || '0');
            if (balanceBigInt === BigInt(0)) {
              continue;
            }
            
            // Extract mint address
            let mintAddress = '';
            if (tokenData.mint) {
              if (typeof tokenData.mint === 'string') {
                mintAddress = tokenData.mint;
              } else if (tokenData.mint.address) {
                mintAddress = tokenData.mint.address;
              } else if (tokenData.mint.toString) {
                mintAddress = tokenData.mint.toString();
              }
            }
            
            // Known Solana token decimals
            const knownSolanaDecimals: Record<string, number> = {
              'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 6, // USDT
              'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 6, // USDC
            };
            
            const mintAddressLower = mintAddress.toLowerCase();
            if (knownSolanaDecimals[mintAddressLower]) {
              tokenDecimals = knownSolanaDecimals[mintAddressLower];
            }
            
            tokenDecimals = Math.max(0, Math.min(18, Math.floor(tokenDecimals)));
            const balanceFormatted = formatBalance(rawAmount, tokenDecimals);
            
            tokens.push({
              address: mintAddress,
              symbol: tokenData.symbol || 'UNKNOWN',
              name: tokenData.name || 'Unknown Token',
              decimals: tokenDecimals,
              balance: rawAmount,
              balanceFormatted,
              chainId: SOLANA_CHAIN_ID,
              logoURI: tokenData.logo || tokenData.thumbnail,
            });
          } catch (tokenError) {
            console.warn('[MoralisProvider] Error processing Solana token:', tokenError);
            continue;
          }
        }
      }
    } catch (splError) {
      console.error('[MoralisProvider] Error fetching Solana SPL tokens:', splError);
    }
    
    return tokens;
  } catch (error) {
    console.error('[MoralisProvider] Error fetching Solana token balances:', error);
    return [];
  }
}

// ============================================================================
// Multi-Chain Support
// ============================================================================

/**
 * Get wallet tokens across multiple chains
 */
export async function getWalletTokens(
  address: string,
  chainIds: number[]
): Promise<WalletToken[]> {
  const allTokens: WalletToken[] = [];
  
  // Fetch tokens for all chains in parallel
  const fetchPromises = chainIds.map(async (chainId) => {
    try {
      if (chainId === SOLANA_CHAIN_ID) {
        return await getSolanaTokenBalances(address);
      } else {
        return await getEVMWalletTokens(address, chainId);
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

