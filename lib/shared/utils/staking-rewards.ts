/**
 * TIWI Protocol Staking Reward Calculations
 * 
 * Implements the TIWI Protocol staking pool reward equations:
 * - Reward Rate = Pool Reward / (Total Staked Tokens * Time)
 * - User Reward = User Staked Amount * Reward Rate * Staking Time
 * - APR and APY calculations for UI display
 */

// ============================================================================
// Constants
// ============================================================================

export const SECONDS_PER_YEAR = 31536000; // 365 * 24 * 60 * 60

// ============================================================================
// Core Reward Rate Formula
// ============================================================================

/**
 * Calculate reward rate per token per second
 * 
 * Formula: Reward Rate = Pool Reward / (Total Staked Tokens * Time)
 * 
 * Where:
 * - Pool Reward = Total reward tokens allocated to the pool
 * - Total Staked Tokens (or Maximum TVL) = Sum of all tokens staked in the pool
 * - Time = Reward duration in seconds
 * 
 * Unit: token / (token * second)
 * 
 * @param poolReward - Total reward tokens allocated to the pool
 * @param totalStakedTokens - Total staked tokens or Maximum TVL
 * @param rewardDurationSeconds - Reward duration in seconds
 * @returns Reward rate per token per second
 */
export function calculateRewardRate(
  poolReward: number,
  totalStakedTokens: number,
  rewardDurationSeconds: number
): number {
  if (totalStakedTokens <= 0 || rewardDurationSeconds <= 0) {
    return 0;
  }
  
  // Reward Rate = Pool Reward / (Total Staked Tokens * Time)
  return poolReward / (totalStakedTokens * rewardDurationSeconds);
}

/**
 * Calculate reward per second for the pool
 * This is used in Solidity contracts: rewardPerSecond = Pool Reward / Time
 * 
 * @param poolReward - Total reward tokens allocated to the pool
 * @param rewardDurationSeconds - Reward duration in seconds
 * @returns Reward per second
 */
export function calculateRewardPerSecond(
  poolReward: number,
  rewardDurationSeconds: number
): number {
  if (rewardDurationSeconds <= 0) {
    return 0;
  }
  
  return poolReward / rewardDurationSeconds;
}

// ============================================================================
// Individual User Reward Formula
// ============================================================================

/**
 * Calculate user reward based on staked amount and duration
 * 
 * Formula: User Reward = User Staked Amount * Reward Rate * Staking Time
 * 
 * Where:
 * - User Staked Amount = Amount of tokens the user staked
 * - Reward Rate = Output from calculateRewardRate()
 * - Staking Time = Time user has staked (in seconds)
 * 
 * @param userStakedAmount - Amount of tokens the user staked
 * @param rewardRate - Reward rate per token per second
 * @param stakingTimeSeconds - Time user has staked (in seconds)
 * @returns User reward in tokens
 */
export function calculateUserReward(
  userStakedAmount: number,
  rewardRate: number,
  stakingTimeSeconds: number
): number {
  if (userStakedAmount <= 0 || stakingTimeSeconds <= 0) {
    return 0;
  }
  
  // User Reward = User Staked Amount * Reward Rate * Staking Time
  return userStakedAmount * rewardRate * stakingTimeSeconds;
}

/**
 * Calculate user reward using pool parameters directly
 * Convenience function that combines reward rate calculation with user reward
 * 
 * @param userStakedAmount - Amount of tokens the user staked
 * @param poolReward - Total reward tokens allocated to the pool
 * @param totalStakedTokens - Total staked tokens or Maximum TVL
 * @param rewardDurationSeconds - Reward duration in seconds
 * @param stakingTimeSeconds - Time user has staked (in seconds)
 * @returns User reward in tokens
 */
export function calculateUserRewardFromPool(
  userStakedAmount: number,
  poolReward: number,
  totalStakedTokens: number,
  rewardDurationSeconds: number,
  stakingTimeSeconds: number
): number {
  const rewardRate = calculateRewardRate(
    poolReward,
    totalStakedTokens,
    rewardDurationSeconds
  );
  
  return calculateUserReward(userStakedAmount, rewardRate, stakingTimeSeconds);
}

// ============================================================================
// APR and APY Calculations (for UI display only)
// ============================================================================

/**
 * Calculate APR (Annual Percentage Rate) - simple, non-compounding
 * 
 * Formula:
 * rewardPerYear = rewardPerSecond * SECONDS_PER_YEAR
 * rewardValuePerYearUSD = rewardPerYear * rewardTokenPrice
 * totalStakedUSD = totalStaked * stakingTokenPrice
 * APR = (rewardValuePerYearUSD / totalStakedUSD) * 100
 * 
 * @param rewardPerSecond - Rewards emitted per second (from contract)
 * @param rewardTokenPrice - Price of reward token in USD (from oracle)
 * @param totalStaked - Total staked token amount (from contract)
 * @param stakingTokenPrice - Price of staked token in USD (from oracle)
 * @returns APR as a percentage (e.g., 12.5 for 12.5%)
 */
export function calculateAPR(
  rewardPerSecond: number,
  rewardTokenPrice: number,
  totalStaked: number,
  stakingTokenPrice: number
): number {
  if (totalStaked <= 0 || stakingTokenPrice <= 0) {
    return 0;
  }
  
  // Reward USD per year
  const rewardPerYear = rewardPerSecond * SECONDS_PER_YEAR;
  const rewardValuePerYearUSD = rewardPerYear * rewardTokenPrice;
  
  // Total staked value USD
  const totalStakedUSD = totalStaked * stakingTokenPrice;
  
  // APR
  const aprDecimal = rewardValuePerYearUSD / totalStakedUSD;
  return aprDecimal * 100;
}

/**
 * Calculate APY (Annual Percentage Yield) - with compounding
 * 
 * Formula:
 * aprDecimal = APR / 100
 * APY = ((1 + (aprDecimal / n)) ^ n - 1) * 100
 * 
 * Where n = compounding periods per year (daily = 365, weekly = 52, hourly = 8760)
 * 
 * @param apr - APR as a percentage (e.g., 12.5 for 12.5%)
 * @param compoundingPeriodsPerYear - Number of compounding periods per year (default: 365 for daily)
 * @returns APY as a percentage (e.g., 13.2 for 13.2%)
 */
export function calculateAPY(
  apr: number,
  compoundingPeriodsPerYear: number = 365
): number {
  if (apr <= 0 || compoundingPeriodsPerYear <= 0) {
    return 0;
  }
  
  const aprDecimal = apr / 100;
  const apyDecimal = Math.pow(1 + aprDecimal / compoundingPeriodsPerYear, compoundingPeriodsPerYear) - 1;
  return apyDecimal * 100;
}

/**
 * Calculate APR from pool configuration (using reward rate formula)
 * Alternative method that uses the TIWI Protocol reward rate formula
 * 
 * @param poolReward - Total reward tokens allocated to the pool
 * @param totalStakedTokens - Total staked tokens or Maximum TVL
 * @param rewardDurationSeconds - Reward duration in seconds
 * @param rewardTokenPrice - Price of reward token in USD
 * @param stakingTokenPrice - Price of staked token in USD
 * @returns APR as a percentage
 */
export function calculateAPRFromPoolConfig(
  poolReward: number,
  totalStakedTokens: number,
  rewardDurationSeconds: number,
  rewardTokenPrice: number,
  stakingTokenPrice: number
): number {
  const rewardRate = calculateRewardRate(
    poolReward,
    totalStakedTokens,
    rewardDurationSeconds
  );
  
  // Reward per second = rewardRate * totalStakedTokens (since rewardRate is per token per second)
  const rewardPerSecond = rewardRate * totalStakedTokens;
  
  return calculateAPR(rewardPerSecond, rewardTokenPrice, totalStakedTokens, stakingTokenPrice);
}

// ============================================================================
// User Estimated Rewards (for UI)
// ============================================================================

/**
 * Calculate user estimated reward for a given duration
 * 
 * @param userStake - User stake amount
 * @param totalStaked - Total staked in pool
 * @param rewardPerSecond - Reward per second from pool
 * @param durationSeconds - Duration in seconds
 * @returns Estimated reward tokens
 */
export function calculateUserEstimatedReward(
  userStake: number,
  totalStaked: number,
  rewardPerSecond: number,
  durationSeconds: number
): number {
  if (userStake <= 0 || totalStaked <= 0 || durationSeconds <= 0) {
    return 0;
  }
  
  // User share of total staked
  const userShare = userStake / totalStaked;
  
  // User reward tokens for duration
  const userRewardTokens = userShare * rewardPerSecond * durationSeconds;
  
  return userRewardTokens;
}

/**
 * Calculate user estimated reward USD value
 * 
 * @param userRewardTokens - User reward in tokens
 * @param rewardTokenPrice - Price of reward token in USD
 * @returns Estimated reward value in USD
 */
export function calculateUserEstimatedRewardUSD(
  userRewardTokens: number,
  rewardTokenPrice: number
): number {
  return userRewardTokens * rewardTokenPrice;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert days to seconds
 * 
 * @param days - Number of days
 * @returns Number of seconds
 */
export function daysToSeconds(days: number): number {
  return days * 24 * 60 * 60;
}

/**
 * Convert seconds to days
 * 
 * @param seconds - Number of seconds
 * @returns Number of days
 */
export function secondsToDays(seconds: number): number {
  return seconds / (24 * 60 * 60);
}

/**
 * Format duration for display
 * 
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "30 days", "2 hours", etc.)
 */
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  }
}
