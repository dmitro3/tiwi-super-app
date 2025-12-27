/**
 * Secondary Wallet Hook
 * 
 * Provides access to secondary wallet state and actions
 */

import { useWalletStore } from '../state/store';

/**
 * Secondary wallet hook
 * For managing recipient addresses (connected wallet or pasted address)
 */
export function useSecondaryWallet() {
  const store = useWalletStore();

  return {
    // State
    secondaryWallet: store.secondaryWallet,
    secondaryAddress: store.secondaryAddress,
    
    // Computed
    isSecondaryConnected: !!store.secondaryWallet,
    secondaryWalletAddress: store.secondaryWallet?.address || store.secondaryAddress,
    
    // Actions
    setSecondaryWallet: store.setSecondaryWallet,
    setSecondaryAddress: store.setSecondaryAddress,
    clearSecondary: () => {
      store.setSecondaryWallet(null);
      store.setSecondaryAddress(null);
    },
  };
}

