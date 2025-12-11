/**
 * Check raw database values for prev_margin columns
 */

const API_BASE = 'https://thebettinginsider.com/api/query-engine'

async function checkRawData() {
  console.log('='.repeat(80))
  console.log('RAW DATABASE VALUE CHECK')
  console.log('='.repeat(80))
  
  // Get ALL division games this season (no prev_margin filter)
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'trend',
      bet_type: 'spread',
      side: 'home',
      filters: { 
        time_period: 'season',
        is_division: 'division'
      }
    })
  })
  
  const data = await response.json()
  
  console.log('\nTotal division games:', data.total_games)
  console.log('\nChecking Dec 7 CHI @ GB game:')
  
  const dec7Game = data.games.find((g: any) => 
    g.game_date.includes('2025-12-07') && g.home_abbr === 'GB' && g.away_abbr === 'CHI'
  )
  
  if (dec7Game) {
    console.log('\nFull game object:')
    console.log(JSON.stringify(dec7Game, null, 2))
    
    // Check if home_prev_margin or away_prev_margin are in the response
    console.log('\n--- Looking for prev_margin values ---')
    console.log('home_prev_margin:', (dec7Game as any).home_prev_margin)
    console.log('away_prev_margin:', (dec7Game as any).away_prev_margin)
    console.log('home_streak:', (dec7Game as any).home_streak)
    console.log('away_streak:', (dec7Game as any).away_streak)
  }
  
  // Let's also check 5 random games to see their prev_margin values
  console.log('\n--- Sample of 5 games to check prev_margin values ---')
  for (const game of data.games.slice(0, 5)) {
    console.log(`${game.game_date}: ${game.away_abbr} @ ${game.home_abbr}`)
    console.log(`  home_prev_margin: ${(game as any).home_prev_margin}`)
    console.log(`  away_prev_margin: ${(game as any).away_prev_margin}`)
    console.log(`  home_streak: ${(game as any).home_streak}`)
    console.log(`  away_streak: ${(game as any).away_streak}`)
  }
}

async function checkQueryWithPrevMargin() {
  console.log('\n' + '='.repeat(80))
  console.log('QUERY WITH PREV_MARGIN FILTER')
  console.log('='.repeat(80))
  
  // Query with prev_margin: { max: -1 }
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'trend',
      bet_type: 'spread',
      side: 'home',
      filters: { 
        time_period: 'season',
        is_division: 'division',
        prev_game_margin: { max: -1 }
      }
    })
  })
  
  const data = await response.json()
  
  console.log('\nFilters applied:', data.filters_applied)
  console.log('Total games:', data.total_games)
  
  // Check what Dec games show up
  const dec7Games = data.games.filter((g: any) => g.game_date.includes('2025-12-07'))
  console.log('\nDec 7 games in results:', dec7Games.length)
  for (const g of dec7Games) {
    console.log(`  ${g.away_abbr} @ ${g.home_abbr}`)
  }
  
  // Let's see what games ARE showing up
  console.log('\n10 most recent games in "Lost Previous" filter:')
  for (const game of data.games.slice(0, 10)) {
    console.log(`${game.game_date}: ${game.away_abbr} @ ${game.home_abbr}`)
    console.log(`  home_prev_margin: ${(game as any).home_prev_margin || 'not in response'}`)
    console.log(`  score: ${game.away_score}-${game.home_score}`)
  }
}

async function main() {
  await checkRawData()
  await checkQueryWithPrevMargin()
}

main().catch(console.error)

