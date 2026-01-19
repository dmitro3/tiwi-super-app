/**
 * Universal Routing System
 * 
 * Main entry point for the new On-Demand Routing System.
 * This module replaces the old graph-based implementation.
 * 
 * @see docs/ON_DEMAND_ROUTING_PLAN.md for implementation plan
 */

// Quote Aggregator (kept for now, will be updated)
export {
  QuoteAggregator,
  getQuoteAggregator,
  RouteValidator,
  getRouteValidator,
} from './quote-aggregator';

// Integration (kept for now, will be updated)
export {
  RouteServiceEnhancer,
  getRouteServiceEnhancer,
} from './integration';

// Bridges (kept - using LiFi)
export {
  BaseBridgeAdapter,
  StargateAdapter,
  SocketAdapter,
  BridgeRegistry,
  getBridgeRegistry,
  CrossChainRouteBuilder,
  getCrossChainRouteBuilder,
  BridgeComparator,
  getBridgeComparator,
  BridgeStatusTracker,
  getBridgeStatusTracker,
} from './bridges';

// Types
export type {
  UniversalRoute,
  RouteStep,
  QuoteSource,
  AggregatedQuote,
  QuoteAggregationOptions,
  ValidationResult,
  EnhancedRouteResponse,
  BridgeQuote,
  BridgeExecutionResult,
  BridgeStatus,
  CrossChainRoute,
  BridgeAdapter,
  CrossChainRouteRequest,
  BridgeComparison,
} from './types';

/**
 * Initialize routing system
 * 
 * This will be updated as we implement the new on-demand routing.
 */
export async function initializeRoutingSystem(): Promise<void> {
  console.log('[OnDemandRouting] Initializing routing system...');
  console.log('[OnDemandRouting] On-demand routing system (Phase 1-10)');
  console.log('[OnDemandRouting] See docs/ON_DEMAND_ROUTING_PLAN.md for progress');
}
