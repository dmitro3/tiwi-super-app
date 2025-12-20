/**
 * Chains API Route
 * 
 * Endpoint for fetching supported chains.
 * Aggregates chains from multiple providers (LiFi, Relay, DexScreener, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getChainService } from '@/lib/backend/services/chain-service';
import type { ChainsAPIResponse } from '@/lib/shared/types/api';

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const chainService = getChainService();
    
    // Optional query parameters
    const provider = searchParams.get('provider') as 'lifi' | 'dexscreener' | 'relay' | null;
    const type = searchParams.get('type') as 'EVM' | 'Solana' | 'Cosmos' | 'CosmosAppChain' | 'Sui' | 'TON' | 'Bitcoin' | null;
    
    let chains;
    
    // Filter by provider if specified
    if (provider) {
      chains = await chainService.getChainsByProvider(provider);
    } 
    // Filter by type if specified
    else if (type) {
      chains = await chainService.getChainsByType(type);
    }
    // Get all chains
    else {
      chains = await chainService.getAllChains();
    }
    
    // Return response
    const response: ChainsAPIResponse = {
      chains: chains,
      total: chains.length,
    };
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API] /api/v1/chains GET error:', error);
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to fetch chains', 
        chains: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}

