/**
 * Check missing games after Oct 21, 2025 (regular season start)
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

  console.log('=== Missing Games After Oct 21, 2025 (Regular Season) ===\n')

  // Missing games after Oct 21, 2025
  const missing = await clickhouseQuery(`
    SELECT 
      g.season,
      count(DISTINCT g.espn_game_id) as missing_games,
      min(toDate(g.game_time)) as earliest,
      max(toDate(g.game_time)) as latest
    FROM nba_games g
    WHERE g.season = 2026
      AND (g.home_score > 0 OR g.away_score > 0)
      AND toDate(g.game_time) >= '2025-10-21'
      AND NOT EXISTS (
        SELECT 1 
        FROM nba_prop_lines p 
        WHERE toString(g.espn_game_id) = toString(p.espn_game_id) 
          AND p.espn_game_id > 0
      )
    GROUP BY g.season
  `)

  console.log('📊 Missing Games (Oct 21+):')
  missing.data.forEach((row: any) => {
    console.log(`  Season ${row.season}: ${row.missing_games} games`)
    console.log(`    Date range: ${row.earliest} to ${row.latest}`)
  })
  console.log()

  // Unmatched events after Oct 21
  const unmatched = await clickhouseQuery(`
    SELECT 
      season,
      count(DISTINCT game_id) as unmatched_events,
      count() as total_props,
      min(toDate(game_time)) as earliest,
      max(toDate(game_time)) as latest
    FROM nba_prop_lines
    WHERE espn_game_id = 0
      AND season = 2026
      AND toDate(game_time) >= '2025-10-21'
    GROUP BY season
  `)

  console.log('📊 Unmatched Props (Oct 21+):')
  unmatched.data.forEach((row: any) => {
    console.log(`  Season ${row.season}: ${row.unmatched_events} events, ${row.total_props} props`)
    console.log(`    Date range: ${row.earliest} to ${row.latest}`)
  })
  console.log()

  // Coverage after Oct 21
  const coverage = await clickhouseQuery(`
    SELECT 
      count(DISTINCT g.espn_game_id) as total_games,
      count(DISTINCT CASE WHEN p.espn_game_id > 0 THEN toString(p.espn_game_id) END) as games_with_props
    FROM nba_games g
    LEFT JOIN nba_prop_lines p ON toString(g.espn_game_id) = toString(p.espn_game_id) AND p.season = 2026
    WHERE g.season = 2026
      AND (g.home_score > 0 OR g.away_score > 0)
      AND toDate(g.game_time) >= '2025-10-21'
  `)

  const c = coverage.data[0]
  const missingAfterOct21 = (c?.total_games || 0) - (c?.games_with_props || 0)
  const coveragePct = c?.total_games ? ((c.games_with_props / c.total_games) * 100).toFixed(1) : '0.0'
  
  console.log('📈 Coverage (Oct 21+):')
  console.log(`  Total games: ${c?.total_games || 0}`)
  console.log(`  Games with props: ${c?.games_with_props || 0}`)
  console.log(`  Missing: ${missingAfterOct21}`)
  console.log(`  Coverage: ${coveragePct}%`)
}

main().catch(console.error)

