/**
 * DEX Registry
 * 
 * Defines supported DEXes for each chain with their router addresses.
 * Maps DexScreener dexId to our router implementations.
 * 
 * This is used to:
 * 1. Verify which DEXes we support when querying DexScreener
 * 2. Get router addresses for route verification and execution
 * 3. Map DexScreener dexId to our router contracts
 */

import { getAddress, type Address } from 'viem';

/**
 * DEX Configuration
 */
export interface DEXConfig {
  /** DexScreener dexId (e.g., "pancakeswap", "uniswap", "sushiswap") */
  dexId: string;
  /** Router contract address */
  routerAddress: Address;
  /** Factory contract address */
  factoryAddress: Address;
  /** Whether this DEX is currently supported */
  supported: boolean;
  /** DEX name for display */
  name: string;
}

/**
 * Standard Uniswap V2 Router ABI
 * Used for getAmountsOut and swap functions
 */
export const ROUTER_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
    ],
    name: 'getAmountsOut',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * DEX Registry by Chain ID
 * 
 * Maps chain ID to array of supported DEXes.
 * Each DEX includes router address, factory address, and DexScreener dexId.
 */
export const DEX_REGISTRY: Record<number, DEXConfig[]> = {
  // BSC (56)
  56: [
    {
      dexId: 'pancakeswap',
      routerAddress: getAddress('0x10ED43C718714eb63d5aA57B78B54704E256024E'),
      factoryAddress: getAddress('0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73'),
      supported: true,
      name: 'PancakeSwap',
    },
  ],
  
  // Ethereum (1)
  1: [
    {
      dexId: 'uniswap',
      routerAddress: getAddress('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'),
      factoryAddress: getAddress('0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'),
      supported: true,
      name: 'Uniswap V2',
    },
    {
      dexId: 'sushiswap',
      routerAddress: getAddress('0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'),
      factoryAddress: getAddress('0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac'),
      supported: true,
      name: 'SushiSwap',
    },
  ],
  
  // Polygon (137)
  137: [
    {
      dexId: 'quickswap',
      routerAddress: getAddress('0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff'),
      factoryAddress: getAddress('0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32'),
      supported: true,
      name: 'QuickSwap',
    },
  ],
  
  // Optimism (10)
  10: [
    {
      dexId: 'uniswap',
      routerAddress: getAddress('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'),
      factoryAddress: getAddress('0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'),
      supported: true,
      name: 'Uniswap V2',
    },
  ],
  
  // Arbitrum (42161)
  42161: [
    {
      dexId: 'uniswap',
      routerAddress: getAddress('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'),
      factoryAddress: getAddress('0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'),
      supported: true,
      name: 'Uniswap V2',
    },
  ],
  
  // Base (8453)
  8453: [
    {
      dexId: 'uniswap',
      routerAddress: getAddress('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'),
      factoryAddress: getAddress('0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'),
      supported: true,
      name: 'Uniswap V2',
    },
  ],
};

/**
 * Get supported DEXes for a chain
 * 
 * @param chainId Chain ID
 * @returns Array of DEX configurations
 */
export function getSupportedDEXes(chainId: number): DEXConfig[] {
  return DEX_REGISTRY[chainId] || [];
}

/**
 * Find DEX config by DexScreener dexId
 * 
 * @param chainId Chain ID
 * @param dexId DexScreener dexId (e.g., "pancakeswap", "uniswap")
 * @returns DEX config or null if not found
 */
export function findDEXByDexId(chainId: number, dexId: string): DEXConfig | null {
  const dexes = getSupportedDEXes(chainId);
  return dexes.find(d => d.dexId === dexId && d.supported) || null;
}

/**
 * Check if a DEX is supported for a chain
 * 
 * @param chainId Chain ID
 * @param dexId DexScreener dexId
 * @returns True if supported
 */
export function isDEXSupported(chainId: number, dexId: string): boolean {
  return findDEXByDexId(chainId, dexId) !== null;
}

/**
 * Get router address for a DEX
 * 
 * @param chainId Chain ID
 * @param dexId DexScreener dexId
 * @returns Router address or null
 */
export function getRouterAddress(chainId: number, dexId: string): Address | null {
  const dex = findDEXByDexId(chainId, dexId);
  return dex?.routerAddress || null;
}

/**
 * Get factory address for a DEX
 * 
 * @param chainId Chain ID
 * @param dexId DexScreener dexId
 * @returns Factory address or null
 */
export function getFactoryAddress(chainId: number, dexId: string): Address | null {
  const dex = findDEXByDexId(chainId, dexId);
  return dex?.factoryAddress || null;
}

