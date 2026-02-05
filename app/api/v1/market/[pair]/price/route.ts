import { NextRequest, NextResponse } from 'next/server';
import { getChartDataService } from '@/lib/backend/services/chart-data-service';
import { getTokenService } from '@/lib/backend/services/token-service';
import { getTokenPrice } from '@/lib/backend/providers/price-provider';
import { convertPairToWrapped } from '@/lib/backend/utils/token-address-helper';
import { getBinanceTickers } from '@/lib/backend/services/binance-ticker-service';
import { getCryptoMetadata } from '@/lib/backend/data/crypto-metadata';

/**
 * GET /api/v1/market/[pair]/price
 *
 * Returns the current price and 24h stats for a trading pair.
 * Tries Binance data first (fast, accurate 24h stats), then falls back to on-chain.
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

    // ============================================================
    // Strategy: Try Binance first for USDT pairs (fast, real 24h data)
    // ============================================================
    if (quoteSymbol === 'USDT') {
      try {
        const binanceSymbol = `${baseSymbol}${quoteSymbol}`;
        const tickers = await getBinanceTickers('spot', 'top', 500);
        const ticker = tickers.find(t => t.symbol === binanceSymbol);

        if (ticker) {
          const baseMeta = getCryptoMetadata(baseSymbol);
          const quoteMeta = getCryptoMetadata(quoteSymbol);
          return NextResponse.json({
            pair: `${baseSymbol}/${quoteSymbol}`,
            price: ticker.lastPrice,
            priceUSD: ticker.lastPrice,
            priceChange24h: ticker.priceChangePercent,
            high24h: ticker.highPrice,
            low24h: ticker.lowPrice,
            volume24h: ticker.quoteVolume,
            description: baseMeta.description || null,
            baseToken: {
              symbol: baseSymbol,
              name: baseMeta.name,
              address: '',
              chainId: 0,
              priceUSD: ticker.lastPrice,
              logo: baseMeta.logo,
              marketCap: null,
              liquidity: null,
              circulatingSupply: null,
            },
            quoteToken: {
              symbol: quoteSymbol,
              name: quoteMeta.name,
              address: '',
              chainId: 0,
              priceUSD: 1,
              logo: quoteMeta.logo,
            },
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
            },
          });
        }
      } catch (binanceErr) {
        console.error('[Market Price API] Binance lookup error:', binanceErr);
      }
    }

    // ============================================================
    // New Strategy: Try dYdX for USD/USDC perp pairs
    // ============================================================
    if (quoteSymbol === 'USD' || quoteSymbol === 'USDC') {
      try {
        const { getDydxTicker } = await import('@/lib/backend/services/dydx-service');
        const { getEnrichedMetadata } = await import('@/lib/backend/services/enrichment-service');

        const marketName = `${baseSymbol}-${quoteSymbol}`;
        const ticker = await getDydxTicker(marketName);

        if (ticker) {
          const baseMeta = await getEnrichedMetadata(baseSymbol);
          const tickerPrice = parseFloat(ticker.oraclePrice || '0');
          const priceChange = parseFloat(ticker.priceChange24H || '0');
          const priceChangePct = (tickerPrice > 0 && tickerPrice !== priceChange) ? (priceChange / (tickerPrice - priceChange)) * 100 : 0;

          return NextResponse.json({
            pair: `${baseSymbol}/${quoteSymbol}`,
            price: tickerPrice,
            priceUSD: tickerPrice,
            priceChange24h: priceChangePct,
            high24h: ticker.high24h || tickerPrice,
            low24h: ticker.low24h || tickerPrice,
            volume24h: parseFloat(ticker.volume24H || '0'),
            description: baseMeta.description || null,
            baseToken: {
              symbol: baseSymbol,
              name: baseMeta.name,
              address: '',
              chainId: 4, // dYdX
              priceUSD: tickerPrice,
              logo: baseMeta.logo,
              marketCap: baseMeta.marketCap,
              liquidity: baseMeta.liquidity,
              socials: baseMeta.socials,
              website: baseMeta.website,
              circulatingSupply: null,
              decimals: Math.abs(parseFloat(ticker.atomicResolution || '-8')),
            },
            quoteToken: {
              symbol: quoteSymbol,
              name: quoteSymbol,
              address: '',
              chainId: 4,
              priceUSD: 1,
              logo: '',
            },
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15',
            },
          });
        }
      } catch (dydxErr) {
        console.error('[Market Price API] dYdX lookup error:', dydxErr);
      }
    }

    // ============================================================
    // Fallback: On-chain data (for tokens not on Binance)
    // ============================================================
    const tokenService = getTokenService();
    const [baseTokens, quoteTokens] = await Promise.all([
      tokenService.searchTokens(baseSymbol, undefined, [chainId], 5),
      tokenService.searchTokens(quoteSymbol, undefined, [chainId], 5),
    ]);

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

    // Fetch prices AND chart bars in parallel
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
      currentPrice = basePriceUSD;
      high24h = currentPrice;
      low24h = currentPrice;
    }

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
