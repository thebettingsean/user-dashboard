import { NextResponse } from 'next/server'
import { clickhouseCommand } from '@/lib/clickhouse'

/**
 * DELETE UNUSED CLICKHOUSE TABLES
 * 
 * This endpoint will drop tables that are confirmed unused:
 * 1. nfl_player_aggregates (0 rows, never populated)
 * 2. nba_player_aggregates (0 rows, never populated)
 * 3. props_with_stats (0 rows, purpose unclear)
 * 4. nba_prop_lines_backup (1.4M rows, not used anywhere)
 * 
 * Run this ONCE to clean up the database.
 */
export async function POST() {
  try {
    const results: string[] = []
    
    // Tables to delete
    const tablesToDrop = [
      'nfl_player_aggregates',
      'nba_player_aggregates', 
      'props_with_stats',
      'nba_prop_lines_backup'
    ]
    
    for (const table of tablesToDrop) {
      try {
        await clickhouseCommand(`DROP TABLE IF EXISTS ${table}`)
        results.push(`✅ Dropped ${table}`)
      } catch (e: any) {
        results.push(`❌ Failed to drop ${table}: ${e.message}`)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cleanup complete',
      results
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

