import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    const count = await clickhouseQuery('SELECT count() as total FROM nfl_team_stats')
    
    const sample = await clickhouseQuery(`
      SELECT 
        team_id, game_id, season, week,
        points_scored, passing_yards, rushing_yards,
        points_allowed, def_passing_yards_allowed, def_rushing_yards_allowed
      FROM nfl_team_stats
      ORDER BY game_id
      LIMIT 5
    `)

    return NextResponse.json({
      success: true,
      total: count.data?.[0]?.total || 0,
      sample: sample.data || []
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

