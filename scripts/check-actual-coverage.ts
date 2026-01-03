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
  // Dynamic import AFTER env vars are loaded
  const { clickhouseQuery } = await import('../lib/clickhouse')
  
  console.log('=== ACTUAL NBA Props Coverage ===\n')

  // Season 2026 stats
  const season2026Stats = await clickhouseQuery(`
    SELECT 
      count(DISTINCT g.game_id) as total_completed_games,
      count(DISTINCT CASE WHEN p.espn_game_id > 0 THEN toString(p.espn_game_id) END) as games_with_props,
      count(DISTINCT p.game_id) as total_odds_events,
      count(DISTINCT CASE WHEN p.espn_game_id = 0 THEN p.game_id END) as unmatched_events
    FROM nba_games g
    LEFT JOIN nba_prop_lines p ON toString(g.game_id) = toString(p.espn_game_id) AND p.season = 2026
    WHERE g.season = 2026
      AND (g.home_score > 0 OR g.away_score > 0)
  `)

  const stats = season2026Stats.data[0]
  const totalGames = stats?.total_completed_games || 0
  const gamesWithProps = stats?.games_with_props || 0
  const coverage = totalGames > 0 ? ((gamesWithProps / totalGames) * 100).toFixed(1) : '0.0'

  console.log('Season 2026:')
  console.log(`  Total completed games: ${totalGames}`)
  console.log(`  Games with props: ${gamesWithProps}`)
  console.log(`  Games missing props: ${totalGames - gamesWithProps}`)
  console.log(`  Coverage: ${coverage}%`)
  console.log(`  Total Odds API events: ${stats?.total_odds_events || 0}`)
  console.log(`  Unmatched events (espn_game_id = 0): ${stats?.unmatched_events || 0}`)
  console.log()

  // Get prop line counts
  const propLines = await clickhouseQuery(`
    SELECT 
      count() as total_lines,
      count(DISTINCT espn_game_id) as games_with_props,
      count(DISTINCT game_id) as odds_events,
      count(DISTINCT CASE WHEN espn_game_id = 0 THEN game_id END) as unmatched_events
    FROM nba_prop_lines
    WHERE season = 2026
  `)

  const lines = propLines.data[0]
  console.log('Prop Lines (Season 2026):')
  console.log(`  Total prop lines: ${lines?.total_lines || 0}`)
  console.log(`  Games with props (distinct espn_game_id): ${lines?.games_with_props || 0}`)
  console.log(`  Odds API events (distinct game_id): ${lines?.odds_events || 0}`)
  console.log(`  Unmatched events: ${lines?.unmatched_events || 0}`)
}

main().catch(console.error)

