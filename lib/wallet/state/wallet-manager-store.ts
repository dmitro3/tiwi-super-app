/**
 * Wallet Manager Store (Zustand)
 *
 * Manages a list of wallets (local + external) and a single active wallet.
 * This is Phase 1 for multi-wallet support: read-side only (balances, NFTs, history).
 *
 * SECURITY:
 * - This store intentionally keeps ONLY public data: address, type, source, labels.
 * - It does NOT store mnemonics or private keys.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WalletSource =
  | 'local'
  | 'metamask'
  | 'walletconnect'
  | 'coinbase'
  | 'rabby'
  | 'phantom'
  | 'other';

export interface ManagedWallet {
  id: string;              // internal id for UI
  address: string;         // on-chain address
  source: WalletSource;    // where it came from
  label?: string;          // optional user-friendly name
  isLocal: boolean;        // true = created/imported in TIWI
  createdAt: number;       // timestamp (ms)
}

interface WalletManagerState {
  wallets: ManagedWallet[];
  activeWalletId: string | null;

  // Actions
  addOrUpdateWallet: (wallet: Omit<ManagedWallet, 'id' | 'createdAt'> & { id?: string }) => void;
  setActiveWallet: (walletId: string) => void;
  clearActiveWallet: () => void; // Clear active wallet to allow new connection
  removeWallet: (walletId: string) => void;
  getActiveWallet: () => ManagedWallet | null;
}

function normalizeSource(raw: string | null | undefined): WalletSource {
  const lower = (raw || '').toLowerCase();
  if (lower === 'local') return 'local';
  if (lower.includes('metamask')) return 'metamask';
  if (lower.includes('walletconnect')) return 'walletconnect';
  if (lower.includes('coinbase')) return 'coinbase';
  if (lower.includes('rabby')) return 'rabby';
  if (lower.includes('phantom')) return 'phantom';
  return 'other';
}

const STORAGE_KEY = 'tiwi_wallet_manager_v1';

export const useWalletManagerStore = create<WalletManagerState>()(
  persist(
    (set, get) => ({
      wallets: [],
      activeWalletId: null,

      addOrUpdateWallet: (input) => {
        const source = normalizeSource(input.source);
        const address = input.address.toLowerCase();

        set((state) => {
          // If wallet already exists by address+source, update label/isLocal
          const existingIndex = state.wallets.findIndex(
            (w) => w.address.toLowerCase() === address && w.source === source
          );

          if (existingIndex >= 0) {
            const existing = state.wallets[existingIndex];
            const updated: ManagedWallet = {
              ...existing,
              label: input.label ?? existing.label,
              isLocal: input.isLocal ?? existing.isLocal,
            };
            const wallets = [...state.wallets];
            wallets[existingIndex] = updated;
            return { wallets, activeWalletId: state.activeWalletId || updated.id };
          }

          // New wallet
          const id = input.id || `${source}:${address}`;
          const newWallet: ManagedWallet = {
            id,
            address,
            source,
            label: input.label,
            isLocal: input.isLocal,
            createdAt: Date.now(),
          };

          return {
            wallets: [...state.wallets, newWallet],
            // If no active wallet yet, set this as active
            activeWalletId: state.activeWalletId || id,
          };
        });
      },

      setActiveWallet: (walletId) => {
        const { wallets } = get();
        const exists = wallets.some((w) => w.id === walletId);
        if (!exists) return;
        set({ activeWalletId: walletId });
      },

      clearActiveWallet: () => {
        set({ activeWalletId: null });
      },

      removeWallet: (walletId) => {
        set((state) => {
          const wallets = state.wallets.filter((w) => w.id !== walletId);
          let activeWalletId = state.activeWalletId;
          if (activeWalletId === walletId) {
            activeWalletId = wallets.length > 0 ? wallets[0].id : null;
          }
          return { wallets, activeWalletId };
        });
      },

      getActiveWallet: () => {
        const state = get();
        if (!state.activeWalletId) return null;
        return state.wallets.find((w) => w.id === state.activeWalletId) || null;
      },
    }),
    {
      name: STORAGE_KEY,
      // Only persist wallets and activeWalletId, not any sensitive data
      partialize: (state) => ({
        wallets: state.wallets,
        activeWalletId: state.activeWalletId,
      }),
    }
  )
);


