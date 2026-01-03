/**
 * Swap NBA props tables - replace original with deduplicated version
 * Usage: npx tsx scripts/swap-nba-props-tables.ts
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

  console.log('=== Swapping NBA Props Tables ===\n')

  // Check deduplicated table exists
  const check = await clickhouseQuery(`
    SELECT count() as cnt FROM nba_prop_lines_deduped
  `)
  
  if (!check.data[0]?.cnt || check.data[0].cnt === 0) {
    console.error('❌ Deduplicated table is empty! Run dedupe-nba-props.ts first.')
    process.exit(1)
  }

  console.log(`✅ Deduplicated table has ${check.data[0].cnt} lines`)
  console.log()

  // Backup original
  console.log('📦 Backing up original table...')
  await clickhouseCommand('DROP TABLE IF EXISTS nba_prop_lines_backup')
  await clickhouseCommand('RENAME TABLE nba_prop_lines TO nba_prop_lines_backup')
  console.log('  ✅ Original backed up as nba_prop_lines_backup')
  console.log()

  // Swap
  console.log('🔄 Swapping tables...')
  await clickhouseCommand('RENAME TABLE nba_prop_lines_deduped TO nba_prop_lines')
  console.log('  ✅ Tables swapped!')
  console.log()

  // Verify
  const finalStats = await clickhouseQuery(`
    SELECT 
      count() as total_lines,
      countDistinct(bookmaker) as unique_bookmakers,
      countDistinct(CASE WHEN espn_game_id > 0 THEN toString(espn_game_id) END) as games_with_props
    FROM nba_prop_lines
  `)

  const stats = finalStats.data[0]
  console.log('📊 Final stats:')
  console.log(`  Total lines: ${stats?.total_lines || 0}`)
  console.log(`  Unique bookmakers: ${stats?.unique_bookmakers || 0}`)
  console.log(`  Games with props: ${stats?.games_with_props || 0}`)
  console.log()
  console.log('✅ Done! Original table backed up as nba_prop_lines_backup')
}

main().catch(console.error)

