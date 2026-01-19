/**
 * LiFi Swap Executor
 * 
 * Executes swaps using LiFi SDK for cross-chain and same-chain swaps.
 * Uses LiFi's executeRoute function which handles all complexity.
 */

import { executeRoute, convertQuoteToRoute, type RouteExtended, type LiFiStep, config, ChainType, getChains } from '@lifi/sdk';
import type { SwapExecutionParams, SwapExecutionResult, SwapRouterExecutor } from '../types';
import type { RouterRoute } from '@/lib/backend/routers/types';
import { SwapExecutionError, SwapErrorCode } from '../types';
import { createSwapError, formatErrorMessage } from '../utils/error-handler';
import { getWalletClient, switchChain } from '@wagmi/core';
import { EVM } from '@lifi/sdk';
import { getWagmiConfigForLiFi } from '@/lib/frontend/providers/lifi-sdk-provider';

/**
 * LiFi executor implementation
 */
export class LiFiExecutor implements SwapRouterExecutor {
  // Store userAddress for wallet client validation
  private currentUserAddress: string | null = null;

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
      // Validate route
      if (route.router !== 'lifi') {
        throw new SwapExecutionError(
          'Route is not a LiFi route',
          SwapErrorCode.INVALID_ROUTE,
          'lifi'
        );
      }

      // Validate user address - this is the primary check
      // The userAddress parameter is passed from the frontend and represents the connected wallet
      if (!userAddress) {
        throw new SwapExecutionError(
          'User address is required for swap execution. Please connect your wallet before executing a swap.',
          SwapErrorCode.WALLET_NOT_CONNECTED,
          'lifi'
        );
      }

      // Store userAddress for wallet client validation
      this.currentUserAddress = userAddress.toLowerCase();

      // Note: We don't check Wagmi connection here because:
      // 1. userAddress is the source of truth (validated above)
      // 2. getWalletClient() will validate connection when actually needed
      // 3. This avoids issues with Wagmi v3 API changes and connector.getChainId() errors

      // Check if route has raw data (LiFi route object)
      if (!route.raw || typeof route.raw !== 'object') {
        throw new SwapExecutionError(
          'LiFi route missing raw data',
          SwapErrorCode.INVALID_ROUTE,
          'lifi'
        );
      }

      // Convert route to LiFi RouteExtended format
      // route.raw should contain the original LiFi route with LiFi chain IDs
      // If route.raw is missing or invalid, we'll reconstruct from route data
      let lifiRoute: RouteExtended;
      
      if (route.raw && (route.raw.steps || route.raw.action || route.raw.tool)) {
        // Use raw route data (should have LiFi chain IDs)
        console.log('[LiFiExecutor] Converting route from raw data, chain IDs:', {
          fromChainId: route.raw.fromChainId,
          toChainId: route.raw.toChainId,
        });
        lifiRoute = this.convertToLiFiRoute(route.raw);
        console.log('[LiFiExecutor] Converted route chain IDs:', {
          fromChainId: lifiRoute.fromChainId,
          toChainId: lifiRoute.toChainId,
        });
      } else {
        // Fallback: reconstruct from route data
        // This should not happen in normal flow, but we'll handle it
        console.warn('[LiFiExecutor] Route raw data missing, reconstructing from route...');
        throw new SwapExecutionError(
          'Route raw data is missing. Please ensure the route was fetched from LiFi adapter.',
          SwapErrorCode.INVALID_ROUTE,
          'lifi'
        );
      }

      // Determine recipient address (for cross-chain swaps)
      // CRITICAL: Use recipientAddress if provided (user may have pasted a different chain's address)
      // Otherwise fallback to userAddress
      // This ensures pasted addresses (e.g., Solana addresses) are properly used
      const toAddress = recipientAddress || userAddress;
      
      // Validate toAddress format if provided
      if (recipientAddress && recipientAddress.toLowerCase() !== userAddress.toLowerCase()) {
        console.log('[LiFiExecutor] Using custom recipient address:', {
          recipientAddress,
          userAddress,
          note: 'User has specified a different recipient address (may be from different chain)',
        });
      }

      // CRITICAL FIX: Set fromAddress and toAddress in all route steps
      // LiFi SDK requires action.fromAddress and action.toAddress to be set for each step
      // This is especially important for cross-chain swaps
      if (lifiRoute.steps && Array.isArray(lifiRoute.steps)) {
        lifiRoute.steps.forEach((step, index) => {
          // Set addresses in the main action
          if (step.action && typeof step.action === 'object') {
            const action = step.action as any;
            
            // Always set fromAddress (user's wallet address)
            // This is required by LiFi SDK for all actions
            action.fromAddress = userAddress;
            
            // Set toAddress for cross-chain swaps (recipient address)
            // For same-chain swaps, toAddress can be the same as fromAddress
            // For cross-chain swaps, toAddress should be the recipient on the destination chain
            // If not set, use recipientAddress or fallback to userAddress
            if (!action.toAddress) {
              action.toAddress = toAddress;
            }
            
            // Validate that addresses are set
            if (!action.fromAddress) {
              throw new SwapExecutionError(
                `Step ${index + 1}: fromAddress is required but not set`,
                SwapErrorCode.INVALID_ROUTE,
                'lifi'
              );
            }
          } else {
            // If step doesn't have an action, that's unusual but we'll log a warning
            console.warn(`[LiFiExecutor] Step ${index + 1} does not have an action object`);
          }
          
          // Also check for nested actions (some routes have multiple actions)
          if (step.includedSteps && Array.isArray(step.includedSteps)) {
            step.includedSteps.forEach((includedStep: any, includedIndex: number) => {
              if (includedStep.action && typeof includedStep.action === 'object') {
                const action = includedStep.action as any;
                action.fromAddress = userAddress;
                if (!action.toAddress) {
                  action.toAddress = toAddress;
                }
                
                // Validate nested action addresses
                if (!action.fromAddress) {
                  throw new SwapExecutionError(
                    `Step ${index + 1}, included step ${includedIndex + 1}: fromAddress is required but not set`,
                    SwapErrorCode.INVALID_ROUTE,
                    'lifi'
                  );
      }
              }
            });
          }
        });
      } else {
        throw new SwapExecutionError(
          'LiFi route has no steps',
          SwapErrorCode.INVALID_ROUTE,
          'lifi'
        );
      }
      
      // Also set route-level addresses if they exist
      if (lifiRoute.fromAddress !== userAddress) {
        lifiRoute.fromAddress = userAddress;
      }
      if (!lifiRoute.toAddress) {
        lifiRoute.toAddress = toAddress;
      }

      // CRITICAL: Ensure LiFi SDK providers are configured before execution
      // This is a safety check in case the provider component hasn't run yet
      await this.ensureProvidersConfigured();

      // CRITICAL: Ensure chains are loaded in SDK config
      // This is especially important for Solana (chain ID 1151111081099710)
      await this.ensureChainsLoaded();

      // Update status
      onStatusUpdate?.({
        stage: 'preparing',
        message: 'Preparing LiFi swap...',
      });

      // Execute route using LiFi SDK
      onStatusUpdate?.({
        stage: 'signing',
        message: 'Please sign the transaction in your wallet...',
      });
      console.log('lifiRoute', lifiRoute);
      const executedRoute = await executeRoute(lifiRoute, {
        updateRouteHook: (updatedRoute: RouteExtended) => {
          // Extract status from route
          const latestStep = updatedRoute.steps[0];
          const latestProcess = latestStep?.execution?.process?.slice(-1)[0];

          if (latestProcess) {
            const status = latestProcess.status;
            const txHash = latestProcess.txHash;

            // Map LiFi status to our status
            let stage: 'preparing' | 'signing' | 'submitting' | 'confirming' | 'completed' | 'failed' = 'confirming';
            let message = `Status: ${status}`;

            if (status === 'PENDING' || status === 'STARTED') {
              stage = 'preparing';
              message = 'Preparing transaction...';
            } else if (status === 'ACTION_REQUIRED' || status === 'MESSAGE_REQUIRED' || status === 'RESET_REQUIRED') {
              stage = 'signing';
              message = 'Please sign the transaction in your wallet...';
            } else if (status === 'DONE') {
              stage = 'completed';
              message = 'Swap completed successfully!';
            } else if (status === 'FAILED' || status === 'CANCELLED') {
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
        acceptExchangeRateUpdateHook: async () => {
          // Ask user if they want to accept exchange rate update
          return confirm('Exchange rate has changed. Do you want to continue?');
        },
      });

      // Extract transaction hashes from executed route
      const txHashes: string[] = [];
      executedRoute.steps.forEach((step) => {
        step.execution?.process?.forEach((process) => {
          if (process.txHash) {
            txHashes.push(process.txHash);
          }
        });
      });

      if (txHashes.length === 0) {
        throw new SwapExecutionError(
          'No transaction hash found in executed route',
          SwapErrorCode.TRANSACTION_FAILED,
          'lifi'
        );
      }

      // Get primary transaction hash (first one)
      const primaryTxHash = txHashes[0];

      // Calculate actual output amount (if available)
      const actualToAmount = executedRoute.toAmount
        ? (BigInt(executedRoute.toAmount) / BigInt(10 ** params.toToken.decimals!)).toString()
        : undefined;

      onStatusUpdate?.({
        stage: 'completed',
        message: 'Swap completed successfully!',
        txHash: primaryTxHash,
      });

      return {
        success: true,
        txHash: primaryTxHash,
        txHashes: txHashes.length > 1 ? txHashes : undefined,
        receipt: executedRoute,
        actualToAmount,
      };
    } catch (error) {
      // Handle balance errors specifically
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        // Check if it's a LiFi BalanceError
        if (errorMessage.includes('balance') && (errorMessage.includes('too low') || errorMessage.includes('insufficient'))) {
          // This could be a false positive if wallet client address doesn't match userAddress
          if (this.currentUserAddress) {
            console.error('[LiFiExecutor] Balance error detected:', {
              error: error.message,
              userAddress: this.currentUserAddress,
              note: 'LiFi SDK may be checking balance for wrong address. Verify wallet client matches userAddress.',
            });
          }
          
          // Provide a more helpful error message
          throw new SwapExecutionError(
            `Insufficient balance for this swap. Please ensure you have enough ${params.fromToken?.symbol || 'tokens'} in your wallet.`,
            SwapErrorCode.INSUFFICIENT_BALANCE,
            'lifi',
            error
          );
        }
      }
      
      const swapError = createSwapError(error, SwapErrorCode.TRANSACTION_FAILED, 'lifi');
      
      onStatusUpdate?.({
        stage: 'failed',
        message: formatErrorMessage(swapError),
        error: swapError,
      });

      throw swapError;
    } finally {
      // Clear stored userAddress after execution
      this.currentUserAddress = null;
    }
  }

  /**
   * Ensure LiFi SDK providers are configured
   * This is a fallback in case the provider component hasn't configured them yet
   */
  private async ensureProvidersConfigured(): Promise<void> {
    try {
      // Check if EVM provider is already configured
      const existingProvider = config.getProvider(ChainType.EVM);
      
      if (existingProvider) {
        console.log('[LiFiExecutor] EVM provider already configured');
        return;
      }

      console.log('[LiFiExecutor] Providers not configured, configuring now...');

      if (typeof window === 'undefined') {
        throw new Error('Cannot configure providers on server side');
      }

      // Get wagmi config from global reference
      const wagmiConfig = getWagmiConfigForLiFi();
      
      if (!wagmiConfig) {
        throw new SwapExecutionError(
          'Wagmi config not found. Please ensure wallet is connected and LiFiSDKProvider is mounted.',
          SwapErrorCode.WALLET_NOT_CONNECTED,
          'lifi'
        );
      }

      // Note: We don't check connection here because:
      // 1. userAddress is already validated at the start of execute()
      // 2. getWalletClient() will fail naturally if wallet is not connected
      // 3. This avoids issues with Wagmi v3 API changes

      // Configure EVM provider
      const newEvmProvider = EVM({
        getWalletClient: async (chainId?: number) => {
          try {
            // Try to get wallet client - this will fail if wallet is not connected
            const walletClient = await getWalletClient(wagmiConfig, chainId ? { chainId } : undefined);
            if (!walletClient) {
              throw new SwapExecutionError(
                'Failed to get wallet client. Please ensure your wallet is connected.',
                SwapErrorCode.WALLET_NOT_CONNECTED,
                'lifi'
              );
            }
            
            // Verify wallet client has an account
            if (!walletClient.account?.address) {
              throw new SwapExecutionError(
                'Wallet client missing account. Please reconnect your wallet.',
                SwapErrorCode.WALLET_NOT_CONNECTED,
                'lifi'
              );
            }
            
            // CRITICAL: Verify wallet client address matches userAddress
            // This ensures we're using the correct wallet that the user selected
            const walletAddress = walletClient.account.address.toLowerCase();
            if (this.currentUserAddress && walletAddress !== this.currentUserAddress) {
              console.warn('[LiFiExecutor] Wallet client address mismatch:', {
                expected: this.currentUserAddress,
                actual: walletAddress,
                message: 'Wallet client address does not match userAddress. This may cause balance check failures.',
              });
              // Note: We still return the wallet client, but LiFi SDK will use the addresses
              // we set in the route (fromAddress/toAddress) for balance checks
            }
            
            console.log('[LiFiExecutor] Wallet client obtained:', {
              chainId: walletClient.chain?.id,
              account: walletAddress,
              matchesUserAddress: walletAddress === this.currentUserAddress,
            });
            
            return walletClient;
          } catch (error) {
            // Handle "Connector not connected" error specifically
            if (error instanceof Error && (error.message.includes('not connected') || error.message.includes('Connector'))) {
              throw new SwapExecutionError(
                'Wallet is not connected. Please connect your wallet before executing a swap.',
                SwapErrorCode.WALLET_NOT_CONNECTED,
                'lifi'
              );
            }
            throw error;
          }
        },
        switchChain: async (targetChainId: number) => {
          try {
            // Switch chain - this will fail if wallet is not connected
            const chain = await switchChain(wagmiConfig, { chainId: targetChainId });
            const walletClient = await getWalletClient(wagmiConfig, { chainId: chain.id });
            if (!walletClient) {
              throw new SwapExecutionError(
                `Failed to get wallet client for chain ${targetChainId}. Please ensure your wallet is connected.`,
                SwapErrorCode.WALLET_NOT_CONNECTED,
                'lifi'
              );
            }
            
            // Verify wallet client has an account
            if (!walletClient.account?.address) {
              throw new SwapExecutionError(
                'Wallet client missing account. Please reconnect your wallet.',
                SwapErrorCode.WALLET_NOT_CONNECTED,
                'lifi'
              );
            }
            return walletClient;
          } catch (error) {
            // Handle "Connector not connected" error specifically
            if (error instanceof Error && error.message.includes('not connected')) {
              throw new SwapExecutionError(
                'Wallet is not connected. Please connect your wallet before executing a swap.',
                SwapErrorCode.WALLET_NOT_CONNECTED,
                'lifi'
              );
            }
            throw error;
          }
        },
      });

      config.setProviders([newEvmProvider]);
      console.log('[LiFiExecutor] Providers configured successfully');
    } catch (error) {
      console.error('[LiFiExecutor] Error ensuring providers configured:', error);
      
      // If it's already a SwapExecutionError, re-throw it
      if (error instanceof SwapExecutionError) {
        throw error;
      }
      
      // Otherwise, wrap it
      throw new SwapExecutionError(
        `Failed to configure LiFi SDK providers: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure your wallet is connected.`,
        SwapErrorCode.WALLET_NOT_CONNECTED,
        'lifi'
      );
    }
  }

  /**
   * Convert RouterRoute to LiFi RouteExtended format
   * Ensures chain IDs are in LiFi format (not canonical)
   * 
   * The raw route from LiFi adapter should already have LiFi chain IDs,
   * but we verify and fix them if needed (especially for Solana: 1151111081099710)
   */
  private convertToLiFiRoute(raw: any): RouteExtended {
    // If raw is already a RouteExtended (has steps array), return it
    if (raw.steps && Array.isArray(raw.steps) && raw.steps.length > 0) {
      const route = raw as RouteExtended;
      
      // CRITICAL: Ensure chain IDs are in LiFi format
      // The route from backend should already have LiFi chain IDs, but verify
      // This is especially important for Solana (1151111081099710)
      if (route.fromChainId !== undefined) {
        route.fromChainId = this.convertToLiFiChainId(route.fromChainId);
      }
      if (route.toChainId !== undefined) {
        route.toChainId = this.convertToLiFiChainId(route.toChainId);
      }
      
      // Also update chain IDs in steps if they exist
      if (route.steps) {
        route.steps.forEach((step) => {
          if (step.action) {
            const action = step.action as any;
            // LiFi actions use fromChainId and toChainId, not fromChain/toChain
            if (action.fromChainId !== undefined) {
              action.fromChainId = this.convertToLiFiChainId(action.fromChainId);
            }
            if (action.toChainId !== undefined) {
              action.toChainId = this.convertToLiFiChainId(action.toChainId);
            }
            // Also check for fromChain/toChain (legacy format)
            if (action.fromChain !== undefined) {
              action.fromChain = this.convertToLiFiChainId(action.fromChain);
            }
            if (action.toChain !== undefined) {
              action.toChain = this.convertToLiFiChainId(action.toChain);
            }
          }
        });
      }
      
      return route;
    }

    // If raw is a quote (LiFiStep), convert it to route
    if (raw.action || raw.tool) {
      try {
        const route = convertQuoteToRoute(raw as LiFiStep);
        
        // Ensure chain IDs are in LiFi format
        if (route.fromChainId !== undefined) {
          route.fromChainId = this.convertToLiFiChainId(route.fromChainId);
        }
        if (route.toChainId !== undefined) {
          route.toChainId = this.convertToLiFiChainId(route.toChainId);
        }
        
        return route;
      } catch (error) {
        throw new SwapExecutionError(
          `Failed to convert LiFi quote to route: ${error instanceof Error ? error.message : 'Unknown error'}`,
          SwapErrorCode.INVALID_ROUTE,
          'lifi'
        );
      }
    }

    // Otherwise, route format is invalid
    throw new SwapExecutionError(
      'LiFi route format is invalid. Expected RouteExtended or LiFiStep.',
      SwapErrorCode.INVALID_ROUTE,
      'lifi'
    );
  }

  /**
   * Ensure chains are loaded in SDK config
   * This is critical for Solana chain ID recognition
   */
  private async ensureChainsLoaded(): Promise<void> {
    try {
      // Check if chains are already loaded
      const chains = await config.getChains();
      
      if (chains && chains.length > 0) {
        console.log(`[LiFiExecutor] Chains already loaded: ${chains.length} chains`);
        return;
      }

      console.log('[LiFiExecutor] Chains not loaded, loading now...');

      // Load both EVM and Solana chains
      const [evmChains, solanaChains] = await Promise.all([
        getChains({ chainTypes: [ChainType.EVM] }),
        getChains({ chainTypes: [ChainType.SVM] }),
      ]);

      const allChains = [...evmChains, ...solanaChains];
      config.setChains(allChains);

      console.log(`[LiFiExecutor] Loaded ${allChains.length} chains:`, {
        evm: evmChains.length,
        solana: solanaChains.length,
      });
    } catch (error) {
      console.error('[LiFiExecutor] Error loading chains:', error);
      // Don't throw - execution might still work if chains are loaded elsewhere
    }
  }

  /**
   * Convert canonical chain ID to LiFi chain ID
   * This is critical for cross-chain swaps involving Solana
   * 
   * Handles both cases:
   * 1. Canonical chain ID (e.g., 7565164 for Solana) → LiFi chain ID (1151111081099710)
   * 2. Already LiFi chain ID → returns as-is
   */
  private convertToLiFiChainId(chainId: number | string | undefined): number {
    if (!chainId) {
      throw new SwapExecutionError(
        'Chain ID is required',
        SwapErrorCode.INVALID_ROUTE,
        'lifi'
      );
    }

    const numericChainId = typeof chainId === 'string' ? parseInt(chainId, 10) : chainId;
    
    if (isNaN(numericChainId)) {
      throw new SwapExecutionError(
        `Invalid chain ID: ${chainId}`,
        SwapErrorCode.INVALID_ROUTE,
        'lifi'
      );
    }

    try {
      const { getCanonicalChain, getCanonicalChainByProviderId } = require('@/lib/backend/registry/chains');
      
      // First, check if this is already a LiFi chain ID by looking it up in registry
      const chainByLiFiId = getCanonicalChainByProviderId('lifi', numericChainId);
      if (chainByLiFiId) {
        // This is already a LiFi chain ID, return as-is
        return numericChainId;
      }
      
      // If not found as LiFi ID, check if it's a canonical chain ID
      const canonicalChain = getCanonicalChain(numericChainId);
      
      if (canonicalChain && canonicalChain.providerIds.lifi !== null && canonicalChain.providerIds.lifi !== undefined) {
        // Convert canonical chain ID to LiFi chain ID
        const lifiChainId = typeof canonicalChain.providerIds.lifi === 'number' 
          ? canonicalChain.providerIds.lifi 
          : parseInt(String(canonicalChain.providerIds.lifi), 10);
        
        if (!isNaN(lifiChainId)) {
          console.log(`[LiFiExecutor] Converted chain ID ${numericChainId} → ${lifiChainId} (${canonicalChain.name})`);
          return lifiChainId;
        }
      }
      
      // If not found in registry, assume it's already a LiFi chain ID
      // This handles cases where the route already has LiFi chain IDs
      // or chains not yet in our registry
      console.log(`[LiFiExecutor] Using chain ID as-is (not in registry): ${numericChainId}`);
      return numericChainId;
    } catch (error) {
      console.warn('[LiFiExecutor] Error converting chain ID, using as-is:', error);
      // Fallback: assume it's already a LiFi chain ID
      return numericChainId;
    }
  }
}

