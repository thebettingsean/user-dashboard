-- Create game_scripts table for AI-generated game scripts cache
-- This table stores cached AI scripts to reduce OpenAI API costs
-- Run this in your Supabase SQL editor for the "Betting Insider Users" project

CREATE TABLE IF NOT EXISTS public.game_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL,
  sport TEXT NOT NULL,
  game_time TIMESTAMP NOT NULL,
  time_window TEXT NOT NULL CHECK (time_window IN ('morning', 'afternoon', 'evening')),
  script TEXT NOT NULL,
  data_strength INTEGER NOT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Ensure one cached script per game per time window
  UNIQUE(game_id, sport, game_time, time_window)
);

-- Index for fast lookups by game_id and sport
CREATE INDEX IF NOT EXISTS idx_game_scripts_lookup 
ON public.game_scripts(game_id, sport, game_time);

-- Index for time_window queries
CREATE INDEX IF NOT EXISTS idx_game_scripts_window 
ON public.game_scripts(time_window);

-- Index for cleanup queries (find expired scripts)
CREATE INDEX IF NOT EXISTS idx_game_scripts_expires 
ON public.game_scripts(expires_at);

-- Enable Row Level Security
ALTER TABLE public.game_scripts ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read scripts
CREATE POLICY "Allow authenticated read access" ON public.game_scripts
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role to insert/update/delete
CREATE POLICY "Allow service role full access" ON public.game_scripts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.game_scripts IS 'Cached AI-generated game scripts to reduce API costs. Scripts refresh every 4 hours based on time_window.';
