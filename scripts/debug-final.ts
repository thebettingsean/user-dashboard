import { clickhouseQuery } from '../lib/clickhouse'

async function debugFinal() {
  // Check what FINAL returns vs what all rows have
  const gameId = 'nfl_30621f6a1072712bee795c15eafe9768'
  
  console.log(`=== ALL ROWS for ${gameId} ===`)
  const allRows = await clickhouseQuery<any>(`
    SELECT 
      game_id, game_time,
      public_spread_home_bet_pct,
      public_ml_home_bet_pct,
      public_total_over_bet_pct,
      updated_at
    FROM games 
    WHERE game_id = '${gameId}'
    ORDER BY updated_at DESC
  `)
  
  for (const row of allRows.data || []) {
    console.log(`  game_time=${row.game_time}, spread=${row.public_spread_home_bet_pct}%, ml=${row.public_ml_home_bet_pct}%, total=${row.public_total_over_bet_pct}%, updated=${row.updated_at}`)
  }
  
  console.log(`\n=== FINAL result for ${gameId} ===`)
  const finalRows = await clickhouseQuery<any>(`
    SELECT 
      game_id, game_time,
      public_spread_home_bet_pct,
      public_ml_home_bet_pct,
      public_total_over_bet_pct,
      updated_at
    FROM games FINAL
    WHERE game_id = '${gameId}'
  `)
  
  for (const row of finalRows.data || []) {
    const all50 = row.public_spread_home_bet_pct === 50 && 
                  row.public_ml_home_bet_pct === 50 && 
                  row.public_total_over_bet_pct === 50
    console.log(`  game_time=${row.game_time}, spread=${row.public_spread_home_bet_pct}%, ml=${row.public_ml_home_bet_pct}%, total=${row.public_total_over_bet_pct}%, updated=${row.updated_at} | ALL_50=${all50}`)
  }
  
  // Check another game - Panthers/Buccs which supposedly works
  console.log('\n=== Finding Panthers/Buccs game ===')
  const panthers = await clickhouseQuery<any>(`
    SELECT DISTINCT game_id, home_team_id, away_team_id, game_time
    FROM games 
    WHERE sport = 'nfl'
      AND (home_team_id IN (SELECT team_id FROM teams WHERE name LIKE '%Panthers%' OR name LIKE '%Buccaneers%')
           OR away_team_id IN (SELECT team_id FROM teams WHERE name LIKE '%Panthers%' OR name LIKE '%Buccaneers%'))
    LIMIT 5
  `)
  
  console.log('Panthers/Buccs games found:', panthers.data)
  
  // Check what the API would return for NFL
  console.log('\n=== Simulating API query for NFL ===')
  const apiQuery = await clickhouseQuery<any>(`
    SELECT 
      g.game_id,
      g.public_spread_home_bet_pct,
      g.public_ml_home_bet_pct,
      g.public_total_over_bet_pct
    FROM games g FINAL
    WHERE toDate(toTimeZone(g.game_time, 'America/New_York')) >= toDate(toTimeZone(now(), 'America/New_York'))
      AND g.sport = 'nfl'
    ORDER BY g.game_time ASC
    LIMIT 20
  `)
  
  let all50Count = 0
  let hasRealDataCount = 0
  
  for (const row of apiQuery.data || []) {
    const all50 = row.public_spread_home_bet_pct === 50 && 
                  row.public_ml_home_bet_pct === 50 && 
                  row.public_total_over_bet_pct === 50
    if (all50) {
      all50Count++
    } else {
      hasRealDataCount++
      console.log(`  HAS DATA: ${row.game_id}: spread=${row.public_spread_home_bet_pct}%, ml=${row.public_ml_home_bet_pct}%, total=${row.public_total_over_bet_pct}%`)
    }
  }
  
  console.log(`\n=== SUMMARY ===`)
  console.log(`Total NFL games: ${apiQuery.data?.length || 0}`)
  console.log(`All 50/50 (would show N/A): ${all50Count}`)
  console.log(`Has real data: ${hasRealDataCount}`)
}

debugFinal().catch(console.error)

