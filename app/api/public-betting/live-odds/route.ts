import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

// Helper to convert ML odds to "cents from even" for movement calculation
function mlToCents(ml: number): number {
  if (ml === 0) return 0
  if (ml > 0) return ml // Positive odds = cents above even
  return -10000 / ml // Negative odds = convert to positive equivalent
}

// Map frontend sport names to ClickHouse database sport names for teams table
const DB_SPORT_MAP: Record<string, string> = {
  nfl: 'nfl',
  nba: 'nba',
  cfb: 'cfb',
  cbb: 'ncaab', // Teams are stored as 'ncaab', games as 'cbb'
  nhl: 'nhl',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'all'
  
  // For games table, we query both 'cbb' and 'ncaab' for college basketball
  const gamesSportFilter = sport === 'all' 
    ? '' 
    : sport.toLowerCase() === 'cbb' 
      ? `AND g.sport IN ('cbb', 'ncaab')` 
      : `AND g.sport = '${sport.toLowerCase()}'`
  
  // For teams table, use the mapped sport name
  const teamsSport = DB_SPORT_MAP[sport.toLowerCase()] || sport.toLowerCase()
  
  try {
    // Step 1: Fetch games WITH team data via JOIN (games table only has team IDs)
    // Join with game_first_seen to get true opening lines (matches what timeline shows)
    const gamesQuery = `
      SELECT 
        g.game_id,
        g.sport,
        g.game_time,
        g.home_team_id,
        g.away_team_id,
        ht.name as home_team_name,
        at.name as away_team_name,
        
        -- Use true opening from game_first_seen (matches timeline), fallback to games table
        COALESCE(gfs.opening_spread, g.spread_open) as opening_spread,
        g.spread_close as current_spread,
        g.spread_close - COALESCE(gfs.opening_spread, g.spread_open) as spread_movement,
        
        COALESCE(gfs.opening_total, g.total_open) as opening_total,
        g.total_close as current_total,
        g.total_close - COALESCE(gfs.opening_total, g.total_open) as total_movement,
        
        COALESCE(gfs.opening_ml_home, g.home_ml_open) as opening_ml_home,
        COALESCE(gfs.opening_ml_away, g.away_ml_open) as opening_ml_away,
        g.home_ml_close as current_ml_home,
        g.away_ml_close as current_ml_away,
        
        -- Juice/odds for spreads and totals
        g.home_spread_juice,
        g.away_spread_juice,
        g.over_juice,
        g.under_juice,
        
        g.public_spread_home_bet_pct,
        g.public_spread_home_money_pct,
        g.public_ml_home_bet_pct,
        g.public_ml_home_money_pct,
        g.public_total_over_bet_pct,
        g.public_total_over_money_pct,
        
        g.updated_at,
        
        -- Return EST date directly so frontend doesn't need timezone conversion
        formatDateTime(toTimeZone(g.game_time, 'America/New_York'), '%Y-%m-%d') as est_date,
        formatDateTime(toTimeZone(g.game_time, 'America/New_York'), '%H:%i') as est_time,
        
        ht.logo_url as home_logo,
        at.logo_url as away_logo,
        ht.abbreviation as home_abbrev,
        at.abbreviation as away_abbrev,
        ht.primary_color as home_primary_color,
        at.primary_color as away_primary_color,
        ht.secondary_color as home_secondary_color,
        at.secondary_color as away_secondary_color,
        
        -- Signal columns
        g.spread_home_public_respect,
        g.spread_home_vegas_backed,
        g.spread_home_whale_respect,
        g.spread_away_public_respect,
        g.spread_away_vegas_backed,
        g.spread_away_whale_respect,
        g.total_over_public_respect,
        g.total_over_vegas_backed,
        g.total_over_whale_respect,
        g.total_under_public_respect,
        g.total_under_vegas_backed,
        g.total_under_whale_respect,
        g.ml_home_public_respect,
        g.ml_home_vegas_backed,
        g.ml_home_whale_respect,
        g.ml_away_public_respect,
        g.ml_away_vegas_backed,
        g.ml_away_whale_respect
        
      FROM games g FINAL
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND (
        (g.sport IN ('cbb', 'ncaab') AND ht.sport IN ('cbb', 'ncaab')) OR
        (g.sport NOT IN ('cbb', 'ncaab') AND ht.sport = g.sport)
      )
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND (
        (g.sport IN ('cbb', 'ncaab') AND at.sport IN ('cbb', 'ncaab')) OR
        (g.sport NOT IN ('cbb', 'ncaab') AND at.sport = g.sport)
      )
      LEFT JOIN game_first_seen gfs ON gfs.odds_api_game_id = substring(g.game_id, position(g.game_id, '_') + 1)
      WHERE toDate(toTimeZone(g.game_time, 'America/New_York')) >= toDate(toTimeZone(now(), 'America/New_York'))
        ${gamesSportFilter}
      ORDER BY g.game_time ASC, g.updated_at DESC
    `
    
    const gamesResult = await clickhouseQuery<{
      game_id: string
      sport: string
      game_time: string
      home_team_id: number
      away_team_id: number
      home_team_name: string | null
      away_team_name: string | null
      home_logo: string | null
      away_logo: string | null
      home_abbrev: string | null
      away_abbrev: string | null
      home_primary_color: string | null
      away_primary_color: string | null
      home_secondary_color: string | null
      away_secondary_color: string | null
      est_date: string
      est_time: string
      opening_spread: number
      current_spread: number
      spread_movement: number
      opening_total: number
      current_total: number
      total_movement: number
      opening_ml_home: number
      opening_ml_away: number
      current_ml_home: number
      current_ml_away: number
      home_spread_juice: number
      away_spread_juice: number
      over_juice: number
      under_juice: number
      public_spread_home_bet_pct: number | null
      public_spread_home_money_pct: number | null
      public_ml_home_bet_pct: number | null
      public_ml_home_money_pct: number | null
      public_total_over_bet_pct: number | null
      public_total_over_money_pct: number | null
      updated_at: string
      // Signal columns
      spread_home_public_respect: number
      spread_home_vegas_backed: number
      spread_home_whale_respect: number
      spread_away_public_respect: number
      spread_away_vegas_backed: number
      spread_away_whale_respect: number
      total_over_public_respect: number
      total_over_vegas_backed: number
      total_over_whale_respect: number
      total_under_public_respect: number
      total_under_vegas_backed: number
      total_under_whale_respect: number
      ml_home_public_respect: number
      ml_home_vegas_backed: number
      ml_home_whale_respect: number
      ml_away_public_respect: number
      ml_away_vegas_backed: number
      ml_away_whale_respect: number
    }>(gamesQuery)

    // Smart Deduplication: Get the latest game_time but preserve the BEST splits
    // Key insight: ALWAYS keep the split value that's furthest from 50 (most interesting)
    const gameMap = new Map<string, any>()
    
    // Helper: pick the value furthest from 50
    const pickBestSplit = (a: number | null, b: number | null): number => {
      const aVal = a ?? 50
      const bVal = b ?? 50
      const aDist = Math.abs(aVal - 50)
      const bDist = Math.abs(bVal - 50)
      return aDist >= bDist ? aVal : bVal
    }
    
    for (const row of gamesResult.data || []) {
      const existing = gameMap.get(row.game_id)
      
      // Check if this row has interesting splits (not null and not exactly 50/50)
      const hasInterestingSplits = (
        (row.public_spread_home_bet_pct !== null && row.public_spread_home_bet_pct !== 50) ||
        (row.public_spread_home_money_pct !== null && row.public_spread_home_money_pct !== 50) ||
        (row.public_ml_home_bet_pct !== null && row.public_ml_home_bet_pct !== 50) ||
        (row.public_total_over_bet_pct !== null && row.public_total_over_bet_pct !== 50)
      )
      
      const hasSplits = (
        row.public_spread_home_bet_pct !== null ||
        row.public_spread_home_money_pct !== null ||
        row.public_ml_home_bet_pct !== null ||
        row.public_total_over_bet_pct !== null
      )

      if (!existing) {
        gameMap.set(row.game_id, { 
          ...row, 
          has_real_splits: hasSplits,
          has_interesting_splits: hasInterestingSplits
        })
      } else {
        // Compare updated_at to determine which record is newer
        const existingTime = existing.updated_at ? new Date(existing.updated_at.replace(' ', 'T') + 'Z').getTime() : 0
        const rowTime = row.updated_at ? new Date(row.updated_at.replace(' ', 'T') + 'Z').getTime() : 0
        const rowIsNewer = rowTime > existingTime
        
        // For each split field, pick the value furthest from 50% (most interesting)
        const updated = {
          // Take base fields from the NEWER record (more accurate game_time, odds, etc.)
          ...(rowIsNewer ? row : existing),
          // For EACH split, pick the most interesting value (furthest from 50)
          public_spread_home_bet_pct: pickBestSplit(row.public_spread_home_bet_pct, existing.public_spread_home_bet_pct),
          public_spread_home_money_pct: pickBestSplit(row.public_spread_home_money_pct, existing.public_spread_home_money_pct),
          public_ml_home_bet_pct: pickBestSplit(row.public_ml_home_bet_pct, existing.public_ml_home_bet_pct),
          public_ml_home_money_pct: pickBestSplit(row.public_ml_home_money_pct, existing.public_ml_home_money_pct),
          public_total_over_bet_pct: pickBestSplit(row.public_total_over_bet_pct, existing.public_total_over_bet_pct),
          public_total_over_money_pct: pickBestSplit(row.public_total_over_money_pct, existing.public_total_over_money_pct),
          has_real_splits: existing.has_real_splits || hasSplits,
          has_interesting_splits: existing.has_interesting_splits || hasInterestingSplits
        }
        gameMap.set(row.game_id, updated)
      }
    }
    
    // Convert to array and sort by EST date, then EST time within each date
    const deduplicatedData = Array.from(gameMap.values()).sort((a, b) => {
      // First sort by EST date
      if (a.est_date !== b.est_date) {
        return a.est_date.localeCompare(b.est_date)
      }
      // Then sort by EST time (HH:MM format sorts correctly as string)
      return a.est_time.localeCompare(b.est_time)
    })
    
    // DEBUG: Log what we're returning
    console.log(`[live-odds] Sport: ${sport}, Total rows from DB: ${gamesResult.data?.length || 0}, After dedup: ${deduplicatedData.length}`)
    
    // Log first 3 games with splits info
    for (const game of deduplicatedData.slice(0, 3)) {
      console.log(`[live-odds] Game ${game.game_id}: spread_bet=${game.public_spread_home_bet_pct} (type: ${typeof game.public_spread_home_bet_pct}), ml_bet=${game.public_ml_home_bet_pct}, total_bet=${game.public_total_over_bet_pct}, has_interesting=${game.has_interesting_splits}`)
    }
    
    // Build final games array - team info comes directly from the JOIN
    const games = deduplicatedData.map(game => {
      const ml_home_movement = mlToCents(game.current_ml_home) - mlToCents(game.opening_ml_home)
      const ml_away_movement = mlToCents(game.current_ml_away) - mlToCents(game.opening_ml_away)
      
      return {
        id: game.game_id,
        sport: game.sport,
        home_team: game.home_team_name || `Team ${game.home_team_id}`,
        away_team: game.away_team_name || `Team ${game.away_team_id}`,
        home_abbrev: game.home_abbrev || 'UNK',
        away_abbrev: game.away_abbrev || 'UNK',
        home_logo: game.home_logo || '',
        away_logo: game.away_logo || '',
        home_primary_color: game.home_primary_color || '',
        away_primary_color: game.away_primary_color || '',
        home_secondary_color: game.home_secondary_color || '',
        away_secondary_color: game.away_secondary_color || '',
        game_time: game.game_time,
        est_date: game.est_date,
        est_time: game.est_time,
        
        opening_spread: game.opening_spread,
        current_spread: game.current_spread,
        spread_movement: game.spread_movement,
        
        opening_total: game.opening_total,
        current_total: game.current_total,
        total_movement: game.total_movement,
        
        opening_ml_home: game.opening_ml_home,
        opening_ml_away: game.opening_ml_away,
        current_ml_home: game.current_ml_home,
        current_ml_away: game.current_ml_away,
        ml_home_movement,
        ml_away_movement,
        
        // Juice/odds for spreads and totals
        home_spread_juice: game.home_spread_juice || -110,
        away_spread_juice: game.away_spread_juice || -110,
        over_juice: game.over_juice || -110,
        under_juice: game.under_juice || -110,
        
        public_spread_bet_pct: game.public_spread_home_bet_pct,
        public_spread_money_pct: game.public_spread_home_money_pct,
        public_ml_bet_pct: game.public_ml_home_bet_pct,
        public_ml_money_pct: game.public_ml_home_money_pct,
        public_total_over_bet_pct: game.public_total_over_bet_pct,
        public_total_over_money_pct: game.public_total_over_money_pct,
        
        has_splits: game.has_real_splits,
        
        // Signals
        signals: {
          spread: {
            home: {
              publicRespect: game.spread_home_public_respect || 0,
              vegasBacked: game.spread_home_vegas_backed || 0,
              whaleRespect: game.spread_home_whale_respect || 0,
            },
            away: {
              publicRespect: game.spread_away_public_respect || 0,
              vegasBacked: game.spread_away_vegas_backed || 0,
              whaleRespect: game.spread_away_whale_respect || 0,
            },
          },
          total: {
            over: {
              publicRespect: game.total_over_public_respect || 0,
              vegasBacked: game.total_over_vegas_backed || 0,
              whaleRespect: game.total_over_whale_respect || 0,
            },
            under: {
              publicRespect: game.total_under_public_respect || 0,
              vegasBacked: game.total_under_vegas_backed || 0,
              whaleRespect: game.total_under_whale_respect || 0,
            },
          },
          ml: {
            home: {
              publicRespect: game.ml_home_public_respect || 0,
              vegasBacked: game.ml_home_vegas_backed || 0,
              whaleRespect: game.ml_home_whale_respect || 0,
            },
            away: {
              publicRespect: game.ml_away_public_respect || 0,
              vegasBacked: game.ml_away_vegas_backed || 0,
              whaleRespect: game.ml_away_whale_respect || 0,
            },
          },
        },
      }
    })
    
    return NextResponse.json({
      success: true,
      games,
      total: games.length,
      source: 'universal_games_table'
    })
    
  } catch (error: any) {
    console.error('[Live Odds] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      games: []
    }, { status: 500 })
  }
}
