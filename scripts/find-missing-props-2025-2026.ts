/**
 * Find games from 2025-2026 that are missing props
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

  console.log('=== Missing Props: Seasons 2025-2026 ===\n')

  // Find games without props
  const missing = await clickhouseQuery(`
    SELECT 
      g.season,
      toString(g.espn_game_id) as espn_game_id,
      toDate(g.game_time) as game_date,
      g.home_team_id,
      g.away_team_id,
      ht.name as home_team,
      at.name as away_team,
      g.home_score,
      g.away_score
    FROM nba_games g
    LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = 'nba'
    LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = 'nba'
    LEFT JOIN nba_prop_lines p ON toString(g.espn_game_id) = toString(p.espn_game_id) AND p.espn_game_id > 0
    WHERE g.season IN (2025, 2026)
      AND (g.home_score > 0 OR g.away_score > 0)
      AND p.espn_game_id IS NULL
    ORDER BY g.season, g.game_time
  `)

  console.log(`📊 Total games missing props: ${missing.data.length}\n`)

  // Group by season
  const bySeason = missing.data.reduce((acc: any, row: any) => {
    if (!acc[row.season]) {
      acc[row.season] = []
    }
    acc[row.season].push(row)
    return acc
  }, {})

  for (const season of [2026, 2025]) {
    if (!bySeason[season]) continue

    const games = bySeason[season]
    console.log(`\n📅 Season ${season}: ${games.length} games missing props\n`)

    // Group by month
    const byMonth = games.reduce((acc: any, game: any) => {
      const month = game.game_date.substring(0, 7) // YYYY-MM
      if (!acc[month]) {
        acc[month] = []
      }
      acc[month].push(game)
      return acc
    }, {})

    for (const month of Object.keys(byMonth).sort()) {
      const monthGames = byMonth[month]
      console.log(`  ${month}: ${monthGames.length} games`)
      
      // Show first 5 games from this month
      monthGames.slice(0, 5).forEach((game: any) => {
        console.log(`    ${game.game_date}: ${game.away_team} @ ${game.home_team} (${game.away_score || 0}-${game.home_score || 0}) - Game ${game.espn_game_id}`)
      })
      
      if (monthGames.length > 5) {
        console.log(`    ... and ${monthGames.length - 5} more`)
      }
    }
  }

  // Summary by date range
  console.log('\n📈 Summary by Date Range:\n')
  
  const byDateRange = await clickhouseQuery(`
    SELECT 
      g.season,
      toYYYYMM(toDate(g.game_time)) as month,
      count(DISTINCT g.espn_game_id) as missing_count
    FROM nba_games g
    LEFT JOIN nba_prop_lines p ON toString(g.espn_game_id) = toString(p.espn_game_id) AND p.espn_game_id > 0
    WHERE g.season IN (2025, 2026)
      AND (g.home_score > 0 OR g.away_score > 0)
      AND p.espn_game_id IS NULL
    GROUP BY g.season, month
    ORDER BY g.season, month
  `)

  byDateRange.data.forEach((row: any) => {
    const year = row.month.substring(0, 4)
    const month = row.month.substring(4, 6)
    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'short' })
    console.log(`  ${monthName} ${year} (Season ${row.season}): ${row.missing_count} games`)
  })

  console.log('\n💡 Note: These games may genuinely lack prop data from Odds API')
}

main().catch(console.error)

