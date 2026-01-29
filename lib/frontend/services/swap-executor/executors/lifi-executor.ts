import { executeRoute, convertQuoteToRoute, type RouteExtended, type LiFiStep, config, ChainType, getChains } from '@lifi/sdk';
import type { SwapExecutionParams, SwapExecutionResult, SwapRouterExecutor } from '../types';
import type { RouterRoute } from '@/lib/backend/routers/types';
import { SwapExecutionError, SwapErrorCode } from '../types';
import { createSwapError, formatErrorMessage } from '../utils/error-handler';

/**
 * LiFi executor implementation
 */
export class LiFiExecutor implements SwapRouterExecutor {
  /**
   * Check if this executor can handle the given route
   */
  canHandle(route: RouterRoute): boolean {
    return route.router === 'lifi';
  }

  /**
   * Execute a swap using LiFi
   */
  async execute(params: SwapExecutionParams): Promise<SwapExecutionResult> {
    const { route, userAddress, recipientAddress, onStatusUpdate } = params;

    try {
      if (route.router !== 'lifi') {
        throw new SwapExecutionError('Route is not a LiFi route', SwapErrorCode.INVALID_ROUTE, 'lifi');
      }

      if (!userAddress) {
        throw new SwapExecutionError('User address is required', SwapErrorCode.WALLET_NOT_CONNECTED, 'lifi');
      }

      if (!route.raw || typeof route.raw !== 'object') {
        throw new SwapExecutionError('LiFi route missing raw data', SwapErrorCode.INVALID_ROUTE, 'lifi');
      }

      let lifiRoute: RouteExtended = this.convertToLiFiRoute(route.raw);
      const toAddress = recipientAddress || userAddress;

      // Ensure addresses are set in all steps
      if (lifiRoute.steps) {
        lifiRoute.steps.forEach((step) => {
          if (step.action) {
            (step.action as any).fromAddress = userAddress;
            if (!(step.action as any).toAddress) {
              (step.action as any).toAddress = toAddress;
            }
          }
        });
      }
      
      lifiRoute.fromAddress = userAddress;
      lifiRoute.toAddress = toAddress;

      onStatusUpdate?.({ stage: 'preparing', message: 'Preparing LiFi swap...' });

      console.log('[LiFiExecutor] Executing route:', {
        fromChain: lifiRoute.fromChainId,
        toChain: lifiRoute.toChainId,
        fromToken: lifiRoute.fromToken?.symbol,
        toToken: lifiRoute.toToken?.symbol,
        fromAmount: lifiRoute.fromAmount,
        fromAddress: lifiRoute.fromAddress,
        toAddress: lifiRoute.toAddress,
        steps: lifiRoute.steps?.length || 0,
      });

      const executedRoute = await executeRoute(lifiRoute, {
        updateRouteHook: (updatedRoute: RouteExtended) => {
          const latestStep = updatedRoute.steps[0];
          const latestProcess = latestStep?.execution?.process?.slice(-1)[0];

          if (latestProcess) {
            const status = latestProcess.status;
            const txHash = latestProcess.txHash;

            let stage: any = 'confirming';
            let message = `Status: ${status}`;

            if (status === 'PENDING' || status === 'STARTED') {
              stage = 'preparing';
              message = 'Preparing transaction...';
            } else if (status === 'ACTION_REQUIRED' || status === 'MESSAGE_REQUIRED') {
              stage = 'signing';
              message = 'Please sign the transaction...';
            } else if (status === 'DONE') {
              stage = 'completed';
              message = 'Swap completed!';
            } else if (status === 'FAILED') {
              stage = 'failed';
              message = 'Swap failed';
            }

            onStatusUpdate?.({
              stage,
              message: txHash ? `${message} - Tx: ${txHash.slice(0, 10)}...` : message,
              txHash,
            });
          }
        },
      });

      const txHashes: string[] = [];
      executedRoute.steps.forEach((step) => {
        step.execution?.process?.forEach((p) => { if (p.txHash) txHashes.push(p.txHash); });
      });

      return {
        success: true,
        txHash: txHashes[0] || '',
        txHashes,
        receipt: executedRoute,
      };
    } catch (error) {
      console.error('[LiFiExecutor] Execution error:', error);
      console.error('[LiFiExecutor] Error details:', {
        name: (error as any)?.name,
        message: (error as any)?.message,
        code: (error as any)?.code,
        stack: (error as any)?.stack,
      });

      const swapError = createSwapError(error, SwapErrorCode.TRANSACTION_FAILED, 'lifi');
      onStatusUpdate?.({ stage: 'failed', message: formatErrorMessage(swapError), error: swapError });
      throw swapError;
    }
  }

  private convertToLiFiRoute(raw: any): RouteExtended {
    if (raw.steps) return raw as RouteExtended;
    if (raw.action || raw.tool) return convertQuoteToRoute(raw as LiFiStep);
    throw new SwapExecutionError('Invalid LiFi route format', SwapErrorCode.INVALID_ROUTE, 'lifi');
  }
}

