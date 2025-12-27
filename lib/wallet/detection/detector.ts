/**
 * Wallet Detection Module
 * 
 * Pure functions for detecting installed wallet providers
 */

import { SUPPORTED_WALLETS, type SupportedWallet } from './supported-wallets';
import { isWalletInstalled, convertToWalletProvider } from './helpers';
import type { WalletProvider, SupportedChain } from './types';

export type WalletChain = SupportedChain;

/**
 * Detect all available wallet providers from the supported wallets list
 */
export const detectWalletProviders = (): WalletProvider[] => {
  const providers: WalletProvider[] = [];
  
  if (typeof window === 'undefined') {
    return providers;
  }

  // Check each supported wallet to see if it's installed
  for (const wallet of SUPPORTED_WALLETS) {
    const installed = isWalletInstalled(wallet);
    if (installed) {
      providers.push(convertToWalletProvider(wallet, true));
    }
  }
  
  return providers;
};

/**
 * Get wallet by ID from supported wallets
 */
export const getWalletById = (id: string): SupportedWallet | undefined => {
  return SUPPORTED_WALLETS.find(wallet => wallet.id === id);
};

/**
 * Get all supported wallets (installed and not installed)
 */
export const getAllSupportedWallets = (): WalletProvider[] => {
  return SUPPORTED_WALLETS.map(wallet => convertToWalletProvider(wallet, false));
};

