import { NextResponse } from 'next/server'

export async function GET() {
  const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
  
  if (!SPORTSDATA_API_KEY) {
    return NextResponse.json({ error: 'API key not found' }, { status: 500 })
  }
  
  try {
    // Try a few ScoreIDs near the expected range to see if we can find the missing games
    const testRanges = [
      { start: 19280, end: 19290, label: 'Right after last known' },
      { start: 19300, end: 19320, label: 'Expected Week 17 range' },
      { start: 20000, end: 20010, label: 'Higher range' }
    ]
    
    const results = []
    
    for (const range of testRanges) {
      console.log(`Testing range ${range.start}-${range.end}...`)
      
      for (let scoreId = range.start; scoreId <= range.end; scoreId++) {
        try {
          const url = `https://api.sportsdata.io/v3/nfl/odds/json/BettingSplitsByScoreId/${scoreId}?key=${SPORTSDATA_API_KEY}`
          const response = await fetch(url)
          
          if (response.ok) {
            const data = await response.json()
            
            if (data?.HomeTeam && data?.AwayTeam && data?.BettingMarketSplits?.length > 0) {
              const game = `${data.AwayTeam} @ ${data.HomeTeam}`
              const week = data.Week
              const date = data.Date
              
              // Check if this is one of our target games
              const isTargetGame = 
                (data.HomeTeam === 'SEA' && data.AwayTeam === 'LAR') ||
                (data.HomeTeam === 'CHI' && data.AwayTeam === 'GB')
              
              if (isTargetGame || week === 17) {
                results.push({
                  scoreId,
                  game,
                  week,
                  date,
                  range: range.label,
                  isTargetGame,
                  hasData: data.BettingMarketSplits.length > 0
                })
                
                console.log(`✅ Found ${game} - ScoreID ${scoreId}, Week ${week}`)
              }
            }
          }
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100))
          
        } catch (error) {
          // Silently continue
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      gamesFound: results.length,
      results,
      message: results.length > 0 
        ? '✅ Found the missing games! Now we know their ScoreIDs.'
        : '⚠️ Week 17 games might not be in SportsDataIO system yet.'
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

