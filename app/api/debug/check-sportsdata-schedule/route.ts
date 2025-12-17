import { NextResponse } from 'next/server'

export async function GET() {
  const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
  
  if (!SPORTSDATA_API_KEY) {
    return NextResponse.json({ error: 'API key not found' }, { status: 500 })
  }
  
  try {
    // Try Week 17 (current week for Dec 19-21 games)
    const scheduleUrl = `https://api.sportsdata.io/v3/nfl/scores/json/ScoresByWeek/2024/17?key=${SPORTSDATA_API_KEY}`
    const response = await fetch(scheduleUrl)
    
    if (!response.ok) {
      return NextResponse.json({
        error: `SportsDataIO returned ${response.status}`,
        url: scheduleUrl.replace(SPORTSDATA_API_KEY, 'REDACTED')
      }, { status: 500 })
    }
    
    const games = await response.json()
    
    // Find Rams @ Seahawks and Bears @ Packers
    const targetGames = games.filter((g: any) => 
      (g.HomeTeam === 'SEA' && g.AwayTeam === 'LAR') ||
      (g.HomeTeam === 'CHI' && g.AwayTeam === 'GB')
    )
    
    const results = targetGames.map((g: any) => ({
      game: `${g.AwayTeam} @ ${g.HomeTeam}`,
      scoreId: g.ScoreID,
      gameKey: g.GameKey,
      date: g.Date,
      status: g.Status,
      week: g.Week,
      season: g.Season,
      hasScoreId: g.ScoreID > 0
    }))
    
    return NextResponse.json({
      success: true,
      week: 17,
      season: 2024,
      totalGames: games.length,
      targetGamesFound: results.length,
      games: results,
      conclusion: results.length > 0 && results.every((g: any) => g.hasScoreId)
        ? '✅ SportsDataIO HAS ScoreIDs for these games! We need to sync them to our database.'
        : '⚠️ Games not found in Week 17 schedule'
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

