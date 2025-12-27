/**
 * Wallet State Store (Zustand)
 * 
 * Manages wallet connection state with persistence
 * FIXED: Does NOT clear localStorage on mount (unlike tiwi-test)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WalletAccount } from '../connection/types';
import { connectWallet, disconnectWallet as disconnectWalletConnector } from '../connection/connector';
import type { WalletStore } from './types';
import { mapWalletIdToProviderId } from '../utils/wallet-id-mapper';

const WALLET_STORAGE_KEY = 'tiwi_connected_wallet';
const SECONDARY_WALLET_STORAGE_KEY = 'tiwi_secondary_wallet';
const SECONDARY_ADDRESS_STORAGE_KEY = 'tiwi_secondary_address';

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      // Initial state
      primaryWallet: null,
      isConnecting: false,
      error: null,
      secondaryWallet: null,
      secondaryAddress: null,

      // Actions
      connect: async (walletId: string, chain: 'ethereum' | 'solana') => {
        set({ isConnecting: true, error: null });
        
        try {
          // Disconnect any existing wallet first
          const currentWallet = get().primaryWallet;
          if (currentWallet) {
            try {
              // Map wallet ID to provider ID for disconnection
              const mappedProviderId = mapWalletIdToProviderId(currentWallet.provider);
              await disconnectWalletConnector(mappedProviderId, currentWallet.chain);
            } catch (error) {
              // Ignore disconnect errors
              console.warn('Error disconnecting existing wallet:', error);
            }
          }

          // Map wallet ID to provider ID expected by connector
          const providerId = mapWalletIdToProviderId(walletId);
          
          // Connect to new wallet using mapped provider ID
          const account = await connectWallet(providerId, chain);
          
          // Store the original wallet ID (not the provider ID) for consistency
          const accountWithOriginalId: WalletAccount = {
            ...account,
            provider: walletId, // Keep original wallet ID
          };
          
          set({
            primaryWallet: accountWithOriginalId,
            isConnecting: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isConnecting: false,
            error: error?.message || 'Failed to connect wallet',
            primaryWallet: null,
          });
          throw error;
        }
      },

      setAccount: (account: WalletAccount) => {
        set({
          primaryWallet: account,
          isConnecting: false,
          error: null,
        });
      },

      disconnect: async () => {
        const currentWallet = get().primaryWallet;
        
        if (currentWallet) {
          try {
            // Map wallet ID to provider ID for disconnection
            const mappedProviderId = mapWalletIdToProviderId(currentWallet.provider);
            await disconnectWalletConnector(mappedProviderId, currentWallet.chain);
          } catch (error) {
            console.warn('Error disconnecting wallet:', error);
          }
        }

        set({
          primaryWallet: null,
          error: null,
        });
      },

      setSecondaryWallet: (wallet: WalletAccount | null) => {
        set({ 
          secondaryWallet: wallet,
          secondaryAddress: null, // Clear address when setting wallet
        });
      },

      setSecondaryAddress: (address: string | null) => {
        set({ 
          secondaryAddress: address,
          secondaryWallet: null, // Clear wallet when setting address
        });
      },

      clearError: () => {
        set({ error: null });
      },

      setConnecting: (connecting: boolean) => {
        set({ isConnecting: connecting });
      },
    }),
    {
      name: WALLET_STORAGE_KEY,
      partialize: (state) => ({
        primaryWallet: state.primaryWallet,
        secondaryWallet: state.secondaryWallet,
        secondaryAddress: state.secondaryAddress,
        // Don't persist isConnecting or error
      }),
    }
  )
);

