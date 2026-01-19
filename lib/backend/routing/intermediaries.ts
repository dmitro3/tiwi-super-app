/**
 * Popular Intermediary Tokens
 * 
 * Defines high-liquidity tokens that most tokens have pairs with.
 * These are used as intermediaries when direct pairs don't exist.
 * 
 * Priority order:
 * 1. Native wrapped tokens (WBNB, WETH, WMATIC) - highest priority
 * 2. Stablecoins (USDT, USDC, BUSD, DAI) - high priority
 * 3. LST tokens (stETH, wstETH, cbETH) - high priority for bridging
 * 4. Blue-chip tokens (ETH on BSC, WBTC, etc.) - medium priority
 */

import { getAddress, type Address } from 'viem';

/**
 * Intermediary Token Configuration
 */
export interface IntermediaryToken {
  /** Token address */
  address: Address;
  /** Token symbol */
  symbol: string;
  /** Priority (lower = higher priority, 1 is highest) */
  priority: number;
  /** Token category */
  category: 'native' | 'stable' | 'lst' | 'bluechip';
}

/**
 * Popular Intermediaries by Chain ID
 * 
 * Sorted by priority (native > stable > bluechip)
 */
export const POPULAR_INTERMEDIARIES: Record<number, IntermediaryToken[]> = {
  // BSC (56)
  56: [
    { address: getAddress('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'), symbol: 'WBNB', priority: 1, category: 'native' },
    { address: getAddress('0x55d398326f99059fF775485246999027B3197955'), symbol: 'USDT', priority: 2, category: 'stable' },
    { address: getAddress('0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'), symbol: 'BUSD', priority: 3, category: 'stable' },
    { address: getAddress('0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'), symbol: 'USDC', priority: 4, category: 'stable' },
    { address: getAddress('0x2170Ed0880ac9A755fd29B2688956BD959F933F8'), symbol: 'ETH', priority: 5, category: 'bluechip' }, // ETH on BSC
  ],
  
  // Ethereum (1)
  1: [
    { address: getAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'), symbol: 'WETH', priority: 1, category: 'native' },
    { address: getAddress('0xdAC17F958D2ee523a2206206994597C13D831ec7'), symbol: 'USDT', priority: 2, category: 'stable' },
    { address: getAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'), symbol: 'USDC', priority: 3, category: 'stable' },
    { address: getAddress('0x6B175474E89094C44Da98b954EedeAC495271d0F'), symbol: 'DAI', priority: 4, category: 'stable' },
    { address: getAddress('0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84'), symbol: 'stETH', priority: 5, category: 'lst' }, // Lido Staked ETH
    { address: getAddress('0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0'), symbol: 'wstETH', priority: 6, category: 'lst' }, // Wrapped stETH
  ],
  
  // Polygon (137)
  137: [
    { address: getAddress('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'), symbol: 'WMATIC', priority: 1, category: 'native' },
    { address: getAddress('0xc2132D05D31c914a87C6611C10748AEb04B58e8F'), symbol: 'USDT', priority: 2, category: 'stable' },
    { address: getAddress('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'), symbol: 'USDC', priority: 3, category: 'stable' },
    { address: getAddress('0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6'), symbol: 'WBTC', priority: 4, category: 'bluechip' }, // Wrapped BTC on Polygon
  ],
  
  // Optimism (10)
  10: [
    { address: getAddress('0x4200000000000000000000000000000000000006'), symbol: 'WETH', priority: 1, category: 'native' },
    { address: getAddress('0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'), symbol: 'USDT', priority: 2, category: 'stable' },
    { address: getAddress('0x7F5c764cBc14f9669B88837ca1490cCa17c31607'), symbol: 'USDC', priority: 3, category: 'stable' },
    { address: getAddress('0x1F32b1c2345538c0C6F582fB022929c35a05FeF0'), symbol: 'wstETH', priority: 4, category: 'lst' }, // Wrapped stETH on Optimism
  ],
  
  // Arbitrum (42161)
  42161: [
    { address: getAddress('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'), symbol: 'WETH', priority: 1, category: 'native' },
    { address: getAddress('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'), symbol: 'USDT', priority: 2, category: 'stable' },
    { address: getAddress('0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'), symbol: 'USDC', priority: 3, category: 'stable' },
    { address: getAddress('0x5979D7b546E38E414F7E9822514be443A4800529'), symbol: 'wstETH', priority: 4, category: 'lst' }, // Wrapped stETH on Arbitrum
  ],
  
  // Base (8453)
  8453: [
    { address: getAddress('0x4200000000000000000000000000000000000006'), symbol: 'WETH', priority: 1, category: 'native' },
    { address: getAddress('0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2'), symbol: 'USDC', priority: 2, category: 'stable' },
    { address: getAddress('0x4158734D47Fc9692176B5085E0F52ee0Da5d47F1'), symbol: 'cbETH', priority: 3, category: 'lst' }, // Coinbase Wrapped ETH
  ],
};

/**
 * Get intermediaries for a chain, sorted by priority
 * 
 * @param chainId Chain ID
 * @returns Array of intermediary tokens, sorted by priority (lowest priority number first)
 */
export function getIntermediaries(chainId: number): IntermediaryToken[] {
  return (POPULAR_INTERMEDIARIES[chainId] || []).sort((a, b) => a.priority - b.priority);
}

/**
 * Get wrapped native token for a chain
 * 
 * @param chainId Chain ID
 * @returns Wrapped native token address or null
 */
export function getWrappedNativeToken(chainId: number): Address | null {
  const intermediaries = getIntermediaries(chainId);
  const native = intermediaries.find(t => t.category === 'native');
  return native?.address || null;
}

/**
 * Get stablecoins for a chain
 * 
 * @param chainId Chain ID
 * @returns Array of stablecoin addresses
 */
export function getStablecoins(chainId: number): Address[] {
  const intermediaries = getIntermediaries(chainId);
  return intermediaries
    .filter(t => t.category === 'stable')
    .map(t => t.address);
}

/**
 * Get bridgeable tokens for cross-chain swaps
 * Priority: native > stablecoins > LST tokens
 * 
 * @param chainId Chain ID
 * @returns Array of bridgeable token addresses
 */
export function getBridgeableTokens(chainId: number): Address[] {
  const intermediaries = getIntermediaries(chainId);
  return intermediaries
    .filter(t => t.category === 'native' || t.category === 'stable' || t.category === 'lst')
    .map(t => t.address);
}

