-- ============================================================================
-- Adverts & Promotions System
-- ============================================================================

-- Create adverts table to store advertisements and promotions
CREATE TABLE IF NOT EXISTS adverts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN (
    'Internal Promotion (TW features, staking pools, governance, updates)',
    'Partner Promotion (External ecosystem partners)',
    'Sponsored Campaign (Paid placement)'
  )),
  advert_format TEXT NOT NULL CHECK (advert_format IN (
    'Banner (Horizontal)',
    'Card (Inline)',
    'Modal (High Placement - timed pop-up)'
  )),
  headline TEXT,
  message_body TEXT,
  audience_targeting TEXT CHECK (audience_targeting IN (
    'All Users',
    'Token Holders',
    'Traders',
    'Stakers',
    'LPs',
    'DAO Voters'
  )),
  priority_level TEXT CHECK (priority_level IN (
    'Normal',
    'Mid-tier',
    'Sponsored (locks placement)'
  )),
  compliance_no_misleading BOOLEAN DEFAULT FALSE,
  compliance_no_unsolicited BOOLEAN DEFAULT FALSE,
  compliance_clear_risk_language BOOLEAN DEFAULT FALSE,
  compliance_partner_verified BOOLEAN DEFAULT FALSE,
  compliance_confirmed BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);

-- Create indexes for adverts
CREATE INDEX IF NOT EXISTS idx_adverts_status ON adverts(status);
CREATE INDEX IF NOT EXISTS idx_adverts_campaign_type ON adverts(campaign_type);
CREATE INDEX IF NOT EXISTS idx_adverts_created_at ON adverts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adverts_status_created ON adverts(status, created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_adverts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_adverts_updated_at
  BEFORE UPDATE ON adverts
  FOR EACH ROW
  EXECUTE FUNCTION update_adverts_updated_at();

