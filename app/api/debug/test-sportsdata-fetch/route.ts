import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'nba'
  
  try {
    const SPORTSDATA_API_KEY = process.env.SPORTSDATA_API_KEY
    if (!SPORTSDATA_API_KEY) {
      return NextResponse.json({ error: 'No SPORTSDATA_API_KEY' }, { status: 500 })
    }
    
    // Calculate season same way sync-live-odds does
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() // 0-11
    
    const sportMap: Record<string, { path: string; seasonLogic: string }> = {
      nba: { path: 'nba', seasonLogic: 'Oct+ = next year' },
      nhl: { path: 'nhl', seasonLogic: 'Oct+ = next year' },
      cbb: { path: 'cbb', seasonLogic: 'Nov+ = next year' },
      cfb: { path: 'cfb', seasonLogic: 'Current year' }
    }
    
    let season: number
    if (sport === 'nba' || sport === 'nhl') {
      season = currentMonth >= 9 ? currentYear + 1 : currentYear
    } else if (sport === 'cbb') {
      season = currentMonth >= 10 ? currentYear + 1 : currentYear
    } else {
      season = currentYear
    }
    
    const config = sportMap[sport]
    if (!config) {
      return NextResponse.json({ error: `Invalid sport: ${sport}` }, { status: 400 })
    }
    
    // Step 1: Fetch games
    const gamesUrl = `https://api.sportsdata.io/v3/${config.path}/scores/json/Games/${season}?key=${SPORTSDATA_API_KEY}`
    const gamesResp = await fetch(gamesUrl)
    
    if (!gamesResp.ok) {
      return NextResponse.json({
        error: `Games API returned ${gamesResp.status}`,
        url: gamesUrl.replace(SPORTSDATA_API_KEY, 'KEY_HIDDEN'),
        response_text: await gamesResp.text()
      }, { status: 500 })
    }
    
    const allGames = await gamesResp.json()
    const todayStr = today.toISOString().split('T')[0]
    const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const futureDateStr = futureDate.toISOString().split('T')[0]
    
    const upcomingGames = (allGames || []).filter((game: any) => {
      const gameDate = (game.Day || game.DateTime || '').split('T')[0]
      return gameDate >= todayStr && gameDate <= futureDateStr
    }).slice(0, 3)
    
    if (upcomingGames.length === 0) {
      return NextResponse.json({
        error: 'No upcoming games found',
        season_queried: season,
        total_games_in_season: allGames.length,
        date_range_searched: `${todayStr} to ${futureDateStr}`
      })
    }
    
    // Step 2: Try to fetch splits for first game
    const firstGame = upcomingGames[0]
    const gameId = firstGame.GameID || firstGame.GameId
    const splitsUrl = `https://api.sportsdata.io/v3/${config.path}/odds/json/BettingSplitsByGameId/${gameId}?key=${SPORTSDATA_API_KEY}`
    const splitsResp = await fetch(splitsUrl)
    
    return NextResponse.json({
      success: true,
      sport,
      current_date: todayStr,
      current_month: currentMonth,
      current_year: currentYear,
      calculated_season: season,
      season_logic: config.seasonLogic,
      total_games_in_season: allGames.length,
      upcoming_games_found: upcomingGames.length,
      first_game: {
        id: gameId,
        matchup: `${firstGame.AwayTeam} @ ${firstGame.HomeTeam}`,
        date: firstGame.Day || firstGame.DateTime
      },
      splits_fetch: {
        url: splitsUrl.replace(SPORTSDATA_API_KEY, 'KEY_HIDDEN'),
        status: splitsResp.status,
        ok: splitsResp.ok,
        has_data: splitsResp.ok ? await splitsResp.json() : null
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

