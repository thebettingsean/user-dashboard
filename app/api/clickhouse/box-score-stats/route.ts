import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    const nflCount = await clickhouseQuery('SELECT COUNT(*) as count FROM nfl_box_scores')
    const nbaCount = await clickhouseQuery('SELECT COUNT(*) as count FROM nba_box_scores')
    
    const nflSample = await clickhouseQuery(`
      SELECT player_id, game_date, season, week, pass_yards, rush_yards, receiving_yards, receptions
      FROM nfl_box_scores 
      ORDER BY game_date DESC 
      LIMIT 10
    `)

    const nflByWeek = await clickhouseQuery(`
      SELECT season, week, COUNT(*) as player_count
      FROM nfl_box_scores
      GROUP BY season, week
      ORDER BY season DESC, week DESC
      LIMIT 20
    `)

    return NextResponse.json({
      success: true,
      summary: {
        nfl_total: nflCount[0]?.count || 0,
        nba_total: nbaCount[0]?.count || 0
      },
      nfl_sample: nflSample,
      nfl_by_week: nflByWeek
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

