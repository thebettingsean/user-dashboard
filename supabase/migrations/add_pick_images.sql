-- Add image columns to picks table for analyst pick submissions
-- These will store URLs to team logos and player headshots

ALTER TABLE picks ADD COLUMN IF NOT EXISTS away_team_image TEXT;
ALTER TABLE picks ADD COLUMN IF NOT EXISTS home_team_image TEXT;
ALTER TABLE picks ADD COLUMN IF NOT EXISTS prop_image TEXT;
ALTER TABLE picks ADD COLUMN IF NOT EXISTS game_title TEXT;

-- Add comment for documentation
COMMENT ON COLUMN picks.away_team_image IS 'URL to away team logo';
COMMENT ON COLUMN picks.home_team_image IS 'URL to home team logo';
COMMENT ON COLUMN picks.prop_image IS 'URL to player headshot (for prop bets only)';
COMMENT ON COLUMN picks.game_title IS 'Human-readable game title (e.g., "Broncos @ Chiefs")';

