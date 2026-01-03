/**
 * Test what the Odds API actually returns for juice
 * Run with: npx tsx scripts/test-odds-api.ts
 */

const ODDS_API_KEY = process.env.ODDS_API_KEY || '2e4e20c0dd0ac58f5d4a7dae03e6fc21'

async function main() {
  console.log('=== Testing Odds API Juice Values ===\n')
  
  // Fetch NFL games
  const response = await fetch(
    `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads,totals,h2h&oddsFormat=american`
  )
  
  if (!response.ok) {
    console.error('API Error:', await response.text())
    return
  }
  
  const games = await response.json()
  console.log(`Found ${games.length} NFL games\n`)
  
  // Look at first game's bookmakers
  const game = games[0]
  if (!game) {
    console.log('No games found')
    return
  }
  
  console.log(`Game: ${game.away_team} @ ${game.home_team}`)
  console.log(`Game ID: ${game.id}`)
  console.log(`\nBookmakers:`)
  
  for (const book of game.bookmakers.slice(0, 3)) { // First 3 books
    console.log(`\n  ${book.title}:`)
    
    for (const market of book.markets) {
      if (market.key === 'spreads') {
        console.log(`    Spreads:`)
        for (const outcome of market.outcomes) {
          console.log(`      ${outcome.name}: ${outcome.point} @ ${outcome.price}`) // price IS the juice!
        }
      } else if (market.key === 'totals') {
        console.log(`    Totals:`)
        for (const outcome of market.outcomes) {
          console.log(`      ${outcome.name}: ${outcome.point} @ ${outcome.price}`)
        }
      }
    }
  }
  
  // Calculate what consensus would look like
  const allJuices: number[] = []
  for (const book of game.bookmakers) {
    for (const market of book.markets) {
      if (market.key === 'spreads') {
        for (const outcome of market.outcomes) {
          if (outcome.name === game.home_team) {
            allJuices.push(outcome.price)
          }
        }
      }
    }
  }
  
  console.log(`\n\nAll home spread juices: [${allJuices.join(', ')}]`)
  console.log(`Median would be: ${allJuices.sort((a,b) => a-b)[Math.floor(allJuices.length/2)]}`)
}

main().catch(console.error)

