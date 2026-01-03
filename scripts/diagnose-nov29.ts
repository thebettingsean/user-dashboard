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
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
      }
    }
  })
}

async function main() {
  const { clickhouseQuery } = await import('../lib/clickhouse')
  
  console.log('=== Diagnosing Nov 29 Issue ===\n')
  
  // Check what isDateProcessed would return for Nov 29
  const processed = await clickhouseQuery(`
    SELECT 
      COUNT(DISTINCT g.game_id) as total_games,
      COUNT(DISTINCT CASE WHEN p.espn_game_id > 0 THEN g.game_id END) as games_with_props
    FROM nba_games g
    LEFT JOIN nba_prop_lines p ON g.game_id = toUInt32(p.espn_game_id) AND p.season = 2026
    WHERE g.season = 2026
      AND (g.home_score > 0 OR g.away_score > 0)
      AND toDate(g.game_time) = '2025-11-29'
  `)
  
  // Check the old isDateProcessed logic (used by API route)
  const oldCheck = await clickhouseQuery(`
    SELECT count() as cnt FROM nba_prop_lines 
    WHERE toDate(game_time) = '2025-11-29'
  `)
  
  const total = processed.data?.[0]?.total_games || 0
  const withProps = processed.data?.[0]?.games_with_props || 0
  const linesCount = oldCheck.data?.[0]?.cnt || 0
  
  console.log('Nov 29 status:')
  console.log(`  Total games: ${total}`)
  console.log(`  Games with props: ${withProps}`)
  console.log(`  Missing: ${total - withProps} games`)
  console.log(`  Total prop lines: ${linesCount}`)
  console.log(`  Old isDateProcessed (>100 lines): ${linesCount > 100}`)
  
  if (linesCount > 100 && (total - withProps) > 0) {
    console.log(`\n⚠️  PROBLEM FOUND!`)
    console.log(`  Old isDateProcessed() returns TRUE (>100 lines)`)
    console.log(`  But ${total - withProps} games still missing props!`)
    console.log(`\n  This means:`)
    console.log(`  - API route would SKIP this date (thinks it's done)`)
    console.log(`  - Worker's isDateProcessed() should catch it (checks per-game)`)
    console.log(`  - But worker might not be processing these dates`)
  }
  
  // Check if there are unmatched props (espn_game_id = 0) on this date
  const unmatchedProps = await clickhouseQuery(`
    SELECT countDistinct(game_id) as events
    FROM nba_prop_lines
    WHERE toDate(game_time) = '2025-11-29'
      AND espn_game_id = 0
  `)
  
  console.log(`\n  Unmatched props (espn_game_id = 0): ${unmatchedProps.data?.[0]?.events || 0}`)
}

main().catch(console.error)


