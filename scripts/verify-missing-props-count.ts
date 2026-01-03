/**
 * Verify missing props count for 2025-2026
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

  console.log('=== Verifying Missing Props Count ===\n')

  // Total completed games
  const totalGames = await clickhouseQuery(`
    SELECT 
      season,
      count(DISTINCT espn_game_id) as total_games
    FROM nba_games
    WHERE season IN (2025, 2026)
      AND (home_score > 0 OR away_score > 0)
    GROUP BY season
    ORDER BY season DESC
  `)

  // Games with props
  const gamesWithProps = await clickhouseQuery(`
    SELECT 
      season,
      count(DISTINCT espn_game_id) as games_with_props
    FROM nba_prop_lines
    WHERE season IN (2025, 2026)
      AND espn_game_id > 0
    GROUP BY season
    ORDER BY season DESC
  `)

  console.log('📊 Coverage by Season:\n')
  
  for (const totalRow of totalGames.data) {
    const season = totalRow.season
    const total = totalRow.total_games
    
    const propsRow = gamesWithProps.data.find((r: any) => r.season === season)
    const withProps = propsRow?.games_with_props || 0
    const missing = total - withProps
    const coverage = total > 0 ? ((withProps / total) * 100).toFixed(1) : '0.0'
    
    console.log(`Season ${season}:`)
    console.log(`  Total completed games: ${total}`)
    console.log(`  Games with props: ${withProps}`)
    console.log(`  Games missing props: ${missing}`)
    console.log(`  Coverage: ${coverage}%`)
    console.log()
  }

  // Now find the actual missing games
  const missing = await clickhouseQuery(`
    SELECT 
      g.season,
      toString(g.espn_game_id) as espn_game_id,
      toDate(g.game_time) as game_date,
      ht.name as home_team,
      at.name as away_team
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
    LIMIT 20
  `)

  if (missing.data.length > 0) {
    console.log(`📋 Sample of missing games (showing first 20):\n`)
    missing.data.forEach((game: any) => {
      console.log(`  ${game.game_date} (Season ${game.season}): ${game.away_team} @ ${game.home_team} - Game ${game.espn_game_id}`)
    })
  } else {
    console.log('✅ No missing games found (or query issue)')
  }
}

main().catch(console.error)

