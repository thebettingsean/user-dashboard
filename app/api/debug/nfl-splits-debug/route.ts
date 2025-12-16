import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
  
  if (!SPORTSDATA_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }
  
  const results: any = { steps: [] }
  
  try {
    // Step 1: Check upcoming games in nfl_games
    const gamesQuery = `
      SELECT 
        game_id,
        home_team_id,
        away_team_id,
        game_time,
        sportsdata_io_score_id
      FROM nfl_games
      WHERE game_time > now()
      ORDER BY game_time
      LIMIT 10
    `
    
    const gamesResult = await clickhouseQuery<{
      game_id: string
      home_team_id: number
      away_team_id: number
      game_time: string
      sportsdata_io_score_id: number
    }>(gamesQuery)
    
    results.upcomingGames = (gamesResult.data || []).map((g: any) => ({
      ...g,
      hasScoreId: !!g.sportsdata_io_score_id
    }))
    results.gamesWithScoreId = results.upcomingGames.filter((g: any) => g.sportsdata_io_score_id).length
    
    // Step 2: Test fetching splits for first game with ScoreID
    const gameWithScoreId = results.upcomingGames.find((g: any) => g.sportsdata_io_score_id)
    
    if (gameWithScoreId) {
      const splitsUrl = `https://api.sportsdata.io/v3/nfl/odds/json/BettingSplitsByScoreId/${gameWithScoreId.sportsdata_io_score_id}?key=${SPORTSDATA_API_KEY}`
      
      results.steps.push({
        step: 'Test BettingSplitsByScoreId',
        scoreId: gameWithScoreId.sportsdata_io_score_id,
        gameId: gameWithScoreId.game_id,
        url: splitsUrl.replace(SPORTSDATA_API_KEY, 'REDACTED')
      })
      
      const splitsResp = await fetch(splitsUrl)
      results.steps[0].status = splitsResp.status
      results.steps[0].ok = splitsResp.ok
      
      if (splitsResp.ok) {
        const splits = await splitsResp.json()
        results.steps[0].hasBettingMarketSplits = !!splits?.BettingMarketSplits
        results.steps[0].marketCount = splits?.BettingMarketSplits?.length || 0
        
        if (splits?.BettingMarketSplits) {
          results.steps[0].markets = splits.BettingMarketSplits.map((m: any) => ({
            betType: m.BettingBetType,
            splitCount: m.BettingSplits?.length,
            homeSplit: m.BettingSplits?.find((s: any) => s.BettingOutcomeType === 'Home')
          }))
        }
      } else {
        const errorText = await splitsResp.text()
        results.steps[0].error = errorText.substring(0, 500)
      }
    }
    
    // Step 3: Check games WITHOUT ScoreID
    const gamesWithoutScoreId = results.upcomingGames.filter((g: any) => !g.sportsdata_io_score_id)
    results.gamesWithoutScoreId = gamesWithoutScoreId.length
    results.sampleGamesWithoutScoreId = gamesWithoutScoreId.slice(0, 5).map((g: any) => ({
      gameId: g.game_id,
      gameTime: g.game_time,
      homeTeamId: g.home_team_id,
      awayTeamId: g.away_team_id
    }))
    
    return NextResponse.json(results)
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message, ...results }, { status: 500 })
  }
}

