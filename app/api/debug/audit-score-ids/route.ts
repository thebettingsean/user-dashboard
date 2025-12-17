import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Get ALL NFL games and their ScoreID status
    const query = `
      SELECT 
        ng.game_id,
        ng.game_time,
        ng.sportsdata_io_score_id,
        ng.created_at,
        ng.updated_at,
        ht.abbreviation as home_team,
        at.abbreviation as away_team
      FROM nfl_games ng
      LEFT JOIN teams ht ON ng.home_team_id = ht.espn_team_id AND ht.sport = 'nfl'
      LEFT JOIN teams at ON ng.away_team_id = at.espn_team_id AND at.sport = 'nfl'
      WHERE ng.game_time > '2025-12-15'
      ORDER BY ng.game_time
    `
    
    const result = await clickhouseQuery<{
      game_id: number
      game_time: string
      sportsdata_io_score_id: number
      created_at: string
      updated_at: string
      home_team: string
      away_team: string
    }>(query)
    
    const games = result.data || []
    
    const withScoreId = games.filter(g => g.sportsdata_io_score_id > 0)
    const withoutScoreId = games.filter(g => g.sportsdata_io_score_id === 0)
    
    return NextResponse.json({
      success: true,
      summary: {
        totalGames: games.length,
        withScoreId: withScoreId.length,
        withoutScoreId: withoutScoreId.length
      },
      gamesWithScoreId: withScoreId.map(g => ({
        game: `${g.away_team} @ ${g.home_team}`,
        gameId: g.game_id,
        scoreId: g.sportsdata_io_score_id,
        gameTime: g.game_time,
        created: g.created_at,
        updated: g.updated_at
      })),
      gamesWithoutScoreId: withoutScoreId.map(g => ({
        game: `${g.away_team} @ ${g.home_team}`,
        gameId: g.game_id,
        scoreId: g.sportsdata_io_score_id,
        gameTime: g.game_time,
        created: g.created_at,
        updated: g.updated_at
      })),
      question: 'WHERE did the ScoreIDs for the working games come from?',
      hypothesis: [
        'Were they synced from ESPN scoreboard before the games were removed?',
        'Were they manually inserted?',
        'Is there a pattern in game_id or created_at that explains the difference?'
      ]
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

