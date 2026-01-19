/**
 * Wallet Store Sync Hook
 * 
 * Syncs local keystore entries with the wallet manager store on mount.
 * Ensures that all wallets stored in the keystore are also tracked in the store.
 */

import { useEffect } from 'react';
import { useWalletManagerStore } from '@/lib/wallet/state/wallet-manager-store';
import { listLocalKeystore } from '@/lib/wallet/state/local-keystore';

export function useWalletStoreSync() {
  const addOrUpdateWallet = useWalletManagerStore((s) => s.addOrUpdateWallet);

  useEffect(() => {
    // Load all keystore entries
    const keystoreEntries = listLocalKeystore();
    const currentWallets = useWalletManagerStore.getState().wallets;

    // Sync each keystore entry with the store
    keystoreEntries.forEach((entry) => {
      const walletId = `local:${entry.address.toLowerCase()}`;
      
      // Check if wallet already exists in store
      const exists = currentWallets.some((w) => w.id === walletId);
      
      if (!exists) {
        // Add wallet to store if it doesn't exist
        addOrUpdateWallet({
          id: walletId,
          address: entry.address,
          source: 'local',
          isLocal: true,
          label: undefined,
        });
      }
    });
  }, []); // Only run on mount
}

