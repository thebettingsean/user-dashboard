/**
 * Verify NBA props deduplication - ensure only one bookmaker per player/prop/game
 */

import * as fs from 'fs'
import * as path from 'path'

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
  const { clickhouseQuery } = await import('../lib/clickhouse')

  console.log('=== Verifying NBA Props Deduplication ===\n')

  // Check for any duplicates (multiple bookmakers per player/prop/game)
  const duplicates = await clickhouseQuery(`
    SELECT 
      espn_game_id,
      player_name,
      prop_type,
      count() as bookmaker_count,
      groupArray(bookmaker) as bookmakers
    FROM nba_prop_lines
    WHERE espn_game_id > 0
    GROUP BY espn_game_id, player_name, prop_type
    HAVING bookmaker_count > 1
    LIMIT 10
  `)

  if (duplicates.data.length > 0) {
    console.log('❌ Found duplicates:')
    duplicates.data.forEach((row: any) => {
      console.log(`  Game ${row.espn_game_id}, ${row.player_name}, ${row.prop_type}: ${row.bookmakers.join(', ')}`)
    })
    console.log()
  } else {
    console.log('✅ No duplicates found - each player/prop/game has only one bookmaker')
    console.log()
  }

  // Check bookmaker distribution
  const bookmakerDist = await clickhouseQuery(`
    SELECT 
      bookmaker,
      count() as lines,
      countDistinct(espn_game_id) as games
    FROM nba_prop_lines
    WHERE espn_game_id > 0
    GROUP BY bookmaker
    ORDER BY lines DESC
  `)

  console.log('📚 Bookmaker distribution:')
  bookmakerDist.data.forEach((row: any) => {
    console.log(`  ${row.bookmaker}: ${row.lines} lines, ${row.games} games`)
  })
  console.log()

  // Check for non-priority bookmakers
  const BOOKMAKER_PRIORITY = [
    'fanduel', 'draftkings', 'betmgm', 'williamhill_us', 'betrivers',
    'fanatics', 'bovada', 'pointsbetus', 'barstool', 'betonlineag', 'unibet_us'
  ]

  const nonPriority = await clickhouseQuery(`
    SELECT DISTINCT bookmaker
    FROM nba_prop_lines
    WHERE espn_game_id > 0
      AND lower(bookmaker) NOT IN (${BOOKMAKER_PRIORITY.map(b => `'${b}'`).join(', ')})
  `)

  if (nonPriority.data.length > 0) {
    console.log('⚠️  Non-priority bookmakers still present:')
    nonPriority.data.forEach((row: any) => {
      console.log(`  ${row.bookmaker}`)
    })
  } else {
    console.log('✅ Only priority bookmakers present')
  }
  console.log()

  // Final stats
  const stats = await clickhouseQuery(`
    SELECT 
      count() as total_lines,
      countDistinct(espn_game_id) as games_with_props,
      countDistinct(player_name) as unique_players
    FROM nba_prop_lines
    WHERE espn_game_id > 0
  `)

  const s = stats.data[0]
  console.log('📊 Final stats:')
  console.log(`  Total prop lines: ${s?.total_lines || 0}`)
  console.log(`  Games with props: ${s?.games_with_props || 0}`)
  console.log(`  Unique players: ${s?.unique_players || 0}`)
}

main().catch(console.error)

