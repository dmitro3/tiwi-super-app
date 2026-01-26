/**
 * Smart Markets API (frontend mock)
 *
 * In production this would call a backend endpoint to fetch
 * active smart markets/DEX integrations configured from the admin.
 * Here we mimic that behaviour with a small async helper.
 */

export interface SmartMarket {
  id: string;
  name: string;
  icon: string;
  chainIds?: number[];
  isActive?: boolean;
  order?: number;
}

// Simulated backend fetch
export async function fetchSmartMarkets(): Promise<SmartMarket[]> {
  // Simulate small network delay
  await new Promise((resolve) => setTimeout(resolve, 150));

  return [
    { id: "uniswap", name: "Uniswap", icon: "/assets/amms/amm-1.svg", isActive: true, order: 1 },
    { id: "balancer", name: "Balancer", icon: "/assets/amms/amm-2.svg", isActive: true, order: 2 },
    { id: "pancakeswap", name: "Pancake Swap", icon: "/assets/amms/amm-3.svg", isActive: true, order: 3 },
    { id: "trader-joe", name: "Trader Joe", icon: "/assets/amms/amm-4.svg", isActive: true, order: 4 },
    { id: "sushiswap", name: "Sushiswap", icon: "/assets/amms/amm-5.svg", isActive: true, order: 5 },
    { id: "curve-finance", name: "Curve Finance", icon: "/assets/amms/amm-6.svg", isActive: true, order: 6 },
    { id: "raydium", name: "Raydium", icon: "/assets/amms/amm-7.svg", isActive: true, order: 7 },
    { id: "1inch", name: "1inch", icon: "/assets/amms/amm-1.svg", isActive: true, order: 8 },
    { id: "0x", name: "0x Protocol", icon: "/assets/amms/amm-2.svg", isActive: true, order: 9 },
    { id: "aerodrome", name: "Aerodrome", icon: "/assets/amms/amm-3.svg", isActive: true, order: 10 },
    { id: "camelot", name: "Camelot", icon: "/assets/amms/amm-4.svg", isActive: true, order: 11 },
    { id: "dodo", name: "DODO", icon: "/assets/amms/amm-5.svg", isActive: true, order: 12 },
    { id: "kyberswap", name: "KyberSwap", icon: "/assets/amms/amm-6.svg", isActive: true, order: 13 },
    { id: "orca", name: "Orca", icon: "/assets/amms/amm-7.svg", isActive: true, order: 14 },
    { id: "velodrome", name: "Velodrome", icon: "/assets/amms/amm-1.svg", isActive: true, order: 15 },
    { id: "maverick", name: "Maverick", icon: "/assets/amms/amm-2.svg", isActive: true, order: 16 },
    { id: "woofi", name: "WOOFi", icon: "/assets/amms/amm-3.svg", isActive: true, order: 17 },
    { id: "metamask-swap", name: "MetaMask Swap", icon: "/assets/amms/amm-4.svg", isActive: true, order: 18 },
    { id: "paraswap", name: "ParaSwap", icon: "/assets/amms/amm-5.svg", isActive: true, order: 19 },
    { id: "matcha", name: "Matcha", icon: "/assets/amms/amm-6.svg", isActive: true, order: 20 },
    { id: "jupiter", name: "Jupiter", icon: "/assets/amms/amm-7.svg", isActive: true, order: 21 },
    { id: "phoenix", name: "Phoenix", icon: "/assets/amms/amm-1.svg", isActive: true, order: 22 },
    { id: "lifinity", name: "Lifinity", icon: "/assets/amms/amm-2.svg", isActive: true, order: 23 },
    { id: "openbook", name: "OpenBook", icon: "/assets/amms/amm-3.svg", isActive: true, order: 24 },
  ].filter(market => market.isActive).sort((a, b) => (a.order || 0) - (b.order || 0));
}

