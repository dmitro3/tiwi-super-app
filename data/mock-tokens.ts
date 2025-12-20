import type { Token, Chain } from "@/lib/frontend/types/tokens";

// Mock tokens data - structured for easy API replacement
export const MOCK_TOKENS: Token[] = [
  {
    id: "twc",
    name: "TIWICAT",
    symbol: "TWC",
    address: "0x0617a8b3c4d5e6f7a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
    logo: "/assets/icons/tokens/tiwicat.svg",
    chain: "BSC",
    chainLogo: "/assets/icons/chain-badge.svg",
    balance: "2000000000000.56",
    usdValue: "$1,500.56",
    price: "0.00000075",
  },
  {
    id: "usdt",
    name: "Tether",
    symbol: "USDT",
    address: "0x0617a8b3c4d5e6f7a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
    logo: "/assets/icons/tokens/tether.svg",
    chain: "BSC",
    chainLogo: "/assets/icons/chain-badge.svg",
    balance: "0.00",
    usdValue: undefined,
    price: "1.00",
  },
  {
    id: "usdc",
    name: "USDC",
    symbol: "USDC",
    address: "0x0617a8b3c4d5e6f7a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
    logo: "/assets/icons/tokens/usdc.svg",
    chain: "BSC",
    chainLogo: "/assets/icons/chain-badge.svg",
    balance: "0.00",
    usdValue: undefined,
    price: "1.00",
  },
  {
    id: "bnb",
    name: "Binance Coin",
    symbol: "BNB",
    address: "0x0617a8b3c4d5e6f7a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
    logo: "/assets/icons/chains/bsc.svg",
    chain: "BSC",
    chainLogo: "/assets/icons/chain-badge.svg",
    balance: "0.00",
    usdValue: undefined,
    price: "600.00",
  },
  {
    id: "eth",
    name: "Ethereum",
    symbol: "ETH",
    address: "0x0617a8b3c4d5e6f7a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
    logo: "/assets/icons/tokens/ethereum.svg", // Placeholder
    chain: "Ethereum",
    chainLogo: "/assets/icons/chain-badge.svg",
    balance: "0.00",
    usdValue: undefined,
    price: "3500.00",
  },
  {
    id: "sol",
    name: "Solana",
    symbol: "SOL",
    address: "0x0617a8b3c4d5e6f7a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
    logo: "/assets/icons/tokens/solana.svg", // Placeholder
    chain: "Solana",
    chainLogo: "/assets/icons/chain-badge.svg",
    balance: "0.00",
    usdValue: undefined,
    price: "150.00",
  },
];

// Mock chains data - structured for easy API replacement
export const MOCK_CHAINS: Chain[] = [
  {
    id: "all",
    name: "All Networks",
    logo: "",
  },
  {
    id: "Ethereum",
    name: "Ethereum",
    logo: "/assets/icons/chains/ethereum.svg",
  },
  {
    id: "Solana",
    name: "Solana",
    logo: "/assets/icons/chains/solana.svg",
  },
  {
    id: "BSC",
    name: "Binance Coin",
    logo: "/assets/icons/chains/bsc.svg",
  },
  {
    id: "Bitcoin",
    name: "Bitcoin",
    logo: "/assets/icons/chains/bitcoin.svg",
  },
];

// Helper function to get token balance from Moralis API (future implementation)
// This structure allows easy replacement when integrating Moralis
export async function fetchTokenBalances(
  walletAddress: string
): Promise<Record<string, string>> {
  // TODO: Replace with actual Moralis API call
  // Example structure:
  // const response = await Moralis.EvmApi.token.getWalletTokenBalances({
  //   address: walletAddress,
  //   chain: chainId,
  // });
  // return formatBalances(response);
  
  // Mock return for now
  return {
    twc: "2000000000000.56",
  };
}

// Helper function to format token data for display (future implementation)
export function formatTokenData(
  tokens: Token[],
  balances: Record<string, string>
): Token[] {
  return tokens.map((token) => ({
    ...token,
    balance: balances[token.id] || "0.00",
    // Calculate USD value if balance exists
    usdValue:
      balances[token.id] && token.price
        ? `$${(parseFloat(balances[token.id]) * parseFloat(token.price)).toFixed(2)}`
        : undefined,
  }));
}

