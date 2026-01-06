import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Check date range of existing prop data by joining with games
    const propLinesRange = await clickhouseQuery(`
      SELECT 
        MIN(g.game_date) as first_game,
        MAX(g.game_date) as last_game,
        COUNT(*) as total_lines,
        COUNT(DISTINCT p.game_id) as unique_games,
        COUNT(DISTINCT p.player_name) as unique_players,
        groupUniqArray(toString(g.season)) as seasons
      FROM nfl_prop_lines p FINAL
      INNER JOIN nfl_games g FINAL ON toString(g.game_id) = p.game_id
    `)
    
    const propSnapshotsRange = await clickhouseQuery(`
      SELECT 
        MIN(g.game_date) as first_game,
        MAX(g.game_date) as last_game,
        COUNT(*) as total_snapshots,
        COUNT(DISTINCT s.game_id) as unique_games,
        groupUniqArray(toString(g.season)) as seasons
      FROM nfl_prop_line_snapshots s
      INNER JOIN nfl_games g FINAL ON toString(g.game_id) = s.game_id
    `)
    
    // Get prop data by season
    const propsBySeason = await clickhouseQuery(`
      SELECT 
        g.season,
        COUNT(*) as total_lines,
        COUNT(DISTINCT p.game_id) as games_with_props,
        COUNT(DISTINCT p.player_name) as unique_players
      FROM nfl_prop_lines p FINAL
      INNER JOIN nfl_games g FINAL ON toString(g.game_id) = p.game_id
      GROUP BY g.season
      ORDER BY g.season DESC
    `)
    
    return NextResponse.json({
      success: true,
      prop_lines_range: propLinesRange.data?.[0] || null,
      prop_snapshots_range: propSnapshotsRange.data?.[0] || null,
      by_season: propsBySeason.data || []
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

