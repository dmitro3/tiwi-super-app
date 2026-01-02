/**
 * Balance Visibility Store (Zustand)
 * 
 * Manages global state for showing/hiding balance amounts across the app.
 * Persists to localStorage so user preference is remembered.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ===== State Interface =====

export interface BalanceVisibilityState {
  isBalanceVisible: boolean;
  toggleBalanceVisibility: () => void;
  setBalanceVisibility: (visible: boolean) => void;
}

// ===== Store Creation =====

export const useBalanceVisibilityStore = create<BalanceVisibilityState>()(
  persist(
    (set) => ({
      isBalanceVisible: true, // Default: visible
      toggleBalanceVisibility: () => set((state) => ({ 
        isBalanceVisible: !state.isBalanceVisible 
      })),
      setBalanceVisibility: (visible: boolean) => set({ 
        isBalanceVisible: visible 
      }),
    }),
    {
      name: 'tiwi-balance-visibility', // localStorage key
    }
  )
);

