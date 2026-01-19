-- ============================================================================
-- Staking Pools Reward Configuration Migration
-- ============================================================================
-- Adds columns for TIWI Protocol staking reward calculations:
-- - max_tvl: Maximum TVL or Total Staked Tokens (NUMERIC)
-- - pool_reward: Total reward tokens allocated to the pool (NUMERIC)
-- - reward_duration_seconds: Reward duration in seconds (BIGINT)
-- - reward_per_second: Calculated reward per second (NUMERIC) - auto-calculated

-- Add max_tvl column (Maximum TVL or Total Staked Tokens)
ALTER TABLE staking_pools 
  ADD COLUMN IF NOT EXISTS max_tvl NUMERIC(38, 8);

-- Add pool_reward column (Total reward tokens allocated)
ALTER TABLE staking_pools 
  ADD COLUMN IF NOT EXISTS pool_reward NUMERIC(38, 8);

-- Add reward_duration_seconds column (Reward duration in seconds)
ALTER TABLE staking_pools 
  ADD COLUMN IF NOT EXISTS reward_duration_seconds BIGINT;

-- Add reward_per_second column (Calculated: pool_reward / (max_tvl * reward_duration_seconds))
-- This will be calculated on-demand in the application layer
-- We store it for caching/optimization, but can recalculate from pool_reward, max_tvl, reward_duration_seconds
ALTER TABLE staking_pools 
  ADD COLUMN IF NOT EXISTS reward_per_second NUMERIC(38, 18);

-- Add index for reward configuration queries
CREATE INDEX IF NOT EXISTS idx_staking_pools_reward_config ON staking_pools(pool_reward, max_tvl, reward_duration_seconds) 
  WHERE pool_reward IS NOT NULL AND max_tvl IS NOT NULL AND reward_duration_seconds IS NOT NULL;
