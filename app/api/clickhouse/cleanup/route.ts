import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

/**
 * Cleanup ClickHouse tables
 * - Drop old tables
 * - Truncate test data
 */

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'truncate'
  
  try {
    const results = []
    
    if (action === 'drop_old') {
      // Drop the old nfl_box_scores table
      await clickhouseCommand('DROP TABLE IF EXISTS nfl_box_scores')
      results.push('Dropped nfl_box_scores (old)')
      
      await clickhouseCommand('DROP TABLE IF EXISTS nba_box_scores')
      results.push('Dropped nba_box_scores (old)')
    }
    
    if (action === 'truncate' || action === 'all') {
      // Truncate all test data
      await clickhouseCommand('TRUNCATE TABLE nfl_games')
      results.push('Truncated nfl_games')
      
      await clickhouseCommand('TRUNCATE TABLE nfl_box_scores_v2')
      results.push('Truncated nfl_box_scores_v2')
      
      await clickhouseCommand('TRUNCATE TABLE nfl_team_stats')
      results.push('Truncated nfl_team_stats')
      
      await clickhouseCommand('TRUNCATE TABLE nfl_team_rankings')
      results.push('Truncated nfl_team_rankings')
    }
    
    if (action === 'all') {
      // Drop old tables too
      await clickhouseCommand('DROP TABLE IF EXISTS nfl_box_scores')
      results.push('Dropped nfl_box_scores (old)')
    }
    
    // Get current counts
    const counts = await clickhouseQuery(`
      SELECT 
        (SELECT count() FROM nfl_games) as games,
        (SELECT count() FROM nfl_box_scores_v2) as box_scores,
        (SELECT count() FROM nfl_team_stats) as team_stats,
        (SELECT count() FROM nfl_team_rankings) as rankings
    `)
    
    return NextResponse.json({
      success: true,
      action,
      results,
      current_counts: counts.data?.[0] || {}
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

