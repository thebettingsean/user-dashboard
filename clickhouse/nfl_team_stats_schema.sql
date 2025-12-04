-- ============================================
-- NFL TEAM STATS TABLE (Weekly Aggregated)
-- ============================================
-- This table stores weekly team performance stats
-- Used to calculate defensive/offensive rankings at any point in time

CREATE TABLE IF NOT EXISTS nfl_team_stats (
    team_id UInt16,
    season UInt16,
    week UInt8,
    game_id UInt32,  -- The specific game these stats are from
    game_date Date,
    opponent_id UInt16,
    is_home UInt8,
    
    -- GAME OUTCOME
    points_scored UInt8,
    points_allowed UInt8,
    won UInt8,  -- 1 = win, 0 = loss
    
    -- OFFENSIVE STATS (what this team did)
    total_yards UInt16,
    passing_yards UInt16,
    rushing_yards UInt16,
    passing_attempts UInt8,
    completions UInt8,
    rushing_attempts UInt8,
    sacks_taken UInt8,
    turnovers UInt8,  -- INTs + Fumbles Lost
    
    first_downs UInt8,
    third_down_attempts UInt8,
    third_down_conversions UInt8,
    third_down_pct Float32,
    
    redzone_attempts UInt8,
    redzone_scores UInt8,
    redzone_pct Float32,
    
    time_of_possession_seconds UInt16,
    total_plays UInt8,
    
    -- DEFENSIVE STATS (what opponent did against this team)
    def_total_yards_allowed UInt16,
    def_passing_yards_allowed UInt16,
    def_rushing_yards_allowed UInt16,
    def_passing_attempts_allowed UInt8,
    def_completions_allowed UInt8,
    def_rushing_attempts_allowed UInt8,
    def_sacks UInt8,
    def_turnovers_forced UInt8,  -- INTs + Fumbles Recovered
    def_interceptions UInt8,
    
    def_first_downs_allowed UInt8,
    def_third_down_attempts UInt8,
    def_third_down_conversions_allowed UInt8,
    def_third_down_pct Float32,
    
    def_redzone_attempts UInt8,
    def_redzone_scores_allowed UInt8,
    def_redzone_pct Float32,
    
    -- SPECIAL TEAMS (for completeness)
    punt_return_yards UInt16,
    kick_return_yards UInt16,
    
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(game_date)
ORDER BY (season, week, team_id);

-- ============================================
-- NFL TEAM RANKINGS TABLE (Calculated Weekly)
-- ============================================
-- This table stores team rankings as of each week
-- Calculated by aggregating all games up to that week

CREATE TABLE IF NOT EXISTS nfl_team_rankings (
    team_id UInt16,
    season UInt16,
    week UInt8,  -- Rankings "through" this week
    
    -- OFFENSIVE RANKS (1-32, lower is better)
    rank_points_per_game UInt8,
    rank_total_yards_per_game UInt8,
    rank_passing_yards_per_game UInt8,
    rank_rushing_yards_per_game UInt8,
    rank_third_down_pct UInt8,
    rank_redzone_pct UInt8,
    rank_turnovers_per_game UInt8,  -- Higher rank = fewer turnovers
    
    -- DEFENSIVE RANKS (1-32, lower is better = best defense)
    rank_points_allowed_per_game UInt8,
    rank_total_yards_allowed_per_game UInt8,
    rank_passing_yards_allowed_per_game UInt8,
    rank_rushing_yards_allowed_per_game UInt8,
    rank_sacks_per_game UInt8,
    rank_turnovers_forced_per_game UInt8,
    rank_third_down_def_pct UInt8,
    rank_redzone_def_pct UInt8,
    
    -- ACTUAL VALUES (for context)
    games_played UInt8,
    points_per_game Float32,
    points_allowed_per_game Float32,
    total_yards_per_game Float32,
    total_yards_allowed_per_game Float32,
    passing_yards_per_game Float32,
    passing_yards_allowed_per_game Float32,
    rushing_yards_per_game Float32,
    rushing_yards_allowed_per_game Float32,
    
    updated_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (season, week, team_id);

