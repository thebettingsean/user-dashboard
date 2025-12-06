import { NextResponse } from 'next/server'

const CLICKHOUSE_HOST = process.env.CLICKHOUSE_HOST!
const CLICKHOUSE_KEY_ID = process.env.CLICKHOUSE_KEY_ID!
const CLICKHOUSE_KEY_SECRET = process.env.CLICKHOUSE_KEY_SECRET!

async function executeQuery(sql: string): Promise<any> {
  const response = await fetch(CLICKHOUSE_HOST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${CLICKHOUSE_KEY_ID}:${CLICKHOUSE_KEY_SECRET}`).toString('base64')}`
    },
    body: JSON.stringify({
      query: sql,
      format: 'JSONEachRow'
    })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`ClickHouse error: ${text}`)
  }

  const text = await response.text()
  if (!text.trim()) return []
  
  return text.trim().split('\n').map(line => JSON.parse(line))
}

export async function GET() {
  try {
    const results: string[] = []

    // 1. Create nfl_upcoming_games table
    console.log('Creating nfl_upcoming_games table...')
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS nfl_upcoming_games (
        game_id String,
        espn_game_id String DEFAULT '',
        sport String DEFAULT 'nfl',
        game_time DateTime,
        home_team_id UInt32,
        away_team_id UInt32,
        home_team_name String,
        away_team_name String,
        home_team_abbr String DEFAULT '',
        away_team_abbr String DEFAULT '',
        is_division_game UInt8 DEFAULT 0,
        is_conference_game UInt8 DEFAULT 0,
        season UInt16,
        week UInt8,
        season_type String DEFAULT 'regular',
        
        -- Pre-calculated team rankings (current as of sync)
        home_offense_rank UInt8 DEFAULT 0,
        home_defense_rank UInt8 DEFAULT 0,
        home_pass_offense_rank UInt8 DEFAULT 0,
        home_rush_offense_rank UInt8 DEFAULT 0,
        home_pass_defense_rank UInt8 DEFAULT 0,
        home_rush_defense_rank UInt8 DEFAULT 0,
        away_offense_rank UInt8 DEFAULT 0,
        away_defense_rank UInt8 DEFAULT 0,
        away_pass_offense_rank UInt8 DEFAULT 0,
        away_rush_offense_rank UInt8 DEFAULT 0,
        away_pass_defense_rank UInt8 DEFAULT 0,
        away_rush_defense_rank UInt8 DEFAULT 0,
        
        -- Momentum (current streaks and margins)
        home_streak Int8 DEFAULT 0,
        away_streak Int8 DEFAULT 0,
        home_prev_margin Int16 DEFAULT 0,
        away_prev_margin Int16 DEFAULT 0,
        
        created_at DateTime DEFAULT now(),
        updated_at DateTime DEFAULT now()
      ) ENGINE = ReplacingMergeTree(updated_at)
      ORDER BY (game_id)
    `)
    results.push('✅ Created nfl_upcoming_games')

    // 2. Create nfl_line_snapshots table (full line history)
    console.log('Creating nfl_line_snapshots table...')
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS nfl_line_snapshots (
        game_id String,
        snapshot_time DateTime,
        bookmaker String,
        bookmaker_title String DEFAULT '',
        
        -- Spreads
        home_spread Float32 DEFAULT 0,
        home_spread_odds Int16 DEFAULT 0,
        away_spread Float32 DEFAULT 0,
        away_spread_odds Int16 DEFAULT 0,
        
        -- Totals
        total_line Float32 DEFAULT 0,
        over_odds Int16 DEFAULT 0,
        under_odds Int16 DEFAULT 0,
        
        -- Moneylines
        home_ml Int16 DEFAULT 0,
        away_ml Int16 DEFAULT 0,
        
        -- Metadata
        is_opening UInt8 DEFAULT 0,
        
        INDEX idx_game (game_id) TYPE bloom_filter GRANULARITY 1,
        INDEX idx_bookmaker (bookmaker) TYPE bloom_filter GRANULARITY 1
      ) ENGINE = MergeTree()
      ORDER BY (game_id, bookmaker, snapshot_time)
      TTL snapshot_time + INTERVAL 30 DAY
    `)
    results.push('✅ Created nfl_line_snapshots')

    // 3. Create nfl_prop_line_snapshots table
    console.log('Creating nfl_prop_line_snapshots table...')
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS nfl_prop_line_snapshots (
        game_id String,
        snapshot_time DateTime,
        player_name String,
        player_id UInt32 DEFAULT 0,
        team_name String DEFAULT '',
        bookmaker String,
        bookmaker_title String DEFAULT '',
        prop_type String,
        
        line Float32,
        over_odds Int16 DEFAULT 0,
        under_odds Int16 DEFAULT 0,
        
        is_opening UInt8 DEFAULT 0,
        
        INDEX idx_game (game_id) TYPE bloom_filter GRANULARITY 1,
        INDEX idx_player (player_name) TYPE bloom_filter GRANULARITY 1,
        INDEX idx_prop_type (prop_type) TYPE bloom_filter GRANULARITY 1
      ) ENGINE = MergeTree()
      ORDER BY (game_id, player_name, prop_type, bookmaker, snapshot_time)
      TTL snapshot_time + INTERVAL 30 DAY
    `)
    results.push('✅ Created nfl_prop_line_snapshots')

    // 4. Create a view for easy querying of current + opening lines
    console.log('Creating current lines view...')
    await executeQuery(`
      CREATE VIEW IF NOT EXISTS nfl_current_lines AS
      SELECT 
        game_id,
        bookmaker,
        bookmaker_title,
        home_spread,
        home_spread_odds,
        away_spread,
        away_spread_odds,
        total_line,
        over_odds,
        under_odds,
        home_ml,
        away_ml,
        snapshot_time
      FROM nfl_line_snapshots
      WHERE (game_id, bookmaker, snapshot_time) IN (
        SELECT game_id, bookmaker, max(snapshot_time)
        FROM nfl_line_snapshots
        GROUP BY game_id, bookmaker
      )
    `)
    results.push('✅ Created nfl_current_lines view')

    // 5. Create opening lines view
    console.log('Creating opening lines view...')
    await executeQuery(`
      CREATE VIEW IF NOT EXISTS nfl_opening_lines AS
      SELECT 
        game_id,
        bookmaker,
        bookmaker_title,
        home_spread as opening_spread,
        total_line as opening_total,
        home_ml as opening_home_ml,
        away_ml as opening_away_ml,
        snapshot_time as opened_at
      FROM nfl_line_snapshots
      WHERE is_opening = 1
    `)
    results.push('✅ Created nfl_opening_lines view')

    // Verify tables
    const tables = await executeQuery(`
      SELECT name, engine 
      FROM system.tables 
      WHERE database = currentDatabase() 
        AND name LIKE '%upcoming%' OR name LIKE '%snapshot%' OR name LIKE '%lines%'
      ORDER BY name
    `)

    return NextResponse.json({
      success: true,
      results,
      tables: tables.map((t: any) => ({ name: t.name, engine: t.engine }))
    })

  } catch (error) {
    console.error('Error creating tables:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

