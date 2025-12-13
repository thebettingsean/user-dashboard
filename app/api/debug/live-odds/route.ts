import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Check what's in the snapshots table
    const countQuery = `
      SELECT 
        sport,
        count() as snapshot_count,
        count(DISTINCT odds_api_game_id) as game_count,
        min(snapshot_time) as first_snapshot,
        max(snapshot_time) as last_snapshot
      FROM live_odds_snapshots
      GROUP BY sport
      ORDER BY sport
    `
    
    const counts = await clickhouseQuery(countQuery)
    
    // Get NFL games with ScoreID and public betting
    const nflSampleQuery = `
      SELECT 
        odds_api_game_id,
        sportsdata_score_id,
        sport,
        home_team,
        away_team,
        toString(game_time) as game_time,
        toString(snapshot_time) as snapshot_time,
        spread,
        public_spread_home_bet_pct,
        public_spread_home_money_pct,
        public_ml_home_bet_pct,
        public_ml_home_money_pct,
        public_total_over_bet_pct,
        public_total_over_money_pct
      FROM live_odds_snapshots
      WHERE sport = 'nfl'
      ORDER BY snapshot_time DESC
      LIMIT 10
    `
    
    const nflSamples = await clickhouseQuery(nflSampleQuery)
    
    // Count games with non-zero public betting
    const nonZeroQuery = `
      SELECT count() as games_with_splits
      FROM live_odds_snapshots
      WHERE public_spread_home_bet_pct > 0
    `
    
    const nonZeroCount = await clickhouseQuery(nonZeroQuery)
    
    // Count games with ScoreID set
    const scoreIdQuery = `
      SELECT count() as games_with_score_id
      FROM live_odds_snapshots
      WHERE sportsdata_score_id > 0
    `
    
    const scoreIdCount = await clickhouseQuery(scoreIdQuery)
    
    return NextResponse.json({
      success: true,
      summary: counts,
      nfl_samples: nflSamples,
      games_with_public_betting: nonZeroCount,
      games_with_score_id: scoreIdCount
    })
    
  } catch (error: any) {
    console.error('Debug error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
