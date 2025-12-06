import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('=== Upgrading nfl_upcoming_games schema ===')

    // Check current schema
    const currentSchema = await clickhouseQuery(`DESCRIBE TABLE nfl_upcoming_games`)
    const existingColumns = new Set(currentSchema.data.map((c: any) => c.name))
    console.log('Current columns:', existingColumns.size)

    // New columns to add
    const newColumns = [
      // Win percentage
      { name: 'home_win_pct', type: 'Float32', default: '0' },
      { name: 'away_win_pct', type: 'Float32', default: '0' },
      { name: 'home_wins', type: 'UInt8', default: '0' },
      { name: 'home_losses', type: 'UInt8', default: '0' },
      { name: 'away_wins', type: 'UInt8', default: '0' },
      { name: 'away_losses', type: 'UInt8', default: '0' },
      
      // Position-specific DEFENSIVE rankings (for "vs WR/TE/RB" filters)
      { name: 'home_rank_vs_wr', type: 'UInt8', default: '0' },
      { name: 'home_rank_vs_te', type: 'UInt8', default: '0' },
      { name: 'home_rank_vs_rb', type: 'UInt8', default: '0' },
      { name: 'away_rank_vs_wr', type: 'UInt8', default: '0' },
      { name: 'away_rank_vs_te', type: 'UInt8', default: '0' },
      { name: 'away_rank_vs_rb', type: 'UInt8', default: '0' },
      
      // Position-specific OFFENSIVE rankings (for "WR/TE/RB Production" filters)
      { name: 'home_rank_wr_prod', type: 'UInt8', default: '0' },
      { name: 'home_rank_te_prod', type: 'UInt8', default: '0' },
      { name: 'home_rank_rb_prod', type: 'UInt8', default: '0' },
      { name: 'away_rank_wr_prod', type: 'UInt8', default: '0' },
      { name: 'away_rank_te_prod', type: 'UInt8', default: '0' },
      { name: 'away_rank_rb_prod', type: 'UInt8', default: '0' },
    ]

    const addedColumns: string[] = []
    const skippedColumns: string[] = []

    for (const col of newColumns) {
      if (existingColumns.has(col.name)) {
        skippedColumns.push(col.name)
        continue
      }

      try {
        await clickhouseCommand(
          `ALTER TABLE nfl_upcoming_games ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} DEFAULT ${col.default}`
        )
        addedColumns.push(col.name)
        console.log(`✅ Added column: ${col.name}`)
      } catch (err) {
        console.error(`Failed to add column ${col.name}:`, err)
      }
    }

    // Verify the new schema
    const newSchema = await clickhouseQuery(`DESCRIBE TABLE nfl_upcoming_games`)
    
    return NextResponse.json({
      success: true,
      message: 'Schema upgrade complete',
      addedColumns,
      skippedColumns,
      totalColumns: newSchema.data.length,
      allColumns: newSchema.data.map((c: any) => c.name)
    })

  } catch (error) {
    console.error('Error upgrading schema:', error)
    return NextResponse.json({ 
      error: 'Failed to upgrade schema', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

