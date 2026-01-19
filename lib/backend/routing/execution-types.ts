/**
 * Execution Types
 * 
 * Types for route execution, including notifications for multiple transactions
 */

import type { Address } from 'viem';
import type { SameChainRoute } from './same-chain-finder';
import type { CrossChainRoute } from './cross-chain-finder';

/**
 * Execution step type
 */
export type ExecutionStepType = 'swap' | 'bridge' | 'unwrap' | 'approval';

/**
 * Single execution step
 */
export interface ExecutionStep {
  stepId: string;
  type: ExecutionStepType;
  chainId: number;
  description: string;
  
  // For swap steps
  swap?: {
    fromToken: Address;
    toToken: Address;
    amountIn: bigint;
    amountOut: bigint;
    dexId: string;
    routerAddress: Address;
    path: Address[];
  };
  
  // For bridge steps
  bridge?: {
    fromChain: number;
    toChain: number;
    fromToken: Address;
    toToken: Address;
    amountIn: bigint;
    amountOut: bigint;
    bridgeProvider: string; // e.g., "lifi"
    quote: any; // Bridge quote data
  };
  
  // For unwrap steps
  unwrap?: {
    token: Address; // Wrapped token (WBNB, WETH)
    amount: bigint;
  };
  
  // For approval steps
  approval?: {
    token: Address;
    spender: Address;
    amount: bigint;
  };
  
  // Estimated gas
  estimatedGas: bigint;
  
  // Status
  status?: 'pending' | 'approved' | 'executing' | 'completed' | 'failed';
  transactionHash?: string;
  error?: string;
}

/**
 * Execution plan
 * 
 * Contains all steps needed to execute a route
 */
export interface ExecutionPlan {
  planId: string;
  totalSteps: number;
  steps: ExecutionStep[];
  
  // Route information
  fromToken: {
    address: Address;
    chainId: number;
    symbol?: string;
    amount: bigint;
  };
  toToken: {
    address: Address;
    chainId: number;
    symbol?: string;
    amount: bigint;
  };
  
  // Execution metadata
  requiresMultipleTransactions: boolean;
  requiresMultipleSignatures: boolean;
  estimatedTotalGas: bigint;
  estimatedTotalTime?: number; // Estimated time in seconds
  
  // Path visualization
  path: Array<{
    chainId: number;
    chainName: string;
    steps: string[]; // Human-readable step descriptions
  }>;
}

/**
 * Execution notification
 * 
 * Used to notify user about execution requirements
 */
export interface ExecutionNotification {
  type: 'multiple_transactions' | 'multiple_signatures' | 'cross_chain' | 'approval_required';
  message: string;
  details: {
    transactionCount?: number;
    signatureCount?: number;
    chains?: number[];
    approvals?: Array<{
      token: Address;
      tokenSymbol?: string;
      spender: Address;
    }>;
  };
  path: ExecutionPlan['path'];
  estimatedTime?: number;
}

/**
 * Convert same-chain route to execution plan
 */
export function convertSameChainRouteToPlan(
  route: SameChainRoute,
  fromToken: { address: Address; chainId: number; symbol?: string },
  toToken: { address: Address; chainId: number; symbol?: string },
  amountIn: bigint
): ExecutionPlan {
  const steps: ExecutionStep[] = [];
  
  // Single swap step (router handles multi-hop internally)
  steps.push({
    stepId: 'swap-1',
    type: 'swap',
    chainId: route.chainId,
    description: `Swap ${fromToken.symbol || 'Token'} → ${toToken.symbol || 'Token'}`,
    swap: {
      fromToken: route.path[0],
      toToken: route.path[route.path.length - 1],
      amountIn,
      amountOut: route.outputAmount,
      dexId: route.dexId,
      routerAddress: getRouterAddress(route.chainId, route.dexId) || '0x',
      path: route.path,
    },
    estimatedGas: BigInt(150000 * route.hops), // Estimate gas per hop
  });
  
  return {
    planId: `plan-${Date.now()}`,
    totalSteps: steps.length,
    steps,
    fromToken: {
      address: fromToken.address,
      chainId: fromToken.chainId,
      symbol: fromToken.symbol,
      amount: amountIn,
    },
    toToken: {
      address: toToken.address,
      chainId: toToken.chainId,
      symbol: toToken.symbol,
      amount: route.outputAmount,
    },
    requiresMultipleTransactions: false, // Same-chain is single transaction
    requiresMultipleSignatures: false,
    estimatedTotalGas: BigInt(150000 * route.hops),
    path: [{
      chainId: route.chainId,
      chainName: getChainName(route.chainId),
      steps: [`Swap ${route.path.map((_, i) => i < route.path.length - 1 ? '→' : '').join(' ')}`],
    }],
  };
}

/**
 * Convert cross-chain route to execution plan
 */
export function convertCrossChainRouteToPlan(
  route: CrossChainRoute,
  fromToken: { address: Address; chainId: number; symbol?: string },
  toToken: { address: Address; chainId: number; symbol?: string },
  amountIn: bigint
): ExecutionPlan {
  const steps: ExecutionStep[] = [];
  let stepIndex = 1;
  
  // Step 1: Source chain swap
  steps.push({
    stepId: `swap-${stepIndex++}`,
    type: 'swap',
    chainId: route.sourceRoute.chainId,
    description: `Swap on ${getChainName(route.sourceRoute.chainId)}`,
    swap: {
      fromToken: route.sourceRoute.path[0],
      toToken: route.sourceRoute.path[route.sourceRoute.path.length - 1],
      amountIn,
      amountOut: route.sourceRoute.outputAmount,
      dexId: route.sourceRoute.dexId,
      routerAddress: getRouterAddress(route.sourceRoute.chainId, route.sourceRoute.dexId) || '0x',
      path: route.sourceRoute.path,
    },
    estimatedGas: BigInt(150000 * route.sourceRoute.hops),
  });
  
  // Step 2: Bridge
  steps.push({
    stepId: `bridge-${stepIndex++}`,
    type: 'bridge',
    chainId: route.bridge.fromChain, // Bridge starts on source chain
    description: `Bridge from ${getChainName(route.bridge.fromChain)} to ${getChainName(route.bridge.toChain)}`,
    bridge: {
      fromChain: route.bridge.fromChain,
      toChain: route.bridge.toChain,
      fromToken: route.bridge.fromToken,
      toToken: route.bridge.toToken,
      amountIn: route.bridge.amountIn,
      amountOut: route.bridge.amountOut,
      bridgeProvider: 'lifi',
      quote: route.bridge.quote,
    },
    estimatedGas: BigInt(200000), // Estimated bridge gas
  });
  
  // Step 3: Destination chain swap (if needed)
  if (route.destRoute) {
    steps.push({
      stepId: `swap-${stepIndex++}`,
      type: 'swap',
      chainId: route.destRoute.chainId,
      description: `Swap on ${getChainName(route.destRoute.chainId)}`,
      swap: {
        fromToken: route.destRoute.path[0],
        toToken: route.destRoute.path[route.destRoute.path.length - 1],
        amountIn: route.bridge.amountOut,
        amountOut: route.destRoute.outputAmount,
        dexId: route.destRoute.dexId,
        routerAddress: getRouterAddress(route.destRoute.chainId, route.destRoute.dexId) || '0x',
        path: route.destRoute.path,
      },
      estimatedGas: BigInt(150000 * route.destRoute.hops),
    });
  }
  
  const totalGas = steps.reduce((sum, step) => sum + step.estimatedGas, BigInt(0));
  
  return {
    planId: `plan-${Date.now()}`,
    totalSteps: steps.length,
    steps,
    fromToken: {
      address: fromToken.address,
      chainId: fromToken.chainId,
      symbol: fromToken.symbol,
      amount: amountIn,
    },
    toToken: {
      address: toToken.address,
      chainId: toToken.chainId,
      symbol: toToken.symbol,
      amount: route.totalOutput,
    },
    requiresMultipleTransactions: true, // Cross-chain requires multiple transactions
    requiresMultipleSignatures: true, // Each transaction needs signature
    estimatedTotalGas: totalGas,
    estimatedTotalTime: steps.length * 30, // Estimate 30 seconds per step
    path: [
      {
        chainId: route.sourceRoute.chainId,
        chainName: getChainName(route.sourceRoute.chainId),
        steps: [`Swap ${route.sourceRoute.path.length > 2 ? 'via intermediaries' : 'direct'}`],
      },
      {
        chainId: route.bridge.toChain,
        chainName: getChainName(route.bridge.toChain),
        steps: ['Bridge', route.destRoute ? 'Swap' : 'Complete'],
      },
    ],
  };
}

/**
 * Generate execution notification
 */
export function generateExecutionNotification(plan: ExecutionPlan): ExecutionNotification | null {
  if (!plan.requiresMultipleTransactions) {
    return null; // No notification needed for single transaction
  }
  
  const chains = [...new Set(plan.steps.map(s => s.chainId))];
  
  return {
    type: plan.requiresMultipleSignatures ? 'multiple_signatures' : 'multiple_transactions',
    message: `This swap requires ${plan.totalSteps} transaction${plan.totalSteps > 1 ? 's' : ''} across ${chains.length} chain${chains.length > 1 ? 's' : ''}.`,
    details: {
      transactionCount: plan.totalSteps,
      signatureCount: plan.requiresMultipleSignatures ? plan.totalSteps : 1,
      chains,
    },
    path: plan.path,
    estimatedTime: plan.estimatedTotalTime,
  };
}

// Helper functions
function getRouterAddress(chainId: number, dexId: string): Address | null {
  // Import dynamically to avoid circular dependencies
  const { getRouterAddress: getRouter } = require('./dex-registry');
  return getRouter(chainId, dexId);
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

