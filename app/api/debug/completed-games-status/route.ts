import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Check completed games from Dec 1 onwards
    const completedGames = await clickhouseQuery<any>(`
      SELECT 
        toString(g.game_date) as game_date,
        COUNT(*) as games_played,
        SUM(CASE WHEN b.game_id IS NOT NULL THEN 1 ELSE 0 END) as games_with_box_scores,
        SUM(CASE WHEN b.game_id IS NULL THEN 1 ELSE 0 END) as games_missing_box_scores
      FROM nfl_games g
      LEFT JOIN (
        SELECT DISTINCT game_id FROM nfl_box_scores_v2
      ) b ON g.game_id = b.game_id
      WHERE g.game_date >= '2025-12-01'
        AND (g.home_score > 0 OR g.away_score > 0)
      GROUP BY g.game_date
      ORDER BY g.game_date DESC
    `)
    
    return NextResponse.json({
      success: true,
      byDate: completedGames.data
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

