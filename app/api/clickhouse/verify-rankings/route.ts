import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season') || '2022'
  const week = searchParams.get('week') || '1'
  
  try {
    const rankings = await clickhouseQuery(`
      SELECT 
        team_id,
        rank_points_per_game,
        points_per_game,
        rank_passing_yards_per_game,
        passing_yards_per_game,
        rank_points_allowed_per_game,
        points_allowed_per_game,
        rank_passing_yards_allowed_per_game,
        passing_yards_allowed_per_game
      FROM nfl_team_rankings
      WHERE season = ${season} AND week = ${week}
      ORDER BY rank_points_per_game ASC
      LIMIT 10
    `)

    return NextResponse.json({
      success: true,
      season: parseInt(season),
      week: parseInt(week),
      top_10_offenses: rankings.data
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

