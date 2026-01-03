/**
 * Investigate invalid game IDs in nba_games
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

  console.log('=== Investigating Invalid Game IDs ===\n')

  // Check invalid IDs by season
  const invalidBySeason = await clickhouseQuery(`
    SELECT 
      season,
      count(*) as invalid_count,
      count(CASE WHEN home_score > 0 OR away_score > 0 THEN 1 END) as completed_invalid,
      count(CASE WHEN home_score = 0 AND away_score = 0 THEN 1 END) as incomplete_invalid,
      min(toDate(game_time)) as earliest,
      max(toDate(game_time)) as latest
    FROM nba_games
    WHERE espn_game_id = '' OR espn_game_id = '0' OR espn_game_id IS NULL
    GROUP BY season
    ORDER BY season DESC
  `)

  console.log('📊 Invalid IDs by Season:')
  invalidBySeason.data.forEach((row: any) => {
    console.log(`  Season ${row.season}: ${row.invalid_count} invalid IDs`)
    console.log(`    Completed: ${row.completed_invalid}, Incomplete: ${row.incomplete_invalid}`)
    console.log(`    Date range: ${row.earliest} to ${row.latest}`)
    console.log()
  })

  // Sample invalid entries
  const sampleInvalid = await clickhouseQuery(`
    SELECT 
      game_id,
      espn_game_id,
      season,
      toDate(game_time) as game_date,
      home_team_id,
      away_team_id,
      home_score,
      away_score
    FROM nba_games
    WHERE (espn_game_id = '' OR espn_game_id = '0' OR espn_game_id IS NULL)
      AND season >= 2022
    ORDER BY game_time DESC
    LIMIT 10
  `)

  console.log('📝 Sample Invalid Entries:')
  sampleInvalid.data.forEach((row: any) => {
    console.log(`  Season ${row.season}, ${row.game_date}:`)
    console.log(`    game_id: ${row.game_id}, espn_game_id: "${row.espn_game_id || 'NULL'}"`)
    console.log(`    Teams: ${row.away_team_id} @ ${row.home_team_id}`)
    console.log(`    Score: ${row.away_score || 0} @ ${row.home_score || 0}`)
    console.log()
  })

  // Check for duplicate game_id (different from espn_game_id)
  const duplicateGameIds = await clickhouseQuery(`
    SELECT 
      game_id,
      count(*) as count,
      groupArray(espn_game_id) as espn_ids
    FROM nba_games
    WHERE game_id != ''
    GROUP BY game_id
    HAVING count > 1
    ORDER BY count DESC
    LIMIT 10
  `)

  if (duplicateGameIds.data.length > 0) {
    console.log('⚠️  Duplicate game_id values:')
    duplicateGameIds.data.forEach((row: any) => {
      console.log(`  game_id: ${row.game_id}, count: ${row.count}, espn_ids: ${row.espn_ids.join(', ')}`)
    })
    console.log()
  }

  // Check what the actual total should be
  const validCompleted = await clickhouseQuery(`
    SELECT 
      season,
      count(DISTINCT espn_game_id) as valid_completed
    FROM nba_games
    WHERE espn_game_id != '' AND espn_game_id != '0'
      AND (home_score > 0 OR away_score > 0)
    GROUP BY season
    ORDER BY season DESC
  `)

  console.log('✅ Valid Completed Games by Season:')
  validCompleted.data.forEach((row: any) => {
    console.log(`  Season ${row.season}: ${row.valid_completed} games`)
  })
  console.log()

  // Check 2022 specifically - are there more games that should exist?
  const season2022Details = await clickhouseQuery(`
    SELECT 
      count(*) as total_2022,
      count(CASE WHEN espn_game_id != '' AND espn_game_id != '0' THEN 1 END) as valid_2022,
      count(CASE WHEN home_score > 0 OR away_score > 0 THEN 1 END) as completed_2022,
      min(toDate(game_time)) as first_game,
      max(toDate(game_time)) as last_game
    FROM nba_games
    WHERE season = 2022
  `)

  const s22 = season2022Details.data[0]
  console.log('🔍 Season 2022 Details:')
  console.log(`  Total rows: ${s22?.total_2022 || 0}`)
  console.log(`  Valid espn_game_id: ${s22?.valid_2022 || 0}`)
  console.log(`  Completed games: ${s22?.completed_2022 || 0}`)
  console.log(`  Date range: ${s22?.first_game} to ${s22?.last_game}`)
  console.log()
  console.log('💡 Note: NBA 2022-23 season should have ~1,230 regular season games + playoffs')
}

main().catch(console.error)

