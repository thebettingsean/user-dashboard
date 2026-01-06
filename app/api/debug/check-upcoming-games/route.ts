import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Check what game_id format nfl_upcoming_games uses
    const upcomingGamesIds = await clickhouseQuery(`
      SELECT game_id, season, game_time
      FROM nfl_upcoming_games FINAL
      ORDER BY game_time DESC
      LIMIT 10
    `)
    
    // Check if there's ANY 2023 data in nfl_upcoming_games
    const upcoming2023Count = await clickhouseQuery(`
      SELECT COUNT(*) as count
      FROM nfl_upcoming_games FINAL
      WHERE season = 2023
    `)
    
    // Check if there's 2024 data
    const upcoming2024Count = await clickhouseQuery(`
      SELECT COUNT(*) as count
      FROM nfl_upcoming_games FINAL
      WHERE season = 2024
    `)
    
    return NextResponse.json({
      success: true,
      sample_upcoming_game_ids: upcomingGamesIds.data || [],
      count_2023_upcoming: upcoming2023Count.data?.[0]?.count || 0,
      count_2024_upcoming: upcoming2024Count.data?.[0]?.count || 0
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

