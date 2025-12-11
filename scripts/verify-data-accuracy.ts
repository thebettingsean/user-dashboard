/**
 * Data Accuracy Verification Script
 * Verifies specific games and their filter criteria
 */

const API_BASE = 'https://thebettinginsider.com/api/query-engine'

interface Game {
  game_id: number
  game_date: string
  home_abbr: string
  away_abbr: string
  home_score: number
  away_score: number
  spread: number
  spread_close?: number
  hit: boolean
  home_team_id?: number
  away_team_id?: number
}

async function fetchGames(payload: any): Promise<{ games: Game[], filters_applied: string[] }> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const data = await response.json()
  return { games: data.games || [], filters_applied: data.filters_applied || [] }
}

async function verifyPrevMarginFilter() {
  console.log('='.repeat(80))
  console.log('VERIFICATION 1: Previous Game Margin Filter')
  console.log('='.repeat(80))
  console.log('')
  
  // Get games where team "lost previous game by 1+"
  console.log('Query: Division games where team lost previous by 1+ (max: -1)')
  const { games, filters_applied } = await fetchGames({
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { 
      time_period: 'since_2022',
      is_division: 'division',
      prev_game_margin: { max: -1 }  // Lost by at least 1
    }
  })
  
  console.log(`Filters Applied: ${filters_applied.join(', ')}`)
  console.log(`Total Games: ${games.length}`)
  console.log('')
  
  // Look for Bears @ Packers game (Dec 7, 2025)
  const bearsPackersGames = games.filter((g: any) => 
    (g.home_abbr === 'GB' && g.away_abbr === 'CHI') || 
    (g.home_abbr === 'CHI' && g.away_abbr === 'GB')
  )
  
  console.log('Bears @ Packers games found in results:')
  for (const game of bearsPackersGames) {
    console.log(`  Date: ${game.game_date}`)
    console.log(`  Matchup: ${game.away_abbr} @ ${game.home_abbr}`)
    console.log(`  Score: ${game.away_score} - ${game.home_score}`)
    console.log(`  Spread: ${game.spread}`)
    console.log(`  Hit: ${game.hit}`)
    console.log('')
  }
  
  if (bearsPackersGames.length === 0) {
    console.log('  (No Bears @ Packers games found in this result set)')
  }
  
  // Get the 10 most recent games
  console.log('\n10 Most Recent Division Games Where Team Lost Previous:')
  const recentGames = games.slice(0, 10)
  for (const game of recentGames) {
    console.log(`  ${game.game_date}: ${game.away_abbr} @ ${game.home_abbr} (${game.away_score}-${game.home_score}) spread: ${game.spread} hit: ${game.hit}`)
  }
}

async function verifyBearsSchedule() {
  console.log('\n' + '='.repeat(80))
  console.log('VERIFICATION 2: Bears 2025 Schedule Analysis')
  console.log('='.repeat(80))
  console.log('')
  
  // Query for ALL Bears games to see their results
  console.log('Query: All Bears games this season')
  const { games } = await fetchGames({
    type: 'team',
    team_id: 3, // Bears ESPN ID
    bet_type: 'spread',
    filters: { time_period: 'season' }
  })
  
  console.log(`Total Bears Games: ${games.length}`)
  console.log('\nBears Game-by-Game Results:')
  
  // Sort by date ascending
  const sortedGames = [...games].sort((a, b) => 
    new Date(a.game_date).getTime() - new Date(b.game_date).getTime()
  )
  
  for (const game of sortedGames) {
    const isHome = game.home_abbr === 'CHI'
    const bearsScore = isHome ? game.home_score : game.away_score
    const oppScore = isHome ? game.away_score : game.home_score
    const opponent = isHome ? game.away_abbr : game.home_abbr
    const result = bearsScore > oppScore ? 'W' : bearsScore < oppScore ? 'L' : 'T'
    
    console.log(`  ${game.game_date}: ${result} vs ${opponent} (${bearsScore}-${oppScore})`)
  }
  
  // Find the game before the Packers game
  const packersGameIndex = sortedGames.findIndex((g: any) => 
    g.home_abbr === 'GB' || g.away_abbr === 'GB'
  )
  
  if (packersGameIndex > 0) {
    const prevGame = sortedGames[packersGameIndex - 1]
    const packersGame = sortedGames[packersGameIndex]
    
    console.log('\n--- CRITICAL ANALYSIS ---')
    console.log(`Game vs Packers: ${packersGame.game_date}`)
    console.log(`Previous Game: ${prevGame.game_date}`)
    
    const isHomePrev = prevGame.home_abbr === 'CHI'
    const bearsScorePrev = isHomePrev ? prevGame.home_score : prevGame.away_score
    const oppScorePrev = isHomePrev ? prevGame.away_score : prevGame.home_score
    const oppPrev = isHomePrev ? prevGame.away_abbr : prevGame.home_abbr
    const margin = bearsScorePrev - oppScorePrev
    
    console.log(`Previous Game Result: Bears ${bearsScorePrev} - ${oppPrev} ${oppScorePrev}`)
    console.log(`Previous Game Margin: ${margin > 0 ? '+' : ''}${margin}`)
    console.log(`Bears ${margin > 0 ? 'WON' : 'LOST'} their previous game`)
    
    if (margin > 0) {
      console.log('\n⚠️  ISSUE CONFIRMED: Bears WON their previous game, but showed in "lost previous" filter!')
    } else {
      console.log('\n✅ Filter is CORRECT: Bears lost their previous game')
    }
  }
}

async function testPrevMarginLogic() {
  console.log('\n' + '='.repeat(80))
  console.log('VERIFICATION 3: Previous Margin Filter Logic Test')
  console.log('='.repeat(80))
  console.log('')
  
  // Test with "Won previous" filter
  console.log('Query A: Teams that WON previous game (min: 1)')
  const { games: wonPrev } = await fetchGames({
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'season', prev_game_margin: { min: 1 } }
  })
  
  // Test with "Lost previous" filter
  console.log('Query B: Teams that LOST previous game (max: -1)')
  const { games: lostPrev } = await fetchGames({
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'season', prev_game_margin: { max: -1 } }
  })
  
  // Get ALL games for comparison
  console.log('Query C: ALL games (no prev margin filter)')
  const { games: allGames } = await fetchGames({
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'season' }
  })
  
  console.log(`\nResults:`)
  console.log(`  Won Previous (min: 1): ${wonPrev.length} games`)
  console.log(`  Lost Previous (max: -1): ${lostPrev.length} games`)
  console.log(`  All Games: ${allGames.length} games`)
  console.log(`  Sum of Won+Lost: ${wonPrev.length + lostPrev.length}`)
  console.log(`  Difference (likely ties/first games): ${allGames.length - wonPrev.length - lostPrev.length}`)
  
  // Check for overlap
  const wonIds = new Set(wonPrev.map((g: any) => g.game_id))
  const overlap = lostPrev.filter((g: any) => wonIds.has(g.game_id))
  
  if (overlap.length > 0) {
    console.log(`\n⚠️  CRITICAL ISSUE: ${overlap.length} games appear in BOTH won and lost filters!`)
    console.log('Overlapping games:')
    for (const game of overlap.slice(0, 5)) {
      console.log(`  ${game.game_date}: ${game.away_abbr} @ ${game.home_abbr}`)
    }
  } else {
    console.log('\n✅ No overlap between won and lost filters')
  }
}

async function testDivisionFilterAccuracy() {
  console.log('\n' + '='.repeat(80))
  console.log('VERIFICATION 4: Division Filter Accuracy')
  console.log('='.repeat(80))
  console.log('')
  
  // Division games
  const { games: divisionGames } = await fetchGames({
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', is_division: 'division' }
  })
  
  // Non-division games
  const { games: nonDivisionGames } = await fetchGames({
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022', is_division: 'non_division' }
  })
  
  // All games
  const { games: allGames } = await fetchGames({
    type: 'trend',
    bet_type: 'spread',
    side: 'home',
    filters: { time_period: 'since_2022' }
  })
  
  console.log(`Division Games: ${divisionGames.length}`)
  console.log(`Non-Division Games: ${nonDivisionGames.length}`)
  console.log(`All Games: ${allGames.length}`)
  console.log(`Sum: ${divisionGames.length + nonDivisionGames.length}`)
  
  // These should match
  if (divisionGames.length + nonDivisionGames.length === allGames.length) {
    console.log('✅ Division + Non-Division = All Games')
  } else {
    console.log(`⚠️  Mismatch: ${allGames.length - divisionGames.length - nonDivisionGames.length} games unaccounted`)
  }
  
  // Verify some division matchups are correct
  console.log('\nSample Division Games (should all be same-division matchups):')
  const divisionPairs: Record<string, string[]> = {
    'NFC East': ['DAL', 'NYG', 'PHI', 'WAS'],
    'NFC West': ['ARI', 'LAR', 'SF', 'SEA'],
    'NFC North': ['CHI', 'DET', 'GB', 'MIN'],
    'NFC South': ['ATL', 'CAR', 'NO', 'TB'],
    'AFC East': ['BUF', 'MIA', 'NE', 'NYJ'],
    'AFC West': ['DEN', 'KC', 'LAC', 'LV'],
    'AFC North': ['BAL', 'CIN', 'CLE', 'PIT'],
    'AFC South': ['HOU', 'IND', 'JAX', 'TEN']
  }
  
  // Create a reverse lookup
  const teamToDivision: Record<string, string> = {}
  for (const [div, teams] of Object.entries(divisionPairs)) {
    for (const team of teams) {
      teamToDivision[team] = div
    }
  }
  
  let divisionCorrect = 0
  let divisionWrong = 0
  
  for (const game of divisionGames.slice(0, 20)) {
    const homeDiv = teamToDivision[game.home_abbr]
    const awayDiv = teamToDivision[game.away_abbr]
    
    if (homeDiv === awayDiv) {
      divisionCorrect++
    } else {
      divisionWrong++
      console.log(`  ⚠️  ${game.away_abbr} (${awayDiv}) @ ${game.home_abbr} (${homeDiv}) - NOT same division!`)
    }
  }
  
  if (divisionWrong === 0) {
    console.log(`  ✅ All ${divisionCorrect} sampled games are correct division matchups`)
  } else {
    console.log(`  ${divisionCorrect} correct, ${divisionWrong} wrong`)
  }
}

async function main() {
  console.log('DATA ACCURACY VERIFICATION REPORT')
  console.log('Generated: ' + new Date().toISOString())
  console.log('')
  
  await verifyPrevMarginFilter()
  await verifyBearsSchedule()
  await testPrevMarginLogic()
  await testDivisionFilterAccuracy()
  
  console.log('\n' + '='.repeat(80))
  console.log('VERIFICATION COMPLETE')
  console.log('='.repeat(80))
}

main().catch(console.error)

