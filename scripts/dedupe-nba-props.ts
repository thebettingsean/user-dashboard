/**
 * Deduplicate NBA Prop Lines
 * - Remove props from bookmakers NOT in priority list
 * - Keep only 1 line per player/prop/game (highest priority bookmaker)
 * 
 * Usage: npx tsx scripts/dedupe-nba-props.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// Load environment variables FIRST
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=:#]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let value = match[2].trim()
        value = value.replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    }
  })
}

async function main() {
  const { clickhouseQuery, clickhouseCommand } = await import('../lib/clickhouse')

  // Bookmaker priority (same as NFL)
  const BOOKMAKER_PRIORITY = [
    'fanduel', 'draftkings', 'betmgm', 'williamhill_us', 'betrivers',
    'fanatics', 'bovada', 'pointsbetus', 'barstool', 'betonlineag', 'unibet_us'
  ]

  console.log('=== NBA Props Deduplication ===\n')

  // Step 1: Get current stats
  console.log('📊 Getting current stats...')
  const beforeStats = await clickhouseQuery(`
    SELECT 
      count() as total_lines,
      countDistinct(bookmaker) as unique_bookmakers,
      countDistinct(CASE WHEN espn_game_id > 0 THEN toString(espn_game_id) END) as games_with_props
    FROM nba_prop_lines
  `)

  const before = beforeStats.data[0]
  console.log(`  Total lines: ${before?.total_lines || 0}`)
  console.log(`  Unique bookmakers: ${before?.unique_bookmakers || 0}`)
  console.log(`  Games with props: ${before?.games_with_props || 0}`)
  console.log()

  // Step 2: Count lines from non-priority bookmakers
  const nonPriorityCount = await clickhouseQuery(`
    SELECT count() as cnt
    FROM nba_prop_lines
    WHERE lower(bookmaker) NOT IN (${BOOKMAKER_PRIORITY.map(b => `'${b}'`).join(', ')})
  `)
  console.log(`📋 Non-priority bookmakers: ${nonPriorityCount.data[0]?.cnt || 0} lines to remove`)
  console.log()

  // Step 3: Count duplicates (multiple bookmakers per player/prop/game)
  const duplicatesCount = await clickhouseQuery(`
    SELECT 
      count() - countDistinct(
        concat(toString(espn_game_id), '_', player_name, '_', prop_type)
      ) as duplicate_count
    FROM nba_prop_lines
    WHERE espn_game_id > 0
  `)
  console.log(`🔄 Duplicate props (multiple books): ${duplicatesCount.data[0]?.duplicate_count || 0} lines to remove`)
  console.log()

  // Step 4: Delete non-priority bookmakers first
  console.log('🗑️  Removing non-priority bookmakers...')
  await clickhouseCommand(`
    ALTER TABLE nba_prop_lines
    DELETE WHERE lower(bookmaker) NOT IN (${BOOKMAKER_PRIORITY.map(b => `'${b}'`).join(', ')})
  `)
  console.log('  ✅ Non-priority bookmakers removed')
  console.log()

  // Step 5: Create temporary table with deduplicated data
  console.log('📦 Creating deduplicated data...')
  
  // We'll use a query to identify rows to delete
  // Strategy: Keep row with lowest priority number (highest priority bookmaker)
  const deleteRowsQuery = `
    ALTER TABLE nba_prop_lines
    DELETE WHERE (
      espn_game_id,
      player_name,
      prop_type,
      bookmaker,
      line,
      snapshot_time
    ) NOT IN (
      SELECT 
        espn_game_id,
        player_name,
        prop_type,
        bookmaker,
        line,
        snapshot_time
      FROM (
        SELECT 
          *,
          ROW_NUMBER() OVER (
            PARTITION BY espn_game_id, player_name, prop_type
            ORDER BY multiIf(
              lower(bookmaker) = 'fanduel', 1,
              lower(bookmaker) = 'draftkings', 2,
              lower(bookmaker) = 'betmgm', 3,
              lower(bookmaker) = 'williamhill_us', 4,
              lower(bookmaker) = 'betrivers', 5,
              lower(bookmaker) = 'fanatics', 6,
              lower(bookmaker) = 'bovada', 7,
              lower(bookmaker) = 'pointsbetus', 8,
              lower(bookmaker) = 'barstool', 9,
              lower(bookmaker) = 'betonlineag', 10,
              lower(bookmaker) = 'unibet_us', 11,
              99
            ) ASC
          ) as rn
        FROM nba_prop_lines
        WHERE espn_game_id > 0
      )
      WHERE rn = 1
    )
  `

  // Actually, ClickHouse DELETE doesn't support NOT IN with tuples like this
  // Let's use a different approach - create a temp table, then swap
  
  console.log('  Creating temporary deduplicated table...')
  await clickhouseCommand(`
    CREATE TABLE IF NOT EXISTS nba_prop_lines_deduped AS nba_prop_lines
    ENGINE = ReplacingMergeTree()
    ORDER BY (espn_game_id, player_name, prop_type, line)
  `)

  await clickhouseCommand(`
    INSERT INTO nba_prop_lines_deduped
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
          PARTITION BY espn_game_id, player_name, prop_type
          ORDER BY multiIf(
            lower(bookmaker) = 'fanduel', 1,
            lower(bookmaker) = 'draftkings', 2,
            lower(bookmaker) = 'betmgm', 3,
            lower(bookmaker) = 'williamhill_us', 4,
            lower(bookmaker) = 'betrivers', 5,
            lower(bookmaker) = 'fanatics', 6,
            lower(bookmaker) = 'bovada', 7,
            lower(bookmaker) = 'pointsbetus', 8,
            lower(bookmaker) = 'barstool', 9,
            lower(bookmaker) = 'betonlineag', 10,
            lower(bookmaker) = 'unibet_us', 11,
            99
          ) ASC
        ) as rn
      FROM nba_prop_lines
      WHERE espn_game_id > 0
        AND lower(bookmaker) IN (${BOOKMAKER_PRIORITY.map(b => `'${b}'`).join(', ')})
    )
    WHERE rn = 1
    
    UNION ALL
    
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
    FROM nba_prop_lines
    WHERE espn_game_id = 0  -- Keep unmatched props as-is
  `)

  console.log('  ✅ Deduplicated data created')
  console.log()

  // Step 6: Get stats from deduplicated table
  const afterStats = await clickhouseQuery(`
    SELECT 
      count() as total_lines,
      countDistinct(bookmaker) as unique_bookmakers,
      countDistinct(CASE WHEN espn_game_id > 0 THEN toString(espn_game_id) END) as games_with_props
    FROM nba_prop_lines_deduped
  `)

  const after = afterStats.data[0]
  console.log('📊 After deduplication:')
  console.log(`  Total lines: ${after?.total_lines || 0}`)
  console.log(`  Unique bookmakers: ${after?.unique_bookmakers || 0}`)
  console.log(`  Games with props: ${after?.games_with_props || 0}`)
  console.log()

  // Step 7: Bookmaker distribution
  const bookmakerDist = await clickhouseQuery(`
    SELECT bookmaker, count() as cnt
    FROM nba_prop_lines_deduped
    WHERE espn_game_id > 0
    GROUP BY bookmaker
    ORDER BY cnt DESC
  `)

  console.log('📚 Bookmaker distribution:')
  bookmakerDist.data.forEach((row: any) => {
    console.log(`  ${row.bookmaker}: ${row.cnt} lines`)
  })
  console.log()

  const reduction = ((before?.total_lines || 0) - (after?.total_lines || 0))
  const reductionPct = before?.total_lines ? ((reduction / before.total_lines) * 100).toFixed(1) : '0'

  console.log('✅ Deduplication complete!')
  console.log(`   Removed: ${reduction} lines (${reductionPct}%)`)
  console.log()
  console.log('⚠️  Next step: Review the deduplicated table, then run:')
  console.log('   DROP TABLE IF EXISTS nba_prop_lines_backup;')
  console.log('   RENAME TABLE nba_prop_lines TO nba_prop_lines_backup;')
  console.log('   RENAME TABLE nba_prop_lines_deduped TO nba_prop_lines;')
}

main().catch(console.error)

