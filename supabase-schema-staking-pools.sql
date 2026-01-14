-- ============================================================================
-- Staking Pools System
-- ============================================================================

-- Create staking_pools table to store staking pool configurations
CREATE TABLE IF NOT EXISTS staking_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id INTEGER NOT NULL,
  chain_name TEXT NOT NULL,
  token_address TEXT NOT NULL,
  token_symbol TEXT,
  token_name TEXT,
  token_logo TEXT,
  min_staking_period TEXT, -- e.g., "30 days"
  min_stake_amount NUMERIC(38, 8) NOT NULL DEFAULT 0,
  max_stake_amount NUMERIC(38, 8),
  stake_modification_fee BOOLEAN NOT NULL DEFAULT FALSE,
  time_boost BOOLEAN NOT NULL DEFAULT FALSE,
  time_boost_config JSONB, -- Store time boost configuration if enabled
  country TEXT,
  stake_pool_creation_fee NUMERIC(38, 8) NOT NULL DEFAULT 0.15,
  reward_pool_creation_fee TEXT, -- e.g., "5%"
  apy NUMERIC(5, 2), -- Annual Percentage Yield (e.g., 5.30)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for staking_pools
CREATE INDEX IF NOT EXISTS idx_staking_pools_chain_id ON staking_pools(chain_id);
CREATE INDEX IF NOT EXISTS idx_staking_pools_token_address ON staking_pools(token_address);
CREATE INDEX IF NOT EXISTS idx_staking_pools_token_symbol ON staking_pools(token_symbol);
CREATE INDEX IF NOT EXISTS idx_staking_pools_status ON staking_pools(status);
CREATE INDEX IF NOT EXISTS idx_staking_pools_created_at ON staking_pools(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staking_pools_status_created ON staking_pools(status, created_at DESC);

-- Create index for active pools (most common query)
CREATE INDEX IF NOT EXISTS idx_staking_pools_active ON staking_pools(status) WHERE status = 'active';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_staking_pools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_staking_pools_updated_at
  BEFORE UPDATE ON staking_pools
  FOR EACH ROW
  EXECUTE FUNCTION update_staking_pools_updated_at();



