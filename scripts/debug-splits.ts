import { clickhouseQuery } from '../lib/clickhouse'

async function debugSplits() {
  console.log('=== DEBUGGING SPLITS ISSUE ===\n')
  
  // 1. Check if ANY NFL games have non-50/50 splits
  const nflRealSplits = await clickhouseQuery<any>(`
    SELECT 
      game_id,
      public_spread_home_bet_pct,
      public_ml_home_bet_pct,
      public_total_over_bet_pct,
      updated_at
    FROM games 
    WHERE sport = 'nfl'
      AND (
        (public_spread_home_bet_pct != 50 AND public_spread_home_bet_pct IS NOT NULL) OR
        (public_ml_home_bet_pct != 50 AND public_ml_home_bet_pct IS NOT NULL) OR
        (public_total_over_bet_pct != 50 AND public_total_over_bet_pct IS NOT NULL)
      )
    ORDER BY updated_at DESC
    LIMIT 20
  `)
  
  console.log('=== NFL GAMES WITH REAL SPLITS (non-50/50) ===')
  console.log(`Found: ${nflRealSplits.data?.length || 0} rows`)
  for (const row of nflRealSplits.data || []) {
    console.log(`  ${row.game_id}: spread=${row.public_spread_home_bet_pct}%, ml=${row.public_ml_home_bet_pct}%, total=${row.public_total_over_bet_pct}% | ${row.updated_at}`)
  }
  
  // 2. Check NBA
  const nbaRealSplits = await clickhouseQuery<any>(`
    SELECT 
      game_id,
      public_spread_home_bet_pct,
      public_ml_home_bet_pct,
      public_total_over_bet_pct,
      updated_at
    FROM games 
    WHERE sport = 'nba'
      AND (
        (public_spread_home_bet_pct != 50 AND public_spread_home_bet_pct IS NOT NULL) OR
        (public_ml_home_bet_pct != 50 AND public_ml_home_bet_pct IS NOT NULL) OR
        (public_total_over_bet_pct != 50 AND public_total_over_bet_pct IS NOT NULL)
      )
    ORDER BY updated_at DESC
    LIMIT 20
  `)
  
  console.log('\n=== NBA GAMES WITH REAL SPLITS (non-50/50) ===')
  console.log(`Found: ${nbaRealSplits.data?.length || 0} rows`)
  for (const row of nbaRealSplits.data || []) {
    console.log(`  ${row.game_id}: spread=${row.public_spread_home_bet_pct}%, ml=${row.public_ml_home_bet_pct}%, total=${row.public_total_over_bet_pct}%`)
  }
  
  // 3. Check NHL
  const nhlRealSplits = await clickhouseQuery<any>(`
    SELECT 
      game_id,
      public_spread_home_bet_pct,
      public_ml_home_bet_pct,
      public_total_over_bet_pct,
      updated_at
    FROM games 
    WHERE sport = 'nhl'
      AND (
        (public_spread_home_bet_pct != 50 AND public_spread_home_bet_pct IS NOT NULL) OR
        (public_ml_home_bet_pct != 50 AND public_ml_home_bet_pct IS NOT NULL) OR
        (public_total_over_bet_pct != 50 AND public_total_over_bet_pct IS NOT NULL)
      )
    ORDER BY updated_at DESC
    LIMIT 20
  `)
  
  console.log('\n=== NHL GAMES WITH REAL SPLITS (non-50/50) ===')
  console.log(`Found: ${nhlRealSplits.data?.length || 0} rows`)
  for (const row of nhlRealSplits.data || []) {
    console.log(`  ${row.game_id}: spread=${row.public_spread_home_bet_pct}%, ml=${row.public_ml_home_bet_pct}%, total=${row.public_total_over_bet_pct}%`)
  }
  
  // 4. Check CFB
  const cfbRealSplits = await clickhouseQuery<any>(`
    SELECT 
      game_id,
      public_spread_home_bet_pct,
      public_ml_home_bet_pct,
      public_total_over_bet_pct,
      updated_at
    FROM games 
    WHERE sport = 'cfb'
      AND (
        (public_spread_home_bet_pct != 50 AND public_spread_home_bet_pct IS NOT NULL) OR
        (public_ml_home_bet_pct != 50 AND public_ml_home_bet_pct IS NOT NULL) OR
        (public_total_over_bet_pct != 50 AND public_total_over_bet_pct IS NOT NULL)
      )
    ORDER BY updated_at DESC
    LIMIT 20
  `)
  
  console.log('\n=== CFB GAMES WITH REAL SPLITS (non-50/50) ===')
  console.log(`Found: ${cfbRealSplits.data?.length || 0} rows`)
  for (const row of cfbRealSplits.data || []) {
    console.log(`  ${row.game_id}: spread=${row.public_spread_home_bet_pct}%, ml=${row.public_ml_home_bet_pct}%, total=${row.public_total_over_bet_pct}%`)
  }
  
  // 5. What does FINAL return for NFL games?
  console.log('\n\n=== WHAT FINAL RETURNS (what frontend sees) ===')
  const finalResult = await clickhouseQuery<any>(`
    SELECT 
      game_id,
      public_spread_home_bet_pct,
      public_ml_home_bet_pct,
      public_total_over_bet_pct,
      updated_at
    FROM games FINAL
    WHERE sport = 'nfl'
      AND toDate(toTimeZone(game_time, 'America/New_York')) >= toDate(toTimeZone(now(), 'America/New_York'))
    LIMIT 10
  `)
  
  console.log('NFL games via FINAL:')
  for (const row of finalResult.data || []) {
    const all50 = row.public_spread_home_bet_pct === 50 && 
                  row.public_ml_home_bet_pct === 50 && 
                  row.public_total_over_bet_pct === 50
    console.log(`  ${row.game_id}: spread=${row.public_spread_home_bet_pct}%, ml=${row.public_ml_home_bet_pct}%, total=${row.public_total_over_bet_pct}% | all50=${all50}`)
  }
  
  // 6. Check Panthers/Buccs specifically since that one works
  console.log('\n\n=== PANTHERS/BUCCANEERS GAME (the one that works) ===')
  const panthersGame = await clickhouseQuery<any>(`
    SELECT 
      game_id,
      public_spread_home_bet_pct,
      public_ml_home_bet_pct,
      public_total_over_bet_pct,
      updated_at
    FROM games
    WHERE sport = 'nfl'
      AND (game_id LIKE '%panthers%' OR game_id LIKE '%buccaneers%' OR game_id LIKE '%buccs%' OR game_id LIKE '%tampa%' OR game_id LIKE '%carolina%')
    ORDER BY updated_at DESC
    LIMIT 5
  `)
  
  if (!panthersGame.data?.length) {
    // Try by looking at games with real splits
    const gamesWithData = await clickhouseQuery<any>(`
      SELECT DISTINCT game_id FROM games 
      WHERE sport = 'nfl' 
        AND public_ml_home_bet_pct != 50
      LIMIT 5
    `)
    console.log('Games with non-50 ML:', gamesWithData.data)
  } else {
    for (const row of panthersGame.data || []) {
      console.log(`  ${row.game_id}: spread=${row.public_spread_home_bet_pct}%, ml=${row.public_ml_home_bet_pct}%, total=${row.public_total_over_bet_pct}% | ${row.updated_at}`)
    }
  }
  
  console.log('\n=== SUMMARY ===')
  console.log(`NFL real splits: ${nflRealSplits.data?.length || 0}`)
  console.log(`NBA real splits: ${nbaRealSplits.data?.length || 0}`)
  console.log(`NHL real splits: ${nhlRealSplits.data?.length || 0}`)
  console.log(`CFB real splits: ${cfbRealSplits.data?.length || 0}`)
}

debugSplits().catch(console.error)

