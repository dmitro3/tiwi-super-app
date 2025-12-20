/**
 * Token and Chain type definitions
 */

export interface Token {
  id: string;
  name: string;
  symbol: string;
  address: string;
  logo: string;
  chain: string;
  chainId?: number;          // Canonical chain ID from backend
  chainLogo?: string;        // Derived from chain list (logoURI)
  balance?: string;
  usdValue?: string;
  price?: string;
  chainBadge?: string;
}

export interface Chain {
  id: string;                // Canonical chain ID as string
  name: string;
  logo: string;
  type?: string;             // Chain type (EVM, Solana, etc.)
  symbol?: string;           // Native currency symbol (e.g., "ETH", "BNB")
  decimals?: number;         // Native currency decimals (e.g., 18)
}

