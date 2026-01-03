/**
 * List all missing props for 2025-2026 with full details
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

  console.log('=== All Missing Props: Seasons 2025-2026 ===\n')

  // Get all missing games
  const missing = await clickhouseQuery(`
    SELECT 
      g.season,
      toString(g.espn_game_id) as espn_game_id,
      toDate(g.game_time) as game_date,
      ht.name as home_team,
      at.name as away_team,
      g.home_score,
      g.away_score
    FROM nba_games g
    LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = 'nba'
    LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = 'nba'
    WHERE g.season IN (2025, 2026)
      AND (g.home_score > 0 OR g.away_score > 0)
      AND NOT EXISTS (
        SELECT 1 
        FROM nba_prop_lines p 
        WHERE toString(g.espn_game_id) = toString(p.espn_game_id) 
          AND p.espn_game_id > 0
      )
    ORDER BY g.season, g.game_time
  `)

  console.log(`📊 Total: ${missing.data.length} games missing props\n`)

  // Group by season and month
  const bySeason = missing.data.reduce((acc: any, game: any) => {
    if (!acc[game.season]) {
      acc[game.season] = {}
    }
    const month = game.game_date.substring(0, 7) // YYYY-MM
    if (!acc[game.season][month]) {
      acc[game.season][month] = []
    }
    acc[game.season][month].push(game)
    return acc
  }, {})

  for (const season of [2026, 2025]) {
    if (!bySeason[season]) continue

    const seasonData = bySeason[season]
    const total = Object.values(seasonData).reduce((sum: number, games: any) => sum + games.length, 0)
    
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Season ${season}: ${total} games missing props`)
    console.log('='.repeat(60))

    for (const month of Object.keys(seasonData).sort()) {
      const games = seasonData[month]
      const year = month.substring(0, 4)
      const monthNum = month.substring(5, 7)
      const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('default', { month: 'long' })
      
      console.log(`\n📅 ${monthName} ${year}: ${games.length} games`)
      console.log('-'.repeat(60))
      
      games.forEach((game: any) => {
        const awayTeam = game.away_team || 'Unknown'
        const homeTeam = game.home_team || 'Unknown'
        console.log(`  ${game.game_date}: ${awayTeam} @ ${homeTeam} (${game.away_score || 0}-${game.home_score || 0})`)
        console.log(`    Game ID: ${game.espn_game_id}`)
      })
    }
  }

  // Summary stats
  console.log('\n' + '='.repeat(60))
  console.log('📈 Summary Statistics')
  console.log('='.repeat(60))
  
  const stats = await clickhouseQuery(`
    SELECT 
      g.season,
      count(DISTINCT g.espn_game_id) as missing_count,
      min(toDate(g.game_time)) as earliest_missing,
      max(toDate(g.game_time)) as latest_missing
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

  stats.data.forEach((row: any) => {
    console.log(`\nSeason ${row.season}:`)
    console.log(`  Missing: ${row.missing_count} games`)
    console.log(`  Date range: ${row.earliest_missing} to ${row.latest_missing}`)
  })
}

main().catch(console.error)

