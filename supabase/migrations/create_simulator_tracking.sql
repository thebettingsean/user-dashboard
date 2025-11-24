-- Create simulator_events table for tracking all simulator interactions
CREATE TABLE IF NOT EXISTS simulator_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT, -- Clerk user ID (nullable for non-signed-in users)
  session_id TEXT NOT NULL, -- Cookie-based session identifier
  user_type TEXT NOT NULL CHECK (user_type IN ('free', 'paid')),
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'simulation_ran', 'versus_link_clicked', 'popup_shown', 'popup_clicked')),
  sport TEXT CHECK (sport IN ('nfl', 'nba', 'college-football', 'college-basketball')), -- Only required for simulation_ran events
  metadata JSONB, -- Extra data (e.g., away_team, home_team, results)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_simulator_events_session_id ON simulator_events(session_id);
CREATE INDEX IF NOT EXISTS idx_simulator_events_user_id ON simulator_events(user_id);
CREATE INDEX IF NOT EXISTS idx_simulator_events_user_type ON simulator_events(user_type);
CREATE INDEX IF NOT EXISTS idx_simulator_events_event_type ON simulator_events(event_type);
CREATE INDEX IF NOT EXISTS idx_simulator_events_sport ON simulator_events(sport);
CREATE INDEX IF NOT EXISTS idx_simulator_events_created_at ON simulator_events(created_at);

-- Enable Row Level Security
ALTER TABLE simulator_events ENABLE ROW LEVEL SECURITY;

-- Policy: Allow inserts from anyone (tracking events)
CREATE POLICY "Allow public insert for simulator_events"
  ON simulator_events
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Allow reads for authenticated users only (for analytics)
CREATE POLICY "Allow authenticated read for simulator_events"
  ON simulator_events
  FOR SELECT
  TO authenticated
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE simulator_events IS 'Tracks all user interactions with the sports simulator (free and paid users)';

