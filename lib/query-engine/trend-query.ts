/**
 * Trend Query Handler
 * Queries league-wide betting trends (all underdogs, all home favorites, etc.)
 * Enhanced for O/U specific filters
 */

import { clickhouseQuery } from '@/lib/clickhouse'
import { buildFilterConditions } from './filter-builder'
import type { TrendQueryRequest, QueryResult, GameDetail } from './types'

// ============================================
// TREND QUERY EXECUTION
// ============================================

export async function executeTrendQuery(request: TrendQueryRequest): Promise<QueryResult> {
  const startTime = Date.now()
  const { bet_type, side, filters } = request
  
  const isOUQuery = bet_type === 'total'
  
  // Determine perspective for filter building
  const isHomePerspective = side === 'home' || side === 'favorite' || side === 'over'
  
  // Build filter conditions with O/U awareness
  const { conditions, appliedFilters, limit, requiresRankingsJoin } = buildFilterConditions(
    filters,
    { 
      tableAlias: 'g', 
      isHomeTeam: isHomePerspective,
      betType: bet_type,
      homeRankingsAlias: 'hr',
      awayRankingsAlias: 'ar'
    }
  )
  
  // Build trend-specific conditions
  const trendConditions: string[] = [...conditions]
  
  // Ensure completed games with valid odds
  trendConditions.push(`(g.home_score > 0 OR g.away_score > 0)`)
  
  if (bet_type === 'spread') {
    trendConditions.push(`g.spread_close != 0`)
  } else if (bet_type === 'total') {
    trendConditions.push(`g.total_close != 0`)
  }
  
  // Add side-specific filters
  if (side === 'favorite') {
    // No additional filter needed - spread_close < 0 means home is favorite
    // We want games where we're looking at the favorite
    trendConditions.push(`g.spread_close != 0`) // Already added above but just to be safe
  } else if (side === 'underdog') {
    // Looking at underdog performance
    trendConditions.push(`g.spread_close != 0`)
  }
  
  const whereClause = trendConditions.length > 0 
    ? 'WHERE ' + trendConditions.join(' AND ')
    : ''
  
  const limitClause = limit ? `LIMIT ${limit}` : ''
  
  // Build result columns based on bet type and side
  let hitColumn: string
  let valueColumn: string
  let lineColumn: string
  
  if (bet_type === 'spread') {
    if (side === 'favorite') {
      // Favorite covered = if home was favorite and covered, or away was favorite and covered
      hitColumn = `
        CASE 
          WHEN g.spread_close < 0 THEN g.home_covered  -- Home was favorite
          ELSE 1 - g.home_covered                       -- Away was favorite
        END`
      valueColumn = `
        CASE 
          WHEN g.spread_close < 0 THEN (g.home_score - g.away_score) + g.spread_close
          ELSE (g.away_score - g.home_score) - g.spread_close
        END`
      lineColumn = 'ABS(g.spread_close)'
    } else if (side === 'underdog') {
      // Underdog covered
      hitColumn = `
        CASE 
          WHEN g.spread_close > 0 THEN g.home_covered  -- Home was underdog
          ELSE 1 - g.home_covered                       -- Away was underdog
        END`
      valueColumn = `
        CASE 
          WHEN g.spread_close > 0 THEN (g.home_score - g.away_score) + g.spread_close
          ELSE (g.away_score - g.home_score) - g.spread_close
        END`
      lineColumn = 'ABS(g.spread_close)'
    } else if (side === 'home') {
      hitColumn = 'g.home_covered'
      valueColumn = '(g.home_score - g.away_score) + g.spread_close'
      lineColumn = 'g.spread_close'
    } else {
      // away
      hitColumn = '1 - g.home_covered'
      valueColumn = '(g.away_score - g.home_score) - g.spread_close'
      lineColumn = '-g.spread_close'
    }
  } else if (bet_type === 'total') {
    if (side === 'over') {
      hitColumn = 'g.went_over'
      valueColumn = 'g.total_points - g.total_close'
    } else {
      hitColumn = 'g.went_under'
      valueColumn = 'g.total_close - g.total_points'
    }
    lineColumn = 'g.total_close'
  } else {
    // Moneyline
    if (side === 'favorite') {
      hitColumn = `
        CASE 
          WHEN g.spread_close < 0 THEN g.home_won
          ELSE 1 - g.home_won
        END`
    } else if (side === 'underdog') {
      hitColumn = `
        CASE 
          WHEN g.spread_close > 0 THEN g.home_won
          ELSE 1 - g.home_won
        END`
    } else if (side === 'home') {
      hitColumn = 'g.home_won'
    } else {
      hitColumn = '1 - g.home_won'
    }
    valueColumn = 'g.home_score - g.away_score'
    lineColumn = '0'
  }
  
  // Build optional rankings joins for O/U queries
  const rankingsJoins = requiresRankingsJoin ? `
    LEFT JOIN nfl_team_rankings hr ON g.home_team_id = hr.team_id 
      AND g.season = hr.season 
      AND g.week = hr.week + 1
    LEFT JOIN nfl_team_rankings ar ON g.away_team_id = ar.team_id 
      AND g.season = ar.season 
      AND g.week = ar.week + 1
  ` : ''
  
  // Add ranking columns if joins are present
  const rankingColumns = requiresRankingsJoin ? `,
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
      ar.rank_rushing_yards_per_game as away_off_rank_rush` : ''
  
  const sql = `
    SELECT 
      g.game_id,
      toString(g.game_date) as game_date,
      toString(g.game_time) as game_time,
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
      -- Public betting columns
      g.public_ml_home_bet_pct,
      g.public_ml_home_money_pct,
      g.public_spread_home_bet_pct,
      g.public_spread_home_money_pct,
      g.public_total_over_bet_pct,
      g.public_total_over_money_pct,
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
      at.conference as away_conference
      ${rankingColumns}
    FROM nfl_games g
    LEFT JOIN teams ht ON g.home_team_id = ht.espn_team_id AND ht.sport = 'nfl'
    LEFT JOIN teams at ON g.away_team_id = at.espn_team_id AND at.sport = 'nfl'
    ${rankingsJoins}
    ${whereClause}
    ORDER BY g.game_date DESC
    ${limitClause}
  `
  
  console.log('[TrendQuery] Executing:', sql.substring(0, 200) + '...')
  
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
    const hitValue = Number(row.hit)
    const isPush = bet_type === 'spread' ? row.spread_push === 1 : (bet_type === 'total' ? row.total_push === 1 : false)
    const hit = hitValue === 1 && !isPush
    
    // ROI: For spreads/totals use -110, for ML use actual odds
    let odds = -110 // Default for spreads/totals
    if (bet_type === 'moneyline') {
      // Use home or away ML based on side
      if (side === 'home' || side === 'favorite') {
        odds = row.home_ml_close || -110
        if (side === 'favorite' && row.spread_close > 0) odds = row.away_ml_close || -110 // Away is fav
      } else {
        odds = row.away_ml_close || -110
        if (side === 'underdog' && row.spread_close > 0) odds = row.home_ml_close || -110 // Home is dog
      }
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
    
    totalValue += bet_type === 'total' ? row.total_points : Math.abs(value)
    
    const diff = value
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
    
    // Calculate public betting percentages based on bet_type and side
    let publicBetPct: number | undefined
    let publicMoneyPct: number | undefined
    
    if (bet_type === 'total') {
      // For O/U, over% is stored directly
      if (side === 'over') {
        publicBetPct = row.public_total_over_bet_pct || undefined
        publicMoneyPct = row.public_total_over_money_pct || undefined
      } else {
        // Under = 100 - over
        publicBetPct = row.public_total_over_bet_pct ? (100 - row.public_total_over_bet_pct) : undefined
        publicMoneyPct = row.public_total_over_money_pct ? (100 - row.public_total_over_money_pct) : undefined
      }
    } else if (bet_type === 'spread') {
      const homeIsFav = row.spread_close < 0
      // Home spread % is stored
      if (side === 'home' || (side === 'favorite' && homeIsFav) || (side === 'underdog' && !homeIsFav)) {
        publicBetPct = row.public_spread_home_bet_pct || undefined
        publicMoneyPct = row.public_spread_home_money_pct || undefined
      } else {
        // Away = 100 - home
        publicBetPct = row.public_spread_home_bet_pct ? (100 - row.public_spread_home_bet_pct) : undefined
        publicMoneyPct = row.public_spread_home_money_pct ? (100 - row.public_spread_home_money_pct) : undefined
      }
    } else {
      // Moneyline
      const homeIsFav = row.spread_close < 0
      if (side === 'home' || (side === 'favorite' && homeIsFav) || (side === 'underdog' && !homeIsFav)) {
        publicBetPct = row.public_ml_home_bet_pct || undefined
        publicMoneyPct = row.public_ml_home_money_pct || undefined
      } else {
        publicBetPct = row.public_ml_home_bet_pct ? (100 - row.public_ml_home_bet_pct) : undefined
        publicMoneyPct = row.public_ml_home_money_pct ? (100 - row.public_ml_home_money_pct) : undefined
      }
    }
    
    const publicDiffPct = (publicMoneyPct !== undefined && publicBetPct !== undefined) 
      ? Math.round((publicMoneyPct - publicBetPct) * 10) / 10 
      : undefined
    
    // Determine which team was the "subject" based on side
    let subjectTeam: string
    let opponentTeam: string
    let subjectSpread: number
    let subjectOpponentId: number
    
    if (side === 'favorite') {
      const homeIsFav = row.spread_close < 0
      subjectTeam = homeIsFav ? (row.home_abbr || 'Home') : (row.away_abbr || 'Away')
      opponentTeam = homeIsFav ? (row.away_abbr || 'Away') : (row.home_abbr || 'Home')
      subjectSpread = homeIsFav ? row.spread_close : -row.spread_close // Always negative for fav
      subjectOpponentId = homeIsFav ? row.away_team_id : row.home_team_id
    } else if (side === 'underdog') {
      const homeIsDog = row.spread_close > 0
      subjectTeam = homeIsDog ? (row.home_abbr || 'Home') : (row.away_abbr || 'Away')
      opponentTeam = homeIsDog ? (row.away_abbr || 'Away') : (row.home_abbr || 'Home')
      subjectSpread = homeIsDog ? row.spread_close : -row.spread_close // Always positive for dog
      subjectOpponentId = homeIsDog ? row.away_team_id : row.home_team_id
    } else if (side === 'home') {
      subjectTeam = row.home_abbr || 'Home'
      opponentTeam = row.away_abbr || 'Away'
      subjectSpread = row.spread_close
      subjectOpponentId = row.away_team_id
    } else {
      // away
      subjectTeam = row.away_abbr || 'Away'
      opponentTeam = row.home_abbr || 'Home'
      subjectSpread = -row.spread_close // Flip for away perspective
      subjectOpponentId = row.home_team_id
    }
    
    games.push({
      game_id: row.game_id,
      game_date: row.game_date,
      game_time: row.game_time,
      opponent: `${subjectTeam} vs ${opponentTeam}`,
      opponent_id: subjectOpponentId,
      location: side === 'home' ? 'home' : side === 'away' ? 'away' : 'neutral',
      actual_value: bet_type === 'total' ? row.total_points : value,
      line: bet_type === 'total' ? row.total_close : Math.abs(row.spread_close),
      hit,
      differential: diff,
      spread: subjectSpread, // Now from the subject team's perspective
      total: row.total_close,
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
      away_off_rank_rush: row.away_off_rank_rush,
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
  
  // Update longest streaks
  if (tempStreak > 0 && tempStreak > longestHitStreak) longestHitStreak = tempStreak
  if (tempStreak < 0 && Math.abs(tempStreak) > longestMissStreak) longestMissStreak = Math.abs(tempStreak)
  
  // Add trend description to applied filters
  let trendDescription = ''
  if (bet_type === 'spread') {
    trendDescription = side === 'favorite' ? 'Favorites covering' 
      : side === 'underdog' ? 'Underdogs covering'
      : side === 'home' ? 'Home teams covering'
      : 'Away teams covering'
  } else if (bet_type === 'total') {
    trendDescription = side === 'over' ? 'Games going over' : 'Games going under'
  } else {
    trendDescription = side === 'favorite' ? 'Favorites winning SU'
      : side === 'underdog' ? 'Underdogs winning SU'
      : side === 'home' ? 'Home teams winning SU'
      : 'Away teams winning SU'
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
    // ROI calculation
    estimated_roi: totalGames > 0 ? Math.round((totalProfit / (totalGames * unitSize)) * 1000) / 10 : 0,
    total_profit: Math.round(totalProfit * 10) / 10,
    games,
    query_time_ms: Date.now() - startTime,
    filters_applied: [trendDescription, ...appliedFilters]
  }
}

