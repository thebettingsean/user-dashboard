import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'all'
  
  try {
    // Simple query: Get latest snapshot for each game
    const query = `
      SELECT 
        odds_api_game_id as id,
        sport,
        home_team,
        away_team,
        toString(game_time) as game_time,
        spread as current_spread,
        total as current_total,
        ml_home as current_ml_home,
        ml_away as current_ml_away,
        public_spread_home_bet_pct as public_spread_bet_pct,
        public_spread_home_money_pct as public_spread_money_pct,
        public_ml_home_bet_pct as public_ml_bet_pct,
        public_ml_home_money_pct as public_ml_money_pct,
        public_total_over_bet_pct as public_total_bet_pct,
        public_total_over_money_pct as public_total_money_pct,
        toString(snapshot_time) as last_updated
      FROM live_odds_snapshots
      WHERE (odds_api_game_id, snapshot_time) IN (
        SELECT odds_api_game_id, max(snapshot_time)
        FROM live_odds_snapshots
        WHERE snapshot_time > now() - INTERVAL 48 HOUR
        GROUP BY odds_api_game_id
      )
      ${sport !== 'all' ? `AND sport = '${sport}'` : ''}
      ORDER BY game_time ASC
      LIMIT 100
    `
    
    const result = await clickhouseQuery<any>(query)
    
    if (!result.data || result.data.length === 0) {
      return NextResponse.json({
        success: true,
        games: [],
        total: 0,
        source: 'clickhouse',
        message: 'No upcoming games found',
        updated_at: new Date().toISOString()
      })
    }
    
    // Process games - add computed fields
    const games = result.data.map((game: any) => {
      // For now, set opening = current (we'll improve this)
      const opening_spread = game.current_spread
      const spread_movement = 0 // Will calculate when we have multiple snapshots
      
      // Calculate RLM based on public betting split
      const publicOnHome = (game.public_spread_bet_pct || 50) > 55
      const publicOnAway = (game.public_spread_bet_pct || 50) < 45
      
      // Money vs Bets differential
      const moneyVsBetsDiff = Math.abs((game.public_spread_money_pct || 50) - (game.public_spread_bet_pct || 50))
      
      let rlm = '-'
      let respected = ''
      
      // Sharp money indicator (big $ vs bet discrepancy)
      if (moneyVsBetsDiff >= 10) {
        respected = 'Sharp'
        rlm = moneyVsBetsDiff >= 15 ? 'RLM' : 'Steam'
      } else if (moneyVsBetsDiff >= 5) {
        respected = 'Lean'
      }
      
      return {
        id: game.id,
        sport: game.sport,
        home_team: game.home_team,
        away_team: game.away_team,
        game_time: game.game_time,
        
        // Lines
        opening_spread,
        current_spread: game.current_spread || 0,
        spread_movement,
        opening_total: game.current_total,
        current_total: game.current_total || 0,
        total_movement: 0,
        
        // Moneylines
        current_ml_home: game.current_ml_home || 0,
        current_ml_away: game.current_ml_away || 0,
        
        // Public betting %
        public_spread_bet_pct: game.public_spread_bet_pct || 50,
        public_spread_money_pct: game.public_spread_money_pct || 50,
        public_ml_bet_pct: game.public_ml_bet_pct || 50,
        public_ml_money_pct: game.public_ml_money_pct || 50,
        public_total_bet_pct: game.public_total_bet_pct || 50,
        public_total_money_pct: game.public_total_money_pct || 50,
        
        // Indicators
        rlm,
        respected,
        money_vs_bets_diff: moneyVsBetsDiff,
        
        last_updated: game.last_updated
      }
    })
    
    return NextResponse.json({
      success: true,
      games,
      total: games.length,
      source: 'clickhouse',
      sports_breakdown: {
        nfl: games.filter((g: any) => g.sport === 'nfl').length,
        nba: games.filter((g: any) => g.sport === 'nba').length,
        nhl: games.filter((g: any) => g.sport === 'nhl').length,
        cfb: games.filter((g: any) => g.sport === 'cfb').length,
      },
      updated_at: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('[Live Odds API] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      games: [],
      total: 0,
      source: 'error'
    }, { status: 500 })
  }
}
