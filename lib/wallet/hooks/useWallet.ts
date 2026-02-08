/**
 * Main Wallet Hook
 * 
 * Provides access to wallet state and actions
 */

import { useWalletStore } from '../state/store';
import { useEffect, useRef } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { getConnection } from '@wagmi/core';
import { useConfig } from 'wagmi';
import { mapProviderIdToWalletId } from '../utils/wallet-id-mapper';
import type { WalletAccount } from '../connection/types';

/**
 * Main wallet hook
 * Syncs with Wagmi state (read-only)
 */
export function useWallet() {
  const store = useWalletStore();
  const wagmiConfig = useConfig();
  const { address: wagmiAddress, isConnected: wagmiConnected, connector } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const lastWagmiAddressRef = useRef<string | undefined>(undefined);

  // Track wagmi account changes and sync with store
  useEffect(() => {
    if (!wagmiConnected || !wagmiAddress) {
      lastWagmiAddressRef.current = undefined;
      return;
    }

    // Check if address changed
    if (lastWagmiAddressRef.current === wagmiAddress) {
      return; // No change
    }

    const previousAddress = lastWagmiAddressRef.current;
    lastWagmiAddressRef.current = wagmiAddress;

    // If this is the first time we see this address, or it changed, sync with store
    if (!previousAddress || previousAddress !== wagmiAddress) {
      // Determine which provider this is from (check connector)
      // IMPORTANT: Check in order of specificity (most specific first)
      let providerId: string | null = null;

      if (connector) {
        const connectorId = (connector.id || '').toLowerCase();
        const connectorName = (connector.name || '').toLowerCase();

        // Check for specific wallets first (most specific)
        // Rabby - check for "io.rabby" (reverse DNS format) or "rabby"
        if (connectorId === 'io.rabby' || connectorId.includes('rabby') || connectorName.includes('rabby')) {
          providerId = 'rabby';
        }
        // OKX Wallet
        else if (connectorId.includes('okx') || connectorName.includes('okx')) {
          providerId = 'okx';
        }
        // Trust Wallet
        else if (connectorId.includes('trust') || connectorName.includes('trust')) {
          providerId = 'trust';
        }
        // Brave Wallet
        else if (connectorId.includes('brave') || connectorName.includes('brave')) {
          providerId = 'brave';
        }
        // Coinbase Wallet
        else if (connectorId.includes('coinbase') || connectorName.includes('coinbase')) {
          providerId = 'coinbase';
        }
        // Binance Wallet
        else if (connectorId.includes('binance') || connectorName.includes('binance')) {
          providerId = 'binance';
        }
        // Zerion
        else if (connectorId.includes('zerion') || connectorName.includes('zerion')) {
          providerId = 'zerion';
        }
        // TokenPocket
        else if (connectorId.includes('tokenpocket') || connectorName.includes('tokenpocket')) {
          providerId = 'tokenpocket';
        }
        // BitKeep
        else if (connectorId.includes('bitkeep') || connectorName.includes('bitkeep')) {
          providerId = 'bitkeep';
        }
        // MathWallet
        else if (connectorId.includes('mathwallet') || connectorName.includes('mathwallet')) {
          providerId = 'mathwallet';
        }
        // Frame
        else if (connectorId.includes('frame') || connectorName.includes('frame')) {
          providerId = 'frame';
        }
        // Frontier
        else if (connectorId.includes('frontier') || connectorName.includes('frontier')) {
          providerId = 'frontier';
        }
        // WalletConnect
        else if (connectorId.includes('walletconnect') || connectorName.includes('walletconnect')) {
          providerId = 'walletconnect';
        }
        // MetaMask - check LAST (many wallets masquerade as MetaMask)
        // Only if it's actually MetaMask and not one of the above
        else if (connectorId.includes('metamask') || connectorName.includes('metamask')) {
          // Additional verification: check if it's NOT Rabby/OKX/Trust masquerading
          if (!connectorId.includes('rabby') &&
            !connectorId.includes('okx') &&
            !connectorId.includes('trust') &&
            !connectorName.includes('rabby') &&
            !connectorName.includes('okx') &&
            !connectorName.includes('trust')) {
            providerId = 'metamask';
          }
        }
      }

      // If we couldn't detect the provider, check if we already have a wallet with this address
      // This prevents overwriting a correctly set provider
      if (!providerId) {
        const existingWalletByAddress = store.connectedWallets.find(
          (w) => w.address.toLowerCase() === wagmiAddress.toLowerCase() && w.chain === 'ethereum'
        );

        if (existingWalletByAddress) {
          // We already have this wallet with a correct provider, don't overwrite
          console.log('[useWallet] Wallet already exists with correct provider, skipping sync:', {
            address: wagmiAddress,
            existingProvider: existingWalletByAddress.provider,
            connectorId: connector?.id,
            connectorName: connector?.name,
          });
          return; // Exit early - don't overwrite
        }

        // No existing wallet found, but we can't detect provider
        // Default to 'metamask' as fallback (but this should rarely happen)
        console.warn('[useWallet] Could not detect wallet provider from connector, defaulting to metamask:', {
          connectorId: connector?.id,
          connectorName: connector?.name,
        });
        providerId = 'metamask';
      }

      // Map provider ID back to wallet ID
      const walletId = mapProviderIdToWalletId(providerId);

      // Check if we already have a wallet with this address
      const existingWalletByAddress = store.connectedWallets.find(
        (w) => w.address.toLowerCase() === wagmiAddress.toLowerCase() && w.chain === 'ethereum'
      );

      // CRITICAL: If we already have this wallet with the CORRECT provider, don't overwrite
      if (existingWalletByAddress && existingWalletByAddress.provider === walletId) {
        // Provider is already correct, no need to update
        console.log('[useWallet] Wallet already has correct provider, skipping update:', {
          address: wagmiAddress,
          provider: walletId,
        });
        return; // Exit early - don't overwrite
      }

      // Check if we already have a wallet with this provider+chain (different address = account switch)
      const existingWallet = store.connectedWallets.find(
        (w) => w.provider === walletId && w.chain === 'ethereum'
      );

      // If address changed for an existing wallet, update it (account switch)
      if (existingWallet && existingWallet.address.toLowerCase() !== wagmiAddress.toLowerCase()) {
        const updatedAccount: WalletAccount = {
          address: wagmiAddress,
          chain: 'ethereum',
          provider: walletId,
        };

        try {
          // Check if this is a background connection (e.g. TO wallet)
          if (store.isBackgroundConnection) {
            // Add wallet but DON'T set as active
            store.addWallet(updatedAccount, false);
            console.log('[useWallet] Background wallet connection synced:', updatedAccount);
          } else {
            // Normal connection - set as active
            // Use setAccount which handles account switching logic
            store.setAccount(updatedAccount);
          }
        } catch (error) {
          console.warn('[useWallet] Error syncing account change:', error);
        }
      } else if (!existingWallet && !existingWalletByAddress) {
        // New wallet connection from wagmi (shouldn't happen often, but handle it)
        const newAccount: WalletAccount = {
          address: wagmiAddress,
          chain: 'ethereum',
          provider: walletId,
        };

        try {
          if (store.isBackgroundConnection) {
            store.addWallet(newAccount, false);
            console.log('[useWallet] Background wallet added:', newAccount);
          } else {
            store.setAccount(newAccount);
          }
        } catch (error) {
          console.warn('[useWallet] Error adding new account from wagmi:', error);
        }
      } else if (existingWalletByAddress && existingWalletByAddress.provider !== walletId) {
        // Wallet exists but with different provider - this means our detection found a different wallet
        // Only update if the detected provider is more specific/accurate
        // For now, we'll update it, but log a warning
        console.warn('[useWallet] Updating wallet provider from sync:', {
          address: wagmiAddress,
          oldProvider: existingWalletByAddress.provider,
          newProvider: walletId,
          connectorId: connector?.id,
          connectorName: connector?.name,
        });

        const updatedAccount: WalletAccount = {
          address: wagmiAddress,
          chain: 'ethereum',
          provider: walletId,
        };

        try {
          if (store.isBackgroundConnection) {
            // Even for updates, respect background flag
            // But for updates we might need to be careful not to create duplicates
            // addWallet handles duplicates gracefully
            store.addWallet(updatedAccount, false);
          } else {
            store.setAccount(updatedAccount);
          }
        } catch (error) {
          console.warn('[useWallet] Error updating wallet provider:', error);
        }
      } else {
        // Same address, same provider - already in sync
        // No action needed
      }
    }
  }, [wagmiConnected, wagmiAddress, connector, store]);

  // Get active wallet (for backward compatibility, falls back to primaryWallet)
  const activeWallet = store.getActiveWallet() || store.primaryWallet;

  return {
    // Legacy state (for backward compatibility)
    primaryWallet: store.primaryWallet,
    secondaryWallet: store.secondaryWallet,
    secondaryAddress: store.secondaryAddress,

    // New multi-wallet state
    connectedWallets: store.connectedWallets,
    activeWallet: activeWallet,
    activeWalletId: store.activeWalletId,

    // Common state
    isConnecting: store.isConnecting,
    error: store.error,

    // Computed (backward compatible)
    isConnected: store.connectedWallets.length > 0 || !!store.primaryWallet,
    address: activeWallet?.address || null,

    // Legacy actions (for backward compatibility)
    connect: store.connect,
    disconnect: async () => {
      // Disconnect from both our store and Wagmi
      await store.disconnect();

      // Disconnect from Wagmi
      if (wagmiConnected) {
        wagmiDisconnect();
      }

      // Clear all Wagmi localStorage keys
      if (typeof window !== 'undefined') {
        try {
          // Clear Wagmi store
          localStorage.removeItem('wagmi.store');
          localStorage.removeItem('wagmi.connections');

          // Clear chain-specific Wagmi storage (format: {chain}-{origin})
          // Common origins: http://localhost:3000, https://domain.com
          const origin = window.location.origin;
          const chains = ['ethereum', 'mainnet', 'arbitrum', 'optimism', 'polygon', 'base', 'bsc', '56', '1', '42161', '10', '137', '8453'];
          chains.forEach(chain => {
            const key = `${chain}-${origin}`;
            localStorage.removeItem(key);
          });

          // Also try clearing with just the origin (some Wagmi versions use this format)
          localStorage.removeItem(origin);

          console.log('[useWallet] Cleared Wagmi localStorage keys');
        } catch (error) {
          console.warn('[useWallet] Error clearing Wagmi localStorage:', error);
        }

        // Clear LiFi storage if it exists
        try {
          // LiFi SDK may store connection state - clear common keys
          const lifiKeys = Object.keys(localStorage).filter(key =>
            key.toLowerCase().includes('lifi') ||
            key.toLowerCase().includes('walletconnect')
          );
          lifiKeys.forEach(key => {
            localStorage.removeItem(key);
          });

          if (lifiKeys.length > 0) {
            console.log('[useWallet] Cleared LiFi/WalletConnect localStorage keys:', lifiKeys);
          }
        } catch (error) {
          console.warn('[useWallet] Error clearing LiFi localStorage:', error);
        }
      }
    },
    setSecondaryWallet: store.setSecondaryWallet,
    setSecondaryAddress: store.setSecondaryAddress,

    // New multi-wallet actions
    addWallet: store.addWallet,
    removeWallet: store.removeWallet,
    setActiveWallet: store.setActiveWallet,
    getActiveWallet: store.getActiveWallet,
    isProviderConnected: store.isProviderConnected,
    getWalletByAddress: store.getWalletByAddress,
    connectAdditionalWallet: store.connectAdditionalWallet,

    // Utility actions
    clearError: store.clearError,
  };
}

