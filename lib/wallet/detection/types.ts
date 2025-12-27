/**
 * Wallet Detection Types
 * 
 * Core types for wallet detection system
 */

export type SupportedChain = 'ethereum' | 'solana';

export interface SupportedWallet {
  id: string;
  name: string;
  icon: string;
  supportedChains: SupportedChain[];
  detectionKeys: string[];
  installUrl?: string;
  description?: string;
  walletConnectId?: string;
  imageId?: string;
}

export interface WalletProvider {
  id: string;
  name: string;
  icon?: string;
  supportedChains: SupportedChain[];
  installed: boolean;
  imageId?: string;
}

