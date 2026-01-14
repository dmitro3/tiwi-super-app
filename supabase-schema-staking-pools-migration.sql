-- ============================================================================
-- Staking Pools Migration - Increase NUMERIC Precision for Large Amounts
-- ============================================================================
-- This migration increases the precision of NUMERIC fields to support trillion+ values
-- NUMERIC(38, 8) allows for up to 30 digits before decimal (supports trillions and beyond)
-- while maintaining 8 decimal precision for token amounts

-- Alter min_stake_amount column
ALTER TABLE staking_pools 
  ALTER COLUMN min_stake_amount TYPE NUMERIC(38, 8);

-- Alter max_stake_amount column
ALTER TABLE staking_pools 
  ALTER COLUMN max_stake_amount TYPE NUMERIC(38, 8);

-- Alter stake_pool_creation_fee column
ALTER TABLE staking_pools 
  ALTER COLUMN stake_pool_creation_fee TYPE NUMERIC(38, 8);

-- Note: APY remains NUMERIC(5, 2) as it's a percentage (max 999.99%)

