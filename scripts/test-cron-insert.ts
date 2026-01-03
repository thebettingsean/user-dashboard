/**
 * Test the exact INSERT that the cron would do
 * Run with: npx tsx scripts/test-cron-insert.ts
 */

const CLICKHOUSE_HOST = 'https://queries.clickhouse.cloud/service/a54845b1-196e-4d49-9972-3cd55e6766b1/run'
const CLICKHOUSE_KEY_ID = 'NhCacNZ17p6tH1xv5VcZ'
const CLICKHOUSE_KEY_SECRET = '4b1dxwoWH7vdq5hczTJUJjepfko718M8PfiQen8xWP'

async function command(sql: string) {
  console.log('\n--- SQL ---')
  console.log(sql)
  console.log('--- END ---\n')
  
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
  
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`ClickHouse error: ${text}`)
  }
  return text
}

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
  
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`ClickHouse error: ${text}`)
  }
  
  if (!text.trim()) return []
  return text.trim().split('\n').map(line => JSON.parse(line))
}

async function main() {
  console.log('=== Testing Cron INSERT ===\n')
  
  // First, check current state of a specific game
  const testGameId = 'nfl_4fd1173e2f647cbbebf6713d39693089' // Panthers @ Buccaneers
  
  console.log('1. Current state of test game:')
  const before = await query(`
    SELECT game_id, home_spread_juice, away_spread_juice, over_juice, under_juice,
           spread_home_public_respect, spread_away_public_respect
    FROM games 
    WHERE game_id = '${testGameId}'
    LIMIT 1
  `)
  console.log(before.length ? JSON.stringify(before[0], null, 2) : 'Game not found!')
  
  // Now try to insert with real values
  console.log('\n2. Attempting INSERT with real juice values:')
  
  try {
    await command(`
      INSERT INTO games (
        game_id, sport, game_time, home_team_id, away_team_id,
        spread_open, spread_close, total_open, total_close,
        home_ml_open, away_ml_open, home_ml_close, away_ml_close,
        home_spread_juice, away_spread_juice, over_juice, under_juice,
        opening_home_spread_juice, opening_away_spread_juice, opening_over_juice, opening_under_juice,
        public_spread_home_bet_pct, public_spread_home_money_pct,
        public_ml_home_bet_pct, public_ml_home_money_pct,
        public_total_over_bet_pct, public_total_over_money_pct,
        spread_home_public_respect, spread_home_vegas_backed, spread_home_whale_respect,
        spread_away_public_respect, spread_away_vegas_backed, spread_away_whale_respect,
        total_over_public_respect, total_over_vegas_backed, total_over_whale_respect,
        total_under_public_respect, total_under_vegas_backed, total_under_whale_respect,
        ml_home_public_respect, ml_home_vegas_backed, ml_home_whale_respect,
        ml_away_public_respect, ml_away_vegas_backed, ml_away_whale_respect,
        status, sportsdata_io_score_id, updated_at
      ) VALUES (
        '${testGameId}', 'nfl', '2025-01-05 21:30:00', 27, 5,
        -3.5, -2.5, 47.5, 43.5,
        -180, 150, -160, 135,
        -118, -102, -115, -105,
        -110, -110, -110, -110,
        37, 41,
        40, 45,
        50, 50,
        0, 0, 0,
        42, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        'upcoming', 0, now()
      )
    `)
    console.log('✅ INSERT succeeded!')
  } catch (err: any) {
    console.log('❌ INSERT failed:', err.message)
    return
  }
  
  // Force merge to see results immediately
  console.log('\n3. Forcing OPTIMIZE to merge rows...')
  try {
    await command(`OPTIMIZE TABLE games FINAL`)
    console.log('✅ OPTIMIZE succeeded')
  } catch (err: any) {
    console.log('⚠️ OPTIMIZE may have timed out (normal):', err.message?.substring(0, 100))
  }
  
  // Check after
  console.log('\n4. State after INSERT:')
  const after = await query(`
    SELECT game_id, home_spread_juice, away_spread_juice, over_juice, under_juice,
           spread_home_public_respect, spread_away_public_respect
    FROM games 
    WHERE game_id = '${testGameId}'
    ORDER BY updated_at DESC
    LIMIT 1
  `)
  console.log(after.length ? JSON.stringify(after[0], null, 2) : 'Game not found!')
  
  // Show if values changed
  if (before[0] && after[0]) {
    console.log('\n5. Did values change?')
    console.log(`   home_spread_juice: ${before[0].home_spread_juice} → ${after[0].home_spread_juice}`)
    console.log(`   spread_away_public_respect: ${before[0].spread_away_public_respect} → ${after[0].spread_away_public_respect}`)
  }
}

main().catch(console.error)

