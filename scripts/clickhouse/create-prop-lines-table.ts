/**
 * Create NFL Prop Lines Table
 * Stores all historical prop lines (main + alternates) from The Odds API
 * Data available from May 3rd, 2023 onwards
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { clickhouseQuery } from '../../lib/clickhouse'

async function createPropLinesTable() {
  console.log('Creating nfl_prop_lines table...')
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS nfl_prop_lines (
      -- Game & Player identifiers
      game_id String,                    -- Odds API event ID
      espn_game_id UInt32 DEFAULT 0,     -- ESPN game ID for joining with box scores
      player_name String,                -- Player name from Odds API
      espn_player_id UInt32 DEFAULT 0,   -- ESPN player ID for joining
      
      -- Prop details
      prop_type String,                  -- Market key (e.g., 'player_pass_yds')
      line Float32,                      -- The line value (e.g., 274.5)
      over_odds Int16 DEFAULT 0,         -- American odds for over
      under_odds Int16 DEFAULT 0,        -- American odds for under
      
      -- Metadata
      bookmaker String,                  -- e.g., 'draftkings', 'fanduel'
      snapshot_time DateTime,            -- When this line was captured
      game_time DateTime,                -- Game start time
      season UInt16,                     -- NFL season year
      week UInt8,                        -- NFL week number
      
      -- Home/Away teams for context
      home_team String,
      away_team String
    )
    ENGINE = ReplacingMergeTree()
    ORDER BY (game_id, player_name, prop_type, line, bookmaker)
    SETTINGS index_granularity = 8192
  `
  
  await clickhouseQuery(createTableSQL)
  console.log('✅ nfl_prop_lines table created!')
  
  // Show table structure
  const describe = await clickhouseQuery('DESCRIBE nfl_prop_lines')
  console.log('\nTable structure:')
  console.table(describe)
}

createPropLinesTable()
  .then(() => {
    console.log('\n🎉 Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })

