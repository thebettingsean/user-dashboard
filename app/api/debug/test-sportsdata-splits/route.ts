import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
  
  if (!SPORTSDATA_API_KEY) {
    return NextResponse.json({ error: 'API key not found' }, { status: 500 })
  }
  
  try {
    // Get a game with ScoreID from nfl_games
    const scoreQuery = `
      SELECT sportsdata_io_score_id as score_id
      FROM nfl_games
      WHERE game_time >= now() - INTERVAL 1 HOUR
        AND game_time <= now() + INTERVAL 7 DAY
        AND sportsdata_io_score_id > 0
      LIMIT 1
    `
    
    const result = await clickhouseQuery<{ score_id: number }>(scoreQuery)
    const scoreId = result.data?.[0]?.score_id
    
    if (!scoreId) {
      return NextResponse.json({ error: 'No ScoreID found' }, { status: 404 })
    }
    
    // Fetch splits from SportsDataIO
    const splitsUrl = `https://api.sportsdata.io/v3/nfl/odds/json/BettingSplitsByScoreId/${scoreId}?key=${SPORTSDATA_API_KEY}`
    const splitsResponse = await fetch(splitsUrl)
    
    if (!splitsResponse.ok) {
      return NextResponse.json({ 
        error: `SportsDataIO returned ${splitsResponse.status}`,
        scoreId
      }, { status: 500 })
    }
    
    const splits = await splitsResponse.json()
    
    // Parse the response
    const marketTypes = new Set()
    const outcomeTypes = new Set()
    
    if (splits?.BettingMarketSplits) {
      for (const market of splits.BettingMarketSplits) {
        marketTypes.add(market.BettingBetType)
        if (market.BettingSplits) {
          for (const split of market.BettingSplits) {
            outcomeTypes.add(split.BettingOutcomeType)
          }
        }
      }
    }
    
    return NextResponse.json({
      scoreId,
      totalMarkets: splits?.BettingMarketSplits?.length || 0,
      marketTypes: Array.from(marketTypes),
      outcomeTypes: Array.from(outcomeTypes),
      sampleMarkets: splits?.BettingMarketSplits?.slice(0, 3).map((m: any) => ({
        betType: m.BettingBetType,
        splits: m.BettingSplits?.map((s: any) => ({
          outcomeType: s.BettingOutcomeType,
          betPct: s.BetPercentage,
          moneyPct: s.MoneyPercentage
        }))
      }))
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

