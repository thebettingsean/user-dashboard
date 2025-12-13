import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Get all upcoming games from live_odds_snapshots
    const query = `
      WITH upcoming_games AS (
        SELECT DISTINCT odds_api_game_id
        FROM live_odds_snapshots
        WHERE game_time > now()
      )
      SELECT 
        s.odds_api_game_id as id,
        any(s.sport) as sport,
        any(s.home_team) as home_team,
        any(s.away_team) as away_team,
        toString(any(s.game_time)) as game_time,
        
        argMin(s.spread, s.snapshot_time) as opening_spread,
        argMin(s.total, s.snapshot_time) as opening_total,
        argMin(s.ml_home, s.snapshot_time) as opening_ml_home,
        argMin(s.ml_away, s.snapshot_time) as opening_ml_away,
        
        argMax(s.spread, s.snapshot_time) as current_spread,
        argMax(s.total, s.snapshot_time) as current_total,
        argMax(s.ml_home, s.snapshot_time) as current_ml_home,
        argMax(s.ml_away, s.snapshot_time) as current_ml_away,
        
        argMax(s.spread, s.snapshot_time) - argMin(s.spread, s.snapshot_time) as spread_movement,
        argMax(s.total, s.snapshot_time) - argMin(s.total, s.snapshot_time) as total_movement,
        
        argMax(s.public_spread_home_bet_pct, s.snapshot_time) as public_spread_bet_pct,
        argMax(s.public_spread_home_money_pct, s.snapshot_time) as public_spread_money_pct,
        argMax(s.public_ml_home_bet_pct, s.snapshot_time) as public_ml_bet_pct,
        argMax(s.public_ml_home_money_pct, s.snapshot_time) as public_ml_money_pct,
        argMax(s.public_total_over_bet_pct, s.snapshot_time) as public_total_bet_pct,
        argMax(s.public_total_over_money_pct, s.snapshot_time) as public_total_money_pct,
        
        count() as snapshot_count,
        toString(max(s.snapshot_time)) as last_updated
        
      FROM live_odds_snapshots s
      INNER JOIN upcoming_games u ON s.odds_api_game_id = u.odds_api_game_id
      GROUP BY s.odds_api_game_id
      ORDER BY any(s.game_time) ASC
    `
    
    const result = await clickhouseQuery(query)
    const games = result.data || []
    
    return NextResponse.json({
      success: true,
      games,
      total: games.length,
      updated_at: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Error fetching live odds:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      games: []
    }, { status: 500 })
  }
}

