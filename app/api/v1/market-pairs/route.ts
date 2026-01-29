/**
 * Market Pairs API Route
 * 
 * Endpoint for fetching pool/pair-based market data.
 * Returns MarketTokenPair[] with both base and quote tokens.
 * 
 * Query Parameters:
 * - category: 'hot' | 'new' | 'gainers' | 'losers' (required)
 * - limit: number (optional, default: 30)
 * - network: string (optional, e.g., 'solana', 'eth' - for network-specific requests)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokenService } from '@/lib/backend/services/token-service';
import type { MarketPairsAPIResponse } from '@/lib/shared/types/api';

// ============================================================================
// Request Types
// ============================================================================

interface MarketPairsRequestQuery {
  category?: string;  // 'hot' | 'new' | 'gainers' | 'losers'
  limit?: string;     // Result limit
  network?: string;   // Network slug (e.g., 'solana', 'eth') for network-specific requests
  page?: string;      // CoinGecko page number (1-based)
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    
    // Parse query parameters
    const categoryParam = searchParams.get('category');
    const limitParam = searchParams.get('limit');
    const pageParam = searchParams.get('page');
    const networkParam = searchParams.get('network');
    
    // Validate category (required)
    const validCategories = ['hot', 'new', 'gainers', 'losers'];
    if (!categoryParam || !validCategories.includes(categoryParam.toLowerCase())) {
      return NextResponse.json(
        {
          error: `Invalid or missing category parameter. Must be one of: ${validCategories.join(', ')}`,
          pairs: [],
          total: 0,
        },
        { status: 400 }
      );
    }
    
    const category = categoryParam.toLowerCase() as 'hot' | 'new' | 'gainers' | 'losers';
    
    // Parse limit
    const limit = limitParam ? parseInt(limitParam, 10) : 30;
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          error: 'Invalid limit parameter. Must be a number between 1 and 100.',
          pairs: [],
          total: 0,
        },
        { status: 400 }
      );
    }

    // Parse page (CoinGecko page, 1-based)
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        {
          error: 'Invalid page parameter. Must be a positive integer.',
          pairs: [],
          total: 0,
        },
        { status: 400 }
      );
    }
    
    // Parse network (optional)
    const network = networkParam?.trim() || undefined;
    
    // Handle request
    return await handleMarketPairsRequest({ category, limit, network, page });
  } catch (error: any) {
    console.error('[API] /api/v1/market-pairs GET error:', error);
    
    return NextResponse.json(
      {
        error: 'Unable to load market pairs. Please try again later.',
        pairs: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Request Handler
// ============================================================================

async function handleMarketPairsRequest(params: {
  category: 'hot' | 'new' | 'gainers' | 'losers';
  limit: number;
  network?: string;
  page: number;
}): Promise<NextResponse<MarketPairsAPIResponse>> {
  const { category, limit, network, page } = params;
  const tokenService = getTokenService();
  
  try {
    // Fetch market pairs from TokenService
    const pairs = await tokenService.getMarketPairsByCategory(category, limit, network, page);
    
    // Return response
    const response: MarketPairsAPIResponse = {
      pairs,
      total: pairs.length,
      category,
      network: network || undefined,
      limit,
      page,
    };
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    console.error('[API] Error fetching market pairs:', error);
    
    // Return error response
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch market pairs',
        pairs: [],
        total: 0,
        category,
        network: network || undefined,
        limit,
      },
      { status: 500 }
    );
  }
}

