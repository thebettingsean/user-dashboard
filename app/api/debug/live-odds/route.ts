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
    
    // Get sample games
    const sampleQuery = `
      SELECT 
        odds_api_game_id,
        sport,
        home_team,
        away_team,
        toString(game_time) as game_time,
        toString(snapshot_time) as snapshot_time,
        spread,
        total,
        ml_home,
        ml_away
      FROM live_odds_snapshots
      LIMIT 5
    `
    
    const samples = await clickhouseQuery(sampleQuery)
    
    return NextResponse.json({
      success: true,
      summary: counts,
      sample_games: samples
    })
    
  } catch (error: any) {
    console.error('Debug error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

