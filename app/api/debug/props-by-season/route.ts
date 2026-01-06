import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Get prop data broken down by season
    const propsBySeason = await clickhouseQuery(`
      SELECT 
        season,
        COUNT(*) as total_lines,
        COUNT(DISTINCT game_id) as unique_games,
        COUNT(DISTINCT player_name) as unique_players,
        MIN(game_time) as first_game,
        MAX(game_time) as last_game,
        SUM(CASE WHEN espn_game_id > 0 THEN 1 ELSE 0 END) as lines_with_espn_id
      FROM nfl_prop_lines FINAL
      GROUP BY season
      ORDER BY season DESC
    `)
    
    // Get snapshot data by season too
    const snapshotsBySeason = await clickhouseQuery(`
      SELECT 
        season,
        COUNT(*) as total_snapshots,
        COUNT(DISTINCT game_id) as unique_games,
        MIN(snapshot_time) as first_snapshot,
        MAX(snapshot_time) as last_snapshot
      FROM nfl_prop_line_snapshots
      GROUP BY season
      ORDER BY season DESC
    `)
    
    return NextResponse.json({
      success: true,
      prop_lines_by_season: propsBySeason.data || [],
      prop_snapshots_by_season: snapshotsBySeason.data || []
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

