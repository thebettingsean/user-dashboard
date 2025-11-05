-- Table to track which picks a user has unlocked
CREATE TABLE IF NOT EXISTS unlocked_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  pick_id TEXT, -- NULL for "all picks for 24 hours" unlocks
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unlock_type TEXT NOT NULL CHECK (unlock_type IN ('single', 'all_day')),
  expires_at TIMESTAMP WITH TIME ZONE, -- Only used for 'all_day' unlocks
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_unlocked_picks_user_id ON unlocked_picks(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_unlocked_picks_pick_id ON unlocked_picks(pick_id);
CREATE INDEX IF NOT EXISTS idx_unlocked_picks_expires ON unlocked_picks(expires_at);

-- Composite index for checking access
CREATE INDEX IF NOT EXISTS idx_unlocked_picks_user_pick ON unlocked_picks(clerk_user_id, pick_id);

-- Enable Row Level Security
ALTER TABLE unlocked_picks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own unlocked picks
CREATE POLICY "Users can view own unlocked picks" ON unlocked_picks
  FOR SELECT
  USING (true); -- Allow service role to query all

-- Policy: Service role can insert
CREATE POLICY "Service role can insert" ON unlocked_picks
  FOR INSERT
  WITH CHECK (true);

-- Clean up expired "all_day" unlocks (optional - can be run as a cron job)
-- DELETE FROM unlocked_picks 
-- WHERE unlock_type = 'all_day' 
-- AND expires_at < NOW();

