/**
 * Wallet Display Utilities
 * 
 * Helper functions for displaying wallet information in the UI
 */

import { getWalletById } from "@/lib/wallet/detection/detector";
import { getWalletIconUrl } from "@/lib/wallet/services/wallet-explorer-service";
import type { WalletAccount } from "@/lib/wallet/connection/types";

const SOLANA_CHAIN_ID = 7565164;

/**
 * Truncate wallet address in Relay-style format: 0x3d...A1d2
 * First 3 chars after 0x, then last 4 chars
 */
export function truncateAddress(address: string): string {
  if (!address || address.length <= 10) return address;

  // Remove 0x prefix if present
  const withoutPrefix = address.startsWith('0x') ? address.slice(2) : address;
  if (withoutPrefix.length <= 7) return address;

  // Take first 3 chars and last 4 chars, keep 0x prefix for EVM
  if (address.startsWith('0x')) {
    return `0x${withoutPrefix.slice(0, 3)}...${withoutPrefix.slice(-4)}`;
  }

  // For Solana addresses (no 0x prefix), take first 4 and last 4
  return `${withoutPrefix.slice(0, 4)}...${withoutPrefix.slice(-4)}`;
}

/**
 * Get wallet icon URL from wallet account
 */
export function getWalletIconFromAccount(wallet: WalletAccount | null): string | null {
  if (!wallet) return null;

  const walletInfo = getWalletById(wallet.provider);
  if (!walletInfo?.imageId) return null;

  try {
    return getWalletIconUrl(walletInfo.imageId, 'sm');
  } catch (error) {
    console.error('[getWalletIconFromAccount] Error generating wallet icon URL:', error);
    return null;
  }
}

/**
 * Check if wallet chain is compatible with token chain
 */
export function isWalletChainCompatible(
  wallet: WalletAccount | null,
  tokenChainId?: number
): boolean {
  if (!wallet || !tokenChainId) return false;

  // Solana chain
  if (tokenChainId === SOLANA_CHAIN_ID) {
    return wallet.chain === 'solana';
  }

  // EVM chains
  return wallet.chain === 'ethereum';
}

/**
 * Check if address chain type is compatible with token chain
 */
export function isAddressChainCompatible(
  address: string | null,
  tokenChainId?: number
): boolean {
  // If no address, not compatible
  if (!address) return false;

  // If no chainId provided, we can't determine compatibility, so return true
  // (let the user decide, or validate elsewhere)
  if (!tokenChainId) return true;

  const addressType = getAddressTypeLocal(address);

  // If address type is invalid, not compatible
  if (addressType === 'invalid') return false;

  // Solana chain
  if (tokenChainId === SOLANA_CHAIN_ID) {
    return addressType === 'solana';
  }

  // EVM chains
  return addressType === 'evm';
}

/**
 * Lightweight address type detector for frontend usage
 * Avoids importing backend Moralis client (which requires API keys)
 */
export function getAddressTypeLocal(address: string): 'evm' | 'solana' | 'invalid' {
  const trimmed = address.trim();

  // EVM: 0x + 40 hex chars
  const evmRegex = /^0x[a-fA-F0-9]{40}$/;
  if (evmRegex.test(trimmed)) {
    return 'evm';
  }

  // Solana: base58-ish, 32–44 chars, no 0x prefix
  if (
    !trimmed.startsWith('0x') &&
    trimmed.length >= 32 &&
    trimmed.length <= 44
  ) {
    return 'solana';
  }

  return 'invalid';
}

