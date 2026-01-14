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
  decimals: number | undefined;  // Token decimals (undefined means unknown, will be fetched)
  balance?: string;
  usdValue?: string;
  price?: string;
  chainBadge?: string;
  priceChange24h?: number;   // 24h price change percentage (e.g., -12.1)
  volume24h?: number;        // 24h trading volume
  liquidity?: number;        // Liquidity in USD
  marketCap?: number;        // Market capitalization
  holders?: number;          // Number of token holders
}

export interface Chain {
  id: string;                // Canonical chain ID as string
  name: string;
  logo: string;
  type?: string;             // Chain type (EVM, Solana, etc.)
  symbol?: string;           // Native currency symbol (e.g., "ETH", "BNB")
  decimals?: number;         // Native currency decimals (e.g., 18)
}

