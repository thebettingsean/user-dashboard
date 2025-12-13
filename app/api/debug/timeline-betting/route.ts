import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get('gameId') || 'cd5151f8a1e7fcba4901929e77b94acd'
  
  try {
    // Get ALL snapshots with betting data status
    const query = `
      SELECT 
        toString(snapshot_time) as time,
        spread,
        ml_home,
        total,
        public_spread_home_bet_pct,
        public_ml_home_bet_pct,
        public_total_over_bet_pct,
        CASE 
          WHEN public_spread_home_bet_pct > 0 AND public_spread_home_bet_pct != 50 THEN 'real'
          ELSE 'default'
        END as betting_status
      FROM live_odds_snapshots
      WHERE odds_api_game_id = '${gameId}'
      ORDER BY snapshot_time ASC
    `
    
    const result = await clickhouseQuery<any>(query)
    const snapshots = result.data || []
    
    const realBetting = snapshots.filter((s: any) => s.betting_status === 'real')
    const defaultBetting = snapshots.filter((s: any) => s.betting_status === 'default')
    
    return NextResponse.json({
      success: true,
      gameId,
      totalSnapshots: snapshots.length,
      withRealBetting: realBetting.length,
      withDefaultBetting: defaultBetting.length,
      sampleReal: realBetting.slice(0, 5),
      sampleDefault: defaultBetting.slice(0, 5)
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

