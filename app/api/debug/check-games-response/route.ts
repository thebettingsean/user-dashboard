import { NextResponse } from 'next/server'

const ODDS_API_KEY = process.env.ODDS_API_KEY

export async function GET() {
  try {
    // Fetch one game from upcoming-games endpoint
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3003'
    const response = await fetch(`${baseUrl}/api/analyst-picks/upcoming-games?sport=nfl`)
    const data = await response.json()

    if (!data.success) {
      return NextResponse.json({
        error: 'Failed to fetch games',
        details: data.error
      }, { status: 500 })
    }

    // Show first 3 games with all their data
    const sampleGames = data.games.slice(0, 3).map((g: any) => ({
      game_id: g.game_id,
      home_team: g.home_team,
      away_team: g.away_team,
      home_team_logo: g.home_team_logo,
      away_team_logo: g.away_team_logo,
      has_home_logo: !!g.home_team_logo,
      has_away_logo: !!g.away_team_logo,
    }))

    return NextResponse.json({
      success: true,
      total_games: data.games.length,
      sample_games: sampleGames,
      all_games_have_logos: data.games.every((g: any) => g.home_team_logo && g.away_team_logo),
      games_missing_logos: data.games.filter((g: any) => !g.home_team_logo || !g.away_team_logo).length
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

