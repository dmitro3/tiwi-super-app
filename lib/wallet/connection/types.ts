/**
 * Wallet Connection Types
 */

export type WalletChain = 'ethereum' | 'solana';

export interface WalletAccount {
  address: string;
  chain: WalletChain;
  provider: string;
}

