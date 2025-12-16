import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Get game_ids from games table
    const gamesQuery = `SELECT game_id, odds_api_game_id FROM games WHERE sport = 'nfl' LIMIT 5`
    const gamesResult = await clickhouseQuery<{ game_id: string; odds_api_game_id: string }>(gamesQuery)
    
    // Get odds_api_game_ids from live_odds_snapshots
    const snapshotsQuery = `
      SELECT DISTINCT odds_api_game_id, home_team, away_team, public_spread_home_bet_pct 
      FROM live_odds_snapshots 
      WHERE sport = 'nfl' 
      AND snapshot_time > now() - INTERVAL 1 HOUR
      LIMIT 10
    `
    const snapshotsResult = await clickhouseQuery<{ 
      odds_api_game_id: string
      home_team: string
      away_team: string
      public_spread_home_bet_pct: number
    }>(snapshotsQuery)
    
    return NextResponse.json({
      gamesTable: gamesResult.data || [],
      liveOddsSnapshots: snapshotsResult.data || [],
      note: 'Check if odds_api_game_id from snapshots matches game_id pattern in games table'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

