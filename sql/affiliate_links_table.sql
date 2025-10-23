-- Affiliate Links Table for Pushlap Webhook Data
-- Store affiliate links received from Pushlap webhooks

CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  affiliate_id TEXT NOT NULL UNIQUE,
  link TEXT,
  first_name TEXT,
  last_name TEXT,
  status TEXT,
  commission_rate NUMERIC,
  total_commission_earned NUMERIC DEFAULT 0,
  number_of_referred_users INTEGER DEFAULT 0,
  number_of_clicks INTEGER DEFAULT 0,
  details_complete BOOLEAN DEFAULT false,
  payout_email TEXT,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_affiliate_links_email ON affiliate_links(email);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_affiliate_id ON affiliate_links(affiliate_id);

-- Enable Row Level Security
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to do everything
CREATE POLICY "Service role has full access" ON affiliate_links
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_affiliate_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_affiliate_links_timestamp ON affiliate_links;
CREATE TRIGGER update_affiliate_links_timestamp
  BEFORE UPDATE ON affiliate_links
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_links_updated_at();

