/**
 * Bridges Module
 * 
 * Exports for the bridges module.
 */

export { BaseBridgeAdapter } from './base-bridge';
export { StargateAdapter } from './stargate-adapter';
export { SocketAdapter } from './socket-adapter';
export { BridgeRegistry, getBridgeRegistry } from './bridge-registry';
export { CrossChainRouteBuilder, getCrossChainRouteBuilder } from './cross-chain-route-builder';
export { BridgeComparator, getBridgeComparator } from './bridge-comparator';
export { BridgeStatusTracker, getBridgeStatusTracker } from './status-tracker';

export type {
  BridgeQuote,
  BridgeExecutionResult,
  BridgeStatus,
  CrossChainRoute,
  BridgeAdapter,
  CrossChainRouteRequest,
  BridgeComparison,
} from './types';


