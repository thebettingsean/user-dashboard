-- ============================================
-- NFL GAMES TABLE (Comprehensive)
-- ============================================
-- This is the master game table storing ALL context:
-- - Game metadata (teams, date, location)
-- - Final scores & outcomes
-- - Complete betting data (open, close, movement)
-- - Betting outcomes (covers, totals)
-- - Game context (weather, rest, situation)
-- - Enables: Props, line movement analysis, trends, backtesting

CREATE TABLE IF NOT EXISTS nfl_games (
    game_id UInt32,
    espn_game_id String,  -- ESPN's ID format
    season UInt16,
    week UInt8,
    game_date Date,
    game_time DateTime,
    
    -- TEAMS
    home_team_id UInt16,
    away_team_id UInt16,
    home_team_name String,
    away_team_name String,
    
    -- GAME LOCATION & CONTEXT
    venue String,
    city String,
    state String,
    is_neutral_site UInt8,
    is_dome UInt8,
    
    -- WEATHER (for outdoor games)
    temperature Int8,  -- Fahrenheit
    wind_speed UInt8,  -- MPH
    weather_condition String,  -- 'Clear', 'Rain', 'Snow', etc.
    
    -- GAME TYPE
    is_playoff UInt8,
    is_division_game UInt8,
    is_conference_game UInt8,
    playoff_round String,  -- 'Wild Card', 'Divisional', 'Conference', 'Super Bowl'
    
    -- SCHEDULE CONTEXT
    home_rest_days UInt8,  -- Days since last game
    away_rest_days UInt8,
    home_is_primetime UInt8,
    broadcast_network String,  -- 'FOX', 'CBS', 'NBC', 'ESPN', 'Amazon'
    
    -- FINAL SCORES
    home_score UInt8,
    away_score UInt8,
    total_points UInt8,  -- home_score + away_score
    
    -- GAME OUTCOMES
    home_won UInt8,  -- 1 = home team won, 0 = away won
    winning_team_id UInt16,
    losing_team_id UInt16,
    margin_of_victory UInt8,  -- Absolute difference
    
    -- SPREAD BETTING
    spread_open Float32,  -- Negative = home favored (e.g., -7 means home is 7-point favorite)
    spread_close Float32,
    spread_movement Float32,  -- close - open (positive = line moved toward home)
    
    home_spread_odds_open Int16,  -- American odds (e.g., -110)
    home_spread_odds_close Int16,
    away_spread_odds_open Int16,
    away_spread_odds_close Int16,
    
    -- SPREAD OUTCOMES
    home_covered UInt8,  -- 1 = home covered, 0 = away covered, null = push
    away_covered UInt8,
    spread_push UInt8,  -- 1 = landed exactly on spread
    
    -- MONEYLINE BETTING
    home_ml_open Int16,  -- American odds (e.g., -150 = favorite, +130 = underdog)
    home_ml_close Int16,
    home_ml_movement Int16,  -- close - open
    
    away_ml_open Int16,
    away_ml_close Int16,
    away_ml_movement Int16,
    
    -- ML IMPLIED PROBABILITIES (calculated)
    home_win_prob_open Float32,  -- Implied win % from opening ML
    home_win_prob_close Float32,
    
    -- TOTAL (OVER/UNDER) BETTING
    total_open Float32,  -- Opening O/U line (e.g., 47.5)
    total_close Float32,
    total_movement Float32,  -- close - open (positive = moved up)
    
    over_odds_open Int16,
    over_odds_close Int16,
    under_odds_open Int16,
    under_odds_close Int16,
    
    -- TOTAL OUTCOMES
    went_over UInt8,  -- 1 = over, 0 = under
    went_under UInt8,
    total_push UInt8,  -- 1 = landed exactly on total
    points_over_under Float32,  -- Actual total - closing line (positive = over)
    
    -- BETTING PROVIDER INFO
    odds_provider String,  -- 'ESPN BET', 'Consensus', etc.
    odds_provider_id UInt16,
    
    -- ADVANCED CONTEXT
    home_streak_win UInt8,  -- Consecutive wins coming in
    away_streak_win UInt8,
    home_streak_ats UInt8,  -- Consecutive ATS covers
    away_streak_ats UInt8,
    
    home_record_before String,  -- "8-3" before this game
    away_record_before String,
    
    -- SITUATIONAL FLAGS
    is_revenge_game UInt8,  -- Rematch within season
    is_trap_game UInt8,  -- Good team vs bad team (big spread)
    is_rivalry UInt8,  -- Historic rivalry
    
    -- PUBLIC BETTING (if available)
    public_bet_pct_home Float32,  -- % of bets on home team
    money_pct_home Float32,  -- % of money on home team
    
    -- OFFICIALS/REFS (can impact totals/penalties)
    referee_name String,
    referee_id UInt16,
    
    -- GAME FLOW INDICATORS
    largest_lead_home UInt8,
    largest_lead_away UInt8,
    lead_changes UInt8,
    times_tied UInt8,
    
    -- TIMESTAMPS
    created_at DateTime DEFAULT now(),
    updated_at DateTime DEFAULT now()
    
) ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY (season, toYYYYMM(game_date))
ORDER BY (season, week, game_id);

-- ============================================
-- INDEXES for Fast Queries
-- ============================================
-- Add indexes for common query patterns

-- For line movement analysis
ALTER TABLE nfl_games ADD INDEX idx_spread_movement spread_movement TYPE minmax GRANULARITY 4;
ALTER TABLE nfl_games ADD INDEX idx_total_movement total_movement TYPE minmax GRANULARITY 4;

-- For situational queries
ALTER TABLE nfl_games ADD INDEX idx_division_game is_division_game TYPE set(1) GRANULARITY 1;
ALTER TABLE nfl_games ADD INDEX idx_primetime home_is_primetime TYPE set(1) GRANULARITY 1;
ALTER TABLE nfl_games ADD INDEX idx_weather weather_condition TYPE bloom_filter GRANULARITY 1;

-- For spread filters
ALTER TABLE nfl_games ADD INDEX idx_spread_close spread_close TYPE minmax GRANULARITY 4;
ALTER TABLE nfl_games ADD INDEX idx_total_close total_close TYPE minmax GRANULARITY 4;

