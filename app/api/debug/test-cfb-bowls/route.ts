import { NextResponse } from 'next/server'

export async function GET() {
  const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
  
  if (!SPORTSDATA_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }
  
  const results: any = { endpoints: [] }
  
  // Try various potential bowl game endpoints
  const endpointsToTest = [
    'BowlGames/2025',
    'PostseasonGames/2025',
    'Playoff/2025',
    'Games/2025POST',
    'GamesBySeasonType/2025/3', // SeasonType 3 = POST
    'CurrentSeasonDetails',
    'CurrentSeason',
    'Stadiums' // Just to test if API works at all
  ]
  
  for (const endpoint of endpointsToTest) {
    try {
      const url = `https://api.sportsdata.io/v3/cfb/scores/json/${endpoint}?key=${SPORTSDATA_API_KEY}`
      const resp = await fetch(url)
      
      const result: any = {
        endpoint,
        status: resp.status,
        ok: resp.ok
      }
      
      if (resp.ok) {
        try {
          const data = await resp.json()
          result.dataType = Array.isArray(data) ? 'array' : typeof data
          result.count = Array.isArray(data) ? data.length : 'N/A'
          
          if (Array.isArray(data) && data.length > 0) {
            result.sampleKeys = Object.keys(data[0]).slice(0, 10)
          } else if (typeof data === 'object' && !Array.isArray(data)) {
            result.responseKeys = Object.keys(data).slice(0, 10)
            result.sampleData = data
          }
        } catch (e) {
          result.parseError = 'Could not parse JSON'
        }
      } else {
        const errorText = await resp.text()
        result.error = errorText.substring(0, 200)
      }
      
      results.endpoints.push(result)
    } catch (e: any) {
      results.endpoints.push({
        endpoint,
        error: e.message
      })
    }
  }
  
  return NextResponse.json(results)
}

