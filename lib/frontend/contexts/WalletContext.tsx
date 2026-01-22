'use client';

import { WalletAccount } from '@/lib/wallet';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';


interface WalletContextType {
    connectedWallet: WalletAccount | null;
    setConnectedWallet: (account: WalletAccount | null) => void;
    showWalletSelector: boolean;
    setShowWalletSelector: (show: boolean) => void;
    getWalletForChainType: (chainType: 'evm' | 'solana') => WalletAccount | null;
    clearWalletHistory: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_STORAGE_KEY = 'lifi_connected_wallet';
const WALLET_HISTORY_KEY = 'lifi_wallet_history';

// Wallet history structure: tracks last connected wallet per chain type
interface WalletHistory {
    evm?: WalletAccount;
    solana?: WalletAccount;
}

// Helper to load wallet from localStorage
const loadWalletFromStorage = (): WalletAccount | null => {
    if (typeof window === 'undefined') return null;

    try {
        const stored = localStorage.getItem(WALLET_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored) as WalletAccount;
        }
    } catch (error) {
        console.error('Error loading wallet from storage:', error);
    }
    return null;
};

// Helper to save wallet to localStorage
const saveWalletToStorage = (account: WalletAccount | null) => {
    if (typeof window === 'undefined') return;

    try {
        if (account) {
            localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(account));
        } else {
            localStorage.removeItem(WALLET_STORAGE_KEY);
        }
    } catch (error) {
        console.error('Error saving wallet to storage:', error);
    }
};

// Helper to load wallet history from localStorage
const loadWalletHistory = (): WalletHistory => {
    if (typeof window === 'undefined') return {};

    try {
        const stored = localStorage.getItem(WALLET_HISTORY_KEY);
        if (stored) {
            return JSON.parse(stored) as WalletHistory;
        }
    } catch (error) {
        console.error('Error loading wallet history from storage:', error);
    }
    return {};
};

// Helper to save wallet history to localStorage
const saveWalletHistory = (history: WalletHistory) => {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(WALLET_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.error('Error saving wallet history to storage:', error);
    }
};

// Helper to get chain type from wallet
const getChainType = (wallet: WalletAccount): 'evm' | 'solana' => {
    if (wallet.chain === 'solana') return 'solana';
    return 'evm';
};

// Helper to update wallet history when a wallet connects
const updateWalletHistory = (account: WalletAccount | null) => {
    if (!account) return;

    const history = loadWalletHistory();
    const chainType = getChainType(account);
    history[chainType] = account;
    saveWalletHistory(history);
};

export const WalletProvider = ({ children }: { children: ReactNode }) => {
    const [connectedWallet, setConnectedWalletState] = useState<WalletAccount | null>(null);
    const [showWalletSelector, setShowWalletSelector] = useState(false);

    // Clear wallet storage on mount/refresh
    useEffect(() => {
        // Clear localStorage on page load/refresh
        if (typeof window !== 'undefined') {
            localStorage.removeItem(WALLET_STORAGE_KEY);
            localStorage.removeItem(WALLET_HISTORY_KEY);
        }
    }, []);

    // Persist wallet state to localStorage whenever it changes (but clear on refresh)
    useEffect(() => {
        saveWalletToStorage(connectedWallet);
    }, [connectedWallet]);

    // Wrapper for setConnectedWallet that also saves to localStorage and updates history
    const setConnectedWallet = (account: WalletAccount | null) => {
        setConnectedWalletState(account);
        saveWalletToStorage(account);
        if (account) {
            updateWalletHistory(account);
        }
    };

    // Get wallet for a specific chain type from history
    const getWalletForChainType = (chainType: 'evm' | 'solana'): WalletAccount | null => {
        const history = loadWalletHistory();
        return history[chainType] || null;
    };

    // Clear wallet history (useful for testing or reset)
    const clearWalletHistory = () => {
        saveWalletHistory({});
    };

    return (
        <WalletContext.Provider value={{
            connectedWallet,
            setConnectedWallet,
            showWalletSelector,
            setShowWalletSelector,
            getWalletForChainType,
            clearWalletHistory,
        }}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};
