import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'nhl'
  
  const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
  
  if (!SPORTSDATA_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }
  
  const sportPaths: Record<string, string> = {
    nhl: 'nhl',
    cfb: 'cfb',
    nba: 'nba'
  }
  
  const path = sportPaths[sport] || 'nhl'
  const results: any = { sport, endpoints: [] }
  
  // Test various endpoints that might return game schedules
  const endpointsToTest = [
    { name: 'GamesByDate', url: `https://api.sportsdata.io/v3/${path}/scores/json/GamesByDate/2025-12-14?key=${SPORTSDATA_API_KEY}` },
    { name: 'Games/2025', url: `https://api.sportsdata.io/v3/${path}/scores/json/Games/2025?key=${SPORTSDATA_API_KEY}` },
    { name: 'Games/2026', url: `https://api.sportsdata.io/v3/${path}/scores/json/Games/2026?key=${SPORTSDATA_API_KEY}` },
    { name: 'Schedules/2025', url: `https://api.sportsdata.io/v3/${path}/scores/json/Schedules/2025?key=${SPORTSDATA_API_KEY}` },
    { name: 'Schedules/2026', url: `https://api.sportsdata.io/v3/${path}/scores/json/Schedules/2026?key=${SPORTSDATA_API_KEY}` },
  ]
  
  for (const endpoint of endpointsToTest) {
    try {
      const resp = await fetch(endpoint.url)
      const result: any = {
        endpoint: endpoint.name,
        url: endpoint.url.replace(SPORTSDATA_API_KEY, 'REDACTED'),
        status: resp.status,
        ok: resp.ok
      }
      
      if (resp.ok) {
        const data = await resp.json()
        result.gamesReturned = data?.length || 0
        if (data?.length > 0) {
          result.sampleGame = {
            gameId: data[0].GameID || data[0].GameId || data[0].ScoreID,
            homeTeam: data[0].HomeTeam,
            awayTeam: data[0].AwayTeam,
            date: data[0].Day || data[0].DateTime || data[0].Date,
            allKeys: Object.keys(data[0]).filter(k => k.toLowerCase().includes('id') || k.toLowerCase().includes('team'))
          }
        }
      } else {
        const errorText = await resp.text()
        result.error = errorText.substring(0, 200)
      }
      
      results.endpoints.push(result)
    } catch (e: any) {
      results.endpoints.push({
        endpoint: endpoint.name,
        error: e.message
      })
    }
  }
  
  return NextResponse.json(results)
}

