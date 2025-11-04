-- Migration: Add Credit Pack Support & Access Levels
-- Run this in your Supabase SQL Editor for "Betting Insider Users" project

-- 1. Add new columns for credit packs and access levels
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS purchased_credits INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'none' CHECK (access_level IN ('none', 'ai_only', 'full'));

-- 2. Update existing users:
--    - Premium users get 'full' access
--    - Free users get 'none' access
UPDATE users
SET access_level = CASE
  WHEN is_premium = true THEN 'full'
  ELSE 'none'
END;

-- 3. Set ai_scripts_limit to 0 for all users (no free credits)
UPDATE users
SET ai_scripts_limit = 0;

-- 4. Add index for access level lookups
CREATE INDEX IF NOT EXISTS idx_users_access_level ON users(access_level);

-- 5. Add comments for documentation
COMMENT ON COLUMN users.purchased_credits IS 'One-time purchased credits (from $10 pack). Non-renewing.';
COMMENT ON COLUMN users.access_level IS 'none = no access, ai_only = credit pack only, full = subscription';
COMMENT ON COLUMN users.ai_scripts_limit IS 'Weekly free credits (now 0 for all users)';

