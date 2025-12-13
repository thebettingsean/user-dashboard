import { NextResponse } from 'next/server'

export async function GET() {
  const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
  
  if (!SPORTSDATA_API_KEY) {
    return NextResponse.json({ error: 'SPORTSDATA_IO_SPLITS_KEY not configured' }, { status: 500 })
  }

  try {
    // Test 1: Get today's NFL schedule
    const today = new Date().toISOString().split('T')[0]
    const scheduleUrl = `https://api.sportsdata.io/v3/nfl/scores/json/ScoresByDate/${today}?key=${SPORTSDATA_API_KEY}`
    
    console.log('[TEST] Fetching schedule:', scheduleUrl.replace(SPORTSDATA_API_KEY, 'HIDDEN'))
    const scheduleResponse = await fetch(scheduleUrl)
    
    if (!scheduleResponse.ok) {
      return NextResponse.json({ 
        error: 'Schedule fetch failed',
        status: scheduleResponse.status,
        url: scheduleUrl.replace(SPORTSDATA_API_KEY, 'HIDDEN')
      }, { status: 500 })
    }
    
    const scheduleGames = await scheduleResponse.json()
    console.log('[TEST] Found', scheduleGames.length, 'games in schedule')
    
    // Test 2: Try to get splits for first game with ScoreID
    const testGame = scheduleGames.find((g: any) => g.ScoreID)
    
    if (!testGame) {
      return NextResponse.json({
        success: false,
        message: 'No games with ScoreID found',
        scheduleGamesCount: scheduleGames.length,
        sampleGame: scheduleGames[0]
      })
    }
    
    const splitsUrl = `https://api.sportsdata.io/v3/nfl/odds/json/BettingSplitsByScoreId/${testGame.ScoreID}?key=${SPORTSDATA_API_KEY}`
    console.log('[TEST] Fetching splits for ScoreID:', testGame.ScoreID)
    
    const splitsResponse = await fetch(splitsUrl)
    
    if (!splitsResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Splits fetch failed',
        status: splitsResponse.status,
        testGame: {
          ScoreID: testGame.ScoreID,
          HomeTeam: testGame.HomeTeam,
          AwayTeam: testGame.AwayTeam
        }
      })
    }
    
    const splits = await splitsResponse.json()
    
    return NextResponse.json({
      success: true,
      scheduleGamesCount: scheduleGames.length,
      testGame: {
        ScoreID: testGame.ScoreID,
        HomeTeam: testGame.HomeTeam,
        AwayTeam: testGame.AwayTeam,
        Date: testGame.Date
      },
      splits: {
        hasBettingMarketSplits: !!splits?.BettingMarketSplits,
        marketCount: splits?.BettingMarketSplits?.length || 0,
        sampleMarket: splits?.BettingMarketSplits?.[0]
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}

