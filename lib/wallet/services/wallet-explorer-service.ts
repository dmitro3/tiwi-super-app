/**
 * Wallet Explorer Service
 * 
 * Handles WalletConnect Explorer API integration with caching
 */

const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '8e998cd112127e42dce5e2bf74122539';
const EXPLORER_API_BASE = 'https://explorer-api.walletconnect.com/v3';

export interface WalletConnectWallet {
  id: string;
  name: string;
  homepage: string;
  image_id: string;
  app: {
    browser?: string;
    ios?: string;
    android?: string;
    desktop?: string;
  };
  chains?: string[];
  desktop?: {
    native?: string;
    universal?: string;
  };
  mobile?: {
    native?: string;
    universal?: string;
  };
}

interface WalletListingsResponse {
  listings: Record<string, WalletConnectWallet>;
  count: number;
}

// Cache for wallet listings
let walletListingsCache: Record<string, WalletConnectWallet> | null = null;
let walletListingsCacheTime: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// Cache for search results
const searchResultsCache = new Map<string, { wallets: WalletConnectWallet[]; timestamp: number }>();
const SEARCH_CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

/**
 * Fetch all wallet listings from WalletConnect Explorer API
 */
async function fetchWalletListings(): Promise<Record<string, WalletConnectWallet>> {
  // Return cached data if still valid
  const now = Date.now();
  if (walletListingsCache && (now - walletListingsCacheTime) < CACHE_DURATION) {
    return walletListingsCache;
  }

  try {
    const response = await fetch(
      `${EXPLORER_API_BASE}/wallets?projectId=${WALLETCONNECT_PROJECT_ID}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch wallets: ${response.statusText}`);
    }
    
    const data: WalletListingsResponse = await response.json();
    walletListingsCache = data.listings || {};
    walletListingsCacheTime = now;
    
    return walletListingsCache;
  } catch (error) {
    console.error('Error fetching wallet listings:', error);
    throw error;
  }
}

/**
 * Get top N wallets by popularity (default: 10)
 */
export async function getTopWallets(count: number = 10): Promise<WalletConnectWallet[]> {
  try {
    const listings = await fetchWalletListings();
    
    // Convert to array and sort by popularity (WalletConnect API returns sorted)
    const wallets = Object.values(listings);
    
    // Return top N wallets
    return wallets.slice(0, count);
  } catch (error) {
    console.error('Error fetching top wallets:', error);
    return [];
  }
}

/**
 * Search wallets by query
 */
export async function searchWallets(query: string): Promise<WalletConnectWallet[]> {
  if (!query.trim()) {
    return [];
  }

  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  const cached = searchResultsCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < SEARCH_CACHE_DURATION) {
    return cached.wallets;
  }

  try {
    const listings = await fetchWalletListings();
    const queryLower = query.toLowerCase().trim();
    
    // Filter wallets by name match
    const matchingWallets = Object.values(listings).filter(wallet => {
      const name = (wallet.name || '').toLowerCase();
      return name.includes(queryLower);
    });
    
    // Cache results
    searchResultsCache.set(cacheKey, {
      wallets: matchingWallets,
      timestamp: now,
    });
    
    return matchingWallets;
  } catch (error) {
    console.error('Error searching wallets:', error);
    throw error;
  }
}

/**
 * Get wallet icon URL from WalletConnect Explorer API
 */
export function getWalletIconUrl(imageId: string, size: 'sm' | 'md' | 'lg' = 'md'): string {
  // Validate imageId before constructing URL
  if (!imageId || typeof imageId !== 'string' || imageId.trim() === '') {
    throw new Error('Invalid imageId: imageId must be a non-empty string');
  }
  
  return `${EXPLORER_API_BASE}/logo/${size}/${imageId}?projectId=${WALLETCONNECT_PROJECT_ID}`;
}

/**
 * Clear all caches
 */
export function clearWalletExplorerCache(): void {
  walletListingsCache = null;
  walletListingsCacheTime = 0;
  searchResultsCache.clear();
}

