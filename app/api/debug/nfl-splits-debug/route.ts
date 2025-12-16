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
        g.game_id,
        ht.abbreviation as home_team,
        at.abbreviation as away_team,
        g.game_time,
        g.sportsdata_io_score_id
      FROM nfl_games g
      LEFT JOIN teams ht ON g.home_team_id = ht.id AND ht.sport = 'nfl'
      LEFT JOIN teams at ON g.away_team_id = at.id AND at.sport = 'nfl'
      WHERE g.game_time > now()
      ORDER BY g.game_time
      LIMIT 10
    `
    
    const gamesResult = await clickhouseQuery<{
      game_id: string
      home_team: string
      away_team: string
      game_time: string
      sportsdata_io_score_id: number
    }>(gamesQuery)
    
    results.upcomingGames = gamesResult.data || []
    results.gamesWithScoreId = results.upcomingGames.filter((g: any) => g.sportsdata_io_score_id).length
    
    // Step 2: Test fetching splits for first game with ScoreID
    const gameWithScoreId = results.upcomingGames.find((g: any) => g.sportsdata_io_score_id)
    
    if (gameWithScoreId) {
      const splitsUrl = `https://api.sportsdata.io/v3/nfl/odds/json/BettingSplitsByScoreId/${gameWithScoreId.sportsdata_io_score_id}?key=${SPORTSDATA_API_KEY}`
      
      results.steps.push({
        step: 'Test BettingSplitsByScoreId',
        scoreId: gameWithScoreId.sportsdata_io_score_id,
        game: `${gameWithScoreId.away_team} @ ${gameWithScoreId.home_team}`,
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
    results.sampleGamesWithoutScoreId = gamesWithoutScoreId.slice(0, 3).map((g: any) => ({
      game: `${g.away_team} @ ${g.home_team}`,
      gameTime: g.game_time,
      gameId: g.game_id
    }))
    
    return NextResponse.json(results)
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message, ...results }, { status: 500 })
  }
}

