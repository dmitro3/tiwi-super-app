/**
 * LiFi Token Provider
 * 
 * Real implementation using @lifi/sdk for fetching tokens and chains.
 */

import { getTokens, getChains, type Token, ChainType } from '@lifi/sdk';
import { initializeBackendLiFiSDK } from '@/lib/backend/config/lifi-sdk-config';

// Initialize LiFi SDK config for backend
initializeBackendLiFiSDK();
import { BaseTokenProvider } from './base';
import { getCanonicalChainByProviderId, getChainBadge, getCanonicalChain } from '@/lib/backend/registry/chains';
import { mixTokensByChain } from '@/lib/backend/utils/token-mixer';
import type {
  CanonicalChain,
  ProviderToken,
  ProviderChain,
  NormalizedToken,
  FetchTokensParams,
} from '@/lib/backend/types/backend-tokens';

export class LiFiProvider extends BaseTokenProvider {
  name = 'lifi';

  getChainId(canonicalChain: CanonicalChain): string | number | null {
    return canonicalChain.providerIds.lifi ?? null;
  }

  async fetchTokens(params: FetchTokensParams): Promise<ProviderToken[]> {
    try {
      const limit = params.limit ?? 30; // Default limit: 30
      
      // Import priority chains to check if chain is supported by LiFi
      const { PRIORITY_EVM_CHAINS } = await import('@/lib/backend/registry/chain-resolver');
      
      // Determine which chains to fetch
      let lifiChainIds: number[] = [];
      
      if (params.chainId) {
        // Single chain request
        const chainId = typeof params.chainId === 'number' ? params.chainId : parseInt(String(params.chainId), 10);
        if (!isNaN(chainId)) {
          // Check if chain is in static registry or priority list
          const canonicalChain = getCanonicalChain(chainId);
          if (canonicalChain) {
            // Use static registry mapping
            const lifiChainId = this.getChainId(canonicalChain);
            if (lifiChainId && typeof lifiChainId === 'number') {
              lifiChainIds.push(lifiChainId);
            }
          } else if (PRIORITY_EVM_CHAINS.has(chainId)) {
            // Priority chain: use chainId directly as LiFi chain ID
            lifiChainIds.push(chainId);
          }
        }
      } else if (params.chainIds && params.chainIds.length > 0) {
        // Multi-chain request: map canonical chain IDs to LiFi chain IDs
        for (const canonicalChainId of params.chainIds) {
          // First try static registry
          const canonicalChain = getCanonicalChain(canonicalChainId);
          if (canonicalChain) {
            const lifiChainId = this.getChainId(canonicalChain);
            if (lifiChainId && typeof lifiChainId === 'number') {
              lifiChainIds.push(lifiChainId);
            }
          } else if (PRIORITY_EVM_CHAINS.has(canonicalChainId)) {
            // Priority chain: use chainId directly as LiFi chain ID
            lifiChainIds.push(canonicalChainId);
          }
        }
      } else {
        // No chains specified
        return [];
      }
      
      if (lifiChainIds.length === 0) {
        return [];
      }
      
      // Single API call for all chains (LiFi supports chains array)
      return this.fetchTokensFromLiFi(lifiChainIds, params.search, limit);
    } catch (error: any) {
      console.error(`[LiFiProvider] Error fetching tokens:`, error);
      // Return empty array on error (graceful degradation)
      return [];
    }
  }

  /**
   * Fetch tokens from LiFi API (supports single or multiple chains in one call)
   */
  private async fetchTokensFromLiFi(
    lifiChainIds: number[],
    search?: string,
    limit: number = 30
  ): Promise<ProviderToken[]> {
    try {
      // Determine chain types from chain IDs (for filtering)
      const chainTypes = this.getChainTypes(lifiChainIds);
      
      // Build LiFi request parameters with extended support
      // Note: LiFi SDK requires extended to be either true or false (not boolean | undefined)
      if (search && search.trim()) {
        // Use extended mode for search to get more metadata
        const requestParams: {
          chains: number[];
          chainTypes?: ChainType[];
          limit?: number;
          search: string;
          extended: true; // Must be true (not boolean)
          minPriceUSD?: number;
        } = {
          chains: lifiChainIds,
          limit: limit,
          search: search.trim(),
          extended: true, // Extended mode for search
        };
        
        // Add chain types if we have them (helps LiFi filter)
        if (chainTypes.length > 0) {
          requestParams.chainTypes = chainTypes;
        }
        
        // Use extended response type
        const response = await getTokens(requestParams);
        return this.processLiFiResponse(response, lifiChainIds, limit);
      } else {
        // No search: use standard mode (no extended)
        const requestParams: {
          chains: number[];
          chainTypes?: ChainType[];
          orderBy?: 'marketCapUSD' | 'priceUSD' | 'volumeUSD24H' | 'fdvUSD';
          limit?: number;
          extended?: false;
        } = {
          chains: lifiChainIds,
          limit: limit,
          orderBy: 'volumeUSD24H', // Order by 24h volume for all tokens
        };
        
        // Add chain types if we have them (helps LiFi filter)
        if (chainTypes.length > 0) {
          requestParams.chainTypes = chainTypes;
        }
        
        const response = await getTokens(requestParams);
        return this.processLiFiResponse(response, lifiChainIds, limit);
      }
    } catch (error: any) {
      console.error(`[LiFiProvider] Error fetching tokens from LiFi:`, error);
      return [];
    }
  }
  
  /**
   * Process LiFi API response (handles both standard and extended responses)
   */
  private processLiFiResponse(
    response: any,
    lifiChainIds: number[],
    limit: number
  ): ProviderToken[] {
    // LiFi returns: { tokens: { [chainId]: Token[] } }
    // Collect all tokens from all chains
    const allTokens: ProviderToken[] = [];
    for (const chainId of lifiChainIds) {
      const tokens: Token[] = response.tokens[chainId] || [];
      for (const token of tokens) {
        allTokens.push({
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          logoURI: token.logoURI,
          priceUSD: token.priceUSD || '0',
          chainId: chainId, // LiFi chain ID
          raw: token, // Store raw token for debugging/execute route
        });
      }
    }
    
    // Mix tokens from different chains (round-robin style)
    // This ensures tokens are interleaved rather than grouped by chain
    return mixTokensByChain(allTokens, limit);
  }

  /**
   * Determine chain types from chain IDs
   * Returns array of LiFi ChainType enum values for filtering
   */
  private getChainTypes(lifiChainIds: number[]): ChainType[] {
    const chainTypes = new Set<ChainType>();
    
    for (const lifiChainId of lifiChainIds) {
      const canonicalChain = getCanonicalChainByProviderId('lifi', lifiChainId);
      if (canonicalChain) {
        // Map our chain type to LiFi ChainType enum
        switch (canonicalChain.type) {
          case 'EVM':
            chainTypes.add(ChainType.EVM);
            break;
          case 'Solana':
            chainTypes.add(ChainType.SVM); // Solana Virtual Machine
          case 'Sui': 
            chainTypes.add(ChainType.MVM);
            break;
          case 'Cosmos':
          case 'CosmosAppChain':
            // Cosmos chains might not be directly supported by LiFi
            // Skip for now
            break;
          default:
            break;
        }
      }
    }
    
    return Array.from(chainTypes);
  }



  async fetchChains(): Promise<ProviderChain[]> {
    try {
      // Import priority chain IDs from chain resolver (single source of truth)
      const { PRIORITY_EVM_CHAINS } = await import('@/lib/backend/registry/chain-resolver');
      const priorityEVMChainIds = PRIORITY_EVM_CHAINS;
      
      // Fetch EVM and SVM chains from LiFi (server-side filtering)
      const allChains = await getChains({ chainTypes: [ChainType.EVM, ChainType.SVM, ChainType.MVM] });
      
      const filteredChains = allChains.filter((chain: any) => {
        const chainId = chain.id;
        const chainType = chain.chainType || chain.type;
        
        // Include priority EVM chains only
        if (chainType === ChainType.EVM) {
          return priorityEVMChainIds.has(chainId);
        }
        
        // Include all SVM (Solana) chains
        if (chainType === ChainType.SVM) {
          return true;
        }
        
        return false;
      });
      
      return filteredChains.map((chain: any) => ({
        id: chain.id,
        name: chain.name,
        type: chain.chainType || chain.type,
        logoURI: chain.logoURI,
        nativeCurrency: chain.nativeCurrency
          ? {
              symbol: chain.nativeCurrency.symbol,
              decimals: chain.nativeCurrency.decimals,
            }
          : undefined,
        raw: chain, // Store raw chain for normalization
      }));
    } catch (error: any) {
      console.error(`[LiFiProvider] Error fetching chains:`, error);
      return [];
    }
  }

  normalizeToken(token: ProviderToken, canonicalChain: CanonicalChain): NormalizedToken {
    // Determine VM type from chain type
    const vmType = canonicalChain.type === 'Solana' ? 'solana' : 
                   canonicalChain.type === 'Cosmos' || canonicalChain.type === 'CosmosAppChain' ? 'cosmos' :
                   'evm';

    return {
      chainId: canonicalChain.id, // Use canonical chain ID
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI || '',
      priceUSD: token.priceUSD || '0',
      providers: [this.name],
      verified: token.verified || false,
      vmType: token.vmType || vmType,
      chainBadge: getChainBadge(canonicalChain),
      chainName: canonicalChain.name,
    };
  }

  normalizeChain(chain: ProviderChain): CanonicalChain | null {
    // Lookup canonical chain by LiFi chain ID
    const chainId = typeof chain.id === 'number' ? chain.id : parseInt(String(chain.id), 10);
    if (isNaN(chainId)) {
      return null;
    }
    
    // First, try to find existing canonical chain in registry
    const canonicalChain = getCanonicalChainByProviderId('lifi', chainId);
    if (canonicalChain) {
      return canonicalChain;
    }
    
    // If chain doesn't exist in registry, create a dynamic canonical chain
    // This allows us to return chains from LiFi even if they're not in our registry yet
    const chainType = chain.type || chain.raw?.chainType;
    
    // Determine our canonical chain type from LiFi chain type
    let canonicalType: CanonicalChain['type'] = 'EVM';
    if (chainType === ChainType.SVM) {
      canonicalType = 'Solana';
    } else if (chainType === ChainType.EVM) {
      canonicalType = 'EVM';
    } else if (chainType === ChainType.MVM) {
      canonicalType = 'Sui';
    }
    // Future: Add Cosmos, TON, Bitcoin types as needed
    
    // Create dynamic canonical chain
    // Use LiFi chain ID as canonical ID for now (we can map to stable IDs later)
    const dynamicChain: CanonicalChain = {
      id: chainId, // Use LiFi chain ID as canonical ID (temporary)
      name: chain.name,
      type: canonicalType,
      logoURI: chain.logoURI,
      nativeCurrency: chain.nativeCurrency || {
        symbol: 'ETH', // Default, will be overridden by actual data
        decimals: 18,
      },
      providerIds: {
        lifi: chainId,
      },
    };
    
    return dynamicChain;
  }
}

