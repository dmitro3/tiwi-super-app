/**
 * Route API Endpoint
 * 
 * Single entry point for swap route fetching.
 * Supports both GET (query params) and POST (JSON body) requests.
 * 
 * Returns the best route for a token swap, with alternatives if available.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRouteService } from '@/lib/backend/services/route-service';
import type { RouteRequest, RouteResponse } from '@/lib/backend/routers/types';

// Vercel Serverless Function Config
export const maxDuration = 60; // 60 seconds (Pro plan limit)
// ============================================================================
// Request Types
// ============================================================================

interface RouteRequestQuery {
  fromChainId: string;          // Canonical chain ID
  fromToken: string;             // Token address
  toChainId: string;             // Canonical chain ID
  toToken: string;               // Token address
  fromAmount: string;            // Human-readable amount
  slippage?: string;             // Slippage tolerance (0-100)
  slippageMode?: 'fixed' | 'auto'; // Slippage mode
  recipient?: string;             // Recipient address (optional)
  order?: 'RECOMMENDED' | 'FASTEST' | 'CHEAPEST'; // Route preference
  liquidityUSD?: string;          // Token pair liquidity in USD (from frontend)
}

interface RouteRequestBody {
  fromToken: {
    chainId: number;
    address: string;
    symbol?: string;
    decimals?: number | undefined;  // undefined means unknown, will be fetched
  };
  toToken: {
    chainId: number;
    address: string;
    symbol?: string;
    decimals?: number | undefined;  // undefined means unknown, will be fetched
  };
  fromAmount?: string;  // For normal routing (fromAmount → toAmount)
  toAmount?: string;    // For reverse routing (toAmount → fromAmount)
  slippage?: number;
  slippageMode?: 'fixed' | 'auto';
  recipient?: string;
  fromAddress?: string;                // User's wallet address (optional, for LiFi getQuote)
  order?: 'RECOMMENDED' | 'FASTEST' | 'CHEAPEST';
  liquidityUSD?: number;                // Token pair liquidity in USD (from frontend)
}

// ============================================================================
// Response Types
// ============================================================================

interface RouteAPIResponse {
  route: RouteResponse['route'];
  alternatives?: RouteResponse['alternatives'];
  timestamp: number;
  expiresAt: number;
  error?: string;
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    // Parse required parameters
    const fromChainId = searchParams.get('fromChainId');
    const fromToken = searchParams.get('fromToken');
    const toChainId = searchParams.get('toChainId');
    const toToken = searchParams.get('toToken');
    const fromAmount = searchParams.get('fromAmount');

    // Validate required parameters
    if (!fromChainId || !fromToken || !toChainId || !toToken || !fromAmount) {
      return NextResponse.json(
        {
          error: 'Missing required parameters: fromChainId, fromToken, toChainId, toToken, fromAmount',
        },
        { status: 400 }
      );
    }

    // Parse optional parameters
    const slippage = searchParams.get('slippage');
    const slippageMode = searchParams.get('slippageMode') as 'fixed' | 'auto' | null;
    const recipient = searchParams.get('recipient');
    const fromAddress = searchParams.get('fromAddress'); // User's wallet address (for LiFi getQuote)
    const order = searchParams.get('order') as 'RECOMMENDED' | 'FASTEST' | 'CHEAPEST' | null;
    const liquidityUSD = searchParams.get('liquidityUSD');

    // Build route request
    const routeRequest: RouteRequest = {
      fromToken: {
        chainId: parseInt(fromChainId, 10),
        address: fromToken,
        decimals: undefined, // Will be fetched if not provided
      },
      toToken: {
        chainId: parseInt(toChainId, 10),
        address: toToken,
        decimals: undefined, // Will be fetched if not provided
      },
      fromAmount,
      slippage: slippage ? parseFloat(slippage) : undefined,
      slippageMode: slippageMode || 'fixed',
      recipient: recipient || undefined,
      fromAddress: fromAddress || undefined, // Pass fromAddress if provided
      order: order || 'RECOMMENDED',
      liquidityUSD: liquidityUSD ? parseFloat(liquidityUSD) : undefined, // Pass liquidity from query params (if provided)
    };

    // Validate chain IDs
    if (isNaN(routeRequest.fromToken.chainId) || isNaN(routeRequest.toToken.chainId)) {
      return NextResponse.json(
        {
          error: 'Invalid chain IDs: must be valid numbers',
        },
        { status: 400 }
      );
    }

    // Handle request
    return await handleRouteRequest(routeRequest);
  } catch (error: any) {
    console.error('[API] /api/v1/route GET error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch route',
      },
      { status: error?.message?.includes('Missing') || error?.message?.includes('Invalid') ? 400 : 500 }
    );
  }
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body: RouteRequestBody = await req.json();
    console.log("🚀 ~ POST ~ body:check", body)

    // Validate required fields
    if (!body.fromToken || !body.toToken) {
      return NextResponse.json(
        {
          error: 'Missing required fields: fromToken, toToken',
        },
        { status: 400 }
      );
    }

    // Validate that exactly one of fromAmount or toAmount is provided
    if (!body.fromAmount && !body.toAmount) {
      return NextResponse.json(
        {
          error: 'Either fromAmount or toAmount must be provided',
        },
        { status: 400 }
      );
    }

    if (body.fromAmount && body.toAmount) {
      return NextResponse.json(
        {
          error: 'Cannot provide both fromAmount and toAmount. Provide exactly one.',
        },
        { status: 400 }
      );
    }

    if (!body.fromToken.chainId || !body.fromToken.address) {
      return NextResponse.json(
        {
          error: 'Invalid fromToken: chainId and address are required',
        },
        { status: 400 }
      );
    }

    if (!body.toToken.chainId || !body.toToken.address) {
      return NextResponse.json(
        {
          error: 'Invalid toToken: chainId and address are required',
        },
        { status: 400 }
      );
    }

    // Build route request
    // Decimals can be undefined (will be fetched from blockchain if needed)
    const routeRequest: RouteRequest = {
      fromToken: {
        chainId: body.fromToken.chainId,
        address: body.fromToken.address,
        symbol: body.fromToken.symbol,
        decimals: body.fromToken.decimals, // Required: from token data
      },
      toToken: {
        chainId: body.toToken.chainId,
        address: body.toToken.address,
        symbol: body.toToken.symbol,
        decimals: body.toToken.decimals, // Required: from token data
      },
      fromAmount: body.fromAmount,
      toAmount: body.toAmount,  // For reverse routing
      slippage: body.slippage,
      slippageMode: body.slippageMode || 'fixed',
      recipient: body.recipient,
      fromAddress: body.fromAddress, // User's wallet address (for LiFi getQuote)
      order: body.order || 'RECOMMENDED',
      liquidityUSD: body.liquidityUSD, // Pass liquidity from frontend
    };

    // Handle request
    return await handleRouteRequest(routeRequest);
  } catch (error: any) {
    console.error('[API] /api/v1/route POST error:', error);

    // Handle JSON parse errors
    if (error instanceof SyntaxError || error.message?.includes('JSON')) {
      return NextResponse.json(
        {
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch route',
      },
      { status: error?.message?.includes('Missing') || error?.message?.includes('Invalid') ? 400 : 500 }
    );
  }
}

// ============================================================================
// Request Handler
// ============================================================================

async function handleRouteRequest(
  routeRequest: RouteRequest
): Promise<NextResponse<RouteAPIResponse>> {
  try {
    const routeService = getRouteService();

    // Get route from service
    const routeResponse: RouteResponse = await routeService.getRoute(routeRequest);

    // Build API response
    const apiResponse: RouteAPIResponse = {
      route: routeResponse.route,
      alternatives: routeResponse.alternatives,
      timestamp: routeResponse.timestamp,
      expiresAt: routeResponse.expiresAt,
    };

    return NextResponse.json(apiResponse);
  } catch (error: any) {
    console.error('[API] Route service error:', error);

    // Determine error status code
    let statusCode = 500;
    if (error?.message?.includes('No route found') || error?.message?.includes('No routers support')) {
      statusCode = 404;
    } else if (error?.message?.includes('Missing') || error?.message?.includes('Invalid')) {
      statusCode = 400;
    }

    // Return error response
    // IMPORTANT: Don't return empty route object - return null or omit route field
    // Frontend checks for route.router, so empty object passes validation incorrectly
    const errorResponse: RouteAPIResponse = {
      route: null as any, // Explicitly null to fail validation
      timestamp: Date.now(),
      expiresAt: Date.now(),
      error: error?.message || 'Failed to fetch route',
    };

    return NextResponse.json(errorResponse, { status: statusCode });
  }
}

