import { NextRequest, NextResponse } from 'next/server';
import { getChartDataService } from '@/lib/backend/services/chart-data-service';
import { getTokenService } from '@/lib/backend/services/token-service';
import { getTokenPrice } from '@/lib/backend/providers/price-provider';
import { convertPairToWrapped } from '@/lib/backend/utils/token-address-helper';
import { getCanonicalChain } from '@/lib/backend/registry/chains';

/**
 * GET /api/v1/market/[pair]/price
 * 
 * Returns the current price and 24h stats for a trading pair.
 * This ensures the header price matches the chart's current price.
 * 
 * Query params:
 * - chainId: Optional chain ID (defaults to 56 for BNB Chain)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  try {
    const { pair } = await params;
    const searchParams = req.nextUrl.searchParams;
    const chainIdParam = searchParams.get('chainId');
    
    // Parse pair (e.g., "WBNB-USDT" or "WBNB/USDT")
    const normalized = pair.replace("/", "-").replace("_", "-").toUpperCase();
    const parts = normalized.split("-");
    
    if (parts.length < 2) {
      return NextResponse.json(
        { error: 'Invalid pair format. Expected: BASE-QUOTE (e.g., WBNB-USDT)' },
        { status: 400 }
      );
    }
    
    const [baseSymbol, quoteSymbol] = parts;
    
    // Default to BNB Chain (56) if not specified
    const chainId = chainIdParam ? parseInt(chainIdParam, 10) : 56;
    
    if (isNaN(chainId)) {
      return NextResponse.json(
        { error: 'Invalid chainId' },
        { status: 400 }
      );
    }
    
    // Fetch tokens by symbol
    const tokenService = getTokenService();
    const baseTokens = await tokenService.searchTokens(baseSymbol, undefined, [chainId], 5);
    const quoteTokens = await tokenService.searchTokens(quoteSymbol, undefined, [chainId], 5);
    
    // Find exact symbol match
    const baseToken = baseTokens.find(t => t.symbol.toUpperCase() === baseSymbol.toUpperCase());
    const quoteToken = quoteTokens.find(t => t.symbol.toUpperCase() === quoteSymbol.toUpperCase());
    
    if (!baseToken || !quoteToken) {
      return NextResponse.json(
        { error: `Token not found: ${baseSymbol} or ${quoteSymbol} on chain ${chainId}` },
        { status: 404 }
      );
    }
    
    // Convert native tokens to wrapped
    const { baseToken: baseAddress } = convertPairToWrapped(
      baseToken.address,
      '0x0000000000000000000000000000000000000000',
      chainId
    );
    const { baseToken: quoteAddress } = convertPairToWrapped(
      quoteToken.address,
      '0x0000000000000000000000000000000000000000',
      chainId
    );
    
    // Get current prices
    const basePrice = await getTokenPrice(baseAddress, chainId, baseToken.symbol);
    const quotePrice = await getTokenPrice(quoteAddress, chainId, quoteToken.symbol);
    
    if (!basePrice || !quotePrice) {
      return NextResponse.json(
        { error: 'Price data unavailable' },
        { status: 503 }
      );
    }
    
    // Get 24h stats from chart data FIRST (this ensures price matches chart)
    const chartService = getChartDataService();
    const now = Math.floor(Date.now() / 1000);
    const yesterday = now - 24 * 60 * 60;
    
    // Fetch last 24h of 15-minute bars
    const bars = await chartService.getHistoricalBars({
      baseToken: baseAddress,
      quoteToken: quoteAddress,
      chainId,
      baseChainId: chainId,
      quoteChainId: chainId,
      resolution: '15' as any,
      from: yesterday,
      to: now,
      countback: 96, // 24 hours * 4 (15-min bars per hour)
    });
    
    // Get current price from chart's latest bar (ensures header matches chart)
    let currentPrice = 0;
    let high24h = 0;
    let low24h = 0;
    let volume24h = 0;
    let priceChange24h = 0;
    
    if (bars.length > 0) {
      // Use the latest bar's close price as current price (matches chart display)
      const latestBar = bars[bars.length - 1];
      currentPrice = latestBar.close;
      
      // Get first bar's open price (24h ago)
      const firstBar = bars[0];
      const price24hAgo = firstBar.open;
      
      // Calculate price change
      if (price24hAgo > 0) {
        priceChange24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;
      }
      
      // Find high and low
      high24h = Math.max(...bars.map(b => b.high));
      low24h = Math.min(...bars.map(b => b.low));
      
      // Sum volume
      volume24h = bars.reduce((sum, b) => sum + (b.volume || 0), 0);
    } else {
      // Fallback: calculate pair price from token prices if no chart data
      const basePriceUSD = parseFloat(basePrice.priceUSD);
      const quotePriceUSD = parseFloat(quotePrice.priceUSD);
      
      if (quotePriceUSD === 0) {
        return NextResponse.json(
          { error: 'Invalid quote price' },
          { status: 503 }
        );
      }
      
      currentPrice = basePriceUSD / quotePriceUSD;
      high24h = currentPrice;
      low24h = currentPrice;
    }
    
    // Format response
    return NextResponse.json({
      pair: `${baseToken.symbol}/${quoteToken.symbol}`,
      price: currentPrice, // Current pair price from chart (matches chart display)
      priceUSD: currentPrice, // Same as price (pair price)
      priceChange24h,
      high24h,
      low24h,
      volume24h,
      baseToken: {
        symbol: baseToken.symbol,
        address: baseAddress,
        priceUSD: parseFloat(basePrice.priceUSD),
      },
      quoteToken: {
        symbol: quoteToken.symbol,
        address: quoteAddress,
        priceUSD: parseFloat(quotePrice.priceUSD),
      },
    });
  } catch (error: any) {
    console.error('[Market Price API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch market price' },
      { status: 500 }
    );
  }
}

