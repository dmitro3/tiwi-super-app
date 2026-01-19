/**
 * Token Icon API Route
 * 
 * Fetches token icon from multiple reliable sources
 * Returns the first available icon URL
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const address = searchParams.get('address');
    const chainId = searchParams.get('chainId');
    const symbol = searchParams.get('symbol');
    const logoURI = searchParams.get('logoURI');

    if (!address && !symbol) {
      return NextResponse.json(
        { error: 'Address or symbol is required' },
        { status: 400 }
      );
    }

    // Try multiple sources in order of reliability
    const iconUrls: string[] = [];

    // 1. Original logo URI (if provided)
    if (logoURI && logoURI.trim() && (logoURI.startsWith('http') || logoURI.startsWith('/'))) {
      iconUrls.push(logoURI.trim());
    }

    // 2. DexScreener CDN (most reliable for market data tokens)
    if (address && chainId) {
      const chainSlug = getDexScreenerChainSlug(parseInt(chainId));
      if (chainSlug) {
        iconUrls.push(`https://cdn.dexscreener.com/tokens/${chainSlug}/${address.toLowerCase()}.png`);
      }
    }

    // 3. Trust Wallet Assets (comprehensive database)
    if (address && chainId) {
      const chainName = getTrustWalletChainName(parseInt(chainId));
      iconUrls.push(`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainName}/assets/${address.toLowerCase()}/logo.png`);
    }

    // 4. CoinGecko (for popular tokens)
    if (symbol) {
      const symbolLower = symbol.toLowerCase();
      const imageId = getCoinGeckoImageId(symbolLower);
      if (imageId) {
        iconUrls.push(`https://assets.coingecko.com/coins/images/${imageId}/large/${symbolLower}.png`);
        iconUrls.push(`https://assets.coingecko.com/coins/images/${imageId}/small/${symbolLower}.png`);
      }
    }

    // 5. Uniswap Token List (Ethereum)
    if (address && chainId === '1') {
      iconUrls.push(`https://raw.githubusercontent.com/uniswap/assets/master/blockchains/ethereum/assets/${address.toLowerCase()}/logo.png`);
    }

    // 6. 1inch Token List
    if (address) {
      iconUrls.push(`https://tokens.1inch.io/${address.toLowerCase()}.png`);
    }

    // Try to validate URLs by checking if they exist
    // For now, return the first URL (client will handle fallback)
    const validUrls = iconUrls.filter(url => url && url.trim() !== '');

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: 'No icon URLs found', iconUrl: null },
        { status: 404 }
      );
    }

    return NextResponse.json({
      iconUrl: validUrls[0],
      fallbackUrls: validUrls.slice(1),
    });
  } catch (error: any) {
    console.error('[TokenIconAPI] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token icon', iconUrl: null },
      { status: 500 }
    );
  }
}

function getDexScreenerChainSlug(chainId: number): string | null {
  const chainMap: Record<number, string> = {
    1: 'ethereum',
    56: 'bsc',
    137: 'polygon',
    8453: 'base',
    42161: 'arbitrum',
    10: 'optimism',
    43114: 'avalanche',
    7565164: 'solana',
  };
  return chainMap[chainId] || null;
}

function getTrustWalletChainName(chainId: number): string {
  const chainMap: Record<number, string> = {
    1: 'ethereum',
    56: 'smartchain',
    137: 'polygon',
    8453: 'base',
    42161: 'arbitrum',
    10: 'optimism',
    43114: 'avalanche',
    7565164: 'solana',
  };
  return chainMap[chainId] || 'ethereum';
}

function getCoinGeckoImageId(symbol: string): number | null {
  const imageIds: Record<string, number> = {
    'btc': 1,
    'eth': 279,
    'bnb': 825,
    'sol': 4128,
    'usdt': 825,
    'usdc': 3408,
    'dai': 4943,
    'matic': 4713,
    'avax': 5805,
    'link': 1975,
    'dot': 6636,
    'ada': 2010,
  };
  return imageIds[symbol.toLowerCase()] || null;
}



