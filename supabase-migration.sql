-- Cancellation Feedback Table for Retention Flow
-- Run this in your Supabase SQL Editor (Funnel Analytics project)

CREATE TABLE IF NOT EXISTS cancellation_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- User identification
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  clerk_user_id TEXT,
  
  -- Subscription details
  subscription_id TEXT NOT NULL,
  subscription_type TEXT,  -- 'bets', 'stats', 'advantage', 'fantasy'
  subscription_tier TEXT,  -- 'weekly', 'monthly', '6-month'
  subscription_price TEXT,
  subscription_tenure_days INTEGER,
  is_legacy_user BOOLEAN DEFAULT FALSE,
  was_on_trial BOOLEAN DEFAULT FALSE,
  
  -- Cancellation reasons (multi-select)
  reason_codes TEXT[],  -- Array: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  -- A = Too expensive
  -- B = Data not useful
  -- C = Data not accurate
  -- D = Poor analyst picks
  -- E = Moving to a competitor
  -- F = Not used enough
  -- G = Too much info
  -- H = Other
  reason_other_text TEXT,
  
  -- Retention offer tracking
  first_offer_type TEXT,  -- 'trial_extension_7', 'free_week', 'free_2_weeks', 'lifetime_50_off'
  first_offer_days INTEGER,
  first_offer_accepted BOOLEAN DEFAULT FALSE,
  first_offer_declined_at TIMESTAMPTZ,
  
  final_offer_shown BOOLEAN DEFAULT FALSE,
  final_offer_accepted BOOLEAN DEFAULT FALSE,
  final_offer_declined_at TIMESTAMPTZ,
  
  -- Outcome
  cancelled_at TIMESTAMPTZ,
  cancellation_completed BOOLEAN DEFAULT FALSE,
  new_subscription_id TEXT,  -- If they accepted an offer and got a new sub
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_cancellation_user_id ON cancellation_feedback(user_id);
CREATE INDEX idx_cancellation_subscription_id ON cancellation_feedback(subscription_id);
CREATE INDEX idx_cancellation_email ON cancellation_feedback(user_email);
CREATE INDEX idx_cancellation_created_at ON cancellation_feedback(created_at DESC);

-- Enable Row Level Security (optional - adjust based on your needs)
ALTER TABLE cancellation_feedback ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to do everything
CREATE POLICY "Service role can do everything" ON cancellation_feedback
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cancellation_feedback_updated_at 
    BEFORE UPDATE ON cancellation_feedback 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Done! Run this in your Supabase SQL Editor

