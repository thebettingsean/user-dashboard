import { NextResponse } from 'next/server'

export async function GET() {
  const SPORTSDATA_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
  
  if (!SPORTSDATA_KEY) {
    return NextResponse.json({ error: 'No API key found' }, { status: 500 })
  }
  
  try {
    const currentSeason = 2025
    const url = `https://api.sportsdata.io/v3/nfl/scores/json/Schedules/${currentSeason}?key=${SPORTSDATA_KEY}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      return NextResponse.json({
        error: `API returned ${response.status}`,
        text: await response.text()
      }, { status: 500 })
    }
    
    const games = await response.json()
    
    const upcomingGames = games.filter((g: any) => 
      g.ScoreID > 0 && 
      g.Status === 'Scheduled' &&
      g.Week >= 16 && 
      g.Week <= 18
    )
    
    return NextResponse.json({
      success: true,
      totalGames: games.length,
      upcomingGames: upcomingGames.length,
      sampleGames: upcomingGames.slice(0, 5).map((g: any) => ({
        game: `${g.AwayTeam} @ ${g.HomeTeam}`,
        week: g.Week,
        scoreId: g.ScoreID,
        status: g.Status,
        date: g.Date
      }))
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

