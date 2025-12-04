import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

/**
 * Remove empty/unused columns from nfl_games table
 */
export async function POST() {
  try {
    const results: string[] = []
    
    // Columns to remove (empty or not needed)
    const columnsToRemove = [
      'home_win_prob_pregame',
      'home_spread_odds_close',
      'away_spread_odds_close', 
      'over_odds_close',
      'under_odds_close',
      'odds_provider_id'
    ]
    
    for (const column of columnsToRemove) {
      try {
        await clickhouseCommand(`ALTER TABLE nfl_games DROP COLUMN IF EXISTS ${column}`)
        results.push(`✅ Removed ${column}`)
      } catch (err: any) {
        results.push(`⚠️ ${column}: ${err.message}`)
      }
    }
    
    // Force merge to clean up data
    await clickhouseCommand(`OPTIMIZE TABLE nfl_games FINAL`)
    results.push('✅ Table optimized')
    
    // Get final column list
    const columns = await clickhouseQuery(`
      SELECT name, type 
      FROM system.columns 
      WHERE table = 'nfl_games' AND database = 'default'
      ORDER BY position
    `)
    
    return NextResponse.json({
      success: true,
      results,
      remaining_columns: columns.data?.map((c: any) => `${c.name} (${c.type})`)
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

