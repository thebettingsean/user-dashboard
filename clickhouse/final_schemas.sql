-- ============================================
-- FINAL SCHEMAS: NFL & NBA
-- Two-table design: games + box_scores
-- ============================================

-- ============================================
-- NFL GAMES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS nfl_games (
    game_id UInt32,
    espn_game_id String,
    season UInt16,
    week UInt8,
    game_date Date,
    game_time DateTime,
    
    -- TEAMS
    home_team_id UInt16,
    away_team_id UInt16,
    
    -- VENUE
    venue String,
    city String,
    state String,
    is_neutral_site UInt8,
    is_indoor UInt8,
    
    -- GAME TYPE
    is_playoff UInt8,
    is_division_game UInt8,
    is_conference_game UInt8,
    
    -- FINAL SCORES
    home_score UInt8,
    away_score UInt8,
    total_points UInt8,
    
    -- OUTCOME
    home_won UInt8,
    margin_of_victory UInt8,
    
    -- SPREAD
    spread_open Float32,
    spread_close Float32,
    spread_movement Float32,
    home_spread_odds_close Int16,
    away_spread_odds_close Int16,
    
    -- SPREAD OUTCOME
    home_covered UInt8,
    spread_push UInt8,
    
    -- MONEYLINE
    home_ml_open Int16,
    home_ml_close Int16,
    home_ml_movement Int16,
    away_ml_open Int16,
    away_ml_close Int16,
    away_ml_movement Int16,
    
    -- TOTAL
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
    odds_provider_id UInt16,
    odds_provider_name String,
    
    -- WIN PROBABILITY
    home_win_prob_pregame Float32,
    
    created_at DateTime DEFAULT now(),
    updated_at DateTime DEFAULT now()
    
) ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY (season, toYYYYMM(game_date))
ORDER BY (season, week, game_id);

-- ============================================
-- NFL BOX SCORES TABLE (Updated)
-- ============================================
CREATE TABLE IF NOT EXISTS nfl_box_scores_v2 (
    player_id UInt32,
    game_id UInt32,
    game_date Date,
    season UInt16,
    week UInt8,
    
    team_id UInt16,
    opponent_id UInt16,
    is_home UInt8,
    
    -- OPPONENT DEFENSIVE RANKS
    opp_def_rank_pass_yards UInt8,
    opp_def_rank_rush_yards UInt8,
    opp_def_rank_receiving_yards UInt8,
    
    -- QB STATS
    pass_attempts UInt8,
    pass_completions UInt8,
    pass_yards UInt16,
    pass_tds UInt8,
    interceptions UInt8,
    sacks UInt8,
    qb_rating Float32,
    
    -- RUSHING STATS
    rush_attempts UInt8,
    rush_yards UInt16,
    rush_tds UInt8,
    rush_long UInt8,
    yards_per_carry Float32,
    
    -- RECEIVING STATS
    targets UInt8,
    receptions UInt8,
    receiving_yards UInt16,
    receiving_tds UInt8,
    receiving_long UInt8,
    yards_per_reception Float32,
    
    -- OTHER
    fumbles UInt8,
    fumbles_lost UInt8,
    
    created_at DateTime DEFAULT now()
    
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(game_date)
ORDER BY (season, week, game_id, player_id);

-- ============================================
-- NBA GAMES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS nba_games (
    game_id UInt32,
    espn_game_id String,
    season UInt16,
    game_date Date,
    game_time DateTime,
    
    -- TEAMS
    home_team_id UInt16,
    away_team_id UInt16,
    
    -- VENUE
    venue String,
    city String,
    state String,
    is_neutral_site UInt8,
    
    -- GAME TYPE
    is_playoff UInt8,
    is_division_game UInt8,
    is_conference_game UInt8,
    
    -- FINAL SCORES
    home_score UInt8,
    away_score UInt8,
    total_points UInt16,
    
    -- OUTCOME
    home_won UInt8,
    margin_of_victory UInt8,
    
    -- SPREAD
    spread_open Float32,
    spread_close Float32,
    spread_movement Float32,
    home_spread_odds_close Int16,
    away_spread_odds_close Int16,
    
    -- SPREAD OUTCOME
    home_covered UInt8,
    spread_push UInt8,
    
    -- MONEYLINE
    home_ml_open Int16,
    home_ml_close Int16,
    home_ml_movement Int16,
    away_ml_open Int16,
    away_ml_close Int16,
    away_ml_movement Int16,
    
    -- TOTAL
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
    odds_provider_id UInt16,
    odds_provider_name String,
    
    -- WIN PROBABILITY
    home_win_prob_pregame Float32,
    
    created_at DateTime DEFAULT now(),
    updated_at DateTime DEFAULT now()
    
) ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY (season, toYYYYMM(game_date))
ORDER BY (season, game_date, game_id);

-- ============================================
-- NBA BOX SCORES TABLE (Updated)
-- ============================================
CREATE TABLE IF NOT EXISTS nba_box_scores_v2 (
    player_id UInt32,
    game_id UInt32,
    game_date Date,
    season UInt16,
    
    team_id UInt16,
    opponent_id UInt16,
    is_home UInt8,
    
    -- OPPONENT DEFENSIVE RANKS
    opp_def_rank_points UInt8,
    opp_def_rank_fg_pct UInt8,
    opp_def_rank_three_pt_pct UInt8,
    
    -- SCORING STATS
    minutes_played UInt8,
    field_goals_made UInt8,
    field_goals_attempted UInt8,
    three_pointers_made UInt8,
    three_pointers_attempted UInt8,
    free_throws_made UInt8,
    free_throws_attempted UInt8,
    points UInt8,
    
    -- REBOUNDING STATS
    offensive_rebounds UInt8,
    defensive_rebounds UInt8,
    total_rebounds UInt8,
    
    -- PLAYMAKING STATS
    assists UInt8,
    turnovers UInt8,
    
    -- DEFENSIVE STATS
    steals UInt8,
    blocks UInt8,
    
    -- OTHER
    fouls UInt8,
    plus_minus Int8,
    
    created_at DateTime DEFAULT now()
    
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(game_date)
ORDER BY (season, game_date, game_id, player_id);

-- ============================================
-- INDEXES for Fast Queries
-- ============================================

-- NFL Games
ALTER TABLE nfl_games ADD INDEX idx_spread_close spread_close TYPE minmax GRANULARITY 4;
ALTER TABLE nfl_games ADD INDEX idx_total_close total_close TYPE minmax GRANULARITY 4;
ALTER TABLE nfl_games ADD INDEX idx_division_game is_division_game TYPE set(1) GRANULARITY 1;

-- NBA Games
ALTER TABLE nba_games ADD INDEX idx_spread_close spread_close TYPE minmax GRANULARITY 4;
ALTER TABLE nba_games ADD INDEX idx_total_close total_close TYPE minmax GRANULARITY 4;
ALTER TABLE nba_games ADD INDEX idx_division_game is_division_game TYPE set(1) GRANULARITY 1;

