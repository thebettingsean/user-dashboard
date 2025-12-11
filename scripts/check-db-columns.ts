/**
 * Check if prev_margin columns exist and have data
 */

async function checkColumns() {
  console.log('Checking prev_margin column values in database...\n')
  
  // Direct query to check column values
  const queries = [
    // Check if columns exist and have data
    `SELECT 
      count() as total_games,
      countIf(home_prev_margin != 0) as games_with_home_prev_margin,
      countIf(away_prev_margin != 0) as games_with_away_prev_margin,
      countIf(home_streak != 0) as games_with_home_streak,
      countIf(away_streak != 0) as games_with_away_streak
    FROM nfl_games
    WHERE season >= 2022`,
    
    // Get sample of games with prev_margin values
    `SELECT 
      game_id,
      toString(game_date) as game_date,
      home_team_id,
      away_team_id,
      home_prev_margin,
      away_prev_margin,
      home_streak,
      away_streak,
      home_score,
      away_score
    FROM nfl_games
    WHERE season = 2025
    ORDER BY game_date DESC
    LIMIT 10`,
    
    // Specifically check Dec 7 CHI @ GB
    `SELECT 
      game_id,
      toString(game_date) as game_date,
      home_team_id,
      away_team_id,
      home_prev_margin,
      away_prev_margin,
      home_streak,
      away_streak,
      home_score,
      away_score,
      is_division_game
    FROM nfl_games
    WHERE game_date = '2025-12-07'
      AND (home_team_id = 9 OR away_team_id = 9)
    LIMIT 5`
  ]
  
  for (let i = 0; i < queries.length; i++) {
    console.log(`\n--- Query ${i + 1} ---`)
    console.log(queries[i].substring(0, 100) + '...\n')
    
    // Use the debug API endpoint
    const response = await fetch('https://thebettinginsider.com/api/clickhouse/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: queries[i] })
    })
    
    if (!response.ok) {
      console.log(`Error: HTTP ${response.status}`)
      const text = await response.text()
      console.log(text.substring(0, 500))
      continue
    }
    
    const data = await response.json()
    console.log('Result:')
    console.log(JSON.stringify(data.data || data, null, 2))
  }
}

checkColumns().catch(console.error)

