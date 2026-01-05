import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export const dynamic = 'force-dynamic'

/**
 * Test what the opening line query is actually returning
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get('gameId') || 'nfl_832c36c4b6d5132e88cf11391797c194' // Packers/Bears
  
  try {
    const oddsApiId = gameId.split('_')[1]
    
    // Test the argMinIf query
    const result = await clickhouseQuery<any>(`
      SELECT 
        argMinIf(spread, snapshot_time, spread != 0 AND spread IS NOT NULL) as first_nonzero_spread,
        argMinIf(total, snapshot_time, total != 0 AND total IS NOT NULL) as first_nonzero_total,
        argMinIf(ml_home, snapshot_time, ml_home != 0 AND ml_home IS NOT NULL) as first_nonzero_ml_home,
        argMinIf(ml_away, snapshot_time, ml_away != 0 AND ml_away IS NOT NULL) as first_nonzero_ml_away,
        argMinIf(spread_juice_home, snapshot_time, spread_juice_home != -110 AND spread_juice_home IS NOT NULL) as first_nonzero_juice_home,
        MIN(snapshot_time) as earliest_time,
        COUNT(*) as total_snapshots
      FROM live_odds_snapshots
      WHERE odds_api_game_id = '${oddsApiId}'
    `)
    
    // Also get all snapshots to see what's there
    const allSnapshots = await clickhouseQuery<any>(`
      SELECT 
        snapshot_time,
        spread,
        total,
        ml_home,
        ml_away,
        spread_juice_home
      FROM live_odds_snapshots
      WHERE odds_api_game_id = '${oddsApiId}'
      ORDER BY snapshot_time ASC
      LIMIT 20
    `)
    
    // Check current game data
    const currentGame = await clickhouseQuery<any>(`
      SELECT 
        spread_open,
        spread_close,
        total_open,
        total_close,
        opening_home_spread_juice
      FROM games FINAL
      WHERE game_id = '${gameId}'
      LIMIT 1
    `)
    
    return NextResponse.json({
      gameId,
      oddsApiId,
      argMinIfResult: result.data?.[0] || null,
      currentGameData: currentGame.data?.[0] || null,
      allSnapshots: allSnapshots.data || [],
      diagnosis: {
        hasSnapshots: (allSnapshots.data?.length || 0) > 0,
        argMinIfWorked: result.data?.[0]?.first_nonzero_spread !== null && result.data?.[0]?.first_nonzero_spread !== undefined,
        gameNeedsUpdate: currentGame.data?.[0]?.spread_open === 0 || currentGame.data?.[0]?.spread_open === null,
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}

