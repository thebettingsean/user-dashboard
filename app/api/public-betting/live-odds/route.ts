import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

interface LiveOddsGame {
  odds_api_game_id: string
  sport: string
  home_team: string
  away_team: string
  game_time: string
  
  // Opening values (first snapshot)
  opening_spread: number
  opening_total: number
  opening_ml_home: number
  opening_ml_away: number
  opening_time: string
  
  // Current values (latest snapshot)
  current_spread: number
  current_total: number
  current_ml_home: number
  current_ml_away: number
  current_time: string
  
  // Movement
  spread_movement: number
  total_movement: number
  
  // Public betting (from latest snapshot)
  public_spread_bet_pct: number
  public_spread_money_pct: number
  public_ml_bet_pct: number
  public_ml_money_pct: number
  public_total_bet_pct: number
  public_total_money_pct: number
  
  // Meta
  snapshot_count: number
  last_updated: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'all'
  
  try {
    // Query to get aggregated game data with opening/current lines
    // Games within next 7 days that have snapshots from last 24 hours
    const query = `
      SELECT 
        odds_api_game_id,
        sport,
        any(home_team) as home_team,
        any(away_team) as away_team,
        toString(any(game_time)) as game_time,
        
        -- Opening values (first snapshot)
        argMin(spread, snapshot_time) as opening_spread,
        argMin(total, snapshot_time) as opening_total,
        argMin(ml_home, snapshot_time) as opening_ml_home,
        argMin(ml_away, snapshot_time) as opening_ml_away,
        toString(min(snapshot_time)) as opening_time,
        
        -- Current values (latest snapshot)
        argMax(spread, snapshot_time) as current_spread,
        argMax(total, snapshot_time) as current_total,
        argMax(ml_home, snapshot_time) as current_ml_home,
        argMax(ml_away, snapshot_time) as current_ml_away,
        toString(max(snapshot_time)) as current_time,
        
        -- Movement (current - opening)
        argMax(spread, snapshot_time) - argMin(spread, snapshot_time) as spread_movement,
        argMax(total, snapshot_time) - argMin(total, snapshot_time) as total_movement,
        
        -- Public betting (from latest snapshot)
        argMax(public_spread_home_bet_pct, snapshot_time) as public_spread_bet_pct,
        argMax(public_spread_home_money_pct, snapshot_time) as public_spread_money_pct,
        argMax(public_ml_home_bet_pct, snapshot_time) as public_ml_bet_pct,
        argMax(public_ml_home_money_pct, snapshot_time) as public_ml_money_pct,
        argMax(public_total_over_bet_pct, snapshot_time) as public_total_bet_pct,
        argMax(public_total_over_money_pct, snapshot_time) as public_total_money_pct,
        
        -- Meta
        count() as snapshot_count,
        toString(max(snapshot_time)) as last_updated
        
      FROM live_odds_snapshots
      WHERE snapshot_time > now() - INTERVAL 24 HOUR
      ${sport !== 'all' ? `AND sport = '${sport}'` : ''}
      GROUP BY odds_api_game_id, sport
      ORDER BY any(game_time) ASC
      LIMIT 100
    `
    
    const result = await clickhouseQuery<LiveOddsGame>(query)
    
    if (!result.data || result.data.length === 0) {
      // Return mock data as fallback if no real data
      return NextResponse.json({
        success: true,
        games: [],
        total: 0,
        source: 'clickhouse',
        message: 'No upcoming games found in live_odds_snapshots',
        updated_at: new Date().toISOString()
      })
    }
    
    // Process games with additional computed fields
    const processedGames = result.data.map(game => {
      // Calculate RLM indicator
      const publicOnHome = game.public_spread_bet_pct > 55
      const publicOnAway = game.public_spread_bet_pct < 45
      const lineMovedToHome = game.spread_movement < -0.5 // Negative = home getting more points
      const lineMovedToAway = game.spread_movement > 0.5  // Positive = away getting more points
      
      let rlm = '-'
      let rlmSide = ''
      
      // RLM: Public on one side, line moves opposite
      if (publicOnHome && lineMovedToAway) {
        rlm = 'RLM'
        rlmSide = 'away'
      } else if (publicOnAway && lineMovedToHome) {
        rlm = 'RLM'
        rlmSide = 'home'
      } else if (Math.abs(game.spread_movement) >= 1) {
        rlm = 'Steam'
        rlmSide = game.spread_movement > 0 ? 'away' : 'home'
      }
      
      // Calculate "Respected" indicator (big money vs bets differential)
      const moneyVsBetsDiff = Math.abs(game.public_spread_money_pct - game.public_spread_bet_pct)
      const respected = moneyVsBetsDiff >= 10 ? 'Sharp' : moneyVsBetsDiff >= 5 ? 'Lean' : ''
      const respectedSide = game.public_spread_money_pct > game.public_spread_bet_pct ? 'home' : 'away'
      
      return {
        id: game.odds_api_game_id,
        sport: game.sport,
        home_team: game.home_team,
        away_team: game.away_team,
        game_time: game.game_time,
        
        // Spreads
        opening_spread: game.opening_spread,
        current_spread: game.current_spread,
        spread_movement: game.spread_movement,
        
        // Totals
        opening_total: game.opening_total,
        current_total: game.current_total,
        total_movement: game.total_movement,
        
        // Moneylines
        opening_ml_home: game.opening_ml_home,
        opening_ml_away: game.opening_ml_away,
        current_ml_home: game.current_ml_home,
        current_ml_away: game.current_ml_away,
        
        // Public betting (home team perspective for spread/ML)
        public_spread_bet_pct: game.public_spread_bet_pct || 50,
        public_spread_money_pct: game.public_spread_money_pct || 50,
        public_ml_bet_pct: game.public_ml_bet_pct || 50,
        public_ml_money_pct: game.public_ml_money_pct || 50,
        public_total_bet_pct: game.public_total_bet_pct || 50,
        public_total_money_pct: game.public_total_money_pct || 50,
        
        // Indicators
        rlm,
        rlm_side: rlmSide,
        respected,
        respected_side: respectedSide,
        money_vs_bets_diff: moneyVsBetsDiff,
        
        // Timing info
        opening_time: game.opening_time,
        current_time: game.current_time,
        snapshot_count: game.snapshot_count,
        last_updated: game.last_updated
      }
    })
    
    return NextResponse.json({
      success: true,
      games: processedGames,
      total: processedGames.length,
      source: 'clickhouse',
      sports_breakdown: {
        nfl: processedGames.filter(g => g.sport === 'nfl').length,
        nba: processedGames.filter(g => g.sport === 'nba').length,
        nhl: processedGames.filter(g => g.sport === 'nhl').length,
        cfb: processedGames.filter(g => g.sport === 'cfb').length,
      },
      updated_at: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('[Live Odds API] Error:', error)
    
    // Return error with details
    return NextResponse.json({
      success: false,
      error: error.message,
      games: [],
      total: 0,
      source: 'error'
    }, { status: 500 })
  }
}
