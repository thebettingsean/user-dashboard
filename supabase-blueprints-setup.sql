-- ============================================
-- BLUEPRINTS SETUP FOR SUPABASE
-- Run this in your main Supabase project SQL editor
-- ============================================

-- 1. Create blueprints table
CREATE TABLE IF NOT EXISTS blueprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport TEXT NOT NULL CHECK (sport IN ('nfl', 'nba')),
  period_identifier TEXT NOT NULL, -- 'Week 10' for NFL, '2025-11-06' for NBA
  game_count INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL, -- AI-generated markdown/HTML content
  version INTEGER DEFAULT 1, -- Track regenerations
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT unique_blueprint_period UNIQUE(sport, period_identifier)
);

-- 2. Create unlocked_blueprints table (tracks user unlocks with 24-hour pass)
CREATE TABLE IF NOT EXISTS unlocked_blueprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Clerk user ID
  blueprint_id UUID NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
  credits_spent INTEGER DEFAULT 5,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL, -- unlocked_at + 24 hours
  CONSTRAINT unique_user_blueprint UNIQUE(user_id, blueprint_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blueprints_sport_period ON blueprints(sport, period_identifier);
CREATE INDEX IF NOT EXISTS idx_blueprints_expires ON blueprints(expires_at);
CREATE INDEX IF NOT EXISTS idx_unlocked_blueprints_user ON unlocked_blueprints(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_unlocked_blueprints_blueprint ON unlocked_blueprints(blueprint_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE unlocked_blueprints ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies

-- Blueprints: Everyone can read (we'll check access in the API)
CREATE POLICY "Blueprints are viewable by everyone"
  ON blueprints FOR SELECT
  USING (true);

-- Blueprints: Only service role can insert/update (cron jobs)
CREATE POLICY "Only service role can modify blueprints"
  ON blueprints FOR ALL
  USING (auth.role() = 'service_role');

-- Unlocked blueprints: Users can only see their own unlocks
CREATE POLICY "Users can view their own unlocks"
  ON unlocked_blueprints FOR SELECT
  USING (auth.uid()::text = user_id);

-- Unlocked blueprints: Only service role can insert (via API)
CREATE POLICY "Only service role can create unlocks"
  ON unlocked_blueprints FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 6. Create function to clean up expired unlocks (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_expired_blueprint_unlocks()
RETURNS void AS $$
BEGIN
  DELETE FROM unlocked_blueprints
  WHERE expires_at < NOW() - INTERVAL '7 days'; -- Keep history for 7 days after expiration
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Comments for documentation
COMMENT ON TABLE blueprints IS 'Stores AI-generated weekly/daily blueprints for NFL and NBA';
COMMENT ON TABLE unlocked_blueprints IS 'Tracks user unlocks with 24-hour access passes';
COMMENT ON COLUMN blueprints.period_identifier IS 'Week 10 for NFL, YYYY-MM-DD for NBA';
COMMENT ON COLUMN blueprints.version IS 'Increments each time blueprint is regenerated';
COMMENT ON COLUMN unlocked_blueprints.expires_at IS 'Access expires 24 hours after unlock';

-- ============================================
-- TEST DATA (Optional - for development only)
-- Remove this section when running in production
-- ============================================

-- Insert a test NFL blueprint
INSERT INTO blueprints (sport, period_identifier, game_count, content, expires_at)
VALUES (
  'nfl',
  'Week 10',
  15,
  '<h2>NFL Week 10 Blueprint</h2><p>Test content...</p>',
  NOW() + INTERVAL '7 days'
) ON CONFLICT (sport, period_identifier) DO NOTHING;

-- Insert a test NBA blueprint
INSERT INTO blueprints (sport, period_identifier, game_count, content, expires_at)
VALUES (
  'nba',
  '2025-11-06',
  10,
  '<h2>NBA - Nov 6 Blueprint</h2><p>Test content...</p>',
  NOW() + INTERVAL '1 day'
) ON CONFLICT (sport, period_identifier) DO NOTHING;

-- ============================================
-- VERIFY SETUP
-- ============================================

-- Check if tables were created successfully
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN ('blueprints', 'unlocked_blueprints')
  AND table_schema = 'public';

-- Check indexes
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('blueprints', 'unlocked_blueprints')
ORDER BY tablename, indexname;

