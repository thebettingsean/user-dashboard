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
        at.secondary_color as away_secondary_color
        
      FROM games g
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
      ORDER BY g.updated_at DESC
      LIMIT 1 BY g.game_id
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
      public_spread_home_bet_pct: number | null
      public_spread_home_money_pct: number | null
      public_ml_home_bet_pct: number | null
      public_ml_home_money_pct: number | null
      public_total_over_bet_pct: number | null
      public_total_over_money_pct: number | null
      updated_at: string
    }>(gamesQuery)

    // Deduplication is now handled in SQL with LIMIT 1 BY game_id
    // Each game_id appears only once with the most recently updated record
    const deduplicatedData = (gamesResult.data || []).map(row => {
      const hasSplits = (
        row.public_spread_home_bet_pct !== null ||
        row.public_spread_home_money_pct !== null ||
        row.public_ml_home_bet_pct !== null ||
        row.public_total_over_bet_pct !== null
      )
      return { ...row, has_real_splits: hasSplits }
    })
    
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
        
        public_spread_bet_pct: game.public_spread_home_bet_pct,
        public_spread_money_pct: game.public_spread_home_money_pct,
        public_ml_bet_pct: game.public_ml_home_bet_pct,
        public_ml_money_pct: game.public_ml_home_money_pct,
        public_total_over_bet_pct: game.public_total_over_bet_pct,
        public_total_over_money_pct: game.public_total_over_money_pct,
        
        has_splits: game.has_real_splits
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
