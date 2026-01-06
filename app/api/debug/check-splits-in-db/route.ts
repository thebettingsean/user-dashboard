import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

/**
 * Check if splits data EXISTS in the database but isn't showing on frontend
 */
export async function GET() {
  try {
    // Check NBA games - get EVERYTHING
    const nbaGames = await clickhouseQuery(`
      SELECT 
        game_id,
        game_time,
        updated_at,
        public_spread_home_bet_pct,
        public_spread_home_money_pct,
        public_ml_home_bet_pct,
        public_ml_home_money_pct,
        public_total_over_bet_pct,
        public_total_over_money_pct
      FROM games FINAL
      WHERE sport = 'nba'
        AND game_time >= now()
        AND game_time <= now() + INTERVAL 2 DAY
      ORDER BY updated_at DESC
      LIMIT 10
    `)
    
    // Check if maybe the data is in live_odds_snapshots but not games
    const nbaSnapshots = await clickhouseQuery(`
      SELECT 
        odds_api_game_id,
        snapshot_time,
        public_spread_home_bet_pct,
        public_ml_home_bet_pct,
        public_total_over_bet_pct
      FROM live_odds_snapshots
      WHERE odds_api_game_id LIKE 'nba_%'
        OR odds_api_game_id IN (
          SELECT substring(game_id, position(game_id, '_') + 1) 
          FROM games WHERE sport = 'nba'
        )
      ORDER BY snapshot_time DESC
      LIMIT 10
    `)
    
    return NextResponse.json({
      success: true,
      nba_games_in_db: nbaGames.data || [],
      nba_snapshots: nbaSnapshots.data || [],
      note: "If games have 50% splits but snapshots have real data, there's a sync issue"
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

