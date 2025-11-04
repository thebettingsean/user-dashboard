-- Game Scripts Cache Table
-- Run this in your "Betting Insider Users" Supabase project (same as AI credits)

-- Create game_scripts table for caching AI-generated scripts
CREATE TABLE IF NOT EXISTS game_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Game Identification
  game_id TEXT NOT NULL,
  sport TEXT NOT NULL,
  game_date DATE NOT NULL,
  away_team TEXT NOT NULL,
  home_team TEXT NOT NULL,
  
  -- Script Content
  script_content TEXT NOT NULL,
  data_strength INT NOT NULL CHECK (data_strength IN (1, 2, 3)),
  
  -- Metadata
  generated_at TIMESTAMP DEFAULT NOW(),
  generated_by TEXT, -- clerk_user_id of first user to generate
  view_count INT DEFAULT 0,
  last_viewed_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(game_id, sport, game_date)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_game_scripts_lookup ON game_scripts(game_id, sport, game_date);
CREATE INDEX IF NOT EXISTS idx_game_scripts_date ON game_scripts(game_date);
CREATE INDEX IF NOT EXISTS idx_game_scripts_sport ON game_scripts(sport);

-- Enable Row Level Security
ALTER TABLE game_scripts ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access
CREATE POLICY "Service role has full access" ON game_scripts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to automatically delete old scripts (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_game_scripts()
RETURNS void AS $$
BEGIN
  DELETE FROM game_scripts
  WHERE game_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Optional: Set up a cron job to run cleanup daily (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-old-scripts', '0 6 * * *', 'SELECT cleanup_old_game_scripts()');

