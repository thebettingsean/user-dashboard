/**
 * Delete NBA games without valid espn_game_id
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
  const { clickhouseQuery, clickhouseCommand } = await import('../lib/clickhouse')

  console.log('=== Deleting Invalid NBA Games ===\n')

  // Count before
  const before = await clickhouseQuery(`
    SELECT 
      count(*) as total,
      count(CASE WHEN espn_game_id = '' OR espn_game_id = '0' OR espn_game_id IS NULL THEN 1 END) as invalid_count,
      count(CASE WHEN espn_game_id != '' AND espn_game_id != '0' THEN 1 END) as valid_count
    FROM nba_games
  `)

  const stats = before.data[0]
  console.log('📊 Before deletion:')
  console.log(`  Total rows: ${stats?.total || 0}`)
  console.log(`  Valid (with espn_game_id): ${stats?.valid_count || 0}`)
  console.log(`  Invalid (no espn_game_id): ${stats?.invalid_count || 0}`)
  console.log()

  if (!stats?.invalid_count || stats.invalid_count === 0) {
    console.log('✅ No invalid games to delete!')
    return
  }

  console.log(`🗑️  Deleting ${stats.invalid_count} rows without valid espn_game_id...`)
  
  await clickhouseCommand(`
    ALTER TABLE nba_games
    DELETE WHERE espn_game_id = '' OR espn_game_id = '0' OR espn_game_id IS NULL
  `)

  console.log('  ✅ Deletion command executed')
  console.log()

  // Wait a moment for deletion to process
  console.log('⏳ Waiting for deletion to complete...')
  await new Promise(resolve => setTimeout(resolve, 3000))

  // Count after
  const after = await clickhouseQuery(`
    SELECT 
      count(*) as total,
      count(CASE WHEN espn_game_id = '' OR espn_game_id = '0' OR espn_game_id IS NULL THEN 1 END) as invalid_count,
      count(CASE WHEN espn_game_id != '' AND espn_game_id != '0' THEN 1 END) as valid_count
    FROM nba_games
  `)

  const afterStats = after.data[0]
  console.log('📊 After deletion:')
  console.log(`  Total rows: ${afterStats?.total || 0}`)
  console.log(`  Valid (with espn_game_id): ${afterStats?.valid_count || 0}`)
  console.log(`  Invalid (no espn_game_id): ${afterStats?.invalid_count || 0}`)
  console.log()

  // Show breakdown by season
  const bySeason = await clickhouseQuery(`
    SELECT 
      season,
      count(*) as games
    FROM nba_games
    GROUP BY season
    ORDER BY season DESC
  `)

  console.log('📅 Games by Season (after cleanup):')
  bySeason.data.forEach((row: any) => {
    console.log(`  Season ${row.season}: ${row.games} games`)
  })
  console.log()

  console.log('✅ Cleanup complete!')
}

main().catch(console.error)

