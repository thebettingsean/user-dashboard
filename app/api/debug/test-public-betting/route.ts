import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'nhl'
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  
  const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
  
  if (!SPORTSDATA_API_KEY) {
    return NextResponse.json({ error: 'SPORTSDATA_IO_SPLITS_KEY not configured' }, { status: 500 })
  }
  
  const sportPaths: Record<string, string> = {
    nfl: 'nfl',
    nba: 'nba',
    nhl: 'nhl',
    cfb: 'cfb'
  }
  
  const path = sportPaths[sport] || 'nhl'
  const results: any = {
    sport,
    date,
    path,
    steps: []
  }
  
  try {
    // Step 1: Fetch games by date
    const scheduleUrl = `https://api.sportsdata.io/v3/${path}/scores/json/GamesByDate/${date}?key=${SPORTSDATA_API_KEY}`
    results.scheduleUrl = scheduleUrl.replace(SPORTSDATA_API_KEY, 'REDACTED')
    
    const scheduleResp = await fetch(scheduleUrl)
    results.steps.push({
      step: 'GamesByDate',
      status: scheduleResp.status,
      ok: scheduleResp.ok,
      statusText: scheduleResp.statusText
    })
    
    if (!scheduleResp.ok) {
      const errorText = await scheduleResp.text()
      results.steps[0].errorBody = errorText.substring(0, 500)
      return NextResponse.json(results)
    }
    
    const games = await scheduleResp.json()
    results.gamesFound = games?.length || 0
    results.sampleGames = games?.slice(0, 3).map((g: any) => ({
      gameId: g.GameID || g.GameId,
      homeTeam: g.HomeTeam,
      awayTeam: g.AwayTeam,
      date: g.Day || g.DateTime
    }))
    
    if (!games || games.length === 0) {
      return NextResponse.json(results)
    }
    
    // Step 2: Try to fetch splits for first game
    const firstGame = games[0]
    const gameId = firstGame.GameID || firstGame.GameId
    
    if (!gameId) {
      results.error = 'No GameID found in first game'
      return NextResponse.json(results)
    }
    
    const splitsUrl = `https://api.sportsdata.io/v3/${path}/odds/json/BettingSplitsByGameId/${gameId}?key=${SPORTSDATA_API_KEY}`
    results.splitsUrl = splitsUrl.replace(SPORTSDATA_API_KEY, 'REDACTED')
    results.testGameId = gameId
    
    const splitsResp = await fetch(splitsUrl)
    results.steps.push({
      step: 'BettingSplitsByGameId',
      gameId,
      status: splitsResp.status,
      ok: splitsResp.ok,
      statusText: splitsResp.statusText
    })
    
    if (!splitsResp.ok) {
      const errorText = await splitsResp.text()
      results.steps[1].errorBody = errorText.substring(0, 500)
      return NextResponse.json(results)
    }
    
    const splits = await splitsResp.json()
    results.splitsData = splits
    results.hasBettingMarketSplits = !!splits?.BettingMarketSplits
    results.marketCount = splits?.BettingMarketSplits?.length || 0
    
    if (splits?.BettingMarketSplits) {
      results.sampleMarkets = splits.BettingMarketSplits.map((m: any) => ({
        betType: m.BettingBetType,
        splitCount: m.BettingSplits?.length || 0,
        splits: m.BettingSplits?.map((s: any) => ({
          outcomeType: s.BettingOutcomeType,
          betPct: s.BetPercentage,
          moneyPct: s.MoneyPercentage
        }))
      }))
    }
    
    return NextResponse.json(results)
    
  } catch (error: any) {
    results.error = error.message
    results.stack = error.stack
    return NextResponse.json(results, { status: 500 })
  }
}

