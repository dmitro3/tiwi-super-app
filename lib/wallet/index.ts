/**
 * Wallet Module - Public API
 * 
 * Main entry point for wallet functionality
 */

// Detection
export { detectWalletProviders, getWalletById, getAllSupportedWallets } from './detection/detector';
export type { WalletProvider, SupportedChain } from './detection/types';
export { SUPPORTED_WALLETS } from './detection/supported-wallets';
export type { SupportedWallet } from './detection/supported-wallets';

// Connection
export { connectWallet, disconnectWallet, getWalletForChain, getConnectedAccount, detectWalletFromProvider } from './connection/connector';
export type { WalletAccount, WalletChain } from './connection/types';

// State
export { useWalletStore } from './state/store';
export type { WalletState, WalletStore } from './state/types';

// Hooks
export { useWallet } from './hooks/useWallet';
export { useSecondaryWallet } from './hooks/useSecondaryWallet';

// Providers
export { wagmiConfig } from './providers/wagmi-config';

