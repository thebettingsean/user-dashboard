-- Create free_game_scripts table for storing FREE game analysis scripts
-- These are generated from TeamRankings data only - no betting picks

CREATE TABLE IF NOT EXISTS free_game_scripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id TEXT NOT NULL,
  sport TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  game_time TIMESTAMPTZ,
  script_content TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint on game_id + sport to prevent duplicates
  UNIQUE(game_id, sport)
);

-- Index for fast lookups by game
CREATE INDEX IF NOT EXISTS idx_free_game_scripts_game_id ON free_game_scripts(game_id);
CREATE INDEX IF NOT EXISTS idx_free_game_scripts_sport ON free_game_scripts(sport);
CREATE INDEX IF NOT EXISTS idx_free_game_scripts_game_time ON free_game_scripts(game_time);

-- RLS policies (if using Supabase Auth)
ALTER TABLE free_game_scripts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read free scripts (they're free!)
CREATE POLICY "Free scripts are readable by everyone" ON free_game_scripts
  FOR SELECT USING (true);

-- Only allow service role to insert/update
CREATE POLICY "Only service role can insert free scripts" ON free_game_scripts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Only service role can update free scripts" ON free_game_scripts
  FOR UPDATE USING (true);

COMMENT ON TABLE free_game_scripts IS 'Stores FREE AI-generated game preview scripts based on TeamRankings data only. No betting picks or recommendations.';

