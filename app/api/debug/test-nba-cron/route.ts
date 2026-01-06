import { NextResponse } from 'next/server'

const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY

export async function GET() {
  const logs: string[] = []
  const log = (msg: string) => {
    console.log(msg)
    logs.push(msg)
  }
  
  try {
    log('=== SIMULATING NBA CRON PROCESS ===')
    
    if (!SPORTSDATA_API_KEY) {
      return NextResponse.json({ error: 'No API key' })
    }
    
    // Step 1: Fetch games from SportsDataIO
    log('\n[1] Fetching games from SportsDataIO...')
    
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()
    const season = currentMonth >= 9 ? currentYear + 1 : currentYear
    
    log(`Season: ${season}`)
    
    const gamesUrl = `https://api.sportsdata.io/v3/nba/scores/json/Games/${season}?key=${SPORTSDATA_API_KEY}`
    const gamesResp = await fetch(gamesUrl)
    
    if (!gamesResp.ok) {
      return NextResponse.json({ error: `Games API: ${gamesResp.status}`, logs })
    }
    
    const allGames = await gamesResp.json()
    const todayStr = today.toISOString().split('T')[0]
    const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const futureDateStr = futureDate.toISOString().split('T')[0]
    
    const gamesToFetch = []
    for (const game of allGames || []) {
      const gameDate = (game.Day || game.DateTime || '').split('T')[0]
      if (gameDate >= todayStr && gameDate <= futureDateStr) {
        const gameId = game.GameID || game.GameId
        if (gameId && game.HomeTeam && game.AwayTeam) {
          gamesToFetch.push({ 
            gameId, 
            homeAbbr: game.HomeTeam, 
            awayAbbr: game.AwayTeam,
            homeName: game.HomeTeam,
            awayName: game.AwayTeam,
            gameTime: game.DateTime || game.Day
          })
        }
      }
    }
    
    log(`Found ${gamesToFetch.length} upcoming games`)
    
    // Step 2: Fetch splits for first 3 games
    log('\n[2] Fetching betting splits...')
    
    const publicBettingMap = new Map()
    let gamesWithSplits = 0
    
    for (const game of gamesToFetch.slice(0, 30)) {
      try {
        const splitsUrl = `https://api.sportsdata.io/v3/nba/odds/json/BettingSplitsByGameId/${game.gameId}?key=${SPORTSDATA_API_KEY}`
        const splitsResponse = await fetch(splitsUrl)
        
        if (!splitsResponse.ok) {
          if (gamesToFetch.indexOf(game) < 3) {
            log(`  Splits API error for game ${game.gameId}: ${splitsResponse.status}`)
          }
          continue
        }
        
        const splits = await splitsResponse.json()
        
        if (splits?.BettingMarketSplits && splits.BettingMarketSplits.length > 0) {
          const keys: string[] = []
          
          const abbrevKey = `${game.homeAbbr}_${game.awayAbbr}`.toUpperCase()
          const abbrevKeyReverse = `${game.awayAbbr}_${game.homeAbbr}`.toUpperCase()
          keys.push(abbrevKey, abbrevKeyReverse)
          
          let spreadBet = 50, spreadMoney = 50
          
          for (const market of splits.BettingMarketSplits) {
            const homeSplit = market.BettingSplits?.find((s: any) => s.BettingOutcomeType === 'Home')
            const betType = (market.BettingBetType || '').toLowerCase()
            
            if ((betType.includes('spread') || betType.includes('point spread')) && homeSplit && homeSplit.BetPercentage !== null) {
              spreadBet = homeSplit.BetPercentage
              spreadMoney = homeSplit.MoneyPercentage || 50
            }
          }
          
          const bettingData = { spreadBet, spreadMoney }
          for (const key of keys) {
            publicBettingMap.set(key, bettingData)
          }
          
          if (gamesToFetch.indexOf(game) < 3) {
            log(`  Game ${game.gameId} (${game.awayAbbr}@${game.homeAbbr}):`)
            log(`    Keys: ${keys.join(', ')}`)
            log(`    Splits: ${spreadBet}% bet, ${spreadMoney}% money`)
          }
          
          gamesWithSplits++
        } else {
          if (gamesToFetch.indexOf(game) < 3) {
            log(`  Game ${game.gameId}: No splits data (empty array)`)
          }
        }
      } catch (e: any) {
        log(`  Error for game ${game.gameId}: ${e.message}`)
      }
    }
    
    log(`\n[3] Stored ${publicBettingMap.size} keys with public betting`)
    log(`Games with splits: ${gamesWithSplits}`)
    
    if (publicBettingMap.size > 0) {
      const sampleKeys = Array.from(publicBettingMap.keys()).slice(0, 10)
      log(`Sample keys: ${sampleKeys.join(', ')}`)
    }
    
    // Step 3: Test matching with a known game
    log('\n[4] Testing if Indiana Pacers would match...')
    
    const testTeamName = 'Indiana Pacers'
    
    // This is what TEAM_ABBREV_MAP would return
    const TEAM_ABBREV_MAP: Record<string, string> = {
      'Indiana Pacers': 'IND',
      'Cleveland Cavaliers': 'CLE'
    }
    
    const homeAbbr = TEAM_ABBREV_MAP[testTeamName] || ''
    log(`"${testTeamName}" => "${homeAbbr}"`)
    
    if (homeAbbr) {
      const testKey1 = `${homeAbbr}_CLE`.toUpperCase()
      const testKey2 = `CLE_${homeAbbr}`.toUpperCase()
      
      log(`Looking for keys: ${testKey1} or ${testKey2}`)
      
      const found = publicBettingMap.get(testKey1) || publicBettingMap.get(testKey2)
      if (found) {
        log(`✅ MATCH FOUND! Splits: ${found.spreadBet}% bet, ${found.spreadMoney}% money`)
      } else {
        log(`❌ NO MATCH - Keys not in map`)
      }
    }
    
    log('\n=== END SIMULATION ===')
    
    return NextResponse.json({ 
      success: true,
      gamesFound: gamesToFetch.length,
      gamesWithSplits,
      keysStored: publicBettingMap.size,
      sampleKeys: Array.from(publicBettingMap.keys()).slice(0, 10),
      logs 
    })
    
  } catch (e: any) {
    return NextResponse.json({ error: e.message, logs }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const maxDuration = 60

