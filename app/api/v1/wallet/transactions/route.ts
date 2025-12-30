/**
 * Transaction History API Route
 * 
 * Endpoint: GET /api/v1/wallet/transactions
 * 
 * Fetches transaction history for a wallet with pagination.
 * Includes rate limiting and caching.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTransactionHistoryService } from '@/lib/backend/services/transaction-history-service';
import { getRateLimiter, RATE_LIMITS } from '@/lib/backend/utils/rate-limiter';
import type { TransactionHistoryResponse, TransactionType } from '@/lib/backend/types/wallet';

// ============================================================================
// Request Validation
// ============================================================================

function validateAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  if (address.startsWith('0x') && address.length === 42) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  
  if (address.length >= 32 && address.length <= 44) {
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

function parseTypes(typesParam: string | null): TransactionType[] | undefined {
  if (!typesParam) {
    return undefined;
  }
  
  const validTypes: TransactionType[] = ['Swap', 'Sent', 'Received', 'Stake', 'Unstake', 'Approve', 'Transfer'];
  const types = typesParam
    .split(',')
    .map(t => t.trim() as TransactionType)
    .filter(t => validTypes.includes(t));
  
  return types.length > 0 ? types : undefined;
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const address = searchParams.get('address');
    const chainIdsParam = searchParams.get('chains');
    const typesParam = searchParams.get('types');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    
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
    
    // Parse optional parameters
    const chainIds = parseChainIds(chainIdsParam);
    const types = parseTypes(typesParam);
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 100) : 20; // Max 100, default 20
    const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10)) : 0;
    
    // Rate limiting
    const rateLimiter = getRateLimiter();
    const rateLimitKey = `transactions:${address.toLowerCase()}`;
    const isAllowed = rateLimiter.isAllowed(
      rateLimitKey,
      RATE_LIMITS.TRANSACTIONS.maxRequests,
      RATE_LIMITS.TRANSACTIONS.windowMs
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
            'X-RateLimit-Limit': RATE_LIMITS.TRANSACTIONS.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime ? Math.ceil(resetTime / 1000).toString() : '',
          },
        }
      );
    }
    
    // Get transaction history
    const transactionHistoryService = getTransactionHistoryService();
    const response: TransactionHistoryResponse = await transactionHistoryService.getTransactionHistory(
      address,
      {
        chainIds,
        types,
        limit,
        offset,
      }
    );
    
    // Add rate limit headers
    const remaining = rateLimiter.getRemaining(rateLimitKey, RATE_LIMITS.TRANSACTIONS.maxRequests);
    const resetTime = rateLimiter.getResetTime(rateLimitKey);
    
    return NextResponse.json(response, {
      headers: {
        'X-RateLimit-Limit': RATE_LIMITS.TRANSACTIONS.maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime ? Math.ceil(resetTime / 1000).toString() : '',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('[API] /api/v1/wallet/transactions GET error:', error);
    
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch transaction history',
        address: null,
        transactions: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

