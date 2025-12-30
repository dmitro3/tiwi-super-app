/**
 * Wallet Balances API Route
 * 
 * Endpoint: GET /api/v1/wallet/balances
 * 
 * Fetches wallet token balances across multiple chains with USD values.
 * Includes rate limiting and caching.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletBalanceService } from '@/lib/backend/services/wallet-balance-service';
import { getRateLimiter, RATE_LIMITS } from '@/lib/backend/utils/rate-limiter';
import type { WalletBalanceResponse } from '@/lib/backend/types/wallet';

// ============================================================================
// Request Validation
// ============================================================================

function validateAddress(address: string): boolean {
  // Basic validation: check if it's a valid Ethereum or Solana address format
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // Ethereum address: 0x followed by 40 hex characters
  if (address.startsWith('0x') && address.length === 42) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  
  // Solana address: Base58 encoded, typically 32-44 characters
  if (address.length >= 32 && address.length <= 44) {
    // Basic check - Solana addresses are base58 encoded
    return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
  }
  
  return false;
}

function parseChainIds(chainIdsParam: string | null): number[] | undefined {
  if (!chainIdsParam) {
    return undefined;
  }
  
  const chainIds = chainIdsParam
    .split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id) && id > 0);
  
  return chainIds.length > 0 ? chainIds : undefined;
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const address = searchParams.get('address');
    const chainIdsParam = searchParams.get('chains');
    
    // Validate address
    if (!address) {
      return NextResponse.json(
        { error: 'Missing required parameter: address' },
        { status: 400 }
      );
    }
    
    if (!validateAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }
    
    // Parse chain IDs
    const chainIds = parseChainIds(chainIdsParam);
    
    // Rate limiting
    const rateLimiter = getRateLimiter();
    const rateLimitKey = `balance:${address.toLowerCase()}`;
    const isAllowed = rateLimiter.isAllowed(
      rateLimitKey,
      RATE_LIMITS.BALANCE.maxRequests,
      RATE_LIMITS.BALANCE.windowMs
    );
    
    if (!isAllowed) {
      const resetTime = rateLimiter.getResetTime(rateLimitKey);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60,
        },
        {
          status: 429,
          headers: {
            'Retry-After': resetTime ? Math.ceil((resetTime - Date.now()) / 1000).toString() : '60',
            'X-RateLimit-Limit': RATE_LIMITS.BALANCE.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime ? Math.ceil(resetTime / 1000).toString() : '',
          },
        }
      );
    }
    
    // Get wallet balances
    const walletBalanceService = getWalletBalanceService();
    const response: WalletBalanceResponse = await walletBalanceService.getWalletBalances(
      address,
      chainIds
    );
    
    // Add rate limit headers
    const remaining = rateLimiter.getRemaining(rateLimitKey, RATE_LIMITS.BALANCE.maxRequests);
    const resetTime = rateLimiter.getResetTime(rateLimitKey);
    
    return NextResponse.json(response, {
      headers: {
        'X-RateLimit-Limit': RATE_LIMITS.BALANCE.maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime ? Math.ceil(resetTime / 1000).toString() : '',
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    console.error('[API] /api/v1/wallet/balances GET error:', error);
    
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch wallet balances',
        address: null,
        balances: [],
        totalUSD: '0.00',
        chains: [],
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

