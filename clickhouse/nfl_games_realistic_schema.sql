-- ============================================
-- NFL GAMES TABLE (Realistic - ESPN Data Only)
-- ============================================
-- One row per game with all game-level context
-- Links to nfl_box_scores via game_id

CREATE TABLE IF NOT EXISTS nfl_games (
    game_id UInt32,
    espn_game_id String,  -- ESPN's string ID
    season UInt16,
    week UInt8,
    game_date Date,
    game_time DateTime,
    
    -- TEAMS
    home_team_id UInt16,
    away_team_id UInt16,
    
    -- VENUE & CONTEXT
    venue String,
    city String,
    state String,
    is_neutral_site UInt8,
    is_playoff UInt8,
    
    -- FINAL SCORES
    home_score UInt8,
    away_score UInt8,
    total_points UInt8,
    
    -- GAME OUTCOME
    home_won UInt8,
    margin_of_victory UInt8,
    
    -- SPREAD (from ESPN odds API)
    spread_open Float32,  -- Negative = home favored
    spread_close Float32,
    spread_movement Float32,  -- close - open
    
    home_spread_odds_close Int16,  -- American odds (e.g., -110)
    away_spread_odds_close Int16,
    
    -- SPREAD OUTCOME
    home_covered UInt8,  -- 1 = home covered, 0 = away covered
    spread_push UInt8,
    
    -- MONEYLINE (from ESPN odds API)
    home_ml_open Int16,
    home_ml_close Int16,
    home_ml_movement Int16,
    
    away_ml_open Int16,
    away_ml_close Int16,
    away_ml_movement Int16,
    
    -- TOTAL (from ESPN odds API)
    total_open Float32,
    total_close Float32,
    total_movement Float32,
    
    over_odds_close Int16,
    under_odds_close Int16,
    
    -- TOTAL OUTCOME
    went_over UInt8,
    went_under UInt8,
    total_push UInt8,
    
    -- ODDS PROVIDER
    odds_provider_id UInt16,  -- ESPN's provider ID
    odds_provider_name String,  -- 'ESPN BET', 'Consensus', etc.
    
    -- DIVISION/CONFERENCE FLAGS (calculated)
    is_division_game UInt8,
    is_conference_game UInt8,
    
    -- ESPN WIN PROBABILITY (from predictor endpoint)
    home_win_prob_pregame Float32,  -- ESPN's prediction
    
    created_at DateTime DEFAULT now(),
    updated_at DateTime DEFAULT now()
    
) ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY (season, toYYYYMM(game_date))
ORDER BY (season, week, game_id);

-- Indexes for common queries
ALTER TABLE nfl_games ADD INDEX idx_spread_close spread_close TYPE minmax GRANULARITY 4;
ALTER TABLE nfl_games ADD INDEX idx_total_close total_close TYPE minmax GRANULARITY 4;
ALTER TABLE nfl_games ADD INDEX idx_division_game is_division_game TYPE set(1) GRANULARITY 1;

