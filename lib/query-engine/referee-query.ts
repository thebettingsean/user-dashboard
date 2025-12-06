/**
 * Referee Query Handler
 * Queries historical betting trends based on referee assignments
 */

import { clickhouseQuery } from '@/lib/clickhouse'
import { buildFilterConditions } from './filter-builder'
import type { RefereeQueryRequest, QueryResult, GameDetail } from './types'

// ============================================
// REFEREE QUERY EXECUTION
// ============================================

export async function executeRefereeQuery(request: RefereeQueryRequest): Promise<QueryResult> {
  const startTime = Date.now()
  const { referee_id, bet_type, side, filters } = request
  
  // Build filter conditions
  const { conditions, appliedFilters, limit } = buildFilterConditions(
    filters,
    { 
      tableAlias: 'g', 
      isHomeTeam: side === 'home' || side === 'over',
      betType: bet_type === 'total' ? 'total' : 'spread'
    }
  )
  
  // Build referee-specific conditions
  const refConditions: string[] = [...conditions]
  
  // Filter by specific referee if provided
  if (referee_id) {
    refConditions.push(`g.referee_name = '${referee_id.replace(/'/g, "''")}'`)
    appliedFilters.push(`Referee: ${referee_id}`)
  } else {
    // Must have a referee assigned
    refConditions.push(`g.referee_name != ''`)
    appliedFilters.push('All Referees')
  }
  
  // Ensure completed games with valid data
  refConditions.push(`(g.home_score > 0 OR g.away_score > 0)`)
  
  if (bet_type === 'spread') {
    refConditions.push(`g.spread_close != 0`)
  } else if (bet_type === 'total') {
    refConditions.push(`g.total_close != 0`)
  }
  
  const whereClause = refConditions.length > 0 
    ? 'WHERE ' + refConditions.join(' AND ')
    : ''
  
  const limitClause = limit ? `LIMIT ${limit}` : ''
  
  // Build result columns based on bet type and side
  let hitColumn: string
  let valueColumn: string
  
  if (bet_type === 'spread') {
    if (side === 'home') {
      hitColumn = 'g.home_covered'
      valueColumn = '(g.home_score - g.away_score) + g.spread_close'
    } else {
      hitColumn = '1 - g.home_covered'
      valueColumn = '(g.away_score - g.home_score) - g.spread_close'
    }
  } else if (bet_type === 'total') {
    if (side === 'over') {
      hitColumn = 'g.went_over'
      valueColumn = 'g.total_points - g.total_close'
    } else {
      hitColumn = 'g.went_under'
      valueColumn = 'g.total_close - g.total_points'
    }
  } else {
    // Moneyline
    hitColumn = side === 'home' ? 'g.home_won' : '1 - g.home_won'
    valueColumn = 'g.home_score - g.away_score'
  }
  
  const sql = `
    SELECT 
      g.game_id,
      toString(g.game_date) as game_date,
      g.home_team_id,
      g.away_team_id,
      g.home_score,
      g.away_score,
      g.total_points,
      g.spread_close,
      g.total_close,
      g.spread_open,
      g.total_open,
      g.spread_movement,
      g.total_movement,
      g.home_covered,
      g.went_over,
      g.went_under,
      g.spread_push,
      g.total_push,
      g.home_won,
      g.is_division_game,
      g.is_conference_game,
      g.is_playoff,
      g.venue,
      g.referee_name,
      g.home_streak,
      g.away_streak,
      g.home_prev_margin,
      g.away_prev_margin,
      ${hitColumn} as hit,
      ${valueColumn} as value,
      ht.abbreviation as home_abbr,
      ht.name as home_team_name,
      ht.division as home_division,
      ht.conference as home_conference,
      at.abbreviation as away_abbr,
      at.name as away_team_name,
      at.division as away_division,
      at.conference as away_conference
    FROM nfl_games g
    LEFT JOIN teams ht ON g.home_team_id = ht.espn_team_id AND ht.sport = 'nfl'
    LEFT JOIN teams at ON g.away_team_id = at.espn_team_id AND at.sport = 'nfl'
    ${whereClause}
    ORDER BY g.game_date DESC
    ${limitClause}
  `
  
  console.log('[RefereeQuery] Executing:', sql.substring(0, 200) + '...')
  
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
    const value = Number(row.value) || 0
    const hitValue = Number(row.hit)
    const isPush = bet_type === 'spread' ? row.spread_push === 1 : (bet_type === 'total' ? row.total_push === 1 : false)
    const hit = hitValue === 1 && !isPush
    
    totalValue += bet_type === 'total' ? row.total_points : Math.abs(value)
    totalDiff += value
    
    if (value < minValue) minValue = value
    if (value > maxValue) maxValue = value
    
    if (isPush) {
      pushes++
    } else if (hit) {
      hits++
    } else {
      misses++
    }
    
    // Streak calculation
    if (!isPush) {
      if (lastWasHit === null) {
        currentStreak = hit ? 1 : -1
        tempStreak = hit ? 1 : -1
        lastWasHit = hit
      } else {
        if (hit && lastWasHit) {
          tempStreak++
          if (tempStreak > longestHitStreak) longestHitStreak = tempStreak
        } else if (!hit && !lastWasHit) {
          tempStreak--
          if (Math.abs(tempStreak) > longestMissStreak) longestMissStreak = Math.abs(tempStreak)
        } else {
          tempStreak = hit ? 1 : -1
        }
        lastWasHit = hit
      }
    }
    
    games.push({
      game_id: row.game_id,
      game_date: row.game_date,
      opponent: `${row.away_abbr || 'Away'} @ ${row.home_abbr || 'Home'}`,
      opponent_id: row.away_team_id,
      location: 'home',
      actual_value: bet_type === 'total' ? row.total_points : value,
      line: bet_type === 'total' ? row.total_close : row.spread_close,
      hit,
      differential: value,
      spread: row.spread_close,
      total: row.total_close,
      home_score: row.home_score,
      away_score: row.away_score,
      // For O/U display
      home_team_id: row.home_team_id,
      away_team_id: row.away_team_id,
      home_abbr: row.home_abbr,
      away_abbr: row.away_abbr
    })
  }
  
  // Final calculations
  const totalGames = games.length
  const hitRate = totalGames > 0 ? (hits / (hits + misses)) * 100 : 0
  const avgValue = totalGames > 0 ? totalValue / totalGames : 0
  const avgDiff = totalGames > 0 ? totalDiff / totalGames : 0
  
  // Update longest streaks
  if (tempStreak > 0 && tempStreak > longestHitStreak) longestHitStreak = tempStreak
  if (tempStreak < 0 && Math.abs(tempStreak) > longestMissStreak) longestMissStreak = Math.abs(tempStreak)
  
  // Add trend description to applied filters
  let trendDescription = ''
  if (bet_type === 'spread') {
    trendDescription = side === 'home' ? 'Home covering' : 'Away covering'
  } else if (bet_type === 'total') {
    trendDescription = side === 'over' ? 'Overs hitting' : 'Unders hitting'
  }
  
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
    filters_applied: [trendDescription, ...appliedFilters]
  }
}

/**
 * Get list of all referees with game counts
 */
export async function getRefereeList(): Promise<{ referee_name: string; game_count: number }[]> {
  const result = await clickhouseQuery(`
    SELECT 
      referee_name,
      COUNT(*) as game_count
    FROM nfl_games
    WHERE referee_name != ''
    GROUP BY referee_name
    ORDER BY game_count DESC
  `)
  
  return result.data || []
}

