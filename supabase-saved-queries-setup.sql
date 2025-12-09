-- ============================================
-- SAVED QUERIES SETUP FOR SUPABASE
-- Run this in your USERS Supabase project SQL editor
-- URL: https://pkmqhozyorpmteytizut.supabase.co
-- ============================================

-- 1. Create saved_queries table
CREATE TABLE IF NOT EXISTS saved_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Query configuration (stored as JSONB for flexibility)
  query_config JSONB NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  
  -- Optional: Store last result summary for quick reference
  last_result_summary JSONB,
  
  CONSTRAINT unique_user_query_name UNIQUE(clerk_user_id, name)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_queries_user_id ON saved_queries(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_saved_queries_created_at ON saved_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_queries_updated_at ON saved_queries(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_queries_last_run ON saved_queries(last_run_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE saved_queries ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- Users can only see their own saved queries
CREATE POLICY "Users can view their own saved queries"
  ON saved_queries FOR SELECT
  USING (auth.uid()::text = clerk_user_id OR clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can insert their own saved queries
CREATE POLICY "Users can insert their own saved queries"
  ON saved_queries FOR INSERT
  WITH CHECK (auth.uid()::text = clerk_user_id OR clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can update their own saved queries
CREATE POLICY "Users can update their own saved queries"
  ON saved_queries FOR UPDATE
  USING (auth.uid()::text = clerk_user_id OR clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (auth.uid()::text = clerk_user_id OR clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can delete their own saved queries
CREATE POLICY "Users can delete their own saved queries"
  ON saved_queries FOR DELETE
  USING (auth.uid()::text = clerk_user_id OR clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Note: Since we're using service role key in the API, these policies are mainly for direct database access
-- The API will handle authentication via Clerk

