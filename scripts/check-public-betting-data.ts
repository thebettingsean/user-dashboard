import { clickhouseQuery } from '../lib/clickhouse'

async function checkPublicBettingData() {
  console.log('Checking public betting data across sports...\n')

  const sports = ['nfl', 'nba', 'nhl', 'cfb', 'cbb']

  for (const sport of sports) {
    console.log(`\n=== ${sport.toUpperCase()} ===`)
    
    try {
      // Count total games
      const totalQuery = `
        SELECT COUNT(*) as total
        FROM games
        WHERE sport = '${sport}'
          AND toDate(toTimeZone(game_time, 'America/New_York')) >= toDate(toTimeZone(now(), 'America/New_York'))
      `
      const totalResult = await clickhouseQuery<{ total: number }>(totalQuery)
      const totalGames = totalResult.data[0]?.total || 0
      console.log(`Total games: ${totalGames}`)

      // Count games with betting data (not 50% or null)
      const withDataQuery = `
        SELECT COUNT(*) as with_data
        FROM games
        WHERE sport = '${sport}'
          AND toDate(toTimeZone(game_time, 'America/New_York')) >= toDate(toTimeZone(now(), 'America/New_York'))
          AND (
            (public_spread_home_bet_pct != 50 AND public_spread_home_bet_pct IS NOT NULL)
            OR (public_spread_home_money_pct != 50 AND public_spread_home_money_pct IS NOT NULL)
          )
      `
      const withDataResult = await clickhouseQuery<{ with_data: number }>(withDataQuery)
      const gamesWithData = withDataResult.data[0]?.with_data || 0
      console.log(`Games with betting data: ${gamesWithData}`)
      console.log(`Percentage: ${totalGames > 0 ? ((gamesWithData / totalGames) * 100).toFixed(1) : 0}%`)

      // Sample a few games
      const sampleQuery = `
        SELECT 
          game_id,
          game_time,
          public_spread_home_bet_pct,
          public_spread_home_money_pct,
          public_ml_home_bet_pct,
          public_total_over_bet_pct,
          updated_at
        FROM games
        WHERE sport = '${sport}'
          AND toDate(toTimeZone(game_time, 'America/New_York')) >= toDate(toTimeZone(now(), 'America/New_York'))
        ORDER BY game_time
        LIMIT 3
      `
      const sampleResult = await clickhouseQuery<any>(sampleQuery)
      
      if (sampleResult.data.length > 0) {
        console.log('\nSample games:')
        sampleResult.data.forEach((game: any, idx: number) => {
          console.log(`  Game ${idx + 1}:`)
          console.log(`    Spread Bet: ${game.public_spread_home_bet_pct}%`)
          console.log(`    Spread Money: ${game.public_spread_home_money_pct}%`)
          console.log(`    ML Bet: ${game.public_ml_home_bet_pct}%`)
          console.log(`    Total Over: ${game.public_total_over_bet_pct}%`)
          console.log(`    Updated: ${game.updated_at}`)
        })
      }

    } catch (error) {
      console.error(`Error checking ${sport}:`, error)
    }
  }
}

checkPublicBettingData()

