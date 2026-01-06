import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test a basic prop query
    const response = await fetch('https://thebettinginsider.com/api/query-engine/upcoming-props', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sport: 'nfl',
        position: 'qb',
        stat: 'pass_yards',
        line_min: 200,
        line_max: 300,
        filters: {}
      })
    })
    
    const data = await response.json()
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      data,
      summary: {
        total_games: data.total_games,
        total_props: data.total_props,
        first_game: data.games?.[0],
        first_prop: data.upcoming_props?.[0],
        error: data.error
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

