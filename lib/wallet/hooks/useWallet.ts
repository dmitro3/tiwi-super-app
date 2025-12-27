/**
 * Main Wallet Hook
 * 
 * Provides access to wallet state and actions
 */

import { useWalletStore } from '../state/store';
import { useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';

/**
 * Main wallet hook
 * Syncs with Wagmi state (read-only)
 */
export function useWallet() {
  const store = useWalletStore();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  // Sync with Wagmi state (read-only)
  // If Wagmi is connected but our store isn't, update store
  useEffect(() => {
    if (wagmiConnected && wagmiAddress && !store.primaryWallet) {
      // Wagmi is connected, but our store doesn't know about it
      // This can happen if wallet was connected via Wagmi directly
      // For now, we'll let the user reconnect via our system
      // In the future, we could auto-sync here
    }
  }, [wagmiConnected, wagmiAddress, store.primaryWallet]);

  return {
    // State
    primaryWallet: store.primaryWallet,
    isConnecting: store.isConnecting,
    error: store.error,
    secondaryWallet: store.secondaryWallet,
    secondaryAddress: store.secondaryAddress,
    
    // Computed
    isConnected: !!store.primaryWallet,
    address: store.primaryWallet?.address || null,
    
    // Actions
    connect: store.connect,
    disconnect: async () => {
      // Disconnect from both our store and Wagmi
      await store.disconnect();
      if (wagmiConnected) {
        wagmiDisconnect();
      }
    },
    setSecondaryWallet: store.setSecondaryWallet,
    setSecondaryAddress: store.setSecondaryAddress,
    clearError: store.clearError,
  };
}

