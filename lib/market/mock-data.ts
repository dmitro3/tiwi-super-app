/**
 * Market Page Mock Data
 * 
 * Mock data for the Market page (Spot and Perp markets)
 */

export interface MarketToken {
  symbol: string;
  icon: string;
  price: string;
  change: string;
  changePositive: boolean;
  vol: string;
  liq: string;
  holders: string;
  // Additional fields for Perp markets
  fundingRate?: string;
  openInterest?: string;
}

// Spot market tokens
export const SPOT_TOKENS: MarketToken[] = [
  { symbol: "BTC", icon: "https://www.figma.com/api/mcp/asset/9b5d0736-e593-414d-93cf-f3282597b4eb", price: "$86,569.91", change: "+1.31%", changePositive: true, vol: "$985.08M", liq: "$1.8B", holders: "3.7K" },
  { symbol: "ETH", icon: "https://www.figma.com/api/mcp/asset/00aba28c-de2a-4b16-af18-3fa036e03dde", price: "$2,404.25", change: "+5.30%", changePositive: true, vol: "$380.08M", liq: "$3.2B", holders: "5.4K" },
  { symbol: "BNB", icon: "https://www.figma.com/api/mcp/asset/2d673816-95d2-4d07-be23-0b2f11fe17ae", price: "$984.09", change: "-1.17%", changePositive: false, vol: "$285.58M", liq: "$2.8B", holders: "10.2K" },
  { symbol: "SOL", icon: "https://www.figma.com/api/mcp/asset/c4283df0-9482-4803-bdfa-1b6a600472a5", price: "$126.55", change: "+7.06%", changePositive: true, vol: "$65.18M", liq: "$900.2M", holders: "12.8K" },
  { symbol: "TWC", icon: "https://www.figma.com/api/mcp/asset/9c1e9262-6046-41cc-8e34-4d873949c0af", price: "$0.095", change: "-1.17%", changePositive: false, vol: "$1.08K", liq: "$500.5K", holders: "1.2K" },
  { symbol: "SUI", icon: "https://www.figma.com/api/mcp/asset/453f67ca-1c96-4316-822f-43ca055f0df9", price: "$1.78", change: "+5.56%", changePositive: true, vol: "$5.56M", liq: "$750.2M", holders: "3.5K" },
  { symbol: "ZORA", icon: "https://www.figma.com/api/mcp/asset/e9e1463c-8364-47f8-bc46-7400f1bffe89", price: "$12.54", change: "-1.17%", changePositive: false, vol: "$2.03M", liq: "$20.3M", holders: "2.1K" },
  { symbol: "AVA", icon: "https://www.figma.com/api/mcp/asset/b06989ab-00dc-4d9b-ad83-bbada6de783c", price: "$0.98", change: "+1.36%", changePositive: true, vol: "$101.98K", liq: "$10.1M", holders: "1.1K" },
  { symbol: "MATIC", icon: "https://www.figma.com/api/mcp/asset/4ebefd63-a015-40a9-9788-c01928e28442", price: "$0.56", change: "-1.17%", changePositive: false, vol: "$504.08K", liq: "$1.2B", holders: "5.2K" },
  { symbol: "NEAR", icon: "https://www.figma.com/api/mcp/asset/e34fc32c-fe5e-48bd-9403-3feb132f95de", price: "$9.56", change: "-1.17%", changePositive: false, vol: "$10.08K", liq: "$3.5M", holders: "2.7K" },
  { symbol: "USDT", icon: "https://www.figma.com/api/mcp/asset/9b5d0736-e593-414d-93cf-f3282597b4eb", price: "$1.00", change: "+0.01%", changePositive: true, vol: "$45.2B", liq: "$85.3B", holders: "8.5K" },
  { symbol: "USDC", icon: "https://www.figma.com/api/mcp/asset/00aba28c-de2a-4b16-af18-3fa036e03dde", price: "$1.00", change: "+0.01%", changePositive: true, vol: "$38.5B", liq: "$72.1B", holders: "7.2K" },
];

// Perp market tokens (with funding rate and open interest)
export const PERP_TOKENS: MarketToken[] = [
  { symbol: "BTC-PERP", icon: "https://www.figma.com/api/mcp/asset/9b5d0736-e593-414d-93cf-f3282597b4eb", price: "$86,569.91", change: "+1.31%", changePositive: true, vol: "$985.08M", liq: "$1.8B", holders: "3.7K", fundingRate: "+0.01%", openInterest: "$2.5B" },
  { symbol: "ETH-PERP", icon: "https://www.figma.com/api/mcp/asset/00aba28c-de2a-4b16-af18-3fa036e03dde", price: "$2,404.25", change: "+5.30%", changePositive: true, vol: "$380.08M", liq: "$3.2B", holders: "5.4K", fundingRate: "+0.02%", openInterest: "$1.8B" },
  { symbol: "BNB-PERP", icon: "https://www.figma.com/api/mcp/asset/2d673816-95d2-4d07-be23-0b2f11fe17ae", price: "$984.09", change: "-1.17%", changePositive: false, vol: "$285.58M", liq: "$2.8B", holders: "10.2K", fundingRate: "-0.01%", openInterest: "$1.2B" },
  { symbol: "SOL-PERP", icon: "https://www.figma.com/api/mcp/asset/c4283df0-9482-4803-bdfa-1b6a600472a5", price: "$126.55", change: "+7.06%", changePositive: true, vol: "$65.18M", liq: "$900.2M", holders: "12.8K", fundingRate: "+0.03%", openInterest: "$850M" },
  { symbol: "TWC-PERP", icon: "https://www.figma.com/api/mcp/asset/9c1e9262-6046-41cc-8e34-4d873949c0af", price: "$0.095", change: "-1.17%", changePositive: false, vol: "$1.08K", liq: "$500.5K", holders: "1.2K", fundingRate: "-0.02%", openInterest: "$350K" },
];

