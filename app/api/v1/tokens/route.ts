/**
 * Tokens API Route
 * 
 * Single entry point for token fetching.
 * Supports both GET (query params) and POST (JSON body) requests.
 * 
 * Phase 1.0: Returns mocked data via TokenService
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokenService } from '@/lib/backend/services/token-service';
import type { TokensAPIResponse } from '@/lib/shared/types/api';

// ============================================================================
// Request Types
// ============================================================================

interface TokenRequestQuery {
  chains?: string;            // Single chain ID or comma-separated chain IDs (GET query param)
  query?: string;             // Search query (GET query param)
  limit?: string;             // Result limit (GET query param)
  address?: string;           // Token contract address (GET query param) - for specific token lookup
  category?: string;          // Token category: 'hot', 'new', 'gainers', 'losers' (GET query param)
}

interface TokenRequestBody {
  chainIds?: number[];        // Array of chain IDs (POST body)
  query?: string;             // Search term (POST body, Relay-style)
  limit?: number;             // Result limit (POST body)
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    
    // Parse query parameters
    const chainsParam = searchParams.get('chains');
    const query = searchParams.get('query') || '';
    const limitParam = searchParams.get('limit');
    const addressParam = searchParams.get('address'); // Token contract address
    const categoryParam = searchParams.get('category'); // Token category
    
    // Parse chain IDs from 'chains' parameter
    // Supports both numeric IDs (1, 56) and string IDs (solana-mainnet-beta, cosmoshub-4)
    let chainIds: number[] | undefined;
    if (chainsParam) {
      // Handle both single value and comma-separated values
      const chainValues = chainsParam.split(',').map(id => id.trim());
      
      // Resolve each chain identifier to canonical chain ID
      const { resolveChain, isChainSupported } = await import('@/lib/backend/registry/chain-resolver');
      const { getCanonicalChainByProviderId } = await import('@/lib/backend/registry/chains');
      
      const resolvedChainIds: number[] = [];
      
      for (const chainIdentifier of chainValues) {
        // Try parsing as number first (canonical ID or LiFi chain ID)
        const numericId = parseInt(chainIdentifier, 10);
        if (!isNaN(numericId)) {
          // Check if chain is supported (static registry or priority list)
          if (isChainSupported(numericId)) {
            // Resolve to canonical chain (handles both static and dynamic chains)
            const chain = await resolveChain(numericId);
            if (chain) {
              resolvedChainIds.push(chain.id);
              continue;
            }
          }
        }
        
        // If not a valid numeric ID, try looking up by provider-specific string ID
        // This supports future Cosmos chains like 'solana-mainnet-beta', 'cosmoshub-4'
        const providers: Array<'squid' | 'dexscreener'> = ['squid', 'dexscreener'];
        for (const provider of providers) {
          const chain = getCanonicalChainByProviderId(provider, chainIdentifier);
          if (chain) {
            resolvedChainIds.push(chain.id);
            break;
          }
        }
      }
      
      // If no valid chain IDs found, return user-friendly error
      if (resolvedChainIds.length === 0) {
        return NextResponse.json(
          { 
            error: `Unable to find supported chains for: ${chainValues.join(', ')}. Please check the chain IDs and try again.`,
            tokens: [],
            total: 0,
          },
          { status: 400 }
        );
      }
      
      chainIds = resolvedChainIds;
    }
    
    // Parse limit
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    
    // Validate category if provided
    const validCategories = ['hot', 'new', 'gainers', 'losers'];
    const category = categoryParam && validCategories.includes(categoryParam.toLowerCase()) 
      ? categoryParam.toLowerCase() as 'hot' | 'new' | 'gainers' | 'losers'
      : undefined;
    
    // Handle request
    return await handleTokenRequest({ chainIds, query, limit, address: addressParam || undefined, category });
  } catch (error: any) {
    console.error('[API] /api/v1/tokens GET error:', error);
    
    // Determine user-friendly error message
    const errorMessage = error?.message?.includes('not supported') 
      ? 'One or more chains are not supported'
      : error?.message?.includes('Invalid chains')
      ? error.message
      : 'Unable to load tokens. Please try again later.';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        tokens: [],
        total: 0,
      },
      { status: error?.message?.includes('not supported') || error?.message?.includes('Invalid chains') ? 400 : 500 }
    );
  }
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body: TokenRequestBody = await req.json();
    
    // Normalize query/term
    const query = body.query || '';
    // Note: address can be passed in body as well (for POST requests)
    const address = (body as any).address;
    
    return await handleTokenRequest({
      chainIds: body.chainIds,
      query,
      limit: body.limit,
      address,
    });
  } catch (error: any) {
    console.error('[API] /api/v1/tokens POST error:', error);
    
    // Determine user-friendly error message
    const errorMessage = error?.message?.includes('not supported') 
      ? 'One or more chains are not supported'
      : 'Unable to load tokens. Please try again later.';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        tokens: [],
        total: 0,
      },
      { status: error?.message?.includes('not supported') ? 400 : 500 }
    );
  }
}

// ============================================================================
// Request Handler
// ============================================================================

async function handleTokenRequest(params: {
  chainIds?: number[];
  query?: string;
  limit?: number;
  address?: string;
  category?: 'hot' | 'new' | 'gainers' | 'losers';
}): Promise<NextResponse<TokensAPIResponse>> {
  const { chainIds, query = '', limit, address, category } = params;
  const tokenService = getTokenService();
  
  // Default limit: 30 if not specified
  const effectiveLimit = limit ?? 30;
  
  let tokens: Awaited<ReturnType<typeof tokenService.getAllTokens>>;
  
  // Priority 0: If category is provided, fetch tokens by category
  if (category) {
    tokens = await tokenService.getTokensByCategory(category, effectiveLimit);
  } else if (address && address.trim()) {
  // Priority 1: If address is provided, search by address (most specific)
    // Search by address - use address as query, filter by chainIds if provided
    if (chainIds && chainIds.length > 0) {
      tokens = await tokenService.searchTokens(address.trim(), undefined, chainIds, effectiveLimit);
    } else {
      // Search across all chains
      tokens = await tokenService.searchTokens(address.trim(), undefined, undefined, effectiveLimit);
    }
    // Filter to exact address match (case-insensitive)
    tokens = tokens.filter(token => 
      token.address.toLowerCase() === address.trim().toLowerCase()
    );
  } else if (query) {
    // Priority 2: Search tokens by query
    if (chainIds && chainIds.length > 0) {
      // Search in specific chains (pass limit for multi-chain mixing)
      tokens = await tokenService.searchTokens(query, undefined, chainIds, effectiveLimit);
    } else {
      // Search across all chains
      tokens = await tokenService.searchTokens(query, undefined, undefined, effectiveLimit);
    }
  } else if (chainIds && chainIds.length > 0) {
    // Priority 3: Get tokens for specific chains
    if (chainIds.length === 1) {
      tokens = await tokenService.getTokensByChain(chainIds[0], effectiveLimit);
    } else {
      // Multiple chains - pass limit for multi-chain mixing
      tokens = await tokenService.getTokensByChains(chainIds, effectiveLimit);
    }
  } else {
    // Priority 4: Get all tokens (with limit)
    tokens = await tokenService.getAllTokens(effectiveLimit);
  }
  
  // Return response in Relay-inspired format
  const response: TokensAPIResponse = {
    tokens: tokens,
    total: tokens.length,
    chainIds: chainIds || [],
    query: query || address || "",
    limit: effectiveLimit,
  };
  
  return NextResponse.json(response);
}

