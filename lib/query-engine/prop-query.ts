/**
 * Prop Query Handler
 * Queries player historical stats against a given line
 */

import { clickhouseQuery } from '@/lib/clickhouse'
import { buildFilterConditions, buildWhereClause, getTimePeriodLimit, buildPlayerPropLineFilters } from './filter-builder'
import type { PropQueryRequest, QueryResult, GameDetail, PropStatType } from './types'

// ============================================
// STAT COLUMN MAPPING
// ============================================

const STAT_COLUMNS: Record<PropStatType, string> = {
  // NFL stats
  pass_yards: 'pass_yards',
  pass_tds: 'pass_tds',
  pass_attempts: 'pass_attempts',
  pass_completions: 'pass_completions',
  interceptions: 'interceptions',
  rush_yards: 'rush_yards',
  rush_tds: 'rush_tds',
  rush_attempts: 'rush_attempts',
  rush_long: 'rush_long',
  yards_per_carry: 'yards_per_carry',
  receiving_yards: 'receiving_yards',
  receptions: 'receptions',
  receiving_tds: 'receiving_tds',
  receiving_long: 'receiving_long',
  targets: 'targets',
  // Combo stats - calculated
  fantasy_points: '(pass_yards * 0.04 + pass_tds * 4 - interceptions * 2 + rush_yards * 0.1 + rush_tds * 6 + receiving_yards * 0.1 + receiving_tds * 6 + receptions * 0.5)',
  completions_plus_rush_yards: '(pass_completions + rush_yards)',
  // NBA stats (using nba_box_scores_v2 column names)
  points: 'points',
  rebounds: 'total_rebounds',
  assists: 'assists',
  threes: 'three_pointers_made',
  steals: 'steals',
  blocks: 'blocks',
  turnovers: 'turnovers'
}

// Map stat types to defensive ranking columns (for NFL)
const STAT_TO_DEFENSE: Record<PropStatType, 'pass' | 'rush' | 'receiving' | null> = {
  pass_yards: 'pass',
  pass_tds: 'pass',
  pass_attempts: 'pass',
  pass_completions: 'pass',
  interceptions: 'pass',
  rush_yards: 'rush',
  rush_tds: 'rush',
  rush_attempts: 'rush',
  rush_long: 'rush',
  yards_per_carry: 'rush',
  receiving_yards: 'receiving',
  receptions: 'receiving',
  receiving_tds: 'receiving',
  receiving_long: 'receiving',
  targets: 'receiving',
  fantasy_points: 'pass',  // Default to pass for combo stats
  completions_plus_rush_yards: 'pass',
  // NBA stats - no defense mapping yet (can be added later)
  points: null,
  rebounds: null,
  assists: null,
  threes: null,
  steals: null,
  blocks: null,
  turnovers: null
}

// Map our stat types to prop_type values in nfl_prop_lines or nba_prop_lines
const STAT_TO_PROP_TYPE: Record<PropStatType, string> = {
  // NFL stats
  pass_yards: 'player_pass_yds',
  pass_tds: 'player_pass_tds',
  pass_attempts: 'player_pass_attempts',
  pass_completions: 'player_pass_completions',
  interceptions: 'player_pass_interceptions',
  rush_yards: 'player_rush_yds',
  rush_tds: 'player_rush_tds',
  rush_attempts: 'player_rush_attempts',
  rush_long: 'player_rush_longest',
  yards_per_carry: 'player_rush_yds',  // No direct equivalent
  receiving_yards: 'player_reception_yds',
  receptions: 'player_receptions',
  receiving_tds: 'player_reception_tds',
  receiving_long: 'player_reception_longest',
  targets: 'player_receptions',  // No direct equivalent
  fantasy_points: 'player_pass_yds',  // No direct equivalent
  completions_plus_rush_yards: 'player_pass_yds',  // No direct equivalent
  // NBA stats
  points: 'player_points',
  rebounds: 'player_rebounds',
  assists: 'player_assists',
  threes: 'player_threes',
  steals: 'player_steals',
  blocks: 'player_blocks',
  turnovers: 'player_turnovers'
}

// ============================================
// PROP QUERY EXECUTION
// ============================================

// Helper to detect sport from stat type
function getSportFromStat(stat: PropStatType): 'nfl' | 'nba' {
  const nbaStats: PropStatType[] = ['points', 'rebounds', 'assists', 'threes', 'steals', 'blocks', 'turnovers']
  return nbaStats.includes(stat) ? 'nba' : 'nfl'
}

export async function executePropQuery(request: PropQueryRequest): Promise<QueryResult> {
  const startTime = Date.now()
  const { player_id, position, stat, line, filters, use_book_lines, book_line_min, book_line_max, sport: requestedSport } = request
  
  const statColumn = STAT_COLUMNS[stat]
  if (!statColumn) {
    throw new Error(`Unknown stat type: ${stat}`)
  }
  
  // Use requested sport or detect from stat type
  const sport = requestedSport || getSportFromStat(stat)
  
  // Validate sport is correct
  if (!sport || (sport !== 'nfl' && sport !== 'nba')) {
    throw new Error(`Invalid sport: ${sport}. Must be 'nfl' or 'nba'`)
  }
  
  // Log sport detection for debugging
  console.log(`[PropQuery] Sport detected: ${sport} (requested: ${requestedSport}, stat: ${stat})`)
  
  // Get the prop type for book lines
  const propType = STAT_TO_PROP_TYPE[stat]
  
  // Determine defense stat type for ranking filter
  const defenseStat = STAT_TO_DEFENSE[stat]
  
  // Build filter conditions for games table
  // Remove filters that need special handling for props (player team perspective)
  const gameFilters = { ...filters }
  delete gameFilters.vs_defense_rank // This is on box_scores table
  delete gameFilters.location // This is handled separately for box_scores
  delete gameFilters.is_favorite // Needs player team perspective
  delete gameFilters.spread_range // Needs player team perspective  
  delete gameFilters.total_range // Handled separately below
  delete gameFilters.spread_movement_range // Needs player team perspective
  delete gameFilters.total_movement_range // Handled separately
  delete gameFilters.ml_movement_range // Needs player team perspective
  delete gameFilters.team_win_pct // Handled separately with team_rank alias
  delete gameFilters.opp_win_pct // Handled separately with opp_rank alias
  delete gameFilters.vs_offense_rank // Handled separately with opp_rank alias
  delete gameFilters.vs_defense_rank // Handled separately with opp_rank alias
  delete gameFilters.own_offense_rank // Handled separately with team_rank alias
  delete gameFilters.own_defense_rank // Handled separately with team_rank alias
  delete gameFilters.own_offense_stat // Handled with own_offense_rank
  delete gameFilters.own_defense_stat // Handled with own_defense_rank
  
  const { conditions: gameConditions, appliedFilters, limit } = buildFilterConditions(
    gameFilters,
    { 
      tableAlias: 'g', 
      isBoxScore: false,
      defenseStat 
    }
  )
  
  // Add box score specific conditions
  const boxConditions: string[] = []
  
  // Always include rankings join for comprehensive "Why this fits" data
  let needsOppRankingsJoin = true
  
  // Player or Position filter
  if (player_id && player_id > 0) {
    // Specific player
    boxConditions.push(`b.player_id = ${player_id}`)
  } else if (position && position !== 'any') {
    // All players of a position - join with players table
    // Position must be uppercase to match database (RB, WR, QB, TE for NFL; G, F, C for NBA)
    const positionUpper = position.toUpperCase()
    boxConditions.push(`p.position = '${positionUpper}'`)
    appliedFilters.push(`All ${positionUpper}s`)
  } else {
    throw new Error('Must specify either player_id or position')
  }
  
  // Location filter (home/away) - use box_scores.is_home
  if (filters.location && filters.location !== 'any') {
    boxConditions.push(filters.location === 'home' ? 'b.is_home = 1' : 'b.is_home = 0')
    appliedFilters.push(filters.location === 'home' ? 'Home' : 'Away')
  }
  
  // Opponent team filter (versus team) - use box_scores.opponent_id
  if (filters.opponent_id && filters.opponent_id > 0) {
    boxConditions.push(`b.opponent_id = ${filters.opponent_id}`)
    appliedFilters.push('vs Specific Opponent')
  }
  
  // Player Stats filters (game conditions, not bet types)
  // These filter based on the player's in-game stats for that box score
  if (filters.min_targets && filters.min_targets > 0) {
    boxConditions.push(`b.targets >= ${filters.min_targets}`)
    appliedFilters.push(`${filters.min_targets}+ Targets`)
  }
  
  if (filters.min_carries && filters.min_carries > 0) {
    boxConditions.push(`b.rush_attempts >= ${filters.min_carries}`)
    appliedFilters.push(`${filters.min_carries}+ Carries`)
  }
  
  if (filters.min_pass_attempts && filters.min_pass_attempts > 0) {
    boxConditions.push(`b.pass_attempts >= ${filters.min_pass_attempts}`)
    appliedFilters.push(`${filters.min_pass_attempts}+ Pass Att`)
  }
  
  // Defense rank filter - supports position-specific rankings
  // defense_stat_position can be 'vs_wr', 'vs_te', 'vs_rb' for NFL or 'vs_g', 'vs_f', 'vs_c' for NBA
  // Also supports pace-adjusted rankings for NBA
  if (filters.vs_defense_rank && filters.vs_defense_rank !== 'any') {
    let rankCol: string
    let statLabel: string
    
    // Check for position-specific defense filter
    const positionStat = filters.defense_stat_position || filters.defense_stat
    const usePaceAdjusted = filters.defense_stat === 'pace_adj' || filters.defense_stat_position === 'pace_adj'
    
    if (sport === 'nba') {
      // NBA position-specific rankings (G/F/C)
      if (positionStat === 'vs_g' || positionStat === 'g') {
        needsOppRankingsJoin = true
        // Map stat to position-specific ranking column
        if (stat === 'points') {
          rankCol = 'opp_rank.rank_points_allowed_to_g'
          statLabel = 'D vs Guards (Points)'
        } else if (stat === 'assists') {
          rankCol = 'opp_rank.rank_assists_allowed_to_g'
          statLabel = 'D vs Guards (Assists)'
        } else if (stat === 'rebounds') {
          rankCol = 'opp_rank.rank_rebounds_allowed_to_g'
          statLabel = 'D vs Guards (Rebounds)'
        } else if (stat === 'steals') {
          rankCol = 'opp_rank.rank_steals_allowed_to_g'
          statLabel = 'D vs Guards (Steals)'
        } else if (stat === 'blocks') {
          rankCol = 'opp_rank.rank_blocks_allowed_to_g'
          statLabel = 'D vs Guards (Blocks)'
        } else if (stat === 'threes') {
          rankCol = 'opp_rank.rank_threes_allowed_to_g'
          statLabel = 'D vs Guards (3PT)'
        } else {
          rankCol = 'opp_rank.rank_points_allowed_to_g'
          statLabel = 'D vs Guards'
        }
      } else if (positionStat === 'vs_f' || positionStat === 'f') {
        needsOppRankingsJoin = true
        if (stat === 'points') {
          rankCol = 'opp_rank.rank_points_allowed_to_f'
          statLabel = 'D vs Forwards (Points)'
        } else if (stat === 'assists') {
          rankCol = 'opp_rank.rank_assists_allowed_to_f'
          statLabel = 'D vs Forwards (Assists)'
        } else if (stat === 'rebounds') {
          rankCol = 'opp_rank.rank_rebounds_allowed_to_f'
          statLabel = 'D vs Forwards (Rebounds)'
        } else if (stat === 'steals') {
          rankCol = 'opp_rank.rank_steals_allowed_to_f'
          statLabel = 'D vs Forwards (Steals)'
        } else if (stat === 'blocks') {
          rankCol = 'opp_rank.rank_blocks_allowed_to_f'
          statLabel = 'D vs Forwards (Blocks)'
        } else if (stat === 'threes') {
          rankCol = 'opp_rank.rank_threes_allowed_to_f'
          statLabel = 'D vs Forwards (3PT)'
        } else {
          rankCol = 'opp_rank.rank_points_allowed_to_f'
          statLabel = 'D vs Forwards'
        }
      } else if (positionStat === 'vs_c' || positionStat === 'c') {
        needsOppRankingsJoin = true
        if (stat === 'points') {
          rankCol = 'opp_rank.rank_points_allowed_to_c'
          statLabel = 'D vs Centers (Points)'
        } else if (stat === 'assists') {
          rankCol = 'opp_rank.rank_assists_allowed_to_c'
          statLabel = 'D vs Centers (Assists)'
        } else if (stat === 'rebounds') {
          rankCol = 'opp_rank.rank_rebounds_allowed_to_c'
          statLabel = 'D vs Centers (Rebounds)'
        } else if (stat === 'steals') {
          rankCol = 'opp_rank.rank_steals_allowed_to_c'
          statLabel = 'D vs Centers (Steals)'
        } else if (stat === 'blocks') {
          rankCol = 'opp_rank.rank_blocks_allowed_to_c'
          statLabel = 'D vs Centers (Blocks)'
        } else if (stat === 'threes') {
          rankCol = 'opp_rank.rank_threes_allowed_to_c'
          statLabel = 'D vs Centers (3PT)'
        } else {
          rankCol = 'opp_rank.rank_points_allowed_to_c'
          statLabel = 'D vs Centers'
        }
      } else if (usePaceAdjusted) {
        // Pace-adjusted rankings
        needsOppRankingsJoin = true
        if (stat === 'points') {
          rankCol = 'opp_rank.rank_points_allowed_per_100'
          statLabel = 'D (Points/100 poss)'
        } else if (stat === 'assists') {
          rankCol = 'opp_rank.rank_assists_allowed_per_100'
          statLabel = 'D (Assists/100 poss)'
        } else if (stat === 'rebounds') {
          rankCol = 'opp_rank.rank_rebounds_allowed_per_100'
          statLabel = 'D (Rebounds/100 poss)'
        } else if (stat === 'steals') {
          rankCol = 'opp_rank.rank_steals_allowed_per_100'
          statLabel = 'D (Steals/100 poss)'
        } else if (stat === 'blocks') {
          rankCol = 'opp_rank.rank_blocks_allowed_per_100'
          statLabel = 'D (Blocks/100 poss)'
        } else if (stat === 'threes') {
          rankCol = 'opp_rank.rank_threes_allowed_per_100'
          statLabel = 'D (3PT/100 poss)'
        } else {
          rankCol = 'opp_rank.rank_points_allowed_per_100'
          statLabel = 'D (Pace-Adj)'
        }
      } else if (stat === 'pace') {
        // Pace filter - opponent's pace ranking
        needsOppRankingsJoin = true
        rankCol = 'opp_rank.rank_pace_per_game'
        statLabel = 'Pace (Possessions/Game)'
      } else {
        // Default NBA defensive rankings (overall per game from nba_team_rankings)
        needsOppRankingsJoin = true
        if (stat === 'points') {
          rankCol = 'opp_rank.rank_points_allowed_per_game'
          statLabel = 'Points Allowed'
        } else if (stat === 'assists') {
          rankCol = 'opp_rank.rank_assists_allowed_per_game'
          statLabel = 'Assists Allowed'
        } else if (stat === 'rebounds') {
          rankCol = 'opp_rank.rank_rebounds_allowed_per_game'
          statLabel = 'Rebounds Allowed'
        } else if (stat === 'threes') {
          rankCol = 'opp_rank.rank_threes_allowed_per_game'
          statLabel = '3PT Allowed'
        } else if (stat === 'steals') {
          rankCol = 'opp_rank.rank_steals_per_game'
          statLabel = 'Steals'
        } else if (stat === 'blocks') {
          rankCol = 'opp_rank.rank_blocks_per_game'
          statLabel = 'Blocks'
        } else {
          rankCol = 'opp_rank.rank_points_allowed_per_game'
          statLabel = 'Points Allowed'
        }
      }
    } else {
      // NFL position-specific rankings
      if (positionStat === 'vs_wr' || positionStat === 'wr') {
        needsOppRankingsJoin = true
        rankCol = 'opp_rank.rank_yards_allowed_to_wr'
        statLabel = 'D vs WRs'
      } else if (positionStat === 'vs_te' || positionStat === 'te') {
        needsOppRankingsJoin = true
        rankCol = 'opp_rank.rank_yards_allowed_to_te'
        statLabel = 'D vs TEs'
      } else if (positionStat === 'vs_rb' || positionStat === 'rb') {
        needsOppRankingsJoin = true
        rankCol = 'opp_rank.rank_yards_allowed_to_rb'
        statLabel = 'D vs RBs'
      } else if (positionStat === 'pass') {
        rankCol = 'b.opp_def_rank_pass_yards'
        statLabel = 'Pass D'
      } else if (positionStat === 'rush') {
        rankCol = 'b.opp_def_rank_rush_yards'
        statLabel = 'Rush D'
      } else {
        // Default based on player position's stat type
        rankCol = defenseStat === 'pass' ? 'b.opp_def_rank_pass_yards'
          : defenseStat === 'rush' ? 'b.opp_def_rank_rush_yards'
          : 'b.opp_def_rank_receiving_yards'
        statLabel = 'Defense'
      }
    }
    
    const rankCondition = rankCol.startsWith('opp_rank.') ? rankCol : rankCol
    
    // NBA has 30 teams, NFL has 32 teams
    const maxRank = sport === 'nba' ? 30 : 32
    const bottom5Start = maxRank - 4  // 26 for NBA, 28 for NFL
    const bottom10Start = maxRank - 9  // 21 for NBA, 23 for NFL
    const bottom16Start = maxRank - 15 // 15 for NBA, 17 for NFL
    
    switch (filters.vs_defense_rank) {
      case 'top_5':
        boxConditions.push(`${rankCondition} <= 5 AND ${rankCondition} > 0`)
        appliedFilters.push(`vs Top 5 ${statLabel}`)
        break
      case 'top_10':
        boxConditions.push(`${rankCondition} <= 10 AND ${rankCondition} > 0`)
        appliedFilters.push(`vs Top 10 ${statLabel}`)
        break
      case 'top_16':
        boxConditions.push(`${rankCondition} <= 16 AND ${rankCondition} > 0`)
        appliedFilters.push(`vs Top 16 ${statLabel}`)
        break
      case 'bottom_5':
        boxConditions.push(`${rankCondition} >= ${bottom5Start} AND ${rankCondition} <= ${maxRank}`)
        appliedFilters.push(`vs Bottom 5 ${statLabel}`)
        break
      case 'bottom_10':
        boxConditions.push(`${rankCondition} >= ${bottom10Start} AND ${rankCondition} <= ${maxRank}`)
        appliedFilters.push(`vs Bottom 10 ${statLabel}`)
        break
      case 'bottom_16':
        boxConditions.push(`${rankCondition} >= ${bottom16Start} AND ${rankCondition} <= ${maxRank}`)
        appliedFilters.push(`vs Bottom 16 ${statLabel}`)
        break
    }
  }
  
  // Streak filter - use player's team (home or away) streak columns
  // Streak: positive = win streak, negative = loss streak coming into game
  if (filters.winning_streak && filters.winning_streak > 0) {
    // Player's team must have won N games in a row coming into this game
    gameConditions.push(`IF(b.is_home = 1, g.home_streak, g.away_streak) >= ${filters.winning_streak}`)
    appliedFilters.push(`Team ${filters.winning_streak}W Streak`)
  }
  if (filters.losing_streak && filters.losing_streak > 0) {
    // Player's team must have lost N games in a row coming into this game
    gameConditions.push(`IF(b.is_home = 1, g.home_streak, g.away_streak) <= ${-filters.losing_streak}`)
    appliedFilters.push(`Team ${filters.losing_streak}L Streak`)
  }
  
  // Previous game margin filter - use player's team margin
  if (filters.prev_game_margin && (filters.prev_game_margin.min !== undefined || filters.prev_game_margin.max !== undefined)) {
    const { min, max } = filters.prev_game_margin
    const marginExpr = `IF(b.is_home = 1, g.home_prev_margin, g.away_prev_margin)`
    
    if (min !== undefined) {
      gameConditions.push(`${marginExpr} >= ${min}`)
    }
    if (max !== undefined) {
      gameConditions.push(`${marginExpr} <= ${max}`)
    }
    
    let desc = 'Team Prev Margin '
    if (min !== undefined && max !== undefined) {
      desc += `${min > 0 ? '+' : ''}${min} to ${max > 0 ? '+' : ''}${max}`
    } else if (min !== undefined) {
      desc += `${min > 0 ? '+' : ''}${min}+`
    } else if (max !== undefined) {
      desc += `≤${max > 0 ? '+' : ''}${max}`
    }
    appliedFilters.push(desc)
  }
  
  // ============================================
  // PLAYER TEAM PERSPECTIVE FILTERS
  // These need to consider whether player was on home or away team
  // ============================================
  
  // Favorite/Underdog filter - from player's team perspective
  // If player is home and spread < 0, player's team is favorite
  // If player is away and spread > 0, player's team is favorite
  // Exclude pick'em games (spread_close = 0) and games with NULL betting data
  if (filters.is_favorite && filters.is_favorite !== 'any') {
    if (filters.is_favorite === 'favorite') {
      // Player's team was favorite
      gameConditions.push(`(g.spread_close IS NOT NULL AND g.spread_close != 0 AND ((b.is_home = 1 AND g.spread_close < 0) OR (b.is_home = 0 AND g.spread_close > 0)))`)
    } else {
      // Player's team was underdog
      gameConditions.push(`(g.spread_close IS NOT NULL AND g.spread_close != 0 AND ((b.is_home = 1 AND g.spread_close > 0) OR (b.is_home = 0 AND g.spread_close < 0)))`)
    }
    appliedFilters.push(filters.is_favorite === 'favorite' ? 'Player Team Favorite' : 'Player Team Underdog')
  }
  
  // Spread range filter - from player's team perspective
  // We need to calculate the spread from the player's team viewpoint
  // If home: spread_close is already from home perspective
  // If away: negate the spread
  // Exclude games with NULL betting data
  if (filters.spread_range && (filters.spread_range.min !== undefined || filters.spread_range.max !== undefined)) {
    const { min, max } = filters.spread_range
    const spreadExpr = `IF(b.is_home = 1, g.spread_close, -g.spread_close)`
    
    // Ensure spread_close is not NULL
    const nullCheck = `g.spread_close IS NOT NULL`
    
    if (min !== undefined && max !== undefined) {
      const minVal = Math.min(min, max)
      const maxVal = Math.max(min, max)
      gameConditions.push(`(${nullCheck} AND ${spreadExpr} BETWEEN ${minVal} AND ${maxVal})`)
    } else if (min !== undefined) {
      if (min >= 0) {
        gameConditions.push(`(${nullCheck} AND ${spreadExpr} >= ${min})`)
      } else {
        gameConditions.push(`(${nullCheck} AND ${spreadExpr} <= ${min})`)
      }
    } else if (max !== undefined) {
      if (max >= 0) {
        gameConditions.push(`(${nullCheck} AND ${spreadExpr} <= ${max})`)
      } else {
        gameConditions.push(`(${nullCheck} AND ${spreadExpr} >= ${max})`)
      }
    }
    
    let desc = 'Player Team Spread '
    if (min !== undefined && max !== undefined) {
      desc += `${min > 0 ? '+' : ''}${min} to ${max > 0 ? '+' : ''}${max}`
    } else if (min !== undefined) {
      desc += min >= 0 ? `+${min} or more` : `${min} or more`
    } else if (max !== undefined) {
      desc += max >= 0 ? `+${max} or less` : `${max} or less`
    }
    appliedFilters.push(desc)
  }
  
  // Total range filter - same for both teams (game-level)
  // Exclude games with NULL betting data
  if (filters.total_range && (filters.total_range.min !== undefined || filters.total_range.max !== undefined)) {
    const { min, max } = filters.total_range
    
    // Ensure total_close is not NULL
    const nullCheck = `g.total_close IS NOT NULL`
    
    if (min !== undefined && max !== undefined) {
      gameConditions.push(`(${nullCheck} AND g.total_close BETWEEN ${min} AND ${max})`)
    } else if (min !== undefined) {
      gameConditions.push(`(${nullCheck} AND g.total_close >= ${min})`)
    } else if (max !== undefined) {
      gameConditions.push(`(${nullCheck} AND g.total_close <= ${max})`)
    }
    
    let desc = 'Total '
    if (min !== undefined && max !== undefined) {
      desc += `${min}-${max}`
    } else if (min !== undefined) {
      desc += `${min}+`
    } else if (max !== undefined) {
      desc += `≤${max}`
    }
    appliedFilters.push(desc)
  }
  
  // Spread movement filter - from player's team perspective
  if (filters.spread_movement_range && (filters.spread_movement_range.min !== undefined || filters.spread_movement_range.max !== undefined)) {
    const { min, max } = filters.spread_movement_range
    const moveExpr = `IF(b.is_home = 1, g.spread_movement, -g.spread_movement)`
    
    if (min !== undefined && max !== undefined) {
      gameConditions.push(`${moveExpr} BETWEEN ${min} AND ${max}`)
    } else if (min !== undefined) {
      gameConditions.push(`${moveExpr} >= ${min}`)
    } else if (max !== undefined) {
      gameConditions.push(`${moveExpr} <= ${max}`)
    }
    appliedFilters.push(`Spread Movement ${min ?? ''}${min !== undefined && max !== undefined ? ' to ' : ''}${max ?? ''}`)
  }
  
  // Total movement filter - same for both teams
  if (filters.total_movement_range && (filters.total_movement_range.min !== undefined || filters.total_movement_range.max !== undefined)) {
    const { min, max } = filters.total_movement_range
    if (min !== undefined && max !== undefined) {
      gameConditions.push(`g.total_movement BETWEEN ${min} AND ${max}`)
    } else if (min !== undefined) {
      gameConditions.push(`g.total_movement >= ${min}`)
    } else if (max !== undefined) {
      gameConditions.push(`g.total_movement <= ${max}`)
    }
    appliedFilters.push(`Total Movement ${min ?? ''}${min !== undefined && max !== undefined ? ' to ' : ''}${max ?? ''}`)
  }
  
  // ML movement filter - from player's team perspective
  if (filters.ml_movement_range && (filters.ml_movement_range.min !== undefined || filters.ml_movement_range.max !== undefined)) {
    const { min, max } = filters.ml_movement_range
    // home_ml_movement is from home perspective, negate for away
    const moveExpr = `IF(b.is_home = 1, g.home_ml_movement, -g.home_ml_movement)`
    
    if (min !== undefined && max !== undefined) {
      gameConditions.push(`${moveExpr} BETWEEN ${min} AND ${max}`)
    } else if (min !== undefined) {
      gameConditions.push(`${moveExpr} >= ${min}`)
    } else if (max !== undefined) {
      gameConditions.push(`${moveExpr} <= ${max}`)
    }
    appliedFilters.push(`ML Movement ${min ?? ''}${min !== undefined && max !== undefined ? ' to ' : ''}${max ?? ''}`)
  }
  
  // Opponent rank conditions (for vs offense filter and win%)
  const oppRankConditions: string[] = []
  
  // ============================================
  // WIN PERCENTAGE FILTERS
  // ============================================
  
  // Team's win percentage (player's team) - requires team_rank join (NFL only - NBA doesn't have win_pct)
  if (filters.team_win_pct && sport === 'nfl') {
    needsOppRankingsJoin = true
    const { min, max } = filters.team_win_pct
    // For player's team, if player is home use home rankings, else away
    const winPctExpr = `IF(b.is_home = 1, team_rank.win_pct, team_rank.win_pct)`
    
    if (min !== undefined && max !== undefined) {
      oppRankConditions.push(`team_rank.win_pct >= ${min / 100} AND team_rank.win_pct <= ${max / 100}`)
      appliedFilters.push(`Team Win% ${min}-${max}%`)
    } else if (min !== undefined) {
      oppRankConditions.push(`team_rank.win_pct >= ${min / 100}`)
      appliedFilters.push(`Team Win% ${min}%+`)
    } else if (max !== undefined) {
      oppRankConditions.push(`team_rank.win_pct <= ${max / 100}`)
      appliedFilters.push(`Team Win% ≤${max}%`)
    }
  }
  
  // Opponent's win percentage (NFL only - NBA doesn't have win_pct)
  if (filters.opp_win_pct && sport === 'nfl') {
    needsOppRankingsJoin = true
    const { min, max } = filters.opp_win_pct
    
    if (min !== undefined && max !== undefined) {
      oppRankConditions.push(`opp_rank.win_pct >= ${min / 100} AND opp_rank.win_pct <= ${max / 100}`)
      appliedFilters.push(`Opp Win% ${min}-${max}%`)
    } else if (min !== undefined) {
      oppRankConditions.push(`opp_rank.win_pct >= ${min / 100}`)
      appliedFilters.push(`Opp Win% ${min}%+`)
    } else if (max !== undefined) {
      oppRankConditions.push(`opp_rank.win_pct <= ${max / 100}`)
      appliedFilters.push(`Opp Win% ≤${max}%`)
    }
  }
  
  // Opponent Pace filter (NBA only - filter by how fast/slow opponent plays)
  if (sport === 'nba' && filters.opp_pace_rank && filters.opp_pace_rank !== 'any') {
    needsOppRankingsJoin = true
    // NBA has 30 teams, top = fast pace (more possessions), bottom = slow pace (fewer possessions)
    const maxRank = 30
    const bottom5Start = maxRank - 4  // 26
    const bottom10Start = maxRank - 9  // 21
    const bottom16Start = maxRank - 15 // 15
    
    switch (filters.opp_pace_rank) {
      case 'top_5':
        oppRankConditions.push(`opp_rank.rank_pace_per_game <= 5 AND opp_rank.rank_pace_per_game > 0`)
        appliedFilters.push('Opponent Top 5 Pace (Fastest)')
        break
      case 'top_10':
        oppRankConditions.push(`opp_rank.rank_pace_per_game <= 10 AND opp_rank.rank_pace_per_game > 0`)
        appliedFilters.push('Opponent Top 10 Pace (Fast)')
        break
      case 'top_16':
        oppRankConditions.push(`opp_rank.rank_pace_per_game <= 16 AND opp_rank.rank_pace_per_game > 0`)
        appliedFilters.push('Opponent Top 16 Pace (Above Avg)')
        break
      case 'bottom_5':
        oppRankConditions.push(`opp_rank.rank_pace_per_game >= ${bottom5Start} AND opp_rank.rank_pace_per_game <= ${maxRank}`)
        appliedFilters.push('Opponent Bottom 5 Pace (Slowest)')
        break
      case 'bottom_10':
        oppRankConditions.push(`opp_rank.rank_pace_per_game >= ${bottom10Start} AND opp_rank.rank_pace_per_game <= ${maxRank}`)
        appliedFilters.push('Opponent Bottom 10 Pace (Slow)')
        break
      case 'bottom_16':
        oppRankConditions.push(`opp_rank.rank_pace_per_game >= ${bottom16Start} AND opp_rank.rank_pace_per_game <= ${maxRank}`)
        appliedFilters.push('Opponent Bottom 16 Pace (Below Avg)')
        break
    }
  }
  
  // vs Offense filter - opponent's offensive ranking
  if (filters.vs_offense_rank && filters.vs_offense_rank !== 'any') {
    needsOppRankingsJoin = true
    const stat = (filters.offense_stat as string) || 'overall'
    
    // Sport-aware column mapping
    let column: string
    const maxRank = sport === 'nba' ? 30 : 32
    const bottom5Start = maxRank - 4
    const bottom10Start = maxRank - 9
    const bottom16Start = maxRank - 15
    
    if (sport === 'nba') {
      // NBA only has rank_points_per_game for offense
      column = 'rank_points_per_game'
    } else {
      // NFL has multiple offensive stat columns
      column = stat === 'points' ? 'rank_points_per_game'
        : stat === 'passing' ? 'rank_passing_yards_per_game'
        : stat === 'rushing' ? 'rank_rushing_yards_per_game'
        : stat === 'total_yards' ? 'rank_total_yards_per_game'
        : 'rank_total_yards_per_game'
    }
    
    switch (filters.vs_offense_rank) {
      case 'top_5':
        oppRankConditions.push(`opp_rank.${column} <= 5 AND opp_rank.${column} > 0`)
        appliedFilters.push('vs Top 5 Offense')
        break
      case 'top_10':
        oppRankConditions.push(`opp_rank.${column} <= 10 AND opp_rank.${column} > 0`)
        appliedFilters.push('vs Top 10 Offense')
        break
      case 'top_16':
        oppRankConditions.push(`opp_rank.${column} <= 16 AND opp_rank.${column} > 0`)
        appliedFilters.push('vs Top 16 Offense')
        break
      case 'bottom_5':
        oppRankConditions.push(`opp_rank.${column} >= ${bottom5Start} AND opp_rank.${column} <= ${maxRank}`)
        appliedFilters.push('vs Bottom 5 Offense')
        break
      case 'bottom_10':
        oppRankConditions.push(`opp_rank.${column} >= ${bottom10Start} AND opp_rank.${column} <= ${maxRank}`)
        appliedFilters.push('vs Bottom 10 Offense')
        break
      case 'bottom_16':
        oppRankConditions.push(`opp_rank.${column} >= ${bottom16Start} AND opp_rank.${column} <= ${maxRank}`)
        appliedFilters.push('vs Bottom 16 Offense')
        break
    }
  }
  
  // ============================================
  // PLAYER'S TEAM RANKINGS (Own Offense/Defense)
  // ============================================
  
  // Team Offense - player's team's offensive ranking
  if (filters.own_offense_rank && filters.own_offense_rank !== 'any') {
    needsOppRankingsJoin = true
    const stat = (filters.own_offense_stat as string) || 'points'
    
    // Sport-aware column mapping
    let column: string
    const maxRank = sport === 'nba' ? 30 : 32
    const bottom5Start = maxRank - 4
    const bottom10Start = maxRank - 9
    const bottom16Start = maxRank - 15
    
    if (sport === 'nba') {
      // NBA only has rank_points_per_game for offense
      column = 'rank_points_per_game'
    } else {
      // NFL has multiple offensive stat columns
      column = stat === 'points' ? 'rank_points_per_game'
        : stat === 'passing' ? 'rank_passing_yards_per_game'
        : stat === 'rushing' ? 'rank_rushing_yards_per_game'
        : stat === 'total_yards' ? 'rank_total_yards_per_game'
        : 'rank_points_per_game'
    }
    
    const statLabel = stat === 'points' ? 'Points' 
      : stat === 'passing' ? 'Pass O' 
      : stat === 'rushing' ? 'Rush O' 
      : 'Offense'
    
    switch (filters.own_offense_rank) {
      case 'top_5':
        oppRankConditions.push(`team_rank.${column} <= 5 AND team_rank.${column} > 0`)
        appliedFilters.push(`Team Top 5 ${statLabel}`)
        break
      case 'top_10':
        oppRankConditions.push(`team_rank.${column} <= 10 AND team_rank.${column} > 0`)
        appliedFilters.push(`Team Top 10 ${statLabel}`)
        break
      case 'top_16':
        oppRankConditions.push(`team_rank.${column} <= 16 AND team_rank.${column} > 0`)
        appliedFilters.push(`Team Top 16 ${statLabel}`)
        break
      case 'bottom_5':
        oppRankConditions.push(`team_rank.${column} >= ${bottom5Start} AND team_rank.${column} <= ${maxRank}`)
        appliedFilters.push(`Team Bottom 5 ${statLabel}`)
        break
      case 'bottom_10':
        oppRankConditions.push(`team_rank.${column} >= ${bottom10Start} AND team_rank.${column} <= ${maxRank}`)
        appliedFilters.push(`Team Bottom 10 ${statLabel}`)
        break
      case 'bottom_16':
        oppRankConditions.push(`team_rank.${column} >= ${bottom16Start} AND team_rank.${column} <= ${maxRank}`)
        appliedFilters.push(`Team Bottom 16 ${statLabel}`)
        break
    }
  }
  
  // Team Defense - player's team's defensive ranking
  if (filters.own_defense_rank && filters.own_defense_rank !== 'any') {
    needsOppRankingsJoin = true
    const stat = (filters.own_defense_stat as string) || 'points'
    
    // Sport-aware column mapping
    let column: string
    let statLabel: string
    
    if (sport === 'nba') {
      // NBA defensive rankings
      if (stat === 'points') {
        column = 'rank_points_allowed_per_game'
        statLabel = 'Points Allowed'
      } else if (stat === 'assists') {
        column = 'rank_assists_allowed_per_game'
        statLabel = 'Assists Allowed'
      } else if (stat === 'rebounds') {
        column = 'rank_rebounds_allowed_per_game'
        statLabel = 'Rebounds Allowed'
      } else if (stat === 'threes') {
        column = 'rank_threes_allowed_per_game'
        statLabel = '3PT Allowed'
      } else if (stat === 'steals') {
        column = 'rank_steals_per_game'
        statLabel = 'Steals'
      } else if (stat === 'blocks') {
        column = 'rank_blocks_per_game'
        statLabel = 'Blocks'
      } else {
        column = 'rank_points_allowed_per_game'
        statLabel = 'Points Allowed'
      }
    } else {
      // NFL defensive rankings
      column = stat === 'points' ? 'rank_points_allowed_per_game'
        : stat === 'passing' ? 'rank_passing_yards_allowed_per_game'
        : stat === 'rushing' ? 'rank_rushing_yards_allowed_per_game'
        : 'rank_points_allowed_per_game'
      
      statLabel = stat === 'points' ? 'Points Allowed' 
        : stat === 'passing' ? 'Pass D' 
        : stat === 'rushing' ? 'Rush D' 
        : 'Defense'
    }
    
    // NBA has 30 teams, NFL has 32 teams
    const maxRank = sport === 'nba' ? 30 : 32
    const bottom5Start = maxRank - 4  // 26 for NBA, 28 for NFL
    const bottom10Start = maxRank - 9  // 21 for NBA, 23 for NFL
    const bottom16Start = maxRank - 15 // 15 for NBA, 17 for NFL
    
    switch (filters.own_defense_rank) {
      case 'top_5':
        oppRankConditions.push(`team_rank.${column} <= 5 AND team_rank.${column} > 0`)
        appliedFilters.push(`Team Top 5 ${statLabel}`)
        break
      case 'top_10':
        oppRankConditions.push(`team_rank.${column} <= 10 AND team_rank.${column} > 0`)
        appliedFilters.push(`Team Top 10 ${statLabel}`)
        break
      case 'top_16':
        oppRankConditions.push(`team_rank.${column} <= 16 AND team_rank.${column} > 0`)
        appliedFilters.push(`Team Top 16 ${statLabel}`)
        break
      case 'bottom_5':
        oppRankConditions.push(`team_rank.${column} >= ${bottom5Start} AND team_rank.${column} <= ${maxRank}`)
        appliedFilters.push(`Team Bottom 5 ${statLabel}`)
        break
      case 'bottom_10':
        oppRankConditions.push(`team_rank.${column} >= ${bottom10Start} AND team_rank.${column} <= ${maxRank}`)
        appliedFilters.push(`Team Bottom 10 ${statLabel}`)
        break
      case 'bottom_16':
        oppRankConditions.push(`team_rank.${column} >= ${bottom16Start} AND team_rank.${column} <= ${maxRank}`)
        appliedFilters.push(`Team Bottom 16 ${statLabel}`)
        break
    }
  }
  
  // Build the query
  // Join box_scores with games and players for complete filtering
  // Filter out anomalous values (data overflow issues - 65535 is UInt16 max)
  const allConditions = [
    ...boxConditions,
    ...gameConditions,
    ...oppRankConditions
  ]
  
  // Note: We do NOT filter by line in the WHERE clause here.
  // The line is used for hit/miss calculation in the application code after fetching all games.
  // This ensures we get both hits and misses for accurate hit rate calculation.
  
  // Add sport-specific data error filters
  if (sport === 'nfl') {
    allConditions.push(
      'b.pass_yards < 1000',
      'b.rush_yards < 500',
      'b.receiving_yards < 500'
    )
  } else if (sport === 'nba') {
    // NBA-specific data validation (if needed)
    allConditions.push('b.points < 100') // Sanity check for points
  }
  
  // Add player prop line filters (for game-level filtering)
  // Note: For props, "Team Players" refers to the player's team
  // If location filter is 'home', player is on home team; if 'away', player is on away team
  const isPlayerOnHomeTeam = filters.location !== 'away' // Default to home if not specified
  const { conditions: playerConditions, descriptions: playerDescriptions } = buildPlayerPropLineFilters(
    filters,
    'g',
    false, // Props are not O/U queries in this context
    isPlayerOnHomeTeam
  )
  allConditions.push(...playerConditions)
  appliedFilters.push(...playerDescriptions)
  
  // Build opponent rankings JOIN clause if needed (includes team's own ranking for team_win_pct)
  // For NBA: Use nba_team_rankings for pace-adjusted stats, nba_position_defensive_rankings for position-specific
  const rankingsTable = sport === 'nfl' ? 'nfl_team_rankings' : (sport === 'nba' ? 'nba_team_rankings' : null)
  const weekColumn = sport === 'nfl' ? 'week' : null
  const shouldJoinRankings = needsOppRankingsJoin && rankingsTable
  
  // For NBA position-specific rankings, we need a different join
  // We'll determine the position from the player's position or the filter
  const needsPositionRankings = sport === 'nba' && needsOppRankingsJoin && 
    (filters.defense_stat_position === 'vs_g' || filters.defense_stat_position === 'vs_f' || filters.defense_stat_position === 'vs_c' ||
     filters.defense_stat === 'vs_g' || filters.defense_stat === 'vs_f' || filters.defense_stat === 'vs_c')
  
  let oppRankingsJoin = ''
  if (needsPositionRankings) {
    // Join with position-specific defensive rankings
    // The position is determined by the filter (vs_g, vs_f, vs_c) or player's position
    // We'll use a subquery to get the latest ranking for the opponent
    oppRankingsJoin = `
      LEFT JOIN nba_position_defensive_rankings opp_rank ON b.opponent_id = opp_rank.team_id 
        AND g.season = opp_rank.season 
        AND opp_rank.game_date = (
          SELECT MAX(game_date)
          FROM nba_position_defensive_rankings
          WHERE team_id = b.opponent_id
            AND season = g.season
            AND game_date <= toDate(g.game_time)
        )
    `
  } else if (shouldJoinRankings) {
    // Standard rankings join (NFL or NBA)
    // For NBA: Join by season only (no week column in games table)
    // ReplacingMergeTree will handle deduplication, but we filter out bad pace records
    // For NFL: week column exists and we use week + 1 (rankings are "through" week, so week 2 game uses week 1 rankings)
    const paceFilter = sport === 'nba' ? 'AND opp_rank.pace_per_game >= 70' : ''
    const teamPaceFilter = sport === 'nba' ? 'AND team_rank.pace_per_game >= 70' : ''
    
    oppRankingsJoin = `
      LEFT JOIN ${rankingsTable} opp_rank ON b.opponent_id = opp_rank.team_id 
        AND g.season = opp_rank.season 
        ${weekColumn ? `AND g.${weekColumn} = opp_rank.${weekColumn} + 1` : ''}
        ${paceFilter}
      LEFT JOIN ${rankingsTable} team_rank ON b.team_id = team_rank.team_id 
        AND g.season = team_rank.season 
        ${weekColumn ? `AND g.${weekColumn} = team_rank.${weekColumn} + 1` : ''}
        ${teamPaceFilter}
    `
  }
  
  // Add book line conditions if using book lines
  if (use_book_lines && propType) {
    // prop_type is already in JOIN for NBA, but we need it for NFL
    if (sport === 'nfl') {
      allConditions.push(`pl.prop_type = '${propType}'`)
    }
    
    if (book_line_min !== undefined && book_line_min !== null) {
      allConditions.push(`pl.line >= ${book_line_min}`)
      appliedFilters.push(`Book Line ${book_line_min}+`)
    }
    if (book_line_max !== undefined && book_line_max !== null) {
      allConditions.push(`pl.line <= ${book_line_max}`)
      if (book_line_min === undefined || book_line_min === null) {
        appliedFilters.push(`Book Line ≤${book_line_max}`)
      }
    }
  }
  
  // CRITICAL: Add explicit sport filter to prevent cross-sport contamination
  const sportFilter = `b.game_id IN (SELECT game_id FROM ${sport}_games)`
  allConditions.push(sportFilter)
  
  const whereClause = allConditions.length > 0 
    ? 'WHERE ' + allConditions.join(' AND ')
    : ''
  
  const limitClause = limit ? `LIMIT ${limit}` : ''
  
  // Use DISTINCT to avoid duplicate box scores
  // Also join with players table to get position and player info
  const needsPlayerJoin = position && position !== 'any' && (!player_id || player_id === 0)
  
  // Different queries for book line mode vs any line mode
  // Group by key columns and use any() for prop line columns to handle multiple bookmakers
  const sql = use_book_lines ? `
    SELECT
      b.game_id,
      b.player_id,
      toString(b.game_date) as game_date,
      toString(g.game_time) as game_time,
      b.opponent_id,
      b.is_home,
      ${statColumn} as stat_value,
      any(pl.line) as book_line,
      any(pl.bookmaker) as bookmaker,
      any(pl.over_odds) as over_odds,
      any(pl.under_odds) as under_odds,
      -- Full box score stats for expanded view
      ${sport === 'nfl' ? `
      b.pass_attempts,
      b.pass_completions,
      b.pass_yards,
      b.pass_tds,
      b.interceptions,
      b.sacks,
      b.qb_rating,
      b.rush_attempts,
      b.rush_yards,
      b.rush_tds,
      b.rush_long,
      b.yards_per_carry,
      b.targets,
      b.receptions,
      b.receiving_yards,
      b.receiving_tds,
      b.receiving_long,
      b.yards_per_reception,
      ` : `
      b.points,
      b.total_rebounds as rebounds,
      b.assists,
      b.steals,
      b.blocks,
      b.turnovers,
      b.three_pointers_made as threes,
      b.minutes_played,
      b.field_goals_made,
      b.field_goals_attempted,
      b.free_throws_made,
      b.free_throws_attempted,
      b.offensive_rebounds,
      b.defensive_rebounds,
      b.plus_minus,
      `}
      -- Game context
      g.spread_close,
      g.total_close,
      g.spread_open,
      g.total_open,
      g.spread_movement,
      g.total_movement,
      g.home_won,
      g.home_team_id,
      g.away_team_id,
      g.home_score,
      g.away_score,
      g.total_points,
      g.is_division_game,
      g.is_conference_game,
      g.venue,
      ${sport === 'nfl' ? `
      g.referee_name,
      g.home_streak,
      g.away_streak,
      g.home_prev_margin,
      g.away_prev_margin,
      ` : `
      CAST(NULL as Nullable(String)) as referee_name,
      CAST(NULL as Nullable(UInt8)) as home_streak,
      CAST(NULL as Nullable(UInt8)) as away_streak,
      CAST(NULL as Nullable(Int8)) as home_prev_margin,
      CAST(NULL as Nullable(Int8)) as away_prev_margin,
      `}
      -- Public betting columns (NFL only)
      ${sport === 'nfl' ? `
      g.public_ml_home_bet_pct,
      g.public_ml_home_money_pct,
      g.public_spread_home_bet_pct,
      g.public_spread_home_money_pct,
      g.public_total_over_bet_pct,
      g.public_total_over_money_pct,
      ` : `
      CAST(NULL as Nullable(Float32)) as public_ml_home_bet_pct,
      CAST(NULL as Nullable(Float32)) as public_ml_home_money_pct,
      CAST(NULL as Nullable(Float32)) as public_spread_home_bet_pct,
      CAST(NULL as Nullable(Float32)) as public_spread_home_money_pct,
      CAST(NULL as Nullable(Float32)) as public_total_over_bet_pct,
      CAST(NULL as Nullable(Float32)) as public_total_over_money_pct,
      `}
      t.name as opponent_name,
      t.abbreviation as opponent_abbr,
      t.division as opponent_division,
      t.conference as opponent_conference,
      p.name as player_name,
      p.position as player_position,
      p.headshot_url as player_headshot,
      ht.abbreviation as home_abbr,
      at.abbreviation as away_abbr,
      ht.division as home_division,
      ht.conference as home_conference,
      at.division as away_division,
      at.conference as away_conference,
      -- Opponent defensive rankings from box scores
      ${sport === 'nfl' ? `
      b.opp_def_rank_pass_yards,
      b.opp_def_rank_rush_yards,
      b.opp_def_rank_receiving_yards,
      ` : `
      b.opp_def_rank_points,
      b.opp_def_rank_fg_pct,
      b.opp_def_rank_three_pt_pct,
      CAST(NULL as Nullable(UInt8)) as opp_def_rank_rebounds,
      CAST(NULL as Nullable(UInt8)) as opp_def_rank_assists,
      CAST(NULL as Nullable(UInt8)) as opp_def_rank_threes,
      CAST(NULL as Nullable(UInt8)) as opp_def_rank_steals,
      CAST(NULL as Nullable(UInt8)) as opp_def_rank_blocks,
      `}
      -- Opponent offensive rankings from rankings join (if available)
      ${shouldJoinRankings ? 'opp_rank.rank_points_per_game as opp_off_rank_points,' : 'CAST(NULL as Nullable(Float32)) as opp_off_rank_points,'}
      ${shouldJoinRankings && sport === 'nfl' ? 'opp_rank.rank_passing_yards_per_game as opp_off_rank_pass,' : 'CAST(NULL as Nullable(Float32)) as opp_off_rank_pass,'}
      ${shouldJoinRankings && sport === 'nfl' ? 'opp_rank.rank_rushing_yards_per_game as opp_off_rank_rush,' : 'CAST(NULL as Nullable(Float32)) as opp_off_rank_rush,'}
      -- Position-specific defensive rankings (vs WR/TE/RB) - NFL only
      ${shouldJoinRankings && sport === 'nfl' ? 'opp_rank.rank_yards_allowed_to_wr as opp_def_rank_vs_wr,' : 'CAST(NULL as Nullable(UInt8)) as opp_def_rank_vs_wr,'}
      ${shouldJoinRankings && sport === 'nfl' ? 'opp_rank.rank_yards_allowed_to_te as opp_def_rank_vs_te,' : 'CAST(NULL as Nullable(UInt8)) as opp_def_rank_vs_te,'}
      ${shouldJoinRankings && sport === 'nfl' ? 'opp_rank.rank_yards_allowed_to_rb as opp_def_rank_vs_rb,' : 'CAST(NULL as Nullable(UInt8)) as opp_def_rank_vs_rb,'}
      -- Win percentages - NFL only
      ${shouldJoinRankings && sport === 'nfl' ? 'team_rank.win_pct as team_win_pct,' : 'CAST(NULL as Nullable(Float32)) as team_win_pct,'}
      ${shouldJoinRankings && sport === 'nfl' ? 'opp_rank.win_pct as opp_win_pct' : 'CAST(NULL as Nullable(Float32)) as opp_win_pct'}
    FROM ${sport === 'nfl' ? 'nfl_box_scores_v2' : 'nba_box_scores_v2'} b
    JOIN ${sport}_games g ON b.game_id = g.game_id
    LEFT JOIN teams t ON b.opponent_id = t.espn_team_id AND t.sport = '${sport}'
    LEFT JOIN teams ht ON g.home_team_id = ht.espn_team_id AND ht.sport = '${sport}'
    LEFT JOIN teams at ON g.away_team_id = at.espn_team_id AND at.sport = '${sport}'
    JOIN players p ON b.player_id = p.espn_player_id AND p.sport = '${sport}'
    JOIN (
      SELECT 
        ${sport === 'nfl' 
          ? `player_name, game_time, prop_type,
             any(line) as line,
             any(bookmaker) as bookmaker,
             any(over_odds) as over_odds,
             any(under_odds) as under_odds`
          : `espn_game_id, player_name, prop_type,
             any(line) as line,
             any(bookmaker) as bookmaker,
             any(over_odds) as over_odds,
             any(under_odds) as under_odds`}
      FROM ${sport}_prop_lines
      WHERE prop_type = '${propType}'
        ${sport === 'nba' ? 'AND espn_game_id > 0' : ''}
      GROUP BY ${sport === 'nfl' 
        ? 'player_name, game_time, prop_type' 
        : 'espn_game_id, player_name, prop_type'}
    ) pl ON ${sport === 'nfl' 
      ? `p.name = pl.player_name AND toDate(g.game_time) = toDate(pl.game_time) AND pl.prop_type = '${propType}'`
      : `g.espn_game_id = toString(pl.espn_game_id) AND LOWER(REPLACE(p.name, '.', '')) = LOWER(REPLACE(pl.player_name, '.', ''))`}
    ${oppRankingsJoin}
    ${whereClause}
    ORDER BY b.game_date DESC, b.player_id
    ${limitClause}
  ` : `
    SELECT DISTINCT
      b.game_id,
      b.player_id,
      toString(b.game_date) as game_date,
      toString(g.game_time) as game_time,
      b.opponent_id,
      b.is_home,
      ${statColumn} as stat_value,
      -- Full box score stats for expanded view
      ${sport === 'nfl' ? `
      b.pass_attempts,
      b.pass_completions,
      b.pass_yards,
      b.pass_tds,
      b.interceptions,
      b.sacks,
      b.qb_rating,
      b.rush_attempts,
      b.rush_yards,
      b.rush_tds,
      b.rush_long,
      b.yards_per_carry,
      b.targets,
      b.receptions,
      b.receiving_yards,
      b.receiving_tds,
      b.receiving_long,
      b.yards_per_reception,
      ` : `
      b.points,
      b.total_rebounds as rebounds,
      b.assists,
      b.steals,
      b.blocks,
      b.turnovers,
      b.three_pointers_made as threes,
      b.minutes_played,
      b.field_goals_made,
      b.field_goals_attempted,
      b.free_throws_made,
      b.free_throws_attempted,
      b.offensive_rebounds,
      b.defensive_rebounds,
      b.plus_minus,
      `}
      -- Game context
      g.spread_close,
      g.total_close,
      g.spread_open,
      g.total_open,
      g.spread_movement,
      g.total_movement,
      g.home_won,
      g.home_team_id,
      g.away_team_id,
      g.home_score,
      g.away_score,
      g.total_points,
      g.is_division_game,
      g.is_conference_game,
      g.venue,
      ${sport === 'nfl' ? `
      g.referee_name,
      g.home_streak,
      g.away_streak,
      g.home_prev_margin,
      g.away_prev_margin,
      ` : `
      CAST(NULL as Nullable(String)) as referee_name,
      CAST(NULL as Nullable(UInt8)) as home_streak,
      CAST(NULL as Nullable(UInt8)) as away_streak,
      CAST(NULL as Nullable(Int8)) as home_prev_margin,
      CAST(NULL as Nullable(Int8)) as away_prev_margin,
      `}
      -- Public betting columns (NFL only)
      ${sport === 'nfl' ? `
      g.public_ml_home_bet_pct,
      g.public_ml_home_money_pct,
      g.public_spread_home_bet_pct,
      g.public_spread_home_money_pct,
      g.public_total_over_bet_pct,
      g.public_total_over_money_pct,
      ` : `
      CAST(NULL as Nullable(Float32)) as public_ml_home_bet_pct,
      CAST(NULL as Nullable(Float32)) as public_ml_home_money_pct,
      CAST(NULL as Nullable(Float32)) as public_spread_home_bet_pct,
      CAST(NULL as Nullable(Float32)) as public_spread_home_money_pct,
      CAST(NULL as Nullable(Float32)) as public_total_over_bet_pct,
      CAST(NULL as Nullable(Float32)) as public_total_over_money_pct,
      `}
      t.name as opponent_name,
      t.abbreviation as opponent_abbr,
      t.division as opponent_division,
      t.conference as opponent_conference,
      p.name as player_name,
      p.position as player_position,
      p.headshot_url as player_headshot,
      ht.abbreviation as home_abbr,
      at.abbreviation as away_abbr,
      ht.division as home_division,
      ht.conference as home_conference,
      at.division as away_division,
      at.conference as away_conference,
      -- Opponent defensive rankings from box scores
      ${sport === 'nfl' ? `
      b.opp_def_rank_pass_yards,
      b.opp_def_rank_rush_yards,
      b.opp_def_rank_receiving_yards,
      ` : `
      b.opp_def_rank_points,
      b.opp_def_rank_fg_pct,
      b.opp_def_rank_three_pt_pct,
      CAST(NULL as Nullable(UInt8)) as opp_def_rank_rebounds,
      CAST(NULL as Nullable(UInt8)) as opp_def_rank_assists,
      CAST(NULL as Nullable(UInt8)) as opp_def_rank_threes,
      CAST(NULL as Nullable(UInt8)) as opp_def_rank_steals,
      CAST(NULL as Nullable(UInt8)) as opp_def_rank_blocks,
      `}
      -- Opponent offensive rankings from rankings join (if available)
      ${shouldJoinRankings ? 'opp_rank.rank_points_per_game as opp_off_rank_points,' : 'CAST(NULL as Nullable(Float32)) as opp_off_rank_points,'}
      ${shouldJoinRankings && sport === 'nfl' ? 'opp_rank.rank_passing_yards_per_game as opp_off_rank_pass,' : 'CAST(NULL as Nullable(Float32)) as opp_off_rank_pass,'}
      ${shouldJoinRankings && sport === 'nfl' ? 'opp_rank.rank_rushing_yards_per_game as opp_off_rank_rush,' : 'CAST(NULL as Nullable(Float32)) as opp_off_rank_rush,'}
      -- Position-specific defensive rankings (vs WR/TE/RB) - NFL only
      ${shouldJoinRankings && sport === 'nfl' ? 'opp_rank.rank_yards_allowed_to_wr as opp_def_rank_vs_wr,' : 'CAST(NULL as Nullable(UInt8)) as opp_def_rank_vs_wr,'}
      ${shouldJoinRankings && sport === 'nfl' ? 'opp_rank.rank_yards_allowed_to_te as opp_def_rank_vs_te,' : 'CAST(NULL as Nullable(UInt8)) as opp_def_rank_vs_te,'}
      ${shouldJoinRankings && sport === 'nfl' ? 'opp_rank.rank_yards_allowed_to_rb as opp_def_rank_vs_rb,' : 'CAST(NULL as Nullable(UInt8)) as opp_def_rank_vs_rb,'}
      -- Win percentages - NFL only
      ${shouldJoinRankings && sport === 'nfl' ? 'team_rank.win_pct as team_win_pct,' : 'CAST(NULL as Nullable(Float32)) as team_win_pct,'}
      ${shouldJoinRankings && sport === 'nfl' ? 'opp_rank.win_pct as opp_win_pct' : 'CAST(NULL as Nullable(Float32)) as opp_win_pct'}
    FROM ${sport === 'nfl' ? 'nfl_box_scores_v2' : 'nba_box_scores_v2'} b
    JOIN ${sport}_games g ON b.game_id = g.game_id
    LEFT JOIN teams t ON b.opponent_id = t.espn_team_id AND t.sport = '${sport}'
    LEFT JOIN teams ht ON g.home_team_id = ht.espn_team_id AND ht.sport = '${sport}'
    LEFT JOIN teams at ON g.away_team_id = at.espn_team_id AND at.sport = '${sport}'
    JOIN players p ON b.player_id = p.espn_player_id AND p.sport = '${sport}'
    ${oppRankingsJoin}
    ${whereClause}
    ORDER BY b.game_date DESC, b.player_id
    ${limitClause}
  `
  
  console.log(`[PropQuery] Executing query for sport: ${sport}, stat: ${stat}, propType: ${propType}`)
  
  const result = await clickhouseQuery(sql)
  const rows = result.data || []
  
  // Post-process: filter out any cross-sport contamination (safety check)
  const filteredRows = rows.filter((row: any) => {
    // CRITICAL: Check if team names/abbreviations match the sport
    if (sport === 'nba') {
      // NBA teams should not be NFL team names
      const nflTeams = ['49ers', 'Raiders', 'Chargers', 'Rams', 'Seahawks', 'Cardinals', 'Cowboys', 'Giants', 'Eagles', 'Commanders', 'Bears', 'Lions', 'Packers', 'Vikings', 'Falcons', 'Panthers', 'Saints', 'Buccaneers', 'Bills', 'Dolphins', 'Patriots', 'Jets', 'Ravens', 'Bengals', 'Browns', 'Steelers', 'Texans', 'Colts', 'Jaguars', 'Titans', 'Broncos', 'Chiefs', 'Raiders', 'Chargers']
      const opponentName = row.opponent_name || row.opponent_abbr || ''
      const homeTeam = row.home_abbr || ''
      const awayTeam = row.away_abbr || ''
      
      if (nflTeams.some(nflTeam => 
        opponentName.includes(nflTeam) || 
        homeTeam.includes(nflTeam) || 
        awayTeam.includes(nflTeam)
      )) {
        console.error(`[PropQuery] CRITICAL: NBA query returned NFL team! Player: ${row.player_name}, Opponent: ${opponentName}`)
        return false
      }
      
      // NBA players should not have NFL stats
      if (row.pass_yards !== undefined && row.pass_yards !== null && row.pass_yards > 0) {
        console.error(`[PropQuery] CRITICAL: NBA query returned NFL stats! Player: ${row.player_name}, pass_yards: ${row.pass_yards}`)
        return false
      }
    } else if (sport === 'nfl') {
      // NFL teams should not be NBA team names
      const nbaTeams = ['Lakers', 'Warriors', 'Celtics', 'Heat', 'Nuggets', 'Bucks', 'Suns', 'Mavericks', 'Clippers', '76ers', 'Nets', 'Knicks', 'Bulls', 'Raptors', 'Hawks', 'Hornets', 'Cavaliers', 'Pistons', 'Pacers', 'Rockets', 'Grizzlies', 'Pelicans', 'Thunder', 'Magic', 'Trail Blazers', 'Kings', 'Spurs', 'Jazz', 'Wizards', 'Timberwolves']
      const opponentName = row.opponent_name || row.opponent_abbr || ''
      const homeTeam = row.home_abbr || ''
      const awayTeam = row.away_abbr || ''
      
      if (nbaTeams.some(nbaTeam => 
        opponentName.includes(nbaTeam) || 
        homeTeam.includes(nbaTeam) || 
        awayTeam.includes(nbaTeam)
      )) {
        console.error(`[PropQuery] CRITICAL: NFL query returned NBA team! Player: ${row.player_name}, Opponent: ${opponentName}`)
        return false
      }
      
      // NFL players should not have NBA stats  
      if (row.points !== undefined && row.points !== null && row.points > 0) {
        console.error(`[PropQuery] CRITICAL: NFL query returned NBA stats! Player: ${row.player_name}, points: ${row.points}`)
        return false
      }
    }
    return true
  })
  
  // Deduplicate by game_id + player_id (in case subquery didn't work)
  const seen = new Set<string>()
  const dedupedRows = filteredRows.filter((row: any) => {
    const key = `${row.game_id}_${row.player_id}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
  
  if (dedupedRows.length < filteredRows.length) {
    console.warn(`[PropQuery] Deduplicated ${filteredRows.length} rows to ${dedupedRows.length} rows (removed ${filteredRows.length - dedupedRows.length} duplicates)`)
  }
  
  console.log(`[PropQuery] Returned ${rows.length} rows, filtered to ${filteredRows.length}, deduped to ${dedupedRows.length}`)
  
  const rowsToProcess = dedupedRows
  
  // Calculate results
  const games: GameDetail[] = []
  let hits = 0
  let misses = 0
  let pushes = 0
  let totalValue = 0
  let totalDiff = 0
  let minValue = Infinity
  let maxValue = -Infinity
  
  // Streak tracking
  let currentStreak = 0
  let longestHitStreak = 0
  let longestMissStreak = 0
  let tempStreak = 0
  let lastWasHit: boolean | null = null
  
  // ROI calculation variables
  // ONLY calculate ROI for pure Book Line mode (not dual mode, not any line mode)
  // because we only have actual odds for the book lines
  const canCalculateROI = use_book_lines && (!line || line === 0)
  let totalProfit = 0
  const unitSize = 100 // Standard $100 unit
  
  for (const row of rowsToProcess) {
    const value = Number(row.stat_value) || 0
    const bookLine = row.book_line !== undefined ? Number(row.book_line) : null
    const overOdds = row.over_odds ? Number(row.over_odds) : -110 // Default -110
    
    // DUAL LINE MODE: If both book lines are used for filtering AND a custom line is set,
    // use the custom line for hit/miss calculation (to find alt line value)
    // Otherwise use book line if available, or input line
    const effectiveLine = (use_book_lines && line > 0) ? line : (bookLine !== null ? bookLine : line)
    const hit = value > effectiveLine
    const push = value === effectiveLine
    const diff = value - effectiveLine
    
    // Calculate profit for ROI ONLY if we're using actual book lines
    // (not for dual mode or any line mode - we don't have odds for arbitrary lines)
    if (canCalculateROI) {
      if (hit) {
        // Profit calculation based on American odds
        if (overOdds > 0) {
          totalProfit += (overOdds / 100) * unitSize // e.g., +150 = $150 profit on $100
        } else {
          totalProfit += (100 / Math.abs(overOdds)) * unitSize // e.g., -110 = $90.91 profit on $100
        }
      } else if (!push) {
        totalProfit -= unitSize // Loss = -$100
      }
      // Push = $0 profit
    }
    
    totalValue += value
    totalDiff += diff
    if (value < minValue) minValue = value
    if (value > maxValue) maxValue = value
    
    if (hit) {
      hits++
    } else if (push) {
      pushes++
    } else {
      misses++
    }
    
    // Streak calculation (most recent first)
    if (lastWasHit === null) {
      // First game
      currentStreak = hit ? 1 : (push ? 0 : -1)
      tempStreak = hit ? 1 : (push ? 0 : -1)
      lastWasHit = hit
    } else {
      // Continue streak calculation for longest
      if (hit && lastWasHit) {
        tempStreak++
        if (tempStreak > longestHitStreak) longestHitStreak = tempStreak
      } else if (!hit && !lastWasHit) {
        tempStreak--
        if (Math.abs(tempStreak) > longestMissStreak) longestMissStreak = Math.abs(tempStreak)
      } else {
        // Streak broken
        tempStreak = hit ? 1 : -1
      }
      lastWasHit = hit
    }
    
    // Determine if player's team won
    let teamWon: boolean | undefined
    if (row.home_won !== undefined) {
      const playerTeamId = row.is_home === 1 ? row.home_team_id : row.away_team_id
      const homeWon = row.home_won === 1
      teamWon = row.is_home === 1 ? homeWon : !homeWon
    }
    
    // Player's team spread: spread_close if home, else flip it
    const playerSpread = row.is_home === 1 ? row.spread_close : -row.spread_close
    
    // Calculate public betting percentages based on player's team perspective
    // For props, we generally care about spread/ML since it relates to game script
    const playerIsHome = row.is_home === 1
    let publicBetPct: number | undefined
    let publicMoneyPct: number | undefined
    
    // Use spread public betting for props (game script relevance)
    if (playerIsHome) {
      publicBetPct = row.public_spread_home_bet_pct || undefined
      publicMoneyPct = row.public_spread_home_money_pct || undefined
    } else {
      publicBetPct = row.public_spread_home_bet_pct ? (100 - row.public_spread_home_bet_pct) : undefined
      publicMoneyPct = row.public_spread_home_money_pct ? (100 - row.public_spread_home_money_pct) : undefined
    }
    
    const publicDiffPct = (publicMoneyPct !== undefined && publicBetPct !== undefined) 
      ? Math.round((publicMoneyPct - publicBetPct) * 10) / 10 
      : undefined
    
    games.push({
      game_id: row.game_id,
      game_date: row.game_date, // Already formatted as string via toString()
      game_time: row.game_time,
      opponent: row.opponent_abbr || row.opponent_name || `Team ${row.opponent_id}`,
      opponent_id: row.opponent_id,
      location: row.is_home === 1 ? 'home' : 'away',
      actual_value: value,
      line: effectiveLine,
      book_line: bookLine !== null ? bookLine : undefined,
      bookmaker: row.bookmaker || undefined,
      over_odds: row.over_odds || undefined,
      under_odds: row.under_odds || undefined,
      hit,
      differential: diff,
      spread: playerSpread, // Player's team spread (from their perspective)
      total: row.total_close,
      team_won: teamWon,
      // Player info for position-based queries
      player_id: row.player_id,
      player_name: row.player_name,
      player_position: row.player_position,
      player_headshot: row.player_headshot,
      // Full box score stats for expanded view
      ...(sport === 'nfl' ? {
        pass_attempts: row.pass_attempts,
        pass_completions: row.pass_completions,
        pass_yards: row.pass_yards,
        pass_tds: row.pass_tds,
        interceptions: row.interceptions,
        sacks: row.sacks,
        qb_rating: row.qb_rating,
        rush_attempts: row.rush_attempts,
        rush_yards: row.rush_yards,
        rush_tds: row.rush_tds,
        rush_long: row.rush_long,
        yards_per_carry: row.yards_per_carry,
        targets: row.targets,
        receptions: row.receptions,
        receiving_yards: row.receiving_yards,
        receiving_tds: row.receiving_tds,
        receiving_long: row.receiving_long,
        yards_per_reception: row.yards_per_reception,
      } : {
        points: row.points,
        rebounds: row.rebounds,
        assists: row.assists,
        steals: row.steals,
        blocks: row.blocks,
        turnovers: row.turnovers,
        threes: row.threes,
        minutes_played: row.minutes_played,
        field_goals_made: row.field_goals_made,
        field_goals_attempted: row.field_goals_attempted,
        free_throws_made: row.free_throws_made,
        free_throws_attempted: row.free_throws_attempted,
        offensive_rebounds: row.offensive_rebounds,
        defensive_rebounds: row.defensive_rebounds,
        plus_minus: row.plus_minus,
      }),
      // For "Why this fits" - venue and matchup info
      venue: row.venue,
      home_division: row.home_division,
      away_division: row.away_division,
      home_conference: row.home_conference,
      away_conference: row.away_conference,
      spread_close: row.spread_close,
      // Additional team info
      home_team_id: row.home_team_id,
      away_team_id: row.away_team_id,
      home_abbr: row.home_abbr,
      away_abbr: row.away_abbr,
      // Opponent rankings for "Why this fits"
      ...(sport === 'nfl' ? {
        opp_def_rank_pass: row.opp_def_rank_pass_yards,
        opp_def_rank_rush: row.opp_def_rank_rush_yards,
        opp_def_rank_receiving: row.opp_def_rank_receiving_yards,
        opp_off_rank_points: row.opp_off_rank_points,
        opp_off_rank_pass: row.opp_off_rank_pass,
        opp_off_rank_rush: row.opp_off_rank_rush,
      } : {
        opp_def_rank_points: row.opp_def_rank_points,
        opp_def_rank_fg_pct: row.opp_def_rank_fg_pct,
        opp_def_rank_three_pt_pct: row.opp_def_rank_three_pt_pct,
        opp_off_rank_points: row.opp_off_rank_points || null,
        opp_off_rank_pass: null,
        opp_off_rank_rush: null,
      }),
      // Track if player is home for context
      is_home: row.is_home === 1,
      // Public betting data
      public_bet_pct: publicBetPct,
      public_money_pct: publicMoneyPct,
      public_diff_pct: publicDiffPct
    })
  }
  
  // Final calculations
  const totalGames = games.length
  const hitRate = totalGames > 0 ? (hits / (hits + misses)) * 100 : 0
  const avgValue = totalGames > 0 ? totalValue / totalGames : 0
  const avgDiff = totalGames > 0 ? totalDiff / totalGames : 0
  
  // Update longest streaks from final temp
  if (tempStreak > 0 && tempStreak > longestHitStreak) longestHitStreak = tempStreak
  if (tempStreak < 0 && Math.abs(tempStreak) > longestMissStreak) longestMissStreak = Math.abs(tempStreak)
  
  return {
    hits,
    misses,
    pushes,
    total_games: totalGames,
    hit_rate: Math.round(hitRate * 10) / 10,
    avg_value: Math.round(avgValue * 10) / 10,
    avg_differential: Math.round(avgDiff * 10) / 10,
    min_value: minValue === Infinity ? 0 : minValue,
    max_value: maxValue === -Infinity ? 0 : maxValue,
    current_streak: currentStreak,
    longest_hit_streak: longestHitStreak,
    longest_miss_streak: longestMissStreak,
    // ROI calculation - ONLY for pure Book Line mode (we have actual odds)
    // For Any Line or Dual mode, we don't know the real odds
    ...(canCalculateROI ? {
      estimated_roi: totalGames > 0 ? Math.round((totalProfit / (totalGames * unitSize)) * 1000) / 10 : 0,
      total_profit: Math.round(totalProfit * 10) / 10,
    } : {}),
    games,
    query_time_ms: Date.now() - startTime,
    filters_applied: appliedFilters
  }
}

