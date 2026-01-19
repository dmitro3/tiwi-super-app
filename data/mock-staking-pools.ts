/**
 * Mock Staking Pools Data
 * 
 * Dummy data for the Earn page staking functionality
 */

export interface StakingPool {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  apy: string;
  tokenIcon: string;
  // Pool details
  tvl?: string;
  apr?: string;
  totalStaked?: string;
  limits?: string;
  // Contract and chain info
  contractAddress?: string; // Smart contract address
  chainId?: number; // Chain ID
  tokenAddress?: string; // Staking token address
  decimals?: number; // Token decimals
  // Additional fields for "My Stakes"
  stakedAmount?: string;
  rewardsEarned?: string;
  lockPeriod?: string;
}

/**
 * Available staking pools (for "Stake" tab)
 * These are pools users can stake into
 */
export const AVAILABLE_STAKING_POOLS: StakingPool[] = [
  {
    id: "twc-pool",
    tokenSymbol: "TWC",
    tokenName: "TIWI Cat",
    apy: "~12.5%",
    tokenIcon: "/assets/logos/twc-token.svg",
    tvl: "$1.4M",
    apr: "5.48%",
    totalStaked: "1.1M TWC",
    limits: "0.03-50 TWC",
  },
  {
    id: "wkc-pool",
    tokenSymbol: "BNB",
    tokenName: "Binance Coin",
    apy: "~10.8%",
    tokenIcon: "https://www.figma.com/api/mcp/asset/2d673816-95d2-4d07-be23-0b2f11fe17ae",
    tvl: "$850K",
    apr: "4.2%",
    totalStaked: "1,416 BNB",
    limits: "0.1-100 BNB",
  },
  {
    id: "eth-pool",
    tokenSymbol: "ETH",
    tokenName: "Ethereum",
    apy: "~8.2%",
    tokenIcon: "/assets/icons/tokens/ethereum.svg",
    tvl: "$2.1M",
    apr: "6.5%",
    totalStaked: "600 ETH",
    limits: "0.01-20 ETH",
  },
];

/**
 * User's active stakes (for "My Stakes" tab)
 * These are tokens the user has already staked
 */
export const USER_STAKES: StakingPool[] = [
  {
    id: "user-twc-stake",
    tokenSymbol: "TWC",
    tokenName: "TIWI Cat",
    apy: "~12.5%",
    tokenIcon: "/assets/logos/twc-token.svg",
    stakedAmount: "50,000 TWC",
    rewardsEarned: "1,250 TWC",
    lockPeriod: "30 days",
  },
  {
    id: "user-eth-stake",
    tokenSymbol: "ETH",
    tokenName: "Ethereum",
    apy: "~8.2%",
    tokenIcon: "/assets/icons/tokens/ethereum.svg",
    stakedAmount: "2.5 ETH",
    rewardsEarned: "0.205 ETH",
    lockPeriod: "60 days",
  },
];

/**
 * Active positions (for "Active Positions" tab)
 * Currently empty - will show empty state
 */
export const ACTIVE_POSITIONS: StakingPool[] = [];

