// Mapping helpers for talking to different routers (LI.FI, etc.)
import { getAddress, zeroAddress } from 'viem';

// LI.FI's special Solana chain id
export const LIFI_SOLANA_CHAIN_ID = 1151111081099710;
export const SOLANA_CHAIN_ID = 7565164;
export const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';

const LIFI_SOLANA_NATIVE_TOKEN = '11111111111111111111111111111111';

/**
 * Map our internal chain id to the LI.FI chain id.
 */
export function toLifiChainId(chainId: number): number {
  if (chainId === SOLANA_CHAIN_ID) return LIFI_SOLANA_CHAIN_ID;
  return chainId;
}

/**
 * Map our token address representation to what LI.FI expects.
 */
export function toLifiTokenAddress(
  chainId: number,
  tokenAddress: string,
  isNative: boolean,
): string {
  if (chainId === SOLANA_CHAIN_ID) {
    if (isNative) return LIFI_SOLANA_NATIVE_TOKEN;
    return tokenAddress;
  }

  if (isNative) return zeroAddress;

  if (tokenAddress.startsWith('0x')) {
    try {
      return getAddress(tokenAddress);
    } catch {
      return tokenAddress;
    }
  }

  return tokenAddress;
}

/**
 * Reverse mapping: Convert LI.FI chain ID back to our internal chain ID.
 */
export function fromLifiChainId(lifiChainId: number): number {
  if (lifiChainId === LIFI_SOLANA_CHAIN_ID) return SOLANA_CHAIN_ID;
  return lifiChainId;
}
