import { NextResponse } from 'next/server'

const ODDS_API_KEY = process.env.ODDS_API_KEY || 'd8ba5d45eca27e710d7ef2680d8cb452'

/**
 * Test The Odds API with a known 2022 NFL game
 * Example: 2022 Week 1 - Bills @ Rams (September 8, 2022)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || '2022-09-08T12:00:00Z'
  
  try {
    const url = `https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl/odds?` +
      `apiKey=${ODDS_API_KEY}&` +
      `date=${date}&` +
      `regions=us&` +
      `markets=h2h,spreads,totals&` +
      `oddsFormat=american`
    
    console.log('[Test Odds API] Fetching:', url.replace(ODDS_API_KEY, 'HIDDEN'))
    
    const response = await fetch(url)
    
    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        error: `API returned ${response.status}`,
        details: errorText,
        url: url.replace(ODDS_API_KEY, 'HIDDEN')
      }, { status: response.status })
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      timestamp: data.timestamp,
      previous_timestamp: data.previous_timestamp,
      next_timestamp: data.next_timestamp,
      total_events: data.data?.length || 0,
      sample_games: data.data?.slice(0, 3).map((game: any) => ({
        home_team: game.home_team,
        away_team: game.away_team,
        commence_time: game.commence_time,
        bookmakers: game.bookmakers?.length || 0
      })),
      full_response: data
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

