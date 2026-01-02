/**
 * Market Data Provider
 * 
 * Fetches NFT market data (floor price, volume, owners) from Reservoir API.
 * Reservoir provides multi-marketplace data (OpenSea, LooksRare, X2Y2, etc.)
 * 
 * Documentation: https://docs.reservoir.tools/
 */

// ============================================================================
// Configuration
// ============================================================================

const RESERVOIR_BASE_URL = 'https://api.reservoir.tools';

// ============================================================================
// Chain Name Mapping
// ============================================================================

/**
 * Map canonical chain IDs to Reservoir chain names
 */
function getReservoirChainName(chainId: number): string | null {
  const chainMap: Record<number, string> = {
    1: 'ethereum',
    137: 'polygon',
    56: 'bsc',
    42161: 'arbitrum',
    43114: 'avalanche',
    8453: 'base',
    10: 'optimism',
    250: 'fantom',
    100: 'gnosis',
  };
  return chainMap[chainId] || null;
}

// ============================================================================
// Types
// ============================================================================

export interface ReservoirCollectionStats {
  id: string;
  name: string;
  slug?: string;
  image?: string;
  banner?: string;
  description?: string;
  tokenCount?: number;
  onSaleCount?: number;
  primaryContract?: string;
  floorAsk?: {
    price?: {
      amount: {
        native: string;  // In ETH (or native token)
        usd?: number;    // In USD
      };
    };
  };
  volume?: {
    '1day'?: {
      native: string;
      usd?: number;
    };
    '7day'?: {
      native: string;
      usd?: number;
    };
    '30day'?: {
      native: string;
      usd?: number;
    };
    allTime?: {
      native: string;
      usd?: number;
    };
  };
  ownerCount?: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get collection stats from Reservoir API
 * 
 * @param contractAddress - NFT contract address
 * @param chainId - Chain ID
 * @returns Collection stats or null if not found/error
 */
export async function getCollectionStats(
  contractAddress: string,
  chainId: number
): Promise<ReservoirCollectionStats | null> {
  try {
    // Map chain ID to Reservoir chain name
    const chainName = getReservoirChainName(chainId);
    if (!chainName) {
      console.warn(`[MarketData] Chain ${chainId} not supported by Reservoir`);
      return null;
    }

    // Get API key from environment (optional but recommended)
    const apiKey = process.env.RESERVOIR_API_KEY || '';

    // Build URL with chain parameter
    const url = `${RESERVOIR_BASE_URL}/collections/v5?id=${contractAddress}&includeTopBid=false`;
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    
    // Add API key if available
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    const response = await fetch(url, {
      headers,
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      // Don't throw error for 404 (collection not found on Reservoir)
      if (response.status === 404) {
        console.warn(`[MarketData] Collection ${contractAddress} not found on Reservoir`);
        return null;
      }
      throw new Error(`Reservoir API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Reservoir returns: { collections: [...] }
    const collection = data.collections?.[0];
    
    if (!collection) {
      return null;
    }

    return {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      image: collection.image,
      banner: collection.banner,
      description: collection.description,
      tokenCount: collection.tokenCount,
      onSaleCount: collection.onSaleCount,
      primaryContract: collection.primaryContract,
      floorAsk: collection.floorAsk,
      volume: collection.volume,
      ownerCount: collection.ownerCount,
    };
  } catch (error) {
    console.error('[MarketData] Error fetching collection stats:', error);
    return null;
  }
}

/**
 * Get token sale history (for activity price data)
 * 
 * @param contractAddress - NFT contract address
 * @param tokenId - Token ID
 * @param chainId - Chain ID
 * @returns Sale history or null
 */
export async function getTokenSales(
  contractAddress: string,
  tokenId: string,
  chainId: number
): Promise<Array<{
  timestamp: number;
  price: {
    native: string;
    usd?: number;
  };
  transactionHash: string;
}> | null> {
  try {
    const chainName = getReservoirChainName(chainId);
    if (!chainName) {
      return null;
    }

    const apiKey = process.env.RESERVOIR_API_KEY || '';
    const url = `${RESERVOIR_BASE_URL}/sales/v4?token=${contractAddress}:${tokenId}&limit=10`;
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    const response = await fetch(url, {
      headers,
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.sales?.map((sale: any) => ({
      timestamp: sale.timestamp,
      price: sale.price,
      transactionHash: sale.txHash,
    })) || null;
  } catch (error) {
    console.error('[MarketData] Error fetching token sales:', error);
    return null;
  }
}


