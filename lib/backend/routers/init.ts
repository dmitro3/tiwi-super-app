/**
 * Router Initialization
 * 
 * Initializes and registers all available routers.
 * This should be called once at application startup.
 */

import { getRouterRegistry } from './registry';
import { LiFiAdapter } from './adapters/lifi-adapter';
import { PancakeSwapAdapter } from './adapters/pancakeswap-adapter';
import { UniswapAdapter } from './adapters/uniswap-adapter';
import { JupiterAdapter } from './adapters/jupiter-adapter';

/**
 * Initialize and register all routers
 * Call this once at application startup
 * 
 * Router Priority Order (lower = higher priority):
 * - LiFi (0): Primary aggregator, supports cross-chain
 * - Jupiter (1): Solana aggregator, same-chain only
 * - PancakeSwap (5): BNB Chain fallback, same-chain only
 * - Uniswap (10): EVM chains fallback, same-chain only
 */
export function initializeRouters(): void {
  const registry = getRouterRegistry();
  
  // Register LiFi router (priority 0 - highest)
  const lifiAdapter = new LiFiAdapter();
  registry.register(lifiAdapter);
  
  // Register Jupiter router (priority 1 - for Solana)
  const jupiterAdapter = new JupiterAdapter();
  registry.register(jupiterAdapter);
  
  // Register PancakeSwap router (priority 5 - for BNB Chain)
  const pancakeswapAdapter = new PancakeSwapAdapter();
  registry.register(pancakeswapAdapter);
  
  // Register Uniswap router (priority 10 - for other EVM chains)
  const uniswapAdapter = new UniswapAdapter();
  registry.register(uniswapAdapter);
  
  console.log('[RouterInit] Registered routers:', registry.getRouterCount());
}

/**
 * Auto-initialize routers when this module is imported
 * This ensures routers are registered before use
 */
initializeRouters();

