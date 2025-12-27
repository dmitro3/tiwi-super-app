/**
 * Wallet Persistence Utilities
 * 
 * Helper functions for wallet state persistence
 */

import type { WalletAccount } from '../connection/types';

const WALLET_STORAGE_KEY = 'tiwi_connected_wallet';
const SECONDARY_WALLET_STORAGE_KEY = 'tiwi_secondary_wallet';
const SECONDARY_ADDRESS_STORAGE_KEY = 'tiwi_secondary_address';

/**
 * Load primary wallet from localStorage
 * NOTE: This is handled by Zustand persist middleware, but kept for compatibility
 */
export const loadPrimaryWallet = (): WalletAccount | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(WALLET_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.state?.primaryWallet || null;
    }
  } catch (error) {
    console.error('Error loading primary wallet from storage:', error);
  }
  return null;
};

/**
 * Load secondary wallet from localStorage
 */
export const loadSecondaryWallet = (): WalletAccount | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(SECONDARY_WALLET_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as WalletAccount;
    }
  } catch (error) {
    console.error('Error loading secondary wallet from storage:', error);
  }
  return null;
};

/**
 * Load secondary address from localStorage
 */
export const loadSecondaryAddress = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(SECONDARY_ADDRESS_STORAGE_KEY);
  } catch (error) {
    console.error('Error loading secondary address from storage:', error);
  }
  return null;
};

