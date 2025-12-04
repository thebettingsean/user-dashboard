import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

/**
 * Fix Duplicates in nfl_box_scores
 * Strategy: Keep only the latest record for each player-game combo
 */

export async function GET() {
  try {
    console.log('[Fix Duplicates] Starting...')
    
    // Step 1: Check duplicates before
    const dupsBefore = await clickhouseQuery(`
      SELECT count() as dup_count
      FROM (
        SELECT player_id, game_id
        FROM nfl_box_scores
        GROUP BY player_id, game_id
        HAVING count() > 1
      )
    `)
    
    const duplicatesBefore = dupsBefore.data?.[0]?.dup_count || 0
    console.log(`[Fix Duplicates] Found ${duplicatesBefore} duplicate combos`)
    
    // Step 2: Create temp table with only unique records (keep latest by created_at)
    await clickhouseCommand(`
      CREATE TABLE nfl_box_scores_temp ENGINE = MergeTree()
      PARTITION BY toYYYYMM(game_date)
      ORDER BY (season, week, team_id)
      AS 
      SELECT * FROM (
        SELECT *, 
               ROW_NUMBER() OVER (PARTITION BY player_id, game_id ORDER BY created_at DESC) as rn
        FROM nfl_box_scores
      )
      WHERE rn = 1
    `)
    
    console.log('[Fix Duplicates] Created temp table with unique records')
    
    // Step 3: Swap tables
    await clickhouseCommand('DROP TABLE nfl_box_scores')
    await clickhouseCommand('RENAME TABLE nfl_box_scores_temp TO nfl_box_scores')
    
    console.log('[Fix Duplicates] Swapped tables')
    
    // Step 4: Verify
    const dupsAfter = await clickhouseQuery(`
      SELECT count() as dup_count
      FROM (
        SELECT player_id, game_id
        FROM nfl_box_scores
        GROUP BY player_id, game_id
        HAVING count() > 1
      )
    `)
    
    const duplicatesAfter = dupsAfter.data?.[0]?.dup_count || 0
    
    const finalCount = await clickhouseQuery('SELECT count() as total FROM nfl_box_scores')
    const total = finalCount.data?.[0]?.total || 0
    
    console.log('[Fix Duplicates] Complete!')
    console.log(`  Total records: ${total}`)
    console.log(`  Duplicates removed: ${duplicatesBefore - duplicatesAfter}`)
    
    return NextResponse.json({
      success: true,
      duplicates_before: duplicatesBefore,
      duplicates_after: duplicatesAfter,
      duplicates_removed: duplicatesBefore - duplicatesAfter,
      total_records: total
    })
    
  } catch (error: any) {
    console.error('[Fix Duplicates] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}

