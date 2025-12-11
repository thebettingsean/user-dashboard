/**
 * Debug Previous Margin Filter
 * Specifically investigate the Bears @ Packers issue
 */

const API_BASE = 'https://thebettinginsider.com/api/query-engine'

async function debugBearsPackers() {
  console.log('='.repeat(80))
  console.log('DEBUG: Previous Margin Filter for Bears @ Packers')
  console.log('='.repeat(80))
  console.log('')
  
  // First, get the raw Division + Lost Previous filter
  console.log('Query 1: Division + Lost Previous (max: -1)')
  const response1 = await fetch(API_BASE, {
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
  
  const data1 = await response1.json()
  
  // Find Dec 7 games
  const dec7Games = data1.games.filter((g: any) => g.game_date.includes('2025-12-07'))
  
  console.log('\nDec 7, 2025 games in "Division + Lost Previous" results:')
  for (const game of dec7Games) {
    console.log(`  ${game.away_abbr} @ ${game.home_abbr}`)
    console.log(`    Score: ${game.away_score}-${game.home_score}`)
    console.log(`    Spread: ${game.spread}`)
    console.log(`    Hit: ${game.hit}`)
  }
  
  // Now let's see what the CHI @ GB game looks like without prev_margin filter
  console.log('\n' + '-'.repeat(40))
  console.log('Query 2: Just Division games this season')
  const response2 = await fetch(API_BASE, {
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
  
  const data2 = await response2.json()
  const packersGame = data2.games.find((g: any) => 
    g.game_date.includes('2025-12-07') && (g.home_abbr === 'GB' || g.away_abbr === 'GB')
  )
  
  if (packersGame) {
    console.log('\nCHI @ GB game from "Division only" query:')
    console.log(JSON.stringify(packersGame, null, 2))
  }
  
  // Now test with "Won Previous"
  console.log('\n' + '-'.repeat(40))
  console.log('Query 3: Division + WON Previous (min: 1)')
  const response3 = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'trend',
      bet_type: 'spread',
      side: 'home',
      filters: { 
        time_period: 'season',
        is_division: 'division',
        prev_game_margin: { min: 1 }
      }
    })
  })
  
  const data3 = await response3.json()
  const packersGameWonPrev = data3.games.find((g: any) => 
    g.game_date.includes('2025-12-07') && (g.home_abbr === 'GB' || g.away_abbr === 'GB')
  )
  
  console.log('\nCHI @ GB game in "Division + Won Previous" results:')
  console.log(packersGameWonPrev ? 'FOUND (correct!)' : 'NOT FOUND (wrong - Bears won previous)')
  
  // Key insight: The filter is likely applying to HOME team, not the subject of the query
  console.log('\n' + '='.repeat(80))
  console.log('ANALYSIS')
  console.log('='.repeat(80))
  console.log('')
  console.log('The query is "home teams covering spread + division games + lost previous"')
  console.log('For the CHI @ GB game:')
  console.log('  - Home team: GB (Packers)')
  console.log('  - The filter might be checking if PACKERS lost their previous game')
  console.log('  - NOT if the subject team (Bears) lost their previous game')
  console.log('')
  console.log('This is likely the bug: prev_game_margin filter uses home_prev_margin')
  console.log('But for "home covering" query, this SHOULD be the home team\'s margin')
  console.log('So if Packers lost their previous, this game would correctly show up.')
  
  // Verify Packers previous game
  console.log('\n' + '-'.repeat(40))
  console.log('Verifying: What was PACKERS previous game before Dec 7?')
  
  const response4 = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'team',
      team_id: 9, // Packers ESPN ID
      bet_type: 'spread',
      filters: { time_period: 'season' }
    })
  })
  
  const data4 = await response4.json()
  const packersGames = data4.games.sort((a: any, b: any) => 
    new Date(a.game_date).getTime() - new Date(b.game_date).getTime()
  )
  
  console.log('\nPackers 2025 Schedule:')
  for (const game of packersGames) {
    const isHome = game.home_abbr === 'GB'
    const gbScore = isHome ? game.home_score : game.away_score
    const oppScore = isHome ? game.away_score : game.home_score
    const opponent = isHome ? game.away_abbr : game.home_abbr
    const result = gbScore > oppScore ? 'W' : gbScore < oppScore ? 'L' : 'T'
    const marker = game.game_date.includes('2025-12-07') ? ' <<<' : ''
    
    console.log(`  ${game.game_date}: ${result} vs ${opponent} (${gbScore}-${oppScore})${marker}`)
  }
  
  // Find game before Dec 7
  const dec7Index = packersGames.findIndex((g: any) => g.game_date.includes('2025-12-07'))
  if (dec7Index > 0) {
    const prevPackersGame = packersGames[dec7Index - 1]
    const isHome = prevPackersGame.home_abbr === 'GB'
    const gbScore = isHome ? prevPackersGame.home_score : prevPackersGame.away_score
    const oppScore = isHome ? prevPackersGame.away_score : prevPackersGame.home_score
    const margin = gbScore - oppScore
    
    console.log('\n--- Packers Previous Game Analysis ---')
    console.log(`Date: ${prevPackersGame.game_date}`)
    console.log(`Score: GB ${gbScore} - Opponent ${oppScore}`)
    console.log(`Margin: ${margin > 0 ? '+' : ''}${margin}`)
    console.log(`Result: Packers ${margin > 0 ? 'WON' : 'LOST'}`)
    
    if (margin < 0) {
      console.log('\n✅ EXPLANATION: Packers lost their previous game!')
      console.log('   The filter is working correctly - it checks the HOME TEAM\'s previous game')
      console.log('   Since GB is home and lost their previous, this game appears.')
      console.log('')
      console.log('   HOWEVER: The user expected it to filter by the SUBJECT team\'s previous')
      console.log('   which would be the team covering the spread, not necessarily the home team.')
    }
  }
}

async function main() {
  await debugBearsPackers()
}

main().catch(console.error)

