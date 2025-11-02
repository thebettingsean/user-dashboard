import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase client for fantasy data
const supabase = createClient(
  'https://mjptauktaxuxrvqcxyhp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcHRhdWt0YXh1eHJ2cWN4eWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA1Nzc5NDgsImV4cCI6MjA0NjE1Mzk0OH0.N3Ks4S3w8nIPQJTJ8v9NMBaLnFZ7k0Zk9lSdKXVqJqk'
)

/**
 * Fetches fantasy projections for a specific game
 * GET /api/fantasy/game-projections?awayTeam=XXX&homeTeam=YYY&sport=nfl
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

    console.log(`\n=== FETCHING FANTASY PROJECTIONS ===`)
    console.log(`Game: ${awayTeam} @ ${homeTeam} (${sport.toUpperCase()})`)

    // Only NFL has fantasy tool currently
    if (sport !== 'nfl') {
      console.log(`⚠️ No fantasy tool for ${sport.toUpperCase()}`)
      return NextResponse.json({
        projections: [],
        sport,
        message: `Fantasy tool not available for ${sport.toUpperCase()}`
      })
    }

    // Fetch fantasy data from Supabase
    const { data: players, error } = await supabase
      .from('in_season')
      .select('*')
      .order('projected_pts', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({
        projections: [],
        sport,
        error: 'Failed to fetch fantasy data'
      })
    }

    // Filter players by team name matching
    const gameTeams = [awayTeam.toLowerCase(), homeTeam.toLowerCase()]
    
    const matchingPlayers = (players || []).filter((player: any) => {
      if (!player.team) return false
      
      const playerTeam = player.team.toLowerCase()
      
      // Check if player team matches either game team (flexible matching)
      return gameTeams.some(gameTeam => 
        playerTeam.includes(gameTeam) || gameTeam.includes(playerTeam)
      )
    })

    console.log(`Found ${matchingPlayers.length} fantasy players for this game`)
    console.log(`=== FANTASY PROJECTIONS FETCH COMPLETE ===\n`)

    // Sort by projected points (descending) and limit to top 10
    const topProjections = matchingPlayers
      .sort((a: any, b: any) => (b.projected_pts || 0) - (a.projected_pts || 0))
      .slice(0, 10)

    return NextResponse.json({
      projections: topProjections,
      sport,
      game: `${awayTeam} @ ${homeTeam}`,
      count: topProjections.length
    })

  } catch (error) {
    console.error('Error fetching fantasy projections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projections', projections: [] },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

