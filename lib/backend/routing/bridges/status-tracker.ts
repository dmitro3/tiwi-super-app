/**
 * Bridge Status Tracker
 * 
 * Tracks cross-chain bridge transaction status.
 */

import type { BridgeStatus } from './types';
import { getBridgeRegistry } from './bridge-registry';

/**
 * Status tracking entry
 */
interface StatusEntry {
  bridgeId: string;
  transactionHash: string;
  fromChain: number;
  toChain: number;
  status: BridgeStatus;
  lastUpdate: number;
  pollCount: number;
}

/**
 * Bridge Status Tracker
 * 
 * Tracks and polls bridge transaction status.
 */
export class BridgeStatusTracker {
  private bridgeRegistry = getBridgeRegistry();
  private trackedStatuses: Map<string, StatusEntry> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;
  
  /**
   * Start tracking a bridge transaction
   */
  async trackBridge(
    bridgeId: string,
    transactionHash: string,
    fromChain: number,
    toChain: number
  ): Promise<BridgeStatus | null> {
    const bridge = this.bridgeRegistry.getBridge(bridgeId);
    if (!bridge) {
      return null;
    }
    
    // Get initial status
    const status = await bridge.getBridgeStatus(transactionHash, fromChain);
    if (!status) {
      return null;
    }
    
    // Store tracking entry
    const key = `${bridgeId}-${transactionHash}`;
    this.trackedStatuses.set(key, {
      bridgeId,
      transactionHash,
      fromChain,
      toChain,
      status,
      lastUpdate: Date.now(),
      pollCount: 0,
    });
    
    // Start polling if not already started
    if (!this.pollingInterval) {
      this.startPolling();
    }
    
    return status;
  }
  
  /**
   * Get current status
   */
  async getStatus(
    bridgeId: string,
    transactionHash: string
  ): Promise<BridgeStatus | null> {
    const key = `${bridgeId}-${transactionHash}`;
    const entry = this.trackedStatuses.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Get fresh status from bridge
    const bridge = this.bridgeRegistry.getBridge(bridgeId);
    if (!bridge) {
      return entry.status;
    }
    
    const freshStatus = await bridge.getBridgeStatus(transactionHash, entry.fromChain);
    if (freshStatus) {
      entry.status = freshStatus;
      entry.lastUpdate = Date.now();
    }
    
    return entry.status;
  }
  
  /**
   * Stop tracking a bridge transaction
   */
  stopTracking(bridgeId: string, transactionHash: string): void {
    const key = `${bridgeId}-${transactionHash}`;
    this.trackedStatuses.delete(key);
    
    // Stop polling if no more tracked statuses
    if (this.trackedStatuses.size === 0 && this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
  
  /**
   * Start polling for status updates
   */
  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      await this.pollAllStatuses();
    }, 10000); // Poll every 10 seconds
  }
  
  /**
   * Poll all tracked statuses
   */
  private async pollAllStatuses(): Promise<void> {
    for (const [key, entry] of this.trackedStatuses.entries()) {
      // Skip if already completed or failed
      if (entry.status.status === 'completed' || entry.status.status === 'failed') {
        continue;
      }
      
      // Skip if polled too many times
      if (entry.pollCount > 100) {
        // Stop tracking after 100 polls (~16 minutes)
        this.trackedStatuses.delete(key);
        continue;
      }
      
      try {
        const bridge = this.bridgeRegistry.getBridge(entry.bridgeId);
        if (!bridge) {
          continue;
        }
        
        const freshStatus = await bridge.getBridgeStatus(
          entry.transactionHash,
          entry.fromChain
        );
        
        if (freshStatus) {
          entry.status = freshStatus;
          entry.lastUpdate = Date.now();
          entry.pollCount++;
        }
      } catch (error) {
        console.error(`[BridgeStatusTracker] Error polling status for ${key}:`, error);
      }
    }
  }
  
  /**
   * Get all tracked statuses
   */
  getAllTrackedStatuses(): StatusEntry[] {
    return Array.from(this.trackedStatuses.values());
  }
  
  /**
   * Clean up old completed/failed statuses
   */
  cleanup(maxAge: number = 3600000): void {
    // Remove statuses older than maxAge (default 1 hour)
    const now = Date.now();
    for (const [key, entry] of this.trackedStatuses.entries()) {
      if (
        (entry.status.status === 'completed' || entry.status.status === 'failed') &&
        now - entry.lastUpdate > maxAge
      ) {
        this.trackedStatuses.delete(key);
      }
    }
  }
}

// Singleton instance
let bridgeStatusTrackerInstance: BridgeStatusTracker | null = null;

/**
 * Get singleton BridgeStatusTracker instance
 */
export function getBridgeStatusTracker(): BridgeStatusTracker {
  if (!bridgeStatusTrackerInstance) {
    bridgeStatusTrackerInstance = new BridgeStatusTracker();
  }
  return bridgeStatusTrackerInstance;
}


