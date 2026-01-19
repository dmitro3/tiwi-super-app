/**
 * Jupiter Swap Executor
 * 
 * Executes swaps using Jupiter for Solana same-chain swaps.
 * Uses Jupiter's Ultra API which provides pre-built transactions.
 */
import { VersionedTransaction } from '@solana/web3.js';
import type { SwapExecutionParams, SwapExecutionResult, SwapRouterExecutor } from '../types';
import type { RouterRoute } from '@/lib/backend/routers/types';
import { SwapExecutionError, SwapErrorCode } from '../types';
import { createSwapError, formatErrorMessage } from '../utils/error-handler';
import { getSolanaConnection, getSolanaWallet } from '../utils/wallet-helpers';

// Jupiter API endpoints
const JUPITER_ULTRA_API_BASE = 'https://api.jup.ag/ultra/v1';
const JUPITER_API_KEY = process.env.NEXT_PUBLIC_JUPITER_API_KEY || process.env.JUPITER_API_KEY || '';

/**
 * Jupiter executor implementation
 */
export class JupiterExecutor implements SwapRouterExecutor {
  /**
   * Check if this executor can handle the given route
   */
  canHandle(route: RouterRoute): boolean {
    return route.router === 'jupiter';
  }

  /**
   * Execute a swap using Jupiter
   */
  async execute(params: SwapExecutionParams): Promise<SwapExecutionResult> {
    const { route, fromToken, toToken, fromAmount, userAddress, onStatusUpdate } = params;

    try {
      // Validate route
      if (route.router !== 'jupiter') {
        throw new SwapExecutionError(
          'Route is not a Jupiter route',
          SwapErrorCode.INVALID_ROUTE,
          'jupiter'
        );
      }

      // Check if route has transaction data
      if (!route.transactionData && !route.raw?.transaction) {
        throw new SwapExecutionError(
          'Jupiter route missing transaction data',
          SwapErrorCode.INVALID_ROUTE,
          'jupiter'
        );
      }

      // Get Solana wallet and connection
      onStatusUpdate?.({
        stage: 'preparing',
        message: 'Preparing Jupiter swap...',
      });

      const wallet = await getSolanaWallet();
      const connection = await getSolanaConnection();

      if (!wallet.isConnected || !wallet.publicKey) {
        throw new SwapExecutionError(
          'Solana wallet not connected',
          SwapErrorCode.WALLET_NOT_CONNECTED,
          'jupiter'
        );
      }

      // Get transaction from route
      const transactionBase64 = route.transactionData || route.raw?.transaction;
      if (!transactionBase64) {
        throw new SwapExecutionError(
          'Jupiter transaction data not found',
          SwapErrorCode.INVALID_ROUTE,
          'jupiter'
        );
      }

      // Get requestId from route (needed for execute API)
      const requestId = route.raw?.requestId || route.routeId;
      if (!requestId) {
        throw new SwapExecutionError(
          'Jupiter route missing requestId',
          SwapErrorCode.INVALID_ROUTE,
          'jupiter'
        );
      }

      // Deserialize transaction
      const transactionBuffer = Buffer.from(transactionBase64, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuffer);

      // Simulate transaction (optional, for safety)
      onStatusUpdate?.({
        stage: 'preparing',
        message: 'Simulating transaction...',
      });

      try {
        const simulation = await connection.simulateTransaction(transaction, {
          commitment: 'processed',
          replaceRecentBlockhash: true,
          sigVerify: false,
        });

        if (simulation.value.err) {
          console.warn('[Jupiter] Transaction simulation failed:', simulation.value.err);
          // Don't throw - simulation failures don't always mean the transaction will fail
        }
      } catch (simError) {
        console.warn('[Jupiter] Simulation error (proceeding anyway):', simError);
      }

      // Sign transaction using wallet's signer
      onStatusUpdate?.({
        stage: 'signing',
        message: 'Please sign the transaction in your wallet...',
      });

      // Get wallet's signer (publicKey)
      if (!wallet.publicKey) {
        throw new SwapExecutionError(
          'Wallet public key not available',
          SwapErrorCode.WALLET_NOT_CONNECTED,
          'jupiter'
        );
      }

      // Sign transaction (Jupiter's way: transaction.sign([wallet]))
      transaction.sign([wallet as any]);

      // Serialize signed transaction to base64
      const signedTransactionBase64 = Buffer.from(transaction.serialize()).toString('base64');

      // Execute order via Jupiter API
      onStatusUpdate?.({
        stage: 'submitting',
        message: 'Submitting transaction to Jupiter...',
      });

      const executeResponse = await fetch(`${JUPITER_ULTRA_API_BASE}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(JUPITER_API_KEY ? { 'x-api-key': JUPITER_API_KEY } : {}),
        },
        body: JSON.stringify({
          signedTransaction: signedTransactionBase64,
          requestId: requestId,
        }),
      });

      if (!executeResponse.ok) {
        const errorText = await executeResponse.text().catch(() => executeResponse.statusText);
        throw new SwapExecutionError(
          `Jupiter execute API error: ${errorText || executeResponse.statusText}`,
          SwapErrorCode.TRANSACTION_FAILED,
          'jupiter'
        );
      }

      const executeResult = await executeResponse.json();

      // Check execution status
      onStatusUpdate?.({
        stage: 'confirming',
        message: 'Waiting for confirmation...',
        txHash: executeResult.signature,
      });

      if (executeResult.status === 'Success') {
        const txHash = executeResult.signature;

        // Wait for on-chain confirmation
        await connection.confirmTransaction(txHash, 'confirmed');

        // Calculate actual output amount (if available from route)
        const actualToAmount = route.toToken.amount;

        onStatusUpdate?.({
          stage: 'completed',
          message: 'Swap completed successfully!',
          txHash,
        });

        return {
          success: true,
          txHash,
          receipt: executeResult,
          actualToAmount,
        };
      } else {
        // Swap failed
        const txHash = executeResult.signature || 'unknown';
        throw new SwapExecutionError(
          `Swap failed: ${executeResult.error || 'Unknown error'}`,
          SwapErrorCode.TRANSACTION_FAILED,
          'jupiter'
        );
      }
    } catch (error) {
      const swapError = createSwapError(error, SwapErrorCode.TRANSACTION_FAILED, 'jupiter');
      
      onStatusUpdate?.({
        stage: 'failed',
        message: formatErrorMessage(swapError),
        error: swapError,
      });

      throw swapError;
    }
  }
}

