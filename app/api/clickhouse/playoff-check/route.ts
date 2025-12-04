import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    const playoffs = await clickhouseQuery(`
      SELECT 
        season, week, game_date, home_team_id, away_team_id,
        home_score, away_score,
        spread_open, spread_close, total_open, total_close,
        home_ml_open, home_ml_close,
        is_playoff
      FROM nfl_games
      WHERE is_playoff = 1
      ORDER BY game_date DESC
      LIMIT 20
    `)
    
    const summary = await clickhouseQuery(`
      SELECT 
        season,
        COUNT(*) as total_playoff_games,
        SUM(CASE WHEN spread_open != 0 OR spread_close != 0 THEN 1 ELSE 0 END) as with_odds
      FROM nfl_games
      WHERE is_playoff = 1
      GROUP BY season
      ORDER BY season
    `)
    
    return NextResponse.json({
      playoff_summary: summary.data,
      recent_playoff_games: playoffs.data
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

