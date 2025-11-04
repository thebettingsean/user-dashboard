import { NextRequest, NextResponse } from 'next/server'

const INSIDER_API_URL = 'https://api.trendlinelabs.ai'
const INSIDER_API_KEY = process.env.INSIDER_API_KEY || 'cd4a0edc-8df6-4158-a0ac-ca968df17cd3'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const requestedSport = searchParams.get('sport')?.toLowerCase()

    console.log(`\n=== FETCHING GAMES ${requestedSport ? `FOR ${requestedSport.toUpperCase()}` : 'FOR ALL SPORTS'} ===`)

    // Calculate date range for fetching games
    const today = new Date()
    const todayEST = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    
    // Check if it's after 10pm EST - if so, look at tomorrow's games
    const currentHour = todayEST.getHours()
    const startDate = currentHour >= 22 ? new Date(todayEST.getTime() + 24 * 60 * 60 * 1000) : todayEST
    
    // Fetch games for the next 3 days to ensure we get enough
    const endDate = new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    console.log(`Fetching games from ${startDateStr} to ${endDateStr}`)

    // If sport is specified, fetch for that sport only
    // Otherwise, fetch for all major sports (for dashboard)
    const sports = requestedSport ? [requestedSport] : ['nfl', 'nba', 'cfb']
    
    let allGames: any[] = []

    for (const sport of sports) {
      try {
        const response = await fetch(
          `${INSIDER_API_URL}/api/${sport}/games?from=${startDateStr}&to=${endDateStr}`,
          {
            headers: {
              'insider-api-key': INSIDER_API_KEY
            },
            cache: 'no-store'
          }
        )

        if (response.ok) {
          const data = await response.json()
          const games = data.games || []
          
          // Transform and add sport label
          const formattedGames = games.map((game: any) => ({
            game_id: game.game_id, // Keep game_id to match other endpoints
            away_team: game.away_team,
            home_team: game.home_team,
            game_date: game.game_date,
            sport: sport.toUpperCase()
          }))
          
          allGames.push(...formattedGames)
          console.log(`✓ Found ${formattedGames.length} ${sport.toUpperCase()} games`)
        } else {
          console.log(`⚠ Failed to fetch ${sport.toUpperCase()} games: ${response.status}`)
        }
      } catch (error) {
        console.error(`Error fetching ${sport.toUpperCase()} games:`, error)
      }
    }

    console.log(`Total games found: ${allGames.length}`)

    // Sort chronologically
    allGames.sort((a: any, b: any) => 
      new Date(a.game_date).getTime() - new Date(b.game_date).getTime()
    )

    // Return in format expected by front-end: { games: [...] }
    return NextResponse.json({ games: allGames })
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
