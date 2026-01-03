/**
 * Check how many unmatched props we have vs missing games
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

  console.log('=== Checking Unmatched Props vs Missing Games ===\n')

  // Unmatched Odds API events (espn_game_id = 0)
  const unmatched = await clickhouseQuery(`
    SELECT 
      season,
      count(DISTINCT game_id) as unmatched_events,
      count() as total_unmatched_props
    FROM nba_prop_lines
    WHERE espn_game_id = 0
      AND season IN (2025, 2026)
    GROUP BY season
    ORDER BY season DESC
  `)

  console.log('📊 Unmatched Odds API Events (espn_game_id = 0):')
  unmatched.data.forEach((row: any) => {
    console.log(`  Season ${row.season}: ${row.unmatched_events} events, ${row.total_unmatched_props} props`)
  })
  console.log()

  // Missing ESPN games
  const missing = await clickhouseQuery(`
    SELECT 
      g.season,
      count(DISTINCT g.espn_game_id) as missing_games
    FROM nba_games g
    WHERE g.season IN (2025, 2026)
      AND (g.home_score > 0 OR g.away_score > 0)
      AND NOT EXISTS (
        SELECT 1 
        FROM nba_prop_lines p 
        WHERE toString(g.espn_game_id) = toString(p.espn_game_id) 
          AND p.espn_game_id > 0
      )
    GROUP BY g.season
    ORDER BY g.season DESC
  `)

  console.log('📊 Missing ESPN Games (no props matched):')
  missing.data.forEach((row: any) => {
    console.log(`  Season ${row.season}: ${row.missing_games} games`)
  })
  console.log()

  // Check date ranges
  const unmatchedDates = await clickhouseQuery(`
    SELECT 
      season,
      min(toDate(game_time)) as earliest,
      max(toDate(game_time)) as latest,
      count(DISTINCT toDate(game_time)) as date_count
    FROM nba_prop_lines
    WHERE espn_game_id = 0
      AND season IN (2025, 2026)
    GROUP BY season
    ORDER BY season DESC
  `)

  console.log('📅 Unmatched Props Date Range:')
  unmatchedDates.data.forEach((row: any) => {
    console.log(`  Season ${row.season}: ${row.earliest} to ${row.latest} (${row.date_count} dates)`)
  })
  console.log()

  const missingDates = await clickhouseQuery(`
    SELECT 
      g.season,
      min(toDate(g.game_time)) as earliest,
      max(toDate(g.game_time)) as latest,
      count(DISTINCT toDate(g.game_time)) as date_count
    FROM nba_games g
    WHERE g.season IN (2025, 2026)
      AND (g.home_score > 0 OR g.away_score > 0)
      AND NOT EXISTS (
        SELECT 1 
        FROM nba_prop_lines p 
        WHERE toString(g.espn_game_id) = toString(p.espn_game_id) 
          AND p.espn_game_id > 0
      )
    GROUP BY g.season
    ORDER BY g.season DESC
  `)

  console.log('📅 Missing Games Date Range:')
  missingDates.data.forEach((row: any) => {
    console.log(`  Season ${row.season}: ${row.earliest} to ${row.latest} (${row.date_count} dates)`)
  })
}

main().catch(console.error)

