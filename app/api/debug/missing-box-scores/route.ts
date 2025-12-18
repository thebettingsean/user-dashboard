import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Find completed games missing box scores since Dec 16
    const missingGames = await clickhouseQuery<any>(`
      SELECT 
        g.game_id,
        toString(g.game_date) as game_date,
        toString(g.game_time) as game_time,
        ht.name as home_team,
        at.name as away_team,
        g.home_score,
        g.away_score,
        g.espn_game_id
      FROM nfl_games g
      LEFT JOIN nfl_box_scores_v2 b ON g.game_id = b.game_id
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = 'nfl'
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = 'nfl'
      WHERE g.game_date >= '2025-12-16'
        AND g.game_date <= '2025-12-23'
        AND (g.home_score > 0 OR g.away_score > 0)
        AND b.game_id IS NULL
      ORDER BY g.game_date DESC
    `)
    
    return NextResponse.json({
      success: true,
      missingGames: missingGames.data || [],
      count: missingGames.data?.length || 0
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

