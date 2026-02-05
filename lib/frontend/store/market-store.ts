"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Token } from '@/lib/frontend/types/tokens';

interface MarketDetail extends Token {
    orderbookLiquidity?: number;
    lastUpdated: number;
}

interface MarketState {
    // Rich data cache for individual pairs
    enrichedDetails: Record<string, MarketDetail>;

    // Actions
    setMarketDetail: (symbol: string, detail: Partial<MarketDetail>) => void;
    getMarketDetail: (symbol: string) => MarketDetail | null;
    clearCache: () => void;
}

export const useMarketStore = create<MarketState>()(
    persist(
        (set, get) => ({
            enrichedDetails: {},

            setMarketDetail: (symbol, detail) => {
                const key = symbol.toUpperCase();
                set((state) => ({
                    enrichedDetails: {
                        ...state.enrichedDetails,
                        [key]: {
                            ...(state.enrichedDetails[key] || {
                                id: key,
                                symbol: key,
                                name: key,
                                address: '',
                                logo: '',
                                chain: 'dydx',
                                decimals: 8,
                            }),
                            ...detail,
                            lastUpdated: Date.now(),
                        } as MarketDetail,
                    },
                }));
            },

            getMarketDetail: (symbol) => {
                const key = symbol.toUpperCase();
                const detail = get().enrichedDetails[key];
                // Expire after 5 minutes
                if (detail && Date.now() - detail.lastUpdated > 300000) {
                    return null;
                }
                return detail || null;
            },

            clearCache: () => set({ enrichedDetails: {} }),
        }),
        {
            name: 'tiwi-market-cache',
            partialize: (state) => ({ enrichedDetails: state.enrichedDetails }),
        }
    )
);
