import { NextResponse } from 'next/server'

export async function GET() {
  const SPORTSDATA_KEY = process.env.SPORTSDATA_IO_KEY || 'ad4d37f5374f45ffb40e571e38551af1'
  
  try {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1
    const currentSeason = currentMonth >= 9 ? currentYear : currentYear - 1
    
    const url = `https://api.sportsdata.io/v3/nfl/scores/json/Schedules/${currentSeason}?key=${SPORTSDATA_KEY}`
    
    console.log('Fetching from:', url.replace(SPORTSDATA_KEY, 'REDACTED'))
    
    const response = await fetch(url)
    
    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        error: `HTTP ${response.status}`,
        errorText: errorText.substring(0, 500),
        url: url.replace(SPORTSDATA_KEY, 'REDACTED')
      }, { status: 500 })
    }
    
    const data = await response.json()
    
    // Filter to upcoming games
    const now = new Date()
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    
    const allGames = data.map((g: any) => ({
      game: `${g.AwayTeam} @ ${g.HomeTeam}`,
      scoreId: g.ScoreID,
      date: g.Date,
      week: g.Week,
      status: g.Status
    }))
    
    const upcomingGames = allGames.filter((g: any) => {
      const gameDate = new Date(g.date)
      return gameDate > now && gameDate < twoWeeksFromNow && g.scoreId > 0
    })
    
    const recentGames = allGames.slice(-20) // Last 20 games
    
    return NextResponse.json({
      success: true,
      total_games: data.length,
      upcoming_count: upcomingGames.length,
      upcoming_games: upcomingGames,
      recent_games: recentGames,
      date_filter: {
        now: now.toISOString(),
        twoWeeksFromNow: twoWeeksFromNow.toISOString()
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

