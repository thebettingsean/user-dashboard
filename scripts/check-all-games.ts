/**
 * Check ALL games in database with their juice and signal values
 */

const CLICKHOUSE_HOST = 'https://queries.clickhouse.cloud/service/a54845b1-196e-4d49-9972-3cd55e6766b1/run'
const CLICKHOUSE_KEY_ID = 'NhCacNZ17p6tH1xv5VcZ'
const CLICKHOUSE_KEY_SECRET = '4b1dxwoWH7vdq5hczTJUJjepfko718M8PfiQen8xWP'

async function query(sql: string) {
  const response = await fetch(CLICKHOUSE_HOST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${CLICKHOUSE_KEY_ID}:${CLICKHOUSE_KEY_SECRET}`).toString('base64')}`
    },
    body: JSON.stringify({
      query: sql,
      format: 'JSONEachRow'
    })
  })
  
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`ClickHouse error: ${text}`)
  }
  
  const text = await response.text()
  if (!text.trim()) return []
  
  return text.trim().split('\n').map(line => JSON.parse(line))
}

async function main() {
  console.log('=== Checking ALL Games ===\n')
  
  // Use FINAL to get merged results
  const games = await query(`
    SELECT 
      game_id,
      sport,
      home_spread_juice,
      away_spread_juice,
      over_juice,
      under_juice,
      spread_home_public_respect,
      spread_away_public_respect,
      spread_home_vegas_backed,
      spread_away_vegas_backed,
      updated_at
    FROM games FINAL
    WHERE toDate(toTimeZone(game_time, 'America/New_York')) >= toDate(toTimeZone(now(), 'America/New_York'))
    ORDER BY sport, updated_at DESC
    LIMIT 30
  `)
  
  console.log(`Found ${games.length} games\n`)
  
  // Group by sport
  const bySport: Record<string, any[]> = {}
  for (const g of games) {
    if (!bySport[g.sport]) bySport[g.sport] = []
    bySport[g.sport].push(g)
  }
  
  for (const [sport, sportGames] of Object.entries(bySport)) {
    console.log(`\n=== ${sport.toUpperCase()} ===`)
    for (const g of sportGames.slice(0, 5)) {
      const hasRealJuice = g.home_spread_juice !== -110 || g.away_spread_juice !== -110
      const hasSignal = g.spread_home_public_respect > 0 || g.spread_away_public_respect > 0 ||
                       g.spread_home_vegas_backed > 0 || g.spread_away_vegas_backed > 0
      
      console.log(`  ${g.game_id}:`)
      console.log(`    Juice: home=${g.home_spread_juice}, away=${g.away_spread_juice}, over=${g.over_juice}, under=${g.under_juice}`)
      console.log(`    Signals: homePublic=${g.spread_home_public_respect}, awayPublic=${g.spread_away_public_respect}`)
      console.log(`    Has real juice: ${hasRealJuice ? '✅' : '❌'}, Has signal: ${hasSignal ? '✅' : '❌'}`)
      console.log(`    Updated: ${g.updated_at}`)
    }
  }
  
  // Count totals
  const withRealJuice = games.filter(g => g.home_spread_juice !== -110 || g.away_spread_juice !== -110).length
  const withSignals = games.filter(g => g.spread_home_public_respect > 0 || g.spread_away_public_respect > 0).length
  
  console.log(`\n=== SUMMARY ===`)
  console.log(`Total games: ${games.length}`)
  console.log(`With real juice (not -110): ${withRealJuice}`)
  console.log(`With any signals: ${withSignals}`)
}

main().catch(console.error)

