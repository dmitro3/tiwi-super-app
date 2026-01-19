/**
 * Bridge Registry
 * 
 * Registry for managing bridge adapters.
 */

import type { BridgeAdapter } from './types';
import { StargateAdapter } from './stargate-adapter';
import { SocketAdapter } from './socket-adapter';

/**
 * Bridge Registry
 * 
 * Manages bridge adapters and provides bridge selection.
 */
export class BridgeRegistry {
  private bridges: Map<string, BridgeAdapter> = new Map();
  
  constructor() {
    // Register default bridges
    this.register(new StargateAdapter());
    this.register(new SocketAdapter());
  }
  
  /**
   * Register a bridge adapter
   */
  register(bridge: BridgeAdapter): void {
    this.bridges.set(bridge.bridgeId, bridge);
  }
  
  /**
   * Get bridge by ID
   */
  getBridge(bridgeId: string): BridgeAdapter | undefined {
    return this.bridges.get(bridgeId);
  }
  
  /**
   * Get all bridges
   */
  getAllBridges(): BridgeAdapter[] {
    return Array.from(this.bridges.values());
  }
  
  /**
   * Get bridges that support a chain pair
   */
  async getBridgesForChainPair(
    fromChain: number,
    toChain: number
  ): Promise<BridgeAdapter[]> {
    const bridges: BridgeAdapter[] = [];
    
    for (const bridge of this.bridges.values()) {
      if (await bridge.supportsChainPair(fromChain, toChain)) {
        bridges.push(bridge);
      }
    }
    
    // Sort by priority (lower = higher priority)
    return bridges.sort((a, b) => a.getPriority() - b.getPriority());
  }
  
  /**
   * Get best bridge for a chain pair
   */
  async getBestBridge(
    fromChain: number,
    toChain: number
  ): Promise<BridgeAdapter | null> {
    const bridges = await this.getBridgesForChainPair(fromChain, toChain);
    return bridges.length > 0 ? bridges[0] : null;
  }
}

// Singleton instance
let bridgeRegistryInstance: BridgeRegistry | null = null;

/**
 * Get singleton BridgeRegistry instance
 */
export function getBridgeRegistry(): BridgeRegistry {
  if (!bridgeRegistryInstance) {
    bridgeRegistryInstance = new BridgeRegistry();
  }
  return bridgeRegistryInstance;
}


