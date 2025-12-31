/**
 * Test what data is in the database
 * Run with: npx tsx scripts/test-db-data.ts
 */

const CLICKHOUSE_HOST = process.env.CLICKHOUSE_HOST || 'https://queries.clickhouse.cloud/service/a54845b1-196e-4d49-9972-3cd55e6766b1/run'
const CLICKHOUSE_KEY_ID = process.env.CLICKHOUSE_KEY_ID || 'NhCacNZ17p6tH1xv5VcZ'
const CLICKHOUSE_KEY_SECRET = process.env.CLICKHOUSE_KEY_SECRET || '4b1dxwoWH7vdq5hczTJUJjepfko718M8PfiQen8xWP'

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
  console.log('=== Checking Database Data ===\n')
  
  // 1. Check a specific NFL game
  console.log('1. NFL Games with Panthers:')
  const panthersGames = await query(`
    SELECT 
      game_id,
      spread_open,
      spread_close,
      home_spread_juice,
      away_spread_juice,
      public_spread_home_bet_pct,
      public_spread_home_money_pct,
      spread_home_public_respect,
      spread_away_public_respect,
      spread_home_vegas_backed,
      spread_away_vegas_backed
    FROM games 
    WHERE sport = 'nfl' 
      AND game_id LIKE '%panthers%' OR game_id LIKE '%buccaneers%'
    ORDER BY updated_at DESC
    LIMIT 5
  `)
  console.log(JSON.stringify(panthersGames, null, 2))
  
  // 2. Check game_first_seen for true opening lines
  console.log('\n2. game_first_seen data:')
  const firstSeen = await query(`
    SELECT 
      odds_api_game_id,
      sport,
      opening_spread,
      opening_total,
      opening_ml_home,
      opening_ml_away
    FROM game_first_seen 
    WHERE sport = 'nfl'
    ORDER BY first_seen_time DESC
    LIMIT 5
  `)
  console.log(JSON.stringify(firstSeen, null, 2))
  
  // 3. Check if ANY signals exist
  console.log('\n3. Games with ANY signals:')
  const gamesWithSignals = await query(`
    SELECT 
      game_id,
      sport,
      spread_home_public_respect,
      spread_away_public_respect,
      spread_home_vegas_backed,
      spread_away_vegas_backed
    FROM games 
    WHERE spread_home_public_respect > 0 
       OR spread_away_public_respect > 0
       OR spread_home_vegas_backed > 0
       OR spread_away_vegas_backed > 0
    LIMIT 10
  `)
  console.log(gamesWithSignals.length === 0 ? 'No games with signals found!' : JSON.stringify(gamesWithSignals, null, 2))
  
  // 4. Check juice values
  console.log('\n4. Sample juice values:')
  const juiceData = await query(`
    SELECT 
      game_id,
      sport,
      home_spread_juice,
      away_spread_juice,
      over_juice,
      under_juice
    FROM games 
    WHERE sport IN ('nfl', 'nba', 'nhl')
    ORDER BY updated_at DESC
    LIMIT 10
  `)
  console.log(JSON.stringify(juiceData, null, 2))
}

main().catch(console.error)

