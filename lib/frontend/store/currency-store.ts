/**
 * Currency Preference Store (Zustand)
 * 
 * Manages user's currency preference for displaying USD values.
 * Persists to localStorage for persistence across sessions.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Supported currencies
export type Currency = 'USD' | 'EUR' | 'NGN' | 'GBP' | 'CNY' | 'JPY';

// Currency configuration
export const CURRENCIES: Record<Currency, { symbol: string; name: string }> = {
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  NGN: { symbol: '₦', name: 'Nigerian Naira' },
  GBP: { symbol: '£', name: 'British Pound' },
  CNY: { symbol: '¥', name: 'Chinese Yuan' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
};

// ===== State Interface =====

export interface CurrencyState {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

// ===== Store Creation =====

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: 'USD', // Default currency
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: 'tiwi-currency-preference', // localStorage key
    }
  )
);

