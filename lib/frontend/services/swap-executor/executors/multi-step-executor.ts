/**
 * Multi-Step Swap Executor
 * 
 * Executes complex routes with multiple steps:
 * - Multiple swaps on same chain
 * - Cross-chain bridges
 * - Unwrap operations
 */

import type { SwapExecutionParams, SwapExecutionResult, SwapRouterExecutor } from '../types';
import type { RouterRoute } from '@/lib/backend/routers/types';
import { SwapExecutionError, SwapErrorCode } from '../types';
import { PancakeSwapExecutor } from './pancakeswap-executor';
import { UniswapExecutor } from './uniswap-executor';
import { ensureCorrectChain } from '../utils/wallet-helpers';
import { getBridgeRegistry } from '@/lib/backend/routing/bridges';
import { getBridgeStatusTracker } from '@/lib/backend/routing/bridges';
import type { Address } from 'viem';
import { toSmallestUnit } from '../utils/amount-converter';

/**
 * Multi-Step Executor
 * 
 * Handles routes with multiple steps (swaps, bridges, unwraps)
 */
export class MultiStepExecutor implements SwapRouterExecutor {
  /**
   * Check if this executor can handle the given route
   */
  canHandle(route: RouterRoute): boolean {
    // Handle universal routes, multi-hop routes, cross-chain multi-hop routes, or routes with multiple steps
    return route.router === 'universal' ||
           route.router === 'multi-hop' ||
           route.router === 'multi-hop-bridge' ||
           (route.steps && Array.isArray(route.steps) && route.steps.length > 1);
  }
  
  /**
   * Execute multi-step route
   */
  async execute(params: SwapExecutionParams): Promise<SwapExecutionResult> {
    const { route, fromToken, toToken, fromAmount, userAddress, onStatusUpdate } = params;
    
    try {
      // Validate route has steps
      if (!route.steps || !Array.isArray(route.steps) || route.steps.length === 0) {
        throw new SwapExecutionError(
          'Route has no steps',
          SwapErrorCode.INVALID_ROUTE
        );
      }
      
      // Execute steps sequentially
      let currentAmount = BigInt(toSmallestUnit(fromAmount, fromToken.decimals!));
      let currentChain = fromToken.chainId!;
      const allTxHashes: string[] = [];
      let lastTxHash: string | undefined;
      
      for (let i = 0; i < route.steps.length; i++) {
        const step = route.steps[i];
        const stepNumber = i + 1;
        const totalSteps = route.steps.length;
        
        // Update status
        onStatusUpdate?.({
          stage: this.getStageForStep(step),
          message: `Step ${stepNumber}/${totalSteps}: ${this.getStepDescription(step)}`,
          progress: Math.round((stepNumber / totalSteps) * 100),
        });
        
        // Switch chain if needed
        const stepChainId = step.chainId || (step as any).fromChain || currentChain;
        if (stepChainId !== currentChain) {
          onStatusUpdate?.({
            stage: 'preparing',
            message: `Switching to ${this.getChainName(stepChainId)}...`,
          });
          await ensureCorrectChain(stepChainId);
          currentChain = stepChainId;
        }
        
        // Execute step
        const stepResult = await this.executeStep(
          step,
          currentAmount,
          userAddress,
          onStatusUpdate
        );
        
        if (!stepResult.success) {
          throw new SwapExecutionError(
            `Step ${stepNumber} failed: ${stepResult.error}`,
            SwapErrorCode.EXECUTION_FAILED
          );
        }
        
        // Update amount for next step
        currentAmount = stepResult.amountOut;
        if (stepResult.txHash) {
          allTxHashes.push(stepResult.txHash);
          lastTxHash = stepResult.txHash;
        }
        
        // If bridge step, wait for completion
        if (step.type === 'bridge' && stepResult.txHash) {
          onStatusUpdate?.({
            stage: 'confirming',
            message: 'Waiting for bridge to complete...',
          });
          
          await this.waitForBridge(
            stepResult.txHash,
            stepChainId,
            (step as any).bridgeId || 'stargate'
          );
        }
      }
      
      onStatusUpdate?.({
        stage: 'completed',
        message: 'All steps completed successfully',
        progress: 100,
        txHash: lastTxHash,
      });
      
      return {
        success: true,
        txHash: lastTxHash || allTxHashes[0] || '',
        txHashes: allTxHashes,
      };
    } catch (error: any) {
      onStatusUpdate?.({
        stage: 'failed',
        message: error.message || 'Multi-step execution failed',
        error: error instanceof Error ? error : new Error(error.message),
      });
      
      return {
        success: false,
        txHash: '',
        error: error instanceof Error ? error : new Error(error.message || 'Unknown error'),
      };
    }
  }
  
  /**
   * Execute a single step
   */
  private async executeStep(
    step: any,
    amountIn: bigint,
    userAddress: string,
    onStatusUpdate?: (status: any) => void
  ): Promise<{ success: boolean; amountOut: bigint; txHash?: string; error?: string }> {
    switch (step.type) {
      case 'swap':
        return await this.executeSwapStep(step, amountIn, userAddress, onStatusUpdate);
      case 'bridge':
        return await this.executeBridgeStep(step, amountIn, userAddress, onStatusUpdate);
      case 'unwrap':
        return await this.executeUnwrapStep(step, amountIn, userAddress, onStatusUpdate);
      default:
        return { success: false, error: `Unknown step type: ${step.type}` };
    }
  }
  
  /**
   * Execute swap step
   */
  private async executeSwapStep(
    step: any,
    amountIn: bigint,
    userAddress: string,
    onStatusUpdate?: (status: any) => void
  ) {
    try {
      // Use existing executor based on DEX
      let executor: SwapRouterExecutor;
      
      if (step.dex === 'pancakeswap' || step.dex === 'pancake') {
        executor = new PancakeSwapExecutor();
      } else if (step.dex === 'uniswap' || step.dex === 'uniswap-v2') {
        executor = new UniswapExecutor();
      } else {
        return { success: false, error: `Unsupported DEX: ${step.dex}` };
      }
      
      // Build route for this step
      const stepRoute: RouterRoute = {
        router: step.dex,
        routeId: `step-${step.stepId || Date.now()}`,
        fromToken: {
          chainId: step.chainId,
          address: step.fromToken,
          symbol: '',
          amount: amountIn.toString(),
          decimals: 18,
        },
        toToken: {
          chainId: step.chainId,
          address: step.toToken,
          symbol: '',
          amount: step.amountOut || '0',
          decimals: 18,
        },
        exchangeRate: '0',
        priceImpact: '0',
        slippage: '0.5',
        fees: {
          protocol: '0',
          gas: '0',
          gasUSD: '0',
          total: '0',
        },
        steps: [step],
        estimatedTime: 0,
        expiresAt: Date.now() + 60000,
        raw: {
          path: [step.fromToken, step.toToken],
        },
      };
      
      // Execute swap
      const result = await executor.execute({
        route: stepRoute,
        fromToken: { chainId: step.chainId, address: step.fromToken, decimals: 18 } as any,
        toToken: { chainId: step.chainId, address: step.toToken, decimals: 18 } as any,
        fromAmount: amountIn.toString(),
        userAddress,
        onStatusUpdate,
      });
      
      if (!result.success) {
        return { success: false, error: result.error?.message || 'Swap failed' };
      }
      
      // Get actual amount out from step or use estimated
      const amountOut = BigInt(step.amountOut || '0');
      
      return {
        success: true,
        amountOut,
        txHash: result.txHash,
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Swap step failed' };
    }
  }
  
  /**
   * Execute bridge step
   */
  private async executeBridgeStep(
    step: any,
    amountIn: bigint,
    userAddress: string,
    onStatusUpdate?: (status: any) => void
  ) {
    try {
      const bridgeRegistry = getBridgeRegistry();
      const bridge = bridgeRegistry.getBridge(step.bridgeId || 'stargate');
      
      if (!bridge) {
        return { success: false, error: `Bridge not found: ${step.bridgeId}` };
      }
      
      // Get bridge quote
      onStatusUpdate?.({
        stage: 'preparing',
        message: 'Getting bridge quote...',
      });
      
      const quote = await bridge.getQuote(
        step.fromChain || step.chainId,
        step.toChain || step.chainId,
        step.fromToken,
        step.toToken,
        amountIn,
        0.5 // slippage
      );
      
      if (!quote) {
        return { success: false, error: 'Bridge quote failed' };
      }
      
      // Execute bridge
      onStatusUpdate?.({
        stage: 'signing',
        message: 'Sign bridge transaction...',
      });
      
      const result = await bridge.executeBridge(quote, userAddress as Address);
      
      if (!result.success) {
        return { success: false, error: result.error || 'Bridge execution failed' };
      }
      
      return {
        success: true,
        amountOut: quote.amountOut,
        txHash: result.fromChainTxHash || result.transactionHash,
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Bridge step failed' };
    }
  }
  
  /**
   * Execute unwrap step (WETH → ETH)
   */
  private async executeUnwrapStep(
    step: any,
    amountIn: bigint,
    userAddress: string,
    onStatusUpdate?: (status: any) => void
  ) {
    try {
      // WETH unwrap transaction
      const WETH_ABI = [
        {
          inputs: [{ internalType: 'uint256', name: 'wad', type: 'uint256' }],
          name: 'withdraw',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ] as const;
      
      const WETH_ADDRESSES: Record<number, Address> = {
        1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address,
        42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' as Address,
        10: '0x4200000000000000000000000000000000000006' as Address,
        8453: '0x4200000000000000000000000000000000000006' as Address,
      };
      
      const wethAddress = WETH_ADDRESSES[step.chainId];
      if (!wethAddress) {
        return { success: false, error: `WETH not found for chain ${step.chainId}` };
      }
      
      const { getEVMWalletClient } = await import('../utils/wallet-helpers');
      const { getEVMPublicClient } = await import('../utils/wallet-helpers');
      
      const walletClient = await getEVMWalletClient(step.chainId);
      const publicClient = getEVMPublicClient(step.chainId);
      
      onStatusUpdate?.({
        stage: 'signing',
        message: 'Unwrapping WETH...',
      });
      
      const hash = await walletClient.writeContract({
        address: wethAddress,
        abi: WETH_ABI,
        functionName: 'withdraw',
        args: [amountIn],
        account: userAddress as `0x${string}`,
      });
      
      // Wait for confirmation
      onStatusUpdate?.({
        stage: 'confirming',
        message: 'Waiting for unwrap confirmation...',
      });
      
      await publicClient.waitForTransactionReceipt({ hash });
      
      return {
        success: true,
        amountOut: amountIn, // 1:1 unwrap
        txHash: hash,
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Unwrap step failed' };
    }
  }
  
  /**
   * Wait for bridge completion
   */
  private async waitForBridge(
    txHash: string,
    fromChain: number,
    bridgeId: string
  ): Promise<void> {
    const tracker = getBridgeStatusTracker();
    
    // Start tracking
    await tracker.trackBridge(bridgeId, txHash, fromChain, 0);
    
    // Poll until complete (max 10 minutes)
    const maxWait = 10 * 60 * 1000; // 10 minutes
    const startTime = Date.now();
    const pollInterval = 10000; // 10 seconds
    
    while (Date.now() - startTime < maxWait) {
      const status = await tracker.getStatus(bridgeId, txHash);
      
      if (status?.status === 'completed') {
        return; // Bridge completed
      }
      
      if (status?.status === 'failed') {
        throw new Error('Bridge failed');
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error('Bridge timeout - bridge did not complete within 10 minutes');
  }
  
  /**
   * Get stage for step type
   */
  private getStageForStep(step: any): string {
    switch (step.type) {
      case 'swap': return 'signing';
      case 'bridge': return 'bridging';
      case 'unwrap': return 'signing';
      default: return 'preparing';
    }
  }
  
  /**
   * Get description for step
   */
  private getStepDescription(step: any): string {
    switch (step.type) {
      case 'swap': return `Swapping on ${step.dex || 'DEX'}`;
      case 'bridge': return `Bridging via ${step.bridgeId || 'bridge'}`;
      case 'unwrap': return 'Unwrapping to native token';
      default: return 'Processing';
    }
  }
  
  /**
   * Get chain name
   */
  private getChainName(chainId: number): string {
    const names: Record<number, string> = {
      1: 'Ethereum',
      56: 'BSC',
      137: 'Polygon',
      42161: 'Arbitrum',
      10: 'Optimism',
      8453: 'Base',
    };
    return names[chainId] || `Chain ${chainId}`;
  }
}


