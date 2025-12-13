import { NextResponse } from 'next/server'

export async function GET() {
  const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
  
  // Also check alternative key names
  const NFL_KEY = process.env.SPORTSDATA_NFL_KEY
  const GENERIC_KEY = process.env.SPORTSDATA_API_KEY
  
  // Try to find a working key
  const keyToUse = SPORTSDATA_API_KEY || NFL_KEY || GENERIC_KEY
  
  if (!keyToUse) {
    return NextResponse.json({ 
      error: 'No SportsDataIO key found', 
      hasKey: false,
      envVars: {
        SPORTSDATA_IO_SPLITS_KEY: !!SPORTSDATA_API_KEY,
        SPORTSDATA_NFL_KEY: !!NFL_KEY,
        SPORTSDATA_API_KEY: !!GENERIC_KEY
      }
    }, { status: 500 })
  }

  const results: any[] = []
  let testGame: any = null

  try {
    // Try the schedule endpoint first
    const today = new Date().toISOString().split('T')[0]
    
    // Test with scores endpoint (might be different from splits)
    const scheduleUrl = `https://api.sportsdata.io/v3/nfl/scores/json/ScoresByDate/${today}?key=${keyToUse}`
    const scheduleResponse = await fetch(scheduleUrl)
    
    if (scheduleResponse.status === 401) {
      // Key is unauthorized - let's show what keys we have
      return NextResponse.json({
        error: 'API key unauthorized (401)',
        message: 'The SportsDataIO API key is being rejected. It may have expired or lacks permissions for this endpoint.',
        keyPrefix: keyToUse.substring(0, 10) + '...',
        keyLength: keyToUse.length,
        endpoint: 'scores/json/ScoresByDate',
        envVars: {
          SPORTSDATA_IO_SPLITS_KEY: !!SPORTSDATA_API_KEY,
          SPORTSDATA_NFL_KEY: !!NFL_KEY,
          SPORTSDATA_API_KEY: !!GENERIC_KEY
        }
      })
    }
    
    // Loop through next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      const scheduleUrl2 = `https://api.sportsdata.io/v3/nfl/scores/json/ScoresByDate/${dateStr}?key=${keyToUse}`
      const scheduleResponse2 = await fetch(scheduleUrl2)
      
      if (!scheduleResponse2.ok) {
        results.push({ date: dateStr, status: scheduleResponse2.status, gamesCount: 0 })
        continue
      }
      
      const scheduleGames = await scheduleResponse2.json()
      results.push({ date: dateStr, status: 200, gamesCount: scheduleGames.length })
      
      // Find a game to test splits
      if (!testGame) {
        testGame = scheduleGames.find((g: any) => g.ScoreID)
      }
    }
    
    // Test splits for a game
    let splitsResult: any = null
    if (testGame) {
      const splitsUrl = `https://api.sportsdata.io/v3/nfl/odds/json/BettingSplitsByScoreId/${testGame.ScoreID}?key=${keyToUse}`
      const splitsResponse = await fetch(splitsUrl)
      
      if (splitsResponse.ok) {
        const splits = await splitsResponse.json()
        splitsResult = {
          success: true,
          hasBettingMarketSplits: !!splits?.BettingMarketSplits,
          marketCount: splits?.BettingMarketSplits?.length || 0,
          markets: splits?.BettingMarketSplits?.map((m: any) => ({
            type: m.BettingBetType,
            splits: m.BettingSplits?.map((s: any) => ({
              outcome: s.BettingOutcomeType,
              betPct: s.BetPercentage,
              moneyPct: s.MoneyPercentage
            }))
          }))
        }
      } else {
        splitsResult = { success: false, status: splitsResponse.status }
      }
    }
    
    return NextResponse.json({
      success: true,
      hasApiKey: true,
      scheduleByDate: results,
      testGame: testGame ? {
        ScoreID: testGame.ScoreID,
        HomeTeam: testGame.HomeTeam,
        AwayTeam: testGame.AwayTeam,
        Date: testGame.Date
      } : null,
      splitsResult
    })
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message, 
      stack: error.stack,
      hasApiKey: !!SPORTSDATA_API_KEY 
    }, { status: 500 })
  }
}

