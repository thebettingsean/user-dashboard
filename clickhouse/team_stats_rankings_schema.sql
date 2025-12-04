-- ============================================
-- TEAM STATS & RANKINGS TABLES
-- For calculating opponent defensive/offensive ranks
-- ============================================

-- ============================================
-- NFL TEAM STATS (Per Game)
-- ============================================
CREATE TABLE IF NOT EXISTS nfl_team_stats (
    team_id UInt16,
    game_id UInt32,
    season UInt16,
    week UInt8,
    game_date Date,
    opponent_id UInt16,
    is_home UInt8,
    
    -- GAME OUTCOME
    points_scored UInt8,
    points_allowed UInt8,
    won UInt8,
    
    -- OFFENSIVE STATS (what this team did)
    total_yards UInt16,
    passing_yards UInt16,
    rushing_yards UInt16,
    passing_attempts UInt8,
    completions UInt8,
    passing_tds UInt8,
    interceptions_thrown UInt8,
    rushing_attempts UInt8,
    rushing_tds UInt8,
    sacks_taken UInt8,
    turnovers UInt8,
    
    first_downs UInt8,
    third_down_attempts UInt8,
    third_down_conversions UInt8,
    third_down_pct Float32,
    
    redzone_attempts UInt8,
    redzone_scores UInt8,
    redzone_pct Float32,
    
    time_of_possession_seconds UInt16,
    
    -- DEFENSIVE STATS (what opponent did against this team)
    def_total_yards_allowed UInt16,
    def_passing_yards_allowed UInt16,
    def_rushing_yards_allowed UInt16,
    def_sacks UInt8,
    def_turnovers_forced UInt8,
    def_interceptions UInt8,
    
    created_at DateTime DEFAULT now()
    
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(game_date)
ORDER BY (season, week, team_id, game_id);

-- ============================================
-- NFL TEAM RANKINGS (Weekly Cumulative)
-- ============================================
CREATE TABLE IF NOT EXISTS nfl_team_rankings (
    team_id UInt16,
    season UInt16,
    week UInt8,
    
    games_played UInt8,
    
    -- OFFENSIVE RANKS (1-32, lower = better)
    rank_points_per_game UInt8,
    rank_total_yards_per_game UInt8,
    rank_passing_yards_per_game UInt8,
    rank_rushing_yards_per_game UInt8,
    rank_third_down_pct UInt8,
    rank_redzone_pct UInt8,
    
    -- DEFENSIVE RANKS (1-32, lower = better defense)
    rank_points_allowed_per_game UInt8,
    rank_total_yards_allowed_per_game UInt8,
    rank_passing_yards_allowed_per_game UInt8,
    rank_rushing_yards_allowed_per_game UInt8,
    rank_sacks_per_game UInt8,
    rank_turnovers_forced_per_game UInt8,
    
    -- ACTUAL VALUES (for reference)
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

-- ============================================
-- NBA TEAM STATS (Per Game)
-- ============================================
CREATE TABLE IF NOT EXISTS nba_team_stats (
    team_id UInt16,
    game_id UInt32,
    season UInt16,
    game_date Date,
    opponent_id UInt16,
    is_home UInt8,
    
    -- GAME OUTCOME
    points_scored UInt8,
    points_allowed UInt8,
    won UInt8,
    
    -- OFFENSIVE STATS
    field_goals_made UInt8,
    field_goals_attempted UInt8,
    field_goal_pct Float32,
    three_pointers_made UInt8,
    three_pointers_attempted UInt8,
    three_point_pct Float32,
    free_throws_made UInt8,
    free_throws_attempted UInt8,
    free_throw_pct Float32,
    
    offensive_rebounds UInt8,
    total_rebounds UInt8,
    assists UInt8,
    turnovers UInt8,
    
    -- DEFENSIVE STATS
    def_field_goals_allowed UInt8,
    def_field_goals_attempted UInt8,
    def_field_goal_pct Float32,
    def_three_pointers_allowed UInt8,
    def_three_point_pct Float32,
    def_total_rebounds UInt8,
    steals UInt8,
    blocks UInt8,
    
    created_at DateTime DEFAULT now()
    
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(game_date)
ORDER BY (season, game_date, team_id, game_id);

-- ============================================
-- NBA TEAM RANKINGS (Weekly Cumulative)
-- ============================================
CREATE TABLE IF NOT EXISTS nba_team_rankings (
    team_id UInt16,
    season UInt16,
    week UInt8,
    
    games_played UInt8,
    
    -- OFFENSIVE RANKS (1-30, lower = better)
    rank_points_per_game UInt8,
    rank_field_goal_pct UInt8,
    rank_three_point_pct UInt8,
    rank_assists_per_game UInt8,
    rank_offensive_rebounds_per_game UInt8,
    
    -- DEFENSIVE RANKS (1-30, lower = better defense)
    rank_points_allowed_per_game UInt8,
    rank_opp_field_goal_pct UInt8,
    rank_opp_three_point_pct UInt8,
    rank_steals_per_game UInt8,
    rank_blocks_per_game UInt8,
    
    -- ACTUAL VALUES
    points_per_game Float32,
    points_allowed_per_game Float32,
    field_goal_pct Float32,
    three_point_pct Float32,
    opp_field_goal_pct Float32,
    opp_three_point_pct Float32,
    
    updated_at DateTime DEFAULT now()
    
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (season, week, team_id);

