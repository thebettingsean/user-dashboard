import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

/**
 * Deduplicate ClickHouse Tables
 * Removes duplicate records based on primary keys
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const table = searchParams.get('table') || 'nfl_box_scores'
  
  try {
    console.log(`[Deduplicate] Starting deduplication of ${table}...`)
    
    // Get count before
    const beforeCount = await clickhouseQuery(`SELECT COUNT(*) as count FROM ${table}`)
    const before = beforeCount[0]?.count || 0
    
    console.log(`[Deduplicate] Records before: ${before}`)
    
    // ClickHouse deduplication strategy:
    // Since we're using MergeTree (not ReplacingMergeTree for box_scores),
    // we need to manually deduplicate by:
    // 1. Create temp table with DISTINCT records
    // 2. Drop original
    // 3. Rename temp to original
    
    // For nfl_box_scores, unique key is (player_id, game_id)
    if (table === 'nfl_box_scores') {
      console.log('[Deduplicate] Creating deduplicated table...')
      
      // Create new table with only distinct records
      await clickhouseCommand(`
        CREATE TABLE nfl_box_scores_dedup ENGINE = MergeTree()
        PARTITION BY toYYYYMM(game_date)
        ORDER BY (season, week, team_id)
        AS SELECT * FROM nfl_box_scores
        GROUP BY player_id, game_id, game_date, season, week, team_id, opponent_id, 
                 is_home, is_division, is_conference, team_was_favorite, game_total, team_spread,
                 opp_def_rank_pass_yards, opp_def_rank_rush_yards, opp_def_rank_receptions, opp_def_rank_receiving_yards,
                 pass_attempts, pass_completions, pass_yards, pass_tds, interceptions, sacks, qb_rating,
                 rush_attempts, rush_yards, rush_tds, rush_long, yards_per_carry,
                 targets, receptions, receiving_yards, receiving_tds, receiving_long, yards_per_reception,
                 fumbles, fumbles_lost, created_at
      `)
      
      // Drop old table
      await clickhouseCommand('DROP TABLE nfl_box_scores')
      
      // Rename new table
      await clickhouseCommand('RENAME TABLE nfl_box_scores_dedup TO nfl_box_scores')
      
      console.log('[Deduplicate] Table recreated with deduplication')
    }
    
    // Get count after
    const afterCount = await clickhouseQuery(`SELECT COUNT(*) as count FROM ${table}`)
    const after = afterCount[0]?.count || 0
    
    const removed = before - after
    
    console.log(`[Deduplicate] Records after: ${after}`)
    console.log(`[Deduplicate] Duplicates removed: ${removed}`)
    
    return NextResponse.json({
      success: true,
      table,
      records_before: before,
      records_after: after,
      duplicates_removed: removed
    })
    
  } catch (error: any) {
    console.error('[Deduplicate] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        table
      },
      { status: 500 }
    )
  }
}

