import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Check latest dates for all critical data
    const [games, boxScores, props] = await Promise.all([
      clickhouseQuery<any>(`
        SELECT 
          MAX(game_date) as latest_game,
          COUNT(*) as total_games,
          SUM(CASE WHEN game_date >= '2025-12-01' THEN 1 ELSE 0 END) as december_games
        FROM nfl_games
      `),
      clickhouseQuery<any>(`
        SELECT 
          MAX(g.game_date) as latest_box_score,
          COUNT(DISTINCT b.game_id) as games_with_box_scores,
          SUM(CASE WHEN g.game_date >= '2025-12-01' THEN 1 ELSE 0 END) as december_box_scores
        FROM nfl_box_scores_v2 b
        JOIN nfl_games g ON b.game_id = g.game_id
      `),
      clickhouseQuery<any>(`
        SELECT 
          MAX(g.game_date) as latest_props,
          COUNT(DISTINCT p.game_id) as games_with_props,
          SUM(CASE WHEN g.game_date >= '2025-12-01' THEN 1 ELSE 0 END) as december_props
        FROM nfl_prop_lines p
        JOIN nfl_games g ON p.game_id = g.game_id
      `)
    ])
    
    return NextResponse.json({
      success: true,
      games: games.data?.[0],
      boxScores: boxScores.data?.[0],
      props: props.data?.[0],
      gap: {
        message: 'If latest_box_score < latest_game, we have missing data',
        hasGap: boxScores.data?.[0]?.latest_box_score < games.data?.[0]?.latest_game
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

