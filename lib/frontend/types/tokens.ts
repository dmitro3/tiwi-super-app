/**
 * Token and Chain type definitions
 */

export interface Token {
  id: string;
  name: string;
  symbol: string;
  address: string;
  logo: string;
  logoURI?: string;
  chain: string;
  chainId?: number;          // Canonical chain ID from backend
  chainLogo?: string;        // Derived from chain list (logoURI) or from pair data
  decimals: number | undefined;  // Token decimals (undefined means unknown, will be fetched)
  balance?: string;
  usdValue?: string;
  price?: string;
  chainBadge?: string;
  verified?: boolean;        // Verification status (true = verified, false = unverified/spam)
  priceChange24h?: number;   // 24h price change percentage (e.g., -12.1)
  volume24h?: number;        // 24h trading volume
  high24h?: number;          // 24h high price
  low24h?: number;           // 24h low price
  liquidity?: number;        // Liquidity in USD
  marketCap?: number;        // Market capitalization
  holders?: number;          // Number of token holders (from Chainbase or fallback)
  transactionCount?: number; // 24h transaction count
  // Accessible metrics from CoinGecko
  marketCapRank?: number;   // Market cap rank (lower = better, e.g., #1 Bitcoin)
  circulatingSupply?: number; // Circulating supply (number of tokens in circulation)
  socials?: any[];          // Social links (Twitter, etc)
  website?: string;         // Official website URL
  description?: string;     // Token description
  // Market pair metadata (for pairs from market-pairs endpoint)
  baseToken?: any;           // Full baseToken details (for routing to swap/market pages)
  quoteToken?: any;          // Full quoteToken details (for routing to swap/market pages)
  pairPrice?: string;        // Raw pair price (base_token_price_quote_token) for formatting
  pair?: any;                // Full market pair metadata
}


export interface Chain {
  id: string;                // Canonical chain ID as string
  name: string;
  logo: string;
  type?: string;             // Chain type (EVM, Solana, etc.)
  symbol?: string;           // Native currency symbol (e.g., "ETH", "BNB")
  decimals?: number;         // Native currency decimals (e.g., 18)
}

