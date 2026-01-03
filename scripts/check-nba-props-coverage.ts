import * as fs from 'fs'
import * as path from 'path'

// Load environment variables FIRST, before any other imports
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
        // Remove surrounding quotes if present
        value = value.replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    }
  })
}

// Now import after env vars are loaded
import { clickhouseQuery } from '../lib/clickhouse'

async function main() {
  console.log('=== NBA Props Coverage Check ===\n')

  // Total games with box scores (completed games)
  const totalGames = await clickhouseQuery(`
    SELECT 
      season,
      count(DISTINCT game_id) as total_games
    FROM nba_games
    WHERE (home_score > 0 OR away_score > 0)
      AND season = 2026
    GROUP BY season
  `)

  // Games with props
  const gamesWithProps = await clickhouseQuery(`
    SELECT 
      season,
      count(DISTINCT espn_game_id) as games_with_props
    FROM nba_prop_lines
    WHERE espn_game_id > 0
      AND season = 2026
    GROUP BY season
  `)

  // Total prop lines
  const totalLines = await clickhouseQuery(`
    SELECT 
      season,
      count() as total_lines,
      count(DISTINCT espn_game_id) as games,
      min(toDate(game_time)) as earliest,
      max(toDate(game_time)) as latest
    FROM nba_prop_lines
    WHERE espn_game_id > 0
      AND season = 2026
    GROUP BY season
  `)

  // Unmatched props (still have espn_game_id = 0)
  const unmatched = await clickhouseQuery(`
    SELECT count(DISTINCT game_id) as unmatched_events
    FROM nba_prop_lines
    WHERE espn_game_id = 0
      AND season = 2026
  `)

  console.log('Season 2026:')
  console.log(`  Total completed games: ${totalGames.data[0]?.total_games || 0}`)
  console.log(`  Games with props: ${gamesWithProps.data[0]?.games_with_props || 0}`)
  console.log(`  Games missing props: ${(totalGames.data[0]?.total_games || 0) - (gamesWithProps.data[0]?.games_with_props || 0)}`)
  console.log(`  Coverage: ${((gamesWithProps.data[0]?.games_with_props || 0) / (totalGames.data[0]?.total_games || 1) * 100).toFixed(1)}%`)
  console.log(`  Total prop lines: ${totalLines.data[0]?.total_lines || 0}`)
  console.log(`  Date range: ${totalLines.data[0]?.earliest || 'N/A'} to ${totalLines.data[0]?.latest || 'N/A'}`)
  console.log(`  Unmatched props (espn_game_id = 0): ${unmatched.data[0]?.unmatched_events || 0}`)
  console.log()

  // All seasons summary
  const allSeasons = await clickhouseQuery(`
    SELECT 
      g.season,
      count(DISTINCT g.game_id) as total_games,
      count(DISTINCT p.espn_game_id) as games_with_props,
      count(DISTINCT p.espn_game_id) / count(DISTINCT g.game_id) * 100 as coverage_pct
    FROM nba_games g
    LEFT JOIN nba_prop_lines p ON toString(g.game_id) = toString(p.espn_game_id) AND p.espn_game_id > 0
    WHERE (g.home_score > 0 OR g.away_score > 0)
      AND g.season >= 2024
    GROUP BY g.season
    ORDER BY g.season DESC
  `)

  console.log('All Seasons Summary:')
  allSeasons.data.forEach((row: any) => {
    console.log(`  Season ${row.season}: ${row.games_with_props}/${row.total_games} (${row.coverage_pct.toFixed(1)}%)`)
  })
}

main().catch(console.error)

