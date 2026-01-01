import { clickhouseQuery } from '../lib/clickhouse'

async function checkSplits() {
  console.log('=== Checking Public Betting Splits in DB ===\n')
  
  // Check NFL games
  const nflQuery = `
    SELECT 
      game_id,
      sport,
      public_spread_home_bet_pct,
      public_spread_home_money_pct,
      public_ml_home_bet_pct,
      public_ml_home_money_pct,
      public_total_over_bet_pct,
      public_total_over_money_pct,
      updated_at
    FROM games FINAL
    WHERE sport = 'nfl'
      AND toDate(toTimeZone(game_time, 'America/New_York')) >= toDate(toTimeZone(now(), 'America/New_York'))
    ORDER BY game_time ASC
    LIMIT 20
  `
  
  const nflResult = await clickhouseQuery<any>(nflQuery)
  
  console.log('NFL Games:')
  console.log('----------')
  for (const game of nflResult.data || []) {
    const has50 = game.public_spread_home_bet_pct === 50 && 
                  game.public_spread_home_money_pct === 50 &&
                  game.public_ml_home_bet_pct === 50 &&
                  game.public_total_over_bet_pct === 50
    
    console.log(`${game.game_id}:`)
    console.log(`  Spread: ${game.public_spread_home_bet_pct}% bet / ${game.public_spread_home_money_pct}% money`)
    console.log(`  ML: ${game.public_ml_home_bet_pct}% bet / ${game.public_ml_home_money_pct}% money`)
    console.log(`  Total: ${game.public_total_over_bet_pct}% over bet / ${game.public_total_over_money_pct}% over money`)
    console.log(`  All 50/50: ${has50 ? 'YES (would show N/A)' : 'NO (has real data)'}`)
    console.log(`  Updated: ${game.updated_at}`)
    console.log('')
  }
  
  // Check NBA
  const nbaQuery = `
    SELECT 
      game_id,
      sport,
      public_spread_home_bet_pct,
      public_spread_home_money_pct,
      public_ml_home_bet_pct,
      public_total_over_bet_pct,
      updated_at
    FROM games FINAL
    WHERE sport = 'nba'
      AND toDate(toTimeZone(game_time, 'America/New_York')) >= toDate(toTimeZone(now(), 'America/New_York'))
    ORDER BY game_time ASC
    LIMIT 10
  `
  
  const nbaResult = await clickhouseQuery<any>(nbaQuery)
  
  console.log('\nNBA Games:')
  console.log('----------')
  for (const game of nbaResult.data || []) {
    const has50 = game.public_spread_home_bet_pct === 50 && 
                  game.public_ml_home_bet_pct === 50 &&
                  game.public_total_over_bet_pct === 50
    
    console.log(`${game.game_id}: Spread=${game.public_spread_home_bet_pct}% ML=${game.public_ml_home_bet_pct}% Total=${game.public_total_over_bet_pct}% | All50: ${has50}`)
  }
  
  // Check NHL
  const nhlQuery = `
    SELECT 
      game_id,
      sport,
      public_spread_home_bet_pct,
      public_ml_home_bet_pct,
      public_total_over_bet_pct,
      updated_at
    FROM games FINAL
    WHERE sport = 'nhl'
      AND toDate(toTimeZone(game_time, 'America/New_York')) >= toDate(toTimeZone(now(), 'America/New_York'))
    ORDER BY game_time ASC
    LIMIT 10
  `
  
  const nhlResult = await clickhouseQuery<any>(nhlQuery)
  
  console.log('\nNHL Games:')
  console.log('----------')
  for (const game of nhlResult.data || []) {
    const has50 = game.public_spread_home_bet_pct === 50 && 
                  game.public_ml_home_bet_pct === 50 &&
                  game.public_total_over_bet_pct === 50
    
    console.log(`${game.game_id}: Spread=${game.public_spread_home_bet_pct}% ML=${game.public_ml_home_bet_pct}% Total=${game.public_total_over_bet_pct}% | All50: ${has50}`)
  }
  
  console.log('\n=== Summary ===')
  console.log(`NFL: ${nflResult.data?.length || 0} games found`)
  console.log(`NBA: ${nbaResult.data?.length || 0} games found`)
  console.log(`NHL: ${nhlResult.data?.length || 0} games found`)
}

checkSplits().catch(console.error)

