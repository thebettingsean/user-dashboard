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
        game_id,
        sport,
        game_time,
        home_team,
        home_abbrev,
        home_logo,
        away_team,
        away_abbrev,
        away_logo,
        opening_spread,
        current_spread,
        spread_movement,
        opening_total,
        current_total,
        total_movement,
        opening_ml_home,
        opening_ml_away,
        current_ml_home,
        current_ml_away,
        public_spread_home_bet_pct,
        public_spread_home_money_pct,
        public_ml_home_bet_pct,
        public_ml_home_money_pct,
        public_total_over_bet_pct,
        public_total_over_money_pct
      FROM (
        SELECT 
          g.game_id,
          g.sport as sport,
          g.game_time,
          
          any(ht.name) as home_team,
          any(ht.abbreviation) as home_abbrev,
          any(ht.logo_url) as home_logo,
          
          any(at.name) as away_team,
          any(at.abbreviation) as away_abbrev,
          any(at.logo_url) as away_logo,
          
          argMax(g.spread_open, g.updated_at) as opening_spread,
          argMax(g.spread_close, g.updated_at) as current_spread,
          argMax(g.spread_close, g.updated_at) - argMax(g.spread_open, g.updated_at) as spread_movement,
          
          argMax(g.total_open, g.updated_at) as opening_total,
          argMax(g.total_close, g.updated_at) as current_total,
          argMax(g.total_close, g.updated_at) - argMax(g.total_open, g.updated_at) as total_movement,
          
          argMax(g.home_ml_open, g.updated_at) as opening_ml_home,
          argMax(g.away_ml_open, g.updated_at) as opening_ml_away,
          argMax(g.home_ml_close, g.updated_at) as current_ml_home,
          argMax(g.away_ml_close, g.updated_at) as current_ml_away,
          
          argMax(g.public_spread_home_bet_pct, g.updated_at) as public_spread_home_bet_pct,
          argMax(g.public_spread_home_money_pct, g.updated_at) as public_spread_home_money_pct,
          argMax(g.public_ml_home_bet_pct, g.updated_at) as public_ml_home_bet_pct,
          argMax(g.public_ml_home_money_pct, g.updated_at) as public_ml_home_money_pct,
          argMax(g.public_total_over_bet_pct, g.updated_at) as public_total_over_bet_pct,
          argMax(g.public_total_over_money_pct, g.updated_at) as public_total_over_money_pct
          
        FROM games g
        LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = g.sport
        LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = g.sport
        WHERE g.game_time > now()
          ${sportFilter}
        GROUP BY g.game_id, g.sport, g.game_time
      )
      ORDER BY game_time
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
    
    // Calculate ML movement correctly (in cents from even)
    const games = (result.data || []).map(game => {
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
