import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Test updating one game manually
    const gameId = 'nfl_18fe4528a0bc43d9cd64bd09c0d5019f' // PHI @ WAS
    
    // Before update
    const before = await clickhouseQuery(`
      SELECT game_id, public_spread_home_bet_pct, public_spread_home_money_pct 
      FROM games 
      WHERE game_id = '${gameId}'
    `)
    
    // Update
    await clickhouseCommand(`
      ALTER TABLE games UPDATE
        public_spread_home_bet_pct = 29,
        public_spread_home_money_pct = 71,
        public_ml_home_bet_pct = 30,
        public_ml_home_money_pct = 70,
        updated_at = now()
      WHERE game_id = '${gameId}'
    `)
    
    // After update
    const after = await clickhouseQuery(`
      SELECT game_id, public_spread_home_bet_pct, public_spread_home_money_pct, updated_at
      FROM games 
      WHERE game_id = '${gameId}'
    `)
    
    return NextResponse.json({
      success: true,
      gameId,
      before: before.data,
      after: after.data,
      note: 'Manual UPDATE test for PHI @ WAS game'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

