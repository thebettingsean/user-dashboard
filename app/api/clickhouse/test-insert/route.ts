import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Test insert
    const testData = `
      INSERT INTO nfl_box_scores (
        player_id, game_id, game_date, season, week,
        team_id, opponent_id, is_home, is_division, is_conference,
        team_was_favorite, game_total, team_spread,
        opp_def_rank_pass_yards, opp_def_rank_rush_yards, opp_def_rank_receptions, opp_def_rank_receiving_yards,
        pass_attempts, pass_completions, pass_yards, pass_tds, interceptions, sacks, qb_rating,
        rush_attempts, rush_yards, rush_tds, rush_long, yards_per_carry,
        targets, receptions, receiving_yards, receiving_tds, receiving_long, yards_per_reception,
        fumbles, fumbles_lost
      ) VALUES (
        99999, 99999, '2025-09-05', 2025, 1,
        12, 6, 1, 0, 1,
        1, 50.5, -3.5,
        15, 10, 12, 18,
        35, 25, 350, 3, 1, 2, 105.5,
        20, 85, 1, 18, 4.25,
        8, 6, 75, 1, 22, 12.5,
        0, 0
      )
    `

    console.log('[Test Insert] Attempting insert...')
    await clickhouseCommand(testData)
    console.log('[Test Insert] ✅ Insert successful')

    // Query it back
    const result = await clickhouseQuery('SELECT * FROM nfl_box_scores WHERE player_id = 99999')
    
    return NextResponse.json({
      success: true,
      inserted: true,
      queried_back: result.data[0] || null
    })

  } catch (error: any) {
    console.error('[Test Insert] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}

