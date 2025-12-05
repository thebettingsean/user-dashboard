/**
 * Deduplicate NFL Prop Lines - Keep only 1 line per player/prop/game
 * Uses bookmaker priority cascade:
 * 1. FanDuel, 2. DraftKings, 3. BetMGM, 4. Williamhill, 5. BetRivers,
 * 6. Fanatics, 7. Bovada, 8. Pointsbetus, 9. Barstool, 10. Betonlineag, 11. Unibet
 */

import { NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

export const maxDuration = 300

// Bookmaker priority (lower = higher priority)
const BOOKMAKER_PRIORITY: Record<string, number> = {
  'fanduel': 1,
  'draftkings': 2,
  'betmgm': 3,
  'williamhill_us': 4,
  'betrivers': 5,
  'fanatics': 6,
  'bovada': 7,
  'pointsbetus': 8,
  'barstool': 9,
  'betonlineag': 10,
  'unibet_us': 11,
}

export async function POST() {
  try {
    console.log('Starting prop lines deduplication...')
    
    // Step 1: Get current counts
    const beforeCount = await clickhouseQuery(`
      SELECT count() as cnt FROM nfl_prop_lines
    `)
    console.log(`Before: ${beforeCount.data[0]?.cnt} lines`)
    
    // Step 2: Create a new deduplicated table
    console.log('Creating deduplicated table...')
    
    await clickhouseCommand(`
      CREATE TABLE IF NOT EXISTS nfl_prop_lines_deduped (
        game_id String,
        espn_game_id UInt32 DEFAULT 0,
        player_name String,
        espn_player_id UInt32 DEFAULT 0,
        prop_type String,
        line Float32,
        over_odds Int16 DEFAULT 0,
        under_odds Int16 DEFAULT 0,
        bookmaker String,
        snapshot_time DateTime,
        game_time DateTime,
        season UInt16,
        week UInt8,
        home_team String,
        away_team String
      )
      ENGINE = ReplacingMergeTree()
      ORDER BY (game_id, player_name, prop_type)
      SETTINGS index_granularity = 8192
    `)
    
    // Step 3: Insert deduplicated data using priority
    // We use argMin to get the row with the lowest priority (best bookmaker)
    console.log('Inserting deduplicated data with bookmaker priority...')
    
    // Create priority column first, then select best row per group
    await clickhouseCommand(`
      INSERT INTO nfl_prop_lines_deduped
      SELECT 
        game_id,
        espn_game_id,
        player_name,
        espn_player_id,
        prop_type,
        line,
        over_odds,
        under_odds,
        bookmaker,
        snapshot_time,
        game_time,
        season,
        week,
        home_team,
        away_team
      FROM (
        SELECT 
          *,
          ROW_NUMBER() OVER (
            PARTITION BY game_id, player_name, prop_type 
            ORDER BY multiIf(
              bookmaker = 'fanduel', 1,
              bookmaker = 'draftkings', 2,
              bookmaker = 'betmgm', 3,
              bookmaker = 'williamhill_us', 4,
              bookmaker = 'betrivers', 5,
              bookmaker = 'fanatics', 6,
              bookmaker = 'bovada', 7,
              bookmaker = 'pointsbetus', 8,
              bookmaker = 'barstool', 9,
              bookmaker = 'betonlineag', 10,
              bookmaker = 'unibet_us', 11,
              99
            ) ASC
          ) as rn
        FROM nfl_prop_lines
      )
      WHERE rn = 1
    `)
    
    // Step 4: Get new counts
    const afterCount = await clickhouseQuery(`
      SELECT count() as cnt FROM nfl_prop_lines_deduped
    `)
    console.log(`After: ${afterCount.data[0]?.cnt} lines`)
    
    // Step 5: Verify bookmaker distribution
    const bookmakers = await clickhouseQuery(`
      SELECT bookmaker, count() as cnt 
      FROM nfl_prop_lines_deduped 
      GROUP BY bookmaker 
      ORDER BY cnt DESC
    `)
    
    return NextResponse.json({
      success: true,
      before: beforeCount.data[0]?.cnt,
      after: afterCount.data[0]?.cnt,
      reduction: `${(((beforeCount.data[0]?.cnt - afterCount.data[0]?.cnt) / beforeCount.data[0]?.cnt) * 100).toFixed(1)}%`,
      bookmaker_distribution: bookmakers.data,
      next_step: 'Call with ?action=swap to replace the original table'
    })
    
  } catch (error: any) {
    console.error('Deduplication error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Check current state
    const original = await clickhouseQuery(`
      SELECT count() as cnt, countDistinct(bookmaker) as bookmakers
      FROM nfl_prop_lines
    `)
    
    let deduped = { data: [{ cnt: 0 }] }
    try {
      deduped = await clickhouseQuery(`
        SELECT count() as cnt FROM nfl_prop_lines_deduped
      `)
    } catch {
      // Table doesn't exist yet
    }
    
    return NextResponse.json({
      original_table: {
        lines: original.data[0]?.cnt,
        bookmakers: original.data[0]?.bookmakers
      },
      deduped_table: {
        lines: deduped.data[0]?.cnt || 'Not created yet'
      },
      usage: {
        POST: 'Create deduplicated table',
        'POST ?action=swap': 'Replace original with deduplicated table',
        'POST ?action=cleanup': 'Drop the deduped table (if you want to redo)'
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    // Swap tables - drop old, rename new
    console.log('Swapping tables...')
    
    // Drop old table
    await clickhouseCommand('DROP TABLE IF EXISTS nfl_prop_lines_old')
    await clickhouseCommand('RENAME TABLE nfl_prop_lines TO nfl_prop_lines_old')
    await clickhouseCommand('RENAME TABLE nfl_prop_lines_deduped TO nfl_prop_lines')
    
    // Get final count
    const count = await clickhouseQuery('SELECT count() as cnt FROM nfl_prop_lines')
    
    return NextResponse.json({
      success: true,
      message: 'Tables swapped! Original backed up as nfl_prop_lines_old',
      new_line_count: count.data[0]?.cnt
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

