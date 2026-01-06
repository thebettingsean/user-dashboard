import { NextRequest, NextResponse } from 'next/server'

const SPORTSDATA_API_KEY = process.env.SPORTSDATA_API_KEY

export async function GET(request: NextRequest) {
  const sport = request.nextUrl.searchParams.get('sport') || 'nba'
  
  const config: Record<string, string> = {
    nba: 'nba',
    nhl: 'nhl',
    cfb: 'cfb',
    cbb: 'cbb'
  }
  
  const sportsdataPath = config[sport]
  if (!sportsdataPath) {
    return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
  }
  
  try {
    // Step 1: Get upcoming games
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
    
    const gamesUrl = `https://api.sportsdata.io/v3/${sportsdataPath}/scores/json/Games/${season}?key=${SPORTSDATA_API_KEY}`
    const gamesResp = await fetch(gamesUrl)
    
    if (!gamesResp.ok) {
      return NextResponse.json({ 
        error: `Games API failed: ${gamesResp.status}`,
        url: gamesUrl.replace(SPORTSDATA_API_KEY!, 'XXX')
      }, { status: 500 })
    }
    
    const allGames = await gamesResp.json()
    const todayStr = today.toISOString().split('T')[0]
    const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const futureDateStr = futureDate.toISOString().split('T')[0]
    
    const upcomingGames = (allGames || []).filter((game: any) => {
      const gameDate = (game.Day || game.DateTime || '').split('T')[0]
      return gameDate >= todayStr && gameDate <= futureDateStr
    }).slice(0, 3) // Just first 3 games
    
    if (upcomingGames.length === 0) {
      return NextResponse.json({ 
        error: 'No upcoming games found',
        season,
        todayStr,
        futureDateStr
      })
    }
    
    // Step 2: Get betting splits for first game
    const firstGame = upcomingGames[0]
    const gameId = firstGame.GameID || firstGame.GameId
    
    const splitsUrl = `https://api.sportsdata.io/v3/${sportsdataPath}/odds/json/BettingSplitsByGameId/${gameId}?key=${SPORTSDATA_API_KEY}`
    const splitsResp = await fetch(splitsUrl)
    
    return NextResponse.json({
      sport,
      season,
      gamesFound: upcomingGames.length,
      testGame: {
        id: gameId,
        home: firstGame.HomeTeam,
        away: firstGame.AwayTeam,
        date: firstGame.DateTime || firstGame.Day
      },
      splitsStatus: splitsResp.status,
      splitsOk: splitsResp.ok,
      splitsData: splitsResp.ok ? await splitsResp.json() : null,
      splitsUrl: splitsUrl.replace(SPORTSDATA_API_KEY!, 'XXX')
    })
    
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const maxDuration = 60

