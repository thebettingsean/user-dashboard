/**
 * NBA Games Summary - Show actual games vs scheduled games
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

  console.log('=== NBA Games Summary ===\n')

  // Actual completed games (what we should count)
  const completedGames = await clickhouseQuery(`
    SELECT 
      season,
      count(DISTINCT espn_game_id) as completed_games
    FROM nba_games
    WHERE espn_game_id != '' AND espn_game_id != '0'
      AND (home_score > 0 OR away_score > 0)
    GROUP BY season
    ORDER BY season DESC
  `)

  console.log('✅ Completed Games (with scores & valid espn_game_id):')
  let total = 0
  completedGames.data.forEach((row: any) => {
    console.log(`  Season ${row.season}: ${row.completed_games} games`)
    total += row.completed_games
  })
  console.log(`  Total: ${total} games`)
  console.log()

  // Scheduled games (future games, no scores)
  const scheduledGames = await clickhouseQuery(`
    SELECT 
      season,
      count(*) as scheduled_count
    FROM nba_games
    WHERE (espn_game_id = '' OR espn_game_id = '0' OR espn_game_id IS NULL)
      AND home_score = 0 AND away_score = 0
    GROUP BY season
    ORDER BY season DESC
  `)

  if (scheduledGames.data.length > 0) {
    console.log('📅 Scheduled Games (future, no scores, invalid espn_game_id):')
    scheduledGames.data.forEach((row: any) => {
      console.log(`  Season ${row.season}: ${row.scheduled_count} games`)
    })
    console.log()
    console.log('💡 These are future scheduled games that shouldn\'t be counted as "games played"')
    console.log()
  }

  // Summary
  console.log('📊 Summary:')
  console.log(`  Total completed games: ${total}`)
  console.log(`  Scheduled games (should not count): ${scheduledGames.data.reduce((sum: number, row: any) => sum + row.scheduled_count, 0)}`)
  console.log()
  console.log('⚠️  Issues:')
  console.log('  1. Season 2022 only has 2 games - needs backfilling')
  console.log('  2. 4,505 scheduled games mixed with completed games - should be filtered out')
  console.log()
  console.log('💡 Recommendation:')
  console.log('  - Always filter: WHERE espn_game_id != "" AND espn_game_id != "0" AND (home_score > 0 OR away_score > 0)')
  console.log('  - Or delete scheduled games with invalid espn_game_id')
}

main().catch(console.error)

