/**
 * Token Provider Base Interface
 * 
 * Abstract interface that all token providers must implement.
 * This ensures consistent provider behavior and makes it easy to add new providers.
 */

import type {
  TokenProvider,
  CanonicalChain,
  ProviderToken,
  ProviderChain,
  NormalizedToken,
  FetchTokensParams,
} from '@/lib/backend/types/backend-tokens';

/**
 * Base abstract class for token providers
 * All providers should extend this class
 */
export abstract class BaseTokenProvider implements TokenProvider {
  abstract name: string;

  /**
   * Get provider-specific chain ID for a canonical chain
   * Returns null if provider doesn't support the chain
   */
  abstract getChainId(canonicalChain: CanonicalChain): string | number | null;

  /**
   * Fetch tokens from the provider
   * This will be implemented by each provider
   */
  abstract fetchTokens(params: FetchTokensParams): Promise<ProviderToken[]>;

  /**
   * Fetch all supported chains from the provider
   * This will be implemented by each provider
   */
  abstract fetchChains(): Promise<ProviderChain[]>;

  /**
   * Normalize provider token to canonical format
   * This will be implemented by each provider
   */
  abstract normalizeToken(token: ProviderToken, canonicalChain: CanonicalChain): NormalizedToken;

  /**
   * Normalize provider chain to canonical format
   * This will be implemented by each provider
   */
  abstract normalizeChain(chain: ProviderChain): CanonicalChain | null;
}

