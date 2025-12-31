/**
 * User Settings Store (Zustand)
 * 
 * Manages user preferences for swap settings like slippage tolerance.
 * Persists to localStorage for persistence across sessions.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ===== State Interface =====

export interface SettingsState {
  slippageMode: 'auto' | 'fixed';
  slippageTolerance: number; // Percentage (0-100), only used when mode is 'fixed'
  setSlippageMode: (mode: 'auto' | 'fixed') => void;
  setSlippageTolerance: (tolerance: number) => void;
}

// ===== Store Creation =====

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      slippageMode: 'fixed', // Default to fixed
      slippageTolerance: 0.5, // Default 0.5%
      setSlippageMode: (mode) => set({ slippageMode: mode }),
      setSlippageTolerance: (tolerance) => set({ 
        slippageTolerance: Math.max(0, Math.min(100, tolerance)) // Clamp between 0-100
      }),
    }),
    {
      name: 'tiwi-settings', // localStorage key
    }
  )
);

