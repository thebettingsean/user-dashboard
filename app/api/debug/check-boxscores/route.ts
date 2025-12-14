import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get('game_id') || '401772948'
  
  try {
    // Check for box scores
    const boxScores = await clickhouseQuery(`
      SELECT 
        b.player_id,
        p.name as player_name,
        b.team_id,
        b.pass_yards,
        b.pass_tds,
        b.rush_yards,
        b.rush_tds,
        b.receiving_yards,
        b.receptions
      FROM nfl_box_scores_v2 b
      LEFT JOIN players p ON b.player_id = p.player_id AND p.sport = 'nfl'
      WHERE b.game_id = ${gameId}
      ORDER BY b.pass_yards + b.rush_yards + b.receiving_yards DESC
      LIMIT 20
    `)
    
    return NextResponse.json({
      success: true,
      game_id: gameId,
      box_score_count: boxScores.data?.length || 0,
      players: boxScores.data
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

