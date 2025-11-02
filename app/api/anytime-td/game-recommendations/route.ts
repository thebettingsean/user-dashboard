import { NextRequest, NextResponse } from 'next/server'

/**
 * Fetches anytime TD recommendations for a specific game
 * GET /api/anytime-td/game-recommendations?awayTeam=XXX&homeTeam=YYY&sport=nfl
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const awayTeam = searchParams.get('awayTeam')
    const homeTeam = searchParams.get('homeTeam')
    const sport = searchParams.get('sport')?.toLowerCase()

    if (!awayTeam || !homeTeam || !sport) {
      return NextResponse.json(
        { error: 'awayTeam, homeTeam, and sport are required' },
        { status: 400 }
      )
    }

    console.log(`\n=== FETCHING ANYTIME TD RECOMMENDATIONS ===`)
    console.log(`Game: ${awayTeam} @ ${homeTeam} (${sport.toUpperCase()})`)

    // Only NFL has anytime TD tool
    if (sport !== 'nfl') {
      console.log(`⚠️ No anytime TD tool for ${sport.toUpperCase()}`)
      return NextResponse.json({
        recommendations: [],
        sport,
        message: `Anytime TD tool not available for ${sport.toUpperCase()}`
      })
    }

    // Fetch all TD data from the anytime TD tool API
    const apiUrl = 'https://actual-anytime-touchdown-final-tool-production.up.railway.app/api/players'

    console.log(`Fetching from: ${apiUrl}`)
    
    const response = await fetch(apiUrl, {
      headers: {
        'insider-api-key': process.env.INSIDER_API_KEY || 'cd4a0edc-8df6-4158-a0ac-ca968df17cd3'
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    })

    if (!response.ok) {
      console.error(`Failed to fetch TD data: ${response.status}`)
      return NextResponse.json({
        recommendations: [],
        sport,
        error: 'Failed to fetch TD data'
      })
    }

    const data = await response.json()
    
    // Filter TD bets by team name matching
    const gameTeams = [awayTeam.toLowerCase(), homeTeam.toLowerCase()]
    
    const matchingTDs = (data.players || data || []).filter((player: any) => {
      if (!player.team) return false
      
      const playerTeam = player.team.toLowerCase()
      
      // Check if player team matches either game team (flexible matching)
      return gameTeams.some(gameTeam => 
        playerTeam.includes(gameTeam) || gameTeam.includes(playerTeam)
      )
    })

    console.log(`Found ${matchingTDs.length} TD bets for this game`)
    console.log(`=== ANYTIME TD FETCH COMPLETE ===\n`)

    // Sort by hit rate (descending) and limit to top 8
    const topTDs = matchingTDs
      .sort((a: any, b: any) => {
        const aRate = a.historical_data ? (a.historical_data.hit_rate || 0) : 0
        const bRate = b.historical_data ? (b.historical_data.hit_rate || 0) : 0
        return bRate - aRate
      })
      .slice(0, 8)

    return NextResponse.json({
      recommendations: topTDs,
      sport,
      game: `${awayTeam} @ ${homeTeam}`,
      count: topTDs.length
    })

  } catch (error) {
    console.error('Error fetching anytime TD recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendations', recommendations: [] },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

