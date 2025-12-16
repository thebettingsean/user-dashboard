import { NextResponse } from 'next/server'
import { clickhouseCommand } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Add public betting columns to universal games table
    const columns = [
      'public_spread_home_bet_pct Float32 DEFAULT 50',
      'public_spread_home_money_pct Float32 DEFAULT 50',
      'public_ml_home_bet_pct Float32 DEFAULT 50',
      'public_ml_home_money_pct Float32 DEFAULT 50',
      'public_total_over_bet_pct Float32 DEFAULT 50',
      'public_total_over_money_pct Float32 DEFAULT 50',
      'sportsdata_io_score_id UInt32 DEFAULT 0'
    ]
    
    for (const column of columns) {
      try {
        await clickhouseCommand(`ALTER TABLE games ADD COLUMN IF NOT EXISTS ${column}`)
      } catch (e) {
        // Column might already exist, continue
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Public betting columns added to universal games table',
      columns: [
        'public_spread_home_bet_pct',
        'public_spread_home_money_pct',
        'public_ml_home_bet_pct',
        'public_ml_home_money_pct',
        'public_total_over_bet_pct',
        'public_total_over_money_pct',
        'sportsdata_io_score_id'
      ]
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

