-- Betting Insider Users - AI Credits System
-- Run this in your Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  stripe_customer_id TEXT,
  
  -- AI Credits
  ai_scripts_used INT DEFAULT 0,
  ai_scripts_reset_at TIMESTAMP DEFAULT NOW(),
  ai_scripts_limit INT DEFAULT 3,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW(),
  is_premium BOOLEAN DEFAULT FALSE
);

-- Index for fast lookups by Clerk ID
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);

-- Index for premium users
CREATE INDEX IF NOT EXISTS idx_users_premium ON users(is_premium);

-- Index for credit resets (for cron job)
CREATE INDEX IF NOT EXISTS idx_users_reset ON users(ai_scripts_reset_at);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role has full access" ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

