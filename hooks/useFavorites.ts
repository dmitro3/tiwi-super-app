/**
 * useFavorites Hook
 * 
 * Manages favorite tokens with reactive state
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getFavoriteTokenIds,
  addFavoriteTokenId,
  removeFavoriteTokenId,
  toggleFavoriteTokenId,
} from '@/lib/frontend/utils/favorites';

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // Load favorites on mount
  useEffect(() => {
    setFavoriteIds(getFavoriteTokenIds());
  }, []);

  // Listen for storage changes (for cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tiwi_favorite_tokens') {
        setFavoriteIds(getFavoriteTokenIds());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addFavorite = useCallback((tokenId: string) => {
    addFavoriteTokenId(tokenId);
    setFavoriteIds(getFavoriteTokenIds());
  }, []);

  const removeFavorite = useCallback((tokenId: string) => {
    removeFavoriteTokenId(tokenId);
    setFavoriteIds(getFavoriteTokenIds());
  }, []);

  const toggleFavorite = useCallback((tokenId: string) => {
    toggleFavoriteTokenId(tokenId);
    setFavoriteIds(getFavoriteTokenIds());
  }, []);

  const isFavorited = useCallback((tokenId: string) => {
    return favoriteIds.includes(tokenId);
  }, [favoriteIds]);

  return {
    favoriteIds,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorited,
  };
}

