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
    
    // Fetch tokens by symbol in parallel
    const tokenService = getTokenService();
    const [baseTokens, quoteTokens] = await Promise.all([
      tokenService.searchTokens(baseSymbol, undefined, [chainId], 5),
      tokenService.searchTokens(quoteSymbol, undefined, [chainId], 5),
    ]);
    
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
    
    // Fetch prices AND chart bars ALL in parallel (major speed optimization)
    const chartService = getChartDataService();
    const now = Math.floor(Date.now() / 1000);
    const yesterday = now - 24 * 60 * 60;

    const [basePrice, quotePrice, bars] = await Promise.all([
      getTokenPrice(baseAddress, chainId, baseToken.symbol).catch(() => null),
      getTokenPrice(quoteAddress, chainId, quoteToken.symbol).catch(() => null),
      chartService.getHistoricalBars({
        baseToken: baseAddress,
        quoteToken: quoteAddress,
        chainId,
        baseChainId: chainId,
        quoteChainId: chainId,
        resolution: '15' as any,
        from: yesterday,
        to: now,
        countback: 96,
      }).catch(() => [] as any[]),
    ]);

    // Use prices from getTokenPrice, or fall back to searchTokens priceUSD
    const basePriceUSD = basePrice
      ? parseFloat(basePrice.priceUSD)
      : parseFloat(baseToken.priceUSD || '0');
    const quotePriceUSD = quotePrice
      ? parseFloat(quotePrice.priceUSD)
      : parseFloat(quoteToken.priceUSD || '0');

    let currentPrice = 0;
    let high24h = 0;
    let low24h = 0;
    let volume24h = 0;
    let priceChange24h = 0;

    if (bars.length > 0) {
      const latestBar = bars[bars.length - 1];
      currentPrice = latestBar.close;

      const firstBar = bars[0];
      const price24hAgo = firstBar.open;

      if (price24hAgo > 0) {
        priceChange24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;
      }

      high24h = Math.max(...bars.map((b: any) => b.high));
      low24h = Math.min(...bars.map((b: any) => b.low));
      volume24h = bars.reduce((sum: number, b: any) => sum + (b.volume || 0), 0);
    } else if (basePriceUSD > 0 && quotePriceUSD > 0) {
      currentPrice = basePriceUSD / quotePriceUSD;
      high24h = currentPrice;
      low24h = currentPrice;
    } else if (basePriceUSD > 0) {
      // If only base price available, use it as USD price
      currentPrice = basePriceUSD;
      high24h = currentPrice;
      low24h = currentPrice;
    }

    // Use priceChange from baseToken if available and no chart data
    if (priceChange24h === 0 && baseToken.priceChange24h) {
      priceChange24h = baseToken.priceChange24h;
    }
    if (volume24h === 0 && baseToken.volume24h) {
      volume24h = baseToken.volume24h;
    }

    return NextResponse.json({
      pair: `${baseToken.symbol}/${quoteToken.symbol}`,
      price: currentPrice,
      priceUSD: currentPrice,
      priceChange24h,
      high24h,
      low24h,
      volume24h,
      baseToken: {
        symbol: baseToken.symbol,
        name: baseToken.name || baseToken.symbol,
        address: baseAddress,
        chainId,
        priceUSD: basePriceUSD,
        logo: baseToken.logoURI || '',
        marketCap: baseToken.marketCap ?? null,
        liquidity: baseToken.liquidity ?? null,
        circulatingSupply: baseToken.circulatingSupply ?? null,
      },
      quoteToken: {
        symbol: quoteToken.symbol,
        name: quoteToken.name || quoteToken.symbol,
        address: quoteAddress,
        chainId,
        priceUSD: quotePriceUSD,
        logo: quoteToken.logoURI || '',
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
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

