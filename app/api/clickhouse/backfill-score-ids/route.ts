import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // For NFL: Copy ScoreIDs from nfl_games to universal games table
    // Match by team IDs and game time
    const updateQuery = `
      ALTER TABLE games UPDATE
        sportsdata_io_score_id = ng.sportsdata_io_score_id
      FROM (
        SELECT 
          g.game_id,
          ng.sportsdata_io_score_id
        FROM games g
        INNER JOIN nfl_games ng ON (
          g.home_team_id = ng.home_team_id 
          AND g.away_team_id = ng.away_team_id
          AND toDate(g.game_time) = toDate(ng.game_time)
          AND g.sport = 'nfl'
        )
        WHERE ng.sportsdata_io_score_id > 0
      ) AS ng
      WHERE games.game_id = ng.game_id
    `
    
    await clickhouseCommand(updateQuery)
    
    // Check results
    const checkQuery = `
      SELECT count() as total, 
             countIf(sportsdata_io_score_id > 0) as with_score_id
      FROM games
      WHERE sport = 'nfl'
    `
    
    const result = await clickhouseQuery<{ total: number; with_score_id: number }>(checkQuery)
    
    return NextResponse.json({
      success: true,
      message: 'Backfilled ScoreIDs from nfl_games to universal games table',
      results: result.data?.[0] || {}
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

