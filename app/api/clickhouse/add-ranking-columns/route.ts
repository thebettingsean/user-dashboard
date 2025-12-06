import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('=== Adding new columns to nfl_team_rankings ===')

    // First, let's see the current schema
    const schema = await clickhouseQuery(`DESCRIBE TABLE nfl_team_rankings`)
    console.log('Current columns:', schema.data.map((c: any) => c.name))

    // New columns to add:
    // 1. Win percentage
    // 2. Position-specific rankings (defense vs WR/TE/RB, offense WR/TE/RB production)
    
    const newColumns = [
      // Win percentage
      { name: 'wins', type: 'UInt8', default: '0' },
      { name: 'losses', type: 'UInt8', default: '0' },
      { name: 'win_pct', type: 'Float32', default: '0' },
      
      // Position-specific DEFENSIVE rankings (yards allowed TO that position)
      { name: 'yards_allowed_to_wr', type: 'Float32', default: '0' },
      { name: 'rank_yards_allowed_to_wr', type: 'UInt8', default: '0' },
      { name: 'yards_allowed_to_te', type: 'Float32', default: '0' },
      { name: 'rank_yards_allowed_to_te', type: 'UInt8', default: '0' },
      { name: 'yards_allowed_to_rb', type: 'Float32', default: '0' },
      { name: 'rank_yards_allowed_to_rb', type: 'UInt8', default: '0' },
      
      // Position-specific OFFENSIVE rankings (yards produced BY that position)
      { name: 'wr_yards_produced', type: 'Float32', default: '0' },
      { name: 'rank_wr_yards_produced', type: 'UInt8', default: '0' },
      { name: 'te_yards_produced', type: 'Float32', default: '0' },
      { name: 'rank_te_yards_produced', type: 'UInt8', default: '0' },
      { name: 'rb_yards_produced', type: 'Float32', default: '0' },
      { name: 'rank_rb_yards_produced', type: 'UInt8', default: '0' },
    ]

    const existingColumns = new Set(schema.data.map((c: any) => c.name))
    const addedColumns: string[] = []
    const skippedColumns: string[] = []

    for (const col of newColumns) {
      if (existingColumns.has(col.name)) {
        skippedColumns.push(col.name)
        console.log(`Column ${col.name} already exists, skipping`)
        continue
      }

      try {
        await clickhouseCommand(
          `ALTER TABLE nfl_team_rankings ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} DEFAULT ${col.default}`
        )
        addedColumns.push(col.name)
        console.log(`✅ Added column: ${col.name}`)
      } catch (err) {
        console.error(`Failed to add column ${col.name}:`, err)
      }
    }

    // Verify the new schema
    const newSchema = await clickhouseQuery(`DESCRIBE TABLE nfl_team_rankings`)
    
    return NextResponse.json({
      success: true,
      message: 'Schema update complete',
      addedColumns,
      skippedColumns,
      totalColumns: newSchema.data.length,
      allColumns: newSchema.data.map((c: any) => ({ name: c.name, type: c.type }))
    })

  } catch (error) {
    console.error('Error updating schema:', error)
    return NextResponse.json({ 
      error: 'Failed to update schema', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

