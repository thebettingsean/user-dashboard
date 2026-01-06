#!/usr/bin/env node

// Local test script to debug NBA/NHL splits matching
// Usage: node test-splits-matching.js nba

const sport = process.argv[2] || 'nba'

const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY || process.env.SPORTSDATA_API_KEY
const ODDS_API_KEY = process.env.ODDS_API_KEY

if (!SPORTSDATA_API_KEY || !ODDS_API_KEY) {
  console.error('ERROR: Missing API keys. Set SPORTSDATA_IO_SPLITS_KEY and ODDS_API_KEY')
  process.exit(1)
}

const config = {
  nba: { sportsdataPath: 'nba', oddsApiSport: 'basketball_nba' },
  nhl: { sportsdataPath: 'nhl', oddsApiSport: 'icehockey_nhl' },
  cfb: { sportsdataPath: 'cfb', oddsApiSport: 'americanfootball_ncaaf' }
}

if (!config[sport]) {
  console.error(`Invalid sport: ${sport}. Use: nba, nhl, or cfb`)
  process.exit(1)
}

const sportConfig = config[sport]

async function test() {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`TESTING ${sport.toUpperCase()} SPLITS MATCHING`)
  console.log('='.repeat(80))
  
  // Step 1: Fetch games from SportsDataIO
  console.log('\n[1] FETCHING GAMES FROM SPORTSDATA.IO...')
  
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()
  
  let season
  if (sport === 'nba' || sport === 'nhl') {
    season = currentMonth >= 9 ? currentYear + 1 : currentYear
  } else {
    season = currentYear
  }
  
  console.log(`   Season: ${season}`)
  
  const gamesUrl = `https://api.sportsdata.io/v3/${sportConfig.sportsdataPath}/scores/json/Games/${season}?key=${SPORTSDATA_API_KEY}`
  const gamesResp = await fetch(gamesUrl)
  
  if (!gamesResp.ok) {
    console.error(`   ERROR: Games API returned ${gamesResp.status}`)
    process.exit(1)
  }
  
  const allGames = await gamesResp.json()
  const todayStr = today.toISOString().split('T')[0]
  const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const futureDateStr = futureDate.toISOString().split('T')[0]
  
  const upcomingGames = allGames.filter(game => {
    const gameDate = (game.Day || game.DateTime || '').split('T')[0]
    return gameDate >= todayStr && gameDate <= futureDateStr
  }).slice(0, 5)
  
  console.log(`   Found ${upcomingGames.length} upcoming games`)
  
  if (upcomingGames.length === 0) {
    console.error('   ERROR: No upcoming games found')
    process.exit(1)
  }
  
  // Step 2: Build sportsDataAbbrevMap (like the cron does)
  console.log('\n[2] BUILDING ABBREVIATION MAP FROM SPORTSDATA.IO...')
  const sportsDataAbbrevMap = new Map()
  
  for (const game of upcomingGames) {
    const homeName = game.HomeTeamName || game.HomeTeam
    const awayName = game.AwayTeamName || game.AwayTeam
    sportsDataAbbrevMap.set(homeName, game.HomeTeam)
    sportsDataAbbrevMap.set(awayName, game.AwayTeam)
  }
  
  console.log(`   Map entries: ${sportsDataAbbrevMap.size}`)
  console.log('   Sample mappings:')
  Array.from(sportsDataAbbrevMap.entries()).slice(0, 5).forEach(([name, abbr]) => {
    console.log(`     "${name}" => "${abbr}"`)
  })
  
  // Step 3: Fetch splits and store with keys
  console.log('\n[3] FETCHING BETTING SPLITS FROM SPORTSDATA.IO...')
  const publicBettingMap = new Map()
  
  const testGame = upcomingGames[0]
  const gameId = testGame.GameID || testGame.GameId
  
  console.log(`   Test game: ${testGame.AwayTeam} @ ${testGame.HomeTeam} (ID: ${gameId})`)
  
  const splitsUrl = `https://api.sportsdata.io/v3/${sportConfig.sportsdataPath}/odds/json/BettingSplitsByGameId/${gameId}?key=${SPORTSDATA_API_KEY}`
  const splitsResp = await fetch(splitsUrl)
  
  if (!splitsResp.ok) {
    console.error(`   ERROR: Splits API returned ${splitsResp.status}`)
    process.exit(1)
  }
  
  const splits = await splitsResp.json()
  
  if (!splits?.BettingMarketSplits || splits.BettingMarketSplits.length === 0) {
    console.error('   ERROR: No betting splits data returned')
    process.exit(1)
  }
  
  console.log(`   ✓ Splits data received`)
  
  // Extract percentages
  let spreadBet = 50, spreadMoney = 50
  for (const market of splits.BettingMarketSplits) {
    const homeSplit = market.BettingSplits?.find(s => s.BettingOutcomeType === 'Home')
    const betType = (market.BettingBetType || '').toLowerCase()
    
    if ((betType.includes('spread') || betType.includes('puck line')) && homeSplit && homeSplit.BetPercentage !== null) {
      spreadBet = homeSplit.BetPercentage
      spreadMoney = homeSplit.MoneyPercentage || 50
    }
  }
  
  console.log(`   Spread splits: ${spreadBet}% bets, ${spreadMoney}% money`)
  
  // Store with abbreviation keys
  const abbrevKey = `${testGame.HomeTeam}_${testGame.AwayTeam}`.toUpperCase()
  const abbrevKeyReverse = `${testGame.AwayTeam}_${testGame.HomeTeam}`.toUpperCase()
  
  publicBettingMap.set(abbrevKey, { spreadBet, spreadMoney })
  publicBettingMap.set(abbrevKeyReverse, { spreadBet, spreadMoney })
  
  console.log(`   Stored under keys:`)
  console.log(`     - "${abbrevKey}"`)
  console.log(`     - "${abbrevKeyReverse}"`)
  
  // Step 4: Fetch games from Odds API
  console.log('\n[4] FETCHING GAMES FROM ODDS API...')
  
  const oddsUrl = `https://api.the-odds-api.com/v4/sports/${sportConfig.oddsApiSport}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads,totals,h2h&oddsFormat=american&bookmakers=fanduel,draftkings,betmgm`
  const oddsResp = await fetch(oddsUrl)
  
  if (!oddsResp.ok) {
    console.error(`   ERROR: Odds API returned ${oddsResp.status}`)
    process.exit(1)
  }
  
  const oddsGames = await oddsResp.json()
  console.log(`   Found ${oddsGames.length} games from Odds API`)
  
  if (oddsGames.length === 0) {
    console.error('   ERROR: No games from Odds API')
    process.exit(1)
  }
  
  // Step 5: Try to match first game
  console.log('\n[5] ATTEMPTING TO MATCH GAMES...')
  
  const testOddsGame = oddsGames[0]
  console.log(`   Odds API game: "${testOddsGame.away_team}" @ "${testOddsGame.home_team}"`)
  
  // Try to get abbreviations from sportsDataAbbrevMap
  const homeAbbr = sportsDataAbbrevMap.get(testOddsGame.home_team)
  const awayAbbr = sportsDataAbbrevMap.get(testOddsGame.away_team)
  
  console.log(`   Looking up abbreviations in sportsDataAbbrevMap:`)
  console.log(`     Home: "${testOddsGame.home_team}" => "${homeAbbr || 'NOT FOUND'}"`)
  console.log(`     Away: "${testOddsGame.away_team}" => "${awayAbbr || 'NOT FOUND'}"`)
  
  if (!homeAbbr || !awayAbbr) {
    console.log('\n   ❌ ABBREVIATIONS NOT FOUND IN MAP!')
    console.log('   This is the problem - team names don\'t match between APIs')
    console.log('\n   Available team names in sportsDataAbbrevMap:')
    Array.from(sportsDataAbbrevMap.keys()).slice(0, 10).forEach(name => {
      console.log(`     - "${name}"`)
    })
    process.exit(1)
  }
  
  const lookupKey = `${homeAbbr}_${awayAbbr}`.toUpperCase()
  const lookupKeyReverse = `${awayAbbr}_${homeAbbr}`.toUpperCase()
  
  console.log(`   Lookup keys:`)
  console.log(`     - "${lookupKey}"`)
  console.log(`     - "${lookupKeyReverse}"`)
  
  const publicData = publicBettingMap.get(lookupKey) || publicBettingMap.get(lookupKeyReverse)
  
  if (publicData) {
    console.log('\n   ✅ MATCH FOUND!')
    console.log(`   Splits: ${publicData.spreadBet}% bets, ${publicData.spreadMoney}% money`)
  } else {
    console.log('\n   ❌ NO MATCH FOUND!')
    console.log('   Available keys in publicBettingMap:')
    Array.from(publicBettingMap.keys()).forEach(key => {
      console.log(`     - "${key}"`)
    })
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('TEST COMPLETE')
  console.log('='.repeat(80) + '\n')
}

test().catch(err => {
  console.error('\nFATAL ERROR:', err.message)
  process.exit(1)
})

