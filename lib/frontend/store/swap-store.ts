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
  toAmount: string;         // User input (editable for reverse routing) or quote result
  activeInput: 'from' | 'to' | null;  // Track which field user is editing (null = default to 'from')

  // Limit order specific
  limitPrice: string;
  expires: 'never' | '24h' | '7d' | 'custom';

  // Quote state (server-derived, will migrate to TanStack Query later)
  isQuoteLoading: boolean;
  quoteStep: string;  // Current phase of quote fetching (e.g., "Scanning DEXes...")
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
  setFromAmount: (amount: string) => void;  // Sets activeInput to 'from'
  setToAmount: (amount: string) => void;  // Sets activeInput to 'to' (when user edits)
  updateFromAmount: (amount: string) => void;  // Updates amount without changing activeInput (for quote updates)
  updateToAmount: (amount: string) => void;  // Updates amount without changing activeInput (for quote updates)
  setActiveInput: (input: 'from' | 'to' | null) => void;  // Track which field is being edited
  setMaxAmount: () => void;  // Set fromAmount to max balance (TODO: implement balance fetching)

  // Limit order actions
  setLimitPrice: (price: string) => void;
  setExpires: (expires: 'never' | '24h' | '7d' | 'custom') => void;

  // Quote actions
  setQuoteLoading: (loading: boolean) => void;
  setQuoteStep: (step: string) => void;
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
  activeInput: null as 'from' | 'to' | null,
  limitPrice: '',
  expires: 'never' as const,
  isQuoteLoading: false,
  quoteStep: '',
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
    set({
      fromToken: token,
      // Preserve amounts when switching tokens (better UX - user can compare tokens with same amount)
      // Only clear route to force new quote calculation
      route: null,
    });
  },

  setToToken: (token) => {
    set({
      toToken: token,
      // Preserve amounts when switching tokens (better UX - user can compare tokens with same amount)
      // Only clear route to force new quote calculation
      route: null,
    });
  },

  swapTokens: () => {
    set((state) => ({
      fromToken: state.toToken,
      toToken: state.fromToken,
      // Swap amounts too
      fromAmount: state.toAmount,
      toAmount: state.fromAmount,
      // Reset activeInput when swapping tokens
      activeInput: null,
    }));
  },

  // ===== Amount Actions =====

  setFromAmount: (amount) => {
    set({ fromAmount: amount, activeInput: 'from' });
    // Quote will be updated by useSwapQuote hook watching fromAmount
  },

  setToAmount: (amount) => {
    set({ toAmount: amount, activeInput: 'to' });
  },

  updateFromAmount: (amount) => {
    set({ fromAmount: amount });
    // Don't change activeInput - this is for quote updates, not user input
  },

  updateToAmount: (amount) => {
    set({ toAmount: amount });
    // Don't change activeInput - this is for quote updates, not user input
  },

  setActiveInput: (input) => {
    set({ activeInput: input });
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

  setQuoteStep: (step) => {
    set({ quoteStep: step });
  },

  setQuoteError: (error) => {
    set({ quoteError: error }); // ✅ Clear route on error (set to null, not fake object)
  },

  setRoute: (route) => {

    console.log('[SwapStore] setRoute called with:', route);
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
      activeInput: null,
      limitPrice: '',
      route: null, // Clear route when resetting amounts
    });
  },
}));

