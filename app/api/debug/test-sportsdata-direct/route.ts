import { NextResponse } from 'next/server'

/**
 * Directly test if SportsDataIO has splits data for NBA/NHL
 * This bypasses all our code and tests the API directly
 */
export async function POST(request: Request) {
  try {
    const { sport, gameId } = await request.json()
    
    const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
    if (!SPORTSDATA_API_KEY) {
      return NextResponse.json({ error: 'No SPORTSDATA_IO_SPLITS_KEY' }, { status: 500 })
    }
    
    const sportPath: Record<string, string> = {
      nba: 'nba',
      nhl: 'nhl',
      cbb: 'cbb',
      cfb: 'cfb'
    }
    
    if (!sportPath[sport]) {
      return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
    }
    
    // Step 1: Get current season games
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()
    
    let season: number
    if (sport === 'nba' || sport === 'nhl') {
      season = currentMonth >= 9 ? currentYear + 1 : currentYear
    } else if (sport === 'cbb') {
      season = currentMonth >= 10 ? currentYear + 1 : currentYear
    } else {
      season = currentYear
    }
    
    const gamesUrl = `https://api.sportsdata.io/v3/${sportPath[sport]}/scores/json/Games/${season}?key=${SPORTSDATA_API_KEY}`
    const gamesResp = await fetch(gamesUrl)
    
    if (!gamesResp.ok) {
      return NextResponse.json({
        error: `Games API failed: ${gamesResp.status}`,
        season_queried: season
      }, { status: 500 })
    }
    
    const allGames = await gamesResp.json()
    const todayStr = today.toISOString().split('T')[0]
    const upcomingGames = (allGames || []).filter((g: any) => {
      const gameDate = (g.Day || g.DateTime || '').split('T')[0]
      return gameDate >= todayStr && (g.GameID || g.GameId)
    }).slice(0, 5)
    
    if (upcomingGames.length === 0) {
      return NextResponse.json({
        error: 'No upcoming games found',
        season_queried: season,
        total_games_in_season: allGames.length
      })
    }
    
    // Step 2: Try to fetch splits for each upcoming game
    const results: any[] = []
    
    for (const game of upcomingGames) {
      const gId = game.GameID || game.GameId
      const splitsUrl = `https://api.sportsdata.io/v3/${sportPath[sport]}/odds/json/BettingSplitsByGameId/${gId}?key=${SPORTSDATA_API_KEY}`
      
      try {
        const splitsResp = await fetch(splitsUrl)
        const splitsData = splitsResp.ok ? await splitsResp.json() : null
        
        results.push({
          game_id: gId,
          matchup: `${game.AwayTeam || game.AwayTeamName} @ ${game.HomeTeam || game.HomeTeamName}`,
          date: game.Day || game.DateTime,
          splits_status: splitsResp.status,
          has_betting_market_splits: !!splitsData?.BettingMarketSplits,
          market_count: splitsData?.BettingMarketSplits?.length || 0,
          sample_market: splitsData?.BettingMarketSplits?.[0] || null
        })
      } catch (e: any) {
        results.push({
          game_id: gId,
          error: e.message
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      sport,
      season_queried: season,
      current_date: todayStr,
      total_games_in_season: allGames.length,
      upcoming_games_tested: upcomingGames.length,
      results,
      conclusion: results.every(r => r.market_count === 0) 
        ? 'SportsDataIO has NO splits data for these games yet'
        : 'SportsDataIO HAS splits data - issue is in our matching logic'
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

