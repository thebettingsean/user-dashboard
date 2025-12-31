import { clickhouseQuery } from '../lib/clickhouse'

async function debugClickHouse() {
  console.log('--- DEBUGGING CLICKHOUSE PUBLIC BETTING DATA ---\n')

  try {
    // 1. Check current time in ClickHouse
    const timeQuery = `SELECT now() as utc, toTimeZone(now(), 'America/New_York') as est, today() as today_utc, toDate(toTimeZone(now(), 'America/New_York')) as today_est`
    const timeResult = await clickhouseQuery<any>(timeQuery)
    console.log('Time Check:', timeResult.data[0])

    // 2. Count games per sport for TODAY (EST)
    const countQuery = `
      SELECT 
        sport, 
        count() as total_games,
        countIf(public_spread_home_bet_pct IS NOT NULL AND public_spread_home_bet_pct != 50) as with_data
      FROM games
      WHERE toDate(toTimeZone(game_time, 'America/New_York')) = toDate(toTimeZone(now(), 'America/New_York'))
      GROUP BY sport
    `
    const countResult = await clickhouseQuery<any>(countQuery)
    console.log('\nGames for TODAY (EST):')
    console.table(countResult.data)

    // 3. Sample NBA games
    const nbaQuery = `
      SELECT 
        game_id, 
        game_time, 
        toDate(toTimeZone(game_time, 'America/New_York')) as game_date_est,
        home_team_id,
        away_team_id,
        public_spread_home_bet_pct
      FROM games
      WHERE sport = 'nba'
        AND toDate(toTimeZone(game_time, 'America/New_York')) >= toDate(toTimeZone(now(), 'America/New_York'))
      LIMIT 5
    `
    const nbaResult = await clickhouseQuery<any>(nbaQuery)
    console.log('\nNBA Sample (Today/Future EST):')
    console.table(nbaResult.data)

  } catch (error) {
    console.error('Error:', error)
  }
}

debugClickHouse()

