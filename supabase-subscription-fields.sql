-- Migration: Add Subscription Management Fields
-- Run this in your Supabase SQL Editor for "Betting Insider Users" project

-- Add subscription tracking columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_price_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end BIGINT,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_subscription_id ON users(subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- Add comments for documentation
COMMENT ON COLUMN users.subscription_id IS 'Stripe subscription ID (sub_xxx)';
COMMENT ON COLUMN users.subscription_status IS 'active, canceled, past_due, etc.';
COMMENT ON COLUMN users.subscription_price_id IS 'Stripe price ID (price_xxx) - identifies the plan';
COMMENT ON COLUMN users.subscription_end_date IS 'Date when subscription ends (for display)';
COMMENT ON COLUMN users.current_period_end IS 'Unix timestamp of when current period ends';
COMMENT ON COLUMN users.cancel_at_period_end IS 'True if subscription is set to cancel at period end';

