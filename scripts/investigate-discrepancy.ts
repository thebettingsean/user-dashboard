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
  
  console.log('=== INVESTIGATING DISCREPANCY ===\n')
  
  // 1. What the API endpoint counts (distinct Odds API event IDs)
  const apiCount = await clickhouseQuery(`
    SELECT countDistinct(game_id) as games
    FROM nba_prop_lines
    WHERE season = 2026
  `)
  
  // 2. Props with espn_game_id > 0 (matched to ESPN games)
  const propsWithEspnId = await clickhouseQuery(`
    SELECT countDistinct(espn_game_id) as games
    FROM nba_prop_lines
    WHERE season = 2026
      AND espn_game_id > 0
  `)
  
  // 3. Actual NBA games with props (matched by espn_game_id)
  const actualCount = await clickhouseQuery(`
    SELECT COUNT(DISTINCT g.game_id) as games
    FROM nba_games g
    WHERE g.season = 2026
      AND (g.home_score > 0 OR g.away_score > 0)
      AND EXISTS (
        SELECT 1 FROM nba_prop_lines p
        WHERE g.game_id = toUInt32(p.espn_game_id)
        AND p.season = 2026
        AND p.espn_game_id > 0
      )
  `)
  
  // 4. Total completed NBA games
  const totalGames = await clickhouseQuery(`
    SELECT COUNT(DISTINCT g.game_id) as games
    FROM nba_games g
    WHERE g.season = 2026
      AND (g.home_score > 0 OR g.away_score > 0)
  `)
  
  // 5. Props without espn_game_id (unmatched)
  const unmatchedProps = await clickhouseQuery(`
    SELECT countDistinct(game_id) as games
    FROM nba_prop_lines
    WHERE season = 2026
      AND espn_game_id = 0
  `)
  
  // 6. Check date ranges
  const dateRange = await clickhouseQuery(`
    SELECT 
      min(toDate(game_time)) as earliest,
      max(toDate(game_time)) as latest
    FROM nba_prop_lines
    WHERE season = 2026
  `)
  
  const gameDateRange = await clickhouseQuery(`
    SELECT 
      min(toDate(game_time)) as earliest,
      max(toDate(game_time)) as latest
    FROM nba_games
    WHERE season = 2026
      AND (home_score > 0 OR away_score > 0)
  `)
  
  console.log('METRICS:')
  console.log(`1. API Endpoint counts (distinct Odds API event IDs): ${apiCount.data?.[0]?.games || 0}`)
  console.log(`2. Props with espn_game_id > 0 (matched): ${propsWithEspnId.data?.[0]?.games || 0}`)
  console.log(`3. Props without espn_game_id (unmatched): ${unmatchedProps.data?.[0]?.games || 0}`)
  console.log(`4. Actual NBA games with props (matched): ${actualCount.data?.[0]?.games || 0}`)
  console.log(`5. Total completed NBA games: ${totalGames.data?.[0]?.games || 0}`)
  
  console.log(`\nCOVERAGE:`)
  const total = totalGames.data?.[0]?.games || 0
  const withProps = actualCount.data?.[0]?.games || 0
  console.log(`  ${withProps}/${total} = ${((withProps / total) * 100).toFixed(1)}%`)
  
  console.log(`\nDATE RANGES:`)
  console.log(`  Props: ${dateRange.data?.[0]?.earliest || 'N/A'} to ${dateRange.data?.[0]?.latest || 'N/A'}`)
  console.log(`  Games: ${gameDateRange.data?.[0]?.earliest || 'N/A'} to ${gameDateRange.data?.[0]?.latest || 'N/A'}`)
  
  console.log(`\nDISCREPANCY EXPLANATION:`)
  console.log(`  - API endpoint counts Odds API event IDs (not ESPN game IDs)`)
  console.log(`  - API shows: ${apiCount.data?.[0]?.games || 0} distinct Odds API events`)
  console.log(`  - Of those, ${propsWithEspnId.data?.[0]?.games || 0} are matched to ESPN games`)
  console.log(`  - Actual coverage: ${withProps}/${total} games (${((withProps / total) * 100).toFixed(1)}%)`)
  console.log(`  - ${unmatchedProps.data?.[0]?.games || 0} Odds API events haven't been matched to ESPN games yet`)
}

main().catch(console.error)


