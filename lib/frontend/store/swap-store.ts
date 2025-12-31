/**
 * Swap State Store (Zustand)
 * 
 * Manages core swap and limit order state.
 * UI-only state (modals, expansion) remains in components.
 */

import { create } from 'zustand';
import type { Token } from '@/lib/frontend/types/tokens';
import type { RouterRoute } from '@/lib/backend/routers/types';

// ===== State Interface =====

export interface SwapState {
  // ===== Core Swap State =====
  
  // Mode
  activeTab: 'swap' | 'limit';
  
  // Token selection
  fromToken: Token | null;
  toToken: Token | null;
  
  // Amounts
  fromAmount: string;        // User input (editable)
  toAmount: string;         // Quote result (read-only, derived from quote)
  
  // Limit order specific
  limitPrice: string;
  expires: 'never' | '24h' | '7d' | 'custom';
  
  // Quote state (server-derived, will migrate to TanStack Query later)
  isQuoteLoading: boolean;
  quoteError: Error | null;
  route: RouterRoute | null;  // Full route response (includes USD values, fees, etc.)
  
  // ===== Actions =====
  
  // Tab actions
  setActiveTab: (tab: 'swap' | 'limit') => void;
  
  // Token actions
  setFromToken: (token: Token | null) => void;
  setToToken: (token: Token | null) => void;
  swapTokens: () => void;  // Swap fromToken <-> toToken
  
  // Amount actions
  setFromAmount: (amount: string) => void;
  setToAmount: (amount: string) => void;  // For quote updates
  setMaxAmount: () => void;  // Set fromAmount to max balance (TODO: implement balance fetching)
  
  // Limit order actions
  setLimitPrice: (price: string) => void;
  setExpires: (expires: 'never' | '24h' | '7d' | 'custom') => void;
  
  // Quote actions
  setQuoteLoading: (loading: boolean) => void;
  setQuoteError: (error: Error | null) => void;
  setRoute: (route: RouterRoute | null) => void;  // Store full route response
  
  // Reset actions
  resetSwap: () => void;  // Reset to initial state
  resetAmounts: () => void;  // Reset only amounts
}

// ===== Initial State =====

const initialState = {
  activeTab: 'swap' as const,
  fromToken: null as Token | null,
  toToken: null as Token | null,
  fromAmount: '',
  toAmount: '',
  limitPrice: '',
  expires: 'never' as const,
  isQuoteLoading: false,
  quoteError: null as Error | null,
  route: null as RouterRoute | null,
};

// ===== Store Creation =====

export const useSwapStore = create<SwapState>((set) => ({
  // Initial state
  ...initialState,
  
  // ===== Tab Actions =====
  
  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },
  
  // ===== Token Actions =====
  
  setFromToken: (token) => {
    set({ fromToken: token });
    // TODO: When token changes, trigger quote refetch if fromAmount exists
  },
  
  setToToken: (token) => {
    set({ toToken: token });
    // TODO: When token changes, trigger quote refetch if fromAmount exists
  },
  
  swapTokens: () => {
    set((state) => ({
      fromToken: state.toToken,
      toToken: state.fromToken,
      // Swap amounts too
      fromAmount: state.toAmount,
      toAmount: state.fromAmount,
    }));
  },
  
  // ===== Amount Actions =====
  
  setFromAmount: (amount) => {
    set({ fromAmount: amount });
    // Quote will be updated by useSwapQuote hook watching fromAmount
  },
  
  setToAmount: (amount) => {
    set({ toAmount: amount });
  },
  
  setMaxAmount: () => {
    // TODO: Implement max amount logic
    // This will need to fetch balance from wallet/API
    // For now, placeholder
    console.log('Max amount clicked - TODO: implement balance fetching');
  },
  
  // ===== Limit Order Actions =====
  
  setLimitPrice: (price) => {
    set({ limitPrice: price });
  },
  
  setExpires: (expires) => {
    set({ expires });
  },
  
  // ===== Quote Actions =====
  
  setQuoteLoading: (loading) => {
    set({ isQuoteLoading: loading });
  },
  
  setQuoteError: (error) => {
    set({ quoteError: error, route: null }); // Clear route on error
  },

  setRoute: (route) => {
    set({ route });
  },
  
  // ===== Reset Actions =====
  
  resetSwap: () => {
    set(initialState);
  },
  
  resetAmounts: () => {
    set({
      fromAmount: '',
      toAmount: '',
      limitPrice: '',
      route: null, // Clear route when resetting amounts
    });
  },
}));

