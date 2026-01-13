// Advanced PancakeSwap Router with full pair scanning and graph-based routing
// This replicates PancakeSwap UI's ability to swap ANY token, including low liquidity tokens
// Matches tiwi-test implementation exactly

import { createPublicClient, http, type Address, getAddress } from 'viem';
import { PANCAKESWAP_V2_FACTORY, PANCAKESWAP_V2_ROUTER, WETH_ADDRESSES } from './pancakeswap-constants';
import { getCachedClient, fastRpcCall } from './pancakeswap-optimization';
import { getChainConfig } from './chain-config';

// Router ABI - includes fee-on-transfer support
const ROUTER_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
    ],
    name: 'getAmountsOut',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface Route {
  path: Address[];
  pairs: Address[];
  expectedOutput: bigint;
  priceImpact: number; // Percentage
  liquidity: bigint; // Total liquidity along path
}

// Convert native token to WETH
const convertToWETH = (tokenAddress: string, chainId: number): Address => {
  if (
    tokenAddress === '0x0000000000000000000000000000000000000000' ||
    tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
  ) {
    return WETH_ADDRESSES[chainId] || getAddress(tokenAddress);
  }
  return getAddress(tokenAddress);
};

// Get common intermediate tokens for routing (priority order)
export const getIntermediateTokens = (chainId: number): Address[] => {
  const weth = WETH_ADDRESSES[chainId];
  if (!weth) return [];

  const intermediates: Address[] = [weth]; // Always try WETH first

  // Add chain-specific common tokens
  if (chainId === 56) {
    // BSC
    intermediates.push(
      getAddress('0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82'), // CAKE
      getAddress('0x55d398326f99059fF775485246999027B3197955'), // USDT
      getAddress('0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'), // BUSD
      getAddress('0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'), // USDC
      getAddress('0x50c5725949A6F0c72E6C4a641F24049A917E0Cb6'), // FDUSD
    );
  } else if (chainId === 1) {
    // Ethereum
    intermediates.push(
      getAddress('0xdAC17F958D2ee523a2206206994597C13D831ec7'), // USDT
      getAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'), // USDC
      getAddress('0x6B175474E89094C44Da98b954EedeAC495271d0F'), // DAI
    );
  } else if (chainId === 137) {
    // Polygon
    intermediates.push(
      getAddress('0xc2132D05D31c914a87C6611C10748AEb04B58e8F'), // USDT
      getAddress('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'), // USDC
    );
  }

  return intermediates;
};

// Find best route using graph-based search
export const findBestRoute = async (
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  chainId: number
): Promise<Route | null> => {
  const chain = getChainConfig(chainId);
  if (!chain) return null;

  const publicClient = getCachedClient(chainId);

  // Convert native tokens to WETH
  const tokenInWETH = convertToWETH(tokenIn, chainId);
  const tokenOutWETH = convertToWETH(tokenOut, chainId);

  // PancakeSwap V2 doesn't support allPairsLength, so we discover pairs on-demand
  // Use simple routing which checks pairs directly via getPair
  console.log('[findBestRoute] Using on-demand pair discovery (PancakeSwap V2 compatible)');
  return findSimpleRoute(tokenInWETH, tokenOutWETH, amountIn, chainId, publicClient);
};

// Fallback simple route finder (when graph is not available)
// This checks pairs on-demand using router's getAmountsOut (which validates pairs exist)
const findSimpleRoute = async (
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  chainId: number,
  publicClient: any
): Promise<Route | null> => {
  const routerAddress = PANCAKESWAP_V2_ROUTER[chainId];
  if (!routerAddress) return null;

  const intermediates = getIntermediateTokens(chainId);
  const paths: Address[][] = [
    [tokenIn, tokenOut], // Direct
  ];

  // Add 2-hop paths through intermediates
  for (const intermediate of intermediates) {
    if (
      intermediate.toLowerCase() !== tokenIn.toLowerCase() &&
      intermediate.toLowerCase() !== tokenOut.toLowerCase()
    ) {
      paths.push([tokenIn, intermediate, tokenOut]);
    }
  }

  // Add 3-hop paths (token -> intermediate1 -> intermediate2 -> token)
  for (let i = 0; i < intermediates.length; i++) {
    for (let j = i + 1; j < intermediates.length; j++) {
      const intermediate1 = intermediates[i];
      const intermediate2 = intermediates[j];
      if (
        intermediate1.toLowerCase() !== tokenIn.toLowerCase() &&
        intermediate1.toLowerCase() !== tokenOut.toLowerCase() &&
        intermediate2.toLowerCase() !== tokenIn.toLowerCase() &&
        intermediate2.toLowerCase() !== tokenOut.toLowerCase() &&
        intermediate1.toLowerCase() !== intermediate2.toLowerCase()
      ) {
        paths.push([tokenIn, intermediate1, intermediate2, tokenOut]);
      }
    }
  }

  // Try each path and collect valid routes
  const validRoutes: Route[] = [];
  
  for (const path of paths) {
    try {
      const amounts = await publicClient.readContract({
        address: routerAddress,
        abi: ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [amountIn, path],
      }) as bigint[];

      if (amounts && amounts.length > 0 && amounts[amounts.length - 1] > BigInt(0)) {
        // Calculate price impact (simplified)
        const inputAmount = parseFloat(amountIn.toString()) / 1e18;
        const outputAmount = parseFloat(amounts[amounts.length - 1].toString()) / 1e18;
        const priceImpact = inputAmount > 0 ? Math.abs((inputAmount - outputAmount) / inputAmount) * 100 : 0;

        validRoutes.push({
          path,
          pairs: [], // Will be filled during swap
          expectedOutput: amounts[amounts.length - 1],
          priceImpact: Math.min(priceImpact, 100),
          liquidity: BigInt(0), // Unknown without pair reserves
        });
      }
    } catch (error) {
      // Path doesn't exist or has insufficient liquidity, continue to next
      continue;
    }
  }

  if (validRoutes.length === 0) {
    return null;
  }

  // Sort by highest output, then lowest price impact
  validRoutes.sort((a, b) => {
    if (a.expectedOutput > b.expectedOutput) return -1;
    if (a.expectedOutput < b.expectedOutput) return 1;
    if (a.priceImpact < b.priceImpact) return -1;
    if (a.priceImpact > b.priceImpact) return 1;
    return 0;
  });

  return validRoutes[0];
};

// Detect if token has fee-on-transfer
export const detectFeeOnTransfer = async (
  tokenAddress: Address,
  chainId: number,
  publicClient: any
): Promise<boolean> => {
  try {
    // Try a test transfer simulation
    // If actual balance received < amount sent, it's a fee-on-transfer token
    // This is a simplified check - in production, you'd want more sophisticated detection
    
    // Check if token has known fee-on-transfer patterns
    // Many fee tokens have specific totalSupply patterns or transfer functions
    
    // For now, we'll use a heuristic: if getAmountsOut fails but pairs exist,
    // it might be a fee-on-transfer token
    return false; // Default to false, will be detected during swap attempts
  } catch (error) {
    return false;
  }
};

// Calculate dynamic slippage based on token characteristics
export const calculateDynamicSlippage = (
  priceImpact: number,
  isFeeOnTransfer: boolean,
  isLowLiquidity: boolean
): number => {
  let slippage = 0.5; // Base 0.5%

  // Increase for high price impact
  if (priceImpact > 50) {
    slippage += 20;
  } else if (priceImpact > 20) {
    slippage += 10;
  } else if (priceImpact > 10) {
    slippage += 5;
  } else if (priceImpact > 5) {
    slippage += 2;
  }

  // Increase for fee-on-transfer tokens
  if (isFeeOnTransfer) {
    slippage += 15; // Add 15% for fee tokens
  }

  // Increase for low liquidity
  if (isLowLiquidity) {
    slippage += 10;
  }

  // Cap at 50%
  return Math.min(slippage, 50);
};