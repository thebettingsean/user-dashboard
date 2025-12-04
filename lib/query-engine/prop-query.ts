/**
 * Prop Query Handler
 * Queries player historical stats against a given line
 */

import { clickhouseQuery } from '@/lib/clickhouse'
import { buildFilterConditions, buildWhereClause, getTimePeriodLimit } from './filter-builder'
import type { PropQueryRequest, QueryResult, GameDetail, PropStatType } from './types'

// ============================================
// STAT COLUMN MAPPING
// ============================================

const STAT_COLUMNS: Record<PropStatType, string> = {
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
  completions_plus_rush_yards: '(pass_completions + rush_yards)'
}

// Map stat types to defensive ranking columns
const STAT_TO_DEFENSE: Record<PropStatType, 'pass' | 'rush' | 'receiving'> = {
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
  completions_plus_rush_yards: 'pass'
}

// ============================================
// PROP QUERY EXECUTION
// ============================================

export async function executePropQuery(request: PropQueryRequest): Promise<QueryResult> {
  const startTime = Date.now()
  const { player_id, position, stat, line, filters } = request
  
  const statColumn = STAT_COLUMNS[stat]
  if (!statColumn) {
    throw new Error(`Unknown stat type: ${stat}`)
  }
  
  // Determine defense stat type for ranking filter
  const defenseStat = STAT_TO_DEFENSE[stat]
  
  // Build filter conditions for games table
  // Remove defense rank from game filters since it's on box_scores
  const gameFilters = { ...filters }
  delete gameFilters.vs_defense_rank // This is on box_scores table
  delete gameFilters.location // This is handled separately for box_scores
  
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
  
  // Player or Position filter
  if (player_id && player_id > 0) {
    // Specific player
    boxConditions.push(`b.player_id = ${player_id}`)
  } else if (position && position !== 'any') {
    // All players of a position - join with players table
    boxConditions.push(`p.position = '${position}'`)
    appliedFilters.push(`All ${position}s`)
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
  
  // Defense rank filter - use box_scores columns
  if (filters.vs_defense_rank && filters.vs_defense_rank !== 'any') {
    const rankCol = defenseStat === 'pass' ? 'opp_def_rank_pass_yards'
      : defenseStat === 'rush' ? 'opp_def_rank_rush_yards'
      : 'opp_def_rank_receiving_yards'
    
    switch (filters.vs_defense_rank) {
      case 'top_5':
        boxConditions.push(`b.${rankCol} <= 5 AND b.${rankCol} > 0`)
        appliedFilters.push('vs Top 5 Defense')
        break
      case 'top_10':
        boxConditions.push(`b.${rankCol} <= 10 AND b.${rankCol} > 0`)
        appliedFilters.push('vs Top 10 Defense')
        break
      case 'top_15':
        boxConditions.push(`b.${rankCol} <= 15 AND b.${rankCol} > 0`)
        appliedFilters.push('vs Top 15 Defense')
        break
      case 'bottom_5':
        boxConditions.push(`b.${rankCol} >= 28`)
        appliedFilters.push('vs Bottom 5 Defense')
        break
      case 'bottom_10':
        boxConditions.push(`b.${rankCol} >= 23`)
        appliedFilters.push('vs Bottom 10 Defense')
        break
      case 'bottom_15':
        boxConditions.push(`b.${rankCol} >= 18`)
        appliedFilters.push('vs Bottom 15 Defense')
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
  
  // Build the query
  // Join box_scores with games and players for complete filtering
  // Filter out anomalous values (data overflow issues - 65535 is UInt16 max)
  const allConditions = [
    ...boxConditions,
    ...gameConditions,
    // Exclude obvious data errors
    'b.pass_yards < 1000',
    'b.rush_yards < 500',
    'b.receiving_yards < 500'
  ]
  
  const whereClause = allConditions.length > 0 
    ? 'WHERE ' + allConditions.join(' AND ')
    : ''
  
  const limitClause = limit ? `LIMIT ${limit}` : ''
  
  // Use DISTINCT to avoid duplicate box scores
  // Also join with players table to get position and player info
  const needsPlayerJoin = position && position !== 'any' && (!player_id || player_id === 0)
  
  const sql = `
    SELECT DISTINCT
      b.game_id,
      b.player_id,
      toString(b.game_date) as game_date,
      b.opponent_id,
      b.is_home,
      ${statColumn} as stat_value,
      -- Full box score stats for expanded view
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
      -- Game context
      g.spread_close,
      g.total_close,
      g.home_won,
      g.home_team_id,
      g.away_team_id,
      t.name as opponent_name,
      t.abbreviation as opponent_abbr,
      p.name as player_name,
      p.position as player_position,
      p.headshot_url as player_headshot
    FROM nfl_box_scores_v2 b
    JOIN nfl_games g ON b.game_id = g.game_id
    LEFT JOIN teams t ON b.opponent_id = t.espn_team_id AND t.sport = 'nfl'
    JOIN players p ON b.player_id = p.espn_player_id AND p.sport = 'nfl'
    ${whereClause}
    ORDER BY b.game_date DESC, b.player_id
    ${limitClause}
  `
  
  console.log('[PropQuery] Executing:', sql.substring(0, 200) + '...')
  
  const result = await clickhouseQuery(sql)
  const rows = result.data || []
  
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
  
  for (const row of rows) {
    const value = Number(row.stat_value) || 0
    const hit = value > line
    const push = value === line
    const diff = value - line
    
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
    
    games.push({
      game_id: row.game_id,
      game_date: row.game_date, // Already formatted as string via toString()
      opponent: row.opponent_abbr || row.opponent_name || `Team ${row.opponent_id}`,
      opponent_id: row.opponent_id,
      location: row.is_home === 1 ? 'home' : 'away',
      actual_value: value,
      line,
      hit,
      differential: diff,
      spread: row.spread_close,
      total: row.total_close,
      team_won: teamWon,
      // Player info for position-based queries
      player_id: row.player_id,
      player_name: row.player_name,
      player_position: row.player_position,
      player_headshot: row.player_headshot,
      // Full box score stats for expanded view
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
      yards_per_reception: row.yards_per_reception
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
    games,
    query_time_ms: Date.now() - startTime,
    filters_applied: appliedFilters
  }
}

