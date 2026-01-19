/**
 * Wallet State Store (Zustand)
 * 
 * Manages wallet connection state with persistence
 * Supports multiple wallets with active wallet tracking
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WalletAccount } from '../connection/types';
import { connectWallet, disconnectWallet as disconnectWalletConnector } from '../connection/connector';
import type { WalletStore, WalletId } from './types';
import { generateWalletId } from './types';
import { mapWalletIdToProviderId } from '../utils/wallet-id-mapper';

const WALLET_STORAGE_KEY = 'tiwi_connected_wallet';
const SECONDARY_WALLET_STORAGE_KEY = 'tiwi_secondary_wallet';
const SECONDARY_ADDRESS_STORAGE_KEY = 'tiwi_secondary_address';

// Maximum number of connected wallets
const MAX_WALLETS = 10;

// Helper: check if an address is already connected on a given chain (regardless of provider)
function isAddressConnected(
  state: WalletStore,
  address: string,
  chain: WalletAccount['chain']
): boolean {
  const target = address.toLowerCase();
  return state.connectedWallets.some(
    (w) => w.address.toLowerCase() === target && w.chain === chain
  );
}

// Helper: check if there's an existing wallet with same provider+chain but different address (account switch scenario)
function findWalletByProviderAndChain(
  state: WalletStore,
  provider: string,
  chain: WalletAccount['chain']
): WalletAccount | null {
  return state.connectedWallets.find(
    (w) => w.provider === provider && w.chain === chain
  ) || null;
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      // Legacy state (for backward compatibility)
      primaryWallet: null,
      secondaryWallet: null,
      secondaryAddress: null,
      
      // New multi-wallet state
      connectedWallets: [],
      activeWalletId: null,
      
      isConnecting: false,
      error: null,
      

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
        const state = get();
        const walletId = generateWalletId(account);

        // Check if this exact wallet (provider+address+chain) already exists
        const existsIndex = state.connectedWallets.findIndex(
          (w) => generateWalletId(w) === walletId
        );

        // Check if same address+chain is connected via different provider (block duplicate)
        const duplicateByAddress = existsIndex === -1 && isAddressConnected(state, account.address, account.chain);
        if (duplicateByAddress) {
          const errorMessage = 'This address is already connected. Please select a different account.';
          set({
            isConnecting: false,
            error: errorMessage,
          });
          throw new Error(errorMessage);
        }

        // Check if same provider+chain but different address (account switch scenario)
        const existingWalletSameProvider = findWalletByProviderAndChain(state, account.provider, account.chain);
        const isAccountSwitch = existingWalletSameProvider && 
          existingWalletSameProvider.address.toLowerCase() !== account.address.toLowerCase();

        let newWallets = state.connectedWallets;
        let newActiveId = walletId;

        if (existsIndex !== -1) {
          // Exact wallet exists, just update it
          newWallets = [...state.connectedWallets];
          newWallets[existsIndex] = account;
        } else if (isAccountSwitch) {
          // Account switch: replace the existing wallet entry for this provider+chain
          const switchIndex = state.connectedWallets.findIndex(
            (w) => w.provider === account.provider && w.chain === account.chain
          );
          if (switchIndex !== -1) {
            newWallets = [...state.connectedWallets];
            newWallets[switchIndex] = account;
            // If the switched wallet was active, keep it active
            const oldWalletId = generateWalletId(state.connectedWallets[switchIndex]);
            if (state.activeWalletId === oldWalletId) {
              newActiveId = walletId;
            }
          } else {
            // Shouldn't happen, but fallback to adding
            if (state.connectedWallets.length >= MAX_WALLETS) {
              console.warn(
                `[WalletStore] Maximum ${MAX_WALLETS} wallets reached, cannot add more`
              );
            } else {
              newWallets = [...state.connectedWallets, account];
            }
          }
        } else {
          // New wallet, add it
          if (state.connectedWallets.length >= MAX_WALLETS) {
            console.warn(
              `[WalletStore] Maximum ${MAX_WALLETS} wallets reached, cannot add more`
            );
          } else {
            newWallets = [...state.connectedWallets, account];
          }
        }

        // Always treat setAccount as setting the active/primary wallet
        set({
          connectedWallets: newWallets,
          activeWalletId: newActiveId,
          primaryWallet: account,
          isConnecting: false,
          error: null,
        });
      },

      disconnect: async () => {
        const state = get();
        
        // Get the wallet to disconnect (active wallet or primaryWallet for backward compatibility)
        const walletToDisconnect = state.activeWalletId 
          ? state.connectedWallets.find(w => generateWalletId(w) === state.activeWalletId)
          : state.primaryWallet;
        
        if (walletToDisconnect) {
          // Use removeWallet to properly handle multi-wallet structure
          const walletId = generateWalletId(walletToDisconnect);
          await get().removeWallet(walletId);
        } else {
          // No connected wallets – clear only connected wallet state.
          // NOTE: We intentionally DO NOT clear secondaryAddress here so that
          // pasted/manual recipient addresses remain even after disconnecting wallets.
          set({
            primaryWallet: null,
            secondaryWallet: null,
            connectedWallets: [],
            activeWalletId: null,
            error: null,
            isConnecting: false,
          });
          
          // Force clear all wallet-related localStorage to ensure disconnection persists
          if (typeof window !== 'undefined') {
            try {
              // Clear our store
              localStorage.removeItem(WALLET_STORAGE_KEY);
              
              // Clear Wagmi storage
              localStorage.removeItem('wagmi.store');
              localStorage.removeItem('wagmi.connections');
              
              // Clear chain-specific Wagmi storage
              const origin = window.location.origin;
              const chains = ['ethereum', 'mainnet', 'arbitrum', 'optimism', 'polygon', 'base', 'bsc', '56', '1', '42161', '10', '137', '8453'];
              chains.forEach(chain => {
                const key = `${chain}-${origin}`;
                localStorage.removeItem(key);
              });
              localStorage.removeItem(origin);
              
              // Clear LiFi/WalletConnect storage
              const lifiKeys = Object.keys(localStorage).filter(key => 
                key.toLowerCase().includes('lifi') || 
                key.toLowerCase().includes('walletconnect')
              );
              lifiKeys.forEach(key => {
                localStorage.removeItem(key);
              });
              
              console.log('[WalletStore] Cleared all wallet storage on disconnect');
            } catch (error) {
              console.warn('[WalletStore] Error clearing localStorage on disconnect:', error);
            }
          }
        }
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
      
      // ===== NEW MULTI-WALLET METHODS =====
      
      /**
       * Add a wallet to the connected wallets array
       * @param wallet - Wallet account to add
       * @param setAsActive - Whether to set this wallet as active (default: false)
       */
      addWallet: (wallet: WalletAccount, setAsActive = false) => {
        const state = get();
        const walletId = generateWalletId(wallet);
        
        // Check if exact walletId already exists
        const exists = state.connectedWallets.some((w) => generateWalletId(w) === walletId);
        if (exists) {
          console.warn(`[WalletStore] Wallet ${walletId} already connected`);
          return;
        }
        
        // Check if same address+chain is connected via different provider (block duplicate)
        if (isAddressConnected(state, wallet.address, wallet.chain)) {
          const errorMessage = 'This address is already connected. Please select a different account.';
          set({ error: errorMessage });
          throw new Error(errorMessage);
        }
        
        // Check if same provider+chain but different address (account switch scenario)
        const existingWalletSameProvider = findWalletByProviderAndChain(state, wallet.provider, wallet.chain);
        const isAccountSwitch = existingWalletSameProvider && 
          existingWalletSameProvider.address.toLowerCase() !== wallet.address.toLowerCase();
        
        let newWallets = state.connectedWallets;
        let newActiveId = setAsActive ? walletId : (state.activeWalletId || walletId);
        
        if (isAccountSwitch) {
          // Account switch: replace the existing wallet entry for this provider+chain
          const switchIndex = state.connectedWallets.findIndex(
            (w) => w.provider === wallet.provider && w.chain === wallet.chain
          );
          if (switchIndex !== -1) {
            newWallets = [...state.connectedWallets];
            newWallets[switchIndex] = wallet;
            // If the switched wallet was active, keep it active if setAsActive is true
            const oldWalletId = generateWalletId(state.connectedWallets[switchIndex]);
            if (setAsActive || state.activeWalletId === oldWalletId) {
              newActiveId = walletId;
            }
          } else {
            // Shouldn't happen, but fallback to adding
            if (state.connectedWallets.length >= MAX_WALLETS) {
              throw new Error(`Maximum ${MAX_WALLETS} wallets allowed`);
            }
            newWallets = [...state.connectedWallets, wallet];
          }
        } else {
          // New wallet, add it
          if (state.connectedWallets.length >= MAX_WALLETS) {
            throw new Error(`Maximum ${MAX_WALLETS} wallets allowed`);
          }
          newWallets = [...state.connectedWallets, wallet];
        }
        
        set({
          connectedWallets: newWallets,
          activeWalletId: newActiveId,
          // Update legacy primaryWallet for backward compatibility
          primaryWallet: setAsActive ? wallet : state.primaryWallet || wallet,
        });
      },
      
      /**
       * Remove a wallet from connected wallets
       * @param walletId - Unique wallet ID to remove
       */
      removeWallet: async (walletId: WalletId) => {
        const state = get();
        const wallet = state.connectedWallets.find(w => generateWalletId(w) === walletId);
        
        if (!wallet) {
          console.warn(`[WalletStore] Wallet ${walletId} not found`);
          return;
        }
        
        // Disconnect from provider
        try {
          const mappedProviderId = mapWalletIdToProviderId(wallet.provider);
          await disconnectWalletConnector(mappedProviderId, wallet.chain);
        } catch (error) {
          console.warn('[WalletStore] Error disconnecting wallet:', error);
        }
        
        // Remove from array
        const newWallets = state.connectedWallets.filter(w => generateWalletId(w) !== walletId);
        
        // If removed wallet was active, set new active wallet
        let newActiveId = state.activeWalletId;
        let newPrimaryWallet = state.primaryWallet;
        
        if (state.activeWalletId === walletId) {
          newActiveId = newWallets.length > 0 ? generateWalletId(newWallets[0]) : null;
          // Update primaryWallet to new active wallet (or null if none)
          newPrimaryWallet = newWallets[0] || null;
        } else if (state.primaryWallet && generateWalletId(state.primaryWallet) === walletId) {
          // The removed wallet was the primaryWallet but not active, update it
          newPrimaryWallet = newWallets[0] || null;
        }
        
        set({
          connectedWallets: newWallets,
          activeWalletId: newActiveId,
          primaryWallet: newPrimaryWallet,
          // Clear only secondaryWallet if it was pointing at the disconnected wallet.
          // We intentionally leave secondaryAddress untouched so that manually
          // pasted recipient addresses are not affected by wallet disconnects.
          secondaryWallet: state.secondaryWallet && generateWalletId(state.secondaryWallet) === walletId
            ? null
            : state.secondaryWallet,
          isConnecting: false,
        });
        
        // If no wallets remain, clear all storage to ensure disconnection persists
        if (newWallets.length === 0 && typeof window !== 'undefined') {
          try {
            // Clear our store
            localStorage.removeItem(WALLET_STORAGE_KEY);
            
            // Clear Wagmi storage
            localStorage.removeItem('wagmi.store');
            localStorage.removeItem('wagmi.connections');
            
            // Clear chain-specific Wagmi storage
            const origin = window.location.origin;
            const chains = ['ethereum', 'mainnet', 'arbitrum', 'optimism', 'polygon', 'base', 'bsc', '56', '1', '42161', '10', '137', '8453'];
            chains.forEach(chain => {
              const key = `${chain}-${origin}`;
              localStorage.removeItem(key);
            });
            localStorage.removeItem(origin);
            
            // Clear LiFi/WalletConnect storage
            const lifiKeys = Object.keys(localStorage).filter(key => 
              key.toLowerCase().includes('lifi') || 
              key.toLowerCase().includes('walletconnect')
            );
            lifiKeys.forEach(key => {
              localStorage.removeItem(key);
            });
            
            console.log('[WalletStore] Cleared all wallet storage on disconnect');
          } catch (error) {
            console.warn('[WalletStore] Error clearing localStorage after removing last wallet:', error);
          }
        }
      },
      
      /**
       * Set the active wallet (wallet that signs transactions)
       * @param walletId - Unique wallet ID to set as active
       */
      setActiveWallet: (walletId: WalletId) => {
        const state = get();
        const wallet = state.connectedWallets.find(w => generateWalletId(w) === walletId);
        
        if (!wallet) {
          throw new Error(`Wallet ${walletId} not found in connected wallets`);
        }
        
        set({
          activeWalletId: walletId,
          // Update legacy primaryWallet for backward compatibility
          primaryWallet: wallet,
        });
      },
      
      /**
       * Get the currently active wallet
       */
      getActiveWallet: () => {
        const state = get();
        if (!state.activeWalletId) return null;
        
        return state.connectedWallets.find(w => generateWalletId(w) === state.activeWalletId) || null;
      },
      
      /**
       * Check if a provider is already connected
       * @param providerId - Provider ID to check
       * @returns true if provider is connected (on any chain)
       */
      isProviderConnected: (providerId: string) => {
        const state = get();
        return state.connectedWallets.some(w => w.provider === providerId);
      },
      
      /**
       * Get wallet by address (case-insensitive)
       * @param address - Wallet address to find
       * @returns Wallet account or null
       */
      getWalletByAddress: (address: string) => {
        const state = get();
        const addressLower = address.toLowerCase();
        return state.connectedWallets.find(w => w.address.toLowerCase() === addressLower) || null;
      },
      
      /**
       * Connect an additional wallet without disconnecting existing ones
       * @param walletId - Wallet ID to connect
       * @param chain - Chain to connect to
       * @param setAsActive - Whether to set as active wallet (default: true if connecting from "From" section)
       */
      connectAdditionalWallet: async (
        walletId: string,
        chain: 'ethereum' | 'solana',
        setAsActive = true
      ) => {
        const state = get();
        const providerId = mapWalletIdToProviderId(walletId);

        set({ isConnecting: true, error: null });

        try {
          // Connect to new wallet
          const account = await connectWallet(providerId, chain);
          
          // Store the original wallet ID (not the provider ID) for consistency
          const accountWithOriginalId: WalletAccount = {
            ...account,
            provider: walletId, // Keep original wallet ID
          };
          
          // Block duplicates by address+chain, regardless of provider
          if (isAddressConnected(state, accountWithOriginalId.address, accountWithOriginalId.chain)) {
            throw new Error('This address is already connected. Please select a different account.');
          }
          
          // Check wallet limit
          if (state.connectedWallets.length >= MAX_WALLETS) {
            throw new Error(`Maximum ${MAX_WALLETS} wallets allowed`);
          }
          
          // Add wallet
          get().addWallet(accountWithOriginalId, setAsActive);
          
          set({
            isConnecting: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isConnecting: false,
            error: error?.message || 'Failed to connect wallet',
          });
          throw error;
        }
      },
    }),
    {
      name: WALLET_STORAGE_KEY,
      partialize: (state) => ({
        // Persist both legacy and new structure for smooth migration
        primaryWallet: state.primaryWallet,
        secondaryWallet: state.secondaryWallet,
        secondaryAddress: state.secondaryAddress,
        connectedWallets: state.connectedWallets,
        activeWalletId: state.activeWalletId,
        // Don't persist isConnecting or error
      }),
      // Migration: Run on store hydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Migrate legacy primary/secondary to connectedWallets array
          if (state.connectedWallets.length === 0) {
            const wallets: WalletAccount[] = [];
            
            // Migrate primary wallet
            if (state.primaryWallet) {
              wallets.push(state.primaryWallet);
            }
            
            // Migrate secondary wallet (if it's a connected wallet, not just an address)
            if (state.secondaryWallet) {
              // Check if it's not already in the array (avoid duplicates)
              const exists = wallets.some(w => 
                w.address.toLowerCase() === state.secondaryWallet!.address.toLowerCase() &&
                w.provider === state.secondaryWallet!.provider &&
                w.chain === state.secondaryWallet!.chain
              );
              if (!exists) {
                wallets.push(state.secondaryWallet);
              }
            }
            
            // Set connected wallets and active wallet
            if (wallets.length > 0) {
              const activeId = state.activeWalletId || generateWalletId(wallets[0]);
              state.connectedWallets = wallets;
              state.activeWalletId = activeId;
            }
          }
        }
      },
    }
  )
);

