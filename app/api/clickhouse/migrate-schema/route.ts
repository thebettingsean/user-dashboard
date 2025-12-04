import { NextResponse } from 'next/server'
import { clickhouseCommand } from '@/lib/clickhouse'

export async function GET() {
  try {
    console.log('[Schema Migration] Adding missing columns...')

    const migrations = [
      // Players table additions
      "ALTER TABLE players ADD COLUMN IF NOT EXISTS espn_player_id UInt32 AFTER player_id",
      "ALTER TABLE players ADD COLUMN IF NOT EXISTS height String AFTER jersey_number",
      "ALTER TABLE players ADD COLUMN IF NOT EXISTS weight UInt16 AFTER height",
      "ALTER TABLE players ADD COLUMN IF NOT EXISTS injury_status LowCardinality(String) AFTER is_active",
      
      // Teams table additions
      "ALTER TABLE teams ADD COLUMN IF NOT EXISTS espn_team_id UInt16 AFTER team_id",
      "ALTER TABLE teams ADD COLUMN IF NOT EXISTS primary_color String AFTER logo_url",
      "ALTER TABLE teams ADD COLUMN IF NOT EXISTS secondary_color String AFTER primary_color",
      "ALTER TABLE teams ADD COLUMN IF NOT EXISTS updated_at DateTime DEFAULT now() AFTER created_at"
    ]

    const results = []
    let successCount = 0
    let failCount = 0

    for (const sql of migrations) {
      try {
        await clickhouseCommand(sql)
        console.log(`✓ ${sql}`)
        results.push({ success: true, statement: sql })
        successCount++
      } catch (error: any) {
        // Column might already exist, that's okay
        if (error.message.includes('already exists')) {
          console.log(`⊘ Column already exists: ${sql}`)
          results.push({ success: true, statement: sql, note: 'already exists' })
          successCount++
        } else {
          console.error(`✗ ${sql}:`, error.message)
          results.push({ success: false, statement: sql, error: error.message })
          failCount++
        }
      }
    }

    return NextResponse.json({
      success: failCount === 0,
      message: `Schema migration: ${successCount} successful, ${failCount} failed`,
      results,
      successCount,
      failCount
    })

  } catch (error: any) {
    console.error('[Schema Migration] Fatal error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}

