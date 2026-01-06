import { NextResponse } from 'next/server'

/**
 * Test fetching public betting splits for NBA/NHL/CFB from SportsDataIO
 * This simulates what sync-live-odds does
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'nba' // nba, nhl, or cfb
  
  try {
    const SPORTSDATA_API_KEY = process.env.SPORTSDATA_API_KEY
    if (!SPORTSDATA_API_KEY) {
      return NextResponse.json({ error: 'SPORTSDATA_API_KEY not configured' }, { status: 500 })
    }
    
    const sportConfig: Record<string, { path: string; season: number }> = {
      nba: { path: 'nba', season: 2026 },
      nhl: { path: 'nhl', season: 2026 },
      cfb: { path: 'cfb', season: 2025 }
    }
    
    const config = sportConfig[sport]
    if (!config) {
      return NextResponse.json({ error: `Invalid sport: ${sport}. Use nba, nhl, or cfb` }, { status: 400 })
    }
    
    // Step 1: Fetch upcoming games
    const gamesUrl = `https://api.sportsdata.io/v3/${config.path}/scores/json/Games/${config.season}?key=${SPORTSDATA_API_KEY}`
    console.log(`[${sport.toUpperCase()}] Fetching games from: ${gamesUrl.replace(SPORTSDATA_API_KEY, 'KEY_HIDDEN')}`)
    
    const gamesResp = await fetch(gamesUrl)
    if (!gamesResp.ok) {
      return NextResponse.json({
        error: `Games API returned ${gamesResp.status}`,
        url: gamesUrl.replace(SPORTSDATA_API_KEY, 'KEY_HIDDEN')
      }, { status: 500 })
    }
    
    const allGames = await gamesResp.json()
    
    // Filter for upcoming games (today + 7 days)
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const futureDateStr = futureDate.toISOString().split('T')[0]
    
    const upcomingGames = (allGames || []).filter((game: any) => {
      const gameDate = (game.Day || game.DateTime || '').split('T')[0]
      return gameDate >= todayStr && gameDate <= futureDateStr && game.GameID
    }).slice(0, 3) // Just test first 3 games
    
    console.log(`[${sport.toUpperCase()}] Found ${upcomingGames.length} upcoming games to test`)
    
    // Step 2: Try to fetch splits for each game
    const results: any[] = []
    
    for (const game of upcomingGames) {
      const gameId = game.GameID || game.GameId
      const splitsUrl = `https://api.sportsdata.io/v3/${config.path}/odds/json/BettingSplitsByGameId/${gameId}?key=${SPORTSDATA_API_KEY}`
      
      try {
        const splitsResp = await fetch(splitsUrl)
        
        results.push({
          game_id: gameId,
          matchup: `${game.AwayTeam} @ ${game.HomeTeam}`,
          date: game.Day || game.DateTime,
          splits_api_status: splitsResp.status,
          splits_api_ok: splitsResp.ok,
          splits_url: splitsUrl.replace(SPORTSDATA_API_KEY, 'KEY_HIDDEN'),
          data: splitsResp.ok ? await splitsResp.json() : null
        })
      } catch (e: any) {
        results.push({
          game_id: gameId,
          matchup: `${game.AwayTeam} @ ${game.HomeTeam}`,
          error: e.message
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      sport,
      total_games_in_season: allGames.length,
      upcoming_games_tested: upcomingGames.length,
      results
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

