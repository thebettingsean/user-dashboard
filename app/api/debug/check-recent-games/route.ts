import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Check games from Dec 16 onwards
    const recentGames = await clickhouseQuery<any>(`
      SELECT 
        g.game_id,
        g.espn_game_id,
        toString(g.game_date) as game_date,
        ht.name as home_team,
        at.name as away_team,
        g.home_score,
        g.away_score,
        COUNT(b.player_id) as box_score_count
      FROM nfl_games g
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = 'nfl'
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = 'nfl'
      LEFT JOIN nfl_box_scores_v2 b ON g.game_id = b.game_id
      WHERE g.game_date >= '2025-12-16'
      GROUP BY g.game_id, g.espn_game_id, g.game_date, ht.name, at.name, g.home_score, g.away_score
      ORDER BY g.game_date DESC
      LIMIT 20
    `)
    
    return NextResponse.json({
      success: true,
      games: recentGames.data
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

