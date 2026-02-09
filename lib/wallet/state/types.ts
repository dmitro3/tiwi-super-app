/**
 * Wallet State Types
 */

import type { WalletAccount } from '../connection/types';

// Unique identifier for a wallet (provider + address + chain)
export type WalletId = string;

// Generate unique wallet ID
export function generateWalletId(wallet: WalletAccount): WalletId {
  return `${wallet.provider}-${wallet.address.toLowerCase()}-${wallet.chain}`;
}

export interface WalletState {
  // Legacy support (for backward compatibility)
  primaryWallet: WalletAccount | null;
  secondaryWallet: WalletAccount | null;
  secondaryAddress: string | null; // Can be pasted address

  // New multi-wallet structure
  connectedWallets: WalletAccount[]; // Array of all connected wallets
  activeWalletId: WalletId | null; // ID of wallet that signs transactions

  isConnecting: boolean;
  isBackgroundConnection: boolean; // Flag to indicate if current connection is background (e.g. TO wallet)
  error: string | null;
}

export interface WalletStore extends WalletState {
  // Legacy actions (for backward compatibility)
  connect: (walletId: string, chain: 'ethereum' | 'solana') => Promise<void>;
  setAccount: (account: WalletAccount) => void;
  disconnect: () => Promise<void>;
  setSecondaryWallet: (wallet: WalletAccount | null) => void;
  setSecondaryAddress: (address: string | null) => void;

  // New multi-wallet actions
  addWallet: (wallet: WalletAccount, setAsActive?: boolean) => void;
  removeWallet: (walletId: WalletId) => Promise<void>;
  setActiveWallet: (walletId: WalletId) => void;
  getActiveWallet: () => WalletAccount | null;
  isProviderConnected: (providerId: string) => boolean;
  getWalletByAddress: (address: string) => WalletAccount | null;
  connectAdditionalWallet: (walletId: string, chain: 'ethereum' | 'solana', setAsActive?: boolean) => Promise<string>;

  // Helper to manually set background connection flag
  setIsBackgroundConnection: (isBackground: boolean) => void;

  // Utility actions
  clearError: () => void;
  setConnecting: (connecting: boolean) => void;
}
