/**
 * Token Aggregation Service
 * 
 * Orchestrates token fetching from multiple providers.
 * Implements provider selection, fallback logic, and result aggregation.
 * 
 * Key Features:
 * - Chain-specific primary providers (Solana→Jupiter, Cosmos→Squid, EVM→LiFi/Relay)
 * - DexScreener fallback for search
 * - Similarity scoring and ranking
 * - Non-blocking background enrichment
 */

import { getProviderRegistry } from '@/lib/backend/providers/registry';
import { getCanonicalChainByProviderId } from '@/lib/backend/registry/chains';
import { resolveChain } from '@/lib/backend/registry/chain-resolver';
import { calculateSimilarity } from '@/lib/shared/utils/search';
import { mixTokensWithPriority } from '@/lib/backend/utils/token-mixer';
import { getTokenEnrichmentService } from './token-enrichment-service';
import type { NormalizedToken, FetchTokensParams } from '@/lib/backend/types/backend-tokens';
import type { BaseTokenProvider } from '@/lib/backend/providers/base';

// ============================================================================
// Token Aggregation Service
// ============================================================================

export class TokenAggregationService {
  private registry = getProviderRegistry();

  /**
   * Search tokens across providers
   * 
   * Flow:
   * 1. Try primary providers (chain-specific)
   * 2. If low results or no exact match, try DexScreener
   * 3. Normalize and deduplicate
   * 4. Apply similarity scoring
   * 5. Sort and limit
   * 6. Apply balanced mixing (if multi-chain "all tokens" scenario)
   * 7. Return immediately (fast response)
   * 8. Start background enrichment (non-blocking)
   */
  async searchTokens(params: FetchTokensParams): Promise<NormalizedToken[]> {
    const { chainIds, search: query, limit = 30 } = params;
    
    // Determine which chains to search
    const chainsToSearch = chainIds && chainIds.length > 0 
      ? chainIds 
      : []; // If no chains specified, we'll need to handle this differently
    
    if (chainsToSearch.length === 0) {
      // No chains specified: search all supported chains
      // For now, return empty (will be handled by TokenService)
      return [];
    }
    
    // Detect if this is an "all networks" scenario (multiple chains, no search query)
    const isAllNetworksRequest = !query && chainsToSearch.length > 1;
    
    // For "all networks", fetch more tokens per chain to ensure good mixing
    const fetchLimit = isAllNetworksRequest ? limit * 2 : limit;
    
    let allResults: NormalizedToken[] = [];
    
    // NEW FLOW: If query exists, prioritize DexScreener (better search results)
    // Otherwise, use primary providers first (for popular tokens)
    if (query && query.trim()) {
      // Step 1: Fetch from DexScreener first (primary for search)
      const dexResults = await this.fetchFromDexScreener(chainsToSearch, query, fetchLimit);
      allResults.push(...dexResults);
      
      // Step 2: Fetch from primary providers in parallel (for additional results)
      const primaryResults = await this.fetchFromPrimaryProviders(chainsToSearch, query, fetchLimit);
      allResults.push(...primaryResults);
    } else {
      // No query: use primary providers first (for popular tokens)
      const primaryResults = await this.fetchFromPrimaryProviders(chainsToSearch, query, fetchLimit);
      allResults.push(...primaryResults);
      
      // Step 2: Fetch from DexScreener as supplement (for additional tokens)
      const dexResults = await this.fetchFromDexScreener(chainsToSearch, query, fetchLimit);
      allResults.push(...dexResults);
    }
    
    // Step 3: Normalize and deduplicate
    const normalized = this.normalizeAndDeduplicate(allResults);
    
    // Step 4: Apply similarity scoring (if query provided)
    const scored = query 
      ? this.applySimilarityScoring(normalized, query)
      : normalized.map(token => ({ token, score: 1, isExactMatch: false }));
    
    // Step 5: Sort and limit
    const sorted = scored.sort((a, b) => {
      // Sort by: exact match > similarity score > liquidity
      if (a.isExactMatch && !b.isExactMatch) return -1;
      if (!a.isExactMatch && b.isExactMatch) return 1;
      if (a.score !== b.score) return b.score - a.score;
      
      // If scores equal, sort by liquidity (if available)
      const liquidityA = a.token.liquidity || 0;
      const liquidityB = b.token.liquidity || 0;
      return liquidityB - liquidityA;
    });
    
    const sortedTokens = sorted.map(item => item.token);
    
    // Step 6: Apply balanced mixing for "all networks" scenario
    let finalTokens: NormalizedToken[];
    if (isAllNetworksRequest) {
      // Use balanced mixing: prioritize BNB Chain, limit tokens per chain
      finalTokens = mixTokensWithPriority(
        sortedTokens,
        limit,
        56, // BNB Chain priority
        3,  // Max 3 tokens per chain
        6   // Max 6 tokens for BNB Chain
      );
    } else {
      // Single chain or search query: just limit
      finalTokens = sortedTokens.slice(0, limit);
    }
    
    // Step 7: Enrichment is already done by DexScreener (synchronous)
    // Only start background enrichment for router formats (non-blocking)
    this.enrichRouterFormatsInBackground(finalTokens);
    
    // Step 8: Return immediately (fast response)
    return finalTokens;
  }

  /**
   * Fetch tokens from primary providers (chain-specific)
   */
  private async fetchFromPrimaryProviders(
    chainIds: number[],
    query?: string,
    limit: number = 30
  ): Promise<NormalizedToken[]> {
    const results: NormalizedToken[] = [];
    
    // Group chains by type to optimize provider selection
    // For priority chains, we'll resolve them individually in fetchFromProvider
    // So we'll just pass all chainIds to providers and let them handle it
    const chainsByType = new Map<string, number[]>();
    for (const chainId of chainIds) {
      // Try to resolve chain to get its type
      const chain = await resolveChain(chainId);
      if (!chain) continue;
      
      const type = chain.type;
      if (!chainsByType.has(type)) {
        chainsByType.set(type, []);
      }
      chainsByType.get(type)!.push(chainId);
    }
    
    // Fetch from primary providers for each chain type
    const fetchPromises: Promise<NormalizedToken[]>[] = [];
    
    for (const [type, chainIdsForType] of chainsByType.entries()) {
      for (const chainId of chainIdsForType) {
        const primaryProviders = await this.registry.getPrimaryProviders(chainId);
        
        // Fetch from all primary providers in parallel
        for (const provider of primaryProviders) {
          fetchPromises.push(
            this.fetchFromProvider(provider, { chainIds: [chainId], search: query, limit })
          );
        }
      }
    }
    
    // Wait for all primary provider fetches
    const providerResults = await Promise.allSettled(fetchPromises);
    
    // Collect successful results
    for (const result of providerResults) {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      } else {
        console.warn('[TokenAggregationService] Provider fetch failed:', result.reason);
      }
    }
    
    return results;
  }

  /**
   * Fetch tokens from DexScreener (fallback)
   */
  private async fetchFromDexScreener(
    chainIds: number[],
    query?: string,
    limit: number = 100
  ): Promise<NormalizedToken[]> {
    const dexscreener = this.registry.getProvider('dexscreener');
    if (!dexscreener) return [];
    
    try {
      return await this.fetchFromProvider(dexscreener, { chainIds, search: query, limit });
    } catch (error) {
      console.warn('[TokenAggregationService] DexScreener fetch failed:', error);
      return [];
    }
  }

  /**
   * Fetch tokens from a single provider
   */
  private async fetchFromProvider(
    provider: BaseTokenProvider,
    params: FetchTokensParams
  ): Promise<NormalizedToken[]> {
    try {
      const providerTokens = await provider.fetchTokens(params);
      // console.log("🚀 ~ TokenAggregationService ~ fetchFromProvider ~ providerTokens:", providerTokens)
      const normalized: NormalizedToken[] = [];
      
      for (const providerToken of providerTokens) {
        const providerChainId = typeof providerToken.chainId === 'number'
          ? providerToken.chainId
          : parseInt(String(providerToken.chainId), 10);
        
        // First try to find canonical chain by provider-specific ID
        // This handles cases like LiFi Solana (1151111081099710) -> canonical (7565164)
        let canonicalChain = getCanonicalChainByProviderId(
          provider.name as 'lifi' | 'dexscreener' | 'relay' | 'squid',
          providerChainId
        );
        
        // If not found, use dynamic chain resolver (handles priority chains)
        if (!canonicalChain) {
          canonicalChain = await resolveChain(providerChainId);
        }
        
        if (!canonicalChain) {
          console.warn(
            `[TokenAggregationService] Could not find canonical chain for provider ${provider.name} chain ID ${providerChainId}, skipping token ${providerToken.address}`
          );
          continue;
        }
        
        const normalizedToken = provider.normalizeToken(providerToken, canonicalChain);
        normalized.push(normalizedToken);
      }
      
      return normalized;
    } catch (error) {
      console.error(`[TokenAggregationService] Error fetching from ${provider.name}:`, error);
      return [];
    }
  }

  /**
   * Check if we should use DexScreener as fallback
   */
  private shouldUseDexScreener(
    primaryResults: NormalizedToken[],
    query?: string
  ): boolean {
    if (!query || !query.trim()) return false;
    
    // Use DexScreener if:
    // 1. Primary provider has < 3 results
    // 2. No exact/contains match found
    // 3. Query is > 3 characters (likely intentional search)
    
    if (primaryResults.length >= 3) {
      const hasExactMatch = primaryResults.some(token => {
        const lowerQuery = query.toLowerCase();
        return (
          token.symbol.toLowerCase() === lowerQuery ||
          token.name.toLowerCase() === lowerQuery ||
          token.symbol.toLowerCase().includes(lowerQuery) ||
          token.name.toLowerCase().includes(lowerQuery)
        );
      });
      if (hasExactMatch) return false;
    }
    
    return primaryResults.length < 3 || query.length > 3;
  }

  /**
   * Normalize and deduplicate tokens
   */
  private normalizeAndDeduplicate(tokens: NormalizedToken[]): NormalizedToken[] {
    const seen = new Map<string, NormalizedToken>();
    
    for (const token of tokens) {
      const key = `${token.chainId}:${token.address.toLowerCase()}`;
      
      if (!seen.has(key)) {
        seen.set(key, token);
      } else {
        // Merge providers if same token from multiple providers
        const existing = seen.get(key)!;
        const mergedProviders = [...new Set([...existing.providers, ...token.providers])];
        seen.set(key, {
          ...existing,
          providers: mergedProviders,
          // Prefer non-empty fields
          logoURI: existing.logoURI || token.logoURI,
          priceUSD: existing.priceUSD || token.priceUSD,
          liquidity: existing.liquidity || token.liquidity,
          volume24h: existing.volume24h || token.volume24h,
        });
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Apply similarity scoring to tokens
   */
  private applySimilarityScoring(
    tokens: NormalizedToken[],
    query: string
  ): Array<{ token: NormalizedToken; score: number; isExactMatch: boolean }> {
    const lowerQuery = query.toLowerCase().trim();
    const threshold = 0.5; // 50% similarity threshold
    
    return tokens
      .map(token => {
        // Calculate similarity scores
        const nameScore = calculateSimilarity(lowerQuery, token.name.toLowerCase());
        const symbolScore = calculateSimilarity(lowerQuery, token.symbol.toLowerCase());
        const addressScore = token.address.toLowerCase().includes(lowerQuery) ? 0.8 : 0;
        
        // Use highest score
        const maxScore = Math.max(nameScore, symbolScore, addressScore);
        
        // Check for exact match
        const isExactMatch = 
          token.symbol.toLowerCase() === lowerQuery ||
          token.name.toLowerCase() === lowerQuery ||
          token.address.toLowerCase() === lowerQuery;
        
        return {
          token,
          score: maxScore,
          isExactMatch,
        };
      })
      .filter(item => item.score >= threshold || item.isExactMatch); // Keep if above threshold or exact match
  }

  /**
   * Background enrichment for router formats only (non-blocking, fire-and-forget)
   * DexScreener data (price, change, volume, liquidity) is already included synchronously
   */
  private enrichRouterFormatsInBackground(tokens: NormalizedToken[]): void {
    const enrichmentService = getTokenEnrichmentService();
    enrichmentService.enrichRouterFormatsInBackground(tokens);
  }
}

// Singleton instance
let aggregationServiceInstance: TokenAggregationService | null = null;

/**
 * Get singleton TokenAggregationService instance
 */
export function getTokenAggregationService(): TokenAggregationService {
  if (!aggregationServiceInstance) {
    aggregationServiceInstance = new TokenAggregationService();
  }
  return aggregationServiceInstance;
}

