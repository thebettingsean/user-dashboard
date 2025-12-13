import { NextResponse } from 'next/server'

export async function GET() {
  const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
  
  if (!SPORTSDATA_API_KEY) {
    return NextResponse.json({ 
      error: 'No SportsDataIO key found', 
      hasKey: false
    }, { status: 500 })
  }

  try {
    // Test 1: Try ScoresByDate endpoint
    const today = new Date().toISOString().split('T')[0]
    const scheduleUrl = `https://api.sportsdata.io/v3/nfl/scores/json/ScoresByDate/${today}?key=${SPORTSDATA_API_KEY}`
    const scheduleResponse = await fetch(scheduleUrl)
    
    const scheduleResult = {
      endpoint: 'scores/json/ScoresByDate',
      status: scheduleResponse.status,
      ok: scheduleResponse.ok
    }
    
    // Test 2: Try BettingSplitsByScoreId DIRECTLY with known ScoreID (Week 15 games)
    // Week 15 2024 ScoreIDs are around 19200-19250
    const testScoreIds = [19229, 19230, 19231, 19232, 19233]
    const splitsResults: any[] = []
    
    for (const scoreId of testScoreIds) {
      const splitsUrl = `https://api.sportsdata.io/v3/nfl/odds/json/BettingSplitsByScoreId/${scoreId}?key=${SPORTSDATA_API_KEY}`
      const splitsResponse = await fetch(splitsUrl)
      
      let data = null
      if (splitsResponse.ok) {
        data = await splitsResponse.json()
      }
      
      splitsResults.push({
        scoreId,
        status: splitsResponse.status,
        ok: splitsResponse.ok,
        hasData: !!data?.BettingMarketSplits,
        homeTeam: data?.HomeTeam,
        awayTeam: data?.AwayTeam,
        spreadBetPct: data?.BettingMarketSplits?.find((m: any) => m.BettingBetType === 'Spread')
          ?.BettingSplits?.find((s: any) => s.BettingOutcomeType === 'Home')?.BetPercentage
      })
    }
    
    return NextResponse.json({
      success: true,
      keyPresent: true,
      scheduleEndpoint: scheduleResult,
      splitsEndpoint: {
        tested: splitsResults.length,
        working: splitsResults.filter(r => r.ok).length,
        samples: splitsResults
      },
      conclusion: splitsResults.some(r => r.ok) 
        ? 'BettingSplitsByScoreId works! Use ScoreIDs from nfl_games table instead of ScoresByDate'
        : 'Both endpoints failing - API key may be expired'
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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

