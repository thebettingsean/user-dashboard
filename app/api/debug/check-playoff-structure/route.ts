import { NextResponse } from 'next/server'

const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY

export async function GET() {
  if (!SPORTSDATA_API_KEY) {
    return NextResponse.json({ error: 'No SportsDataIO API key' }, { status: 500 })
  }

  try {
    const playoffGamesUrl = `https://api.sportsdata.io/v3/nfl/scores/json/Schedules/2025POST?key=${SPORTSDATA_API_KEY}`
    const playoffResp = await fetch(playoffGamesUrl)
    
    if (!playoffResp.ok) {
      const errorText = await playoffResp.text()
      return NextResponse.json({ 
        error: `SportsDataIO API error: ${playoffResp.status}`,
        details: errorText
      }, { status: 500 })
    }
    
    const playoffGames = await playoffResp.json()
    
    return NextResponse.json({
      success: true,
      totalGames: playoffGames.length,
      firstGame: playoffGames[0],
      allFields: Object.keys(playoffGames[0] || {})
    })
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

