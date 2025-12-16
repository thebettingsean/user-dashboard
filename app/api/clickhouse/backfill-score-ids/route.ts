import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // For NFL: Copy ScoreIDs from nfl_games to universal games table
    // Use a series of direct updates by matching team IDs and date
    const updateQuery = `
      ALTER TABLE games UPDATE
        sportsdata_io_score_id = (
          SELECT ng.sportsdata_io_score_id
          FROM nfl_games ng
          WHERE ng.home_team_id = games.home_team_id
            AND ng.away_team_id = games.away_team_id
            AND toDate(ng.game_time) = toDate(games.game_time)
            AND ng.sportsdata_io_score_id > 0
          LIMIT 1
        )
      WHERE games.sport = 'nfl'
        AND games.sportsdata_io_score_id = 0
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

