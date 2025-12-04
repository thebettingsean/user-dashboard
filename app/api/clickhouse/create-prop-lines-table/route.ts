/**
 * Create NFL Prop Lines Table
 * POST /api/clickhouse/create-prop-lines-table
 */

import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function POST() {
  try {
    console.log('Creating nfl_prop_lines table...')
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS nfl_prop_lines (
        -- Game & Player identifiers
        game_id String,
        espn_game_id UInt32 DEFAULT 0,
        player_name String,
        espn_player_id UInt32 DEFAULT 0,
        
        -- Prop details
        prop_type String,
        line Float32,
        over_odds Int16 DEFAULT 0,
        under_odds Int16 DEFAULT 0,
        
        -- Metadata
        bookmaker String,
        snapshot_time DateTime,
        game_time DateTime,
        season UInt16,
        week UInt8,
        
        -- Home/Away teams for context
        home_team String,
        away_team String
      )
      ENGINE = ReplacingMergeTree()
      ORDER BY (game_id, player_name, prop_type, line, bookmaker)
      SETTINGS index_granularity = 8192
    `
    
    await clickhouseQuery(createTableSQL)
    
    // Verify
    const describe = await clickhouseQuery('DESCRIBE nfl_prop_lines')
    
    return NextResponse.json({
      success: true,
      message: 'nfl_prop_lines table created!',
      columns: describe
    })
    
  } catch (error: any) {
    console.error('Error creating table:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const count = await clickhouseQuery('SELECT count() as cnt, countDistinct(player_name) as unique_players, countDistinct(prop_type) as prop_types, countDistinct(game_id) as games FROM nfl_prop_lines')
    const sample = await clickhouseQuery('SELECT * FROM nfl_prop_lines LIMIT 5')
    const propTypes = await clickhouseQuery('SELECT prop_type, count() as cnt FROM nfl_prop_lines GROUP BY prop_type ORDER BY cnt DESC')
    
    return NextResponse.json({
      total_lines: count.data[0]?.cnt || 0,
      unique_players: count.data[0]?.unique_players || 0,
      prop_types: count.data[0]?.prop_types || 0,
      games: count.data[0]?.games || 0,
      prop_type_breakdown: propTypes.data,
      sample: sample.data
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

