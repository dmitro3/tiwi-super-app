/**
 * Wallet Explorer Hook
 * 
 * Manages wallet discovery via WalletConnect API
 */

import { useState, useEffect, useCallback } from 'react';
import { getTopWallets, searchWallets, type WalletConnectWallet } from '../services/wallet-explorer-service';

interface UseWalletExplorerReturn {
  topWallets: WalletConnectWallet[];
  searchResults: WalletConnectWallet[];
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  refresh: () => Promise<void>;
}

export function useWalletExplorer(): UseWalletExplorerReturn {
  const [topWallets, setTopWallets] = useState<WalletConnectWallet[]>([]);
  const [searchResults, setSearchResults] = useState<WalletConnectWallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load top wallets on mount
  useEffect(() => {
    loadTopWallets();
  }, []);

  const loadTopWallets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const wallets = await getTopWallets(10);
      setTopWallets(wallets);
    } catch (err: any) {
      setError(err.message || 'Failed to load wallets');
      console.error('Error loading top wallets:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const search = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);
    
    try {
      const results = await searchWallets(query);
      setSearchResults(results);
    } catch (err: any) {
      setError(err.message || 'Failed to search wallets');
      console.error('Error searching wallets:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    await loadTopWallets();
    if (searchQuery) {
      await search(searchQuery);
    }
  }, [loadTopWallets, search, searchQuery]);

  return {
    topWallets,
    searchResults,
    isLoading,
    isSearching,
    error,
    search,
    clearSearch,
    refresh,
  };
}

