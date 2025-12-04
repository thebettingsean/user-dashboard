-- ============================================
-- NFL BOX SCORES TABLE (Updated - Links to nfl_games)
-- ============================================
-- One row per player per game
-- Game-level context stored in nfl_games table

CREATE TABLE IF NOT EXISTS nfl_box_scores (
    player_id UInt32,
    game_id UInt32,  -- Links to nfl_games.game_id
    game_date Date,
    season UInt16,
    week UInt8,
    
    -- PLAYER CONTEXT (doesn't change)
    team_id UInt16,  -- Player's team
    
    -- OPPONENT INFO (calculated, for convenience)
    opponent_id UInt16,
    is_home UInt8,  -- Is player's team at home?
    
    -- OPPONENT DEFENSIVE RANKS (as of this week)
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
    
    -- RB/RUSHING STATS
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

-- Note: No more duplicate game-level data!
-- To get betting context: JOIN with nfl_games ON game_id

