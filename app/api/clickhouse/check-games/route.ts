import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    const count = await clickhouseQuery('SELECT count() as total FROM nfl_games')
    
    const sample = await clickhouseQuery(`
      SELECT 
        game_id, home_team_id, away_team_id,
        home_score, away_score,
        spread_close, total_close, 
        home_ml_close, away_ml_close,
        home_covered, went_over,
        odds_provider_name,
        referee_name, referee_id
      FROM nfl_games
      ORDER BY game_id DESC
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

