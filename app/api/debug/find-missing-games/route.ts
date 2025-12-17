import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Check for Rams @ Seahawks and Bears @ Packers in nfl_games
    const query = `
      SELECT 
        ng.game_id,
        ng.game_time,
        ng.sportsdata_io_score_id,
        ht.name as home_team,
        ht.abbreviation as home_abbr,
        at.name as away_team,
        at.abbreviation as away_abbr
      FROM nfl_games ng
      LEFT JOIN teams ht ON ng.home_team_id = ht.espn_team_id AND ht.sport = 'nfl'
      LEFT JOIN teams at ON ng.away_team_id = at.espn_team_id AND at.sport = 'nfl'
      WHERE (
        (ht.abbreviation = 'SEA' AND at.abbreviation = 'LAR')
        OR (ht.abbreviation = 'CHI' AND at.abbreviation = 'GB')
      )
      AND ng.game_time > '2025-12-15'
      LIMIT 10
    `
    
    const result = await clickhouseQuery<{
      game_id: number
      game_time: string
      sportsdata_io_score_id: number
      home_team: string
      home_abbr: string
      away_team: string
      away_abbr: string
    }>(query)
    
    const games = result.data || []
    
    return NextResponse.json({
      success: true,
      gamesFound: games.length,
      games: games.map(g => ({
        game: `${g.away_abbr} @ ${g.home_abbr}`,
        gameId: g.game_id,
        gameTime: g.game_time,
        scoreId: g.sportsdata_io_score_id,
        hasScoreId: g.sportsdata_io_score_id > 0,
        issue: g.sportsdata_io_score_id === 0 ? 'ScoreID is 0 - need to populate' : 'OK'
      })),
      conclusion: games.length === 0 
        ? '❌ Games NOT in nfl_games table at all - need to sync from ESPN/Odds API'
        : games.every(g => g.sportsdata_io_score_id > 0)
        ? '✅ All games have ScoreIDs - sync should work'
        : '⚠️ Games exist but ScoreIDs are 0 - need to populate from SportsDataIO or ESPN'
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

