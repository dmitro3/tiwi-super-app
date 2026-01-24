-- ============================================================================
-- Add pool_id and factory_address columns to staking_pools table
-- ============================================================================
-- This migration adds support for factory-based staking pools

-- Add pool_id column (the pool ID from the factory contract)
ALTER TABLE staking_pools 
  ADD COLUMN IF NOT EXISTS pool_id INTEGER;

-- Add factory_address column (the factory contract address)
ALTER TABLE staking_pools 
  ADD COLUMN IF NOT EXISTS factory_address TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_staking_pools_pool_id ON staking_pools(pool_id) 
  WHERE pool_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staking_pools_factory_address ON staking_pools(factory_address) 
  WHERE factory_address IS NOT NULL;

-- Add comment
COMMENT ON COLUMN staking_pools.pool_id IS 'Pool ID from the factory contract (for factory-based staking)';
COMMENT ON COLUMN staking_pools.factory_address IS 'Factory contract address (for factory-based staking)';
