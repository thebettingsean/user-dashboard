import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Check for duplicates - same player_id + game_id appearing multiple times
    const duplicateCheck = await clickhouseQuery(`
      SELECT player_id, game_id, COUNT(*) as cnt
      FROM nfl_box_scores_v2
      WHERE season = 2025
      GROUP BY player_id, game_id
      HAVING cnt > 1
      LIMIT 10
    `)

    // Check a specific WR's actual yards
    const specificWR = await clickhouseQuery(`
      SELECT 
        p.name,
        b.game_date,
        b.receiving_yards,
        COUNT(*) as appearances
      FROM nfl_box_scores_v2 b
      JOIN players p ON b.player_id = p.player_id
      WHERE p.position = 'WR' AND b.season = 2025 AND b.team_id = 3
      GROUP BY p.name, b.game_date, b.receiving_yards
      ORDER BY b.game_date DESC
      LIMIT 20
    `)

    // What's a realistic WR total for CHI (team_id 3)?
    const chiWRTotal = await clickhouseQuery(`
      SELECT 
        p.name,
        SUM(b.receiving_yards) as total_yards,
        COUNT(*) as games
      FROM nfl_box_scores_v2 b
      JOIN players p ON b.player_id = p.player_id
      WHERE p.position = 'WR' AND b.season = 2025 AND b.team_id = 3
      GROUP BY p.name
      ORDER BY total_yards DESC
      LIMIT 5
    `)

    // Raw count of WR rows for CHI
    const rawCount = await clickhouseQuery(`
      SELECT COUNT(*) as total_rows
      FROM nfl_box_scores_v2 b
      JOIN players p ON b.player_id = p.player_id
      WHERE p.position = 'WR' AND b.season = 2025 AND b.team_id = 3
    `)

    return NextResponse.json({
      duplicateCheck: duplicateCheck.data,
      specificWR: specificWR.data,
      chiWRTotal: chiWRTotal.data,
      rawCount: rawCount.data
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
