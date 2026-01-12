-- Supabase Database Schema for Referral System
-- 
-- Run this SQL in your Supabase SQL Editor to create the tables
-- 
-- Tables:
-- 1. referral_codes - Stores referral codes
-- 2. referrals - Stores referral relationships
-- 3. referral_activity - Stores recent activity feed

-- Create referral_codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Create index on code for fast lookups
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_wallet ON referral_codes(wallet_address);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON referral_codes(is_active) WHERE is_active = TRUE;

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_code TEXT NOT NULL,
  referrer_wallet TEXT NOT NULL,
  referee_wallet TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

-- Create indexes for referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_wallet ON referrals(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_referee_wallet ON referrals(referee_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referrer_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status) WHERE status = 'active';

-- Create unique constraint to prevent duplicate referrals
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_unique_referee ON referrals(referee_wallet) WHERE status = 'active';

-- Create referral_activity table
CREATE TABLE IF NOT EXISTS referral_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  reward NUMERIC(18, 2) NOT NULL DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for activity queries (ordered by timestamp)
CREATE INDEX IF NOT EXISTS idx_referral_activity_timestamp ON referral_activity(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_referral_activity_wallet ON referral_activity(wallet_address);

-- Create trading_volume table to track referee trading volume for rebate calculations
CREATE TABLE IF NOT EXISTS trading_volume (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referee_wallet TEXT NOT NULL,
  referrer_wallet TEXT NOT NULL,
  spot_volume NUMERIC(18, 2) NOT NULL DEFAULT 0,
  perp_volume NUMERIC(18, 2) NOT NULL DEFAULT 0,
  trade_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for trading volume
CREATE INDEX IF NOT EXISTS idx_trading_volume_referee ON trading_volume(referee_wallet);
CREATE INDEX IF NOT EXISTS idx_trading_volume_referrer ON trading_volume(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_trading_volume_date ON trading_volume(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_trading_volume_referee_date ON trading_volume(referee_wallet, trade_date DESC);

-- Create referral_rewards table to track accumulated rewards
CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_wallet TEXT NOT NULL,
  total_rewards NUMERIC(18, 2) NOT NULL DEFAULT 0,
  claimable_rewards NUMERIC(18, 2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for referral rewards
CREATE INDEX IF NOT EXISTS idx_referral_rewards_wallet ON referral_rewards(referrer_wallet);

-- Enable Row Level Security (RLS) - Optional, adjust based on your needs
-- ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE referral_activity ENABLE ROW LEVEL SECURITY;

-- Create policies if RLS is enabled (example - adjust as needed)
-- Policy: Anyone can read referral codes (for validation)
-- CREATE POLICY "Allow public read on referral_codes" ON referral_codes FOR SELECT USING (true);

-- Policy: Anyone can insert referral codes (users can create their own)
-- CREATE POLICY "Allow public insert on referral_codes" ON referral_codes FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own referral codes
-- CREATE POLICY "Allow update own referral_codes" ON referral_codes FOR UPDATE USING (wallet_address = current_setting('app.wallet_address', true));

-- Similar policies for referrals and referral_activity tables...

-- ============================================================================
-- TIWI Platform Activity Tracking
-- ============================================================================

-- Create tiwi_transactions table to track all transactions performed through TIWI platform
CREATE TABLE IF NOT EXISTS tiwi_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Swap', 'Sent', 'Received', 'Stake', 'Unstake', 'Approve', 'Transfer', 'DeFi', 'NFTTransfer', 'ContractCall')),
  from_token_address TEXT,
  from_token_symbol TEXT,
  to_token_address TEXT,
  to_token_symbol TEXT,
  amount TEXT,
  amount_formatted TEXT,
  usd_value NUMERIC(18, 2),
  router_name TEXT, -- e.g., 'lifi', 'squid', 'uniswap', 'pancakeswap'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  block_number INTEGER,
  block_timestamp TIMESTAMPTZ
);

-- Create indexes for tiwi_transactions
CREATE INDEX IF NOT EXISTS idx_tiwi_transactions_wallet ON tiwi_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_tiwi_transactions_hash ON tiwi_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_tiwi_transactions_chain ON tiwi_transactions(chain_id);
CREATE INDEX IF NOT EXISTS idx_tiwi_transactions_type ON tiwi_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_tiwi_transactions_timestamp ON tiwi_transactions(block_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tiwi_transactions_wallet_timestamp ON tiwi_transactions(wallet_address, block_timestamp DESC);

-- Create unique constraint to prevent duplicate transaction tracking
CREATE UNIQUE INDEX IF NOT EXISTS idx_tiwi_transactions_unique ON tiwi_transactions(transaction_hash, chain_id);

-- Create tiwi_nft_activities table to track NFT activities performed through TIWI platform
CREATE TABLE IF NOT EXISTS tiwi_nft_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  contract_address TEXT NOT NULL,
  token_id TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('mint', 'transfer', 'sent', 'received', 'sale', 'purchase')),
  from_address TEXT,
  to_address TEXT,
  price TEXT,
  price_usd NUMERIC(18, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  block_timestamp TIMESTAMPTZ
);

-- Create indexes for tiwi_nft_activities
CREATE INDEX IF NOT EXISTS idx_tiwi_nft_activities_wallet ON tiwi_nft_activities(wallet_address);
CREATE INDEX IF NOT EXISTS idx_tiwi_nft_activities_hash ON tiwi_nft_activities(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_tiwi_nft_activities_contract ON tiwi_nft_activities(contract_address);
CREATE INDEX IF NOT EXISTS idx_tiwi_nft_activities_timestamp ON tiwi_nft_activities(block_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tiwi_nft_activities_wallet_timestamp ON tiwi_nft_activities(wallet_address, block_timestamp DESC);

-- Create unique constraint to prevent duplicate NFT activity tracking
CREATE UNIQUE INDEX IF NOT EXISTS idx_tiwi_nft_activities_unique ON tiwi_nft_activities(transaction_hash, chain_id, contract_address, token_id);

