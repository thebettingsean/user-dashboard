import { NextResponse } from 'next/server'

const ODDS_API_KEY = process.env.ODDS_API_KEY

export async function GET() {
  try {
    // Call our own API
    const baseUrl = 'https://thebettinginsider.com'
    const response = await fetch(`${baseUrl}/api/analyst-picks/upcoming-games?sport=nfl`, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    })
    
    const data = await response.json()

    // Return first game's full data
    return NextResponse.json({
      status: response.status,
      success: data.success,
      total_games: data.games?.length || 0,
      first_game: data.games?.[0] || null,
      second_game: data.games?.[1] || null,
      third_game: data.games?.[2] || null,
    }, { status: 200 })

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

