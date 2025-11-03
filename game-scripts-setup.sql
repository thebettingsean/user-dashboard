-- Create table for storing AI game scripts
CREATE TABLE IF NOT EXISTS game_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL UNIQUE,
  sport TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  game_time TIMESTAMPTZ NOT NULL,
  script_content TEXT NOT NULL,
  data_strength INTEGER DEFAULT 1,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by game_id
CREATE INDEX IF NOT EXISTS idx_game_scripts_game_id ON game_scripts(game_id);

-- Index for cleanup of expired scripts
CREATE INDEX IF NOT EXISTS idx_game_scripts_expires_at ON game_scripts(expires_at);

-- Index for sport filtering
CREATE INDEX IF NOT EXISTS idx_game_scripts_sport ON game_scripts(sport);

