import { NextRequest, NextResponse } from 'next/server'

/**
 * Fetches prop parlay recommendations for a specific game
 * GET /api/prop-parlay/game-recommendations?awayTeam=XXX&homeTeam=YYY&sport=nfl
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

    console.log(`\n=== FETCHING PROP PARLAY RECOMMENDATIONS ===`)
    console.log(`Game: ${awayTeam} @ ${homeTeam} (${sport.toUpperCase()})`)

    // Only NFL and NBA have prop parlay tools
    if (sport !== 'nfl' && sport !== 'nba') {
      console.log(`⚠️ No prop parlay tool for ${sport.toUpperCase()}`)
      return NextResponse.json({
        recommendations: [],
        sport,
        message: `Prop parlay tool not available for ${sport.toUpperCase()}`
      })
    }

    // Fetch all props from the prop parlay tool API
    const apiUrl = sport === 'nfl' 
      ? 'https://nfl-alt-prop-tool-database-production.up.railway.app'
      : 'https://nba-alt-prop-tool-production.up.railway.app'

    console.log(`Fetching from: ${apiUrl}`)
    
    const response = await fetch(apiUrl, {
      headers: {
        'insider-api-key': process.env.INSIDER_API_KEY || 'cd4a0edc-8df6-4158-a0ac-ca968df17cd3'
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    })

    if (!response.ok) {
      console.error(`Failed to fetch props: ${response.status}`)
      return NextResponse.json({
        recommendations: [],
        sport,
        error: 'Failed to fetch prop data'
      })
    }

    const data = await response.json()
    
    // Filter props by team name matching
    // Team names from API might be full (e.g., "San Francisco 49ers") 
    // Game team names might be full or abbreviated
    const gameTeams = [awayTeam.toLowerCase(), homeTeam.toLowerCase()]
    
    const matchingProps = (data.props || data || []).filter((prop: any) => {
      if (!prop.team_id) return false
      
      const propTeam = prop.team_id.toLowerCase()
      
      // Check if prop team matches either game team (flexible matching)
      return gameTeams.some(gameTeam => 
        propTeam.includes(gameTeam) || gameTeam.includes(propTeam)
      )
    })

    console.log(`Found ${matchingProps.length} props for this game`)
    console.log(`=== PROP PARLAY FETCH COMPLETE ===\n`)

    // Sort by hit rate (descending) and limit to top 10
    const topProps = matchingProps
      .sort((a: any, b: any) => {
        const aRate = a.record ? (a.record.hit / a.record.total) : 0
        const bRate = b.record ? (b.record.hit / b.record.total) : 0
        return bRate - aRate
      })
      .slice(0, 10)

    return NextResponse.json({
      recommendations: topProps,
      sport,
      game: `${awayTeam} @ ${homeTeam}`,
      count: topProps.length
    })

  } catch (error) {
    console.error('Error fetching prop parlay recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendations', recommendations: [] },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

