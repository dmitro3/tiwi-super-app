/**
 * Viem Client Utilities
 *
 * - Public client caching per chain
 * - Wallet client creation for external providers
 * - Wallet client creation for local private-key signer
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  custom,
  type PublicClient,
  type WalletClient,
  type Chain,
} from "viem";
import { mainnet, arbitrum, optimism, polygon, base, bsc } from "viem/chains";
import { getRpcUrl, RPC_TRANSPORT_OPTIONS } from "@/lib/backend/utils/rpc-config";

// ============================================================================
// CHAIN CONFIGURATION
// ============================================================================

const CHAIN_MAP: Record<number, Chain> = {
  1: mainnet,
  42161: arbitrum,
  10: optimism,
  137: polygon,
  8453: base,
  56: bsc,
};

function getChainConfig(chainId: number): Chain | null {
  return CHAIN_MAP[chainId] || null;
}

export function getChainForId(chainId: number): Chain {
  const chain = getChainConfig(chainId);
  if (!chain) {
    throw new Error(`Chain ${chainId} not supported`);
  }
  return chain;
}

// ============================================================================
// PUBLIC CLIENT CACHING (Singleton Pattern)
// ============================================================================

const publicClientCache = new Map<number, PublicClient>();

export function getCachedPublicClient(chainId: number): PublicClient {
  if (!publicClientCache.has(chainId)) {
    const chain = getChainForId(chainId);

    // ✅ ENHANCEMENT: Prefer browser wallet provider to avoid CORS/Fetch errors
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      publicClientCache.set(
        chainId,
        createPublicClient({
          chain,
          transport: custom((window as any).ethereum),
        })
      );
    } else {
      const customRpcUrl = getRpcUrl(chainId);

      publicClientCache.set(
        chainId,
        createPublicClient({
          chain,
          transport: customRpcUrl
            ? http(customRpcUrl, RPC_TRANSPORT_OPTIONS)
            : http(undefined, RPC_TRANSPORT_OPTIONS),
        })
      );
    }
  }

  return publicClientCache.get(chainId)!;
}

// ============================================================================
// WALLET CLIENT CREATION
// ============================================================================

/**
 * Create wallet client for a local private-key account.
 * The account parameter is intentionally typed as any to avoid tight coupling
 * to viem's internal Account types and keep integration flexible.
 */
export function createLocalWalletClient(chainId: number, account: any): WalletClient {
  const chain = getChainForId(chainId);
  const customRpcUrl = getRpcUrl(chainId);

  return createWalletClient({
    chain,
    account,
    transport: customRpcUrl
      ? http(customRpcUrl, RPC_TRANSPORT_OPTIONS)
      : http(undefined, RPC_TRANSPORT_OPTIONS),
  });
}

/**
 * Create wallet client for a chain using an external provider (MetaMask, Rabby, etc.)
 */
export function createWalletClientForChain(
  chainId: number,
  account?: `0x${string}`
): WalletClient {
  const chain = getChainForId(chainId);

  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No Ethereum wallet found. Please install MetaMask or another wallet.");
  }

  const provider = (window as any).ethereum;

  return createWalletClient({
    chain,
    transport: custom(provider),
    account: account,
  });
}

/**
 * Get wallet client for a chain using a specific provider id when available.
 * Falls back to window.ethereum when providerId is not provided.
 */
export async function getWalletClientForChain(
  chainId: number,
  providerId?: string
): Promise<WalletClient> {
  const chain = getChainForId(chainId);

  let provider: any;
  let account: `0x${string}`;

  if (providerId) {
    const { getWalletForChain } = await import("@/lib/wallet/connection/connector");
    provider = await getWalletForChain(providerId, "ethereum");

    if (!provider) {
      throw new Error(
        `Wallet provider "${providerId}" not found. Please ensure the wallet is installed and connected.`
      );
    }

    const accounts = await provider.request({ method: "eth_requestAccounts" });
    if (!accounts || accounts.length === 0) {
      throw new Error(`No accounts found in ${providerId}. Please connect your wallet.`);
    }

    account = accounts[0] as `0x${string}`;
  } else {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("No Ethereum wallet found. Please install MetaMask or another wallet.");
    }

    provider = (window as any).ethereum;
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found. Please connect your wallet.");
    }

    account = accounts[0] as `0x${string}`;
  }

  return createWalletClient({
    chain,
    transport: custom(provider),
    account,
  });
}

// ============================================================================
// UTILITIES
// ============================================================================

export function clearPublicClientCache(): void {
  publicClientCache.clear();
}

export function isChainSupported(chainId: number): boolean {
  return getChainConfig(chainId) !== null;
}


