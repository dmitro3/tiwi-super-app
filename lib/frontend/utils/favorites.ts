/**
 * Favorites Utilities
 * 
 * Manages favorite tokens using localStorage
 */

const FAVORITES_STORAGE_KEY = 'tiwi_favorite_tokens';

/**
 * Get favorite token IDs from localStorage
 */
export function getFavoriteTokenIds(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

/**
 * Add a token to favorites
 */
export function addFavoriteTokenId(tokenId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const favorites = getFavoriteTokenIds();
    if (!favorites.includes(tokenId)) {
      favorites.push(tokenId);
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    }
  } catch (error) {
    console.error('[Favorites] Error adding favorite:', error);
  }
}

/**
 * Remove a token from favorites
 */
export function removeFavoriteTokenId(tokenId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const favorites = getFavoriteTokenIds();
    const updated = favorites.filter(id => id !== tokenId);
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[Favorites] Error removing favorite:', error);
  }
}

/**
 * Check if a token is favorited
 */
export function isTokenFavorited(tokenId: string): boolean {
  const favorites = getFavoriteTokenIds();
  return favorites.includes(tokenId);
}

/**
 * Toggle favorite status of a token
 */
export function toggleFavoriteTokenId(tokenId: string): boolean {
  const isFavorited = isTokenFavorited(tokenId);
  if (isFavorited) {
    removeFavoriteTokenId(tokenId);
    return false;
  } else {
    addFavoriteTokenId(tokenId);
    return true;
  }
}

