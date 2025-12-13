import { NextResponse } from 'next/server'

export async function GET() {
  const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
  
  if (!SPORTSDATA_API_KEY) {
    return NextResponse.json({ error: 'SPORTSDATA_IO_SPLITS_KEY not configured', hasKey: false }, { status: 500 })
  }

  const results: any[] = []
  let testGame: any = null

  try {
    // Loop through next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      const scheduleUrl = `https://api.sportsdata.io/v3/nfl/scores/json/ScoresByDate/${dateStr}?key=${SPORTSDATA_API_KEY}`
      const scheduleResponse = await fetch(scheduleUrl)
      
      if (!scheduleResponse.ok) {
        results.push({ date: dateStr, status: scheduleResponse.status, gamesCount: 0 })
        continue
      }
      
      const scheduleGames = await scheduleResponse.json()
      results.push({ date: dateStr, status: 200, gamesCount: scheduleGames.length })
      
      // Find a game to test splits
      if (!testGame) {
        testGame = scheduleGames.find((g: any) => g.ScoreID)
      }
    }
    
    // Test splits for a game
    let splitsResult: any = null
    if (testGame) {
      const splitsUrl = `https://api.sportsdata.io/v3/nfl/odds/json/BettingSplitsByScoreId/${testGame.ScoreID}?key=${SPORTSDATA_API_KEY}`
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

