import { NextRequest, NextResponse } from 'next/server'

const INSIDER_API_URL = 'https://api.trendlinelabs.ai'
const INSIDER_API_KEY = process.env.INSIDER_API_KEY || 'cd4a0edc-8df6-4158-a0ac-ca968df17cd3'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    let requestedSport = searchParams.get('sport')?.toLowerCase()

    // Map NCAAF to cfb for Trendline API
    if (requestedSport === 'ncaaf') {
      requestedSport = 'cfb'
    }

    console.log(`\n=== FETCHING GAMES ${requestedSport ? `FOR ${requestedSport.toUpperCase()}` : 'FOR ALL SPORTS'} ===`)

    // Calculate date range for fetching games
    const now = new Date()
    const nowEST = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    
    // Get today's date in EST (YYYY-MM-DD format)
    const year = nowEST.getFullYear()
    const month = String(nowEST.getMonth() + 1).padStart(2, '0')
    const day = String(nowEST.getDate()).padStart(2, '0')
    const startDateStr = `${year}-${month}-${day}`
    
    // Calculate end date (7 days from now to catch next week's games)
    const endDateEST = new Date(nowEST)
    endDateEST.setDate(endDateEST.getDate() + 7)
    const endYear = endDateEST.getFullYear()
    const endMonth = String(endDateEST.getMonth() + 1).padStart(2, '0')
    const endDay = String(endDateEST.getDate()).padStart(2, '0')
    const endDateStr = `${endYear}-${endMonth}-${endDay}`

    console.log(`Fetching games from ${startDateStr} to ${endDateStr}`)
    console.log(`Current EST time: ${nowEST.toLocaleString('en-US')}`)
    console.log(`Current EST hour: ${nowEST.getHours()}:${nowEST.getMinutes().toString().padStart(2, '0')}`)

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
          
          // Get current time in EST (for comparison with API times which are EST)
          const now = new Date()
          const nowEST = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
          
          // Transform and add sport label, filter out games that have already started
          const formattedGames = games
            .map((game: any) => ({
              game_id: game.game_id,
              away_team: game.away_team,
              home_team: game.home_team,
              game_date: game.game_date,
              sport: sport === 'cfb' ? 'NCAAF' : sport.toUpperCase()
            }))
            .filter((game: any) => {
              // API returns game times in EST, so compare EST to EST
              const gameTime = new Date(game.game_date)
              const isFuture = gameTime > nowEST
              
              if (!isFuture) {
                console.log(`⏭️  Filtering out past game: ${game.game_id} (Game: ${gameTime.toLocaleString('en-US', { timeZone: 'America/New_York' })}, Now EST: ${nowEST.toLocaleString('en-US')})`)
              }
              
              return isFuture
            })
          
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
