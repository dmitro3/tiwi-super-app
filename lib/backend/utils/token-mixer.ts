/**
 * Token Mixing Utility
 * 
 * Mixes tokens from different chains in round-robin fashion.
 * This ensures tokens are interleaved rather than grouped by chain.
 * 
 * Platform-agnostic utility that can be used by any provider.
 */

import type { ProviderToken } from '@/lib/backend/types/backend-tokens';

/**
 * Mix tokens from different chains in round-robin fashion
 * 
 * Groups tokens by chain ID, then interleaves them so tokens from
 * different chains are evenly distributed in the result.
 * 
 * @param tokens - Array of tokens from multiple chains
 * @param limit - Maximum number of tokens to return
 * @returns Mixed array of tokens with interleaved chains
 */
export function mixTokensByChain(tokens: ProviderToken[], limit: number): ProviderToken[] {
  if (tokens.length === 0) return [];
  
  // Group tokens by chain ID
  const tokensByChain = new Map<number, ProviderToken[]>();
  for (const token of tokens) {
    const chainId = typeof token.chainId === 'number' ? token.chainId : parseInt(String(token.chainId), 10);
    if (!tokensByChain.has(chainId)) {
      tokensByChain.set(chainId, []);
    }
    tokensByChain.get(chainId)!.push(token);
  }
  
  // Round-robin mixing
  const mixed: ProviderToken[] = [];
  const chainIds = Array.from(tokensByChain.keys());
  const chainQueues = chainIds.map(id => tokensByChain.get(id)!);
  
  // Track current index for each chain
  const indices = new Array(chainIds.length).fill(0);
  
  // Mix tokens until we reach the limit or run out of tokens
  while (mixed.length < limit) {
    let addedAny = false;
    
    // Try to add one token from each chain in round-robin order
    for (let i = 0; i < chainQueues.length; i++) {
      if (mixed.length >= limit) break;
      
      const queue = chainQueues[i];
      const index = indices[i];
      
      if (index < queue.length) {
        mixed.push(queue[index]);
        indices[i]++;
        addedAny = true;
      }
    }
    
    // If we couldn't add any tokens, break
    if (!addedAny) break;
  }
  
  return mixed.slice(0, limit);
}

