import { NextResponse } from 'next/server'

export async function GET() {
  const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
  
  if (!SPORTSDATA_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }
  
  const results: any = { steps: [] }
  
  try {
    // Step 1: Get all CFB games from Games/2025
    const gamesUrl = `https://api.sportsdata.io/v3/cfb/scores/json/Games/2025?key=${SPORTSDATA_API_KEY}`
    const gamesResp = await fetch(gamesUrl)
    
    results.steps.push({
      step: 'Games/2025',
      status: gamesResp.status,
      ok: gamesResp.ok
    })
    
    if (!gamesResp.ok) {
      return NextResponse.json(results)
    }
    
    const allGames = await gamesResp.json()
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Filter for upcoming games
    const upcomingGames = allGames.filter((g: any) => {
      const gameDate = (g.Day || g.DateTime || '').split('T')[0]
      return gameDate >= today && gameDate <= nextWeek
    })
    
    results.totalGames = allGames.length
    results.upcomingGames = upcomingGames.length
    results.sampleUpcoming = upcomingGames.slice(0, 3).map((g: any) => ({
      gameId: g.GameID,
      teams: `${g.AwayTeam} @ ${g.HomeTeam}`,
      date: (g.Day || g.DateTime).split('T')[0]
    }))
    
    if (upcomingGames.length === 0) {
      results.message = 'No upcoming games found'
      return NextResponse.json(results)
    }
    
    // Step 2: Try to fetch splits for first upcoming game
    const testGame = upcomingGames[0]
    const gameId = testGame.GameID
    
    const splitsUrl = `https://api.sportsdata.io/v3/cfb/odds/json/BettingSplitsByGameId/${gameId}?key=${SPORTSDATA_API_KEY}`
    const splitsResp = await fetch(splitsUrl)
    
    results.steps.push({
      step: 'BettingSplitsByGameId',
      gameId,
      teams: `${testGame.AwayTeam} @ ${testGame.HomeTeam}`,
      url: splitsUrl.replace(SPORTSDATA_API_KEY, 'REDACTED'),
      status: splitsResp.status,
      ok: splitsResp.ok
    })
    
    if (!splitsResp.ok) {
      const errorText = await splitsResp.text()
      results.steps[1].errorBody = errorText
      return NextResponse.json(results)
    }
    
    const splits = await splitsResp.json()
    results.splitsData = {
      hasBettingMarketSplits: !!splits?.BettingMarketSplits,
      marketCount: splits?.BettingMarketSplits?.length || 0,
      markets: splits?.BettingMarketSplits?.map((m: any) => ({
        betType: m.BettingBetType,
        splitCount: m.BettingSplits?.length
      }))
    }
    
    return NextResponse.json(results)
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message, ...results }, { status: 500 })
  }
}

