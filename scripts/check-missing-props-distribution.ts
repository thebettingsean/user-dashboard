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
  
  console.log('=== Missing Props Distribution - Season 2026 ===\n')
  
  // Get date range and distribution
  const dateRange = await clickhouseQuery(`
    SELECT 
      min(toDate(g.game_time)) as earliest_missing,
      max(toDate(g.game_time)) as latest_missing,
      COUNT(DISTINCT g.game_id) as total_missing,
      COUNT(DISTINCT toDate(g.game_time)) as dates_with_missing
    FROM nba_games g
    WHERE g.season = 2026
      AND (g.home_score > 0 OR g.away_score > 0)
      AND NOT EXISTS (
        SELECT 1 FROM nba_prop_lines p
        WHERE g.game_id = toUInt32(p.espn_game_id)
        AND p.season = 2026
        AND p.espn_game_id > 0
      )
  `)
  
  // Get distribution by week
  const byWeek = await clickhouseQuery(`
    SELECT 
      toWeek(toDate(g.game_time)) as week_num,
      toYear(toDate(g.game_time)) as year,
      min(toDate(g.game_time)) as week_start,
      COUNT(DISTINCT g.game_id) as missing_games
    FROM nba_games g
    WHERE g.season = 2026
      AND (g.home_score > 0 OR g.away_score > 0)
      AND NOT EXISTS (
        SELECT 1 FROM nba_prop_lines p
        WHERE g.game_id = toUInt32(p.espn_game_id)
        AND p.season = 2026
        AND p.espn_game_id > 0
      )
    GROUP BY week_num, year
    ORDER BY week_num
  `)
  
  // Get distribution by month
  const byMonth = await clickhouseQuery(`
    SELECT 
      toMonth(toDate(g.game_time)) as month,
      COUNT(DISTINCT g.game_id) as missing_games,
      COUNT(DISTINCT toDate(g.game_time)) as dates
    FROM nba_games g
    WHERE g.season = 2026
      AND (g.home_score > 0 OR g.away_score > 0)
      AND NOT EXISTS (
        SELECT 1 FROM nba_prop_lines p
        WHERE g.game_id = toUInt32(p.espn_game_id)
        AND p.season = 2026
        AND p.espn_game_id > 0
      )
    GROUP BY month
    ORDER BY month
  `)
  
  // Sample of dates with most missing games
  const topDates = await clickhouseQuery(`
    SELECT 
      toString(toDate(g.game_time)) as game_date,
      COUNT(DISTINCT g.game_id) as missing_games
    FROM nba_games g
    WHERE g.season = 2026
      AND (g.home_score > 0 OR g.away_score > 0)
      AND NOT EXISTS (
        SELECT 1 FROM nba_prop_lines p
        WHERE g.game_id = toUInt32(p.espn_game_id)
        AND p.season = 2026
        AND p.espn_game_id > 0
      )
    GROUP BY game_date
    ORDER BY missing_games DESC
    LIMIT 10
  `)
  
  const range = dateRange.data?.[0]
  console.log('Date Range:')
  console.log(`  Earliest: ${range?.earliest_missing || 'N/A'}`)
  console.log(`  Latest: ${range?.latest_missing || 'N/A'}`)
  console.log(`  Total missing: ${range?.total_missing || 0} games`)
  console.log(`  Across ${range?.dates_with_missing || 0} dates`)
  
  console.log(`\nBy Month:`)
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  byMonth.data?.forEach((m: any) => {
    console.log(`  ${monthNames[m.month]}: ${m.missing_games} games across ${m.dates} dates`)
  })
  
  console.log(`\nTop 10 Dates with Most Missing Games:`)
  topDates.data?.forEach((d: any) => {
    console.log(`  ${d.game_date}: ${d.missing_games} games`)
  })
  
  // Check if it's sporadic or concentrated
  const totalDates = await clickhouseQuery(`
    SELECT COUNT(DISTINCT toDate(g.game_time)) as total_dates
    FROM nba_games g
    WHERE g.season = 2026
      AND (g.home_score > 0 OR g.away_score > 0)
  `)
  
  const totalDatesCount = totalDates.data?.[0]?.total_dates || 0
  const datesWithMissing = range?.dates_with_missing || 0
  const concentration = ((datesWithMissing / totalDatesCount) * 100).toFixed(1)
  
  console.log(`\nConcentration:`)
  console.log(`  Dates with games: ${totalDatesCount}`)
  console.log(`  Dates with missing props: ${datesWithMissing} (${concentration}%)`)
  if (parseFloat(concentration) > 50) {
    console.log(`  → Concentrated: Missing props on most game days`)
  } else if (parseFloat(concentration) < 20) {
    console.log(`  → Sporadic: Missing props on only ${concentration}% of game days`)
  } else {
    console.log(`  → Moderate: Missing props on ${concentration}% of game days`)
  }
  
  // Now check previous season (2025)
  console.log(`\n\n=== Previous Season (2025) Props Coverage ===\n`)
  
  const season2025 = await clickhouseQuery(`
    SELECT 
      COUNT(DISTINCT g.game_id) as total_games,
      COUNT(DISTINCT CASE WHEN p.espn_game_id > 0 THEN g.game_id END) as games_with_props
    FROM nba_games g
    LEFT JOIN nba_prop_lines p ON g.game_id = toUInt32(p.espn_game_id) AND p.season = 2025
    WHERE g.season = 2025
      AND (g.home_score > 0 OR g.away_score > 0)
  `)
  
  const s2025 = season2025.data?.[0]
  const total2025 = s2025?.total_games || 0
  const withProps2025 = s2025?.games_with_props || 0
  const missing2025 = total2025 - withProps2025
  const coverage2025 = total2025 > 0 ? ((withProps2025 / total2025) * 100).toFixed(1) : '0.0'
  
  console.log(`Season 2025 (2024-25):`)
  console.log(`  Total games: ${total2025}`)
  console.log(`  Games with props: ${withProps2025}`)
  console.log(`  Games missing props: ${missing2025}`)
  console.log(`  Coverage: ${coverage2025}%`)
  
  const dateRange2025 = await clickhouseQuery(`
    SELECT 
      min(toDate(g.game_time)) as earliest,
      max(toDate(g.game_time)) as latest,
      min(toDate(CASE WHEN p.espn_game_id > 0 THEN g.game_time END)) as earliest_with_props,
      max(toDate(CASE WHEN p.espn_game_id > 0 THEN g.game_time END)) as latest_with_props
    FROM nba_games g
    LEFT JOIN nba_prop_lines p ON g.game_id = toUInt32(p.espn_game_id) AND p.season = 2025
    WHERE g.season = 2025
      AND (g.home_score > 0 OR g.away_score > 0)
  `)
  
  const range2025 = dateRange2025.data?.[0]
  console.log(`\nDate Range:`)
  console.log(`  Games: ${range2025?.earliest || 'N/A'} to ${range2025?.latest || 'N/A'}`)
  console.log(`  Props: ${range2025?.earliest_with_props || 'N/A'} to ${range2025?.latest_with_props || 'N/A'}`)
}

main().catch(console.error)

