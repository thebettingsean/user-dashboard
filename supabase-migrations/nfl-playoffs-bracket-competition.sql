-- NFL Playoffs Bracket Competition Tables
-- Run this in your Supabase SQL editor for the Betting Insider Users database

-- Groups table: stores bracket competition groups
CREATE TABLE IF NOT EXISTS nfl_playoff_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL, -- Clerk user ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group members table: tracks which users are in which groups
CREATE TABLE IF NOT EXISTS nfl_playoff_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES nfl_playoff_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Clerk user ID
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id) -- One membership per user per group
);

-- Brackets table: stores user bracket selections for each group
CREATE TABLE IF NOT EXISTS nfl_playoff_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Clerk user ID
  group_id UUID NOT NULL REFERENCES nfl_playoff_groups(id) ON DELETE CASCADE,
  selections JSONB NOT NULL, -- Stores the bracket selections
  score INTEGER DEFAULT 0, -- Calculated score based on game results
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, group_id) -- One bracket per user per group
);

-- Game results table: stores actual game outcomes (entered by admin)
CREATE TABLE IF NOT EXISTS nfl_playoff_game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_key TEXT NOT NULL UNIQUE, -- e.g., 'afc_wc_1', 'afc_div_1', 'sb'
  winner TEXT NOT NULL, -- Team slug that won
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON nfl_playoff_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON nfl_playoff_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_brackets_group_id ON nfl_playoff_brackets(group_id);
CREATE INDEX IF NOT EXISTS idx_brackets_user_id ON nfl_playoff_brackets(user_id);
CREATE INDEX IF NOT EXISTS idx_brackets_score ON nfl_playoff_brackets(group_id, score DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_nfl_playoff_groups_updated_at
  BEFORE UPDATE ON nfl_playoff_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nfl_playoff_brackets_updated_at
  BEFORE UPDATE ON nfl_playoff_brackets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

