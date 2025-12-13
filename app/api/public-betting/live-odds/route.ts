import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Get all games from live_odds_snapshots with aggregated data
    const query = `
      SELECT 
        odds_api_game_id as id,
        any(sport) as sport,
        any(home_team) as home_team,
        any(away_team) as away_team,
        toString(any(game_time)) as game_time,
        
        -- Opening (first snapshot)
        argMin(spread, snapshot_time) as opening_spread,
        argMin(total, snapshot_time) as opening_total,
        argMin(ml_home, snapshot_time) as opening_ml_home,
        argMin(ml_away, snapshot_time) as opening_ml_away,
        
        -- Current (latest snapshot)
        argMax(spread, snapshot_time) as current_spread,
        argMax(total, snapshot_time) as current_total,
        argMax(ml_home, snapshot_time) as current_ml_home,
        argMax(ml_away, snapshot_time) as current_ml_away,
        
        -- Movement
        argMax(spread, snapshot_time) - argMin(spread, snapshot_time) as spread_movement,
        argMax(total, snapshot_time) - argMin(total, snapshot_time) as total_movement,
        
        -- Latest public betting
        argMax(public_spread_home_bet_pct, snapshot_time) as public_spread_bet_pct,
        argMax(public_spread_home_money_pct, snapshot_time) as public_spread_money_pct,
        argMax(public_ml_home_bet_pct, snapshot_time) as public_ml_bet_pct,
        argMax(public_ml_home_money_pct, snapshot_time) as public_ml_money_pct,
        argMax(public_total_over_bet_pct, snapshot_time) as public_total_bet_pct,
        argMax(public_total_over_money_pct, snapshot_time) as public_total_money_pct,
        
        -- Metadata
        count() as snapshot_count,
        toString(max(snapshot_time)) as last_updated
        
      FROM live_odds_snapshots
      GROUP BY odds_api_game_id
      HAVING max(game_time) > now()
      ORDER BY max(game_time) ASC
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

