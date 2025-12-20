/**
 * Relay Token Provider (STUBBED)
 * 
 * Phase 1.0: Stub implementation only - no real API calls yet
 */

import { BaseTokenProvider } from './base';
import type {
  CanonicalChain,
  ProviderToken,
  ProviderChain,
  NormalizedToken,
  FetchTokensParams,
} from '@/lib/backend/types/backend-tokens';

export class RelayProvider extends BaseTokenProvider {
  name = 'relay';

  getChainId(canonicalChain: CanonicalChain): string | number | null {
    return canonicalChain.providerIds.relay ?? null;
  }

  async fetchTokens(params: FetchTokensParams): Promise<ProviderToken[]> {
    // STUBBED: No real API calls yet
    // Future: Call Relay API with multi-chain support
    // Example: POST https://api.relay.link/currencies/v2
    // Body: { chainIds: [...], term: "", limit: 12, ... }
    return [];
  }

  async fetchChains(): Promise<ProviderChain[]> {
    // STUBBED: No real API calls yet
    // Future: Fetch chains from Relay API
    return [];
  }

  normalizeToken(token: ProviderToken, canonicalChain: CanonicalChain): NormalizedToken {
    // STUBBED: Will normalize Relay token response in future phases
    // Relay returns: { chainId, address, symbol, name, decimals, vmType, metadata: { logoURI, verified } }
    return {
      chainId: canonicalChain.id,
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI || '',
      priceUSD: token.priceUSD || '0',
      providers: [this.name],
      verified: token.verified || false,
      vmType: token.vmType || 'evm',
    };
  }

  normalizeChain(chain: ProviderChain): CanonicalChain | null {
    // STUBBED: Will normalize Relay chain response in future phases
    return null;
  }
}

