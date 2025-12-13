import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    const results: { step: string; status: string; error?: string }[] = []

    // Step 1: Add is_opening flag to track true opening lines
    try {
      await clickhouseCommand(`
        ALTER TABLE live_odds_snapshots 
        ADD COLUMN IF NOT EXISTS is_opening UInt8 DEFAULT 0
      `)
      results.push({ step: 'Add is_opening column', status: 'success' })
    } catch (e: any) {
      results.push({ step: 'Add is_opening column', status: 'skipped', error: e.message })
    }

    // Step 2: Add columns for storing all bookmaker data as JSON
    try {
      await clickhouseCommand(`
        ALTER TABLE live_odds_snapshots 
        ADD COLUMN IF NOT EXISTS all_books_spreads String DEFAULT '{}'
      `)
      await clickhouseCommand(`
        ALTER TABLE live_odds_snapshots 
        ADD COLUMN IF NOT EXISTS all_books_totals String DEFAULT '{}'
      `)
      await clickhouseCommand(`
        ALTER TABLE live_odds_snapshots 
        ADD COLUMN IF NOT EXISTS all_books_ml String DEFAULT '{}'
      `)
      await clickhouseCommand(`
        ALTER TABLE live_odds_snapshots 
        ADD COLUMN IF NOT EXISTS bookmaker_count UInt8 DEFAULT 0
      `)
      results.push({ step: 'Add all_books columns', status: 'success' })
    } catch (e: any) {
      results.push({ step: 'Add all_books columns', status: 'skipped', error: e.message })
    }

    // Step 3: Create a table to track which games we've seen (for opening detection)
    try {
      await clickhouseCommand(`
        CREATE TABLE IF NOT EXISTS game_first_seen (
          odds_api_game_id String,
          sport LowCardinality(String),
          first_seen_time DateTime,
          opening_spread Float32,
          opening_total Float32,
          opening_ml_home Int16,
          opening_ml_away Int16,
          bookmaker_count UInt8
        ) ENGINE = ReplacingMergeTree()
        ORDER BY odds_api_game_id
      `)
      results.push({ step: 'Create game_first_seen table', status: 'success' })
    } catch (e: any) {
      results.push({ step: 'Create game_first_seen table', status: 'skipped', error: e.message })
    }

    // Step 4: Check current state
    const countQuery = await clickhouseQuery<any>(`
      SELECT 
        count() as total_snapshots,
        countDistinct(odds_api_game_id) as unique_games,
        min(snapshot_time) as first_snapshot,
        max(snapshot_time) as last_snapshot
      FROM live_odds_snapshots
    `)

    return NextResponse.json({
      success: true,
      message: 'Live odds table enhanced',
      results,
      currentState: countQuery.data?.[0]
    })

  } catch (error: any) {
    console.error('Error enhancing live odds:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

