import { NextResponse } from 'next/server'
import { clickhouseCommand } from '@/lib/clickhouse'

export async function GET() {
  try {
    console.log('Adding signal columns to games table...')
    const results: string[] = []
    
    const columns = [
      // Spread signals
      'spread_home_public_respect UInt8 DEFAULT 0',
      'spread_home_vegas_backed UInt8 DEFAULT 0',
      'spread_home_whale_respect UInt8 DEFAULT 0',
      'spread_away_public_respect UInt8 DEFAULT 0',
      'spread_away_vegas_backed UInt8 DEFAULT 0',
      'spread_away_whale_respect UInt8 DEFAULT 0',
      
      // Total signals
      'total_over_public_respect UInt8 DEFAULT 0',
      'total_over_vegas_backed UInt8 DEFAULT 0',
      'total_over_whale_respect UInt8 DEFAULT 0',
      'total_under_public_respect UInt8 DEFAULT 0',
      'total_under_vegas_backed UInt8 DEFAULT 0',
      'total_under_whale_respect UInt8 DEFAULT 0',
      
      // ML signals
      'ml_home_public_respect UInt8 DEFAULT 0',
      'ml_home_vegas_backed UInt8 DEFAULT 0',
      'ml_home_whale_respect UInt8 DEFAULT 0',
      'ml_away_public_respect UInt8 DEFAULT 0',
      'ml_away_vegas_backed UInt8 DEFAULT 0',
      'ml_away_whale_respect UInt8 DEFAULT 0',
      
      // Opening juice (needed for signal calculations)
      'opening_home_spread_juice Int16 DEFAULT -110',
      'opening_away_spread_juice Int16 DEFAULT -110',
      'opening_over_juice Int16 DEFAULT -110',
      'opening_under_juice Int16 DEFAULT -110',
    ]
    
    for (const column of columns) {
      const [name] = column.split(' ')
      try {
        await clickhouseCommand(`ALTER TABLE games ADD COLUMN IF NOT EXISTS ${column}`)
        results.push(`✅ Added column: ${name}`)
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          results.push(`⏭️ Column already exists: ${name}`)
        } else {
          results.push(`❌ Failed to add ${name}: ${error.message}`)
        }
      }
    }
    
    // Also add columns to game_first_seen for opening juice
    const firstSeenColumns = [
      'opening_home_spread_juice Int16 DEFAULT -110',
      'opening_away_spread_juice Int16 DEFAULT -110',
      'opening_over_juice Int16 DEFAULT -110',
      'opening_under_juice Int16 DEFAULT -110',
    ]
    
    for (const column of firstSeenColumns) {
      const [name] = column.split(' ')
      try {
        await clickhouseCommand(`ALTER TABLE game_first_seen ADD COLUMN IF NOT EXISTS ${column}`)
        results.push(`✅ Added column to game_first_seen: ${name}`)
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          results.push(`⏭️ Column already exists in game_first_seen: ${name}`)
        } else {
          results.push(`❌ Failed to add ${name} to game_first_seen: ${error.message}`)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}

