import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

// Helper to convert ML odds to "cents from even" for movement calculation
function mlToCents(ml: number): number {
  if (ml === 0) return 0
  if (ml > 0) return ml // Positive odds = cents above even
  return -10000 / ml // Negative odds = convert to positive equivalent
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'all'
  
  try {
    // Query universal games table with team info
    const sportFilter = sport === 'all' ? '' : `AND g.sport = '${sport}'`
    
    const query = `
      SELECT 
        g.game_id,
        g.sport,
        g.game_time,
        
        ht.name as home_team,
        ht.abbreviation as home_abbrev,
        ht.logo_url as home_logo,
        
        at.name as away_team,
        at.abbreviation as away_abbrev,
        at.logo_url as away_logo,
        
        g.spread_open as opening_spread,
        g.spread_close as current_spread,
        g.spread_close - g.spread_open as spread_movement,
        
        g.total_open as opening_total,
        g.total_close as current_total,
        g.total_close - g.total_open as total_movement,
        
        g.home_ml_open as opening_ml_home,
        g.away_ml_open as opening_ml_away,
        g.home_ml_close as current_ml_home,
        g.away_ml_close as current_ml_away,
        
        g.public_spread_home_bet_pct,
        g.public_spread_home_money_pct,
        g.public_ml_home_bet_pct,
        g.public_ml_home_money_pct,
        g.public_total_over_bet_pct,
        g.public_total_over_money_pct,
        
        g.updated_at
        
      FROM games g
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = g.sport
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = g.sport
      WHERE g.game_time > now()
        ${sportFilter}
      ORDER BY g.game_time, g.updated_at DESC
    `
    
    const result = await clickhouseQuery<{
      game_id: string
      sport: string
      game_time: string
      home_team: string
      home_abbrev: string
      home_logo: string
      away_team: string
      away_abbrev: string
      away_logo: string
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
      public_spread_home_bet_pct: number
      public_spread_home_money_pct: number
      public_ml_home_bet_pct: number
      public_ml_home_money_pct: number
      public_total_over_bet_pct: number
      public_total_over_money_pct: number
    }>(query)
    
    // Deduplicate: Keep only the latest version of each game_id
    const seenGameIds = new Set<string>()
    const deduplicatedData = (result.data || []).filter(game => {
      if (seenGameIds.has(game.game_id)) {
        return false
      }
      seenGameIds.add(game.game_id)
      return true
    })
    
    // Calculate ML movement correctly (in cents from even)
    const games = deduplicatedData.map(game => {
      const ml_home_movement = mlToCents(game.current_ml_home) - mlToCents(game.opening_ml_home)
      const ml_away_movement = mlToCents(game.current_ml_away) - mlToCents(game.opening_ml_away)
      
      return {
        id: game.game_id,
        sport: game.sport,
        home_team: game.home_team,
        away_team: game.away_team,
        home_abbrev: game.home_abbrev,
        away_abbrev: game.away_abbrev,
        home_logo: game.home_logo,
        away_logo: game.away_logo,
        game_time: game.game_time,
        
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
        public_total_over_money_pct: game.public_total_over_money_pct
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
