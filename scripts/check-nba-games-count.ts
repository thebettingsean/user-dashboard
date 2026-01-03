/**
 * Check NBA games count and identify issues
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

  console.log('=== NBA Games Analysis ===\n')

  // Total games by season
  const bySeason = await clickhouseQuery(`
    SELECT 
      season,
      count(*) as total_games,
      count(CASE WHEN home_score > 0 OR away_score > 0 THEN 1 END) as completed_games,
      count(CASE WHEN home_score = 0 AND away_score = 0 THEN 1 END) as incomplete_games,
      min(toDate(game_time)) as earliest_date,
      max(toDate(game_time)) as latest_date
    FROM nba_games
    GROUP BY season
    ORDER BY season DESC
  `)

  console.log('📊 Games by Season:')
  bySeason.data.forEach((row: any) => {
    console.log(`  Season ${row.season}:`)
    console.log(`    Total: ${row.total_games}`)
    console.log(`    Completed: ${row.completed_games}`)
    console.log(`    Incomplete: ${row.incomplete_games}`)
    console.log(`    Date range: ${row.earliest_date} to ${row.latest_date}`)
    console.log()
  })

  // Check for duplicate game IDs
  const duplicates = await clickhouseQuery(`
    SELECT 
      espn_game_id,
      count(*) as count
    FROM nba_games
    WHERE espn_game_id != '' AND espn_game_id != '0'
    GROUP BY espn_game_id
    HAVING count > 1
    ORDER BY count DESC
    LIMIT 10
  `)

  if (duplicates.data.length > 0) {
    console.log('⚠️  Duplicate game IDs found:')
    duplicates.data.forEach((row: any) => {
      console.log(`  Game ID ${row.espn_game_id}: ${row.count} entries`)
    })
    console.log()
  } else {
    console.log('✅ No duplicate game IDs')
    console.log()
  }

  // Check for games with invalid/zero scores that might be scheduled games
  const scheduled = await clickhouseQuery(`
    SELECT 
      season,
      count(*) as scheduled_count
    FROM nba_games
    WHERE home_score = 0 AND away_score = 0
      AND toDate(game_time) < today()
    GROUP BY season
    ORDER BY season DESC
  `)

  if (scheduled.data.length > 0) {
    console.log('📅 Past games with no scores (likely scheduled but not played):')
    scheduled.data.forEach((row: any) => {
      console.log(`  Season ${row.season}: ${row.scheduled_count} games`)
    })
    console.log()
  }

  // Total unique games
  const totals = await clickhouseQuery(`
    SELECT 
      count(*) as total_rows,
      count(DISTINCT espn_game_id) as unique_games,
      count(DISTINCT CASE WHEN home_score > 0 OR away_score > 0 THEN espn_game_id END) as unique_completed,
      count(DISTINCT CASE WHEN home_score = 0 AND away_score = 0 THEN espn_game_id END) as unique_incomplete
    FROM nba_games
    WHERE espn_game_id != '' AND espn_game_id != '0'
  `)

  const t = totals.data[0]
  console.log('📈 Totals:')
  console.log(`  Total rows: ${t?.total_rows || 0}`)
  console.log(`  Unique game IDs: ${t?.unique_games || 0}`)
  console.log(`  Unique completed: ${t?.unique_completed || 0}`)
  console.log(`  Unique incomplete: ${t?.unique_incomplete || 0}`)
  console.log()

  // Check for games with empty/invalid espn_game_id
  const invalidIds = await clickhouseQuery(`
    SELECT 
      count(*) as invalid_count
    FROM nba_games
    WHERE espn_game_id = '' OR espn_game_id = '0' OR espn_game_id IS NULL
  `)

  if (invalidIds.data[0]?.invalid_count > 0) {
    console.log(`⚠️  Games with invalid/empty espn_game_id: ${invalidIds.data[0].invalid_count}`)
    console.log()
  }

  // Sample 2022 games
  const season2022 = await clickhouseQuery(`
    SELECT 
      espn_game_id,
      toDate(game_time) as game_date,
      home_team_id,
      away_team_id,
      home_score,
      away_score
    FROM nba_games
    WHERE season = 2022
    ORDER BY game_time
    LIMIT 10
  `)

  console.log('📅 Sample 2022 games:')
  season2022.data.forEach((row: any) => {
    console.log(`  ${row.game_date}: Game ${row.espn_game_id} - Score: ${row.away_score || 0} @ ${row.home_score || 0}`)
  })
  console.log()
}

main().catch(console.error)

