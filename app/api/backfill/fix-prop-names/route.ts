/**
 * Fix Corrupted Prop Player Names
 * 
 * Deletes props with corrupted player names (Dec 1+) since they can't JOIN with box_scores.
 * New props will be populated correctly by the sync-nfl-props cron.
 */

import { NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

export const maxDuration = 300

export async function POST() {
  const startTime = Date.now()
  
  try {
    console.log('[FIX-PROP-NAMES] Checking for corrupted props...')
    
    // Count corrupted props (names with underscores)
    const corruptedQuery = await clickhouseQuery(`
      SELECT 
        count(*) as total,
        countIf(game_time >= '2025-12-01') as dec_onwards
      FROM nfl_prop_lines
      WHERE player_name LIKE '%\\_%'
    `)
    
    const corrupted = corruptedQuery.data[0]
    console.log(`[FIX-PROP-NAMES] Found ${corrupted.total} corrupted props (${corrupted.dec_onwards} from Dec 1+)`)
    
    if (corrupted.dec_onwards === 0) {
      return NextResponse.json({
        success: true,
        message: 'No corrupted props found from Dec 1+',
        elapsed_ms: Date.now() - startTime
      })
    }
    
    // Delete corrupted props from Dec 1 onwards
    console.log('[FIX-PROP-NAMES] Deleting corrupted props from Dec 1+...')
    
    await clickhouseCommand(`
      ALTER TABLE nfl_prop_lines DELETE
      WHERE game_time >= '2025-12-01'
        AND player_name LIKE '%\\_%'
    `)
    
    console.log('[FIX-PROP-NAMES] ✅ Deleted corrupted props')
    
    // Get stats after cleanup
    const statsQuery = await clickhouseQuery(`
      SELECT 
        count(*) as total_props,
        max(game_time) as latest_prop,
        countIf(game_time >= '2025-12-01') as dec_props
      FROM nfl_prop_lines
    `)
    
    const stats = statsQuery.data[0]
    
    return NextResponse.json({
      success: true,
      elapsed_ms: Date.now() - startTime,
      deleted: corrupted.dec_onwards,
      remaining: {
        total: stats.total_props,
        latest: stats.latest_prop,
        dec_props: stats.dec_props
      },
      next_step: 'Run sync-nfl-props cron to populate upcoming props with correct names'
    })
    
  } catch (error: any) {
    console.error('[FIX-PROP-NAMES] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    usage: {
      method: 'POST',
      description: 'Delete corrupted props from Dec 1+ (player names with underscores)',
      note: 'New props will be populated by sync-nfl-props cron with correct names'
    }
  })
}

