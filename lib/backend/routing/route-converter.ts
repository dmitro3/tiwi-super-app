/**
 * Route Converter
 * 
 * Converts SameChainRoute and CrossChainRoute to RouterRoute format
 * for integration with existing RouteService
 */

import type { Address } from 'viem';
import type { RouterRoute, RouteStep } from '@/lib/backend/routers/types';
import type { SameChainRoute } from './same-chain-finder';
import type { CrossChainRoute } from './cross-chain-finder';
import { getRouterAddress } from './dex-registry';
import { TokenDecimalsFetcher } from '@/lib/backend/utils/token-decimals-fetcher';

const decimalsFetcher = new TokenDecimalsFetcher();

/**
 * Convert SameChainRoute to RouterRoute
 */
export async function convertSameChainRouteToRouterRoute(
  route: SameChainRoute,
  fromToken: { address: Address; symbol?: string; decimals?: number },
  toToken: { address: Address; symbol?: string; decimals?: number },
  amountIn: bigint,
  chainId: number
): Promise<RouterRoute> {
  // Get decimals in parallel if not provided
  const [fromDecimals, toDecimals] = await Promise.all([
    fromToken.decimals != null ? fromToken.decimals : decimalsFetcher.getTokenDecimals(fromToken.address, chainId),
    toToken.decimals != null ? toToken.decimals : decimalsFetcher.getTokenDecimals(toToken.address, chainId),
  ]);

  // Format amounts
  const fromAmount = formatAmount(amountIn, fromDecimals);
  const toAmount = formatAmount(route.outputAmount, toDecimals);

  // Calculate exchange rate
  const exchangeRate = calculateExchangeRate(amountIn, route.outputAmount, fromDecimals, toDecimals);

  // Build steps
  const steps: RouteStep[] = [];

  if (route.hops === 1) {
    // Direct swap
    steps.push({
      type: 'swap',
      chainId,
      fromToken: {
        address: route.path[0],
        amount: fromAmount,
        symbol: fromToken.symbol,
        decimals: fromDecimals,
      },
      toToken: {
        address: route.path[1],
        amount: toAmount,
        symbol: toToken.symbol,
        decimals: toDecimals,
      },
      protocol: getProtocolName(route.dexId),
      description: `Swap ${fromToken.symbol || 'Token'} → ${toToken.symbol || 'Token'}`,
    });
  } else {
    // Multi-hop swap - batch fetch ALL intermediate decimals in parallel upfront
    const intermediateAddrs = route.path.slice(1, -1); // exclude first and last (already have decimals)
    const intermediateDecimals = await Promise.all(
      intermediateAddrs.map(addr => decimalsFetcher.getTokenDecimals(addr, chainId))
    );

    // Build decimals map: index 0 = fromDecimals, last = toDecimals, middle = fetched
    const pathDecimals: number[] = [fromDecimals, ...intermediateDecimals, toDecimals];

    for (let i = 0; i < route.path.length - 1; i++) {
      const stepFromAddr = route.path[i];
      const stepToAddr = route.path[i + 1];
      const stepFromDecimals = pathDecimals[i];
      const stepToDecimals = pathDecimals[i + 1];

      // Estimate intermediate amounts (simplified)
      const stepAmountIn = i === 0 ? amountIn : route.outputAmount;
      const stepAmountOut = i === route.path.length - 2 ? route.outputAmount : route.outputAmount;

      steps.push({
        type: 'swap',
        chainId,
        fromToken: {
          address: stepFromAddr,
          amount: formatAmount(stepAmountIn, stepFromDecimals),
          decimals: stepFromDecimals,
        },
        toToken: {
          address: stepToAddr,
          amount: formatAmount(stepAmountOut, stepToDecimals),
          decimals: stepToDecimals,
        },
        protocol: getProtocolName(route.dexId),
        description: `Swap via ${route.dexId}`,
      });
    }
  }

  // Get router address
  const routerAddress = getRouterAddress(chainId, route.dexId);

  return {
    router: `universal-${route.dexId}`,
    routeId: `route-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    fromToken: {
      chainId,
      address: fromToken.address,
      symbol: fromToken.symbol || 'UNKNOWN',
      amount: fromAmount,
      decimals: fromDecimals,
    },
    toToken: {
      chainId,
      address: toToken.address,
      symbol: toToken.symbol || 'UNKNOWN',
      amount: toAmount,
      decimals: toDecimals,
    },
    exchangeRate: exchangeRate.toString(),
    priceImpact: '0', // Will be calculated if needed
    slippage: '0.5', // Default slippage
    fees: {
      protocol: '0',
      gas: '150000', // Estimated gas
      gasUSD: '0', // Will be calculated
      total: '0',
    },
    steps,
    estimatedTime: 30, // 30 seconds for same-chain
    expiresAt: Date.now() + 60000, // 1 minute expiry
  };
}

/**
 * Convert CrossChainRoute to RouterRoute
 */
export async function convertCrossChainRouteToRouterRoute(
  route: CrossChainRoute,
  fromToken: { address: Address; symbol?: string; decimals?: number },
  toToken: { address: Address; symbol?: string; decimals?: number },
  amountIn: bigint,
  recipient?: Address
): Promise<RouterRoute> {
  // Fetch ALL decimals in parallel upfront (from, to, bridge from, bridge to)
  const [fromDecimals, toDecimals, bridgeFromDecimals, bridgeToDecimals] = await Promise.all([
    fromToken.decimals != null ? fromToken.decimals : decimalsFetcher.getTokenDecimals(fromToken.address, route.sourceRoute.chainId),
    toToken.decimals != null ? toToken.decimals : decimalsFetcher.getTokenDecimals(toToken.address, route.chainId),
    decimalsFetcher.getTokenDecimals(route.bridge.fromToken as Address, route.bridge.fromChain),
    decimalsFetcher.getTokenDecimals(route.bridge.toToken as Address, route.bridge.toChain),
  ]);

  // Format amounts
  const fromAmount = formatAmount(amountIn, fromDecimals);
  const toAmount = formatAmount(route.totalOutput, toDecimals);

  // Calculate exchange rate
  const exchangeRate = calculateExchangeRate(amountIn, route.totalOutput, fromDecimals, toDecimals);

  // Build steps
  const steps: RouteStep[] = [];

  // Step 1: Source chain swap
  if (route.sourceRoute.hops === 1) {
    steps.push({
      type: 'swap',
      chainId: route.sourceRoute.chainId,
      fromToken: {
        address: route.sourceRoute.path[0],
        amount: fromAmount,
        symbol: fromToken.symbol,
        decimals: fromDecimals,
      },
      toToken: {
        address: route.sourceRoute.path[1],
        amount: formatAmount(route.sourceRoute.outputAmount, fromDecimals),
        decimals: fromDecimals,
      },
      protocol: getProtocolName(route.sourceRoute.dexId),
      description: `Swap on ${getChainName(route.sourceRoute.chainId)}`,
    });
  } else {
    // Multi-hop on source chain
    steps.push({
      type: 'swap',
      chainId: route.sourceRoute.chainId,
      fromToken: {
        address: route.sourceRoute.path[0],
        amount: fromAmount,
        symbol: fromToken.symbol,
        decimals: fromDecimals,
      },
      toToken: {
        address: route.sourceRoute.path[route.sourceRoute.path.length - 1],
        amount: formatAmount(route.sourceRoute.outputAmount, fromDecimals),
        decimals: fromDecimals,
      },
      protocol: getProtocolName(route.sourceRoute.dexId),
      description: `Multi-hop swap on ${getChainName(route.sourceRoute.chainId)}`,
    });
  }

  // Step 2: Bridge (decimals already fetched in parallel above)

  steps.push({
    type: 'bridge',
    chainId: route.bridge.fromChain,
    fromToken: {
      address: route.bridge.fromToken,
      amount: formatAmount(route.bridge.amountIn, bridgeFromDecimals),
      decimals: bridgeFromDecimals,
    },
    toToken: {
      address: route.bridge.toToken,
      amount: formatAmount(route.bridge.amountOut, bridgeToDecimals),
      decimals: bridgeToDecimals,
    },
    protocol: 'LiFi',
    description: `Bridge from ${getChainName(route.bridge.fromChain)} to ${getChainName(route.bridge.toChain)}`,
  });

  // Step 3: Destination chain swap (if needed)
  if (route.destRoute) {
    steps.push({
      type: 'swap',
      chainId: route.destRoute.chainId,
      fromToken: {
        address: route.destRoute.path[0],
        amount: formatAmount(route.bridge.amountOut, bridgeToDecimals),
        decimals: bridgeToDecimals,
      },
      toToken: {
        address: route.destRoute.path[route.destRoute.path.length - 1],
        amount: toAmount,
        symbol: toToken.symbol,
        decimals: toDecimals,
      },
      protocol: getProtocolName(route.destRoute.dexId),
      description: `Swap on ${getChainName(route.destRoute.chainId)}`,
    });
  }

  return {
    router: 'universal-lifi',
    routeId: `route-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    fromToken: {
      chainId: route.sourceRoute.chainId,
      address: fromToken.address,
      symbol: fromToken.symbol || 'UNKNOWN',
      amount: fromAmount,
      decimals: fromDecimals,
    },
    toToken: {
      chainId: route.chainId,
      address: toToken.address,
      symbol: toToken.symbol || 'UNKNOWN',
      amount: toAmount,
      decimals: toDecimals,
    },
    exchangeRate: exchangeRate.toString(),
    priceImpact: '0',
    slippage: '0.5',
    fees: {
      protocol: '0',
      gas: '500000', // Estimated gas for cross-chain
      gasUSD: '0',
      total: '0',
    },
    steps,
    estimatedTime: steps.length * 60, // 60 seconds per step for cross-chain
    expiresAt: Date.now() + 120000, // 2 minutes expiry for cross-chain
    raw: {
      sourceRoute: route.sourceRoute,
      bridge: route.bridge,
      destRoute: route.destRoute,
    },
  };
}

/**
 * Get token symbol from DexScreener pairs
 */
async function getTokenSymbol(tokenAddress: Address, chainId: number): Promise<string | undefined> {
  try {
    const { getTokenPairs } = await import('./dexscreener-client');
    const pairs = await getTokenPairs(tokenAddress, chainId);

    if (pairs.length > 0) {
      // Get symbol from first pair
      const pair = pairs[0];
      if (pair.baseToken.address.toLowerCase() === tokenAddress.toLowerCase()) {
        return pair.baseToken.symbol;
      }
      if (pair.quoteToken.address.toLowerCase() === tokenAddress.toLowerCase()) {
        return pair.quoteToken.symbol;
      }
    }
  } catch (error) {
    console.warn(`[RouteConverter] Failed to get token symbol:`, error);
  }

  return undefined;
}

// Helper functions
function formatAmount(amount: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fractional = amount % divisor;

  if (fractional === 0n) {
    return whole.toString();
  }

  const fractionalStr = fractional.toString().padStart(decimals, '0');
  const trimmed = fractionalStr.replace(/0+$/, '');
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}

function calculateExchangeRate(
  amountIn: bigint,
  amountOut: bigint,
  decimalsIn: number,
  decimalsOut: number
): number {
  if (amountIn === 0n) return 0;

  // Normalize to same decimals
  const normalizedIn = Number(amountIn) / (10 ** decimalsIn);
  const normalizedOut = Number(amountOut) / (10 ** decimalsOut);

  return normalizedOut / normalizedIn;
}

function getProtocolName(dexId: string): string {
  const protocolMap: Record<string, string> = {
    pancakeswap: 'PancakeSwap',
    uniswap: 'Uniswap',
    quickswap: 'QuickSwap',
  };

  return protocolMap[dexId.toLowerCase()] || dexId;
}

function getChainName(chainId: number): string {
  const chainNames: Record<number, string> = {
    1: 'Ethereum',
    56: 'BSC',
    137: 'Polygon',
    10: 'Optimism',
    42161: 'Arbitrum',
    8453: 'Base',
  };

  return chainNames[chainId] || `Chain ${chainId}`;
}

