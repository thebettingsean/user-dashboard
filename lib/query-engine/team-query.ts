/**
 * Team Query Handler
 * Queries team betting performance (spread cover, over/under, ML)
 */

import { clickhouseQuery } from '@/lib/clickhouse'
import { buildFilterConditions } from './filter-builder'
import type { TeamQueryRequest, QueryResult, GameDetail } from './types'

// ============================================
// TEAM QUERY EXECUTION
// ============================================

export async function executeTeamQuery(request: TeamQueryRequest): Promise<QueryResult> {
  const startTime = Date.now()
  const { team_id, bet_type, side, filters } = request
  
  // Extract special team-related filters
  const teamLocation = (request as any).location as 'home' | 'away' | 'any' | undefined
  const opponentId = (request as any).opponent_id as number | undefined
  
  // Build filter conditions
  const isHomeTeam = side === 'home' || side === 'favorite' // Determine perspective
  const { conditions, appliedFilters: baseFilters, limit } = buildFilterConditions(
    filters,
    { 
      tableAlias: 'g', 
      isHomeTeam,
      betType: bet_type === 'total' ? 'total' : 'spread'
    }
  )
  
  const appliedFilters = [...baseFilters]
  
  // Build team-specific conditions
  const teamConditions: string[] = [...conditions]
  
  // Filter by specific team if provided
  if (team_id) {
    // Apply location filter (home/away/any)
    if (teamLocation === 'home') {
      teamConditions.push(`g.home_team_id = ${team_id}`)
      appliedFilters.push('Home')
    } else if (teamLocation === 'away') {
      teamConditions.push(`g.away_team_id = ${team_id}`)
      appliedFilters.push('Away')
    } else {
      // 'any' - include games where team is home OR away
      teamConditions.push(`(g.home_team_id = ${team_id} OR g.away_team_id = ${team_id})`)
    }
    
    // Head-to-head: Filter by opponent if provided
    if (opponentId) {
      if (teamLocation === 'home') {
        teamConditions.push(`g.away_team_id = ${opponentId}`)
      } else if (teamLocation === 'away') {
        teamConditions.push(`g.home_team_id = ${opponentId}`)
      } else {
        // Any location vs specific opponent
        teamConditions.push(`(
          (g.home_team_id = ${team_id} AND g.away_team_id = ${opponentId}) OR
          (g.away_team_id = ${team_id} AND g.home_team_id = ${opponentId})
        )`)
      }
      appliedFilters.push('Head-to-Head')
    }
  } else {
    // No specific team - filter by side perspective
    if (side === 'home') {
      // Looking at all home teams
    } else if (side === 'away') {
      // Looking at all away teams
    }
  }
  
  // Ensure we only look at completed games with valid odds
  teamConditions.push(`(g.home_score > 0 OR g.away_score > 0)`)
  
  if (bet_type === 'spread') {
    teamConditions.push(`g.spread_close != 0`)
  } else if (bet_type === 'total') {
    teamConditions.push(`g.total_close != 0`)
  }
  
  const whereClause = teamConditions.length > 0 
    ? 'WHERE ' + teamConditions.join(' AND ')
    : ''
  
  const limitClause = limit ? `LIMIT ${limit}` : ''
  
  // Build the result columns based on bet type and side
  let hitColumn: string
  let valueColumn: string
  let lineColumn: string
  
  if (bet_type === 'spread') {
    // For spread bets
    if (team_id) {
      // Team-specific: determine if the team covered
      hitColumn = `
        CASE 
          WHEN g.home_team_id = ${team_id} THEN g.home_covered
          ELSE 1 - g.home_covered
        END`
      valueColumn = `
        CASE 
          WHEN g.home_team_id = ${team_id} THEN (g.home_score - g.away_score) + g.spread_close
          ELSE (g.away_score - g.home_score) - g.spread_close
        END`
      lineColumn = `
        CASE 
          WHEN g.home_team_id = ${team_id} THEN g.spread_close
          ELSE -g.spread_close
        END`
    } else if (side === 'home' || side === 'favorite') {
      hitColumn = 'g.home_covered'
      valueColumn = '(g.home_score - g.away_score) + g.spread_close'
      lineColumn = 'g.spread_close'
    } else {
      hitColumn = '1 - g.home_covered'
      valueColumn = '(g.away_score - g.home_score) - g.spread_close'
      lineColumn = '-g.spread_close'
    }
  } else if (bet_type === 'total') {
    // For totals
    if (side === 'over') {
      hitColumn = 'g.went_over'
      valueColumn = 'g.total_points - g.total_close'
    } else {
      hitColumn = 'g.went_under'
      valueColumn = 'g.total_close - g.total_points'
    }
    lineColumn = 'g.total_close'
    valueColumn = 'g.total_points'
  } else {
    // Moneyline
    if (team_id) {
      hitColumn = `
        CASE 
          WHEN g.home_team_id = ${team_id} THEN g.home_won
          ELSE 1 - g.home_won
        END`
    } else if (side === 'home' || side === 'favorite') {
      hitColumn = 'g.home_won'
    } else {
      hitColumn = '1 - g.home_won'
    }
    valueColumn = 'g.home_score - g.away_score'
    lineColumn = '0'
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
      ${lineColumn} as line,
      ht.name as home_team_name,
      ht.abbreviation as home_abbr,
      ht.division as home_division,
      ht.conference as home_conference,
      at.name as away_team_name,
      at.abbreviation as away_abbr,
      at.division as away_division,
      at.conference as away_conference,
      hr.rank_points_allowed_per_game as home_def_rank_points,
      hr.rank_passing_yards_allowed_per_game as home_def_rank_pass,
      hr.rank_rushing_yards_allowed_per_game as home_def_rank_rush,
      hr.rank_points_per_game as home_off_rank_points,
      hr.rank_passing_yards_per_game as home_off_rank_pass,
      hr.rank_rushing_yards_per_game as home_off_rank_rush,
      ar.rank_points_allowed_per_game as away_def_rank_points,
      ar.rank_passing_yards_allowed_per_game as away_def_rank_pass,
      ar.rank_rushing_yards_allowed_per_game as away_def_rank_rush,
      ar.rank_points_per_game as away_off_rank_points,
      ar.rank_passing_yards_per_game as away_off_rank_pass,
      ar.rank_rushing_yards_per_game as away_off_rank_rush
    FROM nfl_games g
    LEFT JOIN teams ht ON g.home_team_id = ht.espn_team_id AND ht.sport = 'nfl'
    LEFT JOIN teams at ON g.away_team_id = at.espn_team_id AND at.sport = 'nfl'
    LEFT JOIN nfl_team_rankings hr ON g.home_team_id = hr.team_id AND g.season = hr.season AND g.week = hr.week + 1
    LEFT JOIN nfl_team_rankings ar ON g.away_team_id = ar.team_id AND g.season = ar.season AND g.week = ar.week + 1
    ${whereClause}
    ORDER BY g.game_date DESC
    ${limitClause}
  `
  
  console.log('[TeamQuery] Executing:', sql.substring(0, 200) + '...')
  
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
  
  // ROI calculation
  let totalProfit = 0
  const unitSize = 100
  
  // Streak tracking
  let currentStreak = 0
  let longestHitStreak = 0
  let longestMissStreak = 0
  let tempStreak = 0
  let lastWasHit: boolean | null = null
  
  for (const row of rows) {
    const value = Number(row.value) || 0
    const line = Number(row.line) || 0
    const hitValue = Number(row.hit)
    const isPush = bet_type === 'spread' ? row.spread_push === 1 : (bet_type === 'total' ? row.total_push === 1 : false)
    const hit = hitValue === 1 && !isPush
    
    // ROI: For spreads/totals use -110, for ML use actual odds
    let odds = -110
    if (bet_type === 'moneyline') {
      // Use team's ML odds based on location
      const isSubjectHome = teamLocation !== 'away'
      odds = isSubjectHome ? (row.home_ml_close || -110) : (row.away_ml_close || -110)
    }
    
    if (hit) {
      if (odds > 0) {
        totalProfit += (odds / 100) * unitSize
      } else {
        totalProfit += (100 / Math.abs(odds)) * unitSize
      }
    } else if (!isPush) {
      totalProfit -= unitSize
    }
    
    if (bet_type === 'total') {
      totalValue += row.total_points
    } else {
      totalValue += value
    }
    
    const diff = bet_type === 'total' 
      ? (side === 'over' ? row.total_points - row.total_close : row.total_close - row.total_points)
      : value
    totalDiff += diff
    
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
    
    // Determine opponent based on team perspective
    let opponent: string
    let opponentId: number
    let gameLocation: 'home' | 'away'
    let subjectSpread: number
    
    if (team_id) {
      const isHome = row.home_team_id === team_id
      opponent = isHome ? (row.away_abbr || row.away_team_name) : (row.home_abbr || row.home_team_name)
      opponentId = isHome ? row.away_team_id : row.home_team_id
      gameLocation = isHome ? 'home' : 'away'
      // Subject team's spread: home team's spread_close, or flip if away
      subjectSpread = isHome ? row.spread_close : -row.spread_close
    } else {
      opponent = `${row.away_abbr || 'Away'} @ ${row.home_abbr || 'Home'}`
      opponentId = row.away_team_id
      gameLocation = 'home'
      subjectSpread = row.spread_close
    }
    
    games.push({
      game_id: row.game_id,
      game_date: row.game_date,
      opponent,
      opponent_id: opponentId,
      location: gameLocation,
      actual_value: bet_type === 'total' ? row.total_points : value,
      line: bet_type === 'total' ? row.total_close : Math.abs(row.spread_close),
      hit,
      differential: diff,
      spread: subjectSpread, // Subject team's spread (flipped if away)
      total: row.total_close,
      team_won: team_id 
        ? (row.home_team_id === team_id ? row.home_won === 1 : row.home_won === 0)
        : row.home_won === 1,
      home_score: row.home_score,
      away_score: row.away_score,
      // For O/U display - include both teams
      home_team_id: row.home_team_id,
      away_team_id: row.away_team_id,
      home_abbr: row.home_abbr,
      away_abbr: row.away_abbr,
      // For "Why this fits" - venue and matchup info
      venue: row.venue,
      home_division: row.home_division,
      away_division: row.away_division,
      home_conference: row.home_conference,
      away_conference: row.away_conference,
      spread_close: row.spread_close,
      // Rank data for "Why this fits"
      home_def_rank_points: row.home_def_rank_points,
      home_def_rank_pass: row.home_def_rank_pass,
      home_def_rank_rush: row.home_def_rank_rush,
      home_off_rank_points: row.home_off_rank_points,
      home_off_rank_pass: row.home_off_rank_pass,
      home_off_rank_rush: row.home_off_rank_rush,
      away_def_rank_points: row.away_def_rank_points,
      away_def_rank_pass: row.away_def_rank_pass,
      away_def_rank_rush: row.away_def_rank_rush,
      away_off_rank_points: row.away_off_rank_points,
      away_off_rank_pass: row.away_off_rank_pass,
      away_off_rank_rush: row.away_off_rank_rush
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
    // ROI calculation
    estimated_roi: totalGames > 0 ? Math.round((totalProfit / (totalGames * unitSize)) * 1000) / 10 : 0,
    total_profit: Math.round(totalProfit * 10) / 10,
    games,
    query_time_ms: Date.now() - startTime,
    filters_applied: appliedFilters
  }
}

