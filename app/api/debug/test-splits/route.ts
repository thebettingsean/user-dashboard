import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'nhl'
  const gameId = searchParams.get('gameId')
  
  const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
  
  if (!SPORTSDATA_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }
  
  if (!gameId) {
    return NextResponse.json({ error: 'gameId required' }, { status: 400 })
  }
  
  const results = []
  
  // Try both endpoints
  const sportPaths: Record<string, string> = {
    nfl: 'nfl',
    nba: 'nba',
    nhl: 'nhl',
    cfb: 'cfb'
  }
  
  const path = sportPaths[sport] || 'nhl'
  
  // Try BettingSplitsByGameId
  try {
    const url1 = `https://api.sportsdata.io/v3/${path}/odds/json/BettingSplitsByGameId/${gameId}?key=${SPORTSDATA_API_KEY}`
    const resp1 = await fetch(url1)
    results.push({
      endpoint: 'BettingSplitsByGameId',
      url: url1.replace(SPORTSDATA_API_KEY, 'REDACTED'),
      status: resp1.status,
      ok: resp1.ok,
      data: resp1.ok ? await resp1.json() : await resp1.text()
    })
  } catch (e: any) {
    results.push({
      endpoint: 'BettingSplitsByGameId',
      error: e.message
    })
  }
  
  // Try BettingSplitsByScoreId
  try {
    const url2 = `https://api.sportsdata.io/v3/${path}/odds/json/BettingSplitsByScoreId/${gameId}?key=${SPORTSDATA_API_KEY}`
    const resp2 = await fetch(url2)
    results.push({
      endpoint: 'BettingSplitsByScoreId',
      url: url2.replace(SPORTSDATA_API_KEY, 'REDACTED'),
      status: resp2.status,
      ok: resp2.ok,
      data: resp2.ok ? await resp2.json() : await resp2.text()
    })
  } catch (e: any) {
    results.push({
      endpoint: 'BettingSplitsByScoreId',
      error: e.message
    })
  }
  
  return NextResponse.json({ sport, gameId, results })
}

