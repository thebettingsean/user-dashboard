import { NextResponse } from 'next/server'

export async function GET() {
  const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
  
  if (!SPORTSDATA_API_KEY) {
    return NextResponse.json({
      error: 'SPORTSDATA_IO_SPLITS_KEY not set',
      envVars: {
        hasKey: false,
        // List available env vars (not values)
        availableKeys: Object.keys(process.env).filter(k => 
          k.includes('SPORTSDATA') || k.includes('SPORTS')
        )
      }
    })
  }
  
  const results: any = {
    keyPrefix: SPORTSDATA_API_KEY.substring(0, 8) + '...',
    tests: []
  }
  
  // Test 1: NFL scores endpoint
  try {
    const today = new Date().toISOString().split('T')[0]
    const nflUrl = `https://api.sportsdata.io/v3/nfl/scores/json/ScoresByDate/${today}?key=${SPORTSDATA_API_KEY}`
    const nflResponse = await fetch(nflUrl)
    
    if (nflResponse.ok) {
      const nflData = await nflResponse.json()
      results.tests.push({
        endpoint: 'NFL ScoresByDate',
        status: 'success',
        gamesFound: nflData.length,
        sampleGame: nflData[0] ? {
          ScoreID: nflData[0].ScoreID,
          HomeTeam: nflData[0].HomeTeam,
          AwayTeam: nflData[0].AwayTeam
        } : null
      })
    } else {
      results.tests.push({
        endpoint: 'NFL ScoresByDate',
        status: 'failed',
        httpStatus: nflResponse.status,
        statusText: nflResponse.statusText
      })
    }
  } catch (e: any) {
    results.tests.push({
      endpoint: 'NFL ScoresByDate',
      status: 'error',
      error: e.message
    })
  }
  
  // Test 2: Try to get betting splits for a known game
  // First get a game, then try to get its splits
  try {
    const today = new Date().toISOString().split('T')[0]
    const nflUrl = `https://api.sportsdata.io/v3/nfl/scores/json/ScoresByDate/${today}?key=${SPORTSDATA_API_KEY}`
    const nflResponse = await fetch(nflUrl)
    
    if (nflResponse.ok) {
      const nflData = await nflResponse.json()
      if (nflData.length > 0) {
        const scoreId = nflData[0].ScoreID
        const splitsUrl = `https://api.sportsdata.io/v3/nfl/odds/json/BettingSplitsByScoreId/${scoreId}?key=${SPORTSDATA_API_KEY}`
        const splitsResponse = await fetch(splitsUrl)
        
        if (splitsResponse.ok) {
          const splitsData = await splitsResponse.json()
          results.tests.push({
            endpoint: `NFL BettingSplitsByScoreId (${scoreId})`,
            status: 'success',
            hasData: !!splitsData,
            hasBettingMarketSplits: !!(splitsData?.BettingMarketSplits),
            marketCount: splitsData?.BettingMarketSplits?.length || 0,
            sampleSplit: splitsData?.BettingMarketSplits?.[0] || null
          })
        } else {
          results.tests.push({
            endpoint: `NFL BettingSplitsByScoreId (${scoreId})`,
            status: 'failed',
            httpStatus: splitsResponse.status,
            statusText: splitsResponse.statusText
          })
        }
      }
    }
  } catch (e: any) {
    results.tests.push({
      endpoint: 'NFL BettingSplitsByScoreId',
      status: 'error',
      error: e.message
    })
  }
  
  return NextResponse.json(results)
}

