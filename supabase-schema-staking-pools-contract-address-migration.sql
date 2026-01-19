-- ============================================================================
-- Staking Pools Contract Address Migration
-- ============================================================================
-- Adds contract_address column to link staking pools to deployed smart contracts

-- Add contract_address column
ALTER TABLE staking_pools 
  ADD COLUMN IF NOT EXISTS contract_address TEXT;

-- Add index for contract address queries
CREATE INDEX IF NOT EXISTS idx_staking_pools_contract_address ON staking_pools(contract_address) 
  WHERE contract_address IS NOT NULL;
