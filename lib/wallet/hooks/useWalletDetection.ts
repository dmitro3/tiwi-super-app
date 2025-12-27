/**
 * Wallet Detection Hook
 * 
 * Separates installed wallets from popular wallets
 */

import { useState, useEffect, useCallback } from 'react';
import { detectWalletProviders, getAllSupportedWallets } from '../detection/detector';
import type { WalletProvider } from '../detection/types';

// Predefined list of popular wallets (deterministic order)
const POPULAR_WALLET_IDS = [
  'phantom',
  'metamask',
  'rabby',
  'base-formerly-coinbase-wallet',
  'solflare',
  'backpack',
  'trust-wallet',
  'okx-wallet',
  'brave',
  'coinbase',
] as const;

interface UseWalletDetectionReturn {
  installedWallets: WalletProvider[];
  popularWallets: WalletProvider[];
  isDetecting: boolean;
  refresh: () => void;
}

export function useWalletDetection(): UseWalletDetectionReturn {
  const [installedWallets, setInstalledWallets] = useState<WalletProvider[]>([]);
  const [popularWallets, setPopularWallets] = useState<WalletProvider[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  const detectWallets = useCallback(() => {
    setIsDetecting(true);
    
    try {
      // Get all installed wallets
      const detected = detectWalletProviders();
      setInstalledWallets(detected);
      
      // Get all supported wallets (to find popular ones)
      const allWallets = getAllSupportedWallets();
      
      // Get installed wallet IDs for filtering
      const installedIds = new Set(detected.map(w => w.id.toLowerCase()));
      
      // Filter popular wallets (exclude installed ones)
      const popular = POPULAR_WALLET_IDS
        .map(id => allWallets.find(w => w.id.toLowerCase() === id.toLowerCase()))
        .filter((wallet): wallet is WalletProvider => {
          if (!wallet) return false;
          // Exclude if already installed
          return !installedIds.has(wallet.id.toLowerCase());
        });
      
      setPopularWallets(popular);
    } catch (error) {
      console.error('Error detecting wallets:', error);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  useEffect(() => {
    // Initial detection
    detectWallets();
    
    // Delayed detection for wallets that inject late
    const delayedTimer = setTimeout(() => {
      detectWallets();
    }, 500);
    
    const longDelayedTimer = setTimeout(() => {
      detectWallets();
    }, 1000);
    
    // Listen for EIP-6963 wallet announcements
    const handleEIP6963AnnounceProvider = () => {
      setTimeout(() => {
        detectWallets();
      }, 100);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('eip6963:announceProvider', handleEIP6963AnnounceProvider);
    }
    
    return () => {
      clearTimeout(delayedTimer);
      clearTimeout(longDelayedTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('eip6963:announceProvider', handleEIP6963AnnounceProvider);
      }
    };
  }, [detectWallets]);

  return {
    installedWallets,
    popularWallets,
    isDetecting,
    refresh: detectWallets,
  };
}

