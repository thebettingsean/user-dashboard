import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get('gameId')
  
  if (!gameId) {
    return NextResponse.json({ error: 'gameId required' }, { status: 400 })
  }
  
  try {
    const query = `
      SELECT 
        toString(snapshot_time) as snapshot_time,
        spread,
        total,
        ml_home,
        ml_away,
        public_spread_home_bet_pct,
        public_spread_home_money_pct,
        public_ml_home_bet_pct,
        public_ml_home_money_pct,
        public_total_over_bet_pct,
        public_total_over_money_pct
      FROM live_odds_snapshots
      WHERE odds_api_game_id = '${gameId}'
      ORDER BY snapshot_time ASC
    `
    
    const result = await clickhouseQuery<any>(query)
    
    return NextResponse.json({
      success: true,
      gameId,
      snapshotCount: result.data?.length || 0,
      snapshots: result.data || []
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

