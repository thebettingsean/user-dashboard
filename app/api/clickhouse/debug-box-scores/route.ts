import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Check for duplicates
    const duplicates = await clickhouseQuery(`
      SELECT player_id, game_id, COUNT(*) as count
      FROM nfl_box_scores
      GROUP BY player_id, game_id
      HAVING count > 1
      ORDER BY count DESC
      LIMIT 20
    `)

    // Sample data
    const sample = await clickhouseQuery(`
      SELECT 
        player_id, game_id, game_date, season, week,
        team_id, opponent_id, is_home,
        team_was_favorite, game_total, team_spread,
        pass_yards, rush_yards, receiving_yards, receptions
      FROM nfl_box_scores
      ORDER BY game_date DESC
      LIMIT 10
    `)

    // Total count
    const total = await clickhouseQuery('SELECT COUNT(*) as count FROM nfl_box_scores')

    // Check a specific game to see structure
    const gameCheck = await clickhouseQuery(`
      SELECT * FROM nfl_box_scores 
      WHERE season = 2024 AND week = 1 
      LIMIT 3
    `)

    return NextResponse.json({
      success: true,
      total_records: total[0]?.count || 0,
      duplicates_found: duplicates.length,
      duplicate_examples: duplicates,
      sample_records: sample,
      game_check: gameCheck
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

