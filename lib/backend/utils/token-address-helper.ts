/**
 * Token Address Helper
 * 
 * Utilities for handling native token addresses and converting them to wrapped versions.
 * Used for chart data fetching where native tokens (0x000..., 0xeee...) need to be
 * converted to wrapped tokens (WETH, WBNB, etc.) since native tokens aren't tradable.
 */

import { getAddress, type Address } from 'viem';

// ============================================================================
// Wrapped Native Token Addresses
// ============================================================================

/**
 * Wrapped native token addresses by chain ID
 * These are the standard wrapped token addresses for each EVM chain
 */
export const WETH_ADDRESSES: Record<number, Address> = {
  1: getAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'), // Ethereum WETH
  56: getAddress('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'), // BSC WBNB
  137: getAddress('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'), // Polygon WMATIC
  42161: getAddress('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'), // Arbitrum WETH
  10: getAddress('0x4200000000000000000000000000000000000006'), // Optimism WETH
  8453: getAddress('0x4200000000000000000000000000000000000006'), // Base WETH
  43114: getAddress('0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'), // Avalanche WAVAX
  250: getAddress('0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83'), // Fantom WFTM
  100: getAddress('0xe91D153E0b41718D7C52C846784177a9D2Cfd8b2'), // Gnosis WXDAI
  1101: getAddress('0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9'), // Polygon zkEVM WETH
  324: getAddress('0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91'), // zkSync WETH
  5000: getAddress('0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8'), // Mantle WETH
  59144: getAddress('0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f'), // Linea WETH
  534352: getAddress('0x5300000000000000000000000000000000000004'), // Scroll WETH
};

// ============================================================================
// Native Token Address Patterns
// ============================================================================

/**
 * Common native token address representations
 */
const NATIVE_TOKEN_ADDRESSES = new Set([
  '0x0000000000000000000000000000000000000000', // Zero address
  '0x0000000000000000000000000000000000001010', // Polygon native token address
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // Common native token placeholder
]);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if an address represents a native token
 */
export function isNativeToken(address: string): boolean {
  if (!address) return false;
  const normalized = address.toLowerCase();
  return NATIVE_TOKEN_ADDRESSES.has(normalized);
}

/**
 * Convert a native token address to its wrapped version
 * If the address is already a wrapped token or not native, returns it unchanged
 * 
 * @param address - Token address (may be native or wrapped)
 * @param chainId - Chain ID to determine wrapped token address
 * @returns Wrapped token address, or original address if not native
 */
export function convertToWrappedToken(address: string, chainId: number): string {
  if (!address) {
    throw new Error('[TokenAddressHelper] Address is required');
  }
  
  // If not a native token, return as-is
  if (!isNativeToken(address)) {
    try {
      // Validate and normalize address
      return getAddress(address);
    } catch {
      // If invalid address format, return as-is (let provider handle error)
      return address;
    }
  }
  
  // Get wrapped token address for this chain
  const wrappedAddress = WETH_ADDRESSES[chainId];
  if (!wrappedAddress) {
    console.warn(`[TokenAddressHelper] No wrapped token address found for chain ${chainId}. Using original address.`);
    return address;
  }
  
  return wrappedAddress;
}

/**
 * Convert both base and quote token addresses to wrapped versions if needed
 * 
 * @param baseToken - Base token address
 * @param quoteToken - Quote token address
 * @param chainId - Chain ID
 * @returns Object with converted addresses
 */
export function convertPairToWrapped(
  baseToken: string,
  quoteToken: string,
  chainId: number
): { baseToken: string; quoteToken: string } {
  return {
    baseToken: convertToWrappedToken(baseToken, chainId),
    quoteToken: convertToWrappedToken(quoteToken, chainId),
  };
}

/**
 * Get wrapped token address for a chain (without conversion)
 * 
 * @param chainId - Chain ID
 * @returns Wrapped token address, or null if not supported
 */
export function getWrappedTokenAddress(chainId: number): Address | null {
  return WETH_ADDRESSES[chainId] || null;
}

/**
 * Get wrapped native token address for a chain (alias for getWrappedTokenAddress)
 * 
 * @param chainId - Chain ID
 * @returns Wrapped token address, or null if not supported
 */
export function getWrappedNativeToken(chainId: number): Address | null {
  return getWrappedTokenAddress(chainId);
}

