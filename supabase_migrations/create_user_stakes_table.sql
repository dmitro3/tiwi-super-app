-- ============================================================================
-- Create user_stakes table for tracking user staking positions
-- ============================================================================

-- Create the user_stakes table
CREATE TABLE IF NOT EXISTS user_stakes (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User wallet address (normalized to lowercase)
  user_wallet TEXT NOT NULL,
  
  -- Foreign key to staking_pools table
  pool_id UUID NOT NULL REFERENCES staking_pools(id) ON DELETE CASCADE,
  
  -- Staking amounts (using NUMERIC for precision with decimals)
  staked_amount NUMERIC(78, 18) NOT NULL DEFAULT 0 CHECK (staked_amount >= 0),
  rewards_earned NUMERIC(78, 18) NOT NULL DEFAULT 0 CHECK (rewards_earned >= 0),
  
  -- Lock period information
  lock_period_days INTEGER CHECK (lock_period_days > 0),
  lock_end_date TIMESTAMPTZ,
  
  -- Status: active, completed, or withdrawn
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
  
  -- Transaction hash from blockchain
  transaction_hash TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_stakes_user_wallet ON user_stakes(user_wallet);
CREATE INDEX IF NOT EXISTS idx_user_stakes_pool_id ON user_stakes(pool_id);
CREATE INDEX IF NOT EXISTS idx_user_stakes_status ON user_stakes(status);
CREATE INDEX IF NOT EXISTS idx_user_stakes_user_pool ON user_stakes(user_wallet, pool_id);
CREATE INDEX IF NOT EXISTS idx_user_stakes_lock_end_date ON user_stakes(lock_end_date) WHERE lock_end_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_stakes_created_at ON user_stakes(created_at DESC);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_stakes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_user_stakes_updated_at
  BEFORE UPDATE ON user_stakes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stakes_updated_at();

-- Add comments for documentation
COMMENT ON TABLE user_stakes IS 'Tracks user staking positions and rewards';
COMMENT ON COLUMN user_stakes.user_wallet IS 'User wallet address (normalized to lowercase)';
COMMENT ON COLUMN user_stakes.pool_id IS 'Reference to the staking pool';
COMMENT ON COLUMN user_stakes.staked_amount IS 'Amount of tokens staked (supports up to 78 digits with 18 decimal places)';
COMMENT ON COLUMN user_stakes.rewards_earned IS 'Total rewards earned so far';
COMMENT ON COLUMN user_stakes.lock_period_days IS 'Number of days the stake is locked';
COMMENT ON COLUMN user_stakes.lock_end_date IS 'Date when the lock period ends';
COMMENT ON COLUMN user_stakes.status IS 'Status: active (currently staked), completed (lock period ended), withdrawn (unstaked)';
COMMENT ON COLUMN user_stakes.transaction_hash IS 'Blockchain transaction hash for the stake/unstake transaction';
