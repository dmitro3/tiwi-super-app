/**
 * useSwapExecution Hook
 * 
 * React hook for executing swaps with status updates.
 * Provides a clean interface for swap execution in React components.
 */

import { useState, useCallback } from 'react';
import type { RouterRoute } from '@/lib/backend/routers/types';
import type { Token } from '@/lib/frontend/types/tokens';
import { SwapExecutionParams, SwapExecutionResult, SwapExecutionStatus, swapExecutor } from '@/lib/frontend/services/swap-executor';

export interface UseSwapExecutionReturn {
  // Execution state
  isExecuting: boolean;
  status: SwapExecutionStatus | null;
  result: SwapExecutionResult | null;
  error: Error | null;

  // Actions
  execute: (params: ExecuteSwapParams) => Promise<SwapExecutionResult>;
  reset: () => void;
}

export interface ExecuteSwapParams {
  route: RouterRoute;
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  userAddress: string;
  recipientAddress?: string;
  slippage?: number;
  isFeeOnTransfer?: boolean;  // Whether to use fee-on-transfer supporting functions (defaults to true)
}

/**
 * Hook for executing swaps
 */
export function useSwapExecution(): UseSwapExecutionReturn {
  const [isExecuting, setIsExecuting] = useState(false);
  const [status, setStatus] = useState<SwapExecutionStatus | null>(null);
  const [result, setResult] = useState<SwapExecutionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (params: ExecuteSwapParams): Promise<SwapExecutionResult> => {
    setIsExecuting(true);
    setStatus(null);
    setResult(null);
    setError(null);

    try {
      const executionParams: SwapExecutionParams = {
        route: params.route,
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.fromAmount,
        userAddress: params.userAddress,
        recipientAddress: params.recipientAddress,
        slippage: params.slippage,
        isFeeOnTransfer: params.isFeeOnTransfer,
        onStatusUpdate: (newStatus: any) => {
          setStatus(newStatus);
        },
      };

      const executionResult = await swapExecutor.execute(executionParams);
      
      setResult(executionResult);
      setStatus({
        stage: 'completed',
        message: 'Swap completed successfully!',
        txHash: executionResult.txHash,
      });

      return executionResult;
    } catch (err) {
      const swapError = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(swapError);
      setStatus({
        stage: 'failed',
        message: swapError.message,
        error: swapError,
      });
      throw swapError;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsExecuting(false);
    setStatus(null);
    setResult(null);
    setError(null);
  }, []);

  return {
    isExecuting,
    status,
    result,
    error,
    execute,
    reset,
  };
}

