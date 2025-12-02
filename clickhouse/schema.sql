-- ============================================
-- CLICKHOUSE SCHEMA FOR PROP ANALYTICS ENGINE
-- ============================================
-- This schema is optimized for:
-- - Fast aggregations (hit rates, averages)
-- - Multi-dimensional filtering (time, location, matchups)
-- - Sub-100ms query times on millions of rows
-- ============================================

-- ============================================
-- SHARED TABLES (All Sports)
-- ============================================

-- Players table
CREATE TABLE IF NOT EXISTS players (
    player_id UInt32,
    sport LowCardinality(String),  -- 'nfl', 'nba', 'nhl'
    name String,
    team_id UInt16,
    position LowCardinality(String),
    jersey_number UInt8,
    is_active UInt8,
    headshot_url String,
    created_at DateTime DEFAULT now(),
    updated_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (sport, player_id);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    team_id UInt16,
    sport LowCardinality(String),
    name String,
    abbreviation String,
    city String,
    division LowCardinality(String),     -- 'AFC East', 'Atlantic', etc.
    conference LowCardinality(String),   -- 'AFC', 'NFC', 'Eastern', 'Western'
    logo_url String,
    created_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(created_at)
ORDER BY (sport, team_id);

-- Games table
CREATE TABLE IF NOT EXISTS games (
    game_id UInt32,
    sport LowCardinality(String),
    season UInt16,
    week UInt8,  -- For NFL, 0 for NBA/NHL
    game_date Date,
    game_time DateTime,
    home_team_id UInt16,
    away_team_id UInt16,
    home_score UInt8,
    away_score UInt8,
    total_points UInt16,
    home_spread Float32,
    game_total Float32,  -- O/U total
    venue String,
    is_completed UInt8,
    created_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(created_at)
PARTITION BY (sport, toYYYYMM(game_date))
ORDER BY (sport, game_date, game_id);

-- Current Props (from OddsAPI)
CREATE TABLE IF NOT EXISTS current_props (
    prop_id String,  -- Unique identifier
    player_id UInt32,
    game_id UInt32,
    sport LowCardinality(String),
    stat_type LowCardinality(String),  -- 'points', 'rush_yards', 'receptions', etc.
    line Float32,
    odds Int16,
    bookmaker LowCardinality(String),  -- 'fanduel', 'draftkings', etc.
    is_alternate UInt8,  -- 0 = main line, 1 = alternate
    
    -- Line movement tracking
    opening_line Float32,
    opening_odds Int16,
    line_movement Float32,  -- current_line - opening_line
    odds_movement Int16,    -- current_odds - opening_odds
    
    -- Timestamps
    first_seen_at DateTime,
    last_updated_at DateTime,
    fetched_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(fetched_at)
PARTITION BY (sport, toYYYYMM(toDate(fetched_at)))
ORDER BY (sport, player_id, stat_type, bookmaker, line);

-- ============================================
-- NFL-SPECIFIC TABLES
-- ============================================

-- NFL Box Scores
CREATE TABLE IF NOT EXISTS nfl_box_scores (
    player_id UInt32,
    game_id UInt32,
    game_date Date,
    season UInt16,
    week UInt8,
    
    -- Game context
    team_id UInt16,
    opponent_id UInt16,
    is_home UInt8,           -- 0 = away, 1 = home
    is_division UInt8,       -- 0 = no, 1 = yes
    is_conference UInt8,     -- 0 = no, 1 = yes
    
    -- Betting context
    team_was_favorite UInt8,  -- 0 = underdog, 1 = favorite
    game_total Float32,       -- For "total between X and Y" filters
    team_spread Float32,      -- For spread filters
    
    -- Opponent defensive ranks (pre-computed, 1-32)
    opp_def_rank_pass_yards UInt8,
    opp_def_rank_rush_yards UInt8,
    opp_def_rank_receptions UInt8,
    opp_def_rank_receiving_yards UInt8,
    
    -- QB Stats
    pass_attempts UInt8,
    pass_completions UInt8,
    pass_yards UInt16,
    pass_tds UInt8,
    interceptions UInt8,
    sacks UInt8,
    qb_rating Float32,
    
    -- RB/Rushing Stats
    rush_attempts UInt8,
    rush_yards UInt16,
    rush_tds UInt8,
    rush_long UInt8,
    yards_per_carry Float32,
    
    -- Receiving Stats
    targets UInt8,
    receptions UInt8,
    receiving_yards UInt16,
    receiving_tds UInt8,
    receiving_long UInt8,
    yards_per_reception Float32,
    
    -- Other
    fumbles UInt8,
    fumbles_lost UInt8,
    
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(game_date)
ORDER BY (player_id, game_date);

-- NFL Player Aggregates (pre-computed hit rates)
CREATE TABLE IF NOT EXISTS nfl_player_aggregates (
    player_id UInt32,
    stat_type LowCardinality(String),  -- 'pass_yards', 'rush_yards', 'receptions', etc.
    
    -- Filter hash (for fast lookups)
    filter_hash String,  -- MD5 of all filters combined
    
    -- Individual filters
    period LowCardinality(String),         -- 'l3', 'l5', 'l10', 'l14', 'l30', 'season', 'last_year'
    location LowCardinality(String),       -- 'home', 'away', 'all'
    division_filter LowCardinality(String),-- 'division', 'non_division', 'all'
    conference_filter LowCardinality(String), -- 'conference', 'non_conference', 'all'
    def_quality LowCardinality(String),    -- 'top10', 'bottom10', 'all'
    favorite_status LowCardinality(String),-- 'favorite', 'underdog', 'all'
    
    -- Aggregated stats
    games_played UInt16,
    total_value Float32,
    avg_value Float32,
    median_value Float32,
    min_value Float32,
    max_value Float32,
    
    -- Pre-computed hit rates for common lines
    times_over_5 UInt16,
    times_over_10 UInt16,
    times_over_15 UInt16,
    times_over_20 UInt16,
    times_over_25 UInt16,
    times_over_30 UInt16,
    times_over_35 UInt16,
    times_over_40 UInt16,
    times_over_45 UInt16,
    times_over_50 UInt16,
    times_over_60 UInt16,
    times_over_75 UInt16,
    times_over_100 UInt16,
    times_over_150 UInt16,
    times_over_200 UInt16,
    times_over_250 UInt16,
    times_over_300 UInt16,
    
    -- Streak tracking
    current_streak Int8,      -- Positive = hit streak, negative = miss
    streak_line Float32,      -- What line the streak is against
    
    last_updated DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(last_updated)
ORDER BY (player_id, stat_type, filter_hash, period);

-- ============================================
-- NBA-SPECIFIC TABLES
-- ============================================

-- NBA Box Scores
CREATE TABLE IF NOT EXISTS nba_box_scores (
    player_id UInt32,
    game_id UInt32,
    game_date Date,
    season UInt16,
    
    -- Game context
    team_id UInt16,
    opponent_id UInt16,
    is_home UInt8,
    is_division UInt8,
    is_conference UInt8,
    
    -- Betting context
    team_was_favorite UInt8,
    game_total Float32,
    team_spread Float32,
    
    -- Opponent defensive ranks (1-30)
    opp_def_rank_points UInt8,
    opp_def_rank_rebounds UInt8,
    opp_def_rank_assists UInt8,
    opp_def_rank_threes UInt8,
    opp_def_rank_steals UInt8,
    opp_def_rank_blocks UInt8,
    
    -- Core Stats
    minutes_played Float32,
    points UInt8,
    rebounds UInt8,
    assists UInt8,
    steals UInt8,
    blocks UInt8,
    turnovers UInt8,
    
    -- Shooting
    field_goals_made UInt8,
    field_goals_attempted UInt8,
    field_goal_pct Float32,
    threes_made UInt8,
    threes_attempted UInt8,
    three_pct Float32,
    free_throws_made UInt8,
    free_throws_attempted UInt8,
    free_throw_pct Float32,
    
    -- Advanced
    plus_minus Int8,
    offensive_rebounds UInt8,
    defensive_rebounds UInt8,
    
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(game_date)
ORDER BY (player_id, game_date);

-- NBA Player Aggregates (pre-computed hit rates)
CREATE TABLE IF NOT EXISTS nba_player_aggregates (
    player_id UInt32,
    stat_type LowCardinality(String),  -- 'points', 'rebounds', 'assists', etc.
    
    -- Filter hash
    filter_hash String,
    
    -- Individual filters
    period LowCardinality(String),
    location LowCardinality(String),
    division_filter LowCardinality(String),
    conference_filter LowCardinality(String),
    def_quality LowCardinality(String),
    favorite_status LowCardinality(String),
    
    -- Aggregated stats
    games_played UInt16,
    total_value Float32,
    avg_value Float32,
    median_value Float32,
    min_value Float32,
    max_value Float32,
    
    -- Pre-computed hit rates for common lines
    times_over_5 UInt16,
    times_over_10 UInt16,
    times_over_15 UInt16,
    times_over_20 UInt16,
    times_over_25 UInt16,
    times_over_30 UInt16,
    times_over_35 UInt16,
    times_over_40 UInt16,
    times_over_45 UInt16,
    times_over_50 UInt16,
    
    -- Streak tracking
    current_streak Int8,
    streak_line Float32,
    
    last_updated DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(last_updated)
ORDER BY (player_id, stat_type, filter_hash, period);

-- ============================================
-- INDEXES FOR FAST LOOKUPS
-- ============================================

-- These are automatically created by ClickHouse based on ORDER BY,
-- but we can add bloom filters for even faster lookups on specific columns

-- For filtering by bookmaker
ALTER TABLE current_props ADD INDEX idx_bookmaker bookmaker TYPE bloom_filter GRANULARITY 1;

-- For filtering by odds range
ALTER TABLE current_props ADD INDEX idx_odds odds TYPE minmax GRANULARITY 1;

-- ============================================
-- HELPER VIEWS (Optional - for convenience)
-- ============================================

-- View to easily get today's props with hit rates
CREATE VIEW IF NOT EXISTS props_with_stats AS
SELECT 
    p.prop_id,
    p.player_id,
    p.stat_type,
    p.line,
    p.odds,
    p.bookmaker,
    p.line_movement,
    pl.name as player_name,
    pl.team_id,
    a.avg_value,
    a.games_played,
    -- Calculate hit rate on the fly for exact line
    -- (we'll do this in application logic for now)
    a.current_streak
FROM current_props p
LEFT JOIN players pl ON p.player_id = pl.player_id AND p.sport = pl.sport
LEFT JOIN nba_player_aggregates a ON p.player_id = a.player_id 
    AND p.stat_type = a.stat_type 
    AND a.period = 'l10'
    AND a.filter_hash = 'all_all_all_all_all'
WHERE p.sport = 'nba';

