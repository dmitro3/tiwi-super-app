/**
 * Wallet State Types
 */

import type { WalletAccount } from '../connection/types';

export interface WalletState {
  // Primary wallet
  primaryWallet: WalletAccount | null;
  isConnecting: boolean;
  error: string | null;
  
  // Secondary wallet (for recipient addresses)
  secondaryWallet: WalletAccount | null;
  secondaryAddress: string | null; // Can be pasted address
}

export interface WalletStore extends WalletState {
  // Actions
  connect: (walletId: string, chain: 'ethereum' | 'solana') => Promise<void>;
  disconnect: () => Promise<void>;
  setSecondaryWallet: (wallet: WalletAccount | null) => void;
  setSecondaryAddress: (address: string | null) => void;
  clearError: () => void;
  setConnecting: (connecting: boolean) => void;
}

