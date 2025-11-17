-- Add team_rankings column to game_snapshots table
-- This will store TeamRankings.com data for both home and away teams
-- Refreshed weekly for NFL, daily for NBA/NHL

ALTER TABLE game_snapshots 
ADD COLUMN IF NOT EXISTS team_rankings jsonb;

-- Add comment to document the structure
COMMENT ON COLUMN game_snapshots.team_rankings IS 
'Stores TeamRankings.com data for both teams. Structure:
{
  "home_team": {
    "team": "Dallas Cowboys",
    "sport": "NFL",
    "offense": { "points_per_game": { "value": 29.4, "rank": 3 }, ... },
    "defense": { "points_per_game_allowed": { "value": 21.8, "rank": 15 }, ... },
    "atsResults": [...]
  },
  "away_team": {
    "team": "Las Vegas Raiders",
    "sport": "NFL",
    "offense": { ... },
    "defense": { ... },
    "atsResults": [...]
  },
  "fetched_at": "2025-01-15T10:00:00Z"
}';

