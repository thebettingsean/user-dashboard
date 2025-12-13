import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || '2025-12-10T12:00:00Z'
  
  const ODDS_API_KEY = process.env.ODDS_API_KEY
  if (!ODDS_API_KEY) {
    return NextResponse.json({ error: 'ODDS_API_KEY not configured' }, { status: 500 })
  }

  try {
    const historicalUrl = `https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads,totals,h2h&oddsFormat=american&date=${date}`
    
    console.log('[TEST-HISTORICAL] URL:', historicalUrl)
    
    const response = await fetch(historicalUrl)
    
    console.log('[TEST-HISTORICAL] Status:', response.status)
    console.log('[TEST-HISTORICAL] Headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({ 
        error: 'API Error',
        status: response.status,
        body: text
      }, { status: 500 })
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      date,
      url: historicalUrl.replace(ODDS_API_KEY, 'HIDDEN'),
      timestamp: data.timestamp,
      gamesFound: data.data?.length || 0,
      sampleGame: data.data?.[0] ? {
        id: data.data[0].id,
        home_team: data.data[0].home_team,
        away_team: data.data[0].away_team,
        bookmakerCount: data.data[0].bookmakers?.length || 0
      } : null,
      remaining_requests: response.headers.get('x-requests-remaining'),
      used_requests: response.headers.get('x-requests-used')
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}

