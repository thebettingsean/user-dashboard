import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Get sample game_ids from prop tables
    const propLineIds = await clickhouseQuery(`
      SELECT DISTINCT game_id
      FROM nfl_prop_lines FINAL
      LIMIT 10
    `)
    
    const propSnapshotIds = await clickhouseQuery(`
      SELECT DISTINCT game_id
      FROM nfl_prop_line_snapshots
      LIMIT 10
    `)
    
    // Get sample game_ids from nfl_games
    const gamesIds = await clickhouseQuery(`
      SELECT DISTINCT game_id
      FROM nfl_games FINAL
      WHERE season = 2024
      LIMIT 10
    `)
    
    return NextResponse.json({
      success: true,
      sample_prop_line_ids: (propLineIds.data || []).map((r: any) => r.game_id),
      sample_prop_snapshot_ids: (propSnapshotIds.data || []).map((r: any) => r.game_id),
      sample_games_ids: (gamesIds.data || []).map((r: any) => r.game_id)
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

