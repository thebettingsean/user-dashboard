import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    //1. Get all upcoming game IDs
    const upcomingGames = await clickhouseQuery(`
      SELECT DISTINCT 
        game_id,
        home_team_abbr,
        away_team_abbr,
        game_time
      FROM nfl_upcoming_games
      WHERE game_time > now()
      ORDER BY game_time
    `)
    
    // 2. Get all prop game IDs (recent snapshots)
    const propGames = await clickhouseQuery(`
      SELECT DISTINCT 
        game_id,
        snapshot_time
      FROM nfl_prop_line_snapshots
      WHERE snapshot_time > now() - INTERVAL 48 HOUR
      ORDER BY snapshot_time DESC
      LIMIT 20
    `)
    
    // 3. Check overlap
    const upcomingGameIds = new Set(upcomingGames.data?.map((g: any) => g.game_id) || [])
    const propGameIds = new Set(propGames.data?.map((g: any) => g.game_id) || [])
    
    const overlap = [...upcomingGameIds].filter(id => propGameIds.has(id))
    const propsOnly = [...propGameIds].filter(id => !upcomingGameIds.has(id))
    const upcomingOnly = [...upcomingGameIds].filter(id => !propGameIds.has(id))
    
    return NextResponse.json({
      success: true,
      upcoming_games: upcomingGames.data || [],
      prop_games: propGames.data || [],
      analysis: {
        total_upcoming_games: upcomingGameIds.size,
        total_prop_games: propGameIds.size,
        overlap_count: overlap.length,
        overlapping_game_ids: overlap,
        props_only_count: propsOnly.length,
        props_only_game_ids: propsOnly,
        upcoming_only_count: upcomingOnly.length,
        upcoming_only_game_ids: upcomingOnly
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

