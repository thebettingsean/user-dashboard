import { NextResponse } from 'next/server'

const CLICKHOUSE_HOST = process.env.CLICKHOUSE_HOST!
const CLICKHOUSE_KEY_ID = process.env.CLICKHOUSE_KEY_ID!
const CLICKHOUSE_KEY_SECRET = process.env.CLICKHOUSE_KEY_SECRET!

async function executeQuery(sql: string) {
  const response = await fetch(CLICKHOUSE_HOST, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Authorization': `Basic ${Buffer.from(`${CLICKHOUSE_KEY_ID}:${CLICKHOUSE_KEY_SECRET}`).toString('base64')}`
    },
    body: sql
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ClickHouse error: ${error}`)
  }
  
  return response.text()
}

export async function POST() {
  try {
    console.log('🏈 Adding public betting columns to games table...')
    
    // Add columns one by one (ClickHouse ADD COLUMN IF NOT EXISTS)
    const columns = [
      'sportsdata_io_score_id UInt32 DEFAULT 0',
      'public_ml_home_bet_pct Float32 DEFAULT 0',
      'public_ml_home_money_pct Float32 DEFAULT 0',
      'public_spread_home_bet_pct Float32 DEFAULT 0',
      'public_spread_home_money_pct Float32 DEFAULT 0',
      'public_total_over_bet_pct Float32 DEFAULT 0',
      'public_total_over_money_pct Float32 DEFAULT 0',
      'public_betting_updated_at DateTime DEFAULT now()'
    ]
    
    const results = []
    
    for (const column of columns) {
      const columnName = column.split(' ')[0]
      try {
        await executeQuery(`ALTER TABLE games ADD COLUMN IF NOT EXISTS ${column}`)
        console.log(`✅ Added column: ${columnName}`)
        results.push({ column: columnName, status: 'added' })
      } catch (error: any) {
        // Column might already exist
        if (error.message.includes('already exists')) {
          console.log(`⏭️ Column already exists: ${columnName}`)
          results.push({ column: columnName, status: 'already_exists' })
        } else {
          console.error(`❌ Error adding ${columnName}:`, error.message)
          results.push({ column: columnName, status: 'error', error: error.message })
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Public betting columns added to games table',
      results
    })
    
  } catch (error: any) {
    console.error('Error adding columns:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to add public betting columns to the games table',
    columns: [
      'sportsdata_io_score_id - SportsDataIO ScoreID for mapping',
      'public_ml_home_bet_pct - % of bets on home moneyline',
      'public_ml_home_money_pct - % of money on home moneyline',
      'public_spread_home_bet_pct - % of bets on home spread',
      'public_spread_home_money_pct - % of money on home spread',
      'public_total_over_bet_pct - % of bets on the over',
      'public_total_over_money_pct - % of money on the over',
      'public_betting_updated_at - Last update timestamp'
    ]
  })
}

