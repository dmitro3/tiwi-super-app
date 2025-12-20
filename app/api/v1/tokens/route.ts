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
    
    // Parse query parameters - only 'chains' parameter
    const chainsParam = searchParams.get('chains');
    const query = searchParams.get('query') || '';
    const limitParam = searchParams.get('limit');
    
    // Parse chain IDs from 'chains' parameter
    // Supports both numeric IDs (1, 56) and string IDs (solana-mainnet-beta, cosmoshub-4)
    let chainIds: number[] | undefined;
    if (chainsParam) {
      // Handle both single value and comma-separated values
      const chainValues = chainsParam.split(',').map(id => id.trim());
      
      // Resolve each chain identifier to canonical chain ID
      const { getCanonicalChain, getCanonicalChainByProviderId } = await import('@/lib/backend/registry/chains');
      
      chainIds = chainValues
        .map(chainIdentifier => {
          // Try parsing as number first (canonical ID)
          const numericId = parseInt(chainIdentifier, 10);
          if (!isNaN(numericId)) {
            // Check if it's a valid canonical chain ID
            const chain = getCanonicalChain(numericId);
            if (chain) return numericId;
          }
          
          // If not a valid numeric ID, try looking up by provider-specific string ID
          // This supports future Cosmos chains like 'solana-mainnet-beta', 'cosmoshub-4'
          // Try common providers that use string IDs
          const providers: Array<'squid' | 'dexscreener'> = ['squid', 'dexscreener'];
          for (const provider of providers) {
            const chain = getCanonicalChainByProviderId(provider, chainIdentifier);
            if (chain) return chain.id;
          }
          
          return null;
        })
        .filter((id): id is number => id !== null);
      
      // If no valid chain IDs found, return error
      if (chainIds.length === 0) {
        return NextResponse.json(
          { 
            error: 'Invalid chains parameter. Must be valid chain IDs (numbers) or chain identifiers (strings like "solana-mainnet-beta").',
            tokens: [],
            total: 0,
          },
          { status: 400 }
        );
      }
    }
    
    // Parse limit
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    
    // Handle request
    return await handleTokenRequest({ chainIds, query, limit });
  } catch (error: any) {
    console.error('[API] /api/v1/tokens GET error:', error);
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to fetch tokens', 
        tokens: [],
        total: 0,
      },
      { status: error?.message?.includes('not supported') ? 400 : 500 }
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
    
    return await handleTokenRequest({
      chainIds: body.chainIds,
        query,
      limit: body.limit,
    });
  } catch (error: any) {
    console.error('[API] /api/v1/tokens POST error:', error);
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to fetch tokens', 
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
}): Promise<NextResponse<TokensAPIResponse>> {
  const { chainIds, query = '', limit } = params;
  const tokenService = getTokenService();
  
  // Default limit: 30 if not specified
  const effectiveLimit = limit ?? 30;
  
  let tokens: Awaited<ReturnType<typeof tokenService.getAllTokens>>;
  
  // Determine which method to call
  if (query) {
    // Search tokens
    if (chainIds && chainIds.length > 0) {
      // Search in specific chains (pass limit for multi-chain mixing)
      tokens = await tokenService.searchTokens(query, undefined, chainIds, effectiveLimit);
    } else {
      // Search across all chains
      tokens = await tokenService.searchTokens(query, undefined, undefined, effectiveLimit);
    }
  } else if (chainIds && chainIds.length > 0) {
    // Get tokens for specific chains
    if (chainIds.length === 1) {
      tokens = await tokenService.getTokensByChain(chainIds[0], effectiveLimit);
    } else {
      // Multiple chains - pass limit for multi-chain mixing
      tokens = await tokenService.getTokensByChains(chainIds, effectiveLimit);
    }
  } else {
    // Get all tokens (with limit)
    tokens = await tokenService.getAllTokens(effectiveLimit);
  }
  
  // Return response in Relay-inspired format
  const response: TokensAPIResponse = {
    tokens: tokens,
    total: tokens.length,
    chainIds: chainIds || [],
    query: query || "",
    limit: effectiveLimit,
  };
  
  return NextResponse.json(response);
}

